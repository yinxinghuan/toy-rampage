import test from 'node:test';
import assert from 'node:assert/strict';
import {FUSIONS,matchFusion,fusionRecipe,fusionInherits} from '../src/fusions.js';
import {Workshop,FOOTPRINT} from '../src/engine.js';
import {simulate} from './balance.mjs';
import {benchFusionHint,boardFusionHint} from '../src/fusion-hints.js';

test('ready selected recipe wins over the first missing recipe and keeps selected partner',()=>{
 const g=new Workshop();g.reset('run',5);g.board.fill(true);g.units=[];g.reserve=[null,null,null];
 const spring=g.add('spring',3,0,0),bubble=g.add('bubble',3,1,0);
 assert.equal(boardFusionHint(g,spring.id).move.kind,'frost');
 g.add('rail',3,0,3);
 assert.equal(boardFusionHint(g,bubble.id).move.kind,'frost');
 assert.equal(boardFusionHint(g,spring.id).recipe,undefined);
});
test('every recipe supports either parent arriving from reserve with board-target footprint',()=>{
 for(const recipe of FUSIONS)for(const rank of recipe.kind==='fusion'?[3]:[2,3])for(const reverse of [false,true]){
  const g=new Workshop();g.reset('run',5);g.board.fill(true);g.landRemaining=0;g.units=[];
  const target=g.add(reverse?recipe.material:recipe.anchor,rank,1,1);
  g.reserve=[{kind:reverse?recipe.anchor:recipe.material,rank},null,null];
  const before=JSON.stringify(g),p=g.preview('reserve:0',1,1);assert(p.ok);assert.equal(p.kind,recipe.kind);assert.equal(p.c,1);assert.equal(p.r,1);assert.equal(JSON.stringify(g),before);
  assert.equal(benchFusionHint(g).recipe.kind,recipe.kind);assert.equal(boardFusionHint(g,target.id).move.kind,recipe.kind);assert.equal(g.fusionMove(recipe.kind).kind,recipe.kind);
  const block=g.add('drum',1,1+recipe.footprint[0]-1,1+recipe.footprint[1]-1);assert.equal(g.preview('reserve:0',1,1).reason,'fusionSpace');assert(!g.place('reserve:0',1,1).ok);g.units=g.units.filter(u=>u.id!==block.id);
  assert(g.place('reserve:0',1,1).ok);assert.equal(g.units.length,1);assert.equal(g.units[0].kind,recipe.kind);assert.equal(g.reserve[0],null);assert.equal(g.coins,0);
 }
});
import {captureRun,restoreRun} from '../src/save.js';

test('ordinary reserve pairs and kits share fusion markers, then follow the deployed anchor',()=>{
 for(const recipe of FUSIONS)for(const rank of recipe.kind==='fusion'?[3]:[2,3]){
  const g=new Workshop();g.reset('run',5);g.units=[];g.board.fill(true);
  g.reserve=[{kind:recipe.material,rank},{kind:recipe.anchor,rank},null];
  const before=JSON.stringify(g),hint=benchFusionHint(g);assert(hint);assert.equal(JSON.stringify(g),before);
  assert.equal(hint.recipe.kind,recipe.kind);assert.equal(hint.anchor,'reserve:1');assert.equal(hint.material,'reserve:0');assert.equal(hint.move.type,'reserve-fusion');
  assert(g.place(hint.anchor,0,0).ok);
  const next=benchFusionHint(g);assert.equal(typeof next.anchor,'number');assert.equal(next.move.type,'fusion');
  assert(g.place(next.material,next.move.c,next.move.r).ok);assert.equal(benchFusionHint(g),null);
 }
});
test('fusion markers never treat ordinary merge or unequal tiers as a fusion pair',()=>{
 const g=new Workshop();g.reset('run',5);g.units=[];
 for(const reserve of [[{kind:'spring',rank:2},{kind:'spring',rank:2},null],[{kind:'spring',rank:2},{kind:'bubble',rank:3},null]]){g.reserve=reserve;assert.equal(benchFusionHint(g),null);}
 g.reserve=[{kind:'spring',rank:2},{kind:'bubble',rank:2},null];
 for(const mutate of [g=>g.paused=true,g=>g.choices=['supplies'],g=>g.stage='win']){const h=Object.assign(new Workshop(),structuredClone(g));mutate(h);assert.equal(benchFusionHint(h),null);}
});
test('paired materials do not imply there is room for the fused footprint',()=>{
 const g=new Workshop();g.reset('run',5);g.units=[];g.board.fill(true);
 g.reserve=[{kind:'rail',rank:2},{kind:'arc',rank:2},null];
 for(let r=0;r<5;r++)for(let c=0;c<4;c++)if(c>=2||r>=2)g.add('drum',1,c,r);
 assert(g.preview('reserve:1',0,0).ok);const hint=benchFusionHint(g);assert(hint);assert.equal(hint.move.type,'reserve-fusion');
 assert(g.mergeReserve(hint.material,hint.anchor,true).ok);assert(!g.preview(hint.anchor,0,0).ok);
});
test('bench fusions support both directions, cost no gears, survive saves and require confirmation',()=>{
 for(const r of FUSIONS)for(const rank of r.kind==='fusion'?[3]:[2,3])for(const reverse of [false,true]){
  const g=new Workshop();g.reset('run',5);g.units=[];g.board.fill(true);g.landRemaining=0;g.coins=0;
  for(let y=0;y<5;y++)for(let x=0;x<4;x++)g.add('drum',1,x,y);
  g.reserve=[{kind:r.material,rank},{kind:r.anchor,rank},null];
  const a=reverse?'reserve:1':'reserve:0',b=reverse?'reserve:0':'reserve:1',before=JSON.stringify(g);
  assert.equal(g.reservePreview(a,b).type,'reserve-fusion');assert.equal(JSON.stringify(g),before);
  assert(!g.mergeReserve(a,b).ok);assert.equal(JSON.stringify(g),before);
  assert(g.mergeReserve(a,b,true).ok);assert.equal(g.coins,0);assert.equal(g.get(a),null);assert.deepEqual(g.get(b),{kind:r.kind,rank:rank+1});
  const after=JSON.stringify(g);assert(!g.mergeReserve(a,b,true).ok);assert.equal(JSON.stringify(g),after);
  const restored=restoreRun(captureRun(g));assert(restored);assert.deepEqual(restored.get(b),g.get(b));
  assert(!g.preview(b,0,0).ok);g.units=[];assert(g.place(b,0,0).ok);assert.equal(g.units[0].kind,r.kind);
 }
});
test('selection chooses one matching route when three reserve parts form two recipes',()=>{
 const g=new Workshop();g.reset('run',5);g.units=[];g.reserve=[{kind:'spring',rank:3},{kind:'rail',rank:3},{kind:'bubble',rank:3}];
 assert.equal(benchFusionHint(g,'reserve:2').recipe.kind,'frost');assert.equal(benchFusionHint(g,'reserve:1').recipe.kind,'fusion');
});

for(const [route,level]of [['frost',4],['storm',5]])test(`${route} is reachable from ordinary chapter supply and can finish eight waves`,()=>{
 const report=simulate('route-'+route,level);assert.equal(report.stage,'win');assert.equal(report.history.length,8);
 assert(report.units.some(u=>u.kind===route&&u.rank>=3));assert(report.hp>0);
 assert(report.history.some(h=>h.units.some(u=>u.kind===route)));
});

test('all three recipes require tier three and a deployed anchor identity',()=>{
 for(const r of FUSIONS){
  const a={kind:r.material,rank:3},b={kind:r.anchor,rank:3};
  assert.equal(matchFusion(a,b,false),r);assert.equal(matchFusion(a,b,true),r);
  assert.equal(matchFusion(b,a,false),null);assert.equal(matchFusion(b,a,true),r);
  for(const rank of [1,2,4]){assert.equal(matchFusion({...a,rank},b,true),null);assert.equal(matchFusion(a,{...b,rank},true),null);}
  assert.equal(matchFusion(a,a,true),null);assert.equal(matchFusion(null,b,true),null);
 }
});
test('new fusion placements validate the full result footprint atomically',()=>{
 for(const kind of ['frost','storm']){
  const r=fusionRecipe(kind),g=new Workshop();g.reset('run',5);g.board.fill(true);g.units=[];
  const anchor=g.add(r.anchor,3,0,0);g.reserve=[{kind:r.material,rank:3},null,null];
  const before=JSON.stringify(g),preview=g.preview('reserve:0',0,0);assert.equal(preview.kind,kind);assert(preview.ok);assert.equal(JSON.stringify(g),before);
  const [w,h]=FOOTPRINT[kind],block=g.add('drum',1,w-1,h-1);
  // Some result cells were already occupied by the anchor. Only test the newly
  // acquired column/row: frost grows right, storm grows right.
  block.c=w-1;block.r=h-1;
  assert.equal(g.preview('reserve:0',0,0).reason,'fusionSpace');const blocked=JSON.stringify(g);assert(!g.place('reserve:0',0,0).ok);assert.equal(JSON.stringify(g),blocked);
  g.units=g.units.filter(u=>u.id!==block.id);g.board[(h-1)*6+w-1]=false;assert(!g.preview('reserve:0',0,0).ok);g.board.fill(true);
  assert(g.place('reserve:0',0,0).ok);assert.equal(g.units.length,1);assert.equal(g.units[0].kind,kind);assert.equal(g.units[0].rank,4);assert.equal(g.reserve[0],null);assert.equal(g.coins,0);assert(!g.units.some(u=>u.id===anchor.id));
 }
});
test('new fused units receive only explicitly inherited upgrades',()=>{
 for(const kind of ['frost','storm']){
  const g=new Workshop();g.reset('run');g.units=[];g.add(kind,4,0,0);g.xp=6;
  for(let seed=1;seed<=12;seed++){g.upgradeSeed=seed;g.choices=[];g.offerUpgrades();for(const id of g.choices)assert(id==='supplies'||fusionInherits(kind,id),kind+' '+id);}
  assert.equal(g.affectedUnits('spring','spring-bounce').length,0);assert.equal(g.affectedUnits('rail','rail-pierce').length,0);
 }
});
test('frost hits an area and storm chains distinct targets with fixed tier-four damage',()=>{
 for(const kind of ['frost','storm']){
  const g=new Workshop();g.reset('run');g.units=[];g.add(kind,4,0,0).cooldown=0;g.stage='wave';g.spawnLeft=1;g.spawnTime=99;
  for(let i=0;i<8;i++){g.spawn(1000,false,i===7?'boss':'patrol',0);g.enemies.at(-1).d=100+i*5;}
  g.tick(.01);const hit=g.effects.find(e=>e.type==='shot').impacts;
  assert.equal(new Set(hit.map(h=>h.id)).size,hit.length);
  if(kind==='frost'){assert.equal(hit.length,8);assert(hit.every(h=>h.damage===20));assert.equal(g.enemies[0].slow,.5);assert.equal(g.enemies[7].slow,.25);}
  else{assert.equal(hit.length,6);assert.equal(hit[0].damage,80);assert.equal(hit[1].damage,64);}
 }
});
test('new routes have distinct shapes and explicitly limited inheritance',()=>{
 assert.deepEqual(fusionRecipe('frost').footprint,[2,2]);assert.deepEqual(fusionRecipe('storm').footprint,[3,2]);
 assert(fusionInherits('frost','bubble-splash'));assert(fusionInherits('storm','arc-chain'));
 assert(!fusionInherits('frost','spring-bounce'));assert(!fusionInherits('storm','rail-pierce'));
 assert(!fusionInherits('spring','spring-speed'));assert(!fusionInherits('unknown','bubble-splash'));
 for(const r of FUSIONS){assert.equal(new Set(r.inherits).size,r.inherits.length);assert.equal(r.resultRank,r.rank+1);}
});
test('two-tier new recipes produce tier three, reject mixed tiers and keep full footprint checks',()=>{
 for(const kind of ['frost','storm']){
  const r=fusionRecipe(kind),g=new Workshop();g.reset('run',5);g.board.fill(true);g.units=[];
  g.add(r.anchor,2,0,0);g.reserve=[{kind:r.material,rank:2},null,null];
  assert.equal(matchFusion(g.reserve[0],g.units[0],false),r);
  assert.equal(matchFusion({...g.reserve[0],rank:3},g.units[0],false),null);
  const blocker=g.add('drum',1,r.footprint[0]-1,0);
  assert.equal(g.preview('reserve:0',0,0).reason,'fusionSpace');
  g.units=g.units.filter(u=>u.id!==blocker.id);
  assert.equal(g.place('reserve:0',0,0).rank,3);assert.equal(g.units[0].rank,3);
  g.reserve=[{kind,rank:3},{kind,rank:3},null];assert(!g.reservePreview('reserve:0','reserve:1').ok);
  assert.notEqual(g.preview('reserve:0',0,0).type,'merge');
 }
});
test('tier-three effects are weaker than tier-four without changing their roles',()=>{
 for(const kind of ['frost','storm']){
  const g=new Workshop();g.reset('run');g.units=[];g.add(kind,3,0,0).cooldown=0;g.stage='wave';g.spawnLeft=1;g.spawnTime=99;
  for(let i=0;i<8;i++){g.spawn(1000,false,i===7?'boss':'patrol',1);g.enemies.at(-1).d=100+i*5;}
  g.tick(.01);const hit=g.effects.find(e=>e.type==='shot').impacts;
  assert(Math.abs(hit[0].damage-(kind==='frost'?20:80)/1.85)<1e-8);
  if(kind==='frost'){assert.equal(g.enemies[0].slow,.4);assert.equal(g.enemies[7].slow,.2);}
  else assert.equal(hit.length,4);
 }
});
test('r49 all kits fuse before wave three and the reference policy completes the campaign',()=>{
 for(const [route,level] of [['frost',3],['frost',4],['frost',5],['storm',5]]){
  const r=simulate('kit-'+route,level);assert.equal(r.stage,'win',route+' L'+(level+1));
  assert(r.history[2].startUnits.some(u=>u.kind===route&&u.rank===3));assert.equal(r.supplyLog.filter(x=>x.route).length,1);
  assert.equal(r.economyLog.find(x=>x.reason==='route-supply').delta,-5);
 }
});

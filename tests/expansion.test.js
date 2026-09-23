import test from 'node:test';
import assert from 'node:assert/strict';
import {Workshop,adjacent,XP_THRESHOLDS,STATS} from '../src/engine.js';
import {occupied} from '../src/engine.js';
import {LAND_SHAPES} from '../src/land-shapes.js';
import {landReward} from '../src/progression.js';
import {captureRun,restoreRun} from '../src/save.js';
const fresh=()=>{const g=new Workshop();g.reset('run');return g;};
test('r49 centered seed and first offers support all four expansion directions',()=>{
 const g=fresh();assert.equal(g.board.filter(Boolean).length,12);
 for(let r=0;r<7;r++)for(let c=0;c<6;c++)assert.equal(g.hasCell(c,r),c>=1&&c<=4&&r>=2&&r<=4);
 assert.deepEqual(g.landOffers().map(u=>u.kind),['plot3','plotL0']);
 for(const[kind,c,r]of [['plot3',1,1],['plot3',1,5],['plotV3',0,2],['plotV3',5,2]])assert(g.landPreview(c,r,kind).ok);
 const before=JSON.stringify(g);assert.equal(g.place('land:other',1,2).ok,false);assert.equal(JSON.stringify(g),before);
 assert(g.place('land:other',0,4).ok);assert.equal(g.landRemaining,0);assert.equal(g.get('land'),undefined);assert.equal(g.get('land:other'),undefined);
});
test('r49 v2 restore preserves old coordinates and grants only schedule delta once',()=>{
 for(const wave of [0,4,6]){
  const g=fresh();g.board=Array.from({length:30},(_,i)=>i%5<4&&Math.floor(i/5)<3);g.units[0].c=0;g.units[0].r=0;g.units[1].c=0;g.units[1].r=2;g.landRemaining=2;g.wave=wave;g.rows=6;
  const raw=captureRun(g);raw.version=2;const h=restoreRun(raw);assert(h);assert.equal(h.board.length,42);for(let r=0;r<6;r++)for(let c=0;c<5;c++)assert.equal(h.hasCell(c,r),g.board[r*5+c]);assert.deepEqual(h.lineup(),g.lineup());assert.equal(h.landRemaining,wave===0?3:wave===4?8:14);
  assert.deepEqual(captureRun(restoreRun(captureRun(h))),captureRun(h));
 }
});
test('r47 connected masks, rotation, choice, holes and atomic credit accounting',()=>{
 for(const kind of Object.keys(LAND_SHAPES)){
  const g=fresh();g.wave=2;g.landRemaining=4;g.board.fill(false);g.board[2*6]=true;g.board[2*6+1]=true;
  const mask=occupied({kind,c:0,r:3}),p=g.landPreview(0,3,kind);assert(p.ok,kind);assert.equal(p.tiles.length,mask.length);
  assert.equal(new Set(mask.map(String)).size,mask.length);
 }
 const g=fresh(),coins=g.coins;assert(g.rotateLand());assert.equal(g.landKind(),'plotV3');assert(g.place('land',5,0).ok);assert.equal(g.landRemaining,0);assert.equal(g.coins,coins);
 g.wave=2;g.landRemaining=3;assert(g.chooseLand());const kinds=[];for(let i=0;i<4;i++){kinds.push(g.landKind());assert(g.rotateLand());}assert.equal(new Set(kinds).size,4);
 g.landRotation=0;const p=g.place('land',0,4);assert(p.ok);assert.equal(p.tiles.length,3);assert.equal(p.tiles.some(([x,y])=>x===1&&y===4),false);assert.equal(g.hasCell(1,4),true);assert.equal(g.landRemaining,0);
 const snap=captureRun(g);assert.deepEqual(captureRun(restoreRun(snap)),snap);
});
test('r48 every expansion can be placed, tutorial can rotate, and credits total thirty',()=>{
 const intro=new Workshop();intro.stage='expand';assert.equal(intro.rotateLand(),true);
 const g=fresh();for(let wave=0;wave<=6;wave++){
  g.wave=wave;if(wave)g.landRemaining+=landReward(wave);g.landSplit=false;
  for(let n=0;n<80&&g.landRemaining;n++){const move=g.landMove();if(move)assert(g.place(move.source,move.c,move.r).ok);else{const action=g.landAdvice();assert(action);assert(g[{'land-rotate':'rotateLand','land-choice':'chooseLand','land-split':'splitLand'}[action]]());}}
  assert.equal(g.landRemaining,0);
 }assert.equal(g.board.filter(Boolean).length,42);
});
test('r47 v1 migration preserves coordinates and only grants missing historical land once',()=>{
 const original=fresh();original.units[0].c=0;original.units[0].r=0;original.units[1].c=0;original.units[1].r=2;const save=captureRun(original);save.version=1;save.state.rows=5;save.state.board=Array.from({length:20},(_,i)=>i<12);save.state.wave=4;save.state.landRemaining=2;
 delete save.state.landChoice;delete save.state.landRotation;delete save.state.landSplit;
 const g=restoreRun(save);assert(g);assert.deepEqual(g.lineup(),original.lineup());assert.equal(g.board.length,42);assert.equal(g.board.filter(Boolean).length,12);assert.equal(g.landRemaining,14);
 const next=captureRun(g);assert.equal(restoreRun(next).landRemaining,14);assert.deepEqual(captureRun(restoreRun(next)),next);
 save.state.units[0].c=4;assert.equal(restoreRun(save),null);
});
test('land requires new connected cells, consumes credit once and remains separate from units',()=>{
 const g=fresh(),before=JSON.stringify(g);assert.equal(g.place('land',1,2).reason,'landOverlap');assert.equal(g.place('land',4,5).reason,'outside');assert.equal(JSON.stringify(g),before);assert.equal(g.place('reserve:0',5,2).reason,'lockedCell');
 assert.ok(g.place('land:other',0,4).ok);assert.equal(g.board.filter(Boolean).length,15);assert.equal(g.landRemaining,0);assert.equal(g.units.length,2);assert.equal(g.place('land',0,0).ok,false);assert.equal(g.landLog.length,1);
});
test('fragmented free cells use singles without creating credit or disconnecting',()=>{
 const g=fresh();g.board=Array(42).fill(true);g.board[18]=false;g.board[21]=false;g.landRemaining=2;assert.equal(g.landKind(),'plot2');assert.ok(g.canSplitLand());assert.ok(g.splitLand());assert.equal(g.get('land').kind,'plot1');assert.ok(g.place('land',0,3).ok);assert.equal(g.landRemaining,1);assert.ok(g.place('land',3,3).ok);assert.equal(g.board.filter(Boolean).length,42);assert.equal(g.landRemaining,0);assert.equal(g.get('land'),undefined);
});
test('land pause, upgrade, outside, and refresh are atomic',()=>{
 const g=fresh();g.paused=true;const a=JSON.stringify(g);assert.equal(g.place('land',0,3).ok,false);assert.equal(JSON.stringify(g),a);g.paused=false;g.choices=['supplies'];assert.equal(g.place('land',0,3).ok,false);g.choices=[];g.coins=5;const land=g.landRemaining;g.refresh(true);assert.equal(g.landRemaining,land);assert.equal(g.board.filter(Boolean).length,12);
});
test('new units appear at authored refreshes; tier 2 batches and a matching kind',()=>{
 const g=fresh();g.coins=30;g.wave=0;g.refresh(true);assert.ok(g.reserve.every(u=>!['bubble','drum'].includes(u.kind)));g.wave=1;g.refresh(true);assert.equal(g.reserve[2].kind,'bubble');assert.ok(g.reserve.some(u=>g.units.some(v=>v.kind===u.kind)));g.wave=3;g.refresh(true);assert.equal(g.reserve[2].kind,'drum');g.wave=4;g.refresh(true);assert.deepEqual(g.reserve[0],{kind:'rail',rank:1});assert.ok(g.reserve.slice(1).every(u=>u.rank===2));assert.deepEqual(g.introduced,['bubble','drum']);assert.equal(g.supplyLog.length,4);
});
test('all five regular kinds merge up to four; mismatch preserves source',()=>{
 for(const kind of ['spring','rail','mortar','bubble','drum']){const g=fresh();g.units=[];g.add(kind,2,0,0);g.reserve=[{kind,rank:2},null,null];assert.equal(g.place('reserve:0',0,0).type,'merge');assert.equal(g.units[0].rank,3);g.reserve[0]={kind,rank:3};g.place('reserve:0',0,0);assert.equal(g.units[0].rank,4);g.reserve[0]={kind,rank:4};const before=JSON.stringify(g);assert.equal(g.place('reserve:0',0,0).reason,'maxRank');assert.equal(JSON.stringify(g),before);}
});
function combat(kind='bubble',rank=1){const g=fresh();g.units=[];g.stage='wave';g.spawnLeft=1;g.spawnTime=99;g.add(kind,rank,0,0).cooldown=0;return g;}
test('bubble slow is real, expires, does not stack and halves on bosses',()=>{
 for(const kind of ['patrol','boss']){const g=combat();g.spawn(1000,false,kind,60);const e=g.enemies[0];e.d=100;g.tick(1/60);const slow=kind==='boss'?.175:.35;assert.equal(e.slow,slow);assert.ok(e.slowLeft>1.79);const d=e.d;g.units[0].cooldown=99;g.tick(.05);assert.ok(Math.abs(e.d-d-60*.05*(1-slow))<1e-8);for(let i=0;i<40;i++)g.tick(.05);assert.equal(e.slowLeft,0);const x=e.d;g.tick(.05);assert.ok(Math.abs(e.d-x-3)<1e-8);g.units[0].cooldown=0;g.add('bubble',4,1,0);g.tick(.01);assert.equal(e.slow,slow);}
});
test('bubble splash extends slow to nearby targets without extra direct damage',()=>{
 const g=combat();g.buffs=['bubble-splash'];for(const d of[95,100]){g.spawn(100,false,'patrol',0);g.enemies.at(-1).d=d;}g.tick(.01);assert.ok(g.enemies.every(e=>e.slowLeft>0));assert.deepEqual(g.enemies.map(e=>e.hp),[100,95]);
});
test('drum edge adjacency, strongest only, no self-buff, immediate move and real rate',()=>{
 const g=combat('spring');const gun=g.units[0],d1=g.add('drum',1,1,0),d2=g.add('drum',3,1,1);assert.ok(adjacent(d1,gun));assert.ok(Math.abs(g.drumBoost(gun)-.25)<1e-8);assert.equal(g.drumBoost(d1),0);g.buffs=['drum-boost'];assert.ok(Math.abs(g.drumBoost(gun)-.35)<1e-8);d2.c=3;assert.ok(Math.abs(g.drumBoost(gun)-.25)<1e-8);d1.r=2;assert.equal(g.drumBoost(gun),0);d1.r=0;g.spawn(1000,false,'patrol',0);g.enemies[0].d=100;g.tick(.01);assert.equal(gun.cooldown,STATS.spring.interval/1.25);
});
test('reserve fusion consumes only valid spring and deployed rail, inheriting relevant upgrades',()=>{
 const g=fresh();g.board.fill(true);g.units=[];const rail=g.add('rail',3,0,0);g.reserve=[{kind:'spring',rank:3},null,null];g.buffs=['spring-bounce','rail-pierce','rail-speed'];const p=g.fusionMove();assert.equal(p.source,'reserve:0');g.place(p.source,p.c,p.r);assert.equal(g.units.length,1);assert.equal(g.units[0].kind,'fusion');assert.equal(g.reserve[0],null);assert.equal(g.affectedUnits('spring').length,1);assert.equal(g.affectedUnits('rail').length,1);assert.equal(g.fusionMove(),null);assert.equal(g.units.some(u=>u.id===rail.id),false);
 g.stage='wave';g.spawnLeft=1;g.spawnTime=99;g.spawn(1000,false,'patrol',0);g.enemies[0].d=100;g.units[0].cooldown=0;g.tick(.01);assert.equal(g.units[0].cooldown,STATS.fusion.interval/1.25);
});
test('six XP thresholds are consumed once with no repeated permanent upgrades',()=>{
 const g=fresh();g.xp=160;for(let i=0;i<XP_THRESHOLDS.length;i++){g.offerUpgrades();assert(g.choices.length>=1&&g.choices.length<=3);assert.equal(new Set(g.choices).size,g.choices.length);g.chooseUpgrade(0);}assert.equal(g.upgradeLog.length,6);assert.equal(g.choices.length,0);assert.equal(new Set(g.buffs).size,g.buffs.length);
});
test('teaching fallback never overwrites the new kind and logs the actual delivered batch',()=>{
 const g=fresh();g.coins=5;g.wave=1;g.lesson='refresh';
 // A fully occupied board forces the teaching fallback path.
 g.units=[];for(let r=0;r<3;r++)for(let c=0;c<4;c++)g.add('drum',4,c,r);
 g.refresh(true);assert.equal(g.reserve[2].kind,'bubble');assert.deepEqual(g.supplyLog[0].items,g.reserve);assert.deepEqual(g.introduced,['bubble']);
});
test('fusion parent speed upgrades do not double-stack',()=>{
 const g=combat('fusion',4);g.buffs=['spring-speed','rail-speed'];g.spawn(1000,false,'patrol',0);g.enemies[0].d=100;g.tick(.01);assert.equal(g.units[0].cooldown,STATS.fusion.interval/1.25);
});
test('fusion-only boards never offer a second ineffective parent speed upgrade',()=>{
 const g=fresh();g.units=[];g.add('fusion',4,0,0);g.buffs=['spring-speed','spring-bounce','rail-pierce'];g.xp=6;g.offerUpgrades();assert.ok(!g.choices.includes('rail-speed'));assert.deepEqual(g.choices,['supplies']);
});
test('fusion-only choices do not present two equivalent speed cards',()=>{
 const g=fresh();g.units=[];g.add('fusion',4,0,0);g.buffs=['spring-bounce','rail-pierce'];g.xp=6;g.offerUpgrades();
 assert.equal(g.choices.filter(id=>id.endsWith('-speed')).length,1);assert(g.choices.includes('spring-speed'));
 g.choices=[];g.add('rail',1,0,1);g.offerUpgrades();assert(g.choices.includes('rail-speed'));assert(g.choices.includes('spring-speed'));
});

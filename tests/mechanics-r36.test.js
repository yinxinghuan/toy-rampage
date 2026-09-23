import test from 'node:test';import assert from 'node:assert/strict';
import {Workshop,STATS,FOOTPRINT,SimulationClock} from '../src/engine.js';
import {simulate} from './balance.mjs';
const combat=(kind='rivet')=>{const g=new Workshop();g.reset('run',4);g.units=[];g.add(kind,1,0,0).cooldown=0;g.stage='wave';g.spawnLeft=1;g.spawnTime=99;return g;};
const enemy=(g,kind='plated',d=100,hp=1000)=>{g.spawn(hp,false,kind,0);const e=g.enemies.at(-1);e.d=d;return e;};
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('deep breach improves allied physical hits, retains armor and expires',()=>{
 for(const kind of ['armor','plated','patrol']){
  const g=combat();g.buffs=['rivet-duration'];const e=enemy(g,kind);g.tick(.01);
  const armor=kind==='plated'?.6:kind==='armor'?.35:0;
  close(1000-e.hp,8*(1-armor*.2));
  g.units[0].cooldown=99;const ally=g.add('spring',1,1,0);ally.cooldown=0;
  const before=e.hp;g.tick(.01);close(before-e.hp,12*(1-armor*.2));
  g.units.forEach(u=>u.cooldown=99);for(let i=0;i<101;i++)g.tick(.05);
  assert.equal(e.shredLeft,0);ally.cooldown=0;const after=e.hp;g.tick(.01);close(after-e.hp,12*(1-armor));
 }
});
test('rivet breaches actual armor, improves allied hits, expires and never stacks',()=>{
 for(const kind of ['plated','armor','patrol']){
  const g=combat(),e=enemy(g,kind);g.tick(.01);const mitigation=kind==='plated'?.24:kind==='armor'?.14:0;
  close(e.hp,1000-8*(1-mitigation));if(kind==='patrol')assert.equal(e.shredLeft,0);else assert.equal(e.shredLeft,3);
  g.units[0].cooldown=99;g.add('spring',1,0,0).cooldown=0;const before=e.hp;g.tick(.01);close(before-e.hp,12*(1-mitigation));
  g.units.forEach(u=>u.cooldown=99);for(let i=0;i<61;i++)g.tick(.05);assert.equal(e.shredLeft,0);
  g.units[0].cooldown=0;g.buffs=['rivet-duration'];g.tick(.01);if(kind!=='patrol')assert.equal(e.shredLeft,5);
 }
});
test('arc follows nearest distinct living targets, decays, and stops across gaps',()=>{
 const g=combat('arc');for(const d of [100,120,140,160,400])enemy(g,'patrol',d);g.tick(.01);
 const hits=g.effects.find(e=>e.kind==='arc').impacts;assert.equal(hits.length,3);assert.equal(new Set(hits.map(h=>h.id)).size,3);
 hits.forEach((h,i)=>close(h.damage,15*.7**i));g.buffs=['arc-chain'];g.units[0].cooldown=0;g.tick(.01);
 assert.equal(g.effects.filter(e=>e.kind==='arc').at(-1).impacts.length,4);assert.equal(g.enemies.at(-1).hp,1000);
 const solo=combat('arc');enemy(solo,'patrol');solo.tick(.01);assert.equal(solo.effects.find(e=>e.kind==='arc').impacts.length,1);
});
test('splitter death births two real mites once; no extra XP and no recursive split',()=>{
 const g=combat('arc');const parent=enemy(g,'brood',100,1);g.tick(.01);
 assert.equal(g.kills,1);assert.equal(g.xp,1);assert.equal(g.enemies.length,2);
 for(const e of g.enemies){assert.equal(e.kind,'mite');close(e.hp,.3);assert.equal(Math.abs(e.d-parent.d),8);e.hp=0;}
 g.units[0].cooldown=99;g.tick(.01);assert.equal(g.kills,3);assert.equal(g.xp,1);assert.equal(g.enemies.length,0);
});
test('new footprints, merge caps, economy and isolated chapter supply',()=>{
 for(const [level,kind,foot]of [[4,'rivet',[1,3]],[5,'arc',[2,2]]]){
  const g=new Workshop();g.reset('run',level);assert.deepEqual(FOOTPRINT[kind],foot);assert.equal(g.reserve[2].kind,kind);
  g.units=[];g.add(kind,1,0,0);assert.equal(g.place('reserve:2',0,0).type,'merge');assert.equal(g.units[0].rank,2);
  g.coins=5;g.wave=4;g.refresh(true);assert(g.reserve.every(u=>u.kind!=='mortar'));assert.equal(g.coins,0);
  g.retry();assert.equal(g.units.some(u=>u.shredLeft),false);assert.equal(g.buffs.length,0);
 }
});
test('new mechanics are frozen under pause and deterministic across frame rates',()=>{
 const drive=(hz,speed)=>{const g=combat('arc'),clock=new SimulationClock();enemy(g,'brood',100,50);g.add('rivet',2,1,0);for(let n=0;n<hz*5/speed;n++){if(g.choices.length)g.chooseUpgrade(0);clock.advance(g,1/hz,speed);}return g.report();};
 const baseline=drive(60,1);for(const hz of [20,30,120])for(const speed of [1,2])assert.deepEqual(drive(hz,speed),baseline);
 const g=combat(),e=enemy(g);e.shredLeft=3;g.paused=true;const before=JSON.stringify(g);g.tick(.05);assert.equal(JSON.stringify(g),before);
});

test('trial chapters have reproducible full-run paths and proper upgrade eligibility',()=>{
 for(const level of [4,5]){
  const r=simulate('trial',level);assert.equal(r.stage,'win');assert.equal(r.history.length,8);
  assert.deepEqual(simulate('trial',level),r);assert(r.units.some(u=>u.kind===(level===4?'rivet':'arc')));
  assert.equal(simulate('idle',level).stage,'lose');
 }
 const g=combat('rivet');g.xp=6;g.offerUpgrades();assert(!g.choices.includes('arc-chain'));
 g.choices=['rivet-duration'];assert(g.chooseUpgrade(0));assert(g.buffs.includes('rivet-duration'));
});

test('r49 legal entrance expansion supports non-fusion finishes without guaranteeing a fusion advantage',()=>{
 for(const [level,hp]of [[4,100],[5,60]]){
  const ordinary=simulate('trial-no-fusion',level),fusion=simulate('trial',level);
  assert.equal(ordinary.stage,'win');assert.equal(ordinary.hp,hp);
  assert(!ordinary.units.some(u=>u.kind==='fusion'));assert.equal(ordinary.history.length,8);
  assert(ordinary.history[4].hp>0);assert(fusion.hp>=ordinary.hp);
 }
});

test('r49 larger board supports spread while fusion retains final-wave headroom',()=>{
 const spread=simulate('trial-spread',5),concentrated=simulate('trial-no-fusion',5),fused=simulate('trial',5);
 assert.equal(spread.stage,'win');assert.equal(spread.hp,60);
 assert.equal(concentrated.hp,60);assert.equal(fused.hp,100);
 assert(spread.history.slice(0,7).every(h=>h.hp===100));
 assert(!spread.units.some(u=>u.kind==='fusion'));assert(spread.units.length>fused.units.length);
 const g=new Workshop();g.reset('run',5);assert.equal(g.waves[7].gap,.5);
 assert.equal(g.waves[7].count,34);assert.equal(g.waves[7].bossHp,4200);
 assert.equal(simulate('idle',5).stage,'lose');
});

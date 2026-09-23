import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,Workshop} from '../src/engine.js';
import {supplyPool,SUPPLY_UNLOCKS,LAND_REWARDS,HIGH_TIER_AFTER,chapterRoutes} from '../src/progression.js';
test('formal chapter schedule preserves all six seeded supply pools',()=>{
 for(const level of LEVELS)for(let wave=0;wave<8;wave++){
  const expected=level.experiment?[level.experiment,'spring','rail']:['spring','rail','mortar'];
  if(wave>=1)expected.push('bubble');if(wave>=3)expected.push('drum');
  assert.deepEqual(supplyPool(level,wave),expected);
 }
 assert.deepEqual(LAND_REWARDS,[1,2,3,4,5,6]);assert.equal(HIGH_TIER_AFTER,4);
});
test('first refresh at milestones supplies the advertised new weapon',()=>{
 for(let level=0;level<6;level++){
  const g=new Workshop();g.reset('run',level);
  for(const x of SUPPLY_UNLOCKS){g.wave=x.afterWave;g.coins=5;assert.ok(g.refresh(true).ok);assert.equal(g.reserve[2].kind,x.kind);}
 }
});
test('route previews progress from core fusion to optional control and chain',()=>{
 assert.deepEqual(chapterRoutes(0),['fusion']);assert.deepEqual(chapterRoutes(3),['fusion','frost']);assert.deepEqual(chapterRoutes(5),['fusion','frost','storm']);
});
test('one optional fusion kit unlocks after wave two without touching ordinary RNG or land',()=>{
 for(let level=0;level<6;level++){
  const g=new Workshop();g.reset('run',level);g.coins=5;assert.deepEqual(g.routeSupplies(),[]);
  g.wave=2;const routes=g.routeSupplies();assert.deepEqual(routes,level<3?[]:level===5?['frost','storm']:['frost']);
  if(!routes.length)continue;
  const before=JSON.stringify(g);assert.equal(g.claimRoute(routes[0]).reason,'replaceReserve');assert.equal(JSON.stringify(g),before);
  const seed=g.seed,land=g.landRemaining;assert(g.claimRoute(routes[0],true).ok);
  assert.equal(g.coins,0);assert.equal(g.seed,seed);assert.equal(g.landRemaining,land);assert.deepEqual(g.reserve.map(x=>x?.rank??null),[2,2,null]);assert.deepEqual(g.routeSupplies(),[]);
  g.coins=99;assert(!g.claimRoute(routes[0],true).ok);assert.equal(g.coins,99);
 }
});
test('kits cannot be taken during battle, paused, upgrading, or without funds',()=>{
 for(const change of [g=>g.stage='wave',g=>g.paused=true,g=>g.choices=['supplies'],g=>g.coins=4]){
  const g=new Workshop();g.reset('run',5);g.wave=2;g.coins=5;change(g);
  const before=JSON.stringify(g);assert(!g.claimRoute('storm',true).ok);assert.equal(JSON.stringify(g),before);
 }
});

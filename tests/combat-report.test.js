import test from 'node:test';import assert from 'node:assert/strict';
import {newCombatReport,recordHit,recordLeak,reportView} from '../src/combat-report.js';
import {Workshop} from '../src/engine.js';import {simulate} from './balance.mjs';
test('damage excludes overkill, practice, and damage to already dead targets',()=>{
 const r=newCombatReport(),u={kind:'spring',rank:2};
 recordHit(r,u,{kind:'patrol',hp:5},30,30);recordHit(r,u,{kind:'patrol',hp:-3},30,30);recordHit(r,u,{kind:'patrol',hp:50,practice:true},30,30);
 assert.equal(r.damage.spring,5);assert.equal(r.ranks.spring,2);assert.equal(reportView(r).damage[0].percent,100);
});
test('breach bonus is incremental same-hit damage, capped by remaining HP',()=>{
 const r=newCombatReport(),e={kind:'plated',hp:100,shredLeft:3},u={kind:'spring',rank:1};recordHit(r,u,e,10,7.6);assert(Math.abs(r.breachExtra-3.6)<1e-9);
 recordHit(r,u,{...e,hp:3},10,7.6);assert(Math.abs(r.breachExtra-3.6)<1e-9);
 recordHit(r,{kind:'rivet',rank:1},e,10,7.6);recordHit(r,u,e,10,10,true);assert(Math.abs(r.breachExtra-3.6)<1e-9);
});
test('leak groups preserve average remaining HP and actual box loss; hints are bounded',()=>{
 const r=newCombatReport();recordLeak(r,{kind:'mite',hp:2,maxHp:10},20);recordLeak(r,{kind:'mite',hp:3,maxHp:10},10);
 const v=reportView(r);assert.deepEqual(v.leaks,[{kind:'mite',count:2,remaining:25,boxDamage:30}]);assert.equal(v.hint,'reportNear');assert.equal(reportView(null),null);assert.equal(reportView(newCombatReport()).hint,'reportClean');
});
test('wave history deep-copies accounting, next wave and retry clear it',()=>{
 const g=new Workshop();g.reset('run',4);g.startWave();g.combatReport.damage.spring=10;g.recordWave('abandoned');g.combatReport.damage.spring=20;
 assert.equal(g.history[0].combat.damage.spring,10);g.stage='ready';g.startWave();assert.deepEqual(g.combatReport,newCombatReport());g.retry();assert.deepEqual(g.combatReport,newCombatReport());assert.equal(g.history.length,0);
});
test('full runs preserve authored results and exact accounted leakage; support is not damage',()=>{
 for(const [level,hp]of [[4,100],[5,60]]){
  const r=simulate('trial-no-fusion',level);assert.equal(r.hp,hp);
  for(const h of r.history){const v=reportView(h.combat);assert(v);assert.equal(v.leaks.reduce((n,e)=>n+e.count,0),h.leaks);assert(!('drum'in h.combat.damage));assert(v.damage.every(d=>d.percent>=0&&d.percent<=100));}
  assert(r.history.some(h=>h.combat.supportShots>0));
  if(level===4)assert(r.history.some(h=>h.combat.breachExtra>0));else assert(r.history.some(h=>h.combat.chainTargets>0));
 }
});

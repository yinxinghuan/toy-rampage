import test from 'node:test';
import assert from 'node:assert/strict';
import {Workshop} from '../src/engine.js';
const kinds=['spring','rail','mortar','bubble','drum'];
const fresh=()=>{const g=new Workshop();g.reset('run');return g;};

test('salvage table cannot create value through merges or fusion',()=>{
 const g=fresh();
 for(const kind of kinds){
  assert.deepEqual([1,2,3,4].map(rank=>g.sellValue({kind,rank})),[1,1,2,4]);
  for(const rank of [1,2,3]){
   g.reset('run');g.units=[];g.add(kind,rank,1,2);g.reserve=[{kind,rank},null,null];
   const input=2*g.sellValue({kind,rank});assert.equal(g.place('reserve:0',1,2).type,'merge');
   assert(g.sellValue(g.units[0])<=input);
  }
 }
 g.reset('run');g.units=[];g.add('rail',3,1,2);g.reserve=[{kind:'spring',rank:3},null,null];
 assert.equal(g.place('reserve:0',1,2).type,'fusion');assert.equal(g.sellValue(g.units[0]),4);
});

test('repeated buy-place-salvage batches lose two gears instead of printing money',()=>{
 for(const wave of [0,4]){
  const g=fresh();g.units=[];g.reserve=[null,null,null];g.wave=wave;g.coins=30;
  let batches=0;
  while(g.coins>=5){
   const before=g.coins;assert(g.refresh().ok);
   for(let i=0;i<3;i++){
    assert(g.preview('reserve:'+i,1,2).ok);assert(g.place('reserve:'+i,1,2).ok);
    const id=g.units[0].id;assert(g.sell(id));assert.equal(g.sell(id),false);
   }
   assert.equal(g.coins,before-2);assert(++batches<=15);
  }
  assert.equal(batches,13);assert.equal(g.coins,4);
  assert.equal(30+g.economyLog.reduce((sum,e)=>sum+e.delta,0),g.coins);
 }
});

test('late supply pairs every eligible tier-one kind across fixed seeds',()=>{
 for(const kind of kinds)for(let seed=0;seed<10;seed++){
  const g=fresh();g.units=[];const u=g.add(kind,1,0,0);g.wave=4;g.coins=5;g.seed=seed;
  assert(g.refresh(true).ok);assert.deepEqual(g.reserve[0],{kind,rank:1});
  assert.equal(g.partner('reserve:0'),u.id);assert.equal(g.preview('reserve:0',0,0).type,'merge');
  assert.deepEqual(g.supplyLog[0].cleanup,{unitId:u.id,kind,rank:1});
  assert.equal(g.reserve[2].kind,'bubble');assert.equal(g.reserve[2].rank,2);
 }
});

test('cleanup advances to next oldest orphan, never replacing introduction slot',()=>{
 const g=fresh();g.units=[];const oldest=g.add('spring',1,0,0),next=g.add('drum',1,1,0);
 g.wave=4;g.coins=15;g.refresh(true);assert.equal(g.partner('reserve:0'),oldest.id);
 g.place('reserve:0',0,0);g.refresh(true);assert.equal(g.partner('reserve:0'),next.id);
 assert.equal(g.reserve[2].kind,'drum');g.place('reserve:0',1,0);g.refresh(true);
 assert(g.reserve.every(u=>u.rank===2));assert.equal(g.supplyLog.at(-1).cleanup,null);
});

test('early supply stays tier one; no orphan preserves tier-two baseline',()=>{
 for(const wave of [0,1,2,3,4,7]){
  const g=fresh();g.units=[];g.add('spring',4,0,0);g.add('fusion',4,0,2);
  g.wave=wave;g.coins=5;g.refresh(true);
  assert(g.reserve.every(u=>u.rank===(wave>=4?2:1)));assert.equal(g.supplyLog[0].cleanup,null);
 }
});

test('cancelled and invalid operations do not change money, RNG or ledger',()=>{
 for(const block of ['confirmation','paused','choice','wave','noCoins']){
  const g=fresh();g.coins=5;
  if(block==='paused')g.paused=true;if(block==='choice')g.choices=['supplies'];
  if(block==='wave')g.stage='wave';if(block==='noCoins')g.coins=0;
  const before=JSON.stringify(g);assert.equal(g.refresh(block!=='confirmation').ok,false);
  assert.equal(JSON.stringify(g),before);
 }
 const g=fresh(),before=JSON.stringify(g);g.preview('reserve:2',1,0);g.sell('reserve:0');
 assert.equal(JSON.stringify(g),before);
});

test('ledger records real transactions and detached reports survive reset',()=>{
 const g=fresh();g.choices=['supplies'];g.chooseUpgrade(0);g.refresh(true);
 const unit=g.units[0];g.sell(unit.id);
 assert.deepEqual(g.economyLog.map(e=>[e.reason,e.delta,e.before,e.after]),[
  ['upgrade',5,0,5],['refresh',-5,5,0],['salvage',1,0,1]
 ]);
 assert.equal(g.economyLog.at(-1).unitId,unit.id);
 const report=g.report();g.economyLog[0].delta=99;assert.equal(report.economyLog[0].delta,5);
 g.retry();assert.deepEqual(g.economyLog,[]);assert.equal(report.economyLog.length,3);
});

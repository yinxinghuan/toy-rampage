import test from 'node:test';
import assert from 'node:assert/strict';
import {Workshop} from '../src/engine.js';
import {captureRun,restoreRun,runStore,SAVE_KEY} from '../src/save.js';
import {prepare,upgradeIndex} from './balance.mjs';
test('all six full campaigns and both fusion routes survive repeated snapshots',()=>{
 for(const [level,strategy] of [...Array.from({length:6},(_,i)=>[i,'support']),[4,'route-frost'],[5,'route-storm']]){
  const g=new Workshop();g.reset('run',level);
  for(let w=0;w<8&&!g.ended;w++){
   prepare(g,strategy);assert(restoreRun(captureRun(g)),`ready ${level}/${w}`);g.startWave();
   for(let n=0;n<20000&&(g.stage==='wave'||g.choices.length)&&!g.ended;n++){
    if(g.choices.length){const h=restoreRun(captureRun(g));assert(h,'choices');assert.deepEqual(h.choices,g.choices);g.chooseUpgrade(upgradeIndex(g,strategy));}
    else g.tick(1/60);
    if(n%120===0)assert(restoreRun(captureRun(g)),`combat ${level}/${w}/${n}`);
   }
   assert(restoreRun(captureRun(g)),`wave end ${level}/${w}`);
  }
  assert(g.ended);
 }
});
test('fresh tutorial, active practice and run snapshots restore without shared references',()=>{
 const g=new Workshop();assert(restoreRun(captureRun(g)));g.place('tray',1,2);g.tick(.02);
 const h=restoreRun(JSON.stringify(captureRun(g)));assert(h);assert.deepEqual(captureRun(h),captureRun(g));h.units[0].rank=4;assert.equal(g.units[0].rank,1);
});
test('the separate fusion practice survives every stage including its result',()=>{
 const g=new Workshop();g.reset('lab');assert(restoreRun(captureRun(g)));
 const move=g.fusionMove();assert(move);g.place(move.source,move.target.c,move.target.r);assert.equal(g.stage,'fused');assert(restoreRun(captureRun(g)));
 assert(g.place('tray',3,0).ok);assert(g.startWave());assert(restoreRun(captureRun(g)));
 for(let n=0;n<12000&&!g.ended;n++)g.tick(1/60);
 assert.equal(g.stage,'labend');assert(restoreRun(captureRun(g)));
});
test('midwave recovery is deterministic, keeps choices and never awards twice',()=>{
 const g=new Workshop();g.reset('run',5);g.startWave();for(let i=0;i<180;i++)g.tick(1/60);
 const h=restoreRun(captureRun(g));assert(h);
 for(let i=0;i<20000&&!g.ended;i++){
  if(g.choices.length){assert.deepEqual(h.choices,g.choices);g.chooseUpgrade(0);h.chooseUpgrade(0);}
  g.tick(1/60);h.tick(1/60);
  if(g.stage==='ready'){assert.deepEqual(h.report(),g.report());break;}
 }
 assert.deepEqual(h.report(),g.report());
});
test('bad versions, shapes, resources, ranks, choices and missing fields fail closed',()=>{
 const g=new Workshop();g.reset('run',0);
 for(const mutate of [s=>s.version++,s=>s.state.hp=-1,s=>s.state.units[0].c=6,s=>s.state.units[0].rank=0,s=>s.state.choices=['missing'],s=>delete s.state.board,s=>s.state.reserve=[]]){
  const s=captureRun(g);mutate(s);assert.equal(restoreRun(s),null);
 }
 assert.equal(restoreRun('{broken'),null);
});
test('storage refusal is nonthrowing and touches only this game key',()=>{
 const entries=new Map([['unrelated','keep']]),storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)},store=runStore(storage),g=new Workshop();
 assert.equal(store.load().status,'empty');assert(store.save(g));assert.equal(store.load().status,'ok');assert.equal(entries.get('unrelated'),'keep');assert(entries.has(SAVE_KEY));
 const broken=runStore({getItem(){throw Error('denied');},setItem(){throw Error('quota');}});assert.equal(broken.load().status,'unavailable');assert.equal(broken.save(g),false);
});
test('claimed kit and tier-three fusion restore without another kit or lost old tier-four units',()=>{
 const g=new Workshop();g.reset('run',5);g.wave=2;g.coins=5;assert(g.claimRoute('storm',true).ok);
 g.units=[];g.board.fill(true);g.landRemaining=0;assert(g.place('reserve:1',0,0).ok);assert(g.place('reserve:0',0,0).ok);
 const h=restoreRun(captureRun(g));assert(h);assert.equal(h.units[0].rank,3);assert.deepEqual(h.routeSupplies(),[]);
 h.units[0].rank=4;assert(restoreRun(captureRun(h)));
});

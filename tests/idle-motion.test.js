import test from 'node:test';import assert from 'node:assert/strict';
import {IDLE_PROFILES,idleOffset,idlePose,drawIdleDetail} from '../src/pixel/idle-motion.js';
test('all six weapons rest more than move, with frame progression',()=>{
 for(const[k,p]of Object.entries(IDLE_PROFILES)){
  const poses=Array.from({length:1000},(_,i)=>idlePose(k,i*p.period/1000,'a'));
  assert(poses.filter(s=>s.visible).length<500,k+' rests most of cycle');
  assert(new Set(poses.filter(s=>s.visible).map(s=>s.frame)).size>1,k+' frames');
  assert.notEqual(idleOffset('a',k),idleOffset('b',k));assert.deepEqual(idlePose(k,1,'a'),idlePose(k,1,'a'));
 }
});
test('off, reduced motion, pause/result and attack recovery suppress idle',()=>{
 for(const k of Object.keys(IDLE_PROFILES))for(const opts of [{enabled:false},{reduced:true},{suspended:true},{shotAge:.599}])
  for(let t=0;t<5;t+=.1)assert.deepEqual(idlePose(k,t,'a',opts),{frame:0,visible:false});
 assert.deepEqual(idlePose('unknown',1,'a'),{frame:0,visible:false});
});
test('ambient sampling cannot consume combat randomness',()=>{
 const random=Math.random;Math.random=()=>{throw Error('ambient consumed RNG');};
 try{for(const k of Object.keys(IDLE_PROFILES))idlePose(k,8,'unit-1');}finally{Math.random=random;}
});
test('missing optional atlas has no rendering side effects',()=>{
 assert.equal(drawIdleDetail(null,'rail',null,{visible:true,frame:1}),false);
});

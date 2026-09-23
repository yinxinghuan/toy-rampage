import test from 'node:test';import assert from 'node:assert/strict';
import {Workshop,occupied} from '../src/engine.js';
const setup=()=>{const g=new Workshop();g.reset('run',0);g.units=[];g.board.fill(true);return g;};
test('full board swaps same footprints at different tiers without resetting combat state',()=>{
 const g=setup(),a=g.add('spring',2,0,0),b=g.add('bubble',3,1,0);a.cooldown=.74;b.cooldown=.32;
 for(let r=0;r<5;r++)for(let c=0;c<4;c++)if(!g.at(c,r))g.add('drum',4,c,r);
 const before=g.units.length;assert.equal(g.place(a.id,b.c,b.r).type,'swap');assert.equal(g.units.length,before);
 assert.equal(a.c,1);assert.equal(b.c,0);assert.equal(a.cooldown,.74);assert.equal(b.cooldown,.32);
 assert.equal(new Set(g.units.flatMap(occupied).map(String)).size,20);
});
test('swap validates both shapes, locked cells, boundaries and third-party occupancy atomically',()=>{
 const g=setup(),a=g.add('spring',1,0,0),b=g.add('drum',2,2,0);assert(g.place(a.id,2,0).ok);
 assert.equal(a.c,2);assert.equal(b.c,0);g.add('drum',1,0,1);
 const state=JSON.stringify(g);assert.equal(g.place(a.id,0,0).ok,false);assert.equal(JSON.stringify(g),state);
 g.units.pop();g.board[6]=false;assert.equal(g.place(a.id,0,0).ok,false);
 g.board[6]=true;b.r=6;assert.equal(g.place(a.id,0,6).ok,false);
});
test('merging and fusion take priority, unlike-tier and max-tier board units can swap',()=>{
 for(const ranks of [[1,1],[1,2],[4,4]]){const g=setup(),a=g.add('spring',ranks[0],0,0),b=g.add('spring',ranks[1],1,0);assert.equal(g.place(a.id,b.c,b.r).type,ranks[0]===1&&ranks[1]===1?'merge':'swap');}
 const g=setup(),a=g.add('spring',3,0,0),b=g.add('rail',3,0,2);assert.equal(g.place(a.id,b.c,b.r).type,'fusion');
});
test('reserve merges work on a full board and conserve tier value without currency changes',()=>{
 const g=setup();for(let r=0;r<5;r++)for(let c=0;c<4;c++)g.add('drum',4,c,r);
 g.reserve=[{kind:'spring',rank:2},{kind:'spring',rank:2},{kind:'rail',rank:1}];const board=JSON.stringify(g.units),coins=g.coins;
 assert(g.mergeReserve('reserve:0','reserve:1').ok);assert.equal(g.reserve[0],null);assert.deepEqual(g.reserve[1],{kind:'spring',rank:3});
 assert.equal(JSON.stringify(g.units),board);assert.equal(g.coins,coins);assert.equal(g.merges,1);
 assert.equal(g.mergeReserve('reserve:0','reserve:1').ok,false);
});
test('reserve rejects unlike types, tiers, cap, self and non-reserve sources without mutation',()=>{
 for(const pair of [[['spring',1],['rail',1]],[['spring',1],['spring',2]],[['spring',4],['spring',4]]]){
 const g=setup();g.reserve=pair.map(([kind,rank])=>({kind,rank}));const state=JSON.stringify(g);
 assert.equal(g.mergeReserve('reserve:0','reserve:1').ok,false);assert.equal(JSON.stringify(g),state);}
 const g=setup();g.reserve=[{kind:'rail',rank:3},{kind:'rail',rank:3},null];
 for(const source of ['reserve:1','land',1,null])assert.equal(g.mergeReserve(source,'reserve:1').ok,false);
 for(const mode of ['paused','choices','ended']){g.paused=mode==='paused';g.choices=mode==='choices'?['supplies']:[];g.stage=mode==='ended'?'win':'ready';assert.equal(g.mergeReserve('reserve:0','reserve:1').ok,false);}
});

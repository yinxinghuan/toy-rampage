import test from 'node:test';import assert from 'node:assert/strict';
import {sceneDepth} from '../src/pixel/scene-depth.js';
import {snapGridAxis} from '../src/grid-input.js';
import {Workshop,COLS,ROWS,CELL,GY,occupied} from '../src/engine.js';
test('42 cells, stable feet depth and corner continuity independent of aim',()=>{
 assert.equal(COLS*ROWS,42);assert.equal(CELL,45);
 for(const h of [320,390,600]){
  const bottom=sceneDepth((GY+7*CELL)/374*h,h);
  assert(sceneDepth(346/374*h,h,true)>bottom);
  assert(sceneDepth(24/374*h,h,true)<sceneDepth((GY+CELL)/374*h,h));
  assert(sceneDepth(200,h,true)>sceneDepth(200,h));
 }
});
test('small-cell snap holds edge jitter and releases without finding a different legal cell',()=>{
 assert.equal(snapGridAxis(2.02,1),1);assert.equal(snapGridAxis(2.12,1),2);
 assert.equal(snapGridAxis(1.98,2),2);assert.equal(snapGridAxis(1.8,2),1);
 assert.equal(snapGridAxis(-1,2),-1);assert.equal(snapGridAxis(3.2,undefined),3);
});
test('four-cell square shares land budget, consumes once and keeps an actual square mask',()=>{
 const g=new Workshop();g.reset('run');g.landRemaining=4;
 assert.equal(g.landOffers().length,3);assert.equal(g.get('land:square').kind,'plot4');
 const p=g.place('land:square',1,0);assert(p.ok);assert.equal(p.tiles.length,4);
 assert.deepEqual(p.tiles,occupied({kind:'plot4',c:1,r:0}));assert.equal(g.landRemaining,0);assert.equal(g.get('land:square'),undefined);
});

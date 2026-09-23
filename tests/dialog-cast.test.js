import test from 'node:test';
import assert from 'node:assert/strict';
import {CAST_POOLS,createCastPicker} from '../src/pixel/dialog-cast.js';
test('cast bags cover each outcome without immediate repetition, including boundaries',()=>{
 for(const random of [0,.2,.51,.999]){
  const pick=createCastPicker(CAST_POOLS,()=>random);
  for(const kind of ['win','lose']){
   const all=Array.from({length:30},()=>pick(kind));
   for(let i=1;i<all.length;i++)assert.notEqual(all[i],all[i-1]);
   for(let i=0;i<all.length;i+=3)assert.deepEqual([...all.slice(i,i+3)].sort(),[...CAST_POOLS[kind]].sort());
  }
  assert.equal(pick('upgrade'),'upgrade');assert.equal(pick('upgrade'),'upgrade');assert.equal(pick('pause'),null);
 }
});
test('win and lose draws do not consume each other’s bag',()=>{
 const a=createCastPicker(CAST_POOLS,()=>.4),b=createCastPicker(CAST_POOLS,()=>.4);
 for(let i=0;i<9;i++){assert.equal(a('win'),b('win'));a('lose');}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPreloader} from '../src/play/preload.js';
test('preloader limits concurrency and counts only successful preparation',async()=>{
 let active=0,peak=0;const progress=[];
 const loader=createPreloader({total:15,concurrency:3,onProgress:p=>progress.push(p.completed)});
 await Promise.all(Array.from({length:15},()=>loader.run(async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;return true;})));
 assert.equal(peak,3);assert.deepEqual(progress,Array.from({length:15},(_,i)=>i+1));loader.cancel();
});
test('failed assets do not claim successful preparation; cancelled queue never starts',async()=>{
 const progress=[],loader=createPreloader({total:3,concurrency:1,onProgress:p=>progress.push(p.completed)});
 const failure=loader.run(()=>{throw Error('broken')});await assert.rejects(failure,/broken/);assert.deepEqual(progress,[]);
 let started=false;const a=loader.run(signal=>new Promise((resolve,reject)=>{if(signal.aborted)reject(Error('aborted'));else signal.addEventListener('abort',()=>reject(Error('aborted')));}));
 const b=loader.run(()=>{started=true;});const outcome=Promise.allSettled([a,b]);loader.cancel();assert((await outcome).every(v=>v.status==='rejected'));assert.equal(started,false);
});
test('timeout aborts a running request',async()=>{const loader=createPreloader({total:1,timeout:5,onProgress:()=>{}});await assert.rejects(loader.run(signal=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout'))))),/timeout/);loader.cancel();});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {musicBed,createMusic} from '../src/play/music.js';
test('music follows play/pause, not simulation speed',()=>{
 assert.equal(musicBed({stage:'ready'}),'workshop');assert.equal(musicBed({stage:'wave',speed:2}),'patrol');
 for(const state of [{stage:'wave',paused:true},{stage:'ready',hidden:true},{stage:'wave',mode:'upgrade'},{stage:'win'},{stage:'lose'},{stage:'labend'}])assert.equal(musicBed(state),null);
});
test('crossfade scheduling, modal cue deduplication, mute and late-load cancellation',async t=>{
 const old=globalThis.document;globalThis.document=Object.assign(new EventTarget(),{hidden:false});t.after(()=>{if(old)globalThis.document=old;else delete globalThis.document;});
 const events=[],states=[];let tick;const param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
 const context={state:'running',currentTime:0,destination:{},decodeAudioData:async()=>({duration:32}),createGain(){return{gain:param(),connect(){return this;},disconnect(){}};},createBufferSource(){return{buffer:null,connect(node){return node;},disconnect(){},start(...args){events.push(args);},stop(){this.onended?.();}};}};
 t.mock.method(globalThis,'fetch',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}));
 t.mock.method(globalThis,'setInterval',fn=>{tick=fn;return 1;});t.mock.method(globalThis,'clearInterval',()=>{});
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 const music=createMusic({getContext:()=>context,base:new URL('https://example.invalid/'),onState:s=>states.push(s)});
 music.setEnabled(true);await settle();assert.equal(events.length,1);
 context.currentTime=30.5;tick();assert.equal(events.length,2);assert(Math.abs(events[1][0]-(events[0][0]+31.5-.8))<.001,'overlapping scheduled loop, not gap replay');
 music.update({stage:'wave',mode:'upgrade'});await settle();const count=events.length;assert.equal(count,3);music.update({stage:'wave',mode:'upgrade'});await settle();assert.equal(events.length,count,'one cue per modal entry');
 music.update({stage:'ready',mode:''});music.setEnabled(false);await settle();assert.equal(events.length,count,'late decoded bed must not play after mute');assert.equal(states.at(-1).bed,null);
 music.destroy();
});

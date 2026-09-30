import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBattleArt,CORE_ART_TASK_COUNT,BATTLE_ART_TASK_COUNT} from '../src/pixel/battle-art-loader.js';
const root=new URL('https://example.test/animation/');
const spec={size:[128,160],logical:[128,128]};
test('playable artwork excludes optional directions, idle details and upgrades',async()=>{
 const requests=[];
 const image=async url=>{requests.push(url);return{url};};
 const readJSON=async url=>{requests.push(url);return spec;};
 const art=await loadBattleArt(root,{image,readJSON,progressive:true});
 assert.equal(requests.length,CORE_ART_TASK_COUNT);
 assert(!requests.some(u=>u.includes('/idle-v1/')||u.includes('/upgrade/')||u.includes('head-0')||u.includes('frame-1')));
 assert.equal(art.spring.length,8);assert(art.spring.every(x=>x===art.spring[0]));
 for(const aim of Object.values(art.aim))assert(aim.heads.every(x=>x===aim.heads[6]));
 assert.equal(art.enemy.brood,art.enemy.swarm);assert.equal(art.projectile.frost,art.projectile.bubble);
 await art.loadDetails();assert.notEqual(art.spring[0],art.spring[1]);assert(art.upgrade.spring);assert(art.idle.rail);
});
test('failed optional artwork leaves a complete playable fallback and never rejects',async()=>{
 const image=async url=>{if(url.includes('/idle-v1/')||url.includes('head-0')||url.includes('frame-1')||url.includes('/upgrade/'))throw Error('offline');return{url};};
 const art=await loadBattleArt(root,{image,readJSON:async()=>spec,progressive:true});
 const initial=art.aim.rail.heads.slice();const results=await art.loadDetails();
 assert(results.some(r=>r.status==='rejected'));assert.deepEqual(art.aim.rail.heads,initial);assert.equal(art.spring.length,8);
});
test('required art failure rejects rather than allowing an invisible playable unit',async()=>{
 await assert.rejects(loadBattleArt(root,{image:async()=>{throw Error('offline')},readJSON:async()=>spec,progressive:true}),/offline/);
});

test('default full-loading API still prepares all details and reports unique requests',async()=>{
 let requests=0;
 const art=await loadBattleArt(root,{image:async url=>{requests++;return{url}},readJSON:async()=>{requests++;return spec},requireIdle:true});
 assert.equal(requests,BATTLE_ART_TASK_COUNT);assert(art.idle.fusion);assert(art.upgrade.rail);
 assert(new Set(art.aim.rail.heads).size===8);
 await assert.rejects(loadBattleArt(root,{image:async url=>{if(url.includes('/idle-v1/'))throw Error('idle missing');return{url}},readJSON:async()=>spec,requireIdle:true}),/idle missing/);
});

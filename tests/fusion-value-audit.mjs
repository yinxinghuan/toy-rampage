import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workshop,occupied,LENGTH,STATS} from '../src/engine.js';
import {fusionRecipe} from '../src/fusions.js';
const waves={crowd:{kind:'swarm',count:24,hp:180,speed:62,gap:.25},armor:{kind:'plated',count:12,hp:260,speed:45,gap:.6},solo:{kind:'boss',count:1,hp:2800,bossHp:2800,speed:28,bossSpeed:28,gap:1}};
const layouts={frost:[['bubble',3,0,0],['spring',3,1,0],['mortar',3,2,0],['rail',3,0,3],['drum',2,0,2]],storm:[['arc',3,0,0],['rail',3,0,2],['spring',3,3,0],['bubble',3,3,2],['drum',2,2,3]]};
const results=[];
const hpScale=Number(process.env.QA_FIXTURE_HP||1);assert(hpScale>0&&hpScale<=2);
for(const [id,w]of Object.entries(waves))if(id!=='solo')w.hp*=hpScale;
const stormDamage=process.env.QA_STORM_DAMAGE?Number(process.env.QA_STORM_DAMAGE):null;
if(stormDamage){assert(stormDamage>=60&&stormDamage<=100);STATS.storm.damage=stormDamage;}
for(const route of ['frost','storm'])for(const scene of Object.keys(waves))for(const fused of [false,true]){
 const g=new Workshop();g.reset('run',5);g.units=[];g.board.fill(true);g.reserve=[null,null,null];g.upgradeLevel=6;
 const keys=new Set();for(const [kind,rank,c,r]of layouts[route]){for(const[x,y]of occupied({kind,c,r})){assert(g.hasCell(x,y));assert(!keys.has(`${x},${y}`));keys.add(`${x},${y}`);}g.add(kind,rank,c,r);}
 const recipe=fusionRecipe(route),source=g.units.find(u=>u.kind===recipe.material),anchor=g.units.find(u=>u.kind===recipe.anchor);
 if(fused){const result=g.place(source.id,anchor.c,anchor.r);assert(result.ok);assert.equal(result.kind,route);}
 g.waves=[structuredClone(waves[scene])];assert(g.startWave());let ticks=0,pressure=0;
 while(!g.ended){assert(++ticks<15000);g.tick(1/60);pressure=Math.max(pressure,...g.enemies.map(e=>e.d/LENGTH));}
 results.push({route,scene,fused,hp:g.hp,leaks:g.leaks,seconds:Math.round(ticks/60*100)/100,pressure:Math.round(pressure*1000)/1000,report:g.report()});
}
const out=process.env.QA_OUT||'_qa/fusion-value';await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/results.json',JSON.stringify({note:'Isolated crowd/armor/single boss fixtures with identical legal material budgets and support positions. Only fusion changes, no extra item added into freed space. Not authored campaign win rates.',results},null,2));
console.table(results.map(({report,...r})=>r));

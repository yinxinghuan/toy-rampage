// Offline, fixed-layout counterfactuals. Never imported by the application.
// Only one upgrade changes between paired runs; this is not a player win rate.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workshop,occupied,LENGTH,UPGRADES} from '../src/engine.js';

const scenarios=[
 {id:'armor-cooperation',level:4,wave:4,units:[['rivet',3,0,0],['spring',3,1,0],['rail',3,0,3],['drum',2,1,2],['bubble',2,3,0]]},
 {id:'chain-crowd',level:5,wave:4,units:[['arc',3,0,0],['arc',2,2,0],['bubble',2,3,2],['drum',2,2,2],['rail',2,0,4]]},
 {id:'fusion-boss',level:5,wave:8,units:[['fusion',4,0,3],['bubble',3,3,0],['drum',3,2,2],['spring',3,0,0]]},
 {id:'blast-crowd',level:5,wave:3,units:[['mortar',3,0,0],['bubble',2,3,0],['drum',2,2,1],['rail',3,0,3]]},
];
export function counterfactual(s,id){
 const g=new Workshop();g.reset('run',s.level);g.units=[];g.board.fill(true);g.reserve=[null,null,null];
 const used=new Set();for(const[kind,rank,c,r]of s.units){
  for(const[x,y]of occupied({kind,c,r})){assert(g.hasCell(x,y));assert(!used.has(`${x},${y}`));used.add(`${x},${y}`);}
  g.add(kind,rank,c,r);
 }
 g.wave=s.wave-1;g.upgradeLevel=6; // Prevent unrelated mid-wave choices in this paired experiment.
 if(id){g.choices=[id];assert(g.chooseUpgrade(0));}
 assert(g.startWave());let ticks=0,pressure=0;
 while(g.stage==='wave'&&!g.ended){
  assert(++ticks<20000,'bounded wave');g.tick(1/60);
  pressure=Math.max(pressure,...g.enemies.map(e=>e.d/LENGTH));
 }
 return{scenario:s.id,upgrade:id||'none',hp:g.hp,leaks:g.leaks,seconds:Math.round(ticks/60*100)/100,pressure:Math.round(pressure*1000)/1000,combat:g.combatReport};
}
const results=scenarios.flatMap(s=>[null,...UPGRADES.filter(u=>u.kind&&s.units.some(([k])=>k===u.kind||(k==='fusion'&&['spring','rail'].includes(u.kind)))).map(u=>u.id)].map(id=>counterfactual(s,id)));
const out=process.env.QA_OUT||'_qa/upgrade-choice';await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/results.json',JSON.stringify({note:'Fixed legal layouts and authored waves; only one upgrade changes. No production numeric override; not human win rates.',results},null,2));
console.table(results.map(({combat,...r})=>({...r,damage:Math.round(Object.values(combat.damage).reduce((a,b)=>a+b,0)),breach:Math.round(combat.breachExtra),chain:combat.chainTargets})));

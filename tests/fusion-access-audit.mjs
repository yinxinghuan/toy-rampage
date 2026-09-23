import fs from 'node:fs/promises';
import {Workshop} from '../src/engine.js';
import {prepare,upgradeIndex} from './balance.mjs';
const results=[];
for(const seed of [9173,1,42,2026,8675309])for(const level of [3,4,5])for(const strategy of ['trial-no-fusion','trial-spread','blast','kit-frost',...(level===5?['kit-storm']:[])]){
 const g=new Workshop();g.reset('run',level);g.seed=seed;
 for(let wave=0;wave<8&&!g.ended;wave++){
  prepare(g,strategy);g.startWave();
  for(let n=0;n<18000&&!g.ended&&(g.stage==='wave'||g.choices.length);n++){
   if(g.choices.length)g.chooseUpgrade(upgradeIndex(g,strategy));else g.tick(1/60);
  }
 }
 const first=g.history.find(h=>h.startUnits.some(u=>['frost','storm'].includes(u.kind)));
 results.push({seed,level:level+1,strategy,outcome:g.stage,hp:g.hp,firstFusionBeforeWave:first?.wave??null,kit:g.supplyLog.find(x=>x.route)??null,spend:-g.economyLog.filter(x=>x.delta<0).reduce((n,x)=>n+x.delta,0),waveHp:g.history.map(h=>h.hp)});
}
await fs.mkdir('_qa/r44',{recursive:true});await fs.writeFile('_qa/r44/access.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results.filter(r=>r.seed===9173),null,2));
console.log('Trials',results.length,'kit first fusion',results.filter(r=>r.kit).map(r=>r.firstFusionBeforeWave));

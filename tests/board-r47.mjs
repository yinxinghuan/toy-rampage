import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Workshop} from '../src/engine.js';
import {prepare,upgradeIndex} from './balance.mjs';
const baseline=process.argv[2];if(!baseline)throw Error('Pass a git-archive baseline directory');
const old=await import(pathToFileURL(baseline+'/src/engine.js'));
const policy=await import(pathToFileURL(baseline+'/tests/balance.mjs'));
const run=(Engine,prep,up,level,strategy,seed)=>{
 const g=new Engine();g.reset('run',level);g.seed=seed;
 for(let wave=0;wave<8&&!g.ended;wave++){prep(g,strategy);g.startWave();for(let n=0;n<8000&&!g.ended&&(g.stage==='wave'||g.choices.length);n++){if(g.choices.length)g.chooseUpgrade(up(g,strategy));else g.tick(1/60);}}
 return{outcome:g.stage,hp:g.hp,cells:g.board.filter(Boolean).length,units:g.lineup(),waveHp:g.history.map(h=>h.hp)};
};
const results=[];for(const level of [4,5])for(const strategy of ['idle','trial-spread','trial-no-fusion','trial','kit-frost',...(level===5?['kit-storm']:[])])for(const seed of [9173,12345,4517,42,2026])results.push({level:level+1,strategy,seed,before:run(old.Workshop,policy.prepare,policy.upgradeIndex,level,strategy,seed),after:run(Workshop,prepare,upgradeIndex,level,strategy,seed)});
await fs.mkdir('_qa',{recursive:true});await fs.writeFile(process.env.QA_REPORT||'_qa/board-r47.json',JSON.stringify(results,null,2));
for(const level of [5,6])for(const strategy of [...new Set(results.filter(r=>r.level===level).map(r=>r.strategy))]){const group=results.filter(r=>r.level===level&&r.strategy===strategy);console.log(JSON.stringify({level,strategy,beforeWins:group.filter(r=>r.before.outcome==='win').length,afterWins:group.filter(r=>r.after.outcome==='win').length,beforeHP:group.map(r=>r.before.hp),afterHP:group.map(r=>r.after.hp)}));}

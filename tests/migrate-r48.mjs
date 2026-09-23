import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {restoreRun,captureRun} from '../src/save.js';
const base=process.argv[2];if(!base)throw Error('Pass r47 git-archive path');
const {Workshop}=await import(pathToFileURL(base+'/src/engine.js'));
const oldSave=await import(pathToFileURL(base+'/src/save.js'));
const {prepare,upgradeIndex}=await import(pathToFileURL(base+'/tests/balance.mjs'));
let checked=0;
function check(g){
 const h=restoreRun(oldSave.captureRun(g));assert(h);
 assert.deepEqual(h.board,g.board);assert.deepEqual(h.lineup(),g.lineup());
 for(const key of ['hp','coins','wave','reserve','enemies','choices','history'])assert.deepEqual(h[key],g[key],key);
 assert.deepEqual(captureRun(restoreRun(captureRun(h))),captureRun(h));
 checked++;
}
for(let level=0;level<6;level++){
 const g=new Workshop();g.reset('run',level);check(g);
 for(let w=0;w<8&&!g.ended;w++){
  prepare(g,'trial');check(g);g.startWave();check(g);
  for(let n=0;n<8000&&!g.ended&&(g.stage==='wave'||g.choices.length);n++){
   if(g.choices.length){check(g);g.chooseUpgrade(upgradeIndex(g,'trial'));}
   else g.tick(1/60);
  }check(g);
 }
}
const g=new Workshop();check(g);
await fs.writeFile('_qa/migration-r48.json',JSON.stringify({checked,oldVersion:2,newVersion:3,preserved:['board','lineup','hp','coins','wave','reserve','enemies','choices','history']},null,2));
console.log('PASS',checked,'real r47 snapshots migrated without rearrangement or repeat grant');

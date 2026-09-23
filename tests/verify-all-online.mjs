import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const run=promisify(execFile),base='https://game.aiwaves.tech/0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae/',files=[],results=[];
async function walk(dir=''){for(const entry of await fs.readdir('dist/'+dir,{withFileTypes:true})){const path=dir+entry.name;if(entry.isDirectory())await walk(path+'/');else files.push(path);}}
await walk();let next=0;const sha=b=>createHash('sha256').update(b).digest('hex');
await Promise.all(Array.from({length:6},async()=>{while(next<files.length){const path=files[next++],local=await fs.readFile('dist/'+path),remote=(await run('curl',['-fsS','--retry','2','--connect-timeout','10','--max-time','45',new URL(path,base).href],{encoding:'buffer',maxBuffer:20*1024*1024})).stdout;assert.equal(sha(remote),sha(local),path);results.push({path,bytes:remote.length,sha:sha(remote)});}}));
await fs.mkdir('_qa/release-'+(process.env.QA_VERSION||'r43'),{recursive:true});await fs.writeFile('_qa/release-'+(process.env.QA_VERSION||'r43')+'/all-files.json',JSON.stringify({base,verifiedAt:new Date().toISOString(),count:results.length,files:results},null,2));console.log('All',results.length,'deployed files match dist');

import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const run=promisify(execFile),base='https://game.aiwaves.tech/0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae/',files=[],results=[];
// Fail early on malformed release metadata before downloading the complete asset set.
JSON.parse(await fs.readFile('dist/review-build.json','utf8'));
async function walk(dir,rel=''){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=rel+e.name;if(e.isDirectory())await walk(dir+'/'+e.name,p+'/');else files.push(p);}}
await walk('dist');
const sha=b=>createHash('sha256').update(b).digest('hex');
const get=async path=>{const url=new URL(path,base);url.searchParams.set('verify','r16-lane-clearance');return(await run('curl',['-fsS','--connect-timeout','10','--max-time','40',url.href],{encoding:'buffer',maxBuffer:20*1024*1024})).stdout;};
let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<files.length){const path=files[cursor++],local=await fs.readFile('dist/'+path),remote=await get(path);assert.equal(sha(remote),sha(local),path);results.push({path,bytes:remote.length,sha256:sha(remote)});console.log('verified',path);}}));
const build=JSON.parse(await get('review-build.json'));assert.equal(build.build,'toy-rampage-review-20260912-r16-lane-clearance');const html=(await get('pixel-lab/')).toString();assert(html.includes(build.build));
const health=JSON.parse(await get('api/health'));assert.equal(health.persistence,false);
await fs.mkdir('_qa',{recursive:true});await fs.writeFile('_qa/review-online-verification.json',JSON.stringify({base,build,health,verifiedAt:new Date().toISOString(),files:results},null,2));console.log('PASS',results.length,'files');

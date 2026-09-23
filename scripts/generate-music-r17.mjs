// Uses the unmodified public-service Agent helper copied from alteru-media-service.
import fs from 'node:fs/promises';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile),root=path.resolve(import.meta.dirname,'..');
const spec=JSON.parse(await fs.readFile(path.join(root,'doc/music-r17-requests.json'),'utf8'));
if(!(spec.kind==='music'||spec.kind==='sfx'))throw Error('Unsupported media kind');
const dir=path.join(root,'_production/music-r17');await fs.mkdir(dir,{recursive:true});let cursor=0;
await Promise.all(Array.from({length:2},async()=>{while(cursor<spec.jobs.length){
 const job=spec.jobs[cursor++],output=path.join(dir,job.id+'.mp3');
 try{await fs.access(output);console.log('Retained existing candidate',job.id);continue;}catch(e){if(e.code!=='ENOENT')throw e;}
 console.log('Generating',job.id,job.requestId);
 // IDs are saved before submission. An ambiguous failure resumes with the SAME ID.
 const result=await run(process.execPath,[path.join(root,'scripts/media-audio-agent.mjs'),'--session-id',spec.session_id,'--request-id',job.requestId,'--kind',spec.kind,'--prompt',job.prompt,'--duration',String(job.duration),'--output',output],{env:{...process.env,NODE_USE_ENV_PROXY:'1'},maxBuffer:1024*1024});
 const record=JSON.parse(result.stdout);await fs.writeFile(path.join(dir,job.id+'.json'),JSON.stringify(record,null,2)+'\n');console.log('Saved',job.id,record.task_id);
}}));

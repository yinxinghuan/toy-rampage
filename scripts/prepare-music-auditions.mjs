// Audition-level mastering only: originals retained, no claim of perceptual/loop approval.
import fs from 'node:fs/promises';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),spec=JSON.parse(await fs.readFile(path.join(root,'doc/music-r17-requests.json'),'utf8'));
const dir=path.join(root,'public/audio/music-r17');await fs.mkdir(dir,{recursive:true});const assets=[];
const meterFrom=log=>{const json=log.match(/\{\s*"input_i"[\s\S]*?\}/g)?.at(-1);if(!json)throw Error('No loudness measurement');return JSON.parse(json);};
for(const job of spec.jobs){
 const input=path.join(root,'_production/music-r17',job.id+'.mp3'),output=path.join(dir,job.id+'.mp3'),music=['workshop','patrol'].includes(job.id),target=music?-24:-20;
 const probe=JSON.parse((await run('ffprobe',['-v','error','-show_format','-show_streams','-of','json',input])).stdout),s=probe.streams.find(s=>s.codec_type==='audio');
 if(s.sample_rate!=='44100'||s.channels!==2)throw Error(job.id+' source format mismatch');
 const result=await run('ffmpeg',['-hide_banner','-i',input,'-af',`loudnorm=I=${target}:TP=-2:LRA=7:print_format=json`,'-f','null','-'],{maxBuffer:1024*1024});
 const first=meterFrom(result.stderr);if(!Number.isFinite(Number(first.input_i)))throw Error(job.id+' silent or invalid loudness');
 // Floating MP3 decode can exceed 0 dBFS. First attenuate unusually hot material;
 // loudnorm's measured_I accepts only <= 0. This does not certify distortion-free audio.
 const hot=Number(first.input_i)>0||Number(first.input_tp)>0;
 const norm=Number(first.input_i)>0?`volume=${Math.min(target-Number(first.input_i),-2-Number(first.input_tp))}dB`:`loudnorm=I=${target}:TP=-2:LRA=7:measured_I=${first.input_i}:measured_TP=${first.input_tp}:measured_LRA=${first.input_lra}:measured_thresh=${first.input_thresh}:offset=${first.target_offset}:linear=true`;
 let exists=false;try{await fs.access(output);exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!exists)await run('ffmpeg',['-hide_banner','-loglevel','error','-n','-i',input,'-af',norm,'-ar','44100','-ac','2','-codec:a','libmp3lame','-b:a','128k',output]);
 const scan=await run('ffmpeg',['-hide_banner','-i',output,'-af','loudnorm=I=-24:TP=-2:LRA=7:print_format=json,silencedetect=noise=-50dB:d=0.1','-f','null','-'],{maxBuffer:1024*1024});
 const meter=meterFrom(scan.stderr);const task=JSON.parse(await fs.readFile(path.join(root,'_production/music-r17',job.id+'.json'),'utf8'));
 if(Number(meter.input_tp)>-1)throw Error(job.id+' audition peak too high');
 assets.push({id:job.id,name:job.name,file:job.id+'.mp3',task_id:task.task_id,request_id:job.requestId,requestedDuration:job.duration,actualContainerDuration:Number(probe.format.duration),sampleRate:44100,channels:2,targetLUFS:target,measuredLUFS:Number(meter.input_i),truePeakDbTP:Number(meter.input_tp),rawLUFS:Number(first.input_i),rawTruePeak:Number(first.input_tp),rawOverZero:hot,silenceLog:scan.stderr.split('\n').filter(l=>l.includes('silence_start:')||l.includes('silence_end:')),perceptualReview:'pending full human listening; attenuation is not distortion repair',loopApproved:false});
 console.log(job.id,'LUFS',meter.input_i,'peak',meter.input_tp);
}
await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({status:'audition-only; not game runtime music',source:'AlterU Media Service public audio API',assets},null,2)+'\n');

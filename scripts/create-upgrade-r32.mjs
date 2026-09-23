// Original deterministic PCM composition. No downloaded samples or generation service.
import fs from 'node:fs/promises';
const sr=44100,duration=1.8,n=Math.round(sr*duration),pcm=new Float64Array(n);
for(let i=0;i<n;i++){
 const t=i/sr;let sample=0;
 // A musical phrase for the popup, not equipment Foley or the merge impact.
 // Soft celesta/plucked keys: C5 E5 G5 D6 C6 over a quiet C-major bed.
 for(const [start,hz,level] of [[.025,523.25,.13],[.20,659.25,.12],[.385,784,.115],[.60,1174.66,.075],[.81,1046.5,.095]]){
  const u=t-start;if(u<0)continue;
  const envelope=(1-Math.exp(-u/.013))*Math.exp(-u/.19);
  sample+=level*envelope*(Math.sin(2*Math.PI*hz*u)+.12*Math.sin(2*Math.PI*hz*2.002*u)*Math.exp(-u/.13)+.025*Math.sin(2*Math.PI*hz*3*u)*Math.exp(-u/.06));
 }
 for(const hz of [261.63,329.63,392])sample+=.013*(1-Math.exp(-t/.075))*Math.exp(-t/.48)*Math.sin(2*Math.PI*hz*t);
 pcm[i]=sample*Math.min(1,(duration-t)/.07);
}
const peak=Math.max(...pcm.map(Math.abs)),rms=Math.sqrt(pcm.reduce((s,x)=>s+x*x,0)/n);
const wav=Buffer.alloc(44+n*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*4,40);
for(let i=0;i<n;i++)for(let c=0;c<2;c++)wav.writeInt16LE(Math.round(pcm[i]*32767),44+i*4+c*2);
await fs.mkdir('public/audio/music-r32',{recursive:true});await fs.writeFile('public/audio/music-r32/upgrade.wav',wav);
await fs.writeFile('public/audio/music-r32/manifest.json',JSON.stringify({source:'Original deterministic PCM composition',script:'scripts/create-upgrade-r32.mjs',duration,sampleRate:sr,channels:2,peakDb:20*Math.log10(peak),rmsDb:20*Math.log10(rms),description:'Upgrade popup music: soft five-note celesta phrase over a restrained major chord; no mechanical clicks, vocals, bass hit or long reverb. Equipment upgrade SFX unchanged.',humanListening:'pending user audition'},null,2)+'\n');
console.log({duration,bytes:wav.length,peakDb:20*Math.log10(peak),rmsDb:20*Math.log10(rms)});

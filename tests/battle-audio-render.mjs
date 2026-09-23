import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const out='_qa/audio-r10',asset='public/audio/battle-v2';await fs.mkdir(out,{recursive:true});await fs.mkdir(asset,{recursive:true});const browser=await chromium.launch();
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:5193/pixel-lab/');
 const result=await page.evaluate(async()=>{
  const {createBattleSoundBank}=await import('/src/pixel/battle-audio.js');const entries=[];
  for(const kind of['spring','rail','mortar','bubble','drum','fusion','upgrade','stress']){
   const ctx=new OfflineAudioContext(1,48000,48000),bank=createBattleSoundBank(ctx);let accepted=[];
   if(kind==='stress')for(const k of['spring','rail','mortar','bubble','drum','fusion','upgrade'])accepted.push(bank.play(k,'launch',.05));
   else{bank.play(kind,'launch',.05);if(['spring','mortar','bubble'].includes(kind))bank.play(kind,'impact',.27);}
   const voicePeak=bank.voices,rendered=await ctx.startRendering(),data=rendered.getChannelData(0);let peak=0,power=0,tail=0;
   const wav=new ArrayBuffer(44+data.length*2),v=new DataView(wav);const str=(p,s)=>[...s].forEach((c,i)=>v.setUint8(p+i,c.charCodeAt(0)));str(0,'RIFF');v.setUint32(4,36+data.length*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,48000,true);v.setUint32(28,96000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,data.length*2,true);
   for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));power+=data[i]*data[i];if(i>data.length*.8)tail=Math.max(tail,Math.abs(data[i]));v.setInt16(44+i*2,Math.max(-1,Math.min(1,data[i]))*32767,true);}
   let binary='';for(const n of new Uint8Array(wav))binary+=String.fromCharCode(n);
   entries.push({kind,peak,rms:Math.sqrt(power/data.length),tail,voicePeak,accepted,remaining:bank.voices,wav:btoa(binary)});bank.destroy();
  }
  const muted=new OfflineAudioContext(1,48000,48000),bank=createBattleSoundBank(muted);bank.play('fusion','launch',.02);const pause=muted.suspend(.08);const rendering=muted.startRendering();await pause;bank.hush();await muted.resume();const pcm=(await rendering).getChannelData(0);let tail=0;for(let i=12000;i<pcm.length;i++)tail=Math.max(tail,Math.abs(pcm[i]));if(tail>.001)throw Error('Mute left an audible tail');bank.destroy();return entries;
 });
 for(const r of result){assert(r.peak>.02&&r.peak<.85,r.kind+' peak '+r.peak);assert(r.tail<.001,r.kind+' tail');assert.equal(r.remaining,0);if(r.kind==='stress'){assert.equal(r.voicePeak,6);assert.deepEqual(r.accepted,[true,true,true,true,true,true,false]);}await fs.writeFile((r.kind==='stress'?out:asset)+'/'+r.kind+'.wav',Buffer.from(r.wav,'base64'));delete r.wav;}
 await fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}

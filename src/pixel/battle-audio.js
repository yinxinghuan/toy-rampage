// Original procedural material sounds; live playback and offline QA share this bank.
// One voice is an event with several layers, not an oscillator. No autoplay/samples.
export function createBattleSoundBank(context, destination=context.destination){
 const master=context.createGain(),compressor=context.createDynamicsCompressor();
 master.gain.value=.62;compressor.threshold.value=-14;compressor.knee.value=12;compressor.ratio.value=6;compressor.attack.value=.003;compressor.release.value=.1;
 const limiter=context.createWaveShaper(),curve=new Float32Array(2048);
 for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=.85*Math.tanh(x/.85);}
 limiter.curve=curve;master.connect(compressor).connect(limiter).connect(destination);
 const noise=context.createBuffer(1,Math.ceil(context.sampleRate*.5),context.sampleRate);
 let seed=0x71b37;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=random()*2-1;
 const active=new Set(),last=new Map();let serial=0;
 function play(kind,phase='launch',at=context.currentTime){
  const key=kind+phase;if(at-(last.get(key)??-100)<(kind==='drum'?.6:.035))return false;
  // Scheduled OfflineAudioContext events also obey the event-voice cap.
  for(const v of active)if(v.end<=at)active.delete(v);
  if(active.size>=6)return false;last.set(key,at);
  const variation=[1,.978,1.022,.991,1.012][serial++%5],bus=context.createGain(),nodes=[],sources=[];
  bus.connect(master);const v={end:at,stop:(immediate=false)=>{const now=context.currentTime;bus.gain.cancelScheduledValues(now);if(immediate)bus.gain.setValueAtTime(0,now);else bus.gain.setTargetAtTime(.0001,now,.003);for(const s of sources)try{s.stop(now+(immediate?0:.015));}catch{ /* already ended */ }}};
  active.add(v);let remaining=0;
  function layer(source,duration,level,delay=0,filter=null){
   const t=at+delay,g=context.createGain();nodes.push(g);sources.push(source);remaining++;
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+.003);g.gain.exponentialRampToValueAtTime(level*.22,t+duration*.35);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
   if(filter){source.connect(filter).connect(g);nodes.push(filter);}else source.connect(g);
   g.connect(bus);source.start(t);source.stop(t+duration+.006);v.end=Math.max(v.end,t+duration+.006);
   source.onended=()=>{source.disconnect();if(--remaining===0){for(const n of nodes)n.disconnect();bus.disconnect();active.delete(v);}};
  }
  function tone(start,end,duration,level,type='sine',delay=0){const o=context.createOscillator(),t=at+delay;o.type=type;o.frequency.setValueAtTime(start*variation,t);o.frequency.exponentialRampToValueAtTime(end*variation,t+duration);layer(o,duration,level,delay);}
  function grit(hz,end,duration,level,type='bandpass',q=.8,delay=0){const s=context.createBufferSource(),f=context.createBiquadFilter();s.buffer=noise;s.playbackRate.value=variation;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(hz,at+delay);f.frequency.exponentialRampToValueAtTime(end,at+delay+duration);layer(s,duration,level,delay,f);}
  const hit=phase==='impact';
  switch(kind){
   case 'frost':
    if(hit){grit(4200,1800,.16,.13);tone(1400,750,.18,.04);}else{tone(540,920,.12,.07,'sine');grit(2200,1400,.09,.1);}break;
   case 'storm':
    grit(4200,1100,.18,.15,'bandpass',2);tone(630,210,.17,.08,'triangle');tone(1260,420,.1,.025,'sine',.03);break;
   case 'rivet':
    if(hit){grit(3100,1400,.055,.2);tone(2100,1700,.08,.045);}else{grit(2800,1100,.035,.24);tone(240,130,.065,.15,'triangle');}break;
   case 'arc':
    grit(3600,1200,.13,.17,'bandpass',2);tone(740,270,.12,.07,'triangle');tone(1480,540,.09,.03,'sine',.018);break;
   case 'spring':
    if(hit){grit(2300,900,.065,.25);tone(1720,1530,.12,.07);tone(2870,2590,.07,.035);}
    else{grit(2700,1400,.028,.3);tone(270,145,.09,.20,'triangle');tone(984,920,.16,.065);grit(1300,500,.085,.12,'bandpass',1.8,.014);}break;
   case 'rail':
    grit(4200,650,.12,.24);tone(1740,430,.095,.085,'triangle');tone(310,150,.19,.16);grit(1900,850,.19,.09,'bandpass',2.5,.02);break;
   case 'mortar':
    if(hit){grit(1500,260,.24,.5,'lowpass');tone(128,49,.28,.30);grit(3900,1600,.055,.16,'highpass',.7,.022);grit(2800,800,.085,.1,'bandpass',1,.066);}
    else{tone(185,62,.17,.30);grit(800,300,.11,.36,'lowpass');tone(490,230,.07,.04,'triangle');}break;
   case 'bubble':
    if(hit){tone(590,230,.075,.20);grit(2800,1000,.08,.15);tone(890,340,.065,.075,'sine',.024);}
    else{grit(1600,520,.14,.15,'bandpass',1.5);tone(310,760,.11,.15);tone(740,390,.075,.1,'sine',.04);}break;
   case 'drum':
    tone(220,142,.15,.17);tone(367,318,.09,.065);grit(1250,720,.022,.14);tone(980,910,.19,.035,'sine',.01);break;
   case 'fusion':
    tone(165,43,.34,.36);grit(3300,420,.28,.4,'lowpass');tone(830,165,.15,.11,'triangle');tone(1160,940,.23,.045,'sine',.025);grit(3700,1800,.09,.12,'highpass',.7,.04);break;
   case 'upgrade':
    [523,659,784].forEach((f,i)=>{tone(f,f,.28,.10,'sine',i*.085);tone(f*2.003,f*2,.17,.025,'sine',i*.085);});break;
   default:active.delete(v);bus.disconnect();return false;
  }
  return true;
 }
 return{play,get voices(){return active.size;},hush(immediate=false){for(const v of active)v.stop(immediate);active.clear();},destroy(){this.hush(true);master.disconnect();compressor.disconnect();limiter.disconnect();}};
}

export function battleAudio({onState=()=>{}}={}){let context=null,bank=null,enabled=false,disposed=false;
 const report=()=>onState(enabled&&!disposed&&context?.state==='running');
 async function setEnabled(value,gesture=false){enabled=Boolean(value);report();if(!enabled){bank?.hush(true);if(context?.state==='running')void context.suspend().catch(()=>{});return;}
  if(!gesture||disposed)return;
  try{if(!context){context=new(window.AudioContext||window.webkitAudioContext)();context.addEventListener('statechange',report);}bank??=createBattleSoundBank(context);await context.resume();if(!enabled||disposed){bank?.hush();if(context?.state==='running')await context.suspend();}}catch{/* Sound failure never blocks gameplay. */}finally{report();}
 }
 return{get context(){return context;},get enabled(){return enabled;},setEnabled,async toggle(){await setEnabled(!enabled,true);return enabled;},play(kind,phase){if(enabled&&!disposed&&context?.state==='running')bank.play(kind,phase);},hush(){bank?.hush();},destroy(){disposed=true;enabled=false;bank?.destroy();context?.close().catch(()=>{});}};
}

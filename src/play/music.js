// r17 media-service candidates, integrated as a quiet test mix. No new synthesis/model.
const FILES=['workshop','patrol','win','lose','upgrade'];
const ends={workshop:31.5,patrol:31.2};
export function musicBed({stage,mode='',paused=false,hidden=false}){
 if(hidden||paused||mode||['win','lose','labend'].includes(stage))return null;
 return ['wave','labwave','watch'].includes(stage)?'patrol':'workshop';
}
export function createMusic({getContext,base=new URL('./audio/music-r17/',document.baseURI),onState=()=>{}}){
 let enabled=false,state={stage:'place',mode:''},bed=null,current=null,timer=null,epoch=0,disposed=false;
 const buffers=new Map(),voices=new Set();
 function report(){onState({bed,voices:voices.size,enabled});}
 function stopVoice(v,fade=.12){const c=getContext();if(!c)return;const now=c.currentTime;v.gain.gain.cancelScheduledValues(now);v.gain.gain.setValueAtTime(v.gain.gain.value,now);v.gain.gain.linearRampToValueAtTime(0,now+fade);try{v.source.stop(now+fade+.01);}catch{}}
 function hush(){epoch++;current=null;bed=null;for(const v of voices)stopVoice(v,0);report();}
 async function load(id){
  if(!FILES.includes(id))return null;
  if(!buffers.has(id))buffers.set(id,(async()=>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);try{
   const response=await fetch(new URL(id==='upgrade'?'../music-r32/upgrade.wav':id+'.mp3',base),{signal:controller.signal});if(!response.ok)throw Error('Music unavailable');
   const bytes=await response.arrayBuffer(),c=getContext();if(!c)return null;return await c.decodeAudioData(bytes);
  }catch{buffers.delete(id);return null;}finally{clearTimeout(timeout);}})());
  return buffers.get(id);
 }
 function voice(id,buffer,at,loop=false){
  const c=getContext(),source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.connect(gain).connect(c.destination);
  const duration=loop?Math.min(buffer.duration,ends[id]):buffer.duration,level=loop?(id==='patrol'?.55:.7):.7;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+(loop?.8:.015));
  if(loop){gain.gain.setValueAtTime(level,at+duration-.8);gain.gain.linearRampToValueAtTime(0,at+duration);}
  const v={id,source,gain,end:at+duration,loop};voices.add(v);source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();report();};source.start(at,0,duration);report();return v;
 }
 async function beginBed(id,token){const buffer=await load(id),c=getContext();if(!buffer||disposed||!enabled||token!==epoch||bed!==id||c?.state!=='running')return;
  current=voice(id,buffer,c.currentTime+.01,true);current.buffer=buffer;
 }
 function sync(){
  const desired=enabled?musicBed({...state,hidden:document.hidden}):null;
  if(desired===bed){if(desired&&!current)void beginBed(desired,++epoch);return;}
  epoch++;for(const v of voices)if(v.loop)stopVoice(v);bed=desired;current=null;report();if(desired)void beginBed(desired,epoch);
 }
 function tick(){
  const c=getContext();if(!enabled||document.hidden||c?.state!=='running'||!current||current.id!==bed)return;
  if(current.end-c.currentTime<=1.1){const at=Math.max(c.currentTime+.01,current.end-.8),buffer=current.buffer;current=voice(bed,buffer,at,true);current.buffer=buffer;}
 }
 function visibility(){if(document.hidden)hush();else sync();}
 document.addEventListener('visibilitychange',visibility);
 return{
  setEnabled(value){enabled=Boolean(value);if(!enabled){clearInterval(timer);timer=null;hush();return;}if(!getContext()||disposed)return;
   if(!timer)timer=setInterval(tick,200);sync();
   // Small result cues prepare only after a user gesture; music never gates play.
   for(const id of ['win','lose','upgrade'])void load(id);
  },
  update(next){const previous=state;state=next;sync();
   if(next.mode!==previous.mode){for(const v of voices)if(!v.loop)stopVoice(v);
    const id=next.mode==='labend'?'win':next.mode;
    if(['win','lose','upgrade'].includes(id)&&enabled&&!document.hidden){const token=epoch;void load(id).then(buffer=>{
     const c=getContext();if(buffer&&token===epoch&&state.mode===next.mode&&enabled&&!document.hidden&&c?.state==='running')voice(id,buffer,c.currentTime+.01);
    });}
   }
  },
  destroy(){disposed=true;enabled=false;clearInterval(timer);document.removeEventListener('visibilitychange',visibility);hush();},
 };
}

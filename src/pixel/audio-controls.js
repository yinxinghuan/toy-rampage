import {pick} from './copy.js';
const key='pixel-audio-muted-v1';
let muted=true;
try{muted=window.alteruLocalStorage?.getItem(key)!=='false';}catch{/* Storage is optional; first use remains muted. */}
const listeners=new Set();
const viewListeners=new Set();
let running=false;
const refresh=()=>{for(const fn of viewListeners)fn();};
export const audioSettings={
 get muted(){return muted;},
 get audible(){return !muted&&running;},
 setRunning(value){running=Boolean(value);refresh();},
 subscribeView(fn){viewListeners.add(fn);fn();return()=>viewListeners.delete(fn);},
 subscribe(fn){listeners.add(fn);fn(muted,false);return()=>listeners.delete(fn);},
 setMuted(value){muted=Boolean(value);refresh();try{window.alteruLocalStorage?.setItem(key,String(muted));}catch{/* Private browsing may deny storage. */}for(const fn of listeners)fn(muted,true);},
 toggle(){this.setMuted(this.audible);},
 unlock(){if(!muted)for(const fn of listeners)fn(false,true);}
};
const speaker='<path d="M3 9h4l5-4v14l-5-4H3Z"/>',waves='<path d="M16 8v8M20 5v14"/>',cross='<path d="m16 9 5 6m0-6-5 6"/>';
function sync(root){
 const on=audioSettings.audible;
 for(const b of root.querySelectorAll('[data-audio-toggle]')){
  b.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="miter" aria-hidden="true">${speaker}${on?waves:cross}</svg>`;
  const label=pick(on?['关闭音乐和音效','Mute music and sound effects']:['开启音乐和音效','Enable music and sound effects']);
  b.dataset.audioState=muted?'muted':on?'running':'locked';
  b.setAttribute('aria-label',label);b.setAttribute('title',label);b.setAttribute('aria-pressed',String(on));
 }
 for(const b of root.querySelectorAll('.tw__settings [data-action=sound]'))b.textContent=pick(on?['声音：开','Sound: on']:['开启声音','Enable sound']);
 // Auditions and future HTML music/stingers must obey the same master switch.
 for(const media of root.querySelectorAll('audio,video'))media.muted=muted;
}
export function mountAudioButton(root){
 const view=root.querySelector('.px-game');
 if(view&&!view.querySelector('[data-audio-toggle]'))view.insertAdjacentHTML('beforeend','<button type="button" class="px-audio-toggle" data-audio-toggle></button>');
 sync(root);
}
export function bindAudioControls(root){
 audioSettings.subscribeView(()=>sync(root));
 const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('audio,video')||n.querySelector?.('audio,video')))))sync(root);});
 observer.observe(root,{childList:true,subtree:true});
 const isSound=e=>e.target.closest('[data-audio-toggle],[data-action=sound],[data-battle=sound]');
 root.addEventListener('pointerdown',e=>{if(e.button===0&&!isSound(e))audioSettings.unlock();});
 // Touch activation may only become valid at pointerup/click, not pointerdown.
 root.addEventListener('pointerup',e=>{if(!isSound(e))audioSettings.unlock();});
 root.addEventListener('click',e=>{if(e.target.closest('[data-audio-toggle]'))audioSettings.toggle();else if(!isSound(e))audioSettings.unlock();});
 root.addEventListener('keydown',e=>{if(!isSound(e))audioSettings.unlock();});
 root.addEventListener('play',e=>{if(e.target.matches('audio,video'))e.target.muted=muted;},true);
 root.addEventListener('volumechange',e=>{if(muted&&e.target.matches('audio,video')&&!e.target.muted)e.target.muted=true;},true);
}

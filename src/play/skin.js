import '../pixel/style.css';
import '../pixel/workshop.css';
import '../pixel/raster.css';
import '../pixel/battle.css';
import '../pixel/dialogs.css';
import './skin.css';
import {BattleArt,loadBattleArt,BATTLE_ART_TASK_COUNT} from '../pixel/battle-art.js';
import {EXPERIMENT_SPECS,drawExperiment} from '../pixel/experimental-art.js';
import {createPreloader} from './preload.js';
import {createMusic} from './music.js';
import {battleAudio} from '../pixel/battle-audio.js';
import {audioSettings,bindAudioControls,mountAudioButton} from '../pixel/audio-controls.js';
import {richDialog,bindDialogImages,setDialogAssetRoot} from '../pixel/dialogs.js';
import {setLocale} from '../pixel/copy.js';
import {locale,t} from '../copy.js';
import {CELL,GX,GY,W,H,COLS,ROWS,FOOTPRINT,occupied} from '../engine.js';
import jersey from '../pixel/fonts/Jersey10-Regular.ttf?url';
import cjk from '../pixel/fonts/fusion-pixel-12px-proportional-zh_hans.woff2?url';
import hand from './hand.svg?url';
// Literal URL imports are required: Vite cannot resolve a concatenated path at build time.
const images={
 titleZh:new URL('../pixel/images/sprites/title-zh.png',import.meta.url).href,
 titleEn:new URL('../pixel/images/sprites/title-en.png',import.meta.url).href,
 startZh:new URL('../pixel/images/r23/start-zh.png',import.meta.url).href,
 startEn:new URL('../pixel/images/r23/start-en.png',import.meta.url).href,
 refresh:new URL('../pixel/images/r3/refresh-label-zh-v2.png',import.meta.url).href,
 tile:new URL('../pixel/images/r3/tile.png',import.meta.url).href,
};
const sceneImages={
 environment:new URL('../pixel/images/workshop-environment.png',import.meta.url).href,
 assembly:new URL('../pixel/images/r30/assembly.webp',import.meta.url).href,
 foundry:new URL('../pixel/images/r30/foundry.webp',import.meta.url).href,
 power:new URL('../pixel/images/r30/power.webp',import.meta.url).href,
 hud:new URL('../pixel/images/r3/hud.png',import.meta.url).href,
 pause:new URL('../pixel/images/r23/pause.png',import.meta.url).href,
 tray:new URL('../pixel/images/r3/tray.png',import.meta.url).href,
 landTray:new URL('../pixel/images/r24/land-tray.png',import.meta.url).href,
 gold:new URL('../pixel/images/r23/gold-blank.png',import.meta.url).href,
 lilac:new URL('../pixel/images/r23/lilac-blank.png',import.meta.url).href,
 entry:new URL('../pixel/images/r3/entry.png',import.meta.url).href,
 exit:new URL('../pixel/images/r3/exit.png',import.meta.url).href,
 top:new URL('../pixel/images/r3/route-top-clean.png',import.meta.url).href,
 right:new URL('../pixel/images/r3/route-vertical-clean.png',import.meta.url).href,
 bottom:new URL('../pixel/images/r3/route-bottom-clean.png',import.meta.url).href,
 cornerTop:new URL('../pixel/images/r3/route-corner-top.png',import.meta.url).href,
 cornerBottom:new URL('../pixel/images/r3/route-corner-bottom.png',import.meta.url).href,
 locked:new URL('../pixel/images/r3/tile-locked.png',import.meta.url).href,
 beam:new URL('../pixel/images/r3/floor-beam.png',import.meta.url).href,
};
let art,renderer,host,game,audio,music,last=0,signature='',resetNeeded=false;
const cache=new Map(),effectSeen=new WeakSet();
const picture=(src,alt='')=>`<img src="${src}" alt="${alt}" draggable="false">`;
export async function prepare(){
 document.documentElement.classList.add('tw-pixel-page');
 setDialogAssetRoot(new URL('./ui/dialog-v1/',document.baseURI));
 const root=document.querySelector('#app');
 const ui={title:locale==='zh'?images.titleZh:images.titleEn,start:locale==='zh'?images.startZh:images.startEn,tile:images.tile,...(locale==='zh'?{refresh:images.refresh}:{}),...sceneImages};
 const total=BATTLE_ART_TASK_COUNT+Object.keys(ui).length+2;
 while(!art){
  root.innerHTML=`<section class="tw-pixel-loading" role="status"><div class="tw-pixel-loading__brand">${t('loadingTitle')}</div><div class="tw-pixel-loading__panel"><p>${t('loadingWorkshop')}</p><div class="tw-pixel-loading__meter" role="progressbar" aria-label="${t('loadingAssets')}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0"><i></i></div><output>0 / ${total}</output><small>${t('loadingAssets')}</small><p class="tw-pixel-loading__hint">${t('loadingHint')}</p></div></section>`;
  const panel=root.querySelector('.tw-pixel-loading'),meter=panel.querySelector('[role=progressbar]');
  const loader=createPreloader({total,onProgress:({completed})=>{meter.setAttribute('aria-valuenow',completed);meter.firstElementChild.style.width=completed/total*100+'%';panel.querySelector('output').textContent=`${completed} / ${total}`;}});
  const slow=setTimeout(()=>{panel.querySelector('.tw-pixel-loading__hint').textContent=t('loadingSlow');},10000);
  try{
   const uiReady=Promise.all(Object.entries(ui).map(async([key,url])=>{const image=await loader.image(url);if(key==='title')panel.querySelector('.tw-pixel-loading__brand').innerHTML=picture(url,t('loadingTitle'));return[key,image];}));
   const fonts=Promise.all([['Jersey 10',jersey],['Workshop Pixel',cjk]].map(([name,url])=>loader.run(async signal=>{const r=await fetch(url,{signal});if(!r.ok)throw Error('Font unavailable');const f=new FontFace(name,await r.arrayBuffer());await f.load();document.fonts.add(f);})));
   const [loaded,next]=await Promise.all([uiReady,loadBattleArt(new URL('./animation/',document.baseURI),{image:loader.image,readJSON:loader.readJSON,requireIdle:true}),fonts]);
   next.tile=Object.fromEntries(loaded).tile;art=next;
  }catch{
   loader.cancel();clearTimeout(slow);panel.setAttribute('role','alert');panel.querySelector('.tw-pixel-loading__panel').innerHTML=`<p>${t('loadingErrorAssets')}</p><button type="button">${t('retryLoading')}</button>`;
   await new Promise(resolve=>panel.querySelector('button').addEventListener('click',resolve,{once:true}));
  }finally{clearTimeout(slow);loader.cancel();}
 }
}
export function mount(root,model){
 const guideHand=root.querySelector('.tw__guide-hand');guideHand.querySelector('svg').remove();guideHand.insertAdjacentHTML('beforeend',picture(hand));root.querySelector('.tw__guide').classList.add('tw-guide-pixel');
 host=root;game=model;const view=root.querySelector('.tw');view.classList.add('tw-pixel','px-game','px-game--battle-lab');
 const world=root.querySelector('.tw__board');world.classList.add('px-world');
 world.insertAdjacentHTML('beforeend',`<div class="px-route px-route--top"></div><div class="px-route px-route--right"></div><div class="px-route px-route--bottom"></div><div class="px-route-corner px-route-corner--top"></div><div class="px-route-corner px-route-corner--bottom"></div><div class="px-entry"></div><div class="px-goal"></div><div class="px-board" style="left:${GX/W*100}%;top:${GY/H*100}%;width:${COLS*CELL/W*100}%;height:${ROWS*CELL/H*100}%;grid-template-columns:repeat(${COLS},1fr);grid-template-rows:repeat(${ROWS},1fr)">${Array.from({length:COLS*ROWS},(_,i)=>`<div class="px-cell" data-art-cell="${i}"></div>`).join('')}</div>`);
 view.insertAdjacentHTML('afterbegin','<div class="px-game__environment" aria-hidden="true"></div>');
 view.querySelector('.tw__header').insertAdjacentHTML('beforeend','<div class="tw-level-badge" role="img"><small></small><b></b></div>');
 view.querySelector('.tw__tools').append(root.querySelector('[data-action=speed]'));
 root.querySelector('[data-action=hint]').textContent='i';
 view.insertAdjacentHTML('beforeend','<div class="tw-pixel-beam" aria-hidden="true"></div>');
 root.querySelector('.tw__overlay').classList.add('tw-pixel-overlay');
 audio=battleAudio({onState:running=>audioSettings.setRunning(running)});music=createMusic({getContext:()=>audio.context,onState:({bed,voices})=>{view.dataset.music=bed||'off';view.dataset.musicVoices=voices;}});
 audioSettings.subscribe((muted,gesture)=>{if(muted)music.setEnabled(false);void audio.setEnabled(!muted,gesture).then(()=>{if(!audioSettings.muted&&gesture)music.setEnabled(true);});});
 bindAudioControls(root);mountAudioButton(root);bindDialogImages(root);rebuild();
 root.querySelector('.tw__watermark').hidden=true;
 root.querySelector('.tw__look').hidden=true;
 root.querySelector('#version').textContent='r50';
 document.documentElement.dataset.digits='jersey10';
}
function rebuild(){renderer?.destroy();renderer=new BattleArt(host,game,art,()=>matchMedia('(prefers-reduced-motion: reduce)').matches,(kind,phase)=>audio.play(kind,phase));renderer.enemyScale=.75;renderer.point=(x,y)=>({x:x/W*renderer.width,y:y/H*renderer.height});renderer.draw(0);signature='';last=performance.now();resetNeeded=false;}
export function onReset(){resetNeeded=true;hush();}
export const settled=()=>{
 // Observe this simulation tick before deciding whether to reveal a result.
 // Otherwise UI sees the previous settled snapshot, opens for one frame, then
 // closes/reopens after draw captures the new upgrade, replaying its music.
 if(!renderer)return true;
 renderer.presentation.capture(game,renderer.time);
 return renderer.settled();
};
export const enableAudio=()=>audioSettings.unlock();
export const toggleSound=()=>{audioSettings.toggle();return !audioSettings.muted;};
export const soundEnabled=()=>audioSettings.audible;
export const hush=()=>audio?.hush();
export function sound(event){if(['merge','fusion','upgrade'].includes(event))audio?.play('upgrade');else if(['place','reward','practice'].includes(event))audio?.play('drum');else if(['invalid','leak'].includes(event))audio?.play('spring','impact');}
function composite(kind,rank){
 const key=kind+rank;if(cache.has(key))return cache.get(key);
 const canvas=document.createElement('canvas');let spec;
 if(EXPERIMENT_SPECS[kind]){spec=EXPERIMENT_SPECS[kind];[canvas.width,canvas.height]=spec.size;drawExperiment(canvas.getContext('2d'),kind,rank,art);}
 else if(kind.startsWith('plot')){const [w,h]=FOOTPRINT[kind];spec={size:[w*64,h*64],logical:[w*64,h*64]};[canvas.width,canvas.height]=spec.size;const c=canvas.getContext('2d');for(const[i,j]of occupied({kind,c:0,r:0})){c.drawImage(art.tile,i*64,j*64,64,64);c.strokeStyle='#d9c08d';c.lineWidth=2;c.strokeRect(i*64+2,j*64+2,60,60);c.fillStyle='#f0deb7';c.fillRect(i*64+24,j*64+30,16,4);c.fillRect(i*64+30,j*64+24,4,16);}}
 else{spec=art.aim[kind]?.spec||{size:kind==='spring'?[128,320]:[128,160],logical:kind==='spring'?[128,256]:[128,128]};[canvas.width,canvas.height]=spec.size;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  if(art.aim[kind]){c.drawImage(art.aim[kind].base,0,0);c.drawImage(art.aim[kind].heads[6],0,0);}else if(kind==='spring')c.drawImage(art.spring[0],0,0);else c.drawImage(art.drum,0,0,128,160,0,0,128,160);
  if(rank>1&&art.upgrade[kind]){const im=art.upgrade[kind],sw=im.width/3;c.drawImage(im,(rank-2)*sw,0,sw,im.height,0,canvas.height-spec.logical[1],...spec.logical);}
 }
 const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let x0=canvas.width,y0=canvas.height,x1=0,y1=0;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>12){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const result={canvas,spec,crop:[x0,y0,x1-x0+1,y1-y0+1]};cache.set(key,result);return result;
}
export function drawTray(canvas,kind,rank){const c=composite(kind,rank),[x,y,w,h]=c.crop,[fw,fh]=FOOTPRINT[kind];canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(c.canvas,x,y,w,h,0,0,w,h);canvas.dataset.kind=kind;canvas.dataset.rank=rank;canvas.style.setProperty('--preview-w',w/c.spec.logical[0]*fw);canvas.style.setProperty('--preview-h',h/c.spec.logical[1]*fh);}
export function drawDrag(canvas,kind,rank,scale){
 const {canvas:source,spec}=composite(kind,rank),[fw,fh]=FOOTPRINT[kind],w=fw*CELL*scale,h=fh*CELL*scale,pad=3,s=Math.min((w-pad*2)/spec.logical[0],(h-pad*2)/spec.logical[1]),bleed=Math.max(0,spec.size[1]*s-h+pad),d=Math.min(2,devicePixelRatio||1);
 canvas.width=Math.ceil(w*d);canvas.height=Math.ceil((h+bleed)*d);canvas.style.width=w+'px';canvas.style.height=h+bleed+'px';canvas.style.marginTop=-bleed+'px';canvas.dataset.footWidth=w;canvas.dataset.footHeight=h;
 const c=canvas.getContext('2d');c.scale(d,d);c.imageSmoothingEnabled=false;c.fillStyle='#e9ce9233';c.strokeStyle='#f7d88a';for(const[x,y]of occupied({kind,c:0,r:0})){const unit=CELL*scale;c.fillRect(x*unit+1,bleed+y*unit+1,unit-2,unit-2);c.strokeRect(x*unit+1,bleed+y*unit+1,unit-2,unit-2);}c.drawImage(source,(w-spec.size[0]*s)/2,bleed+h-pad-spec.size[1]*s,spec.size[0]*s,spec.size[1]*s);
 if(!kind.startsWith('plot')){c.fillStyle='#3d325a';c.fillRect(3,bleed+h-23,22,21);c.fillStyle='#eee0c0';c.font="24px 'Jersey 10'";c.textAlign='center';c.fillText(String(rank),14,bleed+h-5);}
}
export function decorate(mode=''){
 music?.update({stage:game.stage,mode,paused:game.paused});
 setLocale(locale);document.title=locale==='zh'?'玩具大暴走':'Toy Rampage';
 const level=game.levelIndex+1,badge=host.querySelector('.tw-level-badge');
 badge.hidden=game.lab;badge.setAttribute('aria-label',t('levelNumber',{n:level}));badge.querySelector('small').textContent=t('levelShort');badge.querySelector('b').textContent=level;
 const scene=['environment','assembly','foundry','power','foundry','power'][game.levelIndex]||'environment',environment=host.querySelector('.px-game__environment');
 if(environment.dataset.scene!==scene){environment.dataset.scene=scene;environment.style.backgroundImage=`url("${sceneImages[scene]}")`;}
 const phase=host.querySelector('#phase'),inWaves=!game.lab&&['wave','ready','win','lose'].includes(game.stage);
 phase.classList.toggle('tw-wave-progress',inWaves);
 if(inWaves){const n=game.stage==='ready'?game.wave+1:game.wave;phase.setAttribute('aria-label',t('wave',{n,total:game.waves.length}));phase.innerHTML=`<small aria-hidden="true">${t('waveUnit')}</small><b aria-hidden="true">${n}<em>/</em>${game.waves.length}</b>`;}else phase.removeAttribute('aria-label');
 const replay=host.querySelector('[data-action=hint]');replay.title=t('hint');
 host.querySelector('.tw').dataset.fusion=host.querySelector('[data-action=fusion-recipe]').hidden?'unavailable':'available';
 const title=host.querySelector('#title'),src=locale==='zh'?images.titleZh:images.titleEn;if(!title.querySelector('img')||title.dataset.art!==src){title.dataset.art=src;title.innerHTML=picture(src,document.title);}
 const main=host.querySelector('#main-action'),start=locale==='zh'?images.startZh:images.startEn;if(game.stage==='ready'&&main.querySelector('img')?.src!==start)main.innerHTML=picture(start,t('start'));
 const refresh=host.querySelector('[data-action=refresh]');if(locale==='zh')refresh.querySelector('span').innerHTML=picture(images.refresh,t('refreshName'));
 host.querySelectorAll('#supply [data-source]').forEach(b=>{
  const u=game.get(b.dataset.source);let badge=b.querySelector('.tw-pixel-rank');if(!badge){badge=document.createElement('b');badge.className='tw-pixel-rank';b.append(badge);}badge.textContent=b.dataset.source==='land'?(locale==='zh'?`余${game.landRemaining}格`:`${game.landRemaining} left`):u.rank;
  const [fw,fh]=FOOTPRINT[u.kind];b.style.setProperty('--foot-w',fw);b.style.setProperty('--foot-h',fh);if(!b.querySelector('.tw-bench-footprint'))b.insertAdjacentHTML('afterbegin',`<i class="tw-bench-footprint" aria-hidden="true">${'<i></i>'.repeat(fw*fh)}</i>`);
 });
 host.querySelectorAll('.tw__settings [data-action=sound]').forEach(b=>{b.textContent=locale==='zh'?(audioSettings.audible?'声音：开':'开启声音'):(audioSettings.audible?'Sound: on':'Enable sound');});
 const view=host.querySelector('.tw'),overlay=host.querySelector('.tw__overlay');view.dataset.modal=String(!overlay.hidden);
 for(const child of view.children)child.inert=!overlay.hidden&&child!==overlay&&!child.matches('[data-audio-toggle]');
}
export function modal(mode,title,content){
 setLocale(locale);const kind=['win','lose','upgrade','pause'].includes(mode)?mode:mode==='labend'?'win':'menu';
 const roomy=mode.startsWith('reset')||['switch-level','sell','refresh-replace','fusion-recipe'].includes(mode);
 const markup=richDialog({kind,title,content}).replace('class="px-dialog ',`class="tw__modal ${roomy?'tw-modal-roomy ':''}px-dialog `).replace('role="region"','role="dialog" aria-modal="true"').replace('class="px-dialog-title"','id="modal-title" class="px-dialog-title"');
 return markup;
}
let swapOrigins=null,swapAnimations=[],mergeVisual=null,mergeGhosts=[];
function motion(el,frames,options){const a=el.animate(frames,options);a.id='tw-arrange-motion';swapAnimations.push(a);return a;}
export function cancelSwap(){for(const a of swapAnimations)a.cancel();for(const el of mergeGhosts)el.remove();swapAnimations=[];mergeGhosts=[];swapOrigins=null;mergeVisual=null;}
function captureMerge(canvases){
 cancelSwap();
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(const original of canvases.filter(Boolean)){const box=original.getBoundingClientRect(),ghost=document.createElement('canvas');ghost.className='tw-merge-ghost';ghost.width=original.width;ghost.height=original.height;ghost.getContext('2d').drawImage(original,0,0);ghost.setAttribute('aria-hidden','true');ghost.style.cssText=`position:fixed;pointer-events:none;z-index:35;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;image-rendering:pixelated`;document.body.append(ghost);mergeGhosts.push(ghost);}
}
function finishMerge(target){
 if(!target){cancelSwap();return;}const box=target.getBoundingClientRect(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const ghost of mergeGhosts){const r=ghost.getBoundingClientRect(),dx=box.left+box.width/2-r.left-r.width/2,dy=box.top+box.height/2-r.top-r.height/2;
  const anim=motion(ghost,[{transform:'translate(0,0) scale(1)',opacity:1,offset:0},{transform:`translate(${dx*.75}px,${dy*.75}px) scale(.85)`,opacity:1,offset:.75},{transform:`translate(${dx}px,${dy}px) scale(.25)`,opacity:0,offset:1}],{duration:240,easing:'ease-in',fill:'forwards'});anim.onfinish=()=>ghost.remove();}
 motion(target,reduced?[{outline:'3px solid #edc575'},{outline:'3px solid transparent'}]:[{transform:'scale(.82)',opacity:0,offset:0},{transform:'scale(.82)',opacity:0,offset:.6},{transform:'scale(1.09)',opacity:1,offset:.8},{transform:'scale(1)',opacity:1,offset:1}],{duration:reduced?160:400,easing:'ease-out'});
}
export function merge(source,p){
 const actor=id=>renderer.actors.find(a=>a.u.id===id)?.canvas;
 captureMerge([typeof source==='number'?actor(source):host.querySelector(`[data-source="${source}"] canvas`),actor(p.target.id)]);
 mergeVisual={c:p.c,r:p.r};
}
export function reserveMerge(source,target){
 captureMerge([host.querySelector(`[data-source="${source}"] canvas`),host.querySelector(`[data-source="${target}"] canvas`)]);
 mergeVisual={target};
}
export function swap(source,p){
 const ids=[source,p.target.id];
 const origins=new Map(renderer.actors.filter(a=>ids.includes(a.u.id)).map(a=>[a.u.id,a.machine.getBoundingClientRect()]));
 cancelSwap();swapOrigins=origins;
}
export function draw(canvas,g,selection,hover,reduced,guideTarget,suspended=false){
 if(resetNeeded)rebuild();const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
 const key=g.units.map(u=>`${u.id}:${u.kind}:${u.rank}:${u.c}:${u.r}`).join('|');if(key!==signature){const fx=renderer.fx;renderer.build();renderer.fx=fx;signature=key;}
 if(mergeVisual){const m=mergeVisual;mergeVisual=null;finishMerge(m.target?host.querySelector(`[data-source="${m.target}"] canvas`):renderer.actors.find(a=>a.u.c===m.c&&a.u.r===m.r)?.machine);}
 if(swapOrigins){
  for(const a of renderer.actors){const old=swapOrigins.get(a.u.id);if(!old)continue;const box=a.machine.getBoundingClientRect(),dx=old.left-box.left,dy=old.top-box.top,len=Math.hypot(dx,dy)||1,bend=12;
   const frames=reduced?[{outline:'3px solid #edc575',outlineOffset:'-3px'},{outline:'3px solid transparent',outlineOffset:'-3px'}]:[
    {transform:`translate(${dx}px,${dy}px)`,offset:0},
    {transform:`translate(${dx*.45-dy/len*bend}px,${dy*.45+dx/len*bend}px)`,offset:.5},
    {transform:'translate(0,0)',offset:1}];
   motion(a.machine,frames,{duration:reduced?160:320,easing:'ease-out'});
  }swapOrigins=null;
 }
 renderer.capture();renderer.draw(suspended||((g.choices.length||g.ended)&&renderer.settled())?0:dt);
 const cells=host.querySelectorAll('[data-art-cell]');for(let i=0;i<cells.length;i++)cells[i].classList.toggle('px-cell--locked',!g.board[i]);
 for(const b of host.querySelectorAll('[data-cell]')){b.classList.remove('tw-drop-ok','tw-drop-bad','tw-drop-fusion','tw-guide-target','tw-unit-selected');b.removeAttribute('data-preview');}
 const mark=(c,r,cls,label)=>{const el=host.querySelector(`[data-cell="${c},${r}"]`);if(el){el.classList.add(cls);if(label)el.dataset.preview=label;}};
 const selected=g.get(selection);if(selected&&typeof selection==='number')for(const[c,r]of occupied(selected))mark(c,r,'tw-unit-selected');
 if(hover&&!hover.reserve&&selection!==null){const p=g.preview(selection,hover.c,hover.r),u=g.get(selection);if(u){const tiles=p.tiles||occupied({...u,kind:p.kind||u.kind,c:p.c??hover.c,r:p.r??hover.r});for(const[c,r]of tiles){const fusion=p.ok&&p.type==='fusion',label=!p.ok?'×':fusion?(c===p.c+1&&r===p.r?t('fusionAction'):''):p.type==='swap'?'↔':p.type==='merge'?'↑'+(u.rank+1):'+';mark(c,r,fusion?'tw-drop-fusion':p.ok?'tw-drop-ok':'tw-drop-bad',label);}}}
 else if(guideTarget&&FOOTPRINT[guideTarget.kind])for(const[c,r]of occupied(guideTarget))mark(c,r,'tw-guide-target');
 for(const e of g.effects){if(effectSeen.has(e))continue;effectSeen.add(e);if(['merge','fusion','upgrade'].includes(e.type))renderer.add({type:'upgrade',kind:'drum',point:renderer.point(e.x,e.y),rank:1});}
 for(const e of g.effects)if(e.type==='expand')for(const[c,r]of e.tiles)mark(c,r,'tw-drop-ok','+');
 // Combat health follows projectile impact timing. Currency follows confirmed
 // transactions immediately, including salvage while the renderer is paused.
 const shown=renderer.view();host.querySelector('#hp').textContent=shown.hp;host.querySelector('#coins').textContent=g.coins;
 host.querySelector('.tw').dataset.renderer='pixel';
}

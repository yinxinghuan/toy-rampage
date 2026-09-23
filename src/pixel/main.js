import {tierAttachment} from './tier-art.js';
import {bindBenchPreviews} from './bench.js';
import {bindAudioControls,mountAudioButton} from './audio-controls.js';
import './style.css';
import {battleExperiment,mountBattle} from './battle.js';
import './workshop.css';
import './raster.css';
import {aimExperiment,mountAim} from "./aim.js";
import {animationExperiment,mountAnimation} from "./animation.js";
import {compatibility,mountCompatibility} from './compat.js';
import {material,materialList} from './materials.js';
import {assets,assetFor} from './assets.js';
import {t,pick,locale,toggleLocale} from './copy.js';
import pixelFont from './fonts/fusion-pixel-12px-proportional-zh_hans.woff2?url';
import jersey10 from './fonts/Jersey10-Regular.ttf?url';
import jersey15 from './fonts/Jersey15-Regular.ttf?url';
import {richDialog,bindDialogImages,dialogAsset,dialogMaterials,illustrationControls} from './dialogs.js';
import './dialogs.css';
document.fonts.add(new FontFace('Workshop Pixel',`url("${pixelFont}")`,{weight:'400',style:'normal',display:'swap'}));
document.fonts.add(new FontFace('Jersey 10',`url("${jersey10}")`,{weight:'400',style:'normal',display:'swap'}));
document.fonts.add(new FontFace('Jersey 15',`url("${jersey15}")`,{weight:'400',style:'normal',display:'swap'}));
const app=document.querySelector('#pixel-app');
bindBenchPreviews(app);
bindAudioControls(app);
bindDialogImages(app);
const states=['ready','battle','upgrade','pause','win','lose','loading','error'];
let numberStyle=new URLSearchParams(location.search).get('digits')==='jersey15'?'jersey15':'jersey10';
let state=states.includes(new URLSearchParams(location.search).get('state'))?new URLSearchParams(location.search).get('state'):'ready',section=['scene','experiments','animation','aim','combat','components','assets'].includes(new URLSearchParams(location.search).get('section'))?new URLSearchParams(location.search).get('section'):'scene',selection=null,batch=false,compare=false,environment=true,placeholders=true;
const concept=new URL('../review/images/pixel.png',import.meta.url).href;
const environmentImage=new URL('./images/workshop-environment.png',import.meta.url).href;
const titleZh=new URL('./images/sprites/title-zh.png',import.meta.url).href;
const titleEn=new URL('./images/sprites/title-en.png',import.meta.url).href;
const refreshLabelZh=new URL('./images/r3/refresh-label-zh-v2.png',import.meta.url).href;
let cleanupCompatibility=()=>{};
let cleanupAnimation=()=>{};
let cleanupAim=()=>{};
let cleanupBattle=()=>{};
const uiMaterials=[
 [['中文换批字 · 修正裁切','Chinese reroll · corrected crop'],refreshLabelZh,'PNG · refresh-label-zh-v2'],
 ['environmentMaterial',environmentImage,'PNG · 1024×1536'],
 ...materialList.map(([id,name])=>[name,id==='title-zh'?titleZh:id==='title-en'?titleEn:material(id),'PNG · '+id]),
];
const paths={heart:'M12 21 2 11V5h6l4 4 4-4h6v6Z',gear:'M9 2h6v3h3v3h3v8h-3v3h-3v3H9v-3H6v-3H3V8h3V5h3ZM9 9v6h6V9Z',pause:'M6 4h4v16H6ZM14 4h4v16h-4Z',play:'M7 3v18l13-9Z',refresh:'M3 10V4h6M3 4l4-1h10l4 4v4M21 14v6h-6m6 0-4 1H7l-4-4v-4',close:'m5 5 14 14M19 5 5 19',plus:'M12 4v16M4 12h16',arrow:'M4 12h16m-6-6 6 6-6 6',check:'m4 12 5 5L20 6',box:'M3 6h18v15H3ZM2 2h20v5H2ZM10 2v8h4V2',back:'m14 5-7 7 7 7',star:'m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z'};
const icon=(id,fill=false)=>`<svg viewBox="0 0 24 24" fill="${fill?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" aria-hidden="true"><path d="${paths[id]||paths.box}"/></svg>`;
const sprite=(id,cls='')=>{const a=assetFor(id);return a?.src?`<img class="px-sprite ${cls}" src="${a.src}" alt="${pick(a.name)}" draggable="false">`:`<span class="px-pending ${cls}" aria-label="${t('shapePending')}">${icon('box')}</span>`;};
const btn=(action,label,cls='',disabled=false)=>`<button class="px-button ${cls}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const units=[['spring',0,0,2],['mortar',1,0,3],['bubble',3,0,2],['drum',0,2,1],['rail',0,3,2]];
const art=(id,alt='',cls='')=>`<img class="px-art ${cls}" src="${id==='refresh-label-zh-v2'?refreshLabelZh:material(id)}" alt="${alt}" draggable="false">`;
const startButton=(action='state:battle')=>`<button class="px-button px-button--art" data-action="${action}" aria-label="${t('start')}">${art('start-'+locale,t('start'))}</button>`;
const refreshButton=(action='batch',disabled=false,cost=5)=>btn(action,`<span><span class="px-refresh-text ${locale==='zh'?'px-refresh-text--image':''}">${locale==='zh'?art('refresh-label-zh-v2',t('refresh'),'px-refresh-label'):t('refresh')}</span><small>${icon('gear')} ${cost}</small></span>`,'px-button--refresh',disabled);
function scene(){
 const hp=state==='lose'?0:state==='battle'?80:100,coins=state==='ready'?5:state==='win'?12:0;
 const start=state==='battle'
  ?btn('state:pause',icon('pause')+t('pause'),'px-button--gold')
  :startButton();
 return `<div class="px-stage ${compare?'px-stage--compare':''}"><div class="px-live-column">
 <p class="px-frame-label">${t('liveFrame')}</p>
 <section class="px-game ${environment?'':'px-game--bare'} ${placeholders?'':'px-game--no-placeholders'}" aria-label="${t('title')}">
  <div class="px-game__environment" aria-hidden="true"></div>
  <header class="px-game__header"><h1 class="px-title-plate"><img class="px-art" src="${locale==='zh'?titleZh:titleEn}" alt="${t('title')}" draggable="false"></h1>
   <button class="px-button px-icon px-button--art" data-action="state:pause" aria-label="${t('pause')}">${art('pause',t('pause'))}</button>
  </header>
  <div class="px-hud">
   <span aria-label="${t('health')}">${art('heart')}<b>${hp}</b></span>
   <span aria-label="${t('wave')}"><b>${state==='ready'?'4':state==='win'?'8':'6'}/8</b></span>
   <span aria-label="${t('coins')}">${art('gear')}<b>${coins}</b></span>
  </div>
  <div class="px-world">
   <div class="px-route px-route--top"></div><div class="px-route px-route--right"></div><div class="px-route px-route--bottom"></div>
   <div class="px-route-corner px-route-corner--top"></div><div class="px-route-corner px-route-corner--bottom"></div>
   <div class="px-entry" aria-label="${t('entrance')}">${art('entry')}</div>
   <div class="px-goal" aria-label="${t('exitGoal')}">${art('exit')}</div>
   <div class="px-board">
    ${Array.from({length:20},(_,i)=>`<button class="px-cell ${i>=18?'px-cell--locked':''} ${selection!==null&&i===selection?'px-cell--selected':''}" data-action="cell:${i}" aria-label="${t('footprint')} ${Math.floor(i/4)+1},${i%4+1}"></button>`).join('')}
    ${units.map(([id,c,r,rank])=>{const a=assetFor(id);return `<div class="px-machine" style="--x:${c};--y:${r};--w:${a.footprint[0]};--h:${a.footprint[1]};--identity:${a.color}" data-kind="${id}">${sprite(id)}${tierAttachment(id,rank)}<span class="px-rank">${rank}</span></div>`}).join('')}
   </div>
   <div class="px-enemy px-enemy--1">${sprite('robot')}</div>
   <div class="px-enemy px-enemy--2">${sprite('robot')}</div>
   ${state==='battle'?`<div class="px-enemy px-enemy--3 px-enemy--slowed">${sprite('robot')}</div>`:''}
  </div>
  <div class="px-floor-beam" aria-hidden="true"></div>
  <div class="px-bench">
   ${['spring','mortar','bubble'].map((id,i)=>`<button class="px-bench__slot ${selection===i+20?'is-selected':''}" data-action="select:${i+20}" ${state==='battle'&&i===1?'disabled':''} aria-label="${state==='battle'&&i===1?t('empty'):pick(assetFor(id).name)}">${state==='battle'&&i===1?'':sprite(id)+'<span class="px-rank">1</span>'}</button>`).join('')}
   <button class="px-land px-button--art" data-action="select:23" aria-label="${t('land')}">${art('land')}</button>
  </div>
  <div class="px-actions">${start}${refreshButton('batch',coins<5||state==='battle')}</div>
  <div class="px-xp"><i style="width:${state==='ready'?64:40}%"></i></div>
  ${overlay()}
 </section></div>
 ${compare?`<figure class="px-reference"><figcaption>${t('conceptFrame')}</figcaption><img src="${concept}" alt="${t('conceptAlt')}" width="1024" height="1536" draggable="false"><p>${t('referenceNote')}</p></figure>`:''}</div>`;
}
function overlay(){
 if(batch)return modal('confirm',icon('refresh'),t('batchTitle'),t('batchHelp'),btn('replace',t('batchConfirm'),'px-button--gold')+btn('cancel',t('cancel')));
 if(state==='upgrade')return `<div class="px-overlay">${richDialog({kind:'upgrade',body:t('chooseHint'),content:`<div class="px-upgrade-list">${[['bubble','bubbleUp','bubbleDesc'],['rail','railUp','railDesc'],[null,'repair','repairDesc']].map(([id,title,desc],i)=>`<button class="px-upgrade" data-action="upgrade:${i}"><span>${id?sprite(id):icon('heart')}</span><span><b>${t(title)}</b><small>${t(desc)}</small></span>${icon('plus')}</button>`).join('')}</div>`})}</div>`;
 if(state==='pause')return modal('pause',icon('pause'),null,t('pauseBody'),btn('state:battle',t('resume'),'px-button--gold')+btn('state:ready',t('restart'))+`<a href="../" class="px-link">${t('original')}</a>`);
 if(['win','lose'].includes(state))return modal(state,'',null,t(state==='win'?'passed':'lost'),btn('state:ready',t('restart'),'px-button--gold')+btn('state:ready',t('back')));
 if(state==='loading')return modal('loading',icon('gear'),t('loadTitle'),t('loadHelp'),'<div class="px-loading-bars"><i></i><i></i><i></i><i></i><i></i></div>'+btn('state:ready',t('back')));
 if(state==='error')return modal('error',icon('box'),t('errorTitle'),t('errorHelp'),btn('state:ready',t('retry'),'px-button--gold')+btn('state:ready',t('back')));
 return '';
}
function modal(kind,symbol,title,body,actions){return `<div class="px-overlay">${richDialog({kind,symbol,title,body,actions})}</div>`;}
function components(){return `<section class="px-document"><h2>${t('stylesTitle')}</h2><p>${t('stylesHelp')}</p><h3>${t('buttonSet')}</h3><div class="px-component-grid"><article><div class="px-button-spec">${startButton('feedback')}</div><small>${t('primary')}</small></article><article><div class="px-button-spec">${refreshButton('feedback')}</div><small>${t('normal')}</small></article><article>${btn('feedback',t('selectedLabel'),'is-selected')}<small>${t('selectedLabel')}</small></article><article><div class="px-button-spec">${refreshButton('feedback',true)}</div><small>${t('disabled')}</small></article></div><h3>${t('palette')}</h3><div class="px-palette">${[['dark','#302B51'],['surface','#4D4774'],['edge','#81739F'],['text','#ECDBB7'],['primary','#F7C366'],['support','#83C2B9']].map(([k,c])=>`<div><i style="background:${c}"></i><b>${t(k)}</b><code>${c}</code></div>`).join('')}</div><h3>${t('numberSet')}</h3><div class="px-number-sample" aria-label="0123456789">0123456789</div><h3>${t('frameContract')}</h3><p>${t('frameHelp')}</p></section>`;}
function inventory(){return `<section class="px-document"><h2>${t('materialTitle')}</h2><p>${t('materialHelp')}</p><div class="px-asset-grid px-materials">${uiMaterials.map(([name,src,spec])=>`<article><div class="px-asset-image"><img src="${src}" alt="${(Array.isArray(name)?pick(name):t(name))}" draggable="false"></div><h3>${(Array.isArray(name)?pick(name):t(name))}</h3><small>${spec}</small><a class="px-link" href="${src}" download>${t('downloadMaterial')}</a></article>`).join('')}</div><h3>${t('assetTitle')}</h3><p>${t('assetHelp')}</p><div class="px-asset-grid">${assets.map(a=>`<article><div class="px-asset-image">${sprite(a.id)}</div><h3>${pick(a.name)}</h3><p>${t(a.src?'static':'pending')}</p><small>${t('footprint')} ${a.footprint.join('×')}</small>${a.src?`<a class="px-link" href="${a.src}" download>${t('download')}</a>`:''}</article>`).join('')}</div></section>`;}
function numberControls(){
 return `<div class="px-font-test" role="group" aria-label="${t('numberCompare')}">${['jersey10','jersey15'].map((id,i)=>`<button data-action="digits:${id}" aria-pressed="${numberStyle===id}" style="--px-digit-font:'Jersey ${i?15:10}'"><span>Jersey ${i?15:10}</span><b>100 · 4/8 · 5</b><small>0123456789</small></button>`).join('')}</div>`;
}
function render(){
 cleanupCompatibility();cleanupAnimation();cleanupAim();cleanupBattle();
 if(section==='aim'||section==='combat'){state='ready';batch=false;}
 const focus=document.activeElement?.dataset?.action;
 document.documentElement.dataset.digits=numberStyle;
 document.documentElement.lang=locale==='zh'?'zh-CN':'en';document.title=t('lab');
app.innerHTML=`<div class="px-lab"><header class="px-lab__header"><a href="../art-review/">${t('lab')}</a><button data-action="language">${locale==='zh'?'EN':'中文'}</button></header><div class="px-lab__intro"><p>${t('phase')}</p><small>${t('scope')}</small></div><nav class="px-tabs" aria-label="${t('lab')}">${['scene','experiments','animation','aim','combat','components','assets'].map(x=>`<button data-action="section:${x}" aria-pressed="${section===x}">${t(x)}</button>`).join('')}</nav>${section==='scene'?`<div class="px-states" role="group" aria-label="${t('state')}">${states.map(s=>`<button data-action="state:${s}" aria-pressed="${state===s}">${t(s)}</button>`).join('')}</div><div class="px-view-tools"><button data-action="compare" aria-pressed="${compare}">${t('compareReference')}</button><button data-action="environment" aria-pressed="${environment}">${t('environmentLayer')}</button><button data-action="placeholders" aria-pressed="${placeholders}">${t('placeholderLayer')}</button></div>${numberControls()}${scene()}<p class="px-stage-note">${t('staticPendingNote')}</p>`:section==='experiments'?compatibility(scene()):section==='animation'?animationExperiment(scene()):section==='aim'?aimExperiment(scene()):section==='combat'?battleExperiment(scene()):section==='components'?components():inventory()}<footer class="px-lab__footer">${t('noAnimations')}<a href="../">${t('original')}</a></footer></div><div class="px-toast" role="status"></div>`;
 if(focus)app.querySelector(`[data-action="${CSS.escape(focus)}"]`)?.focus({preventScroll:true});
 if(section==='scene'||section==='combat')app.querySelector('.px-stage')?.insertAdjacentHTML('beforebegin',illustrationControls());
 cleanupCompatibility=section==='experiments'?mountCompatibility(app,refreshButton):()=>{};
 cleanupAnimation=section==='animation'?mountAnimation(app):()=>{};
 cleanupAim=section==='aim'?mountAim(app):()=>{};
 cleanupBattle=section==='combat'?mountBattle(app):()=>{};
 const blocked=['upgrade','pause','win','lose','loading','error'].includes(state)||batch;
 if(section==='scene'&&blocked){for(const e of app.querySelectorAll('.px-game> :not(.px-overlay)'))e.inert=true;}
 mountAudioButton(app);
 if(section==='assets')app.querySelector('.px-document').insertAdjacentHTML('beforeend',`<h3>${pick(['插画弹窗 · 独立素材','Illustrated dialogs · Separate assets'])}</h3><div class="px-dialog-materials">${dialogMaterials().map(a=>`<figure><img src="${dialogAsset(a.file)}" alt="${a.name}" draggable="false"><figcaption>${a.name}</figcaption><a href="${dialogAsset(a.file)}" download>${t('downloadMaterial')}</a></figure>`).join('')}</div>`);
 for(const img of app.querySelectorAll('img'))if(!img.closest('.px-rich-dialog'))img.addEventListener('error',()=>{img.replaceWith(Object.assign(document.createElement('span'),{className:img.alt?'px-image-fallback':'px-pending',textContent:img.alt||t('pending')}));});
}
function toast(){const el=app.querySelector('.px-toast');el.textContent=t('pretend');el.classList.add('is-visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('is-visible'),1600);}
app.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;
 if(a.startsWith('state:')){state=a.slice(6);batch=false;selection=null;section='scene';const u=new URL(location.href);u.searchParams.set('state',state);history.replaceState(null,'',u);}
 else if(a.startsWith('section:')){section=a.slice(8);batch=false;state='ready';const u=new URL(location.href);u.searchParams.set('section',section);history.replaceState(null,'',u);}
 else if(a==='language')toggleLocale();
 else if(a==='compare')compare=!compare;
 else if(a==='environment')environment=!environment;
 else if(a==='placeholders')placeholders=!placeholders;
 else if(a.startsWith('digits:')){numberStyle=a.slice(7)==='jersey15'?'jersey15':'jersey10';const u=new URL(location.href);u.searchParams.set('digits',numberStyle);history.replaceState(null,'',u);}
 else if(a.startsWith('select:')||a.startsWith('cell:'))selection=Number(a.split(':')[1]);
 else if(a==='batch')batch=true;
 else if(a==='cancel')batch=false;
 else if(a==='replace'){batch=false;selection=null;}
 else if(a.startsWith('upgrade:'))state='battle';
 render();if(['feedback','replace'].includes(a)||a.startsWith('upgrade:')||a.startsWith('cell:'))toast();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&section==='scene'&&(batch||!['ready','battle'].includes(state))){batch=false;state='ready';render();}});
render();

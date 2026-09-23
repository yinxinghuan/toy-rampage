import './style.css';
import {runStore} from './save.js';
import {fusionRecipe} from './fusions.js';
import {benchFusionHint,boardFusionHint} from './fusion-hints.js';
import {SUPPLY_UNLOCKS,HIGH_TIER_AFTER,chapterRoutes} from './progression.js';
import {reportView} from './combat-report.js';
import { Workshop,SimulationClock,CELL,GX,GY,W,H,COLS,LEVELS,UPGRADES,XP_THRESHOLDS,adjacent,FOOTPRINT } from './engine.js';
import {snapGridAxis} from './grid-input.js';
import { draw as classicDraw,drawTray as classicTray,drawDrag as classicDrag,setAppearance,getAppearance } from './draw.js';
import { locale,t,toggleLocale } from './copy.js';
import * as classicAudio from './audio.js';
import watermark from './img/alteru.svg';
async function boot(){
const pixel=new URLSearchParams(location.search).get('skin')==='classic'?null:await import('./play/skin.js');
if(pixel)await pixel.prepare();
const draw=pixel?.draw||classicDraw,drawTray=pixel?.drawTray||classicTray,drawDrag=pixel?.drawDrag||classicDrag;
const {enableAudio,toggleSound,sound}=pixel||classicAudio;
const shapes={fast:'<path d="m3 5 8 7-8 7V5Zm10 0 8 7-8 7V5Z"/>',plus:'<path d="M12 5v14M5 12h14"/>',pause:'<path d="M8 5v14M16 5v14"/>',sound:'<path d="M11 5 6 9H3v6h3l5 4V5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',muted:'<path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6M21 9l-5 6"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',refresh:'<path d="M3 10a9 9 0 0 1 15-6l3 3M21 3v4h-4M21 14a9 9 0 0 1-15 6l-3-3M3 21v-4h4"/>',gear:'<path d="m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[n]}</svg>`;
const mergeIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 12 6-6 6 6M6 19l6-6 6 6"/></svg>';
const fusionIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m7 3 5 5-5 5-5-5zM17 11l5 5-5 5-5-5zM10 11l4 2"/></svg>';
const hand='<svg viewBox="0 0 56 68" aria-hidden="true"><path d="M20 36V10c0-8 11-8 11 0v18c3-6 10-4 10 2 4-5 10-1 9 4 7-2 9 4 7 10l-4 17H26L9 42c-5-6 3-12 8-6l3 3Z" transform="translate(-4 0)" fill="#fff7e6" stroke="#294740" stroke-width="3" stroke-linejoin="round"/></svg>';
const game=new Workshop(),root=document.querySelector('#app');
const simulation=new SimulationClock();
setAppearance(new URLSearchParams(location.search).get('look'));
const initialAppearance=getAppearance();
root.innerHTML=`<section class="tw">
<header class="tw__header"><div><div class="tw__edition" id="edition"></div><h1 id="title"></h1></div><div class="tw__tools"><button class="tw__look" data-action="appearance"></button><button class="tw__icon" data-action="pause">${icon('pause')}</button></div></header>
<div class="tw__hud"><div class="tw__metric">${icon('heart')}<div><small id="hp-label"></small><strong id="hp"></strong></div></div><div class="tw__phase" id="phase"></div><div class="tw__metric">${icon('gear')}<div><small id="coins-label"></small><strong id="coins"></strong></div></div></div>
<section class="tw__hint" aria-live="polite"><div class="tw__hint-copy"><h2 id="hint-title"></h2></div><button class="tw__route-supply" data-action="route-supply" hidden></button><button class="tw__fusion-button" data-action="fusion-recipe" hidden></button><button class="tw__speed" data-action="speed" hidden></button><button class="tw__hint-replay" data-action="hint" aria-label="">?</button></section>
<div class="tw__field"><div class="tw__board"><canvas class="tw__canvas" aria-hidden="true"></canvas><div class="tw__cells" role="group"></div><button class="tw__expand" data-action="expand" hidden style="left:${GX/W*100}%;top:${(GY+3*CELL)/H*100}%;width:${COLS*CELL/W*100}%;height:${CELL/H*100}%"></button></div><div class="tw__notice" role="status"></div></div>
<section class="tw__supply" id="supply"></section>
<footer class="tw__footer"><button class="tw__primary" id="main-action" data-action="main"></button><button class="tw__refresh" data-action="refresh"></button><button class="tw__icon" data-action="deselect">${icon('close')}</button></footer>
<div class="tw__xp" hidden><span id="xp-label"></span><div role="progressbar" id="xp-progress"><i></i></div></div>
<div class="tw__footnote"><span id="version">v0.5.0</span><img class="tw__watermark" src="${watermark}" alt="" draggable="false"></div>
<div class="tw__overlay" hidden></div></section>
<div class="tw__drag" hidden><canvas></canvas></div>
<div class="tw__guide" aria-hidden="true" hidden><svg class="tw__guide-line"><path/></svg><div class="tw__guide-source"></div><div class="tw__guide-target"></div><div class="tw__guide-hand"><canvas></canvas>${hand}</div></div>`;
const $=s=>root.querySelector(s),canvas=$('.tw__canvas'),cells=$('.tw__cells'),overlay=$('.tw__overlay'),guide=$('.tw__guide');
let selection=null,hover=null,drag=null,noticeUntil=0,soundOn=true,confirmMode='',speed=1,lastInteraction=-9999,guideStart=performance.now(),guideStage='',signature='',cellKey='',supplyKey='',overlayKey='',previousFocus,ghostKey='';
const attempts=[];
const saves=runStore(window.alteruLocalStorage),saved=saves.load();
let recoveryPending=saved.status==='ok',lastSave=0,saveWarning=false;
if(recoveryPending)confirmMode='recover';
function persistRun(){
 if(recoveryPending)return;
 if(!saves.save(game)&&!saveWarning){saveWarning=true;notify('saveUnavailable');}
}
addEventListener('pagehide',persistRun);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelDrag();game.paused=true;persistRun();}});
const appearanceChanges=[];
let recipePreview=null,routeChoice=null;
let pendingLevel=0,recordIndex=-1,expandedWave=-1;
let landPresented='',benchMode='weapons',benchStage='',benchBatchKey='',benchWidths=[1,1,1];
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>reduced=e.matches);
if(!canvas.getContext('2d')){root.textContent=t('loadingError');throw new Error('Canvas initialization failed');}
function notify(key,vars={}){$('.tw__notice').textContent=t(key,vars);noticeUntil=performance.now()+2600;}
function newUnitMove(){
 for(let i=0;i<3;i++){const u=game.reserve[i];if(!u||!['bubble','drum','rivet','arc'].includes(u.kind)||game.units.some(x=>x.kind===u.kind))continue;
  for(let r=0;r<game.rows;r++)for(let c=0;c<COLS;c++){const p=game.preview('reserve:'+i,c,r);if(p.ok&&p.type==='place'&&(u.kind!=='drum'||game.units.some(v=>v.kind!=='drum'&&adjacent({...u,c,r},v))))return{source:'reserve:'+i,...p};}
 }return null;
}
function updateUI(){
 if(pixel){const token=game.levelIndex+':'+game.wave;if(game.stage==='ready'&&game.get('land')&&landPresented!==token){benchMode='land';landPresented=token;}if(game.stage==='expand'&&benchStage!=='expand')benchMode='land';if(!game.get('land')||!['expand','ready','wave'].includes(game.stage))benchMode='weapons';benchStage=game.stage;}
 if(pixel)soundOn=pixel.soundEnabled();
 const look=getAppearance();
 const unitSig=game.units.map(u=>[u.id,u.kind,u.rank,u.c,u.r].join(':')).join('/');
 const reserveSig=game.reserve.map(u=>u?u.kind+u.rank:'').join(',');
 const boardSig=game.board.map(Number).join('');
 const key=[game.landKind(),routeChoice,game.supplyLog.length,benchMode,pixel?.settled(),boardSig,game.landRemaining,look,game.xp,game.upgradeLevel,game.choices.join(),game.levelIndex,recordIndex,expandedWave,Boolean(drag),game.stage,game.lesson,game.shopRevision,game.rows,game.hp,game.coins,game.wave,game.enemies.length,game.spawnLeft,locale,selection,soundOn,game.paused,confirmMode,speed,game.tray?.kind,reserveSig,unitSig].join('|');
 if(signature===key)return;signature=key;
 document.documentElement.lang=locale==='zh'?'zh-CN':'en';document.title=t('title');$('.tw').dataset.stage=game.stage;$('.tw').dataset.lesson=game.lesson;$('.tw').dataset.level=String(game.levelIndex+1);
 if(!pixel)$('#title').textContent=t('title');$('#edition').textContent=t('edition');$('#hp-label').textContent=t('health');$('#hp').textContent=game.hp;
 $('#coins-label').textContent=t('coins');$('#coins').textContent=game.coins;
 $('#phase').innerHTML=game.lab?t('lab'):['wave','ready','win','lose'].includes(game.stage)?`<strong>${t('levelNumber',{n:game.levelIndex+1})}</strong><span>${t('wave',{n:game.stage==='ready'?game.wave+1:game.wave,total:game.waves.length})}</span>`:t('safe');
 const stage=game.ended?'ready':game.stage;
 const freshMove=game.stage==='ready'&&!(pixel&&benchMode==='land')?newUnitMove():null;
 $('#hint-title').textContent=game.stage==='ready'&&game.lesson==='refresh'&&!(pixel&&benchMode==='land')?t('refreshBrief'):freshMove?t(freshMove.kind+'Brief'):game.stage==='ready'&&game.get('land')?t('landBrief'):game.stage==='ready'&&game.lesson==='place'?t(game.reserveMove()?'refreshPlaceBrief':'makeRoomBrief'):game.stage==='ready'?t('next',{name:t(game.waves[Math.min(game.wave,game.waves.length-1)].kind)}):game.stage==='wave'?t('remaining',{n:game.spawnLeft+game.enemies.length}):t(stage+'Brief');
 if(pixel&&benchMode==='weapons'&&game.get('land')&&['expand','ready'].includes(game.stage)&&!freshMove&&game.lesson!=='refresh')$('#hint-title').textContent=t('openLandHint');
 if(game.stage==='ready'&&game.waves[game.wave]?.mix&&!freshMove&&!game.get('land')&&!['refresh','place'].includes(game.lesson))$('#hint-title').textContent=t('next',{name:t('mixedWave')});
 $('[data-action="hint"]').setAttribute('aria-label',t('hint'));$('[data-action="hint"]').hidden=!['place','second','merge','rail','expand','fusion'].includes(game.stage)&&!(game.stage==='ready'&&['refresh','place'].includes(game.lesson));
 $('[data-action="pause"]').setAttribute('aria-label',t('pause'));
 const expand=$('[data-action="expand"]');expand.hidden=true;
 const routeButton=$('[data-action="route-supply"]');
 routeButton.hidden=game.stage!=='ready'||!game.routeSupplies().length;
 routeButton.textContent=t('routeSupply');routeButton.disabled=game.coins<5;
 if(!routeButton.hidden)$('#hint-title').textContent=t('routeSupplyHint');
 const landEditing=(!pixel||benchMode==='land')&&game.canEditLand();
 let landTools=$('.tw-land-tools');if(!landTools){$('.tw__hint').insertAdjacentHTML('beforeend','<div class="tw-land-tools" hidden></div>');landTools=$('.tw-land-tools');}
 landTools.hidden=!landEditing;
 if(landEditing){
   landTools.innerHTML=`<button data-action="land-rotate" aria-label="${t('rotateLand')}" ${game.landKind()==='plot1'?'disabled':''}>${icon('refresh')}</button>${game.canSplitLand()?`<button data-action="land-split">${t('splitLand')}</button>`:''}`;
   routeButton.hidden=true;$('#hint-title').textContent=t(game.landMove()?'landBrief':'rotateLandHint');
 }
 const fusion=$('[data-action="fusion-recipe"]'),fusionHint=boardFusionHint(game,selection),fusionMove=fusionHint?.move;
 const selectedParent=fusionHint?.unit;
 const missingRecipe=fusionHint?.recipe;
 if(fusion.parentElement!==$('.tw__board'))$('.tw__board').append(fusion);
 fusion.hidden=(!fusionMove&&!missingRecipe)||Boolean(drag)||Boolean(confirmMode)||game.paused||game.choices.length>0||game.ended;fusion.textContent=t('fusionAction');
 if(missingRecipe){const needed=selectedParent.kind===missingRecipe.material?missingRecipe.anchor:missingRecipe.material;fusion.textContent=t('routeNeed',{name:t(needed),n:selectedParent.rank});fusion.style.left=(GX+(selectedParent.c+FOOTPRINT[selectedParent.kind][0]/2)*CELL)/W*100+'%';fusion.style.top=(GY+selectedParent.r*CELL)/H*100+'%';fusion.dataset.recipe=missingRecipe.kind;}else delete fusion.dataset.recipe;
 if(fusionMove&&!missingRecipe){fusion.style.left=(GX+(fusionMove.c+FOOTPRINT[fusionMove.kind][0]/2)*CELL)/W*100+'%';fusion.style.top=(GY+fusionMove.r*CELL)/H*100+'%';fusion.dataset.anchor=fusionMove.c+','+fusionMove.r;}
 $('.tw').dataset.cells=String(game.board.filter(Boolean).length);
 $('[data-action="hint"]').hidden=landEditing||!guidePlan();
 const speedButton=$('[data-action="speed"]');speedButton.hidden=!['wave','labwave'].includes(game.stage)||(game.mode==='tutorial'&&game.wave===1);
 speedButton.innerHTML=icon('fast')+'<span>'+speed+'×</span>';speedButton.setAttribute('aria-label',t('speedLabel',{n:speed}));speedButton.setAttribute('aria-pressed',String(speed===2));
 const refresh=$('[data-action="refresh"]');
 refresh.disabled=game.stage!=='ready'||game.coins<5||Boolean(game.tray)||(pixel&&benchMode==='land');
 refresh.setAttribute('aria-label',t('refresh'));
 refresh.innerHTML='<span>'+icon('refresh')+t('refreshName')+'</span><small>'+icon('gear')+'5</small>';
 refresh.style.visibility=game.stage==='ready'&&(game.mode!=='tutorial'||game.wave>0)&&!(pixel&&benchMode==='land')?'visible':'hidden';
 const deselect=$('[data-action="deselect"]');deselect.disabled=selection===null;deselect.setAttribute('aria-label',t('cancelSelection'));
 deselect.style.visibility=selection===null?'hidden':'visible';
 const main=$('#main-action');
 main.disabled=!['ready','fused'].includes(game.stage)||Boolean(game.tray);
 if(!pixel||game.stage!=='ready')main.textContent=game.stage==='ready'?t('start'):game.stage==='fused'?t('trial'):'';
 main.style.visibility=main.disabled?'hidden':'visible';
 const ck=[boardSig,game.rows,locale,unitSig].join('|');
 if(ck!==cellKey){
   cellKey=ck;const focused=document.activeElement?.dataset?.cell;cells.setAttribute('aria-label',t('board'));
   cells.innerHTML=Array.from({length:game.rows*COLS},(_,i)=>{
    const c=i%COLS,r=Math.floor(i/COLS),u=game.at(c,r),label=t('cell',{c:c+1,r:r+1})+(u?' · '+t('unit',{name:t(u.kind),n:u.rank}):game.hasCell(c,r)?'':' · '+t('locked'));
    return `<button class="tw__cell" data-cell="${c},${r}" data-open="${game.hasCell(c,r)}" aria-label="${label}" style="left:${(GX+c*CELL)/W*100}%;top:${(GY+r*CELL)/H*100}%;width:${CELL/W*100}%;height:${CELL/H*100}%"></button>`;
   }).join('');
   if(focused)cells.querySelector(`[data-cell="${focused}"]`)?.focus({preventScroll:true});
 }
 $('.tw').dataset.look=look;const lookButton=$('.tw__look');lookButton.textContent=t('look-'+look);lookButton.setAttribute('aria-label',t(look==='open'?'switchBlock':'switchOpen'));lookButton.setAttribute('aria-pressed',String(look==='open'));
 const sk=[game.landKind(),benchMode,boardSig,game.landRemaining,look,game.stage,game.shopRevision,locale,game.tray?.kind,game.tray?.rank,reserveSig].join('|');
 if(supplyKey!==sk){
   supplyKey=sk;const supply=$('#supply'),keepToggleFocus=document.activeElement?.dataset?.action==='bench-toggle';
   supply.className='tw__supply';
   supply.dataset.mode=benchMode;
   const items=[...(['ready','wave'].includes(game.stage)&&!game.tray?game.reserve:[null,game.tray||null,null]),game.get('land')||null,game.get('land:other')||null,game.get('land:square')||null];
   if(pixel){const batch=game.tray?'tray:'+game.tray.kind:'reserve:'+game.shopRevision;if(batch!==benchBatchKey){benchBatchKey=batch;benchWidths=items.slice(0,3).map(u=>u?FOOTPRINT[u.kind][0]:1);}supply.style.setProperty('--bench-columns',benchMode==='land'?`repeat(${game.landOffers().length},minmax(44px,1fr))`:benchWidths.map(w=>`minmax(44px,${w+.5}fr)`).join(' '));supply.style.setProperty('--bench-unit',benchMode==='land'?(game.landOffers().length>2?'6.5cqw':'8cqw'):`min(9.5cqw,${72/(benchWidths.reduce((a,b)=>a+b,0)+1.5)}cqw)`);}
   supply.innerHTML=items.map((u,i)=>{
     if(pixel&&(benchMode==='land'?i<3:i>=3))return '';
     if(!u)return pixel&&i>=3?'':'<div class="tw__slot" aria-hidden="true"></div>';
     const {kind}=u,source=i>=3?(i===3?'land':i===4?'land:other':'land:square'):game.tray?'tray':'reserve:'+i;
     return `<button class="tw__part tw__offer" data-source="${source}" data-kind="${kind}" aria-pressed="false" aria-label="${t('select',{name:t(kind)})}"><canvas aria-hidden="true"></canvas><span>${t(kind)}</span><span class="tw__pair" hidden>${mergeIcon}</span><span class="tw__fusion-pair" hidden>${fusionIcon}<b></b></span></button>`;
   }).join('');
   supply.querySelectorAll('[data-source]').forEach(el=>{const u=game.get(el.dataset.source);drawTray(el.querySelector('canvas'),u.kind,u.rank);});
   if(pixel){const land=benchMode==='weapons',grid='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 2h8v8H2zM14 2h8v8h-8zM2 14h8v8H2zM18 14v8m-4-4h8"/></svg>',gun='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 3h10v12H7zM5 15h14v6H5zM9 7h6M9 11h6"/></svg>';supply.insertAdjacentHTML('beforeend',`<button class="tw-bench-toggle" data-action="bench-toggle" aria-label="${t(land?(game.get('land')?'switchLand':'noLand'):'switchWeapons')}" aria-pressed="${!land}" ${!['expand','ready','wave'].includes(game.stage)?'hidden':''} ${land&&!game.get('land')?'disabled':''}>${land?grid:gun}<span>${t(land?'benchLand':'benchWeapons')}</span>${land&&game.landRemaining?`<b>${game.landRemaining}</b>`:''}</button>`);}
   if(pixel&&benchMode==='land')supply.insertAdjacentHTML('beforeend',`<span class="tw-land-credit">${t('landCredit',{n:game.landRemaining})}</span>`);
   if(keepToggleFocus)supply.querySelector('[data-action=bench-toggle]')?.focus({preventScroll:true});
 }
 const benchHint=benchFusionHint(game,selection);
 $('#supply').querySelectorAll('[data-source]').forEach(el=>{
   const source=el.dataset.source,u=game.get(source),role=benchHint?.anchor===source?'first':benchHint?.material===source?'next':null;
   el.setAttribute('aria-pressed',String(selection===source));const pair=game.partner(source)!==null;
   el.querySelector('.tw__pair').hidden=!pair||Boolean(role);el.dataset.merge=String(pair&&!role);
   const badge=el.querySelector('.tw__fusion-pair');badge.hidden=!role;badge.querySelector('b').textContent=role?t('benchFusion-'+role):'';
   if(role){el.dataset.fusionRole=role;el.dataset.fusionKind=benchHint.recipe.kind;}else{delete el.dataset.fusionRole;delete el.dataset.fusionKind;}
   el.setAttribute('aria-label',t('select',{name:t(u.kind)})+(role?' · '+t('benchFusion-'+role)+' · '+t(benchHint.recipe.kind):pair?' · '+t('canMerge'):''));
 });
 if(benchHint&&game.stage==='ready'&&benchMode==='weapons')$('#hint-title').textContent=t(!benchHint.move?'benchFusionSpace':typeof benchHint.anchor==='number'?'benchFusionReady':'benchFusionPlace',{name:t(game.get(benchHint.anchor).kind)});
 $('[data-action="hint"]').hidden=landEditing||!guidePlan();
 const xp=$('.tw__xp'),previous=XP_THRESHOLDS[game.upgradeLevel-1]||0,next=XP_THRESHOLDS[game.upgradeLevel];xp.hidden=game.lab||!['ready','wave','win','lose'].includes(game.stage);
 $('#xp-label').textContent=t(next?'xpLabel':'xpDone');$('#xp-progress').setAttribute('aria-label',t('xpLabel'));$('#xp-progress').setAttribute('aria-valuemin','0');$('#xp-progress').setAttribute('aria-valuemax',String(next?next-previous:1));$('#xp-progress').setAttribute('aria-valuenow',String(next?Math.min(game.xp-previous,next-previous):1));$('#xp-progress i').style.width=(next?Math.min(1,(game.xp-previous)/(next-previous))*100:100)+'%';
 const selected=game.get(selection);
 const mode=confirmMode|| (game.paused?'pause':pixel&&!pixel.settled()?'':game.choices.length?'upgrade':game.ended?game.stage:'');
 const ok=[routeChoice,look,game.choices.join(),mode,game.levelIndex,recordIndex,expandedWave,locale,game.hp,game.kills,game.leaks,pixel?'':soundOn,selection].join('|');
 if(ok!==overlayKey){
   overlayKey=ok;
   if(!mode){overlay.hidden=true;overlay.innerHTML='';previousFocus?.focus?.({preventScroll:true});}
   else{
    if(overlay.hidden)previousFocus=document.activeElement;
    const focusAction=document.activeElement?.dataset?.action,scroll=overlay.querySelector('.tw__modal')?.scrollTop||0;
    overlay.hidden=false;overlay.innerHTML=modal(mode,selected);
    overlay.querySelectorAll('[data-machine]').forEach(el=>{const[kind,rank]=el.dataset.machine.split(':');drawTray(el,kind,Number(rank));});
    overlay.querySelectorAll('[data-action^="wave-record-"]').forEach(el=>el.setAttribute('aria-expanded',String(Number(el.dataset.action.slice(12))===expandedWave)));
    queueMicrotask(()=>{const focus=overlay.querySelector(`[data-action="${focusAction}"]`);(focus||overlay.querySelector('button'))?.focus({preventScroll:true});if(focus)overlay.querySelector('.tw__modal').scrollTop=scroll;});
   }
 }
 pixel?.decorate(mode);
}
function button(action,label,primary=false){return `<button class="tw__${primary?'primary':'secondary'}" data-action="${action}">${label}</button>`;}
function combatMarkup(combat){
 const v=reportView(combat);if(!v)return '';
 return `<section class="tw-report" aria-label="${t('reportTitle')}"><h3>${t(v.leaks.length?'reportEscaped':'reportClean')}</h3>${v.leaks.map(e=>`<div class="tw-report__leak"><strong>${t(e.kind)} × ${e.count}</strong><span>${t('reportRemaining',{n:e.remaining})}</span><i aria-hidden="true" style="--amount:${e.remaining}%"></i></div>`).join('')}${v.leaks.length?`<p class="tw-report__hint">${t(v.hint)}</p>`:''}<h3>${t('reportDamage')}</h3>${v.damage.length?v.damage.slice(0,3).map(d=>`<div class="tw-report__damage"><canvas data-machine="${d.kind}:${d.rank}" aria-hidden="true"></canvas><span>${t(d.kind)}<i aria-hidden="true" style="--amount:${d.percent}%"></i></span><b>${d.percent}%</b></div>`).join(''):`<p>${t('reportNoDamage')}</p>`}<small>${t('reportDamageNote')}</small><div class="tw-report__support">${v.breachExtra?`<span>${t('reportBreach',{n:v.breachExtra})}</span>`:''}${v.supportShots?`<span>${t('reportSupport',{n:v.supportShots})}</span>`:''}${v.chainTargets?`<span>${t('reportChain',{n:v.chainTargets})}</span>`:''}</div></section>`;
}
function failureFact(){const v=reportView(game.history.at(-1)?.combat),e=v?.leaks[0];return e?t('reportFailure',{name:t(e.kind),n:e.count}):t('loseBody');}
function lineupMarkup(units){return `<div class="tw__lineup">${units.map(u=>`<div><canvas data-machine="${u.kind}:${u.rank}" aria-label="${t('unit',{name:t(u.kind),n:u.rank})}"></canvas><small>${t('position',{r:u.r+1,c:u.c+1})}</small></div>`).join('')}</div>`;}
function modal(mode,selected){
 let title='',content='';
 const back=button('back',t('back'));
 if(mode==='recover'){
   title=t('recoverTitle');content=`<p>${t('recoverBody',{n:saved.game.levelIndex+1,wave:saved.game.wave})}</p>${button('recover-run',t('recoverRun'),true)}${button('recover-new',t('recoverNew'))}`;
 }else if(mode==='fusion-recipe'){
   const recipe=fusionRecipe(pendingFusion?.kind||recipePreview?.kind||'fusion'),rank=pendingFusion?game.get(pendingFusion.source)?.rank:recipePreview?.rank||recipe.rank;
   title=t('fusionAction');content=`<div class="tw__recipe"><canvas data-machine="${recipe.material}:${rank}"></canvas><span>+</span><canvas data-machine="${recipe.anchor}:${rank}"></canvas><span>→</span><canvas data-machine="${recipe.kind}:${rank+1}"></canvas></div><p>${t(recipe.kind==='fusion'?'fusionBody':recipe.kind+(rank===2?'Recipe3':'Recipe'))}</p>${pendingFusion?.bench?`<p>${t('benchFusionConfirm')}</p>`:''}${pendingFusion?button('fuse-now',t('fuseNow'),true):''}${button('cancel',t('cancel'))}`;
 }else if(mode==='route-supply'){
   const routes=game.routeSupplies(),kind=routes.includes(routeChoice)?routeChoice:routes[0],r=fusionRecipe(kind);
   title=t('routeSupply');content=`<div class="tw-route-panel">${routes.length>1?`<nav class="tw-route-tabs" aria-label="${t('routeChoices')}">${routes.map(k=>`<button data-action="route-view-${k}" aria-pressed="${kind===k}">${t(k)}</button>`).join('')}</nav>`:''}<p>${t('routeKitIntro')}</p><article><strong>${t(kind)}</strong><div class="tw__recipe"><canvas data-machine="${r.material}:2"></canvas><span>+</span><canvas data-machine="${r.anchor}:2"></canvas><span>→</span><canvas data-machine="${kind}:3"></canvas></div><p>${t(kind+'Kit')}</p></article>${game.reserve.some(Boolean)?'<p class="tw-route-warning">'+t('routeKitReplace')+'</p>':''}<div class="tw-route-actions">${button('route-claim-'+kind,t('routeKitClaim'),true)}${button('cancel',t('routeSkip'))}</div></div>`;
 }else if(mode==='upgrade'){
   title=t('upgradeTitle');content=`<p class="tw__upgrade-intro">${t('upgradeIntro')}</p><div class="tw__upgrades">${game.choices.map((id,i)=>{const u=UPGRADES.find(u=>u.id===id),targets=game.affectedUnits(u.kind,id);return `<button class="tw__upgrade-card" data-action="upgrade-${i}" data-upgrade="${id}">${u.kind?`<canvas data-machine="${targets[0]?.kind||u.kind}:${targets[0]?.rank||1}" aria-hidden="true"></canvas>`:`<div class="tw__upgrade-symbol">${icon(id==='repair'?'heart':'gear')}</div>`}<span><strong>${t(id)}</strong><span>${t(id+'Desc')}</span><small>${t(u.kind?(targets.some(x=>fusionRecipe(x.kind))?'affectsFusion':'affects'):'instantReward',{n:targets.length})}</small></span></button>`;}).join('')}</div>`;
 }else if(mode==='refresh-replace'){
   title=t('replaceTitle');content=`<p>${t('replaceBody',{n:game.reserve.filter(Boolean).length})}</p>${button('refresh-confirm',t('replaceConfirm'),true)}${button('cancel',t('cancel'))}`;
 }else if(mode==='levels'){
   title=t('chooseLevel');content=`<p>${t('fixedStart')}</p><div class="tw__levels">${LEVELS.map((l,i)=>`<button class="tw__level" data-action="level-${i}" aria-current="${game.levelIndex===i?'true':'false'}"><strong>${i+1}</strong><span>${t(l.title)}<small>${t(l.focus)}</small></span><b aria-hidden="true">›</b></button>`).join('')}</div>${back}`;
 }else if(mode==='records'){
   title=t('records');const record=recordIndex<0?game.report():attempts[recordIndex];
   content=`<p>${t('recordLabel',{n:record.level})} · ${t(record.outcome==='win'?'cleared':record.outcome==='lose'?'failed':record.outcome==='abandoned'?'abandoned':'inProgress')}</p><div class="tw__records">${record.history.length?record.history.map((h,i)=>`${button('wave-record-'+i,`<span>${t('waveShort',{n:h.wave})}</span><strong>${icon('heart')}${h.startHp} → ${h.hp}</strong><span aria-hidden="true">${expandedWave===i?'−':'+'}</span>`)}${expandedWave===i?`<div class="tw__record-detail"><p>${t('recordStats',{kills:h.kills,leaks:h.leaks,seconds:h.seconds})}</p><small>${t('beforeBattle')} · ${t('price',{n:h.startCoins})}</small>${lineupMarkup(h.startUnits)}<small>${t('afterBattle')} · ${t('price',{n:h.coins})}</small>${lineupMarkup(h.units)}</div>`:''}`).join(''):`<p>${t('noRecords')}</p>`}</div>${back}${button('export',t('exportRecords'))}<small>${t('recordLocal')}</small>${recordIndex>=0?button('record-current',t('currentAttempt')):''}${attempts.length?`<h3>${t('pastAttempts')}</h3>`:''}${attempts.map((a,i)=>button('attempt-'+i,`${t('recordLabel',{n:a.level})} · ${t(a.outcome==='win'?'cleared':a.outcome==='lose'?'failed':'abandoned')} · ${a.hp}`)).join('')}`;
 }else if(mode==='handbook'){
   title=t('handbook');content=`<nav class="tw__handbook-back">${back}</nav><section class="tw__handbook"><h3>${t(game.level.title)}</h3><p>${t(game.level.focus)}</p><h3>${t('chapterSupply')}</h3>${SUPPLY_UNLOCKS.map(x=>`<div class="tw__milestone"><canvas data-machine="${x.kind}:1" aria-hidden="true"></canvas><span>${t('afterWave',{n:x.afterWave})}<strong>${t(x.kind)}</strong></span></div>`).join('')}<p>${t('afterWave',{n:HIGH_TIER_AFTER})} · ${t('tierSupply')}</p><p>${t('landSchedule')}</p><h3>${t('routeChoices')}</h3><p>${t('routeOptional')}</p>${chapterRoutes(game.levelIndex).map(kind=>{const r=fusionRecipe(kind);return `<article data-route="${kind}"><div class="tw__recipe"><canvas data-machine="${r.material}:${r.rank}" aria-label="${t(r.material)} ${r.rank}"></canvas><span>+</span><canvas data-machine="${r.anchor}:${r.rank}" aria-label="${t(r.anchor)} ${r.rank}"></canvas><span>→</span><canvas data-machine="${kind}:${r.resultRank}" aria-label="${t(kind)} ${r.resultRank}"></canvas></div><p>${t(kind==='fusion'?'fusionBody':kind+'Recipe3')}</p></article>`;}).join('')}</section>`;
 }else if(mode==='rules'){
   title=t('rules');content=`<p>${t('compactRules')}</p>${game.level.experiment?`<p>${t('trialRules')}</p>`:''}${back}${button('reset-tutorial',t('restart'))}${button('reset-lab',t('toLab'))}`;
 }else if(mode.startsWith('reset')||mode==='switch-level'||mode==='sell'){
   title=t(mode==='sell'?'sellTitle':mode==='switch-level'?'switchLevel':mode==='reset-tutorial'?'restart':mode==='reset-lab'?'toLab':'retryLevel');
   content=`<p>${t(mode==='sell'?'sellBody':'resetBody',{n:selected?game.sellValue(selected):0})}</p>${button('confirm',t('confirm'),true)}${button('cancel',t('cancel'))}`;
 }else if(mode==='pause'){
   title=t('paused');content=button('resume',t('resume'),true)+button('levels',t('chooseLevel'))+button('reset-run',t('retryLevel'))+button('records',t('records'))+button('handbook',t('handbook'))+button('rules',t('rules'));
   if(typeof selection==='number'&&game.stage==='ready')content+=button('sell',t('sell',{n:game.sellValue(selected)}));
   if(!pixel)content+=button('appearance',t('look-'+getAppearance())+' · '+t('switchLook'))+`<small>${t('lookHint')}</small>`;
   content+=`<div class="tw__settings">${button('sound',icon(soundOn?'sound':'muted')+t(soundOn?'soundOn':'soundOff'))}${button('language',t('language'))}</div><small>${t('local')}</small>`;
 }else{
   title=mode==='win'?t('levelCleared',{n:game.levelIndex+1}):t(mode+'Title');
   const next=mode==='win'&&game.levelIndex<LEVELS.length-1;
   content=`<div class="tw__result"><strong>${t('kept',{hp:game.hp})}</strong><span>${t('passed',{n:game.passed,total:game.waves.length})}</span><span>${t('result',{kills:game.kills,leaks:game.leaks})}</span></div>${mode==='lose'?'<p>'+t('loseBody')+'</p>':''}${button(next?'next-level':mode==='win'||mode==='labend'?'levels':'run',t(next?'nextLevel':mode==='win'||mode==='labend'?'chooseLevel':'retryLevel'),true)}${mode==='win'?button('run',t('retryLevel')):button('levels',t('chooseLevel'))}${button('records',t('records'))}`;
 }
 if(mode==='lose')content=content.replace(`<p>${t('loseBody')}</p>`,`<p>${failureFact()}</p>`);
 if(mode==='win'&&game.levelIndex<LEVELS.length-1)content+=button('levels',t('chooseLevel'));
 if(mode==='records'){
   const history=recordIndex<0?game.history:attempts[recordIndex]?.history;
   content=content.replace('<div class="tw__record-detail">','<div class="tw__record-detail">'+combatMarkup(history?.[expandedWave]?.combat));
   // Keep an escape and export reachable while the opt-in record details scroll.
   content=content.replace(back,'').replace(button('export',t('exportRecords')),'');
   const record=recordIndex<0?game.report():attempts[recordIndex];
   content=`<nav class="tw__record-nav">${back}${button('export',t('exportRecords'))}</nav>`+content+(record.upgrades?.length?'<h3>'+t('chosenUpgrades')+'</h3>'+record.upgrades.map(u=>`<p>${t('waveShort',{n:u.wave})} · ${t(u.id)}</p>`).join(''):'');
 }
 return pixel?pixel.modal(mode,title,content):`<section class="tw__modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="tw__stamp">${t('edition')}</div><h2 id="modal-title">${title}</h2>${content}</section>`;
}
function clearReservePreview(){for(const el of root.querySelectorAll('[data-drop]')){delete el.dataset.drop;el.removeAttribute('data-next-rank');}}
function cancelDrag(){drag=null;hover=null;clearReservePreview();$('.tw__drag').hidden=true;}
let pendingFusion=null;
function requestFusion(source,c,r){
 const p=game.preview(source,c,r);if(!p.ok||p.type!=='fusion')return false;
 pendingFusion={source,c,r,targetId:p.target.id,kind:p.kind};cancelDrag();selection=null;confirmMode='fusion-recipe';updateUI();return true;
}
function reset(mode='tutorial',levelIndex=game.levelIndex){
 pendingFusion=null;
 pixel?.cancelSwap();
 landPresented='';benchMode='weapons';benchStage='';benchBatchKey='';benchWidths=[1,1,1];
 if(game.wave>0&&!game.lab){if(!game.ended&&game.stage==='wave')game.recordWave('abandoned');attempts.unshift(game.report(game.ended?game.stage:'abandoned'));attempts.splice(20);}
 cancelDrag();simulation.reset();selection=null;game.reset(mode,levelIndex);pixel?.onReset();confirmMode='';recordIndex=-1;expandedWave=-1;speed=1;lastInteraction=-9999;guideStage='';$('.tw__notice').textContent='';updateUI();
}
function pause(){cancelDrag();pixel?.cancelSwap();pixel?.hush();if(typeof selection==='string')selection=null;game.paused=true;updateUI();}
function action(name){
 if(recoveryPending&&!['recover-run','recover-new','sound','language'].includes(name))return;
 if(name!=='sound')enableAudio();lastInteraction=performance.now();
 if(name==='recover-run'){Object.assign(game,saved.game);game.paused=false;recoveryPending=false;confirmMode='';simulation.reset();pixel?.onReset();persistRun();}
 else if(name==='recover-new'){recoveryPending=false;reset();persistRun();}
 else if(name==='sound'){soundOn=toggleSound();notify(soundOn?'soundOn':'soundOff');}
 else if(name==='appearance'){cancelDrag();setAppearance(getAppearance()==='open'?'block':'open');ghostKey='';appearanceChanges.push({look:getAppearance(),level:game.levelIndex+1,wave:game.wave,seconds:Math.round(game.elapsed*10)/10});}
 else if(name==='language')toggleLocale();
 else if(name==='pause')pause();
 else if(name==='resume')game.paused=false;
 else if(name.startsWith('upgrade-')){if(game.chooseUpgrade(Number(name.slice(8)))){selection=null;lastInteraction=-9999;}}
 else if(name==='levels'||name==='rules'||name==='handbook')confirmMode=name;
 else if(name==='route-supply'){selection=null;routeChoice=null;confirmMode='route-supply';}
 else if(name.startsWith('route-view-')){if(game.routeSupplies().includes(name.slice(11)))routeChoice=name.slice(11);}
 else if(name.startsWith('route-claim-')){const result=game.claimRoute(name.slice(12),true);if(result.ok){confirmMode='';selection=null;benchMode='weapons';notify('routeDelivered');}else notify(result.reason);}
 else if(name==='fusion-recipe'){const hint=boardFusionHint(game,selection),p=hint?.move;if(p)requestFusion(p.source,p.target.c,p.target.r);else if(hint?.recipe){recipePreview={kind:hint.recipe.kind,rank:hint.unit.rank};pendingFusion=null;confirmMode='fusion-recipe';}}
 else if(name==='fuse-now'){const f=pendingFusion;pendingFusion=null;if(f?.bench){
   const p=game.reservePreview(f.source,f.target);
   if(p.ok&&p.type==='reserve-fusion'&&game.get(f.source)===f.sourceUnit&&game.get(f.target)===f.targetUnit){
     const result=game.mergeReserve(f.source,f.target,true);if(result.ok){pixel?.reserveMerge(f.source,f.target);notify('benchFused');}
   }
 }else if(f){const p=game.preview(f.source,f.c,f.r);if(p.ok&&p.type==='fusion'&&p.target.id===f.targetId){const result=game.place(f.source,f.c,f.r);if(result.ok)pixel?.merge(f.source,result);}}selection=null;confirmMode='';}
 else if(name==='records'){recordIndex=-1;expandedWave=-1;confirmMode='records';}
 else if(name==='back')confirmMode='';
 else if(name.startsWith('level-')){pendingLevel=Number(name.slice(6));if(LEVELS[pendingLevel]){if(game.ended)reset('run',pendingLevel);else confirmMode='switch-level';}}
 else if(name==='next-level'){if(game.stage==='win'&&game.levelIndex<LEVELS.length-1)reset('run',game.levelIndex+1);}
 else if(name.startsWith('wave-record-')){const index=Number(name.slice(12));expandedWave=expandedWave===index?-1:index;}
 else if(name.startsWith('attempt-')){recordIndex=Number(name.slice(8));expandedWave=-1;}
 else if(name==='record-current'){recordIndex=-1;expandedWave=-1;}
 else if(name==='export'){
   const data={build:pixel?'toy-rampage-alteru-20260923-r50':'toy-workshop-playtest-20260911-r8',skin:pixel?'pixel':'classic',appearance:{initial:initialAppearance,current:getAppearance(),changes:appearanceChanges},exportedAt:new Date().toISOString(),current:game.report(),attempts};
   const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='toy-workshop-playtest.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 else if(name==='hint'){lastInteraction=-9999;guideStart=performance.now();notify('replayActive');}
 else if(name==='deselect')selection=null;
 else if(['land-rotate','land-choice','land-split'].includes(name)){cancelDrag();selection=null;game[{'land-rotate':'rotateLand','land-choice':'chooseLand','land-split':'splitLand'}[name]]();lastInteraction=-9999;guideStart=performance.now();}
 else if(name==='bench-toggle'&&pixel){cancelDrag();selection=null;benchMode=benchMode==='land'?'weapons':game.get('land')?'land':'weapons';lastInteraction=-9999;guideStart=performance.now();}
 else if(name==='tutorial'||name==='run'||name==='lab')reset(name);
 else if(name.startsWith('reset-'))confirmMode=name;
 else if(name==='sell')confirmMode='sell';
 else if(name==='confirm'){if(confirmMode==='sell'){const wasPaused=game.paused;game.paused=false;game.sell(selection);game.paused=wasPaused;selection=null;confirmMode='';}else if(confirmMode==='switch-level')reset('run',pendingLevel);else reset(confirmMode==='reset-run'?'run':confirmMode==='reset-lab'?'lab':'tutorial');}
 else if(name==='cancel'){pendingFusion=null;confirmMode=confirmMode==='switch-level'?'levels':'';}
 else if(name==='expand'){if(!game.paused&&game.expand()){selection=null;}}
 else if(name==='speed'){if(!game.paused&&['wave','labwave'].includes(game.stage)&&!(game.mode==='tutorial'&&game.wave===1))speed=speed===1?2:1;}
 else if(name==='refresh'||name==='refresh-confirm'){const p=game.refresh(name==='refresh-confirm');if(!p.ok){if(p.reason==='replaceReserve')confirmMode='refresh-replace';else notify(p.reason);}else{confirmMode='';selection=null;updateUI();const supply=$('#supply');supply.classList.remove('tw__supply--changed');void supply.offsetWidth;supply.classList.add('tw__supply--changed');sound('place');}}
 else if(name==='main'){
   if(['ready','fused'].includes(game.stage)){if(!game.startWave())notify('placeFirst');else speed=1;}
   selection=null;
 }
 updateUI();
}
function drop(c,r){
 if(selection===null)return;if(requestFusion(selection,c,r))return;const p=game.place(selection,c,r);
 if(p.ok&&p.type==='swap')pixel?.swap(selection,p);
 if(p.ok&&['merge','fusion'].includes(p.type))pixel?.merge(selection,p);
 if(p.ok){selection=null;$('.tw__notice').textContent='';noticeUntil=0;if(p.type==='swap')notify('swapDone');}
 else{notify(p.reason,p);sound('invalid');}hover=null;updateUI();
}
function reservePress(target,event){
 if(typeof selection==='string'&&selection.startsWith('reserve:')&&selection!==target){dropReserve(target);return;}
 selection=target;if(event)beginDrag(event);updateUI();
}
function dropReserve(target){
 const preview=game.reservePreview(selection,target);
 if(preview.ok&&preview.type==='reserve-fusion'){
   pendingFusion={bench:true,source:selection,target,kind:preview.kind,sourceUnit:game.get(selection),targetUnit:game.get(target)};
   cancelDrag();selection=null;confirmMode='fusion-recipe';updateUI();return;
 }
 const p=game.mergeReserve(selection,target);
 if(p.ok)pixel?.reserveMerge(selection,target);
 if(p.ok){selection=null;notify('reserveMerged',{n:p.rank});}else{notify(p.reason,p);sound('invalid');}
 hover=null;clearReservePreview();updateUI();
}
function cellPress(c,r,event){
 const unit=game.at(c,r);
 if(selection!==null&&(!unit||unit.id!==selection)){drop(c,r);return;}
 if(unit){selection=unit.id;if(event)beginDrag(event,c-unit.c,r-unit.r);}else notify('choose');updateUI();
}
function beginDrag(e,offsetC=0,offsetR=0){
 pixel?.cancelSwap();
 $('.tw__notice').textContent='';noticeUntil=0;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,touch:e.pointerType==='touch',moved:false,offsetC,offsetR};$('.tw').setPointerCapture(e.pointerId);
 // Keep the same contact: never replace the shelf or insert an information panel.
}
root.addEventListener('pointerdown',e=>{
 if(drag&&e.pointerId!==drag.id)return;
 if(e.button!==0)return;const b=e.target.closest('button');if(!b||b.disabled||(!overlay.hidden&&!b.closest('.tw__overlay')))return;
 if(b.closest('.tw__modal')||b.matches('[data-audio-toggle]'))return; // Scrollable dialogs commit on click, not finger contact.
 lastInteraction=performance.now();if(b.dataset.action!=='sound')enableAudio();
 if(b.dataset.action){action(b.dataset.action);return;}
 if(game.paused||game.ended)return;
 if(b.dataset.source)reservePress(b.dataset.source,e);
 if(b.dataset.cell)cellPress(...b.dataset.cell.split(',').map(Number),e);
});
function updateDragPosition(e){
 if(!drag||e.pointerId!==drag.id)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(!drag.moved)return;
 const y=e.clientY-(pixel&&drag.touch?32:0);
 const box=canvas.getBoundingClientRect(),c=snapGridAxis(((e.clientX-box.left)/box.width*W-GX)/CELL,drag.snapC),r=snapGridAxis(((y-box.top)/box.height*H-GY)/CELL,drag.snapR),target=game.at(c,r);
 drag.snapC=c;drag.snapR=r;
 hover=target&&target.id!==selection?{c,r}:{c:c-drag.offsetC,r:r-drag.offsetR};
 clearReservePreview();
 const shelf=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-source^="reserve:"]');
 if(shelf&&typeof selection==='string'&&selection.startsWith('reserve:')){
   hover={reserve:shelf.dataset.source};const p=game.reservePreview(selection,hover.reserve);
   shelf.dataset.drop=p.ok?(p.type==='reserve-fusion'?'fusion':'merge'):'invalid';if(p.ok)shelf.dataset.nextRank=p.type==='reserve-fusion'?t('fusionAction'):String(p.rank);
 }
 const u=game.get(selection);if(u){
  const ghost=$('.tw__drag'),scale=box.width/W;
  ghost.hidden=false;ghost.style.left=(e.clientX-(drag.offsetC+.5)*CELL*scale)+'px';ghost.style.top=(y-(drag.offsetR+.5)*CELL*scale)+'px';
  const preview=hover.reserve?game.reservePreview(selection,hover.reserve):game.preview(selection,hover.c,hover.r);ghost.style.opacity=preview.ok&&preview.type!=='place'?'.25':'1';
  drawDrag(ghost.querySelector('canvas'),u.kind,u.rank,scale);
 }
}
window.addEventListener('pointermove',updateDragPosition);
window.addEventListener('pointerup',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 // Browsers may coalesce the final move. Commit at release coordinates, not stale hover.
 updateDragPosition(e);
 const moved=drag.moved;if(moved&&hover){if(hover.reserve)dropReserve(hover.reserve);else drop(hover.c,hover.r);}
 if(moved)selection=null;cancelDrag();lastInteraction=performance.now();updateUI();
});
window.addEventListener('pointercancel',()=>{cancelDrag();selection=null;updateUI();});
window.addEventListener('resize',()=>{if(drag){cancelDrag();selection=null;updateUI();}});
root.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled||(!overlay.hidden&&!b.closest('.tw__overlay'))||(e.detail!==0&&!b.closest('.tw__modal')))return;
 if(b.matches('[data-audio-toggle]'))return;
 lastInteraction=performance.now();if(b.dataset.action!=='sound')enableAudio();
 if(b.dataset.action)action(b.dataset.action);else if(!game.paused&&!game.ended&&overlay.hidden){if(b.dataset.source)reservePress(b.dataset.source);if(b.dataset.cell)cellPress(...b.dataset.cell.split(',').map(Number));updateUI();}
});
window.addEventListener('keydown',e=>{
 if(recoveryPending&&e.key==='Escape'){e.preventDefault();return;}
 if(e.key==='Escape'){if(confirmMode)confirmMode=confirmMode==='switch-level'?'levels':'';else if(game.paused)game.paused=false;else if(selection!==null){cancelDrag();selection=null;}else pause();updateUI();}
 if(e.key==='Tab'&&!overlay.hidden){const list=[...overlay.querySelectorAll('button'),...root.querySelectorAll('[data-audio-toggle]')],first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
root.addEventListener('dblclick',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
function supplyGuide(dest){
 const unit=game.get(dest.source),source=typeof dest.source==='number'?$('[data-cell="'+unit.c+','+unit.r+'"]'):$('[data-source="'+dest.source+'"]');
 if(pixel&&!source){const toggle=$('[data-action="bench-toggle"]');if(toggle&&!toggle.disabled)return{source:toggle,target:toggle,tap:true};}
 if(dest.type==='reserve-fusion')return{source,target:$('[data-source="'+dest.target+'"]'),unit,dest:null};
 return{source,target:$('[data-cell="'+dest.c+','+dest.r+'"]'),unit:game.get(dest.source),dest};
}
function guidePlan(){
 if(pixel&&benchMode==='land'&&game.get('land')){const dest=game.landMove();if(dest)return supplyGuide(dest);const action=game.landAdvice(),button=action&&$(`[data-action="${action}"]`);return button?{source:button,target:button,tap:true}:null;}
 if(game.stage==='ready'){
   const hint=benchFusionHint(game,selection);
   if(hint){const dest=hint.move||game.landMove();return dest?supplyGuide(dest):null;}
 }
 if(game.stage==='ready'){
   const kit=game.supplyLog.find(x=>x.route),recipe=kit&&fusionRecipe(kit.route);
   if(recipe&&!game.units.some(u=>u.kind===recipe.kind)){
     const fusion=game.fusionMove(recipe.kind);if(fusion)return supplyGuide({...fusion,c:fusion.target.c,r:fusion.target.r});
     const i=game.reserve.findIndex(u=>u?.kind===recipe.anchor&&u.rank===2);
     if(i>=0)for(let r=0;r<game.rows;r++)for(let c=0;c<COLS;c++){
       const p=game.preview('reserve:'+i,c,r),[w,h]=recipe.footprint;
       const free=Array.from({length:w*h},(_,j)=>[c+j%w,r+Math.floor(j/w)]).every(([x,y])=>game.hasCell(x,y)&&!game.at(x,y));
       if(p.ok&&p.type==='place'&&free)return supplyGuide({source:'reserve:'+i,...p});
     }
   }
 }
 if(game.stage==='ready'&&game.lesson==='refresh'&&!(pixel&&benchMode==='land'))return{source:$('[data-action="refresh"]'),target:$('[data-action="refresh"]'),tap:true};
 if(['expand','ready'].includes(game.stage)){
   const dest=(pixel&&benchMode==='land'?null:game.stage==='ready'?newUnitMove():null)||game.landMove();
   if(dest)return supplyGuide(dest);
   if(benchMode==='land'){const action=game.landAdvice(),button=action&&$(`[data-action="${action}"]`);if(button)return{source:button,target:button,tap:true};}
 }
 if(game.stage==='ready'&&game.lesson==='place'){
   const dest=game.reserveMove();if(!dest)return;
   return supplyGuide(dest);
 }
 let src='tray',dest;
 if(game.stage==='second'){const u=game.units.find(u=>u.kind==='spring'&&u.rank===1);if(u)dest={c:u.c,r:u.r,kind:u.kind};}
 else if(game.stage==='merge'||game.stage==='fusion'){
   const u=game.units[0],other=game.units[1];if(!u||!other)return;src=u.id;dest={c:other.c,r:other.r,kind:other.kind};
 }else if(game.stage==='place'||game.stage==='rail'||game.stage==='fused'){
   outer:for(let r=0;r<game.rows;r++)for(let c=0;c<COLS;c++){const p=game.preview('tray',c,r);if(p.ok){dest={c:p.c,r:p.r,kind:p.kind};break outer;}}
 }else return;
 if(!dest)return;const u=game.get(src),source=src==='tray'?$('[data-source="tray"]'):$('[data-cell="'+u.c+','+u.r+'"]');
 return{source,target:$('[data-cell="'+dest.c+','+dest.r+'"]'),unit:u,dest};
}
function drawGuide(now){
 if(guideStage!==game.stage+game.lesson){guideStage=game.stage+game.lesson;guideStart=now;lastInteraction=-9999;}
 const p=guidePlan();
 if(!p||!p.source||!p.target||drag||game.paused||!overlay.hidden||now-lastInteraction<3000){guide.hidden=true;return null;}
 const a=p.source.getBoundingClientRect(),b=p.target.getBoundingClientRect();
 const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
 const destination=p.dest?{...p.dest,kind:p.dest.kind||p.unit?.kind}:null;
 if(sy<0||sy>innerHeight||ty<0||ty>innerHeight){guide.hidden=true;return destination;}
 guide.hidden=false;guide.classList.toggle('tw__guide--reduced',reduced);guide.classList.toggle('tw__guide--tap',Boolean(p.tap));
 const path=guide.querySelector('path');path.setAttribute('d',`M ${sx} ${sy} Q ${(sx+tx)/2-24} ${(sy+ty)/2} ${tx} ${ty}`);
 const source=$('.tw__guide-source'),target=$('.tw__guide-target');source.style.left=sx+'px';source.style.top=sy+'px';source.textContent=t(p.tap?'tap':'source');target.style.left=tx+'px';target.style.top=ty+'px';target.textContent=p.tap?'':t('target');
 const phase=((now-guideStart)%2800)/2800,progress=Math.min(1,Math.max(0,(phase-.18)/.48)),ease=progress*progress*(3-2*progress),handEl=$('.tw__guide-hand');
 handEl.style.left=Math.round(sx+(tx-sx)*ease)+'px';handEl.style.top=Math.round(sy+(ty-sy)*ease)+'px';handEl.style.opacity=phase>.86?String((1-phase)/.14):'1';
 const gc=handEl.querySelector('canvas');gc.hidden=!p.unit||phase<.18||phase>.77;
 if(p.unit){const scale=canvas.getBoundingClientRect().width/W,k=p.unit.kind+p.unit.rank+scale;
  if(ghostKey!==k){drawDrag(gc,p.unit.kind,p.unit.rank,scale);gc.style.left=((pixel?20:14)-CELL*scale/2)+'px';gc.style.top=((pixel?4:6)-CELL*scale/2)+'px';ghostKey=k;}
 }
 return destination;
}
let last=performance.now();
function frame(now){
 const dt=Math.min((now-last)/1000,.05);last=now;
 if(confirmMode||recoveryPending)simulation.reset();else simulation.advance(game,dt,speed);
 if(now-lastSave>=500){lastSave=now;persistRun();}
 if(game.choices.length&&drag){cancelDrag();selection=null;}
 for(const event of game.events.splice(0)){sound(event);if(event==='reward')notify('rewardShort');}
 if(noticeUntil&&now>noticeUntil){$('.tw__notice').textContent='';noticeUntil=0;}
 updateUI();const target=drawGuide(now);draw(canvas,game,selection,hover,reduced,target,Boolean(confirmMode)||game.paused);requestAnimationFrame(frame);
}
pixel?.mount(root,game);
updateUI();requestAnimationFrame(frame);
if(['invalid','unavailable'].includes(saved.status))notify(saved.status==='invalid'?'saveInvalid':'saveUnavailable');
}
boot().catch(error=>{console.error(error);const app=document.querySelector('#app');app.textContent=t('loadingError');});

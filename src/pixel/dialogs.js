import {locale,pick} from './copy.js';
import {CAST_POOLS,createCastPicker} from './dialog-cast.js';
const nextCast=createCastPicker();
let root=new URL('../ui/dialog-v1/',document.baseURI);
export function setDialogAssetRoot(value){root=new URL(value,document.baseURI);}
export const dialogAsset=file=>new URL(file,root).href;
const variants=['objects','character','cast'];
const chooseVariant=v=>variants.includes(v)?v:'cast';
let illustration=chooseVariant(new URLSearchParams(location.search).get('illustrations'));
const heroAsset=(kind,variant=illustration,cast=kind)=>dialogAsset(variant==='objects'?kind+'.png':`../dialog-${variant==='cast'?'cast':'character'}-v1/${variant==='cast'?cast:kind}.png`);
const titleFile=(kind,lang)=>`../dialog-titles-v2/title-${kind}-${lang}.png`;
export const illustrationControls=()=>`<div class="px-illustration-choice" role="group" aria-label="${pick(['插图对比','Illustration comparison'])}"><span>${pick(['插图对比','Illustrations'])}</span>${[['objects','物件版','Objects'],['character','箱子主角','Box hero'],['cast','角色群像','Cast']].map(([id,zh,en])=>`<button data-illustration-choice="${id}" aria-pressed="${illustration===id}">${pick([zh,en])}</button>`).join('')}<button data-cast-next hidden>${pick(['换个主角','Next character'])}</button></div>`;
const TITLES={win:['守住了！','VICTORY!'],lose:['防线失守','DEFEAT'],upgrade:['火力升级','POWER UP!'],pause:['休整一下','TIME OUT']};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function richDialog({kind='pause',title,body='',content='',actions='',symbol=''}={}){
 const heading=title||pick(TITLES[kind]||TITLES.pause),imageTitle=TITLES[kind],hero=['win','lose','upgrade'].includes(kind)?kind:kind==='confirm'?'upgrade':null;
 const cast=kind==='confirm'?'':nextCast(hero)||'';
 return `<section class="px-dialog px-rich-dialog px-rich-dialog--${kind}" style="--dialog-frame:url('${dialogAsset('panel.png')}')" role="region" aria-label="${escape(heading)}" tabindex="-1">
  <h2 class="px-dialog-title" aria-label="${escape(heading)}"><span>${escape(heading)}</span>${imageTitle?`<img src="${dialogAsset(titleFile(kind,locale))}" alt="" aria-hidden="true" draggable="false" data-dialog-title>`:''}</h2>
  ${hero?`<img class="px-dialog-hero" src="${kind==='confirm'?dialogAsset(hero+'.png'):heroAsset(hero,illustration,cast)}" alt="" aria-hidden="true" draggable="false" data-dialog-hero="${kind==='confirm'?'':hero}" data-cast-asset="${cast}" data-illustration="${kind==='confirm'?'objects':illustration}">`:symbol?`<div class="px-rich-dialog__emblem" aria-hidden="true">${symbol}</div>`:''}
  ${body?`<p class="px-rich-dialog__copy">${body}</p>`:''}${content}
  ${actions?`<div class="px-dialog__actions">${actions}</div>`:''}
 </section>`;
}
// Delegation includes asynchronously inserted battle overlays, not only static previews.
export function bindDialogImages(root){
 const canCycle=img=>(CAST_POOLS[img.dataset.dialogHero]?.length||0)>1;
 const sync=()=>{const available=illustration==='cast'&&[...root.querySelectorAll('[data-dialog-hero]')].some(canCycle);root.querySelectorAll('[data-cast-next]').forEach(b=>b.hidden=!available);};
 new MutationObserver(sync).observe(root,{childList:true,subtree:true});
 root.addEventListener('click',e=>{
  if(e.target.closest('[data-cast-next]')){
   if(illustration!=='cast')return;
   root.querySelectorAll('[data-dialog-hero]').forEach(img=>{if(!canCycle(img))return;img.dataset.castAsset=nextCast(img.dataset.dialogHero);img.hidden=false;img.src=heroAsset(img.dataset.dialogHero,illustration,img.dataset.castAsset);});return;
  }
  const button=e.target.closest('[data-illustration-choice]');if(!button)return;
  illustration=chooseVariant(button.dataset.illustrationChoice);
  const u=new URL(location.href);u.searchParams.set('illustrations',illustration);history.replaceState(null,'',u);
  root.querySelectorAll('[data-illustration-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.illustrationChoice===illustration)));
  // Only the image changes. Do not remount the battle or lose a pending upgrade.
  root.querySelectorAll('[data-dialog-hero]').forEach(img=>{if(!img.dataset.dialogHero)return;img.hidden=false;img.dataset.illustration=illustration;img.src=heroAsset(img.dataset.dialogHero,illustration,img.dataset.castAsset);});sync();
 });
 root.addEventListener('load',e=>{if(e.target.matches?.('[data-dialog-title]'))e.target.parentElement.dataset.loaded='true';},true);
 root.addEventListener('error',e=>{if(e.target.matches?.('[data-dialog-title]')){delete e.target.parentElement.dataset.loaded;e.target.hidden=true;}else if(e.target.matches?.('[data-dialog-hero]'))e.target.hidden=true;},true);
}
export const dialogMaterials=()=>[
 ...['win','lose','upgrade'].map(k=>({file:k+'.png',name:pick({win:['胜利插画','Victory illustration'],lose:['失败插画','Defeat illustration'],upgrade:['装配插画','Assembly illustration']}[k])})),
 {file:'panel.png',name:pick(['九宫格机械面板','Nine-slice mechanical panel'])},
 ...Object.keys(TITLES).flatMap(k=>['zh','en'].map(lang=>({file:titleFile(k,lang),name:`${TITLES[k][lang==='zh'?0:1]} · ${lang}`}))),
 ...['win','lose','upgrade'].map(k=>({file:'../dialog-character-v1/'+k+'.png',name:pick({win:['主角 · 胜利','Character · Victory'],lose:['主角 · 失败','Character · Defeat'],upgrade:['主角 · 强化','Character · Upgrade']}[k])})),
 ...['win','lose','upgrade'].map(k=>({file:'../dialog-cast-v1/'+k+'.png',name:pick({win:['弹簧炮手 · 胜利','Spring daredevil · Victory'],lose:['爆米花炮手 · 失败','Popcorn bruiser · Defeat'],upgrade:['发条技师 · 强化','Clockwork tinkerer · Upgrade']}[k])})),
 ...[['win-bubble','泡泡蛙炮手 · 胜利','Bubble frog · Victory'],['win-rail','磁轨狐炮手 · 胜利','Rail fox · Victory'],['lose-drum','鼓手浣熊 · 失败','Raccoon drummer · Defeat'],['lose-scout','甲虫侦察兵 · 失败','Beetle scout · Defeat']].map(([id,zh,en])=>({file:'../dialog-cast-v1/'+id+'.png',name:pick([zh,en])})),
];

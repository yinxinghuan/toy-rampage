import {pick} from './copy.js';
import './animation.css';
const tx=(zh,en)=>pick([zh,en]);
const base=new URL('../animation/spring-v1/',document.baseURI);
const file=name=>new URL(name,base).href;
const idle=[0,1,2,3],fire=[4,5,6,0];
export function animationExperiment(scene){return `<section class="px-animation">
 <header class="px-animation__intro"><span class="px-review-status">${tx('单武器试验 · 方向已接受','One-weapon trial · Direction accepted')}</span><h2>${tx('弹簧炮，先动起来','Spring cannon in motion')}</h2><p>${tx('只替换场上的弹簧炮。看看小尺寸动作，再往下逐帧检查。','Only the deployed spring cannon changes. Check it at game scale, then inspect the frames below.')}</p></header>
 <div class="px-animation__controls" role="group" aria-label="${tx('动画控制','Animation controls')}">
 <button data-anim="idle" disabled>${tx('播放待机','Play idle')}</button><button data-anim="fire" disabled>${tx('开火一次','Fire once')}</button><button data-anim="pause" disabled>${tx('暂停','Pause')}</button><button data-anim="static" disabled>${tx('原静态对照','Original static')}</button>
 </div><p class="px-animation__status" role="status">${tx('正在加载序列帧…','Loading frames…')}</p>
 ${scene}
 <section class="px-animation__inspection"><h3>${tx('放大检查 · 同画布，同落脚点','Magnified · Shared canvas and anchor')}</h3><div class="px-animation__compare">
 <figure><div class="px-animation__surface"><img src="${file('static.png')}" width="128" height="320" alt="${tx('原静态弹簧炮','Original static spring cannon')}"></div><figcaption>${tx('原静态','Original')}</figcaption></figure>
 <figure><div class="px-animation__surface"><canvas data-anim-preview width="128" height="320" aria-label="${tx('当前动画帧深底预览','Current frame on dark background')}"></canvas></div><figcaption>${tx('深底','Dark')}</figcaption></figure>
 <figure><div class="px-animation__surface px-animation__surface--light"><canvas data-anim-preview width="128" height="320" aria-label="${tx('当前动画帧浅底预览','Current frame on light background')}"></canvas></div><figcaption>${tx('浅底','Light')}</figcaption></figure>
 </div><h3>${tx('点击定格 · 8张独立PNG','Freeze a frame · 8 separate PNGs')}</h3><div class="px-animation__frames">${Array.from({length:8},(_,i)=>`<button data-anim-frame="${i}" disabled aria-label="${tx('第','Frame ')}${i+1}${tx('帧','')}"><img src="${file(`frame-${i}.png`)}" alt="" draggable="false"><span>${i+1}</span></button>`).join('')}</div>
 <p>${tx('底座星形和螺丝仍有轻微重绘；生成的第8帧没有完全归位，播放时改用第1帧收尾。轻微漂移已获接受，原始帧保留供对照；还未接入正式战斗。','The base star and screws still vary. Generated frame 8 did not fully settle, so playback returns to frame 1. Minor drift has been accepted for this trial; original frames stay available. Not connected to combat yet.')}</p>
 <details><summary>${tx('素材与动作参数','Assets and timing')}</summary><p>${tx('待机4帧 × 220ms；开火4帧 × 100ms。固定128×320透明画布，占格仍为1×2。没有骨骼、伤害、音效或新武器。减少动态效果时默认停止。','Idle: 4 × 220ms; firing: 4 × 100ms. Fixed 128×320 alpha canvas; footprint remains 1×2. No bones, damage, audio or new weapons. Reduced motion starts stopped.')}</p><a href="${file('sheet.png')}" download>${tx('下载序列帧图集','Download sprite sheet')}</a><a href="${file('manifest.json')}" download>${tx('下载帧清单','Download frame manifest')}</a></details>
 </section></section>`;}

export function mountAnimation(root){
 const host=root.querySelector('.px-animation');if(!host)return()=>{};
 const original=host.querySelector('.px-board [data-kind="spring"] .px-sprite'),machine=original.parentElement;
 const layer=document.createElement('canvas');layer.width=128;layer.height=320;layer.className='px-animation__actor';layer.hidden=true;layer.setAttribute('aria-hidden','true');machine.append(layer);
 const ctxs=[layer,...host.querySelectorAll('[data-anim-preview]')].map(c=>c.getContext('2d'));
 const status=host.querySelector('.px-animation__status'),abort=new AbortController(),signal=abort.signal;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let images=[],staticImage,ready=false,disposed=false,mode=reduced.matches?'pause':'idle',index=0,previous=-2,start=performance.now(),raf=0;
 function geometry(){const r=original.getBoundingClientRect(),m=machine.getBoundingClientRect();layer.style.cssText=`left:${r.left-m.left}px;top:${r.top-m.top-r.height/4}px;width:${r.width}px;height:${r.height*1.25}px`;}
 const observer=new ResizeObserver(geometry);observer.observe(machine);
 function draw(n){if(!ready)return;index=n;const image=n<0?staticImage:images[n];for(const ctx of ctxs){ctx.clearRect(0,0,128,320);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,128,320);}layer.dataset.frame=String(n);layer.hidden=n<0;original.style.visibility=n<0?'':'hidden';host.dataset.mode=mode;
  host.querySelectorAll('[data-anim-frame]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.animFrame)===n));
  host.querySelectorAll('[data-anim]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.anim===mode));
 }
 function say(){status.textContent=mode==='static'?tx('原静态对照','Original static comparison'):mode==='fire'?tx('开火 · 仅动作预览','Firing · Animation only'):mode==='idle'?tx('待机循环 · 4帧','Idle loop · 4 frames'):tx(`已定格 · 第${index+1}帧`,`Frozen · Frame ${index+1}`);}
 function setMode(next){mode=next;start=performance.now();previous=-2;if(next==='static')draw(-1);else if(next==='pause')draw(Math.max(0,index));else draw(next==='fire'?4:0);say();}
 function loop(now){if(disposed)return;raf=requestAnimationFrame(loop);if(!ready||document.hidden||!['idle','fire'].includes(mode))return;
  const step=Math.floor(Math.max(0,now-start)/(mode==='fire'?100:220));if(mode==='fire'&&step>=4){setMode(reduced.matches?'pause':'idle');return;}const n=(mode==='fire'?fire:idle)[step%4];if(n!==previous){draw(n);previous=n;}
 }
 async function load(){ready=false;status.textContent=tx('正在加载序列帧…','Loading frames…');try{
  const loaded=await Promise.all([...Array.from({length:8},(_,i)=>`frame-${i}.png`),'static.png'].map(async name=>{const img=new Image();img.src=file(name);await img.decode();return img;}));
  if(disposed)return;images=loaded.slice(0,8);staticImage=loaded[8];await original.decode();if(disposed)return;ready=true;host.dataset.ready='true';host.querySelectorAll('[data-anim],[data-anim-frame]').forEach(b=>b.disabled=false);
  host.querySelectorAll('[data-anim-frame]').forEach(b=>{if(!b.querySelector('img')){const img=images[Number(b.dataset.animFrame)].cloneNode();img.alt='';img.draggable=false;b.querySelector('.px-pending')?.replaceWith(img);}});geometry();setMode(mode);
 }catch{if(disposed)return;layer.hidden=true;original.style.visibility='';status.textContent=tx('序列帧加载失败，保留原静态。','Frames failed to load; original static retained.');const b=document.createElement('button');b.dataset.anim='retry';b.textContent=tx('重试','Retry');status.append(' ',b);host.dataset.ready='error';}}
 host.addEventListener('click',e=>{const b=e.target.closest('[data-anim],[data-anim-frame]');if(!b||b.disabled)return;if(b.dataset.anim==='retry'){load();return;}if(!ready)return;if(b.hasAttribute('data-anim-frame')){mode='pause';draw(Number(b.dataset.animFrame));say();}else setMode(b.dataset.anim);},{signal});
 document.addEventListener('visibilitychange',()=>{start=performance.now();},{signal});
 reduced.addEventListener('change',()=>{if(ready&&reduced.matches)setMode('pause');},{signal});
 // Disable preview game actions here: this page tests only sprite artwork.
 host.querySelectorAll('.px-game button').forEach(b=>{b.removeAttribute('data-action');b.disabled=true;});
 host.querySelector('.px-actions').innerHTML=`<button class="px-button px-button--gold" data-anim="fire" disabled>${tx('开火试试','Test fire')}</button><button class="px-button px-button--refresh" data-anim="static" disabled>${tx('静态','Static')}</button>`;
 load();raf=requestAnimationFrame(loop);
 return()=>{disposed=true;abort.abort();observer.disconnect();cancelAnimationFrame(raf);original.style.visibility='';layer.remove();};
}

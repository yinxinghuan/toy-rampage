import {pick} from './copy.js';import {assetFor} from './assets.js';
import {bearing,delta,turnToward,directionFrame,routeTarget} from './aim-math.js';
import './aim.css';
const tx=(zh,en)=>pick([zh,en]),kinds=['mortar','bubble','rail'];
const rootURL=new URL('../animation/aim-v1/',document.baseURI),file=(kind,name)=>new URL(`${kind}/${name}`,rootURL).href;
const positions=[[.925,.5],[.925,.945],[.5,.945],[.12,.945],[.045,.5],[.12,.047],[.5,.047],[.925,.047]];
const names=[['右','Right'],['右下','Lower right'],['下','Below'],['左下','Lower left'],['左','Left'],['左上','Upper left'],['上','Above'],['右上','Upper right']];
const muzzles={mortar:[[214,106],[166,120],[100,112],[88,124],[46,112],[91,100],[113,103],[174,100]],bubble:[[112,130],[100,145],[64,158],[32,145],[14,130],[33,121],[64,120],[95,121]],rail:[[296,125],[287,148],[192,244],[113,150],[84,131],[113,97],[192,59],[278,90]]};
export function aimExperiment(scene){return `<section class="px-aim">
 <header class="px-aim__intro"><span class="px-review-status">${tx('目标跟随 · 三种武器','Target tracking · Three weapons')}</span><h2>${tx('炮口跟着目标走','Keep the target in sight')}</h2><p>${tx('点场景或拖动发条兵，再按「试射一次」。底座与占格不变。','Tap the scene or drag the clockwork target, then test fire. Bases and footprints stay fixed.')}</p></header>
 <div class="px-aim__controls"><button data-aim="auto">${tx('自动目标','Moving target')}</button><button data-aim="clear">${tx('移除目标','Remove target')}</button><button data-aim="static" aria-pressed="false">${tx('原静态对照','Original static')}</button></div>
 <div class="px-aim__positions" role="group" aria-label="${tx('把目标放在','Place target at')}">${names.map((n,i)=>`<button data-aim-position="${i}">${pick(n)}</button>`).join('')}</div>
 <p class="px-aim__status" role="status">${tx('正在装配转向素材…','Loading directional parts…')}</p>${scene}
 <p class="px-aim__readout"></p>
 <details class="px-aim__details"><summary>${tx('查看拆分素材与实验边界','Parts and experiment limits')}</summary><p>${tx('三种武器各1张固定底座＋8张方向帧。磁轨炮加了旋转发射头，是结构候选，不是新增武器。发条鼓不瞄准；弹簧炮继续保留上一轮实验。此处只有跟随与试射弹道，不是正式战斗或新开火动画。','Each weapon uses one fixed base and eight directional frames. Rail has a candidate rotating head, not a new weapon. Drum does not aim; the spring trial is unchanged. Tracking and test trajectories only: no combat or new firing animation.')}</p>${kinds.map(id=>`<figure><h3>${pick(assetFor(id).name)}</h3><img src="${file(id,'directions.png')}" alt="${tx('八方向拆分预览','Eight-direction parts preview')}" draggable="false"><a href="${file(id,'directions.png')}" download>${tx('下载方向图集','Download directions')}</a></figure>`).join('')}</details>
 </section>`;}

export function mountAim(root){
 const host=root.querySelector('.px-aim');if(!host)return()=>{};
 const world=host.querySelector('.px-world'),view=host.querySelector('.px-game'),status=host.querySelector('.px-aim__status'),readout=host.querySelector('.px-aim__readout');
 const abort=new AbortController(),signal=abort.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 world.classList.add('px-aim-world');view.classList.add('px-game--aim');host.querySelectorAll('.px-overlay,.px-enemy,.px-xp').forEach(e=>e.remove());
 view.querySelectorAll('button').forEach(b=>{b.removeAttribute('data-action');b.disabled=true;});
 view.querySelector('.px-actions').innerHTML=`<button class="px-button px-button--gold" data-aim="fire" disabled>${tx('试射一次','Test fire')}</button><button class="px-button px-button--refresh" data-aim="pause">${tx('暂停目标','Pause target')}</button>`;
 const marker=document.createElement('button');marker.className='px-aim-target';marker.setAttribute('aria-label',tx('拖动目标，方向键微调','Drag target; arrow keys adjust'));marker.innerHTML=`<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M2 13V2h11m18 0h11v11m0 18v11H31m-18 0H2V31"/></svg><img src="${assetFor('robot').src}" alt="" draggable="false">`;world.append(marker);
 const effects=document.createElement('canvas');effects.className='px-aim-effects';effects.setAttribute('aria-hidden','true');world.append(effects);const fx=effects.getContext('2d');
 let alive=true,ready=false,isStatic=false,target=routeTarget(0),moving=!reduced.matches,progress=0,last=0,time=0,raf=0,drag=null,shots=[],hits=0,hitUntil=0,actors=[];
 function say(zh,en){status.textContent=tx(zh,en);}
 function controls(){host.querySelector('[data-aim="static"]').setAttribute('aria-pressed',String(isStatic));host.querySelector('[data-aim="auto"]').setAttribute('aria-pressed',String(moving));host.querySelector('[data-aim="pause"]').textContent=moving?tx('暂停目标','Pause target'):tx('继续目标','Move target');host.querySelector('[data-aim="fire"]').disabled=!ready||isStatic||!target;}
 function geometry(){const w=world.getBoundingClientRect();effects.width=Math.round(w.width);effects.height=Math.round(w.height);for(const a of actors){const r=a.original.getBoundingClientRect(),m=a.machine.getBoundingClientRect(),h=r.height*a.spec.size[1]/a.spec.logical[1];a.canvas.style.cssText=`left:${r.left-m.left}px;top:${r.bottom-m.top-h}px;width:${r.width}px;height:${h}px`;a.rect={x:r.left-w.left,y:r.bottom-w.top-h,w:r.width,h};a.origin={x:a.rect.x+a.spec.pivot[0]/a.spec.size[0]*r.width,y:a.rect.y+a.spec.pivot[1]/a.spec.size[1]*h};}placeMarker();}
 function placeMarker(){marker.hidden=!target;if(target){marker.style.left=`${target.x*100}%`;marker.style.top=`${target.y*100}%`;}host.dataset.hasTarget=String(!!target);}
 function choose(point){target=point;moving=false;shots=[];for(const a of actors)a.pending=false;placeMarker();controls();say(point?'目标已指定，炮口正在跟随。':'没有目标，不会试射。',point?'Target placed; weapons are tracking.':'No target; firing disabled.');}
 const observer=new ResizeObserver(geometry);observer.observe(world);
 function draw(a){a.ctx.clearRect(0,0,...a.spec.size);a.ctx.imageSmoothingEnabled=false;a.ctx.drawImage(a.base,0,0);a.ctx.drawImage(a.heads[a.dir],0,0);a.canvas.dataset.direction=String(a.dir);a.canvas.dataset.angle=a.angle.toFixed(4);}
 function fire(a){const [mx,my]=muzzles[a.id][a.dir];shots.push({id:a.id,born:time,from:{x:a.rect.x+mx/a.spec.size[0]*a.rect.w,y:a.rect.y+my/a.spec.size[1]*a.rect.h}});a.pending=false;a.canvas.dataset.shots=String(Number(a.canvas.dataset.shots||0)+1);}
 function loop(now){if(!alive)return;raf=requestAnimationFrame(loop);const dt=last?Math.min(.05,Math.max(0,(now-last)/1000)):0;last=now;if(document.hidden||!ready)return;time+=dt;
  if(target&&moving){progress+=dt/14;target=routeTarget(progress);placeMarker();}
  const w=world.getBoundingClientRect(),dest=target?{x:target.x*w.width,y:target.y*w.height}:null;
  const labels=[];
  for(const a of actors){if(dest&&!isStatic){const goal=bearing(a.origin,dest);a.angle=reduced.matches?goal:turnToward(a.angle,goal,dt);const dir=directionFrame(a.angle,a.dir);if(dir!==a.dir){a.dir=dir;draw(a);}a.canvas.dataset.angle=a.angle.toFixed(4);if(a.pending&&Math.abs(delta(a.angle,goal))<7*Math.PI/180)fire(a);}labels.push(`${pick(assetFor(a.id).name)} ${dest?pick(names[a.dir]):'—'}`);}
  const line=labels.join(' · ');if(readout.textContent!==line)readout.textContent=line;
  fx.clearRect(0,0,effects.width,effects.height);shots=shots.filter(s=>time-s.born<.4&&dest&&!isStatic);
  for(const s of shots){const p=Math.min(1,(time-s.born)/.32),x=s.from.x+(dest.x-s.from.x)*p,y=s.from.y+(dest.y-s.from.y)*p-(s.id==='mortar'?Math.sin(p*Math.PI)*w.height*.1:0);fx.fillStyle=assetFor(s.id).color;fx.strokeStyle=assetFor(s.id).color;fx.lineWidth=2;if(s.id==='rail'){fx.beginPath();fx.moveTo(s.from.x,s.from.y);fx.lineTo(x,y);fx.stroke();}else fx.fillRect(Math.round(x)-3,Math.round(y)-3,s.id==='mortar'?6:5,s.id==='mortar'?6:5);if(p===1&&!s.hit){s.hit=true;hits++;hitUntil=time+.15;host.dataset.hits=String(hits);}}
  marker.classList.toggle('is-hit',time<hitUntil);
 }
 async function load(){ready=false;host.dataset.ready='loading';controls();try{
  const loaded=await Promise.all(kinds.map(async id=>{const response=await fetch(file(id,'manifest.json'));if(!response.ok)throw Error('manifest');const spec=await response.json();const imgs=await Promise.all(['base.png',...Array.from({length:8},(_,i)=>`head-${i}.png`)].map(async name=>{const image=new Image();image.src=file(id,name);await image.decode();return image;}));return{id,spec,base:imgs[0],heads:imgs.slice(1)};}));if(!alive)return;
  for(const a of actors){a.original.style.visibility='';a.canvas.remove();}actors=[];
  for(const item of loaded){const machine=world.querySelector(`[data-kind="${item.id}"]`),original=machine.querySelector('.px-sprite');await original.decode();if(!alive)return;const canvas=document.createElement('canvas');[canvas.width,canvas.height]=item.spec.size;canvas.className='px-aim-actor';canvas.dataset.kind=item.id;canvas.setAttribute('aria-hidden','true');machine.append(canvas);const a={...item,machine,original,canvas,ctx:canvas.getContext('2d'),angle:-Math.PI/2,dir:6,pending:false};actors.push(a);original.style.visibility=isStatic?'':'hidden';canvas.hidden=isStatic;draw(a);}
  ready=true;host.dataset.ready='true';geometry();controls();say('点选或拖动目标，再试射。','Place or drag the target, then test fire.');
 }catch{if(!alive)return;for(const a of actors){a.canvas.hidden=true;a.original.style.visibility='';}ready=false;host.dataset.ready='error';controls();say('转向素材加载失败，保留原静态。','Directional assets failed; original static retained.');const b=document.createElement('button');b.dataset.aim='retry';b.textContent=tx('重试','Retry');status.append(' ',b);}}
 host.addEventListener('click',e=>{const b=e.target.closest('[data-aim],[data-aim-position]');if(!b||b.disabled)return;
  if(b.dataset.aimPosition!==undefined){choose({x:positions[Number(b.dataset.aimPosition)][0],y:positions[Number(b.dataset.aimPosition)][1]});return;}
  const action=b.dataset.aim;if(action==='retry'){load();return;}if(action==='clear'){choose(null);return;}if(action==='auto'){target=routeTarget(progress);moving=true;placeMarker();}if(action==='pause'){if(!target)target=routeTarget(progress);moving=!moving;placeMarker();}if(action==='static'){isStatic=!isStatic;shots=[];for(const a of actors){a.original.style.visibility=isStatic?'':'hidden';a.canvas.hidden=isStatic;a.pending=false;}}if(action==='fire'&&ready&&target&&!isStatic){for(const a of actors)a.pending=true;say('炮口对准后试射，不计算伤害。','Test fire after aiming; no damage simulation.');}controls();},{signal});
 function pointer(e){const r=world.getBoundingClientRect();choose({x:Math.max(.03,Math.min(.97,(e.clientX-r.left)/r.width)),y:Math.max(.025,Math.min(.97,(e.clientY-r.top)/r.height))});}
 world.addEventListener('pointerdown',e=>{if(e.button!==0||drag!==null)return;drag=e.pointerId;world.setPointerCapture(drag);pointer(e);},{signal});world.addEventListener('pointermove',e=>{if(e.pointerId===drag)pointer(e);},{signal});world.addEventListener('pointerup',()=>{drag=null;},{signal});world.addEventListener('pointercancel',()=>{drag=null;},{signal});
 marker.addEventListener('keydown',e=>{const d={ArrowLeft:[-.05,0],ArrowRight:[.05,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]}[e.key];if(d&&target){e.preventDefault();choose({x:Math.max(.03,Math.min(.97,target.x+d[0])),y:Math.max(.025,Math.min(.97,target.y+d[1]))});}},{signal});
 document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){shots=[];for(const a of actors)a.pending=false;}},{signal});window.addEventListener('blur',()=>{drag=null;moving=false;controls();},{signal});reduced.addEventListener('change',()=>{if(reduced.matches){moving=false;controls();}},{signal});
 placeMarker();load();raf=requestAnimationFrame(loop);return()=>{alive=false;abort.abort();observer.disconnect();cancelAnimationFrame(raf);for(const a of actors){a.original.style.visibility='';a.canvas.remove();}marker.remove();effects.remove();};
}

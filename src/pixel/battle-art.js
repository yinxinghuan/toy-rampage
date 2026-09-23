import {WEAPONS,ENEMIES,FOOTPRINT} from './battle-model.js';
import {pointAt,center,STATS,COLS,ROWS} from '../engine.js';
import {bearing,directionFrame,turnToward} from './aim-math.js';
import {BattlePresentation,PRESENTATION_LAG,PROJECTILES,flightTime,projectilePoint} from './battle-presentation.js';
import {supportLinks} from './battle-support.js';
import {pick} from './copy.js';
import {IDLE_DETAIL_KINDS,idlePose,drawIdleDetail} from './idle-motion.js';
import {sceneDepth} from './scene-depth.js';
import {EXPERIMENT_SPECS,drawExperiment} from './experimental-art.js';
const root=new URL('../animation/',document.baseURI);
const img=async p=>{const i=new Image();i.src=p;await i.decode();return i;};
const json=async p=>{const r=await fetch(p);if(!r.ok)throw Error('direction manifest');return r.json();};
export const BATTLE_ART_TASK_COUNT=WEAPONS.length+ENEMIES.length+WEAPONS.length-3+4*10+8+1+PROJECTILES.length+IDLE_DETAIL_KINDS.length;
export async function loadBattleArt(assetRoot=root,{image=img,readJSON=json,requireIdle=false}={}){
 const file=p=>new URL(p,assetRoot).href;
 const art={fx:{},enemy:{},upgrade:{},aim:{},static:{},spring:[],drum:null,projectile:{},idle:{},idleMissing:[]};
 await Promise.all([
  ...WEAPONS.map(async k=>{art.fx[k]=await image(file(`battle-v1/fx/${({rivet:'spring',arc:'rail'})[k]||k}/sheet.png`));}),
  ...ENEMIES.map(async k=>{art.enemy[k]=await image(file(`battle-v1/enemy/${({plated:'armor',brood:'swarm',mite:'swarm'})[k]||k}/sheet.png`));}),
  ...WEAPONS.filter(k=>!['fusion','rivet','arc'].includes(k)).map(async k=>{art.upgrade[k]=await image(file(`battle-v1/upgrade/${k}/sheet.png`));}),
  ...['rail','mortar','bubble','fusion'].map(async k=>{const path=k==='fusion'?'battle-v1/aim/fusion':'aim-v1/'+k;const spec=await readJSON(file(path+'/manifest.json'));art.aim[k]={spec,base:await image(file(path+'/base.png')),heads:await Promise.all(Array.from({length:8},(_,i)=>image(file(path+`/head-${i}.png`))))};}),
  Promise.all(Array.from({length:8},(_,i)=>image(file(`spring-v1/frame-${i}.png`)))).then(a=>art.spring=a),
  image(file('battle-v1/motion/drum/sheet.png')).then(a=>art.drum=a),
  ...PROJECTILES.map(async k=>{art.projectile[k]=await image(file(`projectile-v1/${k==='rivet'?'spring':k==='frost'?'bubble':k}/sheet.png`));}),
  ...IDLE_DETAIL_KINDS.map(async k=>{try{art.idle[k]=await image(file(`idle-v1/${k}/sheet.png`));}catch(error){if(requireIdle)throw error;art.idleMissing.push(k);}}),
 ]);art.fx.frost=art.fx.bubble;art.fx.storm=art.fx.rail;return art;
}
export const EFFECT_TIME={spring:.2,rail:.24,mortar:.36,bubble:.3,drum:.4,fusion:.42};
const COLORS={spring:'#ffd374',rail:'#78dfff',mortar:'#ff9679',bubble:'#8fefcb',drum:'#d1a4ff',fusion:'#ffe69b'};
Object.assign(EFFECT_TIME,{rivet:.2,arc:.3});Object.assign(COLORS,{rivet:'#efbd87',arc:'#d1b8ff'});
Object.assign(EFFECT_TIME,{frost:.36,storm:.34});Object.assign(COLORS,{frost:'#bbf7ff',storm:'#e6bbff'});
const MUZZLES={mortar:[[214,106],[166,120],[100,112],[88,124],[46,112],[91,100],[113,103],[174,100]],bubble:[[112,130],[100,145],[64,158],[32,145],[14,130],[33,121],[64,120],[95,121]],rail:[[296,125],[287,148],[192,244],[113,150],[84,131],[113,97],[192,59],[278,90]],fusion:[[260,158],[247,178],[192,188],[143,178],[124,158],[139,132],[192,104],[246,132]]};
MUZZLES.rivet=MUZZLES.rail.map(([x,y])=>[x*.75-48,y*.75+90]);
export class BattleArt {
 constructor(host,game,art,reduced,onSound){this.host=host;this.game=game;this.art=art;this.reduced=reduced;this.sound=onSound;this.world=host.querySelector('.px-world');this.board=host.querySelector('.px-board');this.canvas=document.createElement('canvas');this.canvas.className='px-battle-fx';this.canvas.setAttribute('aria-hidden','true');this.enemyCanvas=document.createElement('canvas');this.enemyCanvas.className='px-battle-enemies';this.enemyCanvas.setAttribute('aria-hidden','true');this.world.append(this.enemyCanvas,this.canvas);this.ctx=this.canvas.getContext('2d');this.enemyCtx=this.enemyCanvas.getContext('2d');this.actors=[];this.fx=[];this.seen=new WeakSet();this.presentation=new BattlePresentation(game);this.time=0;this.shotCounts={};this.frames={};this.build();this.observer=new ResizeObserver(()=>this.geometry());this.observer.observe(this.world);}
 build(){this.board.style.gridTemplateColumns=`repeat(${COLS},1fr)`;this.board.style.gridTemplateRows=`repeat(${ROWS},1fr)`;
  if(!this.world.classList.contains('tw__board')){this.board.querySelectorAll('.px-cell').forEach(e=>e.remove());this.board.insertAdjacentHTML('afterbegin',this.game.board.map(open=>`<div class="px-cell ${open?'':'px-cell--locked'}"></div>`).join(''));}
  this.board.querySelectorAll('.px-machine').forEach(e=>e.remove());this.actors=this.game.units.map(u=>{
  const machine=document.createElement('div');machine.className='px-machine';machine.dataset.kind=u.kind;const[w,h]=FOOTPRINT[u.kind];machine.dataset.columns=w;machine.style.cssText=`--x:${u.c};--y:${u.r};--w:${w};--h:${h};--identity:${COLORS[u.kind]};left:${u.c/COLS*100}%;top:${u.r/ROWS*100}%;width:${w/COLS*100}%;height:${h/ROWS*100}%`;
  const canvas=document.createElement('canvas');canvas.className='px-battle-actor';canvas.setAttribute('aria-hidden','true');const spec=EXPERIMENT_SPECS[u.kind]||this.art.aim[u.kind]?.spec||{size:u.kind==='spring'?[128,320]:[128,160],logical:u.kind==='spring'?[128,256]:[128,128]};[canvas.width,canvas.height]=spec.size;
  const rank=document.createElement('span');rank.className='px-rank';rank.textContent=u.rank;
  const buff=document.createElement('span');buff.className='px-battle-buff';buff.hidden=true;buff.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8 8 3l5 5M3 13l5-5 5 5"/></svg><b></b>';
  machine.append(canvas,rank,buff);this.board.append(machine);return{u,machine,canvas,ctx:canvas.getContext('2d'),spec,dir:6,angle:-Math.PI/2,fired:-10,beat:-10,rank,buff};
 });this.geometry();}
 geometry(){const r=this.world.getBoundingClientRect();this.width=r.width;this.height=r.height;const d=Math.min(2,devicePixelRatio||1),bleed=Math.ceil(r.width*.2+12);this.paintPadding=bleed;for(const canvas of [this.canvas,this.enemyCanvas]){canvas.width=Math.round((r.width+2*bleed)*d);canvas.height=Math.round((r.height+2*bleed)*d);canvas.style.cssText=`left:${-bleed}px;top:${-bleed}px;width:${r.width+2*bleed}px;height:${r.height+2*bleed}px`;canvas.getContext('2d').setTransform(d,0,0,d,bleed*d,bleed*d);}for(const a of this.actors){const m=a.machine.getBoundingClientRect(),pad=parseFloat(getComputedStyle(a.machine).paddingLeft),w=m.width-pad*2,h=m.height-pad*2,scale=Math.min(w/a.spec.logical[0],h/a.spec.logical[1]);a.rect={x:m.left-r.left+(m.width-a.spec.size[0]*scale)/2,y:m.bottom-r.top-pad-a.spec.size[1]*scale,w:a.spec.size[0]*scale,h:a.spec.size[1]*scale};a.canvas.style.cssText=`left:${a.rect.x-(m.left-r.left)}px;top:${a.rect.y-(m.top-r.top)}px;width:${a.rect.w}px;height:${a.rect.h}px`;a.origin={x:m.left-r.left+m.width/2,y:m.top-r.top+m.height/2};a.foot={x:m.left-r.left,y:m.top-r.top,w:m.width,h:m.height};a.machine.style.zIndex=String(sceneDepth(m.bottom-r.top-pad,this.height));a.machine.dataset.ground=String(m.bottom-r.top-pad);a.port={x:m.right-r.left-10,y:m.bottom-r.top-10};}this.fx=[];}
 point(x,y){return{x:(.155+(x-26)/308*(.925-.155))*this.width,y:(.047+(y-24)/322*(.945-.047))*this.height};}
 atlas(ctx,image,frame,w,h,x,y,dw,dh){ctx.imageSmoothingEnabled=false;ctx.drawImage(image,frame%3*w,Math.floor(frame/3)*h,w,h,Math.round(x),Math.round(y),Math.round(dw),Math.round(dh));}
 add(effect){this.fx.push({born:this.time,...effect});if(this.fx.length>48)this.fx.splice(0,this.fx.length-48);}
 settled(){return this.presentation.settled(this.time);}
 view(){return this.presentation.view(this.time);}
 viewEnemies(){const result=this.view().enemies.slice(),ids=new Set(result.map(e=>e.id));
  // A spawn killed on its very first tick has no previous live snapshot. Keep its
  // actual pre-hit pose visible during the projectile flight, never after contact.
  for(const fx of this.fx)if(fx.type==='shot'&&this.time>=fx.born&&this.time<fx.born+(fx.flight||0))for(const hit of fx.impacts||[])if(hit.before&&!ids.has(hit.id)){result.push(hit.before);ids.add(hit.id);}
  return result;
 }
 upgrade(){for(const a of this.actors){a.rank.textContent=a.u.rank;this.add({kind:'drum',type:'upgrade',point:a.origin,rank:a.u.rank});}this.sound?.('upgrade');}
 capture(){
  this.presentation.capture(this.game,this.time);
  for(const effect of this.game.effects){if(this.seen.has(effect)||effect.type!=='shot'||!effect.kind)continue;this.seen.add(effect);const a=this.actors.find(a=>a.u.id===effect.sourceId);if(!a)continue;
   const target=this.point(effect.tx,effect.ty);target.y-=this.width*.035;a.angle=bearing(a.origin,target);a.dir=directionFrame(a.angle);this.shotCounts[effect.kind]=(this.shotCounts[effect.kind]||0)+1;
   const m=MUZZLES[effect.kind]?.[a.dir];const from=m?{x:a.rect.x+m[0]/a.spec.size[0]*a.rect.w,y:a.rect.y+m[1]/a.spec.size[1]*a.rect.h}:effect.kind==='spring'?{x:a.rect.x+a.rect.w/2,y:a.rect.y+a.rect.h*.2}:a.origin;
   const flight=flightTime(effect.kind,Math.hypot(target.x-from.x,target.y-from.y),this.width),contact=this.time+PRESENTATION_LAG,born=contact-flight;a.fired=born;
   this.add({type:'shot',kind:effect.kind,from,point:target,rank:effect.rank,impacts:effect.impacts,flight,born});
   if(effect.kind==='arc')this.host.dataset.chainTargets=String(effect.impacts.length);
   const dead=new Set();for(const hit of effect.impacts||[])if(hit.hp<=0&&!dead.has(hit.id)){dead.add(hit.id);this.add({type:'defeat',kind:hit.kind,point:this.point(hit.x,hit.y),rank:1,born:contact});}
   const link=supportLinks(this.game).find(l=>l.targetId===a.u.id);
   if(link){const drum=this.actors.find(d=>d.u.id===link.sourceId);a.beat=born;if(born-drum.fired>.6){this.add({type:'support',kind:'drum',point:drum.origin,rank:drum.u.rank,born});drum.fired=born;}drum.beat=born;}
  }

 }
 draw(dt){this.time+=dt;const ctx=this.ctx,pad=this.paintPadding;ctx.clearRect(-pad,-pad,this.width+2*pad,this.height+2*pad);ctx.imageSmoothingEnabled=false;this.enemyCtx.clearRect(-pad,-pad,this.width+2*pad,this.height+2*pad);
  this.host.dataset.breached=String(this.viewEnemies().filter(e=>e.shredLeft>0).length);
  for(const a of this.actors){const alive=this.game.enemies.filter(e=>e.hp>0).sort((a,b)=>b.d-a.d),[x,y]=center(a.u),target=alive.find(e=>Math.hypot(pointAt(e.d)[0]-x,pointAt(e.d)[1]-y)<=STATS[a.u.kind].range);
   if(target&&this.time-a.fired>.08){const goal=bearing(a.origin,this.point(...pointAt(target.d)));a.angle=this.reduced()?goal:turnToward(a.angle,goal,dt);a.dir=directionFrame(a.angle,a.dir);}
   const c=a.ctx,[w,h]=a.spec.size;c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;const age=this.time-a.fired;
   const idle=idlePose(a.u.kind,this.time,a.u.id,{enabled:this.idleEnabled!==false,reduced:this.reduced(),suspended:this.game.paused||!!this.game.choices.length||this.game.ended,shotAge:age});
   let detail=false;
   if(EXPERIMENT_SPECS[a.u.kind]){drawExperiment(c,a.u.kind,a.u.rank,this.art,a.dir,this.time,dt>0&&!this.reduced());detail=dt>0&&!this.reduced();}
   else if(this.art.aim[a.u.kind]){const aim=this.art.aim[a.u.kind];c.drawImage(aim.base,0,0);detail=drawIdleDetail(c,a.u.kind,this.art.idle?.[a.u.kind],idle);c.drawImage(aim.heads[a.dir],0,0);}
   else if(a.u.kind==='spring'){const f=this.reduced()?0:age>=0&&age<.4?[4,5,6,0][Math.floor(age/.1)]:idle.frame;c.drawImage(this.art.spring[f],0,0);a.canvas.dataset.frame=f;detail=idle.visible;}
   else {const f=this.reduced()?0:age>=0&&age<.42?Math.min(5,Math.floor(age/.07)):idle.frame;this.atlas(c,this.art.drum,f,128,160,0,0,w,h);a.canvas.dataset.frame=f;detail=idle.visible;}
   a.canvas.dataset.idleFrame=detail?String(idle.frame):'-1';a.canvas.dataset.motion=age>=0&&age<.6?'attack':detail?'idle':'rest';
   if(a.u.rank>1&&this.art.upgrade[a.u.kind]){const image=this.art.upgrade[a.u.kind],sw=image.width/3,sh=image.height;c.drawImage(image,(a.u.rank-2)*sw,0,sw,sh,0,h-a.spec.logical[1],a.spec.logical[0],a.spec.logical[1]);}
   a.canvas.dataset.direction=a.dir;a.canvas.dataset.rank=a.u.rank;a.rank.textContent=a.u.rank;
  }
  this.drawSupport();
  // Each enemy shares the weapons' ground-contact stacking context.
  this.enemyActors??=new Map();const visible=this.viewEnemies(),ids=new Set(visible.map(e=>e.id));
  for(const[id,node]of this.enemyActors)if(!ids.has(id)){node.remove();this.enemyActors.delete(id);}
  {
  for(const e of this.viewEnemies()){const p=this.point(...pointAt(e.d)),size=this.width*(this.enemyScale??1)*({patrol:.105,runner:.115,swarm:.08,armor:.135,boss:.2,plated:.15,brood:.12,mite:.065}[e.kind]||.1),frame=this.reduced()?0:Math.floor(e.d/(e.kind==='boss'?9:e.kind==='runner'?5:7))%6;this.frames[e.kind]=frame;
   let node=this.enemyActors.get(e.id);if(!node){node=document.createElement('canvas');node.className='px-depth-enemy';node.setAttribute('aria-hidden','true');node.dataset.enemyId=e.id;this.world.append(node);this.enemyActors.set(e.id,node);}
   const dpr=Math.min(2,devicePixelRatio||1),left=p.x-size*.85,top=p.y-size*1.3,width=size*1.7,height=size*1.65;
   const cw=Math.ceil(width*dpr),ch=Math.ceil(height*dpr);if(node.width!==cw||node.height!==ch){node.width=cw;node.height=ch;}
   node.style.cssText=`left:${left}px;top:${top}px;width:${width}px;height:${height}px;z-index:${sceneDepth(p.y,this.height,true)}`;
   node.dataset.ground=String(p.y);const ctx=node.getContext('2d');ctx.setTransform(cw/width,0,0,ch/height,-left*cw/width,-top*ch/height);ctx.clearRect(left,top,width,height);ctx.imageSmoothingEnabled=false;
   ctx.save();ctx.translate(p.x,p.y);if(e.d>630)ctx.scale(-1,1);this.atlas(ctx,this.art.enemy[e.kind],frame,96,96,-size/2,-size*.82,size,size);ctx.restore();
   const bw=Math.max(16,size*.7);ctx.fillStyle='#241e3e';ctx.fillRect(p.x-bw/2-1,p.y-size*.87-5,bw+2,5);ctx.fillStyle=e.kind==='boss'?'#ffbe69':'#add9a4';ctx.fillRect(p.x-bw/2,p.y-size*.87-4,bw*Math.max(0,e.hp/e.maxHp),3);
   if(e.slowLeft>0){ctx.strokeStyle='#9affd7';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-size*.27,size*.57,size*.6,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#c6ffe2';ctx.fillRect(p.x-3,p.y+size*.2,6,3);}
   if(e.kind==='plated'||e.shredLeft>0){const xx=p.x-size*.55,yy=p.y-size*.65;ctx.strokeStyle=e.shredLeft>0?'#ffcb85':'#b9d6e3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+9,yy);ctx.lineTo(xx+9,yy+8);ctx.lineTo(xx+4,yy+13);ctx.lineTo(xx,yy+8);ctx.closePath();ctx.stroke();if(e.shredLeft>0){ctx.beginPath();ctx.moveTo(xx+6,yy);ctx.lineTo(xx+3,yy+5);ctx.lineTo(xx+7,yy+7);ctx.lineTo(xx+4,yy+13);ctx.stroke();ctx.fillStyle='#ffcb85';ctx.fillRect(xx,yy+16,10*Math.min(1,e.shredLeft/3),2);}}
   if(e.kind==='brood'){ctx.fillStyle='#f1cb88';for(const dx of [-5,3])ctx.fillRect(p.x+dx,p.y-5,4,5);}
  }
  }
  this.fx=this.fx.filter(e=>this.time-e.born<(e.flight||0)+(e.type==='defeat'?.28:EFFECT_TIME[e.kind]||.4));
  const flying=[];
  for(const e of this.fx){const age=this.time-e.born;if(age<0)continue;
   if(!e.sounded&&(e.type==='shot'||e.type==='support')){this.sound?.(e.kind);e.sounded=true;}
   if(e.type==='shot'&&e.flight&&age>=e.flight&&!e.impactSounded){this.sound?.(e.kind,'impact');e.impactSounded=true;}
   if(e.flight&&age<e.flight){const progress=age/e.flight,q=projectilePoint(e.from,e.point,progress,e.kind,this.width,this.reduced()),size=({spring:28,mortar:36,bubble:38,rivet:20,frost:44}[e.kind]+2*(e.rank-1))*this.width/400,frame=this.reduced()?0:Math.floor(age/.05)%4;
    if(!this.reduced())for(let n=1;n<=2;n++){const tail=projectilePoint(e.from,e.point,Math.max(0,progress-n*.09),e.kind,this.width,false);this.ctx.fillStyle=n===1?COLORS[e.kind]:'#f5e9c080';this.ctx.fillRect(Math.round(tail.x)-1,Math.round(tail.y)-1,2,2);}
    if(e.kind==='rivet'){ctx.save();ctx.translate(Math.round(q.x),Math.round(q.y));ctx.rotate(Math.atan2(e.point.y-e.from.y,e.point.x-e.from.x));ctx.fillStyle='#33243d';ctx.fillRect(-size/2,-3,size,6);ctx.fillStyle='#e6e7da';ctx.fillRect(-size/2+2,-1,size-3,2);ctx.fillStyle='#eabd7f';ctx.fillRect(-size/2,-4,3,8);ctx.restore();}
    else ctx.drawImage(this.art.projectile[e.kind],frame%2*64,Math.floor(frame/2)*64,64,64,Math.round(q.x-size/2),Math.round(q.y-size/2),Math.round(size),Math.round(size));
    if(age<.065)this.atlas(ctx,this.art.fx[e.kind],0,128,128,e.from.x-8,e.from.y-8,16,16);
    flying.push({kind:e.kind,x:q.x,y:q.y,progress});continue;
   }
   const life=e.type==='defeat'?.28:EFFECT_TIME[e.kind],p=Math.max(0,Math.min(.999,(age-(e.flight||0))/life));
   if(e.type==='defeat'){ctx.globalAlpha=1-p;ctx.fillStyle='#edddb7';for(let n=0;n<5;n++){const t=n*Math.PI*2/5,r=4+p*14;ctx.fillRect(e.point.x+Math.cos(t)*r,e.point.y+Math.sin(t)*r,3,3);}ctx.globalAlpha=1;continue;}
   const frame=this.reduced()?2:Math.min(5,Math.floor(p*6)),radius=({spring:38,rail:43,mortar:96,bubble:62,drum:75,fusion:110,rivet:30,arc:42,frost:100,storm:50}[e.kind])*(1+.12*(e.rank-1))*this.width/400;
   if(e.type==='shot'){
    if(['arc','storm'].includes(e.kind)&&p<.7){let from=e.from;ctx.strokeStyle=COLORS[e.kind];ctx.lineWidth=e.kind==='storm'?3:2;for(const hit of e.impacts||[]){const to=this.point(hit.x,hit.y);ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo((from.x+to.x)/2+4,(from.y+to.y)/2-4);ctx.lineTo(to.x,to.y);ctx.stroke();from=to;}}
    if(!['arc','storm'].includes(e.kind)&&!e.flight&&p<.5){ctx.strokeStyle=COLORS[e.kind];ctx.lineWidth=e.kind==='fusion'?5:3;ctx.globalAlpha=1-p*1.5;ctx.beginPath();ctx.moveTo(e.from.x,e.from.y);ctx.lineTo(e.point.x,e.point.y);ctx.stroke();ctx.globalAlpha=1;this.atlas(ctx,this.art.fx[e.kind],Math.min(frame,2),128,128,e.from.x-radius*.2,e.from.y-radius*.2,radius*.4,radius*.4);}
    this.atlas(ctx,this.art.fx[e.kind],frame,128,128,e.point.x-radius/2,e.point.y-radius/2,radius,radius);
    for(const hit of e.impacts||[]){const q=this.point(hit.x,hit.y);if((e.kind==='rail'||e.kind==='fusion')&&Math.hypot(q.x-e.point.x,q.y-e.point.y)>5)this.atlas(ctx,this.art.fx.rail,frame,128,128,q.x-radius*.2,q.y-radius*.2,radius*.4,radius*.4);if(p<.65){ctx.font=`${Math.max(11,this.width*.04)}px 'Jersey 10'`;ctx.textAlign='center';ctx.fillStyle=COLORS[e.kind];ctx.strokeStyle='#28223f';ctx.lineWidth=2;const text=String(Math.round(hit.damage)),yy=q.y-13-(this.reduced()?0:p*10);ctx.strokeText(text,q.x,yy);ctx.fillText(text,q.x,yy);}}
   }else this.atlas(ctx,this.art.fx[e.kind],frame,128,128,e.point.x-radius/2,e.point.y-radius/2,radius,radius);
  }
  this.host.dataset.projectiles=JSON.stringify(flying);this.host.dataset.displayKills=String(this.view().kills);this.host.dataset.displayEnemies=String(this.viewEnemies().length);this.host.dataset.effects=String(this.fx.length);this.host.dataset.shots=JSON.stringify(this.shotCounts);this.host.dataset.frames=JSON.stringify(this.frames);this.host.dataset.enemies=String(this.game.enemies.length);
 }
 drawSupport(){
  const links=supportLinks(this.game),ctx=this.ctx;this.host.dataset.support=JSON.stringify(links);
  for(const a of this.actors){const link=links.find(l=>l.targetId===a.u.id),source=links.some(l=>l.sourceId===a.u.id),beat=this.time-a.beat>=0&&this.time-a.beat<.28;
   a.machine.classList.toggle('is-supported',!!link);a.machine.classList.toggle('is-support-source',source);a.machine.classList.toggle('is-support-beat',beat);
   a.buff.hidden=!link;if(link){const percent=Math.round(link.boost*100);a.buff.querySelector('b').textContent=percent+'%';a.buff.setAttribute('aria-label',pick([`发条鼓加速 ${percent}%`,`Drum haste ${percent}%`]));}
  }
  for(const link of links){const d=this.actors.find(a=>a.u.id===link.sourceId),a=this.actors.find(a=>a.u.id===link.targetId);
   const from=d.port,to={x:a.port.x,y:a.port.y-(FOOTPRINT[a.u.kind][0]===1?39:14)},side={x:d.foot.x+d.foot.w-1,y:from.y},mid={x:side.x,y:to.y},age=this.time-a.beat,beat=age>=0&&age<.28;
   // Route through the tile gutter, not vertically through the percentage badge.
   const path=[from,side,mid,to];ctx.beginPath();ctx.moveTo(from.x,from.y);for(const p of path.slice(1))ctx.lineTo(p.x,p.y);ctx.strokeStyle='#2b203f';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle=beat?'#ffdfa0':'#c4a2e0';ctx.lineWidth=2;ctx.stroke();
   for(const p of[from,to]){ctx.fillStyle='#352345';ctx.fillRect(p.x-3,p.y-3,6,6);ctx.fillStyle='#edc787';ctx.fillRect(p.x-1,p.y-1,2,2);}
   if(!this.reduced()&&this.game.stage==='wave'&&!this.game.ended){const lengths=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.y-path[i].y));let travel=((this.time-d.fired+.65)% .65)/.65*lengths.reduce((a,b)=>a+b,0),p=to;for(let i=0;i<lengths.length;i++){if(travel<=lengths[i]){const t=travel/(lengths[i]||1);p={x:path[i].x+(path[i+1].x-path[i].x)*t,y:path[i].y+(path[i+1].y-path[i].y)*t};break;}travel-=lengths[i];}ctx.fillStyle='#fff0b7';ctx.fillRect(Math.round(p.x)-2,Math.round(p.y)-2,4,4);}
  }
 }
 destroy(){this.observer.disconnect();this.canvas.remove();this.enemyCanvas.remove();this.enemyActors?.forEach(n=>n.remove());this.actors.forEach(a=>a.machine.remove());this.fx=[];}
}

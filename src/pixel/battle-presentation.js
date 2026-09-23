// Rendering-only delay: the authoritative Workshop rules and attack timings never change.
export const PRESENTATION_LAG=.22;
export const PROJECTILES=['spring','mortar','bubble','rivet','frost'];
export function flightTime(kind,distance,width){
 if(!PROJECTILES.includes(kind))return 0;
 if(kind==='mortar')return PRESENTATION_LAG;
 return Math.min(PRESENTATION_LAG,Math.max(kind==='bubble'?.20:.14,distance/Math.max(1,width)*(kind==='bubble'?1.25:.8)));
}
export function projectilePoint(from,to,t,kind,width,reduced=false){
 const p=Math.max(0,Math.min(1,t)),arc=kind==='mortar'&&!reduced?Math.min(width*.10,Math.hypot(to.x-from.x,to.y-from.y)*.45):0;
 return{x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p-4*p*(1-p)*arc};
}
export class BattlePresentation{
 constructor(game){this.history=[];this.key='';this.resultKey='';this.lastResultAt=-1;this.capture(game,-PRESENTATION_LAG);}
 capture(game,time){const result=[game.hp,game.kills,game.stage,game.choices.join(',')].join('|'),key=game.elapsed+'|'+result;
  if(key===this.key)return;this.key=key;if(result!==this.resultKey){this.resultKey=result;this.lastResultAt=time;}
  this.history.push({time,enemies:game.enemies.map(e=>({...e})),hp:game.hp,kills:game.kills,coins:game.coins,stage:game.stage});
  while(this.history.length>2&&this.history[1].time<time-PRESENTATION_LAG-.1)this.history.shift();
 }
 view(time){for(let i=this.history.length-1;i>=0;i--)if(this.history[i].time<=time-PRESENTATION_LAG+1e-6)return this.history[i];return this.history[0];}
 settled(time){return time+1e-6>=this.lastResultAt+PRESENTATION_LAG;}
}

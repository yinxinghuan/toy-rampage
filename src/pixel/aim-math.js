export const TAU=Math.PI*2;
export const wrap=a=>((a%TAU)+TAU)%TAU;
export const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const bearing=(origin,target)=>Math.atan2(target.y-origin.y,target.x-origin.x);
export function turnToward(angle,target,dt,speed=Math.PI){const d=delta(angle,target),step=Math.max(0,dt)*speed;return wrap(angle+Math.sign(d)*Math.min(Math.abs(d),step));}
export function directionFrame(angle,previous=null){
 const candidate=Math.round(wrap(angle)/(Math.PI/4))%8;
 if(previous!==null&&Math.abs(delta(previous*Math.PI/4,angle))<=Math.PI/8+5*Math.PI/180)return previous;
 return candidate;
}
export function routeTarget(progress){
 const points=[[.2,.047],[.925,.047],[.925,.945],[.12,.945]],lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);
 let d=((progress%1)+1)%1*total;for(let i=0;i<lengths.length;i++){if(d<=lengths[i]){const t=d/lengths[i];return{x:points[i][0]+(points[i+1][0]-points[i][0])*t,y:points[i][1]+(points[i+1][1]-points[i][1])*t};}d-=lengths[i];}return{x:.12,y:.945};
}

// Ambient-only timing. Never consumes combat RNG, changes aim, or creates attacks.
export const IDLE_DETAIL_KINDS=['rail','mortar','bubble','fusion'];
export const IDLE_PROFILES={
 spring:{period:4.2,active:1.54,frames:[0,1,2,3,2,1,0]},
 drum:{period:3.7,active:1.05,frames:[0,1,1,0,0]},
 rail:{period:3.1,active:1.12,frames:[0,1,2,3]},
 mortar:{period:4.1,active:1.2,frames:[0,1,2,3]},
 bubble:{period:2.8,active:1.2,frames:[0,1,2,3]},
 fusion:{period:3.4,active:1.2,frames:[0,1,2,3]},
};
export function idleOffset(id,kind){let h=2166136261;for(const ch of `${kind}:${id}`)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);h=(h^(h>>>16))>>>0;return h/4294967296*IDLE_PROFILES[kind].period;}
export function idlePose(kind,time,id,{enabled=true,reduced=false,suspended=false,shotAge=Infinity}={}){
 const p=IDLE_PROFILES[kind];if(!p||!enabled||reduced||suspended||shotAge<.6)return{frame:0,visible:false};
 const phase=(Math.max(0,time)+idleOffset(id,kind))%p.period,progress=phase-(p.period-p.active);
 return progress<0?{frame:0,visible:false}:{frame:p.frames[Math.min(p.frames.length-1,Math.floor(progress/p.active*p.frames.length))],visible:true};
}
// Authored coordinates in the existing fixed base canvas. All are below the head.
export const IDLE_DETAIL_RECTS={rail:[[25,172,117,40],[242,172,117,40]],bubble:[[42,235,44,47]],mortar:[[109,251,39,39]],fusion:[[19,194,28,40],[335,194,28,40]]};
export function drawIdleDetail(ctx,kind,sheet,pose){
 if(!sheet||!pose.visible)return false;
 ctx.save();ctx.globalAlpha=.72;ctx.imageSmoothingEnabled=false;
 for(const [x,y,w,h]of IDLE_DETAIL_RECTS[kind]||[])ctx.drawImage(sheet,pose.frame%2*64,Math.floor(pose.frame/2)*64,64,64,x,y,w,h);
 ctx.restore();return true;
}

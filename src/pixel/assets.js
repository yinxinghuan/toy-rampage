// Accepted transparent, static assets only. Rejected opaque references stay out of the scene.
export const assets = [
 {id:'spring',name:['弹簧炮','Spring'],footprint:[1,2],color:'#E3AA55',status:'static',src:new URL('./images/sprites/spring.png',import.meta.url).href},
 {id:'rail',name:['磁轨炮','Rail'],footprint:[3,1],color:'#7BA9DF',status:'static',src:new URL('./images/sprites/rail.png',import.meta.url).href},
 {id:'mortar',name:['爆米花炮','Popcorn'],footprint:[2,2],color:'#ED8B7B',status:'static',src:new URL('./images/sprites/mortar.png',import.meta.url).href},
 {id:'bubble',name:['泡泡枪','Bubble'],footprint:[1,2],color:'#68B5A4',status:'static',src:new URL('./images/sprites/bubble.png',import.meta.url).href},
 {id:'drum',name:['发条鼓','Drum'],footprint:[1,1],color:'#B79AD9',status:'static',src:new URL('./images/sprites/drum.png',import.meta.url).href},
 {id:'robot',name:['发条兵','Clockwork'],footprint:[1,1],color:'#E9E2B2',status:'static',src:new URL('./images/sprites/robot.png',import.meta.url).href},
];
export const assetFor=id=>assets.find(a=>a.id===id);

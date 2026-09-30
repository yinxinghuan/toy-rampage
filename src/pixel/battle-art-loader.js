import {WEAPONS,ENEMIES} from './battle-model.js';
import {PROJECTILES} from './battle-presentation.js';
import {IDLE_DETAIL_KINDS} from './idle-motion.js';
const img=async url=>{const i=new Image();i.src=url;await i.decode();return i;};
const json=async url=>{const r=await fetch(url);if(!r.ok)throw Error('direction manifest');return r.json();};
const AIM=['rail','mortar','bubble','fusion'];
// Unique required requests: fx, enemies, aim manifests/base/front, spring, drum, projectiles.
export const CORE_ART_TASK_COUNT=6+5+12+1+1+3;
export const BATTLE_ART_TASK_COUNT=CORE_ART_TASK_COUNT+(WEAPONS.length-3)+AIM.length*7+7+IDLE_DETAIL_KINDS.length;
export async function loadBattleArt(assetRoot=new URL('../animation/',document.baseURI),{image=img,readJSON=json,requireIdle=false,progressive=false}={}){
 const file=p=>new URL(p,assetRoot).href,memo=new Map();
 // Aliases such as brood/swarm share decoded image objects as well as network requests.
 const picture=p=>{const url=file(p);if(!memo.has(url))memo.set(url,image(url));return memo.get(url);};
 const art={fx:{},enemy:{},upgrade:{},aim:{},static:{},spring:[],drum:null,projectile:{},idle:{},idleMissing:[]};
 await Promise.all([
  ...WEAPONS.map(async k=>{art.fx[k]=await picture(`battle-v1/fx/${({rivet:'spring',arc:'rail'})[k]||k}/sheet.png`);}),
  ...ENEMIES.map(async k=>{art.enemy[k]=await picture(`battle-v1/enemy/${({plated:'armor',brood:'swarm',mite:'swarm'})[k]||k}/sheet.png`);}),
  ...AIM.map(async k=>{const path=k==='fusion'?'battle-v1/aim/fusion':'aim-v1/'+k;const [spec,base,front]=await Promise.all([readJSON(file(path+'/manifest.json')),picture(path+'/base.png'),picture(path+'/head-6.png')]);art.aim[k]={spec,base,heads:Array(8).fill(front)};}),
  picture('spring-v1/frame-0.png').then(a=>art.spring=Array(8).fill(a)),
  picture('battle-v1/motion/drum/sheet.png').then(a=>art.drum=a),
  ...PROJECTILES.map(async k=>{art.projectile[k]=await picture(`projectile-v1/${k==='rivet'?'spring':k==='frost'?'bubble':k}/sheet.png`);}),
 ]);
 art.fx.frost=art.fx.bubble;art.fx.storm=art.fx.rail;
 let details;
 art.loadDetails=()=>details??=(async()=>{
  const tasks=[
   ...WEAPONS.filter(k=>!['fusion','rivet','arc'].includes(k)).map(async k=>{art.upgrade[k]=await picture(`battle-v1/upgrade/${k}/sheet.png`);}),
   ...AIM.map(async k=>{const path=k==='fusion'?'battle-v1/aim/fusion':'aim-v1/'+k;const heads=await Promise.all(Array.from({length:8},(_,i)=>picture(path+`/head-${i}.png`)));art.aim[k].heads=heads;}),
   Promise.all(Array.from({length:8},(_,i)=>picture(`spring-v1/frame-${i}.png`))).then(a=>art.spring=a),
   ...IDLE_DETAIL_KINDS.map(async k=>{try{art.idle[k]=await picture(`idle-v1/${k}/sheet.png`);}catch(error){art.idleMissing.push(k);throw error;}}),
  ];
  const results=await Promise.allSettled(tasks);
  if(!progressive){const failed=results.find((r,i)=>r.status==='rejected'&&(requireIdle||i<tasks.length-IDLE_DETAIL_KINDS.length));if(failed)throw failed.reason;}
  return results;
 })();
 if(!progressive)await art.loadDetails();
 return art;
}

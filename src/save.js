import {Workshop,LEVELS,FOOTPRINT,occupied,COLS,ROWS,UPGRADES} from './engine.js';
import {fusionRecipe} from './fusions.js';
import {landReward} from './progression.js';
export const SAVE_VERSION=4,SAVE_KEY='toy-workshop-run-v1';
const FIELDS='levelIndex waveStart lesson shopRevision economyLog mode lab stage rows board landRemaining landChoice landRotation landSplit landLog supplyLog introduced units tray hp kills leaks enemies nextId combatReport spawnLeft spawnTime elapsed paused wave coins seed reserve merges passed history xp upgradeLevel choices buffs upgradeLog upgradeSeed waveKills waveLeaks'.split(' ');
const STAGES=['place','watch','second','merge','expand','rail','ready','wave','win','lose','fusion','fused','labwave','labend'];
const KINDS=['patrol','runner','swarm','armor','boss','plated','brood','mite'];
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const nonnegative=v=>finite(v)&&v>=0;
const item=u=>u&&Object.hasOwn(FOOTPRINT,u.kind)&&!u.kind.startsWith('plot')&&integer(u.rank,1,4)&&(!fusionRecipe(u.kind)||u.rank===4||(u.kind!=='fusion'&&u.rank===3));
const lineup=units=>Array.isArray(units)&&units.length<=COLS*ROWS&&units.every(u=>item(u)&&integer(u.c,0,COLS-1)&&integer(u.r,0,ROWS-1));
const idsValid=ids=>Array.isArray(ids)&&ids.every(id=>UPGRADES.some(u=>u.id===id));
function reportValid(r){
 if(!r)return false;
 for(const k of ['damage','ranks','shots','leaked'])if(!r[k]||typeof r[k]!=='object'||Array.isArray(r[k]))return false;
 for(const k of ['damage','ranks','shots'])if(Object.entries(r[k]).some(([kind,value])=>!Object.hasOwn(FOOTPRINT,kind)||!nonnegative(value)))return false;
 if(Object.entries(r.leaked).some(([kind,v])=>!KINDS.includes(kind)||!v||!integer(v.count,1,100000)||!nonnegative(v.remaining)||!nonnegative(v.boxDamage)))return false;
 return ['supportShots','chainTargets','breachExtra'].every(k=>nonnegative(r[k]));
}
export function captureRun(game){const state={};for(const key of FIELDS)if(game[key]!==undefined)state[key]=structuredClone(game[key]);return {version:SAVE_VERSION,state};}
function safeTree(v,depth=0){
 if(depth>14)return false;
 if(v===null||typeof v==='boolean')return true;
 if(typeof v==='number')return Number.isFinite(v);
 if(typeof v==='string')return v.length<200;
 if(Array.isArray(v))return v.length<=2000&&v.every(x=>safeTree(x,depth+1));
 return typeof v==='object'&&Object.keys(v).length<=80&&Object.entries(v).every(([k,x])=>!['__proto__','constructor','prototype'].includes(k)&&safeTree(x,depth+1));
}
export function restoreRun(raw){
 try{
  if(typeof raw==='string'){if(raw.length>2000000)return null;raw=JSON.parse(raw);}
  if(!safeTree(raw))return null;
  if(raw?.version===1){
    const s=raw.state;if(!s||s.rows!==5||!Array.isArray(s.board)||s.board.length!==20||s.board.some(v=>typeof v!=='boolean')||!integer(s.landRemaining,0,20)||s.board.filter(Boolean).length+s.landRemaining>20||!integer(s.wave,0,8)||!Array.isArray(s.units)||s.units.some(u=>!integer(u.c,0,3)||!integer(u.r,0,4)||!item(u)||occupied(u).some(([x,y])=>x>=4||y>=5)))return null;
    raw=structuredClone(raw);const v=raw.state,old=v.board;v.rows=ROWS;v.board=Array.from({length:COLS*ROWS},(_,i)=>i%COLS<4&&Math.floor(i/COLS)<5?old[Math.floor(i/COLS)*4+i%COLS]:false);
    const completed=v.stage==='wave'?v.wave-1:v.wave;
    const extra=1+Array.from({length:Math.max(0,completed)},(_,i)=>landReward(i+1)-([1,3,5].includes(i+1)?2:0)).reduce((a,b)=>a+b,0);
    v.landRemaining=Math.min(COLS*ROWS-v.board.filter(Boolean).length,v.landRemaining+(v.lab?0:extra));v.landChoice='line';v.landRotation=0;v.landSplit=false;raw.version=SAVE_VERSION;
  }
  let extraLand=0;
  if(raw?.version===2||raw?.version===3){
   const v=raw.state,version=raw.version;
   if(!v||v.rows!==6||!Array.isArray(v.board)||v.board.length!==30||v.board.some(x=>typeof x!=='boolean')||!integer(v.landRemaining,0,30)||v.board.filter(Boolean).length+v.landRemaining>30||!integer(v.wave,0,8)||!Array.isArray(v.units)||v.units.some(u=>!item(u)||!integer(u.c,0,4)||!integer(u.r,0,5)||occupied(u).some(([c,r])=>c>=5||r>=6)))return null;
   const completed=v.stage==='wave'?v.wave-1:v.wave,oldRewards=version===2?[0,2,2,3,3,3,3]:[0,2,2,3,3,3,2];
   extraLand=v.lab?0:(version===2?1:0)+Array.from({length:Math.max(0,completed)},(_,i)=>landReward(i+1)-(oldRewards[i+1]||0)).reduce((a,b)=>a+b,0);
   raw=structuredClone(raw);const old=raw.state.board;raw.state.rows=ROWS;raw.state.board=Array.from({length:COLS*ROWS},(_,i)=>i%COLS<5&&Math.floor(i/COLS)<6?old[Math.floor(i/COLS)*5+i%COLS]:false);raw.version=SAVE_VERSION;
  }
  if(raw?.version!==SAVE_VERSION)return null;
  const s=raw.state;if(!s||!integer(s.levelIndex,0,LEVELS.length-1)||!['run','tutorial','lab'].includes(s.mode)||!STAGES.includes(s.stage))return null;
  const g=new Workshop();g.reset(s.mode,s.levelIndex);
  for(const key of FIELDS)if(Object.hasOwn(g,key)&&!Object.hasOwn(s,key))return null;
  if(s.rows!==ROWS||!Array.isArray(s.board)||s.board.length!==COLS*ROWS||s.board.some(v=>typeof v!=='boolean'))return null;
  for(const key of ['hp','coins','kills','leaks','wave','passed','xp','upgradeLevel','seed','upgradeSeed','nextId','shopRevision','merges','landRemaining','spawnLeft'])if(!integer(s[key],0,2**32))return null;
  if(s.hp>100||s.wave>8||s.passed>s.wave||s.upgradeLevel>6||s.landRemaining+s.board.filter(Boolean).length>COLS*ROWS||!finite(s.elapsed)||s.elapsed<0||!finite(s.spawnTime))return null;
  if(!['line','elbow'].includes(s.landChoice)||!integer(s.landRotation,0,3)||typeof s.landSplit!=='boolean')return null;
  for(const key of ['units','reserve','enemies','history','choices','buffs','economyLog','landLog','supplyLog','introduced','upgradeLog'])if(!Array.isArray(s[key]))return null;
  if(s.units.length>COLS*ROWS||s.reserve.length!==3||s.enemies.length>200||s.history.length>8||s.choices.length>3||new Set(s.choices).size!==s.choices.length)return null;
  if([...s.choices,...s.buffs].some(id=>!UPGRADES.some(u=>u.id===id)))return null;
  if(s.reserve.some(u=>u!==null&&!item(u))||(s.tray!==null&&!item(s.tray)))return null;
  const cells=new Set(),ids=new Set();
  for(const u of s.units){
   if(!item(u)||!integer(u.id,1,s.nextId-1)||ids.has(u.id)||!integer(u.c,0,COLS-1)||!integer(u.r,0,ROWS-1)||!finite(u.cooldown)||!finite(u.recoil))return null;ids.add(u.id);
   for(const[c,r]of occupied(u)){const key=r*COLS+c;if(c>=COLS||r>=ROWS||!s.board[key]||cells.has(key))return null;cells.add(key);}
  }
  for(const e of s.enemies){if(!KINDS.includes(e.kind)||!integer(e.id,1,s.nextId-1)||ids.has(e.id)||typeof e.practice!=='boolean'||![e.hp,e.maxHp,e.d,e.speed,e.flash].every(finite)||e.hp<=0||e.hp>e.maxHp||e.d<0||e.d>=938||e.speed<=0)return null;
   if(['slow','slowLeft','shredLeft'].some(k=>e[k]!==undefined&&!nonnegative(e[k]))||(e.slow??0)>1)return null;ids.add(e.id);}
  if(['wave','labwave'].includes(s.stage)&&(!s.waveStart||s.wave<1||!integer(s.waveKills,0,100000)||!integer(s.waveLeaks,0,100000)))return null;
  if(s.mode!=='run'&&s.levelIndex!==0||s.lab!==(s.mode==='lab')||typeof s.paused!=='boolean'||!['waiting','refresh','place','done'].includes(s.lesson))return null;
  const labStages=['fusion','fused','labwave','labend'],runStages=['ready','wave','win','lose'];
  if(s.lab!==labStages.includes(s.stage)||s.mode==='run'&&!runStages.includes(s.stage))return null;
  if(['place','second','rail'].includes(s.stage)&&!s.tray)return null;
  if(s.spawnLeft>(s.lab?10:LEVELS[s.levelIndex].waves[s.wave-1]?.count??0))return null;
  if(s.stage==='ready'&&s.wave>=8||s.stage==='lose'&&s.hp!==0||s.stage==='win'&&(s.wave!==8||s.hp===0))return null;
  if(!reportValid(s.combatReport))return null;
  if(s.waveStart!==null&&(!s.waveStart||!lineup(s.waveStart.units)||!['hp','coins','elapsed','cells'].every(k=>nonnegative(s.waveStart[k]))))return null;
  if(s.history.some(h=>!h||!integer(h.wave,1,s.wave)||!['clear','lose','abandoned'].includes(h.outcome)||!lineup(h.units)||!lineup(h.startUnits)||!idsValid(h.buffs)||!reportValid(h.combat)||!['hp','kills','leaks','startHp','startCoins','coins','seconds','xp','cells','startCells'].every(k=>nonnegative(h[k]))))return null;
  if(new Set(s.history.map(h=>h.wave)).size!==s.history.length)return null;
  if(s.upgradeLog.some(u=>!u||!idsValid([u.id])||!['wave','xp','seconds','targets'].every(k=>nonnegative(u[k])))||s.upgradeLog.length!==s.upgradeLevel)return null;
  if(s.introduced.some(k=>!['bubble','drum'].includes(k)))return null;
  for(const key of FIELDS)if(Object.hasOwn(s,key))g[key]=structuredClone(s[key]);
  g.landRemaining=Math.min(COLS*ROWS-g.board.filter(Boolean).length,g.landRemaining+extraLand);
  g.level=LEVELS[g.levelIndex];g.waves=g.level.waves;g.effects=[];g.events=[];
  return g;
 }catch{return null;}
}
export function runStore(storage){return {
 load(){try{const raw=storage.getItem(SAVE_KEY);if(raw===null)return{status:'empty'};const game=restoreRun(raw);return game?{status:'ok',game}:{status:'invalid'};}catch{return{status:'unavailable'};}},
 save(game){try{storage.setItem(SAVE_KEY,JSON.stringify(captureRun(game)));return true;}catch{return false;}},
};}

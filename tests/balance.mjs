import { Workshop, COLS, SIM_STEP, adjacent,occupied,FOOTPRINT } from '../src/engine.js';
import {fusionRecipe} from '../src/fusions.js';
function routeMoves(g,route,kit=false){
 const opening=openingMove(g);if(opening)return opening;
 const built=g.units.find(u=>u.kind===route);
 if(built){if(g.levelIndex===3&&built.c!==0){const p=g.preview(built.id,0,0);if(p.ok&&p.type==='place')return{source:built.id,...p};}return moves(g,g.levelIndex===3?'mixed':'trial-no-fusion');}
 const land=g.landMove();if(land)return land;const action=g.landAdvice();if(action)return{action};
 for(let i=0;i<3;i++)if(g.reserve[i]?.kind===route)for(let r=0;r<g.rows;r++)for(let c=0;c<COLS;c++){const p=g.preview('reserve:'+i,c,r);if(p.ok&&p.type==='place')return{source:'reserve:'+i,...p};}
 const fusion=g.fusionMove(route);if(fusion)return fusion;
 const recipe=fusionRecipe(route),[w,h]=FOOTPRINT[route],ac=1,ar=3;
 // Legal spatial planning: leave the future result's top-left footprint free,
 // move the starting Spring to the right edge, and keep both parents at tier 3.
 const spring=g.units.find(u=>u.kind==='spring'&&u.c===0&&u.r===0);
 if(spring){for(const[c,r]of [[3,1],[3,0],[4,1]]){const p=g.preview(spring.id,c,r);if(p.ok&&p.type==='place')return{source:spring.id,c,r};}}
 const held=u=>[recipe.material,recipe.anchor].includes(u.kind)&&u.rank>=recipe.rank;
 for(const u of g.units)for(const v of g.units)if(u.id!==v.id&&!held(u)){const p=g.preview(u.id,v.c,v.r);if(p.ok&&p.type==='merge')return{source:u.id,c:v.c,r:v.r};}
 for(const type of ['merge','place'])for(const kind of [recipe.anchor,recipe.material,'rail','bubble','drum','rivet','spring','mortar'])for(let i=0;i<3;i++){
  const u=g.reserve[i];if(u?.kind!==kind||type==='merge'&&held(u)||kit&&g.wave<2&&kind===recipe.anchor)continue;
  for(let r=0;r<g.rows;r++)for(let c=0;c<COLS;c++){
   const p=g.preview('reserve:'+i,c,r);if(!p.ok||p.type!==type)continue;
   if(type==='place'){
    if(kind===recipe.anchor){if(c!==ac||r!==ar)continue;}
    else if(occupied({...u,c,r}).some(([x,y])=>x>=ac&&x<ac+w&&y>=ar&&y<ar+h))continue;
    if(['bubble','drum'].includes(kind)&&g.units.some(v=>v.kind===kind))continue;
   }
   return{source:'reserve:'+i,c,r};
  }
 }
 return null;
}
export function moves(g, strategy='blast') {
  const opening=openingMove(g);if(opening)return opening;
  if(strategy.startsWith('kit-'))return routeMoves(g,strategy.slice(4),true);
  if(strategy.startsWith('route-'))return routeMoves(g,strategy.slice(6));
  const spread=strategy==='trial-spread',noFusion=spread||strategy==='trial-no-fusion';if(noFusion)strategy='trial';
  const land=g.landMove();if(land)return land;const action=g.landAdvice();if(action)return{action};
  if(strategy!=='spring'&&!noFusion){const fusion=g.fusionMove();if(fusion)return fusion;}
  if(!spread)for(const u of g.units)for(const v of g.units)if(u.id!==v.id){const p=g.preview(u.id,v.c,v.r);if(p.ok&&p.type==='merge')return {source:u.id,c:v.c,r:v.r};}
  const order=strategy==='trial'?['rivet','arc','bubble','drum','rail','mortar','spring']:strategy==='support'?['bubble','drum','rail','mortar','spring']:strategy==='blast'?['mortar','spring','rail']:strategy==='mixed'?['rail','mortar','spring']:['spring','rail','mortar'];
  for(const type of spread?['place','merge']:['merge','place'])for(const kind of order)for(let i=0;i<3;i++){
    if(g.reserve[i]?.kind!==kind)continue;
    for(let r=0;r<g.rows;r++)for(let c=0;c<COLS;c++){const p=g.preview('reserve:'+i,c,r);if(p.ok&&p.type===type){if(type==='place'&&['bubble','drum'].includes(kind)&&g.units.some(u=>u.kind===kind))continue;if(kind==='drum'&&type==='place'&&!g.units.some(u=>u.kind!=='drum'&&adjacent({kind,c,r},u)))continue;return{source:'reserve:'+i,c,r};}}
  }
  return null;
}
// Explicit legal opening for the centered board: expand toward the entrance,
// then relocate the initial guns. This is a QA policy, not an engine advantage.
function openingMove(g){
 if(g.wave!==0)return null;
 if(!g.landLog.length&&g.landRemaining===3){
  if(g.landKind()==='plot3')return{action:'land-rotate'};
  const p=g.preview('land',0,0);if(p.ok)return{source:'land',...p};
 }
 if(g.landRemaining)return null;
 for(const[kind,c,r,dc,dr]of [['spring',1,2,0,0],['rail',1,4,0,2]]){
  const u=g.units.find(x=>x.kind===kind&&x.c===c&&x.r===r);
  if(u){const p=g.preview(u.id,dc,dr);if(p.ok&&p.type==='place')return{source:u.id,...p};}
 }
 return null;
}
export function upgradeIndex(g,strategy='blast'){
  if(strategy.startsWith('kit-'))strategy='route-'+strategy.slice(4);
  if(strategy.startsWith('route-'))strategy=strategy==='route-frost'?'support':'trial';
  if(['trial-no-fusion','trial-spread'].includes(strategy))strategy='trial';
  const order=['idle','empty'].includes(strategy)?['supplies','repair']:strategy==='support'?['bubble-splash','drum-boost','bubble-speed','rail-pierce','mortar-radius','spring-bounce','rail-speed','repair','supplies']:strategy==='mixed'?['rail-pierce','rail-speed','mortar-radius','spring-bounce','mortar-speed','spring-speed','repair','supplies']:['mortar-radius','spring-bounce','mortar-speed','spring-speed','rail-pierce','rail-speed','repair','supplies'];
  if(strategy==='trial')for(const id of ['rivet-duration','arc-chain','drum-boost','rail-pierce']){const i=g.choices.indexOf(id);if(i>=0)return i;}
  for(const id of order){const i=g.choices.indexOf(id);if(i>=0)return i;}return 0;
}
export function prepare(g,strategy='blast'){
  if(['idle','empty'].includes(strategy))return;
  if(strategy.startsWith('kit-')&&g.routeSupplies().includes(strategy.slice(4)))g.claimRoute(strategy.slice(4),true);
  for(let batches=0;batches<3;batches++){
    for(let n=0;n<60;n++){const p=moves(g,strategy);if(!p)break;if(p.action)g[{'land-rotate':'rotateLand','land-choice':'chooseLand','land-split':'splitLand'}[p.action]]();else g.place(p.source,p.c,p.r);}
    if(g.coins<5||batches===2)break;g.refresh(true);
  }
}
export function simulate(strategy,level=0,dt=SIM_STEP){
  const g=new Workshop();g.reset('run',level);if(strategy==='empty')g.units=[];
  for(let wave=0;wave<g.waves.length&&!g.ended;wave++){
    prepare(g,strategy);g.startWave();
    for(let i=0;i<8000&&!g.ended&&(g.stage==='wave'||g.choices.length);i++){if(g.choices.length)g.chooseUpgrade(upgradeIndex(g,strategy));else g.tick(dt);}
  }
  return {strategy,stage:g.stage,...g.report()};
}
if(process.argv[1]?.endsWith('balance.mjs'))console.log(JSON.stringify([0,1,2,3].flatMap(l=>['idle','empty','blast','mixed','spring','support'].map(s=>{const r=simulate(s,l);return{level:r.level,strategy:s,stage:r.stage,hp:r.hp,kills:r.kills,leaks:r.leaks,cells:r.board.filter(Boolean).length,lineup:r.units.map(u=>u.kind+u.rank),upgrades:r.upgrades.map(u=>u.id),waveHp:r.history.map(h=>h.hp)};})),null,2));

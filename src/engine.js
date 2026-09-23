import { LEVELS } from './levels.js';
import {SUPPLY_UNLOCKS,landReward,HIGH_TIER_AFTER,supplyPool,chapterRoutes} from './progression.js';
import {LAND_SHAPES,LAND_BOUNDS} from './land-shapes.js';
import {newCombatReport,recordHit,recordLeak} from './combat-report.js';
import { UPGRADES,XP_THRESHOLDS } from './upgrades.js';
import {FUSIONS,matchFusion,fusionRecipe,fusionInherits,fusionRankAllowed} from './fusions.js';
export { UPGRADES,XP_THRESHOLDS };
export { LEVELS };
export const SIM_STEP=1/60;
export class SimulationClock {
  constructor(){this.debt=0;}
  reset(){this.debt=0;}
  advance(game,dt,speed=1){
    if(game.paused||game.ended||game.choices.length){this.reset();return;}
    this.debt+=Math.min(Math.max(dt,0),.05)*speed;
    while(this.debt+1e-9>=SIM_STEP){game.tick(SIM_STEP);this.debt=Math.max(0,this.debt-SIM_STEP);}
  }
}
export const CELL = 45, GX = 45, GY = 29.5, W = 360, H = 374, COLS = 6, ROWS = 7;
export const FOOTPRINT = { spring: [1, 2], rail: [3, 1], mortar: [2, 2], fusion: [3, 1], bubble:[1,2], drum:[1,1], rivet:[1,3], arc:[2,2], plot2:[2,1], plot1:[1,1] };
export const STATS = { spring: {damage:12, interval:.85, range:190}, rail:{damage:9, interval:1.2, range:235}, mortar:{damage:18, interval:1.65, range:210}, fusion:{damage:65, interval:1.2, range:235}, bubble:{damage:5,interval:1.1,range:190}, drum:{damage:0,interval:1,range:0} };
Object.assign(STATS,{rivet:{damage:8,interval:.8,range:220},arc:{damage:15,interval:1.4,range:200}});
for(const recipe of FUSIONS)FOOTPRINT[recipe.kind]=recipe.footprint;
Object.assign(FOOTPRINT,LAND_BOUNDS);
Object.assign(STATS,{frost:{damage:20,interval:1.4,range:205},storm:{damage:80,interval:1.5,range:230}});
export const WAVES = LEVELS[0].waves; // Compatibility for first-level regression tests.
export const PATH = [[26,24],[334,24],[334,346],[26,346]];
export const LENGTH = 938;
export function pointAt(distance) {
  let rest = Math.max(0,distance);
  for(let i=1;i<PATH.length;i++){const a=PATH[i-1],b=PATH[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(rest<=len)return[a[0]+(b[0]-a[0])*rest/len,a[1]+(b[1]-a[1])*rest/len];rest-=len;}
  return PATH.at(-1);
}
export function occupied(u){if(LAND_SHAPES[u.kind])return LAND_SHAPES[u.kind].map(([x,y])=>[u.c+x,u.r+y]);const[w,h]=FOOTPRINT[u.kind];return Array.from({length:w*h},(_,i)=>[u.c+i%w,u.r+Math.floor(i/w)]);}
export function center(u){const[w,h]=FOOTPRINT[u.kind];return[GX+(u.c+w/2)*CELL,GY+(u.r+h/2)*CELL];}
export function adjacent(a,b){return occupied(a).some(([x,y])=>occupied(b).some(([p,q])=>Math.abs(x-p)+Math.abs(y-q)===1));}
export class Workshop {
  constructor(){this.reset();}
  reset(mode='tutorial',levelIndex=0){
    if(mode===true)mode='lab';
    this.levelIndex=mode==='run'&&Number.isInteger(levelIndex)&&LEVELS[levelIndex]?levelIndex:0;
    this.level=LEVELS[this.levelIndex];this.waves=this.level.waves;this.waveStart=null;
    this.lesson=mode==='tutorial'?'waiting':'done';this.shopRevision=0;this.economyLog=[];
    this.mode=mode;this.lab=mode==='lab';this.stage=this.lab?'fusion':mode==='run'?'ready':'place';
    this.rows=ROWS;this.board=Array.from({length:COLS*ROWS},(_,i)=>this.lab||(i%COLS>=1&&i%COLS<=4&&Math.floor(i/COLS)>=2&&Math.floor(i/COLS)<=4));this.landRemaining=this.lab?0:3;this.landChoice='line';this.landRotation=0;this.landSplit=false;this.landLog=[];this.supplyLog=[];this.introduced=[];this.units=[];this.tray=mode==='tutorial'?{kind:'spring',rank:1}:null;
    this.hp=100;this.kills=0;this.leaks=0;this.enemies=[];this.effects=[];this.events=[];this.nextId=1;this.combatReport=newCombatReport();
    this.spawnLeft=0;this.spawnTime=0;this.elapsed=0;this.paused=false;this.wave=0;this.coins=0;
    this.seed=9173;this.reserve=['spring','rail','mortar'].map(kind=>({kind,rank:1}));this.merges=0;this.passed=0;this.history=[];
    if(mode==='run'&&this.level.experiment)this.reserve[2]={kind:this.level.experiment,rank:1};
    this.xp=0;this.upgradeLevel=0;this.choices=[];this.buffs=[];this.upgradeLog=[];this.upgradeSeed=4517;
    if(this.lab){this.add('spring',3,0,0);this.add('rail',3,0,3);}
    if(mode==='run'){this.add('spring',2,1,2);this.add('rail',1,1,4);}
  }
  lineup(){return this.units.map(({kind,rank,c,r})=>({kind,rank,c,r}));}
  recordWave(outcome){
    if(!this.waveStart||this.history.some(h=>h.wave===this.wave))return;
    this.history.push({wave:this.wave,outcome,hp:this.hp,kills:this.waveKills,leaks:this.waveLeaks,
      startHp:this.waveStart.hp,startCoins:this.waveStart.coins,coins:this.coins,
      seconds:Math.round((this.elapsed-this.waveStart.elapsed)*10)/10,
      startUnits:this.waveStart.units,units:this.lineup(),xp:this.xp,buffs:[...this.buffs],cells:this.board.filter(Boolean).length,startCells:this.waveStart.cells,combat:structuredClone(this.combatReport)});
  }
  report(outcome=this.stage){
    // A detached report: later moves, retries and rerolls cannot rewrite evidence.
    return structuredClone({level:this.levelIndex+1,levelId:this.level.id,mode:this.mode,outcome,
      hp:this.hp,coins:this.coins,wave:this.wave,passed:this.passed,kills:this.kills,leaks:this.leaks,
      history:this.history,units:this.lineup(),reserve:this.reserve,xp:this.xp,buffs:this.buffs,upgrades:this.upgradeLog,initialSeed:9173,board:this.board,landRemaining:this.landRemaining,landLog:this.landLog,supplyLog:this.supplyLog,economyLog:this.economyLog,introduced:this.introduced,totalWaves:this.waves.length});
  }
  retry(){this.reset('run',this.levelIndex);}
  nextLevel(){if(this.stage!=='win'||this.levelIndex===LEVELS.length-1)return false;this.reset('run',this.levelIndex+1);return true;}
  add(kind,rank,c,r){const u={id:this.nextId++,kind,rank,c,r,cooldown:.15,recoil:0};this.units.push(u);return u;}
  get(source){
    if(source==='land'||source==='land:other'||source==='land:square')return this.landRemaining>0&&['expand','ready','wave'].includes(this.stage)?this.landOffers().find(u=>u.source===source):undefined;
    if(typeof source==='string'&&/^reserve:[0-2]$/.test(source)){
      return ['ready','wave'].includes(this.stage)&&!this.tray?this.reserve[Number(source.slice(8))]:undefined;
    }
    return source==='tray'?this.tray:this.units.find(u=>u.id===source);
  }
  at(c,r){return this.units.find(u=>occupied(u).some(([x,y])=>x===c&&y===r));}
  hasCell(c,r){return c>=0&&c<COLS&&r>=0&&r<ROWS&&this.board[r*COLS+c]===true;}
  landPreview(c,r,kind){
    if(!Number.isInteger(c)||!Number.isInteger(r))return{ok:false,reason:'outside'};
    const tiles=occupied({kind,c,r});
    if(tiles.length>this.landRemaining||tiles.some(([x,y])=>x<0||x>=COLS||y<0||y>=ROWS))return{ok:false,reason:'outside'};
    if(tiles.some(([x,y])=>this.hasCell(x,y)))return{ok:false,reason:'landOverlap'};
    if(!tiles.some(([x,y])=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([p,q])=>this.hasCell(p,q))))return{ok:false,reason:'landConnect'};
    return{ok:true,type:'expand',kind,c,r,tiles};
  }
  landKind(){
    if(this.landSplit||this.landRemaining===1)return'plot1';
    const big=this.landRemaining>=3;
    return big&&this.landChoice==='elbow'?'plotL'+this.landRotation:big?(this.landRotation%2?'plotV3':'plot3'):(this.landRotation%2?'plotV2':'plot2');
  }
  landOffers(){
    const kind=this.landKind(),first={source:'land',kind,rank:this.landRemaining};
    if(kind==='plot1')return[first];
    const other=this.landRemaining>=3?(kind.startsWith('plotL')?(this.landRotation%2?'plotV3':'plot3'):'plotL'+this.landRotation):(kind==='plot2'?'plotV2':'plot2');
    return[first,{source:'land:other',kind:other,rank:this.landRemaining},...(this.landRemaining>=4?[{source:'land:square',kind:'plot4',rank:this.landRemaining}]:[])];
  }
  canEditLand(){return this.landRemaining>0&&['expand','ready','wave'].includes(this.stage)&&!this.paused&&!this.choices.length;}
  rotateLand(){if(!this.canEditLand()||this.landKind()==='plot1')return false;this.landRotation=(this.landRotation+1)%4;return true;}
  chooseLand(){if(!this.canEditLand()||this.landRemaining<3||this.landSplit)return false;this.landChoice=this.landChoice==='line'?'elbow':'line';return true;}
  canSplitLand(){
    if(!this.canEditLand()||this.landKind()==='plot1')return false;
    const kinds=this.landRemaining>=3?['plot3','plotV3','plotL0','plotL1','plotL2','plotL3']:['plot2','plotV2'];
    return !kinds.some(k=>Array.from({length:COLS*ROWS},(_,i)=>this.landPreview(i%COLS,Math.floor(i/COLS),k).ok).some(Boolean));
  }
  splitLand(){if(!this.canSplitLand())return false;this.landSplit=true;return true;}
  landAdvice(){
    if(!this.canEditLand()||this.landMove())return null;
    if(this.canSplitLand())return'land-split';
    return'land-rotate';
  }
  landMove(){if(!this.get('land'))return null;for(const {source}of this.landOffers())for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const p=this.preview(source,c,r);if(p.ok)return{source,...p};}return null;}
  drumBoost(u){if(u.kind==='drum')return 0;return Math.max(0,...this.units.filter(d=>d.kind==='drum'&&d.id!==u.id&&adjacent(d,u)).map(d=>.1+.05*d.rank+(this.buffs.includes('drum-boost')?.1:0)));}
  fusionMove(kind='fusion'){
    if(this.paused||this.choices.length||this.ended)return null;
    for(const recipe of FUSIONS.filter(r=>!kind||r.kind===kind))for(const anchor of this.units.filter(u=>u.kind===recipe.anchor&&fusionRankAllowed(recipe,u.rank)))for(const source of [...this.units.map(u=>u.id),...this.reserve.map((_,i)=>'reserve:'+i)]){const u=this.get(source);if(u?.kind===recipe.material&&u.rank===anchor.rank){const p=this.preview(source,anchor.c,anchor.r);if(p.ok&&p.type==='fusion')return{source,...p};}}
    for(const recipe of FUSIONS.filter(r=>!kind||r.kind===kind))for(const target of this.units.filter(u=>u.kind===recipe.material&&fusionRankAllowed(recipe,u.rank)))for(let i=0;i<this.reserve.length;i++){const source='reserve:'+i,u=this.get(source);if(u?.kind===recipe.anchor&&u.rank===target.rank){const p=this.preview(source,target.c,target.r);if(p.ok&&p.type==='fusion')return{source,...p};}}
    return null;
  }
  get ended(){return ['win','lose','labend'].includes(this.stage);}
  reservePreview(source,target){
    const u=this.get(source),v=this.get(target);
    if(this.paused||this.choices.length||this.ended||!/^reserve:[0-2]$/.test(source)||!/^reserve:[0-2]$/.test(target)||source===target||!u||!v)return{ok:false,reason:'choose'};
    const recipe=matchFusion(u,v,true);
    if(recipe)return{ok:true,type:'reserve-fusion',kind:recipe.kind,rank:u.rank+1,target};
    if(u.kind!==v.kind)return{ok:false,reason:'differentKind'};
    if(u.rank!==v.rank)return{ok:false,reason:'differentRank',from:u.rank,to:v.rank};
    if(u.rank>=4||fusionRecipe(u.kind))return{ok:false,reason:'maxRank'};
    return{ok:true,type:'reserve-merge',kind:u.kind,rank:u.rank+1,target};
  }
  mergeReserve(source,target,confirmFusion=false){
    const p=this.reservePreview(source,target);if(!p.ok)return p;
    if(p.type==='reserve-fusion'&&!confirmFusion)return{...p,ok:false,reason:'confirmFusion'};
    this.reserve[Number(target.slice(8))]={kind:p.kind,rank:p.rank};this.reserve[Number(source.slice(8))]=null;
    this.merges++;this.events.push(p.type==='reserve-fusion'?'fusion':'merge');return p;
  }
  swapPreview(u,target){
    const a={...u,c:target.c,r:target.r},b={...target,c:u.c,r:u.r},tiles=[...occupied(a),...occupied(b)],keys=tiles.map(([x,y])=>x+','+y);
    const ok=keys.length===new Set(keys).size&&tiles.every(([x,y])=>this.hasCell(x,y)&&!this.units.some(v=>v.id!==u.id&&v.id!==target.id&&occupied(v).some(([c,r])=>c===x&&r===y)));
    return{ok,reason:'swapBlocked',type:'swap',kind:u.kind,c:a.c,r:a.r,target,other:b,tiles};
  }
  preview(source,c,r){
    const u=this.get(source);if(!u||this.paused||this.choices.length)return{ok:false,reason:'choose'};if(this.ended)return{ok:false,reason:'ended'};
    if(source==='land'||source==='land:other'||source==='land:square')return this.landPreview(c,r,u.kind);
    if(!Number.isInteger(c)||!Number.isInteger(r)||c<0||c>=COLS||r<0||r>=this.rows)return{ok:false,reason:'outside'};
    const target=this.at(c,r);
    if(target&&target.id!==source){
      if(target.kind===u.kind){
        if(target.rank===u.rank&&u.rank<4&&!fusionRecipe(u.kind))return{ok:true,type:'merge',c:target.c,r:target.r,kind:u.kind,target};
      }
      const recipe=matchFusion(u,target,true);
      if(recipe){
        const anchor=typeof source==='number'&&u.kind===recipe.anchor?u:target,tiles=occupied({kind:recipe.kind,c:anchor.c,r:anchor.r});
        const ok=tiles.every(([x,y])=>this.hasCell(x,y)&&!this.units.some(v=>v.id!==source&&v.id!==target.id&&occupied(v).some(([c,r])=>c===x&&r===y)));
        return{ok,reason:ok?undefined:'fusionSpace',type:'fusion',c:anchor.c,r:anchor.r,kind:recipe.kind,rank:u.rank+1,target,tiles};
      }
      if(typeof source==='number'&&['ready','wave'].includes(this.stage))return this.swapPreview(u,target);
      return{ok:false,reason:target.kind!==u.kind?'differentKind':u.rank>=4&&target.rank===u.rank?'maxRank':'differentRank',from:u.rank,to:target.rank};
    }
    const cells=occupied({...u,c,r});
    if(cells.some(([x,y])=>x<0||x>=COLS||y<0||y>=this.rows))return{ok:false,reason:'outside'};
    if(cells.some(([x,y])=>!this.hasCell(x,y)))return{ok:false,reason:'lockedCell'};
    if(cells.some(([x,y])=>{const other=this.at(x,y);return other&&other.id!==source;}))return{ok:false,reason:'occupied'};
    return{ok:true,type:'place',c,r,kind:u.kind};
  }
  place(source,c,r){
    const p=this.preview(source,c,r);if(!p.ok)return p;
    if(p.type==='swap'){
      const u=this.get(source);p.target.c=p.other.c;p.target.r=p.other.r;u.c=p.c;u.r=p.r;
      this.events.push('place');return p;
    }
    if(p.type==='expand'){
      for(const[x,y]of p.tiles)this.board[y*COLS+x]=true;
      this.landRemaining-=p.tiles.length;this.landLog.push({wave:this.wave,kind:p.kind,tiles:p.tiles,cells:this.board.filter(Boolean).length});
      this.effects.push({type:'expand',tiles:p.tiles,life:.6,max:.6});this.events.push('place');
      if(this.stage==='expand'){this.stage='rail';this.tray={kind:'rail',rank:1};}return p;
    }
    const reserveIndex=typeof source==='string'&&source.startsWith('reserve:')?Number(source.slice(8)):-1;
    const u=this.get(source),before=this.units.flatMap(occupied).length;
    if(p.type==='merge'||p.type==='fusion'){
      this.units=this.units.filter(x=>x.id!==source&&x.id!==p.target.id);
      const rank=p.type==='fusion'?p.rank:u.rank+1,nu=this.add(p.kind,rank,p.c,p.r);
      if(source==='tray')this.tray=null;
      this.merges++;p.rank=rank;p.freed=before-this.units.flatMap(occupied).length;
      const[x,y]=center(nu);this.effects.push({type:p.type,x,y,life:.4,max:.4});
      this.events.push(p.type);
      // Tutorial observes successful rules; it never grants permission to merge.
      if(['second','merge'].includes(this.stage)&&p.type==='merge')this.stage='expand';
      if(this.stage==='fusion'&&p.type==='fusion'){this.stage='fused';this.tray={kind:'spring',rank:1};}
    }else{
      if(source==='tray'||reserveIndex>=0){this.add(u.kind,u.rank,c,r);if(source==='tray')this.tray=null;}
      else{u.c=c;u.r=r;}
      this.events.push('place');
      if(this.stage==='place'){this.stage='watch';this.spawn(24,true);}
      else if(this.stage==='second'&&source==='tray')this.stage='merge';
      else if(this.stage==='rail'&&source==='tray')this.stage='ready';
    }
    if(reserveIndex>=0){this.reserve[reserveIndex]=null;if(this.lesson==='place')this.lesson='done';}
    return p;
  }
  expand(){const p=this.landMove();return p?this.place(p.source,p.c,p.r).ok:false;}
  reserveMove(){
    for(const type of ['merge','place'])for(let i=0;i<3;i++)for(let r=0;r<this.rows;r++)for(let c=0;c<COLS;c++){
      const p=this.preview('reserve:'+i,c,r);if(p.ok&&p.type===type)return{source:'reserve:'+i,...p};
    }
    return null;
  }
  random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  routeSupplies(){return this.mode==='run'&&this.wave>=2&&this.levelIndex>=3&&!this.supplyLog.some(x=>x.route)?chapterRoutes(this.levelIndex).filter(k=>k!=='fusion'):[];}
  claimRoute(kind,confirmed=false){
    if(this.stage!=='ready'||this.paused||this.choices.length||this.tray||!this.routeSupplies().includes(kind))return{ok:false,reason:'placeFirst'};
    if(this.coins<5)return{ok:false,reason:'noCoins'};
    if(this.reserve.some(Boolean)&&!confirmed)return{ok:false,reason:'replaceReserve'};
    const r=fusionRecipe(kind);this.changeCoins(-5,'route-supply',{route:kind});
    this.reserve=[{kind:r.material,rank:2},{kind:r.anchor,rank:2},null];
    this.supplyLog.push({wave:this.wave,items:structuredClone(this.reserve),route:kind,fresh:null,cleanup:null});
    this.shopRevision++;this.events.push('reward');return{ok:true};
  }
  changeCoins(delta,reason,details={}){const before=this.coins;this.coins+=delta;this.economyLog.push({wave:this.wave,seconds:Math.round(this.elapsed*10)/10,reason,delta,before,after:this.coins,...details});}
  refresh(confirmed=false){
    if(this.stage!=='ready'||this.paused||this.tray||this.choices.length)return{ok:false,reason:'placeFirst'};
    if(this.coins<5)return{ok:false,reason:'noCoins'};
    if(this.reserve.some(Boolean)&&!confirmed)return{ok:false,reason:'replaceReserve'};
    const teaching=this.lesson==='refresh';this.changeCoins(-5,'refresh');
    const pool=supplyPool(this.level,this.wave),rank=this.wave>=HIGH_TIER_AFTER?2:1;
    this.reserve=Array.from({length:3},()=>({kind:pool[Math.floor(this.random()*pool.length)],rank}));
    const active=[...new Set(this.units.filter(u=>u.rank<4&&pool.includes(u.kind)).map(u=>u.kind))];
    if(active.length)this.reserve[0]={kind:active[Math.floor(this.random()*active.length)],rank};
    // Preserve high-tier supply, but never strand deployed tier-1 units once
    // normal batches move to tier 2. Oldest eligible unit gets a real pair.
    const cleanup=this.wave>=HIGH_TIER_AFTER?this.units.filter(u=>u.rank===1&&pool.includes(u.kind)).sort((a,b)=>a.id-b.id)[0]:null;
    if(cleanup)this.reserve[0]={kind:cleanup.kind,rank:1};
    const fresh=SUPPLY_UNLOCKS.map(x=>x.kind).find(k=>pool.includes(k)&&!this.introduced.includes(k));
    if(fresh){this.reserve[2]={kind:fresh,rank};this.introduced.push(fresh);}
    if(teaching){
      this.lesson='place';
      if(!this.reserveMove()){
        // Preserve the guaranteed new kind in slot 2 and the matching slot 0.
        const original=this.reserve[1];
        for(const kind of ['spring','rail','mortar']){this.reserve[1]={kind,rank:1};if(this.reserveMove())break;this.reserve[1]=original;}
      }
    }
    this.supplyLog.push({wave:this.wave,items:structuredClone(this.reserve),fresh:fresh||null,cleanup:cleanup?{unitId:cleanup.id,kind:cleanup.kind,rank:1}:null});
    this.shopRevision++;return{ok:true};
  }
  partner(source){
    if(source==='land'||source==='land:other'||source==='land:square')return null;
    const u=this.get(source);if(!u||u.rank>=4||fusionRecipe(u.kind)||this.ended||this.choices.length||this.paused)return null;
    const sources=[...this.units.map(x=>x.id),...(typeof source==='number'?['tray',...this.reserve.map((_,i)=>'reserve:'+i)]:[])];
    return sources.find(s=>{const v=this.get(s);return s!==source&&v&&u.kind===v.kind&&u.rank===v.rank;})??null;
  }
  affectedUnits(kind,id){return this.units.filter(u=>u.kind===kind||(id?fusionInherits(u.kind,id):fusionRecipe(u.kind)?.inherits.some(key=>key.startsWith(kind+'-'))));}
  rapid(u){return this.buffs.some(id=>id.endsWith('-speed')&&(id===u.kind+'-speed'||fusionInherits(u.kind,id)));}
  offerUpgrades(){
    if(this.lab||this.ended||this.choices.length||this.xp<(XP_THRESHOLDS[this.upgradeLevel]??Infinity))return;
    const speedTargets=new Set();
    const pool=UPGRADES.filter(u=>{
      if(!u.kind)return u.id!=='repair'||this.hp<100;
      const targets=this.affectedUnits(u.kind,u.id);if(this.buffs.includes(u.id)||!targets.length)return false;
      if(u.effect==='speed'){
        const signature=targets.filter(v=>!this.rapid(v)).map(v=>v.id).sort((a,b)=>a-b).join(',');
        if(!signature||speedTargets.has(signature))return false;speedTargets.add(signature);
      }
      return true;
    });
    for(let i=pool.length-1;i>0;i--){this.upgradeSeed=(this.upgradeSeed*1664525+1013904223)>>>0;const j=Math.floor(this.upgradeSeed/4294967296*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    this.choices=pool.slice(0,3).map(u=>u.id);
    // A depleted pool is a smaller honest choice, not three copies of a reward.
    this.events.push('upgrade');
  }
  chooseUpgrade(index){
    if(this.paused||this.ended||!Number.isInteger(index)||!this.choices[index])return false;
    const id=this.choices[index],u=UPGRADES.find(u=>u.id===id);
    if(u.kind)this.buffs.push(id);else if(id==='supplies')this.changeCoins(5,'upgrade');else this.hp=Math.min(100,this.hp+20);
    this.upgradeLog.push({id,wave:this.wave,xp:this.xp,seconds:Math.round(this.elapsed*10)/10,targets:u.kind?this.affectedUnits(u.kind,id).length:0});
    for(const unit of u.kind?this.affectedUnits(u.kind,id):this.units){const[x,y]=center(unit);this.effects.push({type:'upgrade',x,y,life:.6,max:.6});}
    this.upgradeLevel++;this.choices=[];this.events.push('merge');this.offerUpgrades();return true;
  }
  sellValue(u){return [0,1,1,2,4][u.rank]??0;}
  sell(id){const u=this.get(id);if(!u||typeof id!=='number'||this.stage!=='ready'||this.paused||this.choices.length)return false;this.changeCoins(this.sellValue(u),'salvage',{unitId:u.id,kind:u.kind,rank:u.rank});this.units=this.units.filter(x=>x.id!==id);return true;}
  startWave(){
    if(!['ready','fused'].includes(this.stage)||this.paused||this.tray||this.choices.length)return false;
    if(['refresh','place'].includes(this.lesson))this.lesson='done';
    this.wave++;this.stage=this.lab?'labwave':'wave';this.combatReport=newCombatReport();
    this.waveStart={hp:this.hp,coins:this.coins,units:this.lineup(),elapsed:this.elapsed,cells:this.board.filter(Boolean).length};
    this.waveKills=0;this.waveLeaks=0;this.spawnLeft=this.lab?10:this.waves[this.wave-1].count;
    this.spawnTime=0;this.events.push('start');return true;
  }
  spawn(hp=42,practice=false,kind='patrol',speed=43){
    this.enemies.push({id:this.nextId++,hp,maxHp:hp,d:practice?105:0,practice,kind,speed,flash:0});
  }
  tick(dt){
    if(this.paused||this.ended||this.choices.length)return;
    dt=Math.min(Math.max(dt,0),.05);this.elapsed+=dt;
    this.effects.forEach(e=>e.life-=dt);this.effects=this.effects.filter(e=>e.life>0).slice(-70);
    this.units.forEach(u=>u.recoil=Math.max(0,u.recoil-dt));
    if(!['watch','wave','labwave'].includes(this.stage))return;
    if(this.spawnLeft){
      this.spawnTime-=dt;if(this.spawnTime<=0){
        const w=this.lab?{count:10,hp:100,speed:48,gap:.35,kind:'swarm'}:this.waves[this.wave-1];
        const boss=w.kind==='boss'&&this.spawnLeft===w.count;
        const mixed=!boss&&w.mix?.length?w.mix[(w.count-this.spawnLeft)%w.mix.length]:null;
        this.spawn(boss?(w.bossHp??1050):mixed?.hp??w.hp,false,boss?'boss':mixed?.kind??(w.kind==='boss'?(this.spawnLeft%3===0?'armor':'runner'):w.kind),boss?(w.bossSpeed??27):mixed?.speed??w.speed);
        this.spawnLeft--;this.spawnTime=mixed?.gap??w.gap;
      }
    }
    for(const e of this.enemies){const slowed=e.slowLeft>0;e.d+=dt*(e.practice?9:e.speed)*(slowed?1-(e.slow||0):1);e.slowLeft=Math.max(0,(e.slowLeft||0)-dt);e.shredLeft=Math.max(0,(e.shredLeft||0)-dt);e.flash=Math.max(0,e.flash-dt);}
    for(const u of this.units){
      if(u.kind==='drum')continue;
      u.cooldown-=dt;const stat=STATS[u.kind],[x,y]=center(u);
      const alive=this.enemies.filter(e=>e.hp>0&&e.d<LENGTH).sort((a,b)=>b.d-a.d);
      const first=alive.find(e=>e.practice||Math.hypot(pointAt(e.d)[0]-x,pointAt(e.d)[1]-y)<=stat.range);
      if(u.cooldown>0||!first)continue;
      const rapid=this.rapid(u);
      u.cooldown=stat.interval/((rapid?1.25:1)*(1+this.drumBoost(u)));u.recoil=.13;const [tx,ty]=pointAt(first.d);
      const damage=fusionRecipe(u.kind)?stat.damage/1.85**(4-u.rank):stat.damage*1.85**(u.rank-1);
      const impacts=[];
      const hit=(e,d,blast=false)=>{const before={...e},armor=e.kind==='plated'?.6:e.kind==='armor'?.35:0,amount=d*(1-(blast?0:armor*(e.shredLeft>0?(this.buffs.includes('rivet-duration')?.2:.4):1)));recordHit(this.combatReport,u,e,d,amount,blast);e.hp-=amount;e.flash=.12;const[p,q]=pointAt(e.d);impacts.push({id:e.id,kind:e.kind,x:p,y:q,damage:amount,hp:e.hp,blast,before});};
      if(u.kind==='rivet'){
        if(['armor','plated'].includes(first.kind))first.shredLeft=this.buffs.includes('rivet-duration')?5:3;
        hit(first,damage);
      }else if(u.kind==='arc'||u.kind==='storm'){
        const storm=u.kind==='storm';let target=first;const visited=new Set(),limit=(storm?(u.rank===3?4:6):3)+(this.buffs.includes('arc-chain')?1:0);
        for(let jump=0;target&&jump<limit;jump++){
          visited.add(target.id);hit(target,damage*(storm?.8:.7)**jump);const[p,q]=pointAt(target.d);
          target=alive.filter(e=>e.hp>0&&!visited.has(e.id)).map(e=>({e,d:Math.hypot(pointAt(e.d)[0]-p,pointAt(e.d)[1]-q)})).filter(v=>v.d<=75).sort((a,b)=>a.d-b.d||a.e.id-b.e.id)[0]?.e;
        }
      }else if(u.kind==='frost'){
        const radius=this.buffs.includes('bubble-splash')?78:60;
        for(const e of alive.filter(e=>{const[p,q]=pointAt(e.d);return Math.hypot(p-tx,q-ty)<=radius;})){
          hit(e,damage,true);e.slow=Math.max(e.slowLeft>0?e.slow||0:0,(u.rank===3?.4:.5)*(e.kind==='boss'?.5:1));e.slowLeft=Math.max(e.slowLeft||0,u.rank===3?2.4:3);
        }
        this.effects.push({type:'blast',kind:'frost',x:tx,y:ty,radius,life:.3,max:.3});
      }else if(u.kind==='bubble'){
        hit(first,damage);const victims=this.buffs.includes('bubble-splash')?alive.filter(e=>{const[p,q]=pointAt(e.d);return Math.hypot(p-tx,q-ty)<=45;}):[first];
        for(const e of victims){const slow=.35*(e.kind==='boss'?.5:1);if(!(e.slowLeft>0)||slow>=(e.slow||0)){e.slow=slow;e.slowLeft=Math.max(e.slowLeft||0,1.5+.3*u.rank);}}
      }else if(u.kind==='mortar'){
        alive.filter(e=>{const p=pointAt(e.d);return Math.hypot(p[0]-tx,p[1]-ty)<=(this.buffs.includes('mortar-radius')?68:48);}).forEach(e=>hit(e,damage,true));
        this.effects.push({type:'blast',x:tx,y:ty,radius:this.buffs.includes('mortar-radius')?68:48,life:.3,max:.3});
      }else{
        hit(first,damage);
        if(['spring','fusion'].includes(u.kind)&&this.buffs.includes('spring-bounce')){const other=alive.find(e=>e!==first&&Math.hypot(pointAt(e.d)[0]-tx,pointAt(e.d)[1]-ty)<=80);if(other){hit(other,damage*.5);const[bx,by]=pointAt(other.d);this.effects.push({type:'shot',x:tx,y:ty,tx:bx,ty:by,life:.2,max:.2});}}
        if(u.kind==='rail'||u.kind==='fusion'){
          const len=Math.hypot(tx-x,ty-y),dx=(tx-x)/len,dy=(ty-y)/len;
          const boosted=this.buffs.includes('rail-pierce');
          alive.filter(e=>{if(e===first)return false;const[p,q]=pointAt(e.d),along=(p-x)*dx+(q-y)*dy,cross=Math.abs((p-x)*dy-(q-y)*dx);return along>0&&along<=stat.range&&cross<=(boosted?26:15);}).slice(0,boosted?3:2).forEach(e=>hit(e,damage));
        }
        if(u.kind==='fusion'){
          alive.filter(e=>{const p=pointAt(e.d);return Math.hypot(p[0]-tx,p[1]-ty)<=48;}).forEach(e=>hit(e,25,true));
          this.effects.push({type:'blast',x:tx,y:ty,life:.3,max:.3});
        }
      }
      if(!first.practice){this.combatReport.shots[u.kind]=(this.combatReport.shots[u.kind]||0)+1;if(this.drumBoost(u)>0)this.combatReport.supportShots++;if(['arc','storm'].includes(u.kind))this.combatReport.chainTargets+=impacts.length;}
      this.effects.push({type:'shot',x,y,tx,ty,life:.12,max:.12,sourceId:u.id,kind:u.kind,rank:u.rank,targetId:first.id,impacts,rail:u.kind==='rail'||u.kind==='fusion',mortar:u.kind==='mortar',bubble:u.kind==='bubble'});this.events.push('hit');
    }
    const children=[];
    for(const e of this.enemies){
      if(e.hp<=0){
        if(e.practice){this.stage='second';this.tray={kind:'spring',rank:1};this.events.push('practice');}
        else{this.kills++;this.waveKills++;if(!this.lab&&e.kind!=='mite')this.xp++;
          if(e.kind==='brood')for(let i=0;i<2;i++)children.push({hp:e.maxHp*.3,d:Math.max(0,Math.min(LENGTH-1,e.d+(i?8:-8))),speed:e.speed*1.15});
        }
      }else if(e.d>=LENGTH){
        if(e.practice)e.d=105;
        else{const damage=e.kind==='boss'?40:20;recordLeak(this.combatReport,e,Math.min(this.hp,damage));this.hp=Math.max(0,this.hp-damage);this.leaks++;this.waveLeaks++;this.events.push('leak');this.effects.push({type:'leak',x:26,y:346,damage,life:.65,max:.65});}
      }
    }
    this.enemies=this.enemies.filter(e=>e.hp>0&&e.d<LENGTH);
    for(const child of children){this.spawn(child.hp,false,'mite',child.speed);this.enemies.at(-1).d=child.d;}
    if(this.hp<=0){this.recordWave('lose');this.stage='lose';this.events.push('lose');}
    else if(['wave','labwave'].includes(this.stage)&&!this.spawnLeft&&!this.enemies.length){
      this.passed=this.wave;this.recordWave('clear');
      if(this.lab){this.stage='labend';this.events.push('win');}
      else if(this.wave===this.waves.length){this.stage='win';this.events.push('win');}
      else{this.stage='ready';this.changeCoins(5,'wave');if(landReward(this.wave)){this.landRemaining=Math.min(this.landRemaining+landReward(this.wave),COLS*ROWS-this.board.filter(Boolean).length);this.landSplit=false;this.events.push('land');}if(this.mode==='tutorial'&&this.wave===1&&this.lesson==='waiting')this.lesson='refresh';this.events.push('reward');}
    }
    this.offerUpgrades();
  }
}

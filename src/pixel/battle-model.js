import {Workshop,LEVELS,STATS,FOOTPRINT,COLS,ROWS} from '../engine.js';
export const WEAPONS=['spring','rail','mortar','bubble','drum','fusion','rivet','arc'];
export const ENEMIES=['patrol','runner','swarm','armor','boss','plated','brood','mite'];
export const ENEMY_NAMES={patrol:['发条兵','Clockwork'],runner:['疾轮兵','Runner'],swarm:['齿壳虫','Swarm'],armor:['铁甲卫','Armored'],boss:['重装头领','Boss']};
export const WEAPON_NAMES={spring:['弹簧炮','Spring'],rail:['磁轨炮','Rail'],mortar:['爆米花炮','Popcorn'],bubble:['泡泡枪','Bubble'],drum:['发条鼓','Drum'],fusion:['爆裂轨道炮','Burst rail']};
export const ROLES={spring:['单点弹击','Single target'],rail:['直线贯穿','Piercing'],mortar:['范围爆炸','Area blast'],bubble:['减速控制','Slow'],drum:['邻接鼓舞','Adjacent haste'],fusion:['贯穿＋爆裂','Pierce + blast']};
Object.assign(WEAPON_NAMES,{rivet:['铆钉枪（试验）','Rivet (trial)'],arc:['电弧线圈（试验）','Arc (trial)']});
Object.assign(ENEMY_NAMES,{plated:['重盾卫','Shield guard'],brood:['分裂壳','Brood shell'],mite:['幼虫','Mite']});
Object.assign(ROLES,{rivet:['持续破甲协作','Armor breach'],arc:['近邻连锁','Neighbor chain']});
export const PHASES={early:{name:['初期三武器','Early arsenal'],wave:0,cells:12,units:[['spring',1,0,0],['mortar',1,1,0],['rail',1,0,2]]},control:{name:['泡泡加入','Control joins'],wave:1,cells:16,units:[['spring',2,0,0],['mortar',1,1,0],['bubble',1,3,0],['rail',2,0,3]]},support:{name:['鼓舞组合','Support joins'],wave:3,cells:18,units:[['spring',3,0,0],['mortar',2,1,0],['bubble',2,3,0],['drum',2,0,2],['rail',3,0,3]]},fusion:{name:['后期融合','Late fusion'],wave:7,cells:20,units:[['spring',4,0,0],['mortar',4,1,0],['bubble',4,3,0],['drum',4,0,2],['fusion',4,0,3]]}};
const enemyWave={patrol:0,runner:1,swarm:2,armor:3,boss:4,plated:3,brood:2,mite:2};
export function createBattle({weapon='spring',rank=1,enemy='patrol',phase='single',level=0,wave}={}){
 const game=new Workshop();game.reset('run',LEVELS[level]?level:0);game.units=[];game.reserve=[null,null,null];game.landRemaining=0;
 const p=PHASES[phase];const authored=game.level.waves[p?(wave??p.wave):enemyWave[ENEMIES.includes(enemy)?enemy:'patrol']];
 game.waves=[{...authored,...(!p&&['plated','brood','mite'].includes(enemy)?{kind:enemy}:{})}];game.board=Array.from({length:COLS*ROWS},(_,i)=>i%COLS<4&&Math.floor(i/COLS)*4+i%COLS<(p?.cells??20));
 if(p)for(const args of p.units)game.add(...args);
 else {const k=WEAPONS.includes(weapon)?weapon:'spring',tier=k==='fusion'?4:Math.min(4,Math.max(1,Math.round(rank)||1));game.add(k,tier,0,0);if(k==='drum')game.add('spring',tier,1,0);}
 return game;
}
export function setBattleRank(game,rank){
 if(game.stage!=='ready'||game.paused||game.choices.length)return false;
 const tier=Math.min(4,Math.max(1,Math.round(rank)||1));for(const u of game.units)if(u.kind!=='fusion')u.rank=tier;return true;
}
export function statLine(kind,rank){const s=STATS[kind];return kind==='drum'?{boost:.1+.05*rank}: {damage:kind==='fusion'?65:s.damage*1.85**(rank-1),interval:s.interval,range:s.range};}
export {STATS,FOOTPRINT};

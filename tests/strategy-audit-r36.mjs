import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workshop,COLS,adjacent,LEVELS,STATS,LENGTH} from '../src/engine.js';
import {upgradeIndex} from './balance.mjs';
const policies=[
 {id:'baseline'}, {id:'no-new',omit:['rivet','arc']},
 {id:'tier-two-field',fusion:false,cap:2},{id:'spread-first',fusion:false,placeFirst:true},
 {id:'no-fusion',fusion:false},{id:'no-support',omit:['bubble','drum']},
 {id:'no-drum',omit:['drum']},{id:'no-bubble',omit:['bubble']},
 {id:'reverse-layout',reverse:true},{id:'basic-first',order:['spring','rail','rivet','arc','bubble','drum']},
 {id:'no-merges',merge:false,fusion:false},{id:'one-refresh',batches:2},
 {id:'offensive-upgrades',upgrades:'mixed'}, {id:'first-card',upgrades:'first'},
];
function move(g,p){
 const land=g.landMove();if(land)return land;
 if(p.fusion!==false){const f=g.fusionMove();if(f)return f;}
 if(p.merge!==false&&!p.placeFirst)for(const u of g.units)for(const v of g.units)if(u.id!==v.id&&u.rank<(p.cap||4)){const q=g.preview(u.id,v.c,v.r);if(q.ok&&q.type==='merge')return{source:u.id,c:v.c,r:v.r};}
 const cells=Array.from({length:g.rows*COLS},(_,i)=>[i%COLS,Math.floor(i/COLS)]);if(p.reverse)cells.reverse();
 for(const type of (p.merge===false?['place']:p.placeFirst?['place','merge']:['merge','place']))for(const kind of p.order||['rivet','arc','bubble','drum','rail','mortar','spring'])for(let i=0;i<3;i++){
  if(p.omit?.includes(kind)||g.reserve[i]?.kind!==kind||type==='merge'&&g.reserve[i].rank>=(p.cap||4))continue;
  for(const[c,r]of cells){const q=g.preview('reserve:'+i,c,r);if(!q.ok||q.type!==type)continue;
   if(type==='place'&&['bubble','drum'].includes(kind)&&g.units.some(u=>u.kind===kind))continue;
   if(type==='place'&&kind==='drum'&&!g.units.some(u=>u.kind!=='drum'&&adjacent({kind,c,r},u)))continue;
   return{source:'reserve:'+i,c,r};
  }
 }return null;
}
const results=[];
const modern=process.env.QA_MODERN==='1';
function supportScore(g,units){return units.reduce((sum,u)=>sum+(STATS[u.kind]?.damage||0)/(STATS[u.kind]?.interval||1)*(u.kind==='fusion'?1:1.85**(u.rank-1))*Math.max(0,...units.filter(d=>d.kind==='drum'&&adjacent(d,u)).map(d=>.1+.05*d.rank+(g.buffs.includes('drum-boost')?.1:0))),0);}
function rearrange(g){
 let best,score=supportScore(g,g.units);
 for(const a of g.units)for(const b of g.units){
  if(a.id>=b.id)continue;const q=g.preview(a.id,b.c,b.r);if(!q.ok||q.type!=='swap')continue;
  const candidate=g.units.map(u=>u.id===a.id?{...u,c:b.c,r:b.r}:u.id===b.id?{...u,c:a.c,r:a.r}:u),next=supportScore(g,candidate);
  if(next>score+.01){score=next;best={source:a.id,c:b.c,r:b.r};}
 }
 if(!best)return false;assert(g.place(best.source,best.c,best.r).ok);return true;
}
const mix=process.env.QA_MIX||null;
if(mix){
 assert(['escort','pulse','light','ambush','reinforcements'].includes(mix));
 for(const level of [4,5])for(const wave of [2,3,4,5]){
  if(['ambush','reinforcements'].includes(mix)&&wave>3)continue;
  const w=LEVELS[level].waves[wave],normal={kind:w.kind,hp:w.hp,speed:w.speed,gap:w.gap};
  const guard={kind:level===4?'plated':'armor',hp:Math.round(w.hp*(mix==='light'?1.5:2)),speed:w.speed*.8,gap:w.gap};
  const runner={kind:'runner',hp:Math.round(w.hp*.8),speed:mix==='light'?80:95,gap:w.gap};
  w.mix=mix==='pulse'?[guard,normal,runner,runner,normal,normal]:[guard,normal,normal,runner,normal,normal];
  if(mix==='ambush')w.mix=[{...guard,hp:w.hp*3},normal,normal,{...runner,speed:110},normal,normal];
  if(mix==='reinforcements'){
   w.count+=Math.ceil(w.count/4);
   w.mix=[normal,normal,normal,normal,{...runner,speed:110}];
  }
 }
}
const finalGap=process.env.QA_FINAL_GAP?Number(process.env.QA_FINAL_GAP):null;
if(finalGap){assert(finalGap>0&&finalGap<=1);LEVELS[5].waves[7].gap=finalGap;}
// Explicit offline sensitivity override; never imported by the production game.
const probe=process.env.QA_HP_SCALE?JSON.parse(process.env.QA_HP_SCALE):null;
if(probe)for(const level of [4,5])LEVELS[level].waves.forEach((w,i)=>{w.hp=Math.round(w.hp*(probe[i]??1));});
const curves=process.env.QA_HP_CURVES?JSON.parse(process.env.QA_HP_CURVES):null;
if(curves)for(const level of [4,5])LEVELS[level].waves.forEach((w,i)=>{w.hp=curves[level-4][i];});
for(const level of [4,5])for(const seed of [9173,1,42,2026,65537])for(const p of policies){
 const g=new Workshop();g.reset('run',level);g.seed=seed;
 let actions=0,reserveMerges=0,swaps=0;const pressure=[],seen=new WeakSet(),damage={},shots={},chain={shots:0,targets:0},breach={allyDamage:0};
 for(let w=0;w<8&&!g.ended;w++){
  for(let b=0;b<(p.batches||3);b++){
   for(let n=0;n<60;n++){
    const m=move(g,p);if(m){assert(g.place(m.source,m.c,m.r).ok);actions++;continue;}
    let merged=false;if(modern&&p.merge!==false)for(let i=0;i<3&&!merged;i++)for(let j=i+1;j<3&&!merged;j++)if(g.get('reserve:'+i)?.rank<(p.cap||4)&&g.reservePreview('reserve:'+i,'reserve:'+j).ok){assert(g.mergeReserve('reserve:'+i,'reserve:'+j).ok);merged=true;reserveMerges++;}
    if(!merged)break;
   }
   if(g.coins<5||b===(p.batches||3)-1)break;assert(g.refresh(true).ok);
  }
  if(modern)for(let n=0;n<3;n++){if(!rearrange(g))break;swaps++;}
  assert(g.startWave());let ticks=0;
  while(!g.ended&&(g.stage==='wave'||g.choices.length)){
   assert(++ticks<16000,'simulation bounded');
   if(g.choices.length)g.chooseUpgrade(p.upgrades==='first'?0:upgradeIndex(g,p.upgrades||'trial'));else g.tick(1/60);
   pressure[w]=Math.max(pressure[w]||0,...g.enemies.map(e=>e.d/LENGTH));
   for(const fx of g.effects){if(fx.type!=='shot'||!fx.impacts||seen.has(fx))continue;seen.add(fx);shots[fx.kind]=(shots[fx.kind]||0)+1;
    if(fx.kind==='arc'){chain.shots++;chain.targets+=fx.impacts.length;}
    for(const hit of fx.impacts){const effective=Math.max(0,Math.min(hit.damage,hit.before.hp));damage[fx.kind]=(damage[fx.kind]||0)+effective;
     if(fx.kind!=='rivet'&&hit.before.shredLeft>0&&['armor','plated'].includes(hit.kind)&&!hit.blast)breach.allyDamage+=effective;
    }
   }
  }
 }
 results.push({level:level+1,seed,policy:p.id,stage:g.stage,hp:g.hp,wave:g.wave,actions,reserveMerges,swaps,pressure,history:g.history,units:g.lineup(),upgrades:g.upgradeLog,coins:g.coins,damage,shots,chain,breach});
}
const summary=[5,6].flatMap(level=>policies.map(p=>{const rows=results.filter(r=>r.level===level&&r.policy===p.id),live=rows.find(r=>r.seed===9173);return{level,policy:p.id,wins:rows.filter(r=>r.stage==='win').length,total:rows.length,live:live.stage,liveHp:live.hp,liveWave:live.wave,liveWaveHp:live.history.map(h=>h.hp),minHp:Math.min(...rows.map(r=>r.hp)),maxHp:Math.max(...rows.map(r=>r.hp))};}));
const out=process.env.QA_OUT||'_qa/strategy-r36';await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/results.json',JSON.stringify({build:process.env.QA_BUILD||'working-tree',modern,mix,finalGap,probe,curves,actualWaves:LEVELS.slice(4).map(l=>l.waves),actualHpCurves:LEVELS.slice(4).map(l=>l.waves.map(w=>w.hp)),note:'9173 is production seed. Other supply seeds are offline sensitivity probes; upgrade seed remains 4517. Not human win rates.',results,summary},null,2));
console.table(summary.map(({liveWaveHp,...r})=>r));

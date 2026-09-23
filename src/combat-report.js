// Read-only accounting. Never changes combat, targeting, RNG or rewards.
export const newCombatReport=()=>({damage:{},ranks:{},shots:{},leaked:{},supportShots:0,chainTargets:0,breachExtra:0});
export function recordHit(report,unit,enemy,raw,actual,blast=false){
 if(enemy.practice)return;
 const effective=Math.max(0,Math.min(enemy.hp,actual));
 report.damage[unit.kind]=(report.damage[unit.kind]||0)+effective;
 report.ranks[unit.kind]=Math.max(report.ranks[unit.kind]||0,unit.rank);
 const armor=enemy.kind==='plated'?.6:enemy.kind==='armor'?.35:0;
 if(unit.kind!=='rivet'&&!blast&&armor&&enemy.shredLeft>0){
  report.breachExtra+=Math.max(0,effective-Math.max(0,Math.min(enemy.hp,raw*(1-armor))));
 }
}
export function recordLeak(report,enemy,damage){
 const row=report.leaked[enemy.kind]||={count:0,remaining:0,boxDamage:0};
 row.count++;row.remaining+=Math.max(0,Math.min(1,enemy.hp/enemy.maxHp));row.boxDamage+=damage;
}
export function reportView(report){
 if(!report)return null;
 const total=Object.values(report.damage).reduce((a,b)=>a+b,0);
 const damage=Object.entries(report.damage).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([kind,value])=>({kind,value,rank:report.ranks[kind],percent:total?Math.round(value/total*100):0}));
 const leaks=Object.entries(report.leaked).map(([kind,row])=>({kind,count:row.count,remaining:Math.round(row.remaining/row.count*100),boxDamage:row.boxDamage})).sort((a,b)=>b.count-a.count||b.boxDamage-a.boxDamage||a.kind.localeCompare(b.kind));
 const first=leaks[0],hint=!first?'reportClean':first.remaining<=25?'reportNear':first.kind==='plated'||first.kind==='armor'?'reportArmor':first.kind==='brood'||first.kind==='mite'?'reportCrowd':first.kind==='boss'?'reportBoss':'reportCoverage';
 return{damage,leaks,hint,total,supportShots:report.supportShots,chainTargets:report.chainTargets,breachExtra:Math.round(report.breachExtra)};
}

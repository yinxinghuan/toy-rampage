// Fixed authoring coefficients for the later curve only.
// Level 1 and chapter 2's first four waves never pass through balanceWave.
// These are not measured player difficulty or win probabilities.
export const DIFFICULTY = {
  healthMultiplier:2.4,
  chapterHealthAdjustment:[1,.9,1,1,1,1],
  baseHp:40,
  waveGrowth:1.28,
  chapterHp:[.82,.92,1.02,1.10,1.19,1.29],
  roleHp:{patrol:1,runner:.9,swarm:1,armor:1.35,plated:.7,brood:.645},
  bossEscortHp:[.95,.95,.95,.95,.56,.595],
  guardHp:[1.5,1.8,2,2.2,2.4,2.6],
  runnerSpeed:[76,84,92,98,104,110],
  openingSpeed:[.92,.96,1,1,1,1],
  openingGap:[1.20,1.16,1.12,1.08,1.04,1],
  bossBaseHp:1800,
  bossChapterStep:480,
  minibossShare:.30,
};

const smoothstep=t=>t*t*(3-2*t);
const round2=n=>Math.round(n*100)/100;

export function balanceWave(wave,chapter,waveIndex,healthMultiplier=DIFFICULTY.healthMultiplier,healthAdjustment=DIFFICULTY.chapterHealthAdjustment[chapter]){
  const d=DIFFICULTY,t=waveIndex/7,s=smoothstep(t);
  const role=wave.kind==='boss'?d.bossEscortHp[chapter]:d.roleHp[wave.kind];
  const w={...wave,
    hp:Math.round(d.baseHp*d.waveGrowth**waveIndex*d.chapterHp[chapter]*role),
    speed:round2(wave.speed*(d.openingSpeed[chapter]+(1-d.openingSpeed[chapter])*s)),
    gap:round2(wave.gap*(d.openingGap[chapter]+(1-d.openingGap[chapter])*s)),
  };
  if(w.kind==='boss'){
    const finalHp=d.bossBaseHp+d.bossChapterStep*chapter;
    w.bossHp=Math.round(finalHp*(waveIndex===7?1:d.minibossShare));
  }
  // Combinations on waves 3 and 4. Chapter 1 is not passed through this function.
  if(waveIndex===2||waveIndex===3){
    const normal={kind:w.kind,hp:w.hp,speed:w.speed,gap:w.gap};
    w.mix=[
      {kind:chapter===4?'plated':'armor',hp:Math.round(w.hp*d.guardHp[chapter]),speed:round2(w.speed*.8),gap:w.gap},
      {...normal},{...normal},
      {kind:'runner',hp:Math.round(w.hp*.8),speed:d.runnerSpeed[chapter],gap:w.gap},
      {...normal},{...normal},
    ];
  }
  // Preserve integer HP. The ten-percent cut applies only to chapter two.
  const scaledHp=hp=>Math.round(Math.round(hp*healthMultiplier)*healthAdjustment);
  w.hp=scaledHp(w.hp);
  if(w.bossHp)w.bossHp=scaledHp(w.bossHp);
  if(w.mix)for(const enemy of w.mix)enemy.hp=scaledHp(enemy.hp);
  return w;
}

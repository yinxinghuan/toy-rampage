// Authored playtest curve. No adaptive scaling; all levels share the same economy.
export const LEVELS = [
  {id:'first-night',title:'level1',focus:'focus1',waves:[
    {kind:'patrol',count:8,hp:42,speed:43,gap:1.1},
    {kind:'runner',count:12,hp:42,speed:66,gap:.62},
    {kind:'swarm',count:20,hp:65,speed:49,gap:.3},
    {kind:'armor',count:11,hp:145,speed:40,gap:.9},
    {kind:'boss',count:15,hp:100,speed:52,gap:.65},
    {kind:'swarm',count:26,hp:190,speed:60,gap:.28},
    {kind:'armor',count:18,hp:280,speed:48,gap:.45},
    {kind:'boss',count:28,hp:245,speed:66,gap:.4,bossHp:3300,bossSpeed:28},
  ]},
  {id:'quick-feet',title:'level2',focus:'focus2',waves:[
    {kind:'runner',count:10,hp:36,speed:68,gap:.7},
    {kind:'runner',count:14,hp:41,speed:74,gap:.55},
    {kind:'swarm',count:20,hp:55,speed:68,gap:.3},
    {kind:'runner',count:18,hp:83,speed:80,gap:.48},
    {kind:'boss',count:18,hp:85,speed:74,gap:.5,bossHp:935,bossSpeed:29},
    {kind:'runner',count:26,hp:180,speed:86,gap:.3},
    {kind:'swarm',count:30,hp:210,speed:78,gap:.25},
    {kind:'boss',count:30,hp:235,speed:82,gap:.35,bossHp:3500,bossSpeed:32},
  ]},
  {id:'iron-tide',title:'level3',focus:'focus3',waves:[
    {kind:'swarm',count:16,hp:55,speed:49,gap:.3},
    {kind:'armor',count:10,hp:90,speed:42,gap:.5},
    {kind:'swarm',count:26,hp:90,speed:52,gap:.24},
    {kind:'armor',count:15,hp:155,speed:42,gap:.5},
    {kind:'boss',count:22,hp:120,speed:56,gap:.35,bossHp:1200,bossSpeed:28},
    {kind:'swarm',count:32,hp:195,speed:58,gap:.24},
    {kind:'armor',count:22,hp:320,speed:46,gap:.38},
    {kind:'boss',count:30,hp:280,speed:60,gap:.3,bossHp:4000,bossSpeed:28},
  ]},
  {id:'last-shift',title:'level4',focus:'focus4',waves:[
    {kind:'runner',count:12,hp:38,speed:72,gap:.55},
    {kind:'swarm',count:22,hp:56,speed:58,gap:.27},
    {kind:'armor',count:13,hp:98,speed:45,gap:.5},
    {kind:'runner',count:22,hp:86,speed:78,gap:.35},
    {kind:'boss',count:24,hp:108,speed:64,gap:.3,bossHp:1100,bossSpeed:30},
    {kind:'runner',count:30,hp:210,speed:82,gap:.25},
    {kind:'armor',count:24,hp:290,speed:52,gap:.35},
    {kind:'boss',count:34,hp:275,speed:75,gap:.3,bossHp:4200,bossSpeed:30},
  ]},
];
// Explicit optional test chapters: the original four remain the control group.
LEVELS.push(
 {id:'armor-test',title:'level5',focus:'focus5',experiment:'rivet',waves:[
  ...[[8,45,38,.9],[10,60,40,.7],[12,75,42,.6],[14,85,44,.5],[16,95,46,.45],[18,105,48,.4],[20,115,50,.35]].map(([count,hp,speed,gap])=>({kind:'plated',count,hp,speed,gap})),
  {...LEVELS[3].waves[7],hp:125,bossHp:2500},
 ]},
 {id:'chain-test',title:'level6',focus:'focus6',experiment:'arc',waves:[
  ...[[8,40,43,.8],[10,55,45,.65],[12,65,47,.55],[14,75,49,.5],[16,85,51,.45],[18,100,53,.4],[20,120,55,.35]].map(([count,hp,speed,gap])=>({kind:'brood',count,hp,speed,gap})),
  {...LEVELS[3].waves[7],hp:170,gap:.5},
 ]}
);

// r42: an authored front guard and runner every six spawns. The opening two
// waves and boss parameters are unchanged; no player-dependent difficulty.
for(const [levelIndex,level] of LEVELS.entries())for(const [waveIndex,w] of level.waves.entries()){
  if(levelIndex===1&&waveIndex>=5)w.hp=Math.round(w.hp*.84);
  if(levelIndex===3&&waveIndex>=5)w.hp=Math.round(w.hp*.76);
  if(levelIndex<4&&waveIndex>=2&&waveIndex<=4&&w.kind!=='boss'){
    const normal={kind:w.kind,hp:w.hp,speed:w.speed,gap:w.gap};
    w.mix=[{kind:'armor',hp:w.hp*3,speed:w.speed*.8,gap:w.gap},normal,normal,{kind:'runner',hp:Math.round(w.hp*.85),speed:Math.max(w.speed,110),gap:w.gap},normal,normal];
  }
}

// Six-step strategy pass: preserve the two learning waves and the entire late
// curve. A tougher escort distracts fire while one runner crosses the gap.
for(const levelIndex of [4,5])for(const waveIndex of [2,3]){
  const w=LEVELS[levelIndex].waves[waveIndex],normal={kind:w.kind,hp:w.hp,speed:w.speed,gap:w.gap};
  w.mix=[{kind:levelIndex===4?'plated':'armor',hp:w.hp*3,speed:w.speed*.8,gap:w.gap},normal,normal,{kind:'runner',hp:Math.round(w.hp*.8),speed:110,gap:w.gap},normal,normal];
}

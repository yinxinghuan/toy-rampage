import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Workshop,SimulationClock,LEVELS,WAVES} from '../src/engine.js';
import {DIFFICULTY} from '../src/difficulty.js';
import {simulate} from './balance.mjs';
const round2=n=>Math.round(n*100)/100;

test('authored mixed waves spawn a deterministic sequence without changing boss identity',()=>{
 for(const boss of [false,true]){const g=new Workshop();g.reset('run');g.units=[];g.waves=structuredClone(g.waves);
  g.waves[0]={kind:boss?'boss':'swarm',count:4,hp:70,speed:40,gap:.15,bossHp:500,bossSpeed:20,mix:[{kind:'armor',hp:120,speed:30,gap:.1},{kind:'runner',hp:45,speed:90,gap:.2}]};
  assert(g.startWave());for(let i=0;i<30&&g.spawnLeft;i++)g.tick(.05);
  assert.equal(g.enemies.length,4);assert.deepEqual(g.enemies.map(e=>e.kind),[boss?'boss':'armor','runner','armor','runner']);
  assert.deepEqual(g.enemies.map(e=>e.maxHp),[boss?500:120,45,120,45]);assert.equal(g.enemies[0].speed,boss?20:30);
 }
});

test('six authored levels retain opening parameters and advertise deterministic mixed midwaves',()=>{
  assert.equal(LEVELS.length,6);assert.equal(new Set(LEVELS.map(l=>l.id)).size,6);assert.equal(LEVELS.slice(0,4).some(l=>l.experiment),false);
  assert.equal(WAVES,LEVELS[0].waves);
  assert.deepEqual(WAVES.slice(0,5).map(w=>[w.count,w.hp,w.speed,w.gap]),[[8,42,43,1.1],[12,42,66,.62],[20,65,49,.3],[11,145,40,.9],[15,100,52,.65]]);
  for(const l of LEVELS){assert.equal(l.waves.length,8);for(const w of l.waves)for(const k of ['count','hp','speed','gap'])assert.ok(w[k]>0);}
  for(const l of LEVELS){assert(!l.waves[0].mix);assert(!l.waves[1].mix);}
  for(const l of LEVELS.slice(0,2))for(const w of l.waves.slice(2,4)){assert.equal(w.mix.length,6);assert.equal(w.mix[0].kind,'armor');assert.equal(w.mix[0].hp,w.hp*3);assert.equal(w.mix[3].kind,'runner');assert.equal(w.mix[3].speed,110);}
  assert(LEVELS[1].waves.slice(4).every(w=>!w.mix));
  assert.equal(LEVELS[1].waves[4].bossHp,1478);assert.equal(LEVELS[1].waves[7].bossHp,4925);
  for(const [offset,l] of LEVELS.slice(2).entries()){
    const chapter=offset+2;
    assert(l.waves.slice(4).every(w=>!w.mix));
    for(const w of l.waves.slice(2,4)){
      assert.equal(w.mix.length,6);assert.equal(w.mix[0].kind,chapter===4?'plated':'armor');
      assert.equal(w.mix[0].speed,round2(w.speed*.8));
      assert.equal(w.mix[3].kind,'runner');assert.equal(w.mix[3].speed,DIFFICULTY.runnerSpeed[chapter]);
      assert(w.mix.every(e=>e.gap===w.gap));assert.equal(w.mix.filter(e=>e.kind===w.kind&&e.hp===w.hp&&e.speed===w.speed).length,4);
    }
    if(chapter>=4)assert.deepEqual(l.waves.slice(0,4).map(w=>w.count),[8,10,12,14]);
  }
  assert.deepEqual(LEVELS.slice(2).map(l=>l.waves[7].bossHp),[6624,7776,8928,10080]);
});
test('render frame partition and speed do not change combat outcomes',()=>{
  const drive=(hz,speed)=>{const g=new Workshop(),clock=new SimulationClock();g.reset('run',3);g.place('reserve:2',1,0);g.place('reserve:1',0,2);g.startWave();for(let i=0;i<hz*40/speed;i++){if(g.choices.length)g.chooseUpgrade(0);clock.advance(g,1/hz,speed);}return g.report();};
  const baseline=drive(60,1);for(const hz of [20,30,120])for(const speed of [1,2])assert.deepEqual(drive(hz,speed),baseline);
});
test('retry and next level reset power, economy, history, lesson and seed',()=>{
  const g=new Workshop();g.reset('run',2);g.hp=20;g.coins=33;g.add('mortar',4,2,1);g.seed=1;g.history.push({wave:1});g.wave=5;g.passed=5;g.stage='win';g.paused=true;
  assert.equal(g.nextLevel(),true);assert.equal(g.levelIndex,3);assert.equal(g.hp,100);assert.equal(g.coins,0);assert.equal(g.seed,9173);assert.equal(g.wave,0);assert.equal(g.paused,false);assert.equal(g.lesson,'done');assert.deepEqual(g.history,[]);
  assert.deepEqual(g.lineup(),[{kind:'spring',rank:2,c:1,r:2},{kind:'rail',rank:1,c:1,r:4}]);
  assert.equal(g.nextLevel(),false);g.stage='win';assert.equal(g.nextLevel(),true);assert.equal(g.levelIndex,4);g.reset('run',5);g.stage='win';assert.equal(g.nextLevel(),false);g.retry();assert.equal(g.levelIndex,5);assert.equal(g.stage,'ready');
});
test('invalid selection is safely clamped, tutorial and fusion stay separate',()=>{
  const g=new Workshop();for(const i of [-1,6,NaN,'2',1.5]){g.reset('run',i);assert.equal(g.levelIndex,0);}
  g.reset('tutorial',3);assert.equal(g.stage,'place');assert.equal(g.levelIndex,0);assert.equal(g.board.filter(Boolean).length,12);
  g.reset('lab',3);assert.equal(g.stage,'fusion');assert.equal(g.levelIndex,0);
});
test('failed wave is recorded once and reports are detached from later moves',()=>{
  const g=new Workshop();g.reset('run',3);g.units=[];g.startWave();for(let i=0;i<2000&&!g.ended;i++)g.tick(.05);
  assert.equal(g.stage,'lose');assert.equal(g.history.length,1);const h=g.history[0];assert.equal(h.outcome,'lose');assert.equal(h.startHp,100);assert.equal(h.hp,0);assert.equal(h.leaks,5);assert.ok(h.seconds>0);
  const report=g.report();g.recordWave('lose');assert.equal(g.history.length,1);g.history[0].hp=90;assert.equal(report.history[0].hp,0);g.retry();assert.equal(report.outcome,'lose');assert.equal(report.level,4);
});
test('wave records preserve before and after builds and exclude preparation time',()=>{
  const g=new Workshop();g.reset('run');g.tick(.05);g.startWave();const initial=g.lineup();g.units[0].c=3;g.tick(.05);g.recordWave('abandoned');
  assert.deepEqual(g.history[0].startUnits,initial);assert.equal(g.history[0].units[0].c,3);assert.equal(g.history[0].outcome,'abandoned');assert.ok(g.history[0].seconds<=.1);
});
test('two deployment policies finish the opening chapters; the later curve is a measured loss',()=>{
  for(let level=0;level<3;level++){
    for(const policy of ['blast','mixed']){const r=simulate(policy,level);assert.equal(r.stage,'win',`${level+1} ${policy}`);assert.equal(r.history.length,8);assert.ok(r.hp>0);assert.deepEqual(simulate(policy,level),r);}
    assert.equal(simulate('idle',level).stage,'lose');assert.equal(simulate('empty',level).stage,'lose');
  }
  assert.deepEqual([0,1,2].map(l=>simulate('blast',l).hp),[100,60,40]);
  assert.deepEqual([0,1,2].map(l=>simulate('mixed',l).hp),[100,60,100]);
  for(const policy of ['blast','mixed','trial-no-fusion','idle','empty']){const r=simulate(policy,3);assert.equal(r.stage,'lose',policy);assert.equal(r.hp,0);}
  assert.deepEqual(simulate('blast',3).history.map(h=>h.hp),[40,0]);
  assert.deepEqual(simulate('mixed',3).history.map(h=>h.hp),[40,0]);
  assert.equal(simulate('trial-no-fusion',1).stage,'lose');
  assert.deepEqual(simulate('trial-no-fusion',1).history.map(h=>h.hp),[100,100,100,100,100,0]);
});

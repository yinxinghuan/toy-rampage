import {pick} from './copy.js';
import {WEAPONS as ALL_WEAPONS,ENEMIES as ALL_ENEMIES,WEAPON_NAMES,ENEMY_NAMES,ROLES,PHASES,createBattle,setBattleRank} from './battle-model.js';
// This asset-review gallery contains only finished source sheets. Component-built
// trial weapons are playable in chapters 5/6, not advertised as downloadable art.
const WEAPONS=ALL_WEAPONS.filter(k=>!['rivet','arc'].includes(k)),ENEMIES=ALL_ENEMIES.filter(k=>!['plated','brood','mite'].includes(k));
import {SimulationClock,LEVELS} from '../engine.js';
import {assetFor} from './assets.js';
import {BattleArt,loadBattleArt} from './battle-art.js';
import {battleAudio} from './battle-audio.js';
import './battle.css';
import {richDialog} from './dialogs.js';
import {cropBenchCanvas} from './bench.js';
import {audioSettings} from './audio-controls.js';
const tx=(zh,en)=>pick([zh,en]),base=new URL('../animation/battle-v1/',document.baseURI),url=p=>new URL(p,base).href;
const weaponURL=k=>k==='fusion'?url('aim/fusion/static.png'):assetFor(k).src;
const upgrades={ 'spring-bounce':['弹射 +1','Bounce +1'],'rail-pierce':['贯穿 +1','Pierce +1'],'mortar-radius':['爆炸范围扩大','Larger blast'],'bubble-splash':['泡泡扩散','Splash slow'],'drum-boost':['鼓舞 +10%','Haste +10%'],'supplies':['补给 +5','Supply +5'],'repair':['修复 20','Repair 20']};
const upgradeName=id=>upgrades[id]?pick(upgrades[id]):pick(WEAPON_NAMES[id.replace('-speed','')])+' '+tx('攻速 +25%','speed +25%');
export function battleExperiment(scene){return `<section class="px-battle" data-ready="loading"><header class="px-battle__intro"><span class="px-review-status">${tx('真实伤害 · 动态敌人 · 六种打击','Real damage · Moving enemies · Six effects')}</span><h2>${tx('让每一种命中，都不一样','Make every hit feel different')}</h2><p>${tx('选一件武器，切换阶位，再开始测试。','Choose a weapon and tier, then start the test.')}</p></header>
 <div class="px-battle__weapons" role="group" aria-label="${tx('测试武器','Test weapon')}">${WEAPONS.map(k=>`<button data-battle-weapon="${k}" disabled><img src="${weaponURL(k)}" alt="" draggable="false"><b>${pick(WEAPON_NAMES[k])}</b><small>${pick(ROLES[k])}</small></button>`).join('')}</div>
 <div class="px-battle__ranks" role="group" aria-label="${tx('升级外观','Tier appearance')}">${[1,2,3,4].map(r=>`<button data-battle-rank="${r}" disabled>${r}<span>${tx('阶','tier')}</span></button>`).join('')}<button data-battle="upgrade" disabled>${tx('升一阶','Tier up')}</button></div>
 <div class="px-battle__enemies" role="group" aria-label="${tx('测试敌人','Test enemy')}">${ENEMIES.map(k=>`<button data-battle-enemy="${k}" disabled><img src="${url(`enemy/${k}/frame-0.png`)}" alt="" draggable="false"><span>${pick(ENEMY_NAMES[k])}</span></button>`).join('')}</div>
 <p class="px-battle__status" role="status">${tx('正在装配动画素材…','Loading animated parts…')}</p>
 ${scene}
 <div class="px-battle__tools"><button data-battle="sound" aria-pressed="false">${tx('音效：关','Sound: off')}</button><button data-battle="idle" aria-pressed="true">${tx('待机细节：开','Idle detail: on')}</button><button data-battle="clear" disabled>${tx('空阵容对照','Empty board')}</button></div>
 <details class="px-battle__details"><summary>${tx('组合与波次压力测试','Loadouts and wave pressure')}</summary><p>${tx('免费测试阵容，不代表正常构筑进度。敌人参数取自原四关八波；切换会重新布阵。','Free test loadouts, not normal progression. Enemy values come from the four eight-wave levels. Changes reset this experiment.')}</p><div class="px-battle__phases">${Object.entries(PHASES).map(([id,p])=>`<button data-battle-phase="${id}" disabled>${pick(p.name)}</button>`).join('')}</div><label>${tx('关卡参数','Level parameters')}<select data-battle-level>${LEVELS.map((l,i)=>`<option value="${i}">${i+1}</option>`).join('')}</select></label><p>${tx('初期三种；第1波后加入泡泡；第3波后加入鼓；3阶弹簧与3阶磁轨融合为4阶爆裂轨道炮。原构筑试玩仍保留。','Three starter types; Bubble after wave 1, Drum after wave 3. Tier-3 Spring + Rail fuse into tier-4 Burst rail. The original build-and-merge playtest remains available.')}</p></details>
 <details class="px-battle__details"><summary>${tx('序列帧与等级结构对照','Frames and tier structures')}</summary><div class="px-battle__gallery">${WEAPONS.map(k=>`<figure><figcaption>${pick(WEAPON_NAMES[k])} · ${pick(ROLES[k])}</figcaption>${['spring','mortar','bubble'].includes(k)?`<img src="${url(`../projectile-v1/${k}/sheet.png`)}" alt="${tx('四帧实体弹体','Four-frame projectile')}" loading="lazy">`:''}<img src="${url(`fx/${k}/sheet.png`)}" alt="${tx('六帧命中特效','Six-frame impact effect')}" loading="lazy"><a href="${url(`fx/${k}/sheet.png`)}" download>${tx('下载特效','Download FX')}</a>${k!=='fusion'?`<img src="${url(`upgrade/${k}/sheet.png`)}" alt="${tx('2、3、4阶结构附件','Tier 2, 3, 4 attachments')}" loading="lazy">`:''}</figure>`).join('')}</div><p>${tx('敌人行走和命中效果均为序列帧。弹簧炮与鼓有机械动作；其余炮头沿用8方向，专属枪口/命中特效先接入，尚未生成每一方向的机械后坐帧。','Enemy walks and impacts use sprite frames. Spring and Drum have mechanical motion; other heads use eight directions with dedicated muzzle/impact FX, not yet per-direction mechanical recoil frames.')}</p></details></section>`;}
export function mountBattle(root){
 const host=root.querySelector('.px-battle');if(!host)return()=>{};
 host.insertAdjacentHTML('beforeend',`<details class="px-battle__details"><summary>${tx('待机细节与独立素材','Idle details and separate assets')}</summary><p>${tx('不必开战：准备时就能看见轻微动作。弹簧舒张、鼓槌轻抬；其他四种用局部四帧表现线圈、小泡和轻汽。下方“待机细节”开关只作动静对照，不重置战斗。','No need to start: quiet motion is visible during preparation. Spring breathes, Drum lifts its sticks; four local sprite sheets add coil glints, bubbles and steam. The Idle detail switch compares motion without resetting combat.')}</p><div class="px-battle__gallery">${['rail','bubble','mortar','fusion'].map(k=>`<figure><figcaption>${pick(WEAPON_NAMES[k])}</figcaption><img src="${url(`../idle-v1/${k}/sheet.png`)}" alt="${tx('四帧待机细节','Four-frame idle detail')}" loading="lazy"><a href="${url(`../idle-v1/${k}/sheet.png`)}" download>${tx('下载序列图','Download sprite sheet')}</a></figure>`).join('')}</div><p>${tx('这些是叠加在固定底座上的局部序列帧，并非整套8方向机械待机重绘。暂停、强化选择和结算时安静；开火优先，不附加循环音效。','These are local sprite overlays on fixed bases, not full eight-direction mechanical redraws. Pause, upgrade choices and results stay quiet; attacks take priority. No ambient loop sounds.')}</p></details>`);
 host.insertAdjacentHTML('beforeend',`<details class="px-battle__details"><summary>${tx('独立音色试听','Individual sound auditions')}</summary><p>${tx('实体弹体先发射、再命中。试听会暂停战斗；场内音效仍由「音效」开关控制。','Physical projectiles launch, then hit. Auditioning pauses combat; the Sound switch controls in-game audio.')}</p><div class="px-battle__audio">${[...WEAPONS,'upgrade'].map(k=>`<label>${k==='upgrade'?tx('升级装配','Upgrade assembly'):pick(WEAPON_NAMES[k])}<audio controls preload="none" aria-label="${k==='upgrade'?tx('升级音效','Upgrade sound'):pick(WEAPON_NAMES[k])}" src="${new URL(`../audio/battle-v2/${k}.wav`,document.baseURI).href}"></audio></label>`).join('')}</div></details>`);
 const view=host.querySelector('.px-game'),status=host.querySelector('.px-battle__status'),abort=new AbortController(),signal=abort.signal,media=matchMedia('(prefers-reduced-motion: reduce)'),audio=battleAudio({onState:running=>audioSettings.setRunning(running)}),clock=new SimulationClock();
 view.classList.add('px-game--battle-lab');view.querySelectorAll('.px-overlay,.px-enemy,.px-xp').forEach(e=>e.remove());view.querySelectorAll('button').forEach(b=>{b.removeAttribute('data-action');b.disabled=true;});
 view.querySelector('.px-actions').innerHTML=`<button class="px-button px-button--gold" data-battle="start" disabled>${tx('开始测试','Start test')}</button><button class="px-button px-button--refresh" data-battle="reset" disabled>${tx('重置','Reset')}</button>`;
 const pause=view.querySelector('.px-game__header button');pause.dataset.battle='pause';
 const overlay=document.createElement('div');overlay.className='px-battle-overlay';overlay.hidden=true;view.append(overlay);
 const cfg={weapon:'spring',rank:1,enemy:'patrol',phase:'single',level:0};let game=createBattle(cfg),art,renderer,alive=true,last=0,raf,overlayKey='',loading=false,idleEnabled=true;
 const unsubscribeAudio=audioSettings.subscribe((muted,gesture)=>{void audio.setEnabled(!muted,gesture);const b=host.querySelector('[data-battle="sound"]');b.textContent=tx(muted?'全部声音：关':'全部声音：开',muted?'All sound: off':'All sound: on');b.setAttribute('aria-pressed',String(!muted));});
 function state(){host.dataset.stage=game.stage;host.dataset.paused=String(game.paused);host.dataset.kills=game.kills;host.dataset.hp=game.hp;host.dataset.elapsed=game.elapsed.toFixed(3);host.dataset.phase=cfg.phase;
  const ready=!!renderer,editing=game.stage==='ready'&&!game.paused;
  host.querySelectorAll('[data-battle-weapon],[data-battle-enemy],[data-battle-phase]').forEach(b=>{b.disabled=!ready||game.stage==='wave';b.setAttribute('aria-pressed',String(b.dataset.battleWeapon?cfg.phase==='single'&&cfg.weapon===b.dataset.battleWeapon:b.dataset.battleEnemy?cfg.enemy===b.dataset.battleEnemy:cfg.phase===b.dataset.battlePhase));});
  host.querySelectorAll('[data-battle-rank]').forEach(b=>{b.disabled=!ready||!editing||cfg.weapon==='fusion'&&cfg.phase==='single';b.setAttribute('aria-pressed',String(Number(b.dataset.battleRank)===cfg.rank));});
  host.querySelector('[data-battle="upgrade"]').disabled=!ready||!editing||cfg.rank>=4||cfg.weapon==='fusion'&&cfg.phase==='single';
  host.querySelector('[data-battle="clear"]').disabled=!ready||!editing;host.querySelector('[data-battle-level]').disabled=!ready||game.stage==='wave';
  host.querySelector('[data-battle="reset"]').disabled=!ready;pause.disabled=!ready||game.ended||game.stage==='ready';
  const start=host.querySelector('[data-battle="start"]');start.disabled=!ready||!!game.choices.length;start.textContent=game.ended?tx('再试一次','Try again'):game.stage==='wave'?(game.paused?tx('继续','Resume'):tx('暂停','Pause')):tx('开始测试','Start test');
  const shown=renderer?.view()||game,settled=renderer?.settled()??true;
  const nums=view.querySelectorAll('.px-hud b');nums[0].textContent=shown.hp;nums[1].textContent=`${shown.kills}/${game.waves[0].count}`;nums[1].parentElement.setAttribute('aria-label',tx('击倒 / 本波敌数','Defeated / wave count'));nums[2].textContent=shown.coins;
  const current=game.paused?'pause':!settled?'':game.choices.length?'choice:'+game.choices.join(','):game.ended?game.stage:'';
  if(current!==overlayKey){
   overlayKey=current;overlay.hidden=!current;
   for(const child of view.children)if(child!==overlay&&!child.matches('[data-audio-toggle]'))child.inert=Boolean(current);
   if(!current)overlay.innerHTML='';
   else {
    const stats=`<dl class="px-result-stats"><div><dt>${tx('击倒','Defeated')}</dt><dd>${game.kills}</dd></div><div><dt>${tx('漏怪','Escaped')}</dt><dd>${game.leaks}</dd></div></dl>`;
    overlay.innerHTML=current.startsWith('choice:')?richDialog({kind:'upgrade',body:tx('选一个强化','Choose one upgrade'),content:`<div class="px-upgrade-list">${game.choices.map((id,i)=>{const kind=id.split('-')[0],src=WEAPONS.includes(kind)?weaponURL(kind):null;return `<button class="px-upgrade" data-battle-choice="${i}"><span>${src?`<img src="${src}" alt="" draggable="false">`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${id==='repair'?'M12 21 2 11V5h6l4 4 4-4h6v6Z':'M3 6h18v15H3ZM2 2h20v5H2ZM10 2v8h4V2'}"/></svg>`}</span><span><b>${upgradeName(id)}</b></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg></button>`;}).join('')}</div>`})
     :richDialog({kind:game.paused?'pause':game.stage,content:stats,body:game.paused?tx('调整呼吸，再接着守。','Take a breath. The line can wait.'):game.stage==='win'?tx('零件箱安全了！','The parts box is safe!'):tx('换个阵容，再来一次。','Try a different loadout.'),symbol:game.paused?'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6ZM14 4h4v16h-4Z"/></svg>':'',actions:`<button class="px-button px-button--gold" data-battle="${game.paused?'pause':'reset'}">${game.paused?tx('继续战斗','Resume battle'):tx('重新布阵','Rearrange')}</button>${game.paused?`<button class="px-button" data-battle="reset">${tx('重新布阵','Rearrange')}</button>`:''}`});
    overlay.querySelector('button')?.focus({preventScroll:true});
   }
  }
 }
 function syncBench(){const bench=view.querySelector('.px-bench');bench.classList.add('px-bench--preview');bench.setAttribute('aria-label',tx('当前测试阵容预览；拖放请进入扩格实验','Test loadout preview; use the expansion experiment for dragging'));bench.innerHTML=Array.from({length:3},(_,i)=>{const a=renderer.actors[i];return `<div class="px-bench__slot" ${a?'':`aria-label="${tx('空槽','Empty slot')}"`}>${a?`<img class="px-sprite" data-bench-fit="true" src="${cropBenchCanvas(a.canvas)}" alt="${pick(WEAPON_NAMES[a.u.kind])}" draggable="false"><span class="px-rank">${a.u.rank}</span>`:''}</div>`;}).join('');}
 function stopAuditions(){host.querySelectorAll('audio').forEach(a=>a.pause());}
 function setup(){stopAuditions();audio.hush();renderer?.destroy();game=createBattle(cfg);clock.reset();last=0;overlayKey='';overlay.hidden=true;overlay.innerHTML='';for(const child of view.children)child.inert=false;for(const [i,c]of [...view.querySelectorAll('.px-cell')].entries())c.classList.toggle('px-cell--locked',!game.board[i]);
  renderer=new BattleArt(host,game,art,()=>media.matches,(k,phase)=>audio.play(k,phase));renderer.idleEnabled=idleEnabled;renderer.draw(0);syncBench();state();status.textContent=cfg.phase==='single'?pick(WEAPON_NAMES[cfg.weapon])+' · '+pick(ROLES[cfg.weapon])+(cfg.weapon==='drum'?tx('（已搭配相邻弹簧炮）',' (with adjacent Spring)'):''):pick(PHASES[cfg.phase].name)+' · '+tx('测试阵容','Test loadout');
  host.dataset.idleAssetsMissing=art.idleMissing.join(',');if(art.idleMissing.length)status.textContent+=tx(' · 部分待机细节未加载，战斗仍可用。',' · Some idle details failed to load; combat is available.');
 }
 async function load(){if(loading)return;loading=true;host.dataset.ready='loading';try{art=await loadBattleArt();if(!alive)return;setup();host.dataset.ready='true';}catch{if(!alive)return;host.dataset.ready='error';status.textContent=tx('动画素材加载失败，点击重试。','Animation assets failed. Retry to continue.');const b=document.createElement('button');b.dataset.battle='retry';b.textContent=tx('重试','Retry');status.append(b);}finally{loading=false;}}
 function action(b){if(!b||b.disabled)return;
  if(b.dataset.battle==='retry'){load();return;}if(b.dataset.battle==='sound'){audioSettings.toggle();return;}if(!renderer)return;
  if(b.dataset.battle==='idle'){idleEnabled=!idleEnabled;renderer.idleEnabled=idleEnabled;b.setAttribute('aria-pressed',String(idleEnabled));b.textContent=idleEnabled?tx('待机细节：开','Idle detail: on'):tx('待机细节：关','Idle detail: off');renderer.draw(0);return;}
  if(b.dataset.battleWeapon){cfg.weapon=b.dataset.battleWeapon;cfg.phase='single';if(cfg.weapon==='fusion')cfg.rank=4;setup();}
  else if(b.dataset.battleEnemy){cfg.enemy=b.dataset.battleEnemy;cfg.phase='single';setup();}
  else if(b.dataset.battlePhase){cfg.phase=b.dataset.battlePhase;cfg.rank=PHASES[cfg.phase].units[0][1];setup();}
  else if(b.dataset.battleRank||b.dataset.battle==='upgrade'){const r=b.dataset.battleRank?Number(b.dataset.battleRank):Math.min(4,cfg.rank+1);if(setBattleRank(game,r)){cfg.rank=r;renderer.upgrade();renderer.draw(0);syncBench();}}
  else if(b.dataset.battleChoice!==undefined){game.chooseUpgrade(Number(b.dataset.battleChoice));clock.reset();}
  else if(b.dataset.battle==='clear'){game.units=[];renderer.build();syncBench();status.textContent=tx('空阵容对照：没有火力，会漏怪。','Empty board: no firepower, enemies will escape.');}
  else if(b.dataset.battle==='reset')setup();
  else if(b.dataset.battle==='start'){stopAuditions();if(game.ended)setup();if(game.stage==='ready')game.startWave();else game.paused=!game.paused;clock.reset();}
  else if(b.dataset.battle==='pause'){stopAuditions();game.paused=!game.paused;clock.reset();}if(game.paused)audio.hush();state();
 }
 host.addEventListener('pointerdown',e=>{const b=e.target.closest('.px-game [data-battle]');if(b&&e.button===0){e.preventDefault();action(b);}},{signal});
 host.addEventListener('click',e=>{const b=e.target.closest('[data-battle],[data-battle-weapon],[data-battle-enemy],[data-battle-phase],[data-battle-rank],[data-battle-choice]');if(b?.closest('.px-game')&&b.dataset.battle&&e.detail!==0)return;action(b);},{signal});
 host.addEventListener('change',e=>{if(e.target.matches('[data-battle-level]')){cfg.level=Number(e.target.value);setup();}},{signal});
 function suspend(){audio.hush();if(renderer&&game.stage==='wave'){game.paused=true;clock.reset();state();}last=0;}
 host.addEventListener('play',e=>{if(e.target.tagName==='AUDIO'){suspend();host.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause();});}},{signal,capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAuditions();suspend();}},{signal});window.addEventListener('blur',()=>{stopAuditions();suspend();},{signal});
 function loop(now){if(!alive)return;raf=requestAnimationFrame(loop);const dt=last?Math.min(.05,Math.max(0,(now-last)/1000)):0;last=now;if(!renderer||document.hidden)return;clock.advance(game,dt);renderer.capture();renderer.draw(game.paused||game.choices.length&&renderer.settled()?0:dt);game.events=[];state();}
 load();raf=requestAnimationFrame(loop);return()=>{alive=false;unsubscribeAudio();abort.abort();cancelAnimationFrame(raf);host.querySelectorAll('audio').forEach(a=>a.pause());renderer?.destroy();audio.destroy();};
}

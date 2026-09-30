// Crazy Games desktop guest only. Loaded by the crazygames Vite build.
// The AlterU/host bundle never imports this module.
import { Workshop } from '../engine.js';
import { LEVELS } from '../levels.js';
import { XP_THRESHOLDS } from '../upgrades.js';

// Kept here so this module does not import src/copy.js. That file reads
// `location` at load, and the host bundle must not change to accommodate it.
const PHRASE = {
  retryLevel: ['重试本关', 'Retry this level'],
  nextLevel: ['下一关', 'Next level'],
  upgradeIntro: ['战斗已暂停，选完继续', 'Battle paused until you choose'],
  level1: ['初次守夜', 'First night'],
  level2: ['快兵来袭', 'Quick feet'],
  level3: ['钢铁洪流', 'Iron tide'],
  level4: ['最后一班', 'Last shift'],
  level5: ['装甲围城', 'Armored siege'],
  level6: ['裂群风暴', 'Splitter storm'],
  focus1: ['熟悉合成与布阵', 'Merge and arrange'],
  focus2: ['快兵 · 覆盖路线', 'Speed · Cover the route'],
  focus3: ['密集重甲 · 搭配火力', 'Armor · Mix your firepower'],
  focus4: ['混合进攻 · 分配齿轮', 'Mixed waves · Budget gears'],
  focus5: ['铆钉破甲 · 队友集火', 'Break armor · Focus allied fire'],
  focus6: ['分裂成群 · 连锁清场', 'Splitters · Chain the crowd'],
  patrol: ['巡逻兵', 'Patrol'],
  runner: ['快跑群', 'Runners'],
  swarm: ['密集群', 'Swarm'],
  armor: ['重甲队', 'Armored'],
  boss: ['发条首领', 'Clockwork boss'],
  plated: ['重盾卫', 'Shield guard'],
  brood: ['分裂壳', 'Brood shell'],
  mite: ['幼虫', 'Mite'],
};

function uiLocale() {
  try {
    const lang = new URLSearchParams(globalThis.location?.search || '').get('lang');
    if (lang === 'en' || lang === 'zh') return lang;
    return (globalThis.navigator?.language || '').startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}
function phrase(key) {
  const row = PHRASE[key];
  return row ? row[uiLocale() === 'zh' ? 0 : 1] : key;
}

const BEST_KEY = 'cg-desktop-best-wave';
const LAND_SEEN_KEY = 'cg-desktop-land-seen';
const LAND_NUDGE_MS = 2200;
let installed = false;
let landSeenMemory = false;
let landNudgeKey = '';
let landNudgeAt = 0;

export function installCrazyGamesGuest() {
  if (installed) return;
  installed = true;
  const reset = Workshop.prototype.reset;
  Workshop.prototype.reset = function(mode, levelIndex) {
    reset.call(this, mode, levelIndex);
    // Opening night only. Clone so the shared LEVELS table stays intact for
    // later levels, saves, and the host build's tests.
    if (this.lab || this.levelIndex !== 0) return;
    const waves = this.waves.map(w => ({...w, mix: w.mix?.map(part => ({...part}))}));
    softenOpening(waves);
    this.waves = waves;
  };
  const host = globalThis;
  host.__cgGuideDelay = 450;
  host.__cgGuide = guestGuide;
  host.__cgHint = guestHint;
  host.__cgModal = guestModal;
  host.__cgKey = guestKey;
  host.__cgKeepWeapons = () => true;
}

export function softenOpening(waves) {
  // Wave 1 is already a clean win with the tutorial line. The first rage-quit
  // is the swarm (wave 3) and the armor escort (wave 4): fast runners at
  // speed 110 leak past a small board. Later waves stay as authored.
  const swarm = waves[2];
  if (swarm?.kind === 'swarm') {
    swarm.count = 16;
    if (swarm.mix) swarm.mix = swarm.mix.map(part => part.kind === 'runner' ? {...part, speed: 72} : part);
  }
  const armor = waves[3];
  if (armor?.kind === 'armor') {
    armor.count = 9;
    if (armor.mix) armor.mix = armor.mix.map(part => part.kind === 'runner' ? {...part, speed: 72} : part);
  }
}

function storage() {
  try { return globalThis.alteruLocalStorage || globalThis.localStorage || null; } catch { return null; }
}
function readBest() {
  try {
    const raw = Number(storage()?.getItem(BEST_KEY));
    return Number.isInteger(raw) && raw > 0 ? raw : 0;
  } catch { return 0; }
}
function rememberBest(wave) {
  const next = Math.max(readBest(), wave | 0);
  try { storage()?.setItem(BEST_KEY, String(next)); } catch { /* storage is optional */ }
  return next;
}

function landSeen() {
  try {
    if (storage()?.getItem(LAND_SEEN_KEY) === '1') return true;
  } catch { /* storage is optional */ }
  return landSeenMemory;
}
function markLandSeen() {
  landSeenMemory = true;
  try { storage()?.setItem(LAND_SEEN_KEY, '1'); } catch { /* storage is optional */ }
}
function betweenWaveLand(game) {
  return Boolean(game && !game.lab && game.wave >= 1 && game.landRemaining > 0 && game.get?.('land'));
}
function landToggle(ctx) {
  return ctx?.$?.('[data-action="bench-toggle"]') || globalThis.document?.querySelector?.('[data-action="bench-toggle"]') || null;
}
function paintLandToggle(game, ctx) {
  if (ctx?.benchMode === 'land' && game?.wave >= 1 && game.landRemaining > 0 && !game.lab) markLandSeen();
  const toggle = landToggle(ctx);
  const show = Boolean(betweenWaveLand(game) && ctx?.benchMode !== 'land' && !landSeen());
  toggle?.classList?.toggle('cg-land-nudge', show);
  return { toggle, show };
}
function landHand(game, ctx) {
  const { toggle, show } = paintLandToggle(game, ctx);
  // The refresh and place lessons keep their own hand. The 2s land hand
  // starts only once those lessons are finished, so it is not skipped.
  if (!show || !toggle || game.stage !== 'ready' || ['refresh', 'place'].includes(game.lesson)) return null;
  const key = `${game.levelIndex}:${game.wave}`;
  const now = globalThis.performance?.now?.() ?? Date.now();
  if (landNudgeKey !== key) {
    landNudgeKey = key;
    landNudgeAt = now;
  }
  return now - landNudgeAt < LAND_NUDGE_MS ? toggle : null;
}

export function guestGuide(game, ctx) {
  const teaching = ['place', 'second', 'merge', 'expand', 'rail'].includes(game.stage)
    || (game.stage === 'ready' && ['refresh', 'place'].includes(game.lesson));
  globalThis.__cgGuideDelay = teaching || game.stage === 'ready' ? 450 : 3000;
  const nudge = landHand(game, ctx);
  if (!ctx?.overlayHidden?.() || game.paused || game.choices.length) return undefined;
  if (teaching) return undefined;
  if (game.stage !== 'ready') return undefined;
  // Land placement keeps the original hand. Weapons stay the default bench.
  if (ctx.benchMode === 'land') return undefined;
  // One extra free gun before the first wave, then the hand must find Start.
  // Following the hand forever used to place toys and never begin combat.
  if (game.wave === 0 && game.units.length < 3 && ctx.benchMode !== 'land' && ctx.hasBenchMove?.()) return undefined;
  if (nudge) return { source: nudge, target: nudge, tap: true };
  const start = ctx.$?.('#main-action');
  if (!start || start.disabled || start.style.visibility === 'hidden') return undefined;
  return { source: start, target: start, tap: true };
}

export function guestHint(game, ctx = {}) {
  const land = paintLandToggle(game, ctx);
  if (game.paused || game.choices.length || game.ended) return '';
  if (['place', 'second', 'merge', 'expand', 'rail', 'watch'].includes(game.stage)) return '';
  if (game.stage === 'ready' && ['refresh', 'place'].includes(game.lesson)) return '';
  if (game.stage !== 'ready') return '';
  const zh = uiLocale() === 'zh';
  if (land.show) return zh ? '新地块。点扩格，或空格开战。' : 'New land. Tap Land, or Space.';
  if (game.wave === 0) {
    if (game.units.length < 3 && ctx.benchMode !== 'land') return zh ? '再放一台免费炮，或直接开战' : 'One free gun, or start now';
    return zh ? '按空格，或点开始' : 'Press Space, or tap Start';
  }
  const wave = game.waves[Math.min(game.wave, game.waves.length - 1)];
  const name = wave ? phrase(wave.kind) : '';
  const nextXp = XP_THRESHOLDS[game.upgradeLevel];
  const left = nextXp ? Math.max(0, nextXp - game.xp) : 0;
  const goal = left ? (zh ? `再${left}杀强化` : `${left} kills to upgrade`) : (zh ? '强化已满' : 'upgrades maxed');
  return zh ? `下一波 ${name} · ${goal}` : `Next: ${name} · ${goal}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
}

function forwardCopy(game) {
  const zh = uiLocale() === 'zh';
  if (game.stage === 'win') {
    rememberBest(Math.max(game.passed, game.waves.length));
    const next = LEVELS[game.levelIndex + 1];
    if (!next) return zh ? '六关都守住了。换一条合成路线，再打一夜。' : 'Every night is clear. Try another build and run it again.';
    return zh ? `下一夜 · ${phrase(next.title)}：${phrase(next.focus)}` : `Next night · ${phrase(next.title)}: ${phrase(next.focus)}`;
  }
  const best = rememberBest(game.passed);
  const advice = {
    0: zh ? '放上弹簧炮和磁轨，按空格开战。' : 'Place the spring and the rail, then press Space.',
    1: zh ? '快跑群冲出口。把炮盖住下方的箱子。' : 'Runners rush the exit. Cover the box at the bottom.',
    2: zh ? '虫群下一波就到。开战前把台子上的炮都拖进去。' : 'The swarm is next. Drag every bench gun in before you start.',
  }[game.passed] || (zh ? '合成同阶的炮，守住出口，再打一夜。' : 'Merge matching guns, cover the exit, and run it back.');
  const record = best > game.passed
    ? (zh ? `最佳纪录：第 ${best} 波。` : `Your best is wave ${best}.`)
    : (zh ? '再守过一波就是新纪录。' : 'One more wave is a new best.');
  return `${advice} ${record}`;
}

export function guestModal(mode, content, game) {
  if (mode === 'upgrade') {
    const step = game.upgradeLevel + 1;
    const note = uiLocale() === 'zh'
      ? `${step}/${XP_THRESHOLDS.length} · 选完立刻继续`
      : `${step}/${XP_THRESHOLDS.length} · the fight resumes`;
    return content.replace(phrase('upgradeIntro'), `${phrase('upgradeIntro')} · ${note}`);
  }
  if (mode !== 'lose' && mode !== 'win') return content;
  let next = content.replace(/<button class="tw__secondary" data-action="records">[^<]*<\/button>/, '');
  if (mode === 'lose') next = next.replace(`>${phrase('retryLevel')}<`, `>${uiLocale() === 'zh' ? '再来一局' : 'Run it back'}<`);
  if (mode === 'win') next = next.replace(`>${phrase('nextLevel')}<`, `>${uiLocale() === 'zh' ? '进入下一夜' : 'Next night'}<`);
  const motive = `<p class="cg-motive">${escapeHtml(forwardCopy(game))}</p>`;
  return next.replace('<button class="tw__primary"', motive + '<button class="tw__primary"');
}

export function guestKey(event, api) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return false;
  const { game, action, confirmMode } = api;
  if (confirmMode) return false;
  if (game.choices.length && ['1', '2', '3'].includes(event.key)) {
    event.preventDefault();
    action('upgrade-' + (Number(event.key) - 1));
    return true;
  }
  if (game.paused || game.choices.length || game.ended) return false;
  const onControl = event.target?.closest?.('button,a,input,textarea');
  if ((event.key === ' ' || event.key === 'Enter') && ['ready', 'fused'].includes(game.stage)) {
    if (onControl) return false;
    const start = document.querySelector('#main-action');
    if (!start || start.disabled || start.style.visibility === 'hidden') return false;
    event.preventDefault();
    action('main');
    return true;
  }
  if (['1', '2', '3'].includes(event.key) && game.stage === 'ready' && !game.tray) {
    if (onControl) return false;
    const slot = document.querySelector(`[data-source="reserve:${Number(event.key) - 1}"]`);
    if (!slot || slot.disabled) return false;
    event.preventDefault();
    slot.click();
    return true;
  }
  return false;
}

export async function mountCrazyGamesGuest() {
  await import('./guest.css');
}

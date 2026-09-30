import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Workshop, SimulationClock, COLS, LEVELS } from '../src/engine.js';
import { installCrazyGamesGuest, guestModal } from '../src/crazygames/guest.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');

installCrazyGamesGuest();

function firstOf(game, source, type) {
  for (let r = 0; r < game.rows; r++) for (let c = 0; c < COLS; c++) {
    const preview = game.preview(source, c, r);
    if (preview.ok && (!type || preview.type === type)) return preview;
  }
  return null;
}
function advance(game, clock, seconds) {
  let t = 0;
  while (t < seconds) {
    if (game.choices.length) game.chooseUpgrade(0);
    if (!['wave', 'watch'].includes(game.stage)) return;
    clock.advance(game, 1 / 60, 1);
    t += 1 / 60;
  }
}

test('desktop guest hooks are not in the shared entry', () => {
  assert.doesNotMatch(main, /__cgGuide|crazygames\/guest/);
  assert.match(vite, /crazygames-desktop-guest/);
  assert.match(vite, /plugins: crazygames/);
});

test('opening night is gentler without rewriting the shared level table', () => {
  const game = new Workshop();
  assert.equal(game.levelIndex, 0);
  assert.equal(game.waves[2].count, 16);
  assert.equal(game.waves[2].mix.find(part => part.kind === 'runner').speed, 72);
  assert.equal(game.waves[3].count, 9);
  assert.equal(LEVELS[0].waves[2].count, 20);
  assert.equal(LEVELS[0].waves[2].mix.find(part => part.kind === 'runner').speed, 110);
  assert.equal(LEVELS[0].waves[3].count, 11);
  game.reset('run', 1);
  assert.equal(game.waves[2].count, LEVELS[1].waves[2].count);
  assert.equal(game.waves[2].mix.find(part => part.kind === 'runner').speed, 110);
});

test('tutorial line plus the taught refresh survives the first swarm', () => {
  const game = new Workshop();
  const clock = new SimulationClock();
  let preview = firstOf(game, 'tray', 'place');
  assert.equal(game.place('tray', preview.c, preview.r).ok, true);
  advance(game, clock, 8);
  preview = firstOf(game, 'tray', 'merge');
  assert.equal(game.place('tray', preview.c, preview.r).ok, true);
  const land = game.landMove();
  assert.equal(game.place(land.source, land.c, land.r).ok, true);
  preview = firstOf(game, 'tray', 'place');
  assert.equal(game.place('tray', preview.c, preview.r).ok, true);
  assert.equal(game.stage, 'ready');
  game.startWave();
  advance(game, clock, 40);
  assert.equal(game.stage, 'ready');
  assert.equal(game.hp, 100);
  assert.equal(game.refresh(true).ok, true);
  for (let i = 0; i < 3; i++) {
    const source = 'reserve:' + i;
    if (!game.get(source)) continue;
    const spot = firstOf(game, source, 'merge') || firstOf(game, source, 'place');
    if (spot) game.place(source, spot.c, spot.r);
  }
  game.startWave();
  advance(game, clock, 40);
  game.startWave();
  advance(game, clock, 80);
  assert.equal(game.passed >= 3, true);
  assert.equal(game.hp > 0, true);
});

test('result screens lead with another run', () => {
  const game = new Workshop();
  game.stage = 'lose';
  game.passed = 2;
  game.hp = 0;
  game.wave = 3;
  const lose = guestModal('lose', '<div class="tw__result"></div><p>x</p><button class="tw__primary" data-action="run">Retry this level</button><button class="tw__secondary" data-action="levels">Choose level</button><button class="tw__secondary" data-action="records">Run records</button>', game);
  assert.match(lose, /Run it back|再来一局/);
  assert.match(lose, /cg-motive/);
  assert.doesNotMatch(lose, /data-action="records"/);
  assert.match(lose, /data-action="run"/);
  game.stage = 'win';
  game.levelIndex = 0;
  game.passed = 8;
  const win = guestModal('win', '<button class="tw__primary" data-action="next-level">Next level</button>', game);
  assert.match(win, /Next night|进入下一夜/);
  assert.match(win, /Quick feet|快兵来袭/);
});

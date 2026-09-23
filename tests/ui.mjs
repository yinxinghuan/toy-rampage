import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const require = createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const out = fileURLToPath(new URL('../_qa/ui/', import.meta.url));
await fs.mkdir(out, { recursive: true });
const pass = process.env.QA_PASS || 'first';
const base = process.env.QA_BASE || 'http://127.0.0.1:5187/';
const errors = [], measurements = [];
async function run(width, height, lang = 'zh', reduced = false) {
  const context = await browser.newContext({ viewport: { width, height }, locale: lang === 'zh' ? 'zh-CN' : 'en-US', reducedMotion: reduced ? 'reduce' : 'no-preference', recordVideo: { dir: out, size: { width, height } } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const url = new URL(base); url.searchParams.set('lang', lang);
  await page.goto(url.href, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
  const prefix = `${pass}-platform-layout-${width}x${height}-${lang}${reduced ? '-reduced' : ''}`;
  const shot = name => page.screenshot({ path: `${out}${prefix}-${name}.png` });
  async function dimensions(stage) {
    measurements.push(await page.evaluate(stage => {
      const field = document.querySelector('.tw__board').getBoundingClientRect(), hint = document.querySelector('.tw__hint').getBoundingClientRect(), copy = document.querySelector('#hint-body').getBoundingClientRect(), tray = document.querySelector('.tw__tray').getBoundingClientRect();
      const buttons = [...document.querySelectorAll('button')].filter(el => el.offsetWidth && el.offsetHeight).map(el => ({ label: el.getAttribute('aria-label') || el.textContent, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }));
      return { stage, width: innerWidth, height: innerHeight, lang: document.documentElement.lang, overflow: document.documentElement.scrollWidth > innerWidth, board: { top: field.top, bottom: field.bottom }, hintBottom: hint.bottom, copyBottom: copy.bottom, trayTop: tray.top, buttons: buttons.filter(b => b.w < 43.5 || b.h < 43.5) };
    }, stage));
  }
  const cell = (c, r) => page.locator(`[data-cell="${c},${r}"]`);
  async function drag(from, to) {
    const a = await from.boundingBox(), b = await to.boundingBox(); assert.ok(a && b);
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 }); await page.mouse.up();
  }
  await shot('entry'); await dimensions('entry');
  // Invalid pointer drop is visibly recoverable.
  const part = page.locator('[data-source="tray"]'), bb = await part.boundingBox();
  await page.mouse.move(bb.x + 20, bb.y + 20); await page.mouse.down(); await page.mouse.move(8, 150, { steps: 8 }); await page.mouse.up();
  assert.equal(await part.count(), 1); await shot('invalid');
  await drag(part, cell(0, 0));
  await page.waitForFunction(() => document.querySelector('#badge').textContent === '02');
  await shot('first-result'); await dimensions('second');
  // Use tap-to-place for the second machine; both routes must work.
  await page.locator('[data-source="tray"]').click(); await cell(1, 0).click();
  assert.equal(await page.locator('#badge').textContent(), '03');
  await shot('before-merge'); await dimensions('merge'); await drag(cell(1, 0), cell(0, 0)); await shot('merge');
  assert.equal(await page.locator('#badge').textContent(), '04');
  await page.locator('#main-action').click(); await drag(page.locator('[data-source="tray"]'), cell(0, 3));
  assert.equal(await page.locator('#badge').textContent(), '06'); await shot('ready'); await dimensions('ready');
  await page.locator('#main-action').click(); await page.waitForTimeout(1500); await shot('battle');
  await page.locator('[data-action="pause"]').click(); await shot('pause');
  const before = await page.locator('#phase').textContent(); await page.waitForTimeout(300); assert.equal(await page.locator('#phase').textContent(), before);
  await page.locator('[data-action="resume"]').click();
  await page.locator('[data-action="lab"]').waitFor({ timeout: 45000 }); await shot('win');
  await page.locator('[data-action="lab"]').click(); await shot('fusion-before'); await dimensions('fusion');
  await drag(cell(0, 0), cell(0, 3)); await shot('fusion'); await dimensions('fused');
  await page.locator('[data-source="tray"]').focus(); await page.keyboard.press('Enter'); await cell(0, 0).focus(); await page.keyboard.press('Enter');
  await page.locator('#main-action').click(); await page.waitForTimeout(1300); await shot('fusion-battle');
  await page.locator('[data-action="lab"]').waitFor({ timeout: 45000 }); await shot('labend'); await dimensions('labend');
  await context.close();
}
try {
  await run(390, 844);
  await run(320, 568);
  await run(320, 568, 'en', true);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await context.newPage();
  const url = new URL(base); url.searchParams.set('lang', 'zh');
  await page.goto(url.href, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${out}${pass}-external-guest-1280x900.png` });
  const banner = await page.locator('#alteru-guest-banner').count();
  await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
  await page.screenshot({ path: `${out}${pass}-platform-layout-1280x900.png` });
  await context.close();
  await fs.writeFile(`${out}${pass}-measurements.json`, JSON.stringify({ measurements, errors, externalBannerPresent: banner }, null, 2));
  console.log(JSON.stringify({ measurements, errors, externalBannerPresent: banner }, null, 2));
  assert.deepEqual(errors, []);
  for (const m of measurements) { assert.equal(m.overflow, false); assert.equal(m.buttons.length, 0); assert.ok(m.copyBottom <= m.board.top + 1, `Hint overlaps board: ${JSON.stringify(m)}`); }
} finally { await browser.close(); }

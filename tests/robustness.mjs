import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const out = fileURLToPath(new URL('../_qa/ui/', import.meta.url)), reports = [];
try {
  for (const [w, h] of [[320, 568], [390, 844], [440, 600], [768, 1024]]) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, locale: 'zh-CN' });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5187/?lang=zh', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
    const box = await page.locator('[data-source="tray"]').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.move(150, 240, { steps: 5 });
    await page.keyboard.press('Escape'); await page.mouse.up();
    assert.equal(await page.locator('[data-source="tray"]').count(), 1);
    assert.equal(await page.locator('#badge').textContent(), '01');
    const part = await page.locator('[data-source="tray"]').boundingBox(), cell = await page.locator('[data-cell="0,0"]').boundingBox();
    await page.touchscreen.tap(part.x + part.width / 2, part.y + part.height / 2); await page.touchscreen.tap(cell.x + cell.width / 2, cell.y + cell.height / 2);
    await page.waitForFunction(() => document.querySelector('#badge').textContent === '02');
    // Headless Chromium does not deliver native tab-focus loss reliably.
    // This checks the blur event handler, not real macOS background behavior.
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.locator('[data-action="resume"]').waitFor();
    await page.screenshot({ path: `${out}final-platform-layout-${w}x${h}-blur-handler-pause.png` });
    await page.locator('[data-action="resume"]').click();
    await page.locator('[data-action="sound"]').click(); assert.equal(await page.locator('[data-action="sound"]').getAttribute('aria-pressed'), 'false');
    const m = await page.evaluate(() => {
      const board = document.querySelector('.tw__board').getBoundingClientRect(), hint = document.querySelector('#hint-body').getBoundingClientRect(), tray = document.querySelector('.tw__tray').getBoundingClientRect();
      return { width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth, boardTop: board.top, boardBottom: board.bottom, hintBottom: hint.bottom, trayTop: tray.top };
    });
    assert.equal(m.overflow, false); assert.ok(m.hintBottom <= m.boardTop); assert.ok(m.boardBottom <= m.trayTop + 1); reports.push(m);
    await page.screenshot({ path: `${out}final-platform-layout-${w}x${h}-touch-and-cancel.png`, fullPage: true });
    await context.close();
  }
  await fs.writeFile(`${out}robustness.json`, JSON.stringify(reports, null, 2)); console.log(reports);
} finally { await browser.close(); }

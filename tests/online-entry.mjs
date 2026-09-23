import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const out = fileURLToPath(new URL('../_qa/ui/', import.meta.url));
try {
  for (const [width, height] of [[390, 844], [320, 568]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, locale: 'zh-CN' });
    const page = await context.newPage();
    await page.goto('https://game.aiwaves.tech/0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${out}online-external-guest-${width}x${height}-entry.png` });
    console.log(JSON.stringify({ width, banner: await page.locator('#alteru-guest-banner').count(), buttons: await page.locator('#alteru-guest-banner button').evaluateAll(items => items.map(el => ({ text: el.textContent, aria: el.getAttribute('aria-label'), title: el.getAttribute('title') }))) }));
    // Close the real external overlay via its observed accessible control.
    await page.getByRole('button', { name: 'Close', exact: true }).tap();
    const part = page.locator('[data-source="tray"]');
    await part.tap(); await page.locator('[data-cell="0,0"]').tap();
    await page.waitForFunction(() => document.querySelector('#badge').textContent === '02');
    await page.screenshot({ path: `${out}online-external-guest-${width}x${height}-closed-and-touch.png` });
    await context.close();
  }
} finally { await browser.close(); }

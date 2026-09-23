import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const browser=await chromium.launch();
try {
  for(const width of [1440,390,320]) for(const lang of ['zh','en']) {
    const page=await browser.newPage({viewport:{width,height:width===1440?1000:844}});
    await page.goto(`http://127.0.0.1:5193/pixel-lab/?lang=${lang}&digits=jersey10`);
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.px-game img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
    const spacing=await page.locator('.px-button--refresh').evaluate(button=>{
      const b=button.getBoundingClientRect(),g=button.firstElementChild.getBoundingClientRect();
      return {top:g.top-b.top,bottom:b.bottom-g.bottom,width:b.width,height:b.height};
    });
    assert(spacing.top>=5.5 && spacing.bottom>=5.5,JSON.stringify({width,lang,spacing}));
    assert(Math.abs(spacing.top-spacing.bottom)<1,'center label and cost together');
    assert(spacing.width>=44 && spacing.height>=44,'touch target');
    await page.locator('.px-button--refresh').screenshot({path:`_qa/refresh-spacing/${width}-${lang}-after.png`});
    await page.locator('.px-game').screenshot({path:`_qa/refresh-spacing/${width}-${lang}-scene.png`});
    console.log({width,lang,spacing});
    await page.close();
  }
} finally {await browser.close();}

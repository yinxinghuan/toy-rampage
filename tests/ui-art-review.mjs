import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_REVIEW_BASE||'http://127.0.0.1:5193/art-review/';
const out=new URL('../_qa/art-review/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
const ids=['vinyl','paper','tin','comic','pixel','circuit'];
try{
for(const [width,height,lang] of [[1440,1000,'zh'],[390,844,'zh'],[320,568,'en']]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:width===320?'reduce':'no-preference',acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?lang='+lang);await page.locator('.ar__card').last().waitFor();
 await page.screenshot({path:fileURLToPath(new URL(`${width}-external-guest.png`,out))});
 await page.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 for(const id of ids){const img=page.locator(`[data-direction="${id}"] img`);await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());assert.equal(await img.evaluate(el=>el.naturalWidth),1024);}
 await page.evaluate(()=>scrollTo(0,0));
 assert.equal(await page.locator('.ar__card').count(),6);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
 const small=await page.locator('button,a,select').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<43||r.height<43)}).map(e=>e.outerHTML));assert.deepEqual(small,[]);
 await page.screenshot({path:fileURLToPath(new URL(`${width}-platform-layout-gallery.png`,out)),fullPage:true});
 await page.locator('[data-action="filter-liked"]').click();assert.equal(await page.locator('.ar__empty').count(),1);
 await page.locator('[data-action="filter-all"]').first().click();
 await page.locator('[data-direction="vinyl"] [data-action="favorite"]').click();
 await page.locator('[data-direction="vinyl"] [data-action="compare"]').click();
 await page.locator('[data-direction="tin"] [data-action="compare"]').click();
 await page.locator('[data-action="open-compare"]').click();
 await page.locator('dialog img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.screenshot({path:fileURLToPath(new URL(`${width}-platform-layout-comparison.png`,out))});
 await page.locator('#compare-0').selectOption('tin');assert.equal(await page.locator('#compare-1').inputValue(),'vinyl');
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
 for(const id of ids){
  await page.locator(`[data-direction="${id}"] [data-action="inspect"]`).click();
  await page.locator('[data-action="tab-components"]').click();
  await page.locator('[data-action="sample-upgrade"]').click();
  assert.equal(await page.locator('.ar__upgrade').count(),1);
  assert(await page.locator('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),'dialog overflow '+id);
  await page.locator('dialog .ar__status--visible').waitFor({state:'hidden'});
  await page.screenshot({path:fileURLToPath(new URL(`${width}-platform-layout-${id}-ui.png`,out))});
  await page.locator('[data-action="sample-choose"]').click();assert.equal(await page.locator('.ar__tile--selected').count(),2);
  await page.locator('[data-action="sample-play"]').click();assert(await page.locator('[data-action="sample-refresh"]').isDisabled());
  await page.keyboard.press('Escape');
 }
 await page.locator('#review-notes').fill('测试备注：喜欢留白。 Prefer clear silhouettes.');
 await page.locator('[data-action="filter-liked"]').click();assert.equal(await page.locator('#review-notes').inputValue(),'测试备注：喜欢留白。 Prefer clear silhouettes.');
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="download"]').click();
 const download=await downloadPromise;assert((await readFile(await download.path(),'utf8')).includes('Prefer clear silhouettes.'));
 await page.reload();await page.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 assert.equal(await page.locator('[data-direction="vinyl"] [data-action="favorite"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#review-notes').inputValue(),'');
 assert.deepEqual(errors,[]);results.push({width,height,lang,errors,status:'passed'});await context.close();
}
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
await page.route('**/*vinyl*.png',r=>r.abort());await page.goto(base);await page.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
await page.locator('[data-direction="vinyl"] .ar__image-error').waitFor({state:'visible'});
await page.screenshot({path:fileURLToPath(new URL('390-platform-layout-image-error.png',out))});
await page.unroute('**/*vinyl*.png');await page.locator('[data-direction="vinyl"] [data-action="retry-image"]').click();await page.locator('[data-direction="vinyl"] img').evaluate(el=>el.decode());
assert.equal(await page.locator('[data-direction="vinyl"] .ar__image-error').isVisible(),false);results.push({imageRetry:'passed'});await context.close();
await writeFile(new URL('results.json',out),JSON.stringify({base,results},null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}

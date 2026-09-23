import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const out=new URL(process.env.QA_R4_OUT||'../_qa/pixel-r4-build/',import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
try{for(const lang of ['zh','en']){const page=await browser.newPage({viewport:{width:320,height:568}}),urls=[],errors=[];page.on('request',r=>urls.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5194/pixel-lab/?lang='+lang);await page.locator('.px-game').waitFor();
await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.px-game img')].map(i=>i.decode()));});
assert.equal(await page.locator('.px-machine .px-sprite').count(),5);assert.equal(await page.locator('.px-enemy .px-sprite').count(),2);
assert.deepEqual(urls.filter(u=>!u.startsWith('http://127.0.0.1:5194/')),[],'standalone preview must not fetch platform dependencies');
assert.equal(await page.locator('.px-title-plate img').getAttribute('alt'),lang==='zh'?'玩具大暴走':'Toy Rampage');
assert(await page.locator('.px-refresh-text').evaluate(e=>e.scrollWidth<=e.parentElement.clientWidth),'refresh label fits');
if(lang==='zh')assert.equal(await page.locator('.px-refresh-label').evaluate(i=>i.naturalWidth),110,'real image label, not fallback text');
const title=await page.locator('.px-title-plate').boundingBox(),hud=await page.locator('.px-hud').boundingBox();assert(title.y+title.height<=hud.y+1,'title vs HUD');
await page.locator('.px-game').screenshot({path:fileURLToPath(new URL('320-'+lang+'-ready.png',out))});
await page.locator('[data-action="batch"]').click();assert(await page.locator('.px-dialog').isVisible());await page.locator('[data-action="cancel"]').click();
await page.locator('[data-action="state:upgrade"]').click();assert.equal(await page.locator('.px-upgrade .px-sprite').count(),2);
await page.locator('.px-game').screenshot({path:fileURLToPath(new URL('320-'+lang+'-upgrade.png',out))});
await page.locator('[data-action="section:assets"]').click();assert.equal(await page.locator('.px-asset-grid:not(.px-materials) a[download]').count(),6);
assert.deepEqual(errors,[]);results.push({lang,status:'passed',requests:urls.length});await page.close();}
await fs.writeFile(new URL('results.json',out),JSON.stringify(results,null,2));console.log(results);}finally{await browser.close();}

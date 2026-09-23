import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=new URL(process.env.QA_PIXEL_OUT||'../_qa/pixel-styles-r3-first/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{for(const [width,height,lang] of [[1440,1000,'zh'],[390,844,'zh'],[320,568,'en']]){
const ctx=await browser.newContext({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'}),p=await ctx.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?lang='+lang);
await p.locator('.px-game').waitFor();
await p.evaluate(async()=>{await Promise.all([document.fonts.load('24px "Workshop Pixel"'),document.fonts.load('26px "Jersey 10"'),document.fonts.load('26px "Jersey 15"')]);await document.fonts.ready;const img=new Image();img.src=getComputedStyle(document.querySelector('.px-game__environment')).backgroundImage.slice(5,-2);await img.decode();});
await p.locator('.px-game img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
assert.equal(await p.locator('.px-game .px-image-fallback').count(),0,'no silent image fallback');
if(lang==='zh')assert.equal(await p.locator('.px-refresh-label').evaluate(i=>i.naturalWidth),110,'corrected label image loaded');
assert(await p.evaluate(()=>document.fonts.check('24px "Workshop Pixel"')),'pixel font must load');
assert(await p.evaluate(()=>document.fonts.check('26px "Jersey 10"')&&document.fonts.check('26px "Jersey 15"')),'both numeric pixel fonts must load');
const initialNumbers=await p.locator('.px-hud b').allTextContents();
for(const [id,family] of [['jersey10','Jersey 10'],['jersey15','Jersey 15']]){
await p.locator(`[data-action="digits:${id}"]`).click();
assert.equal(await p.locator('html').getAttribute('data-digits'),id);
assert.equal(new URL(p.url()).searchParams.get('digits'),id);
assert.deepEqual(await p.locator('.px-hud b').allTextContents(),initialNumbers);
assert.equal(await p.locator('.px-cell').count(),20);
assert(await p.locator('.px-hud b').first().evaluate((e,f)=>getComputedStyle(e).fontFamily.includes(f),family));
await p.locator('.px-game').screenshot({path:fileURLToPath(new URL(`${width}-platform-layout-${id}.png`,out))});
}
await p.reload();await p.locator('.px-game').waitFor();
assert.equal(await p.locator('html').getAttribute('data-digits'),'jersey15');
await p.locator('[data-action="digits:jersey10"]').click();
await p.locator('.px-font-test').screenshot({path:fileURLToPath(new URL(`${width}-font-comparison.png`,out))});
await p.screenshot({path:fileURLToPath(new URL(`${width}-external-guest.png`,out))});await p.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
for(const state of ['ready','battle','upgrade','pause','win','lose','loading','error']){
await p.locator(`.px-states [data-action="state:${state}"]`).click();
assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'viewport overflow '+state);
const small=await p.locator('button').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return !e.closest('[inert]')&&r.width>0&&r.height>0&&(r.width<43.5||r.height<43.5)}).map(e=>e.outerHTML));assert.deepEqual(small,[],state+' touch targets');
await p.locator('.px-game').screenshot({path:fileURLToPath(new URL(`${width}-platform-layout-${state}.png`,out))});
}
await p.locator('.px-states [data-action="state:ready"]').click();await p.locator('[data-action="batch"]').click();assert(await p.locator('.px-dialog').isVisible());await p.locator('[data-action="cancel"]').click();assert.equal(await p.locator('.px-overlay').count(),0);
await p.locator('[data-action="environment"]').click();assert(await p.locator('.px-game__environment').isHidden());assert.equal(await p.locator('.px-cell').count(),20);await p.locator('.px-game').screenshot({path:fileURLToPath(new URL(`${width}-platform-layout-ui-only.png`,out))});await p.locator('[data-action="environment"]').click();
await p.locator('[data-action="placeholders"]').click();assert(await p.locator('.px-game--no-placeholders').count());assert.equal(await p.locator('.px-machine .px-sprite').count(),5);await p.locator('[data-action="placeholders"]').click();
await p.locator('[data-action="compare"]').click();await p.locator('.px-reference img').evaluate(img=>img.decode());
assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'comparison overflow');
const live=await p.locator('.px-live-column').boundingBox(),ref=await p.locator('.px-reference').boundingBox();
assert(width>700?ref.x>live.x+live.width:ref.y>live.y+live.height,'responsive comparison layout');
await p.locator('.px-stage').screenshot({path:fileURLToPath(new URL(`${width}-platform-layout-compare.png`,out))});await p.locator('[data-action="compare"]').click();
for(const section of ['components','assets']){await p.locator(`[data-action="section:${section}"]`).click();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(section==='assets'){assert.equal(await p.locator('.px-materials img').count(),25);await p.locator('.px-materials img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));assert.equal(await p.locator('.px-asset-grid:not(.px-materials) .px-pending').count(),0);assert.equal(await p.locator('.px-asset-grid:not(.px-materials) .px-sprite').count(),6);await p.locator('.px-asset-grid:not(.px-materials) .px-sprite').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));}await p.screenshot({path:fileURLToPath(new URL(`${width}-platform-layout-${section}.png`,out)),fullPage:true});}
assert.deepEqual(errors,[]);results.push({width,height,lang,status:'passed',errors});await ctx.close();
}await fs.writeFile(new URL('results.json',out),JSON.stringify({base,results},null,2));console.log(JSON.stringify(results,null,2));}finally{await browser.close();}

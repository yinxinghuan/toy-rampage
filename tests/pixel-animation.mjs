import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/';
const out=process.env.QA_ANIMATION_OUT||'_qa/pixel-animation';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const [width,height,lang]of [[1440,1000,'zh'],[390,844,'zh'],[320,568,'en']]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<700,recordVideo:{dir:out}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+`?section=animation&lang=${lang}`,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.px-animation[data-ready="true"]').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);
 await page.locator('.px-game img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.locator('[data-anim="pause"]').click();
 const canvas=page.locator('.px-animation__actor'),box=await canvas.boundingBox(),board=await page.locator('.px-board').boundingBox();
 const captures=[];
 for(const n of [0,1,2,3,4,5,6,7]){await page.locator(`[data-anim-frame="${n}"]`).click();assert.equal(await canvas.getAttribute('data-frame'),String(n));assert.deepEqual(await canvas.boundingBox(),{...box,y:(await canvas.boundingBox()).y});captures.push(await canvas.evaluate(c=>c.toDataURL()));}
 assert.equal(new Set(captures).size,8);
 assert.equal((await page.locator('.px-board').boundingBox()).width,board.width);
 await page.locator('[data-anim-frame="5"]').click();await page.locator('.px-game').screenshot({path:`${out}/${width}-${lang}-fire.png`});
 await page.locator('.px-animation__inspection').screenshot({path:`${out}/${width}-${lang}-inspection.png`});
 await page.locator('[data-anim="static"]').first().click();assert(await canvas.isHidden());await page.locator('.px-game').screenshot({path:`${out}/${width}-${lang}-static.png`});
 await page.locator('[data-anim="idle"]').click();const first=await canvas.getAttribute('data-frame');await page.waitForFunction(n=>document.querySelector('.px-animation__actor').dataset.frame!==n,first);
 await page.locator('[data-anim="pause"]').click();const frozen=await canvas.getAttribute('data-frame');await page.waitForTimeout(300);assert.equal(await canvas.getAttribute('data-frame'),frozen);
 for(let n=0;n<3;n++)await page.locator('[data-anim="fire"]').first().click();assert.equal(await page.locator('.px-animation').getAttribute('data-mode'),'fire');await page.waitForFunction(()=>document.querySelector('.px-animation').dataset.mode==='idle');
 await page.locator('.px-game').scrollIntoViewIfNeeded();await page.waitForTimeout(1900);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'domcontentloaded'});await page.locator('.px-animation[data-ready="true"]').waitFor();assert.equal(await page.locator('.px-animation').getAttribute('data-mode'),'pause');
 await page.locator('[data-action="section:experiments"]').click();assert.equal(await page.locator('.px-animation__actor').count(),0);assert.equal(await page.locator('[data-open=true]').count(),12);assert.deepEqual(errors,[]);
 results.push({width,height,lang,status:'passed'});await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();await page.route('**/animation/spring-v1/frame-0.png',route=>route.abort());await page.goto(base+'?section=animation');await page.locator('.px-animation[data-ready="error"]').waitFor();assert(await page.locator('.px-animation__actor').isHidden());assert.equal(await page.locator('.px-board [data-kind="spring"] .px-sprite').evaluate(e=>getComputedStyle(e).visibility),'visible');await page.unroute('**/animation/spring-v1/frame-0.png');await page.locator('[data-anim="retry"]').click();await page.locator('.px-animation[data-ready="true"]').waitFor();await context.close();
 await fs.writeFile(`${out}/results.json`,JSON.stringify({base,results,errorRecovery:'passed'},null,2));console.log(results);
}finally{await browser.close();}

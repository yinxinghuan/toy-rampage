import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_SUPPORT_OUT||'_qa/support-r10';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{for(const [width,height]of[[390,844],[320,568],[1440,1000]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<500}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+`?section=combat&lang=${width===320?'en':'zh'}`);await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);
 const epoch=Date.now();await page.clock.install({time:epoch});await page.clock.pauseAt(epoch+1000);
 await page.locator('[data-battle-weapon=drum]').click();await page.clock.runFor(30);
 assert.equal(await page.locator('.px-battle-buff:visible').count(),1);assert.equal(await page.locator('.px-battle-buff:visible').innerText(),'15%');
 await page.locator('.px-game').screenshot({path:`${out}/${width}-drum-ready.png`});
 await page.locator('[data-battle-rank="4"]').click();await page.clock.runFor(500);assert.equal(await page.locator('.px-battle-buff:visible').innerText(),'30%');
 await page.locator('[data-battle=start]').click();await page.clock.runFor(200);await page.locator('.px-game').screenshot({path:`${out}/${width}-drum-beat.png`});
 await page.locator('[data-battle=reset]:not([inert] *)').first().click();await page.locator('.px-battle__details summary').first().click();await page.locator('[data-battle-phase=support]').click();await page.clock.runFor(30);
 assert.equal(await page.locator('.px-battle-buff:visible').count(),2);assert.deepEqual(await page.locator('.px-battle-buff:visible').allTextContents(),['20%','20%']);await page.locator('.px-game').screenshot({path:`${out}/${width}-support-ready.png`});
 await page.locator('[data-battle=start]').click();await page.clock.runFor(650);await page.locator('.px-game').screenshot({path:`${out}/${width}-support-combat.png`});
 const layers=await page.evaluate(()=>({board:getComputedStyle(document.querySelector('.px-board')).isolation,enemy:+getComputedStyle(document.querySelector('.px-battle-enemies')).zIndex,weapon:+getComputedStyle(document.querySelector('.px-machine')).zIndex,fx:+getComputedStyle(document.querySelector('.px-battle-fx')).zIndex}));assert.equal(layers.board,'auto');assert(layers.enemy<layers.weapon&&layers.weapon<layers.fx);
 await page.locator('[data-battle=reset]:not([inert] *)').first().click();await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(20);assert.equal(await page.locator('.px-battle-buff:visible').count(),2);await page.locator('.px-game').screenshot({path:`${out}/${width}-support-reduced.png`});
 await page.locator('[data-battle=clear]').click();await page.clock.runFor(20);assert.equal(await page.locator('.px-battle-buff:visible').count(),0);assert.equal(await page.locator('.px-battle').getAttribute('data-support'),'[]');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);results.push({width,height,layers,status:'passed'});await context.close();
 }await fs.writeFile(out+'/results.json',JSON.stringify({base,results},null,2));console.log(results);
}finally{await browser.close();}

import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_AUDIO_OUT||'_qa/audio-r19';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{for(const width of [320,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:width===320?568:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>{window.__qaContexts=[];const Original=window.AudioContext;window.AudioContext=class extends Original{constructor(...args){super(...args);window.__qaContexts.push(this);}};});
 await page.goto(base+'?section=combat&lang='+(width===320?'en':'zh'),{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});
 const toggle=page.locator('[data-audio-toggle]');assert.equal(await toggle.getAttribute('aria-pressed'),'true');await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(await page.evaluate(()=>__qaContexts.length),0);
 const rect=await toggle.boundingBox();assert(rect.width>=44&&rect.height>=44);
 const overlap=await toggle.evaluate(b=>{const a=b.getBoundingClientRect(),t=document.querySelector('.px-title-plate').getBoundingClientRect();return a.right>t.left&&a.bottom>t.top&&a.top<t.bottom;});assert(!overlap,'sound control does not cover title');
 await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'true');await page.waitForFunction(()=>__qaContexts.some(c=>c.state==='running'));
 await page.locator('[data-battle=start]').click();await toggle.click();await page.waitForFunction(()=>__qaContexts.every(c=>c.state!=='running'));
 await page.locator('[data-battle=pause]').first().click();assert(await toggle.isEnabled());assert.equal(await toggle.evaluate(e=>Boolean(e.closest('[inert]'))),false);
 await toggle.click();await page.waitForFunction(()=>__qaContexts.some(c=>c.state==='running'));await toggle.focus();await page.keyboard.press('Space');assert.equal(await toggle.getAttribute('aria-pressed'),'false');
 await page.locator('.px-game').screenshot({path:`${out}/${width}-pause-muted.png`});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.px-battle[data-ready=true]').waitFor();assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(await page.evaluate(()=>__qaContexts.length),0);
 await toggle.click();await page.reload({waitUntil:'domcontentloaded'});await page.locator('.px-battle[data-ready=true]').waitFor();assert.equal(await toggle.getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>__qaContexts.length),0,'saved ON does not autoplay');
 await page.locator('[data-battle=start]').click();await page.waitForFunction(()=>__qaContexts.some(c=>c.state==='running'));await toggle.click();
 const media=await page.evaluate(async()=>{const a=document.querySelector('audio');a.muted=false;await new Promise(r=>setTimeout(r,50));return [...document.querySelectorAll('audio')].every(a=>a.muted);});assert(media,'auditions cannot bypass master mute');
 await page.locator('[data-action="section:scene"]').click();for(const s of ['ready','pause','upgrade','win','lose','error']){await page.locator(`.px-states [data-action="state:${s}"]`).click();assert.equal(await toggle.evaluate(e=>Boolean(e.closest('[inert]'))),false);await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'true');await toggle.click();}
 await page.locator('.px-states [data-action="state:ready"]').click();await page.locator('.px-game img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode().catch(()=>{}))));await page.locator('.px-game').screenshot({path:`${out}/${width}-ready-muted.png`});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);results.push({width,status:'passed'});await context.close();
}
 const context=await browser.newContext(),page=await context.newPage();await context.addInitScript(()=>{window.AudioContext=class{constructor(){throw Error('QA audio unavailable');}};});await page.goto(base+'?section=combat');await page.locator('.px-battle[data-ready=true]').waitFor();await page.locator('[data-audio-toggle]').click();await page.locator('[data-battle=start]').click();assert.equal(await page.locator('.px-battle').getAttribute('data-stage'),'wave');await page.locator('[data-audio-toggle]').click();await context.close();
 await fs.writeFile(out+'/results.json',JSON.stringify({results,unavailableAudio:'non-fatal',checked:'mute suspends context, media follows master, reload preferences, no autoplay, keyboard, modal access, 44px targets'},null,2));console.log(results);
}finally{await browser.close();}

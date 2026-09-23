import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_AUDIO_OUT||'_qa/audio-r10';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch();
try{const page=await browser.newPage({viewport:{width:320,height:568},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'?section=combat&lang=en');await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});
 await page.locator('[data-battle=start]').click();await page.locator('.px-battle__details summary').last().click();const audio=page.locator('.px-battle audio');assert.equal(await audio.count(),7);
 for(let i=0;i<7;i++){await audio.nth(i).evaluate(a=>a.play());await page.waitForTimeout(80);assert.equal(await page.locator('.px-battle').getAttribute('data-paused'),'true');assert(await audio.nth(i).evaluate(a=>a.currentTime>0&&!a.error));assert.equal(await audio.evaluateAll(as=>as.filter(a=>!a.paused).length),1);}
 await page.locator('.px-battle__audio').screenshot({path:out+'/320-auditions.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('[data-battle=pause]:not([inert] *)').first().click();assert.equal(await audio.evaluateAll(as=>as.filter(a=>!a.paused).length),0);assert.equal(await page.locator('.px-battle').getAttribute('data-paused'),'false');assert.deepEqual(errors,[]);console.log('PASS seven WAV auditions, one-at-a-time, combat pause/resume, 320px overflow');
}finally{await browser.close();}

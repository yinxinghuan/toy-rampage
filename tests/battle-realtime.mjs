import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_BATTLE_OUT||'_qa/battle-realtime';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch();
try{const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:out}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Observe real Web Audio nodes without replacing the audio implementation.
 await page.addInitScript(()=>{window.__audioObserved=[];const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.__audioObserved.push(this.state);return original.call(this);};});
 await page.goto(base+'?section=combat&lang=zh');await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('[data-battle=sound]').getAttribute('aria-pressed'),'false');assert.equal(await page.evaluate(()=>window.__audioObserved.length),0);
 await page.locator('[data-battle=sound]').click();assert.equal(await page.locator('[data-battle=sound]').getAttribute('aria-pressed'),'true');
 await page.locator('.px-battle__details summary').first().click();await page.locator('[data-battle-phase=support]').click();await page.locator('[data-battle=start]').click();await page.locator('.px-game').scrollIntoViewIfNeeded();
 await page.evaluate(()=>{window.__frameDeltas=[];let prev=performance.now();function sample(t){window.__frameDeltas.push(t-prev);prev=t;if(window.__frameDeltas.length<600)requestAnimationFrame(sample);}requestAnimationFrame(sample);});
 for(let i=0;i<12;i++){await page.waitForTimeout(1000);if(await page.locator('[data-battle-choice]').count()){await page.locator('.px-game').screenshot({path:out+'/upgrade-choice.png'});await page.locator('[data-battle-choice]').first().click();}}
 await page.locator('.px-game').screenshot({path:out+'/support.png'});
 const result=await page.evaluate(()=>{const samples=window.__frameDeltas.filter(n=>n>0).sort((a,b)=>a-b);return{dataset:{...document.querySelector('.px-battle').dataset},audioNodes:window.__audioObserved.length,audioStates:[...new Set(window.__audioObserved)],frames:samples.length,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],over50ms:samples.filter(n=>n>50).length};});assert(result.audioNodes>0);assert.deepEqual(result.audioStates,['running']);assert.deepEqual(errors,[]);
 await page.locator('[data-battle=sound]').click();const silent=await page.evaluate(()=>window.__audioObserved.length);await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__audioObserved.length),silent);
 await page.locator('[data-battle=reset]:not([inert] *)').first().click();await page.locator('[data-battle-phase=fusion]').click();await page.locator('[data-battle=start]').click();await page.locator('.px-game').scrollIntoViewIfNeeded();await page.waitForTimeout(2800);await page.locator('.px-game').screenshot({path:out+'/fusion.png'});
 await fs.writeFile(out+'/results.json',JSON.stringify({base,clock:'real time; desktop Chromium mobile viewport, not physical phone performance',...result},null,2));console.log(result);await context.close();
}finally{await browser.close();}

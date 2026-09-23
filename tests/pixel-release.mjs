import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5194/',out=process.env.QA_OUT||'_qa/release-r20';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{window.__audioContexts=[];const Original=window.AudioContext;window.AudioContext=class extends Original{constructor(...a){super(...a);window.__audioContexts.push(this);}};});
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'?lang=zh',{waitUntil:'domcontentloaded',timeout:60000});await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:60000});
 await p.evaluate(()=>document.fonts.ready);assert.equal(await p.locator('meta[name=build-id]').getAttribute('content'),process.env.QA_BUILD||'toy-rampage-playtest-20260912-r21');
 assert.equal(await p.locator('script[src*="guest-shell"]').count(),0);
 const audio=p.locator('[data-audio-toggle]');assert.equal(await audio.getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>__audioContexts.length),0);
 await p.locator('#title').tap();assert.equal(await audio.getAttribute('aria-pressed'),'true');await p.waitForFunction(()=>__audioContexts.some(c=>c.state==='running'));
 await audio.tap();await p.waitForFunction(()=>__audioContexts.every(c=>c.state!=='running'));
 await p.screenshot({path:out+'/390-entry-external.png'});
 await p.locator('[data-source=tray]').tap();await p.locator('[data-cell="0,0"]').tap();await p.waitForFunction(()=>document.querySelector('.tw').dataset.stage==='second',{},{timeout:15000});
 const frames=await p.locator('.px-battle-actor').evaluate(e=>({rank:e.dataset.rank,motion:e.dataset.motion}));assert.equal(frames.rank,'1');
 await p.screenshot({path:out+'/390-teaching-result-external.png'});
 await p.locator('[data-action=pause]').tap();await p.waitForTimeout(250);assert.equal(await audio.evaluate(e=>Boolean(e.closest('[inert]'))),false);assert.equal(await p.locator('.tw__field').getAttribute('inert'),'');
 await audio.tap();await audio.focus();await p.keyboard.press('Space');assert.equal(await audio.getAttribute('aria-pressed'),'false');
 const panel=await p.locator('.tw__modal').boundingBox();assert(panel.x>=0&&panel.x+panel.width<=390&&panel.y>=0&&panel.y+panel.height<=790);
 await p.screenshot({path:out+'/390-menu-external.png'});await p.locator('[data-action=resume]').tap();assert.equal(await p.locator('.tw__field').getAttribute('inert'),null);
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:60000});assert.equal(await p.locator('.tw').getAttribute('data-stage'),'place');assert.equal(await audio.getAttribute('aria-pressed'),'false');
 await p.goto(base+'?lang=zh&skin=classic',{waitUntil:'domcontentloaded'});await p.locator('.tw[data-stage=place]').waitFor();assert.equal(await p.locator('.tw-pixel').count(),0);await p.locator('[data-source=tray]').tap();await p.locator('[data-cell="0,0"]').tap();assert.equal(await p.locator('.tw').getAttribute('data-stage'),'watch');
 assert.deepEqual(errors,[]);await context.close();
 if(!base.startsWith('https:')){const ctx=await browser.newContext(),page=await ctx.newPage();await page.route('**/spring-v1/frame-0.png',r=>r.abort());await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.tw-pixel-loading[role=alert]').waitFor();await page.unroute('**/spring-v1/frame-0.png');await page.locator('.tw-pixel-loading button').click();await page.locator('.tw[data-renderer=pixel]').waitFor();await ctx.close();}
 console.log('PASS real-time published-build entry, tutorial hit, audio, modal bounds/inert, reload and classic; errors=0');
}finally{await browser.close();}

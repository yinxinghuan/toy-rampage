import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const ready=()=>p.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000}),toggle=()=>p.locator('[data-audio-toggle]');
 await p.goto((process.env.QA_BASE||'http://127.0.0.1:5194/')+'?lang=en');await ready();
 assert.equal(await toggle().getAttribute('data-audio-state'),'muted');await toggle().tap();await p.locator('[data-audio-state=running]').waitFor();await p.waitForTimeout(650);
 const preference=()=>p.evaluate(()=>window.alteruLocalStorage.getItem('pixel-audio-muted-v1'));assert.equal(await preference(),'false');
 await p.reload();await ready();assert.equal(await preference(),'false');assert.notEqual(await toggle().getAttribute('data-audio-state'),'muted');
 await p.locator('[data-action=recover-run]').tap();await p.locator('[data-audio-state=running]').waitFor();await toggle().tap();assert.equal(await preference(),'true');
 await p.reload();await ready();assert.equal(await toggle().getAttribute('data-audio-state'),'muted');assert.equal(await preference(),'true');assert.deepEqual(errors,[]);
 await fs.mkdir('_qa/ui',{recursive:true});await fs.writeFile('_qa/ui/audio-recovery.json',JSON.stringify({defaultMuted:true,enabledPreferenceSurvives:true,gestureUnlock:true,mutedPreferenceSurvives:true,errors},null,2));console.log('audio recovery passed');
}finally{await browser.close();}

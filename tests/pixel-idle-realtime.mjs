import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_IDLE_OUT||'_qa/idle-r15-realtime';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:out}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?lang=zh&section=combat');await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);
 await page.locator('.px-battle__details summary').first().click();await page.locator('[data-battle-phase=fusion]').click();await page.locator('.px-game').scrollIntoViewIfNeeded();
 const seen={},sample=async()=>{for(const {kind,hash}of await page.locator('.px-battle-actor').evaluateAll(cs=>cs.map(c=>{let h=2166136261;for(const v of c.getContext('2d').getImageData(0,0,c.width,c.height).data)h=Math.imul(h^v,16777619)>>>0;return{kind:c.parentElement.dataset.kind,hash:h};})))(seen[kind]??=new Set()).add(hash);};
 for(let i=0;i<40;i++){await page.waitForTimeout(200);await sample();if(i%5===0)await page.locator('.px-game').screenshot({path:`${out}/loadout-${i}.png`});}
 assert.equal(await page.locator('.px-battle').getAttribute('data-stage'),'ready');assert.equal(await page.locator('.px-battle').getAttribute('data-shots'),'{}');
 await page.locator('[data-battle-weapon=rail]').click();await page.locator('.px-game').scrollIntoViewIfNeeded();for(let i=0;i<30;i++){await page.waitForTimeout(200);await sample();}
 for(const[k,v]of Object.entries(seen))assert(v.size>1,k+' real-time pixels change');assert.equal(Object.keys(seen).length,6);
 await page.locator('[data-battle=start]').click();await page.waitForTimeout(1800);assert(JSON.parse(await page.locator('.px-battle').getAttribute('data-shots')).rail>0);await page.locator('.px-game').screenshot({path:out+'/attack.png'});
 assert.deepEqual(errors,[]);await context.close();await fs.writeFile(out+'/results.json',JSON.stringify({base,clock:'real time, no virtual clock; desktop Chromium mobile viewport, not physical-phone performance',uniquePixels:Object.fromEntries(Object.entries(seen).map(([k,v])=>[k,v.size])),errors},null,2));console.log('real-time idle and attack passed');
}finally{await browser.close();}

import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5194/';
const out='_qa/economy-r35';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.goto(base+'?lang=zh&v=r35',{waitUntil:'domcontentloaded'});
 await page.locator('.tw[data-renderer=pixel]').waitFor();await page.clock.runFor(1000);
 const act=async id=>{await page.locator(`[data-action="${id}"]`).filter({visible:true}).tap();await page.clock.runFor(300);};
 await act('pause');await act('levels');await act('level-0');await act('confirm');
 await page.locator('[data-cell="0,0"]').tap();await page.clock.runFor(100);await act('pause');
 assert.match(await page.locator('[data-action="sell"]').innerText(),/1/);
 await act('sell');await page.screenshot({path:out+'/salvage-confirm-390.png'});
 await act('cancel');assert.equal(await page.locator('#coins').innerText(),'0');
 await act('sell');await act('confirm');assert.equal(await page.locator('#coins').innerText(),'1');
 await page.screenshot({path:out+'/salvage-result-390.png'});
 await act('records');const download=page.waitForEvent('download');await act('export');
 const record=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));
 assert.equal(record.build,'toy-rampage-playtest-20260912-r35');
 assert.deepEqual(record.current.economyLog.map(e=>[e.reason,e.delta]),[['salvage',1]]);
 assert.equal(record.current.units.some(u=>u.kind==='spring'),false);
 assert.deepEqual(errors,[]);console.log('PASS actual menu salvage, cancellation, gears and exported ledger',base);
}finally{await browser.close();}

import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const browser=await chromium.launch({headless:true});
await fs.mkdir('_qa/ui',{recursive:true});
try{for(const [width,height,lang] of [[320,568,'en'],[390,844,'zh']]){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto((process.env.QA_BASE||'http://127.0.0.1:5193/')+'?lang='+lang);
 await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000});
 const act=async a=>{await p.locator(`[data-action="${a}"]`).filter({visible:true}).tap();await p.waitForTimeout(300);};
 await act('pause');await act('levels');await act('level-5');await act('confirm');await act('pause');await act('handbook');
 assert.equal(await p.locator('[data-route]').count(),3);
 assert.equal(await p.locator('[data-route=storm] [data-machine="storm:4"]').count(),1);
 const measure=await p.locator('.tw__modal').evaluate(e=>({width:e.scrollWidth,client:e.clientWidth,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}));
 assert(measure.width<=measure.client+1);assert(measure.top>=0&&measure.bottom<=height);
 await p.screenshot({path:`_qa/ui/step4-handbook-${width}-top.png`});
 await p.locator('[data-route=storm]').scrollIntoViewIfNeeded();await p.screenshot({path:`_qa/ui/step4-handbook-${width}-routes.png`});
 assert(await p.locator('[data-action=back]').isVisible());await act('back');await act('resume');
 assert.equal(await p.locator('.tw').getAttribute('data-stage'),'ready');assert.deepEqual(errors,[]);await ctx.close();
 console.log(`${width} handbook passed`);
}}finally{await browser.close();}

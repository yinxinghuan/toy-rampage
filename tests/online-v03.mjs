import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});
const base='https://game.aiwaves.tech/0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae/',out=fileURLToPath(new URL('../_qa/ui/',import.meta.url));
const results=[];await fs.mkdir(out,{recursive:true});
try{
 for(const [width,height,lang] of [[390,844,'zh'],[320,568,'en']]){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?lang='+lang,{waitUntil:'networkidle'});
  assert.equal(await p.locator('#version').textContent(),'v0.3.0');
  await p.screenshot({path:out+`live-v03-external-guest-${width}-entry.png`});
  const banner=await p.locator('#alteru-guest-banner').isVisible();
  await p.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
  const b=a=>p.locator(`[data-action="${a}"]`),tap=async a=>b(a).tap();
  await tap('pause');await tap('levels');await p.screenshot({path:out+`live-v03-platform-layout-${width}-levels.png`});
  for(const level of [1,2,3]){
   await tap('level-'+level);await tap('confirm');assert.equal(await p.locator('.tw').getAttribute('data-level'),String(level+1));assert.equal(await p.locator('#coins').textContent(),'8');assert.equal(await p.locator('#hp').textContent(),'100');
   if(level<3){await tap('pause');await tap('levels');}
  }
  // No game-state injection or accelerated clock: actual online loss and retry.
  await tap('main');await tap('speed');await p.locator('.tw[data-stage="lose"]').waitFor({timeout:25000});
  await p.screenshot({path:out+`live-v03-platform-layout-${width}-lose.png`});
  await tap('records');await tap('wave-record-0');await p.screenshot({path:out+`live-v03-platform-layout-${width}-records.png`});
  const waiting=p.waitForEvent('download');await tap('export');const d=await waiting;const log=JSON.parse(await fs.readFile(await d.path(),'utf8'));
  assert.equal(log.current.level,4);assert.equal(log.current.history[0].outcome,'lose');assert.equal(log.current.hp,0);assert.equal(log.current.initialSeed,9173);
  await tap('back');await tap('run');assert.equal(await p.locator('.tw').getAttribute('data-level'),'4');assert.equal(await p.locator('#hp').textContent(),'100');assert.equal(await p.locator('#coins').textContent(),'8');
  assert.deepEqual(errors,[]);results.push({width,height,lang,banner,liveLevel4Failure:log.current.history[0],retry:true,errors});await ctx.close();
 }
 await fs.writeFile(out+'live-v03-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}

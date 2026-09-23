import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5194/',out=process.env.QA_OUT||'_qa/records-r38';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch();const results=[];
try{for(const [width,height,lang,level]of [[390,844,'zh',4],[320,568,'en',5]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();
 await p.goto(base+'?lang='+lang+'&v=r38',{waitUntil:'domcontentloaded'});await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000});assert.equal(await p.locator('#version').textContent(),'r38');
 const act=async a=>{await p.locator(`[data-action="${a}"]`).filter({visible:true}).tap();await p.clock.runFor(350);},stage=()=>p.locator('.tw').getAttribute('data-stage');
 await act('pause');await act('levels');await act('level-'+level);await act('confirm');
 for(let w=0;w<8&&await stage()!=='lose';w++){
  await act('main');for(let i=0;i<100&&await stage()==='wave';i++){if(await p.locator('[data-action="upgrade-0"]').isVisible())await act('upgrade-0');else await p.clock.runFor(1000);}
  await p.clock.runFor(700);
 }
 assert.equal(await stage(),'lose');await p.screenshot({path:`${out}/${width}-failure.png`});await act('records');
 const rows=p.locator('[data-action^="wave-record-"]');await rows.last().tap();await p.clock.runFor(350);
 const report=p.locator('.tw-report');await report.scrollIntoViewIfNeeded();assert(await report.isVisible());assert(await report.locator('.tw-report__leak').count());
 assert(await report.locator('.tw-report__damage').count()<=3);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.screenshot({path:`${out}/${width}-breakdown.png`});
 const download=p.waitForEvent('download');await act('export');const file=await download,record=JSON.parse(await fs.readFile(await file.path(),'utf8'));
 const h=record.current.history.at(-1);assert.equal(Object.values(h.combat.leaked).reduce((n,e)=>n+e.count,0),h.leaks);assert.equal(record.build,'toy-rampage-playtest-20260912-r38');
 await rows.last().tap();await p.clock.runFor(350);assert.equal(await report.count(),0);
 await rows.last().tap();await p.clock.runFor(350);assert(await report.isVisible());
 await act('back');await act('run');assert.equal(await stage(),'ready');assert.deepEqual(errors,[]);results.push({width,lang,record,errors});await context.close();
 }}finally{await browser.close();}await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log('PASS records',results.map(r=>r.width));

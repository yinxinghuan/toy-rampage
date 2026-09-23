import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {restoreRun} from '../src/save.js';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const browser=await chromium.launch({headless:true}),results=[];
await fs.mkdir('_qa/ui',{recursive:true});
try{for(const[width,height,lang]of[[320,568,'en'],[390,844,'zh']]){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.clock.install();
 const ready=()=>p.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000});
 await p.goto((process.env.QA_BASE||'http://127.0.0.1:5193/')+'?lang='+lang);await ready();await p.clock.runFor(800);
 const btn=a=>p.locator(`[data-action="${a}"]`).filter({visible:true}),act=async a=>{await btn(a).tap();await p.clock.runFor(300);};
 const read=()=>p.evaluate(()=>JSON.parse(window.alteruLocalStorage.getItem('toy-workshop-run-v1')));
 const reload=async()=>{await p.reload();await ready();await p.clock.runFor(800);assert(await btn('recover-run').isVisible());await p.keyboard.press('Escape');assert(await btn('recover-run').isVisible());};
 await act('pause');await act('levels');await act('level-5');await act('confirm');await act('pause');await p.clock.runFor(600);
 const before=await read();await reload();assert.deepEqual((await read()).state.units,before.state.units);
 await p.screenshot({path:`_qa/ui/recovery-${width}-prompt.png`});await act('recover-run');await act('pause');await p.clock.runFor(600);
 const restored=await read();for(const k of ['units','reserve','coins','board','wave','seed'])assert.deepEqual(restored.state[k],before.state[k]);
 await act('resume');await act('main');await p.clock.runFor(1500);await act('pause');await p.clock.runFor(600);const battle=await read();assert(battle.state.enemies.length>0);
 await reload();await act('recover-run');await act('pause');await p.clock.runFor(600);const continued=await read();
 assert.equal(continued.state.wave,battle.state.wave);assert.equal(continued.state.seed,battle.state.seed);assert(continued.state.elapsed>=battle.state.elapsed);assert(continued.state.elapsed-battle.state.elapsed<1);
 const mirror=restoreRun(battle);mirror.paused=false;const ticks=Math.round((continued.state.elapsed-battle.state.elapsed)*60);for(let i=0;i<ticks;i++)mirror.tick(1/60);
 for(const key of ['units','enemies','kills','hp','coins','spawnLeft','combatReport'])assert.deepEqual(continued.state[key],mirror[key],key+' after resumed frames');
 await act('resume');let upgrade;
 for(let i=0;i<60;i++){if(await btn('upgrade-0').isVisible()){upgrade=true;break;}await p.clock.runFor(1500);}
 assert(upgrade,'normal battle reaches an upgrade');await p.clock.runFor(600);const choice=await read();await reload();await act('recover-run');
 assert.deepEqual(await p.locator('[data-upgrade]').evaluateAll(es=>es.map(e=>e.dataset.upgrade)),choice.state.choices);
 await p.screenshot({path:`_qa/ui/recovery-${width}-upgrade.png`});await act('upgrade-0');await p.clock.runFor(600);assert.equal((await read()).state.upgradeLog.length,choice.state.upgradeLog.length+1);
 await reload();await act('recover-new');assert.equal(await p.locator('.tw').getAttribute('data-stage'),'place');await p.clock.runFor(600);assert.equal((await read()).state.wave,0);
 assert.deepEqual(errors,[]);results.push({width,ready:true,battle:true,upgrade:true,restart:true,errors});await ctx.close();console.log(`${width} recovery passed`);
}
 for(const failure of ['invalid','unavailable']){
  const ctx=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  if(failure==='invalid')await p.addInitScript(()=>localStorage.setItem('alteru:0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae:toy-workshop-run-v1','{broken'));
  else await p.route('**/alteru-storage-scope.js',r=>r.fulfill({contentType:'text/javascript',body:'window.alteruLocalStorage={getItem(){throw Error("denied")},setItem(){throw Error("quota")}};'}));
  await p.clock.install();await p.goto((process.env.QA_BASE||'http://127.0.0.1:5193/')+'?lang=en');await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000});await p.clock.runFor(600);
  assert.equal(await p.locator('[data-action=recover-run]').count(),0);assert.equal(await p.locator('.tw').getAttribute('data-stage'),'place');
  assert.match(await p.locator('.tw__notice').textContent(),failure==='invalid'?/could not be restored/:/Auto-save unavailable/);
  await p.screenshot({path:`_qa/ui/recovery-320-${failure}.png`});assert.deepEqual(errors,[]);results.push({failure,playable:true,errors});await ctx.close();
 }
 await fs.writeFile('_qa/ui/recovery-results.json',JSON.stringify(results,null,2));}finally{await browser.close();}

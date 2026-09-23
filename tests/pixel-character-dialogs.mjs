import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_CHARACTER_OUT||'_qa/character-r12';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{
 for(const [width,height,lang]of [[390,844,'zh'],[320,568,'en']]){
  const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const state of ['win','lose','upgrade']){
   await p.goto(base+'?lang='+lang+'&state='+state+'&illustrations=character');await p.locator('.px-dialog-hero').evaluate(i=>i.decode());
   for(const variant of ['objects','character','cast']){
    await p.locator('[data-illustration-choice='+variant+']').click();await p.locator('.px-dialog-hero').evaluate(i=>i.decode());assert.equal(await p.locator('.px-dialog-hero').getAttribute('data-illustration'),variant);
    assert.equal(new URL(p.url()).searchParams.get('illustrations'),variant);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(state==='upgrade')assert(await p.locator('.px-rich-dialog').evaluate(d=>{const last=d.querySelector('.px-upgrade:last-child').getBoundingClientRect(),box=d.getBoundingClientRect();return last.bottom<=box.bottom-10;}),'all three choices initially visible');
    await p.locator('.px-game').screenshot({path:out+'/'+width+'-'+state+'-'+variant+'.png'});
   }
  }
  await p.reload();assert.equal(await p.locator('[data-illustration-choice=cast]').getAttribute('aria-pressed'),'true');
  await p.goto(base+'?lang='+lang+'&section=combat');
  await p.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});
  const epoch=Date.now();await p.clock.install({time:epoch});await p.clock.pauseAt(epoch+1000);
  await p.locator('[data-battle-rank="4"]').click();await p.locator('[data-battle=start]').click();await p.clock.runFor(800);
  const before=await p.locator('.px-battle').evaluate(e=>({...e.dataset}));
  await p.locator('[data-illustration-choice=objects]').click();const after=await p.locator('.px-battle').evaluate(e=>({...e.dataset}));
  assert.equal(after.elapsed,before.elapsed);assert.equal(after.hp,before.hp);assert.equal(after.stage,before.stage);assert.equal(after.kills,before.kills);
  for(let i=0;i<40&&!await p.locator('[data-battle-choice]').count();i++)await p.clock.runFor(500);
  assert.equal(await p.locator('[data-battle-choice]').count(),3);const choices=await p.locator('[data-battle-choice]').allTextContents(),elapsed=await p.locator('.px-battle').getAttribute('data-elapsed');
  await p.locator('[data-illustration-choice=cast]').click();await p.locator('.px-dialog-hero').evaluate(i=>i.decode());
  assert.deepEqual(await p.locator('[data-battle-choice]').allTextContents(),choices);assert.equal(await p.locator('.px-battle').getAttribute('data-elapsed'),elapsed);
  await p.locator('.px-game').screenshot({path:out+'/'+width+'-real-upgrade.png'});
  await p.locator('[data-battle-choice]').first().click();assert.equal(await p.locator('[data-battle-choice]').count(),0);
  await p.clock.runFor(100);assert(Number(await p.locator('.px-battle').getAttribute('data-elapsed'))>Number(elapsed));
  assert.deepEqual(errors,[]);results.push({width,height,lang,toggleWithoutReset:'passed',pendingUpgradePreserved:'passed'});await p.close();
 }
 await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}

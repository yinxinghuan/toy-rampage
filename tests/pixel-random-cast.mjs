import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CAST_POOLS} from '../src/pixel/dialog-cast.js';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_CAST_OUT||'_qa/random-cast-r14';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),report=[];
try{
 for(const [width,height,lang]of [[390,844,'zh'],[320,568,'en']]){
  const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  for(const state of ['win','lose']){
   await p.goto(base+'?lang='+lang+'&state='+state+'&illustrations=cast');
   const img=p.locator('[data-dialog-hero]'),next=p.locator('[data-cast-next]'),seen=[];
   for(let i=0;i<6;i++){
    await img.evaluate(i=>i.decode());const id=await img.getAttribute('data-cast-asset');seen.push(id);
    assert(CAST_POOLS[state].includes(id));if(i)assert.notEqual(id,seen[i-1]);
    const src=await img.getAttribute('src'),copy=await p.locator('.px-rich-dialog').innerText();
    await p.locator('[data-illustration-choice=objects]').click();assert(await next.isHidden());
    await p.locator('[data-illustration-choice=cast]').click();await img.evaluate(i=>i.decode());
    assert.equal(await img.getAttribute('src'),src,'switch back preserves character');assert.equal(await p.locator('.px-rich-dialog').innerText(),copy);
    if(i<3)await p.locator('.px-game').screenshot({path:out+'/'+width+'-'+id+'.png'});
    assert(await next.evaluate(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44;}));
    if(i<5)await next.click();
   }
   assert.equal(new Set(seen.slice(0,3)).size,3);assert.equal(new Set(seen.slice(3,6)).size,3);
   // A fresh result gets another draw, while the existing dialog remains stable.
   const old=await img.getAttribute('data-cast-asset');await p.waitForTimeout(300);assert.equal(await img.getAttribute('data-cast-asset'),old);
   await p.locator('.px-states [data-action="state:ready"]').click();assert(await next.isHidden());
   await p.locator('.px-states [data-action="state:'+state+'"]').click();await img.evaluate(i=>i.decode());assert.notEqual(await img.getAttribute('data-cast-asset'),old);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.push({width,height,lang,state,seen,newResultDraw:'passed',stableDuringToggle:'passed'});
  }
  await p.goto(base+'?lang='+lang+'&state=upgrade');await p.locator('[data-dialog-hero]').evaluate(i=>i.decode());assert(await p.locator('[data-cast-next]').isHidden());
  assert.deepEqual(errors,[]);await p.close();
 }
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}

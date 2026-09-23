import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_PIXEL_OUT||'_qa/dialog-r11';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const [width,height,lang]of [[390,844,'zh'],[320,568,'zh'],[320,568,'en'],[1440,1000,'en']]){
  const p=await browser.newPage({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  for(const state of ['win','lose','upgrade','pause','loading','error']){
   await p.goto(base+'?lang='+lang+'&state='+state);
   await p.locator('.px-rich-dialog').waitFor();
   await p.locator('.px-rich-dialog img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
   await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(220);
   const check=await p.locator('.px-rich-dialog').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {width:r.width,height:r.height,overflow:el.scrollWidth>el.clientWidth+1,titleLoaded:el.querySelector('[data-dialog-title]')?el.querySelector('h2').dataset.loaded==='true':true,small:[...el.querySelectorAll('button')].some(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}),blocked:[...el.parentElement.parentElement.children].filter(c=>c!==el.parentElement).every(c=>c.inert)};
   });
   assert(!check.overflow,'horizontal overflow '+state);assert(check.titleLoaded,'image title '+state);assert(!check.small,'tap size '+state);assert(check.blocked,'background inactive');
   await p.locator('.px-game').screenshot({path:out+'/'+width+'-'+lang+'-'+state+'.png'});
   const last=p.locator('.px-rich-dialog button').last();await last.scrollIntoViewIfNeeded();assert(await last.isVisible());
   results.push({width,height,lang,state,...check});
  }
  await p.goto(base+'?lang='+lang+'&state=ready');
  await p.locator('[data-action=batch]').click();
  await p.locator('.px-dialog-hero').evaluate(i=>i.decode());
  await p.locator('.px-game').screenshot({path:out+'/'+width+'-'+lang+'-confirm.png'});
  await p.locator('[data-action=cancel]').click();assert.equal(await p.locator('.px-overlay').count(),0);
  await p.goto(base+'?lang='+lang+'&section=assets');assert.equal(await p.locator('.px-dialog-materials figure').count(),22);
  assert.deepEqual(errors,[]);await p.close();
 }
 const p=await browser.newPage({viewport:{width:320,height:568}});
 await p.route('**/ui/dialog-titles-v2/title-*.png',r=>r.abort());await p.route('**/ui/dialog-cast-v1/win*.png',r=>r.abort());
 await p.goto(base+'?lang=zh&state=win');await p.locator('.px-rich-dialog img[hidden]').first().waitFor({state:'attached'});
 assert.equal(await p.locator('.px-dialog-title>span').innerText(),'守住了！');
 assert(await p.locator('.px-dialog-title>span').isVisible());await p.locator('.px-rich-dialog button').first().click();assert.equal(await p.locator('.px-overlay').count(),0);
 await fs.writeFile(out+'/report.json',JSON.stringify({results,missingImageFallback:'passed'},null,2));
 console.log(JSON.stringify({states:results.length,missingImageFallback:'passed',out}));
}finally{await browser.close();}

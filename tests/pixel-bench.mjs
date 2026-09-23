import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_BENCH_OUT||'_qa/bench-r18';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{for(const [width,height]of [[390,844],[320,568],[1440,1000]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:width<700}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const section of ['combat','experiments','scene','aim']){
  await page.goto(base+`?section=${section}&lang=${width===320?'en':'zh'}`,{waitUntil:'domcontentloaded',timeout:60000});
  if(section==='combat'||section==='aim')await page.locator(`.px-${section==='combat'?'battle':'aim'}[data-ready=true]`).waitFor({timeout:60000});
  const kinds=section==='combat'?['spring','rail','mortar','bubble','drum','fusion']:section==='experiments'?['spring','rail','mortar','bubble','drum']:['default'];
  for(const kind of kinds){
   if(section==='combat')await page.locator(`[data-battle-weapon=${kind}]`).click();
   if(section==='experiments')await page.locator('[data-exp-kind]').selectOption(kind);
   for(const tier of section==='combat'&&kind!=='fusion'?[1,4]:[1]){
    if(section==='combat'&&kind!=='fusion')await page.locator(`[data-battle-rank="${tier}"]`).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.px-bench__slot img')].every(i=>i.complete&&i.naturalWidth&&i.dataset.benchFit==='true'));
    const metrics=await page.locator('.px-bench').evaluate(bench=>{
     const b=bench.getBoundingClientRect();return [...bench.querySelectorAll('.px-bench__slot')].map(slot=>{
      const s=slot.getBoundingClientRect(),rank=slot.querySelector('.px-rank')?.getBoundingClientRect(),img=slot.querySelector('img');
      let ink=null;if(img){const i=img.getBoundingClientRect(),scale=Math.min(i.width/img.naturalWidth,i.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;ink={w,h,dx:Math.abs(i.x+i.width/2-(s.x+s.width/2)),base:(i.bottom-s.top)/s.height,top:i.bottom-h-s.top};}
      return{w:s.width,h:s.height,inside:s.x>=b.x&&s.right<=b.right+.5&&s.y>=b.y&&s.bottom<=b.bottom+.5,rankInside:!rank||rank.x>=s.x+2&&rank.right<=s.right-2&&rank.y>=s.y+2&&rank.bottom<=s.bottom-2,ink};
     });
    });
    assert.equal(metrics.length,3);for(const m of metrics){assert(m.w>=44&&m.h>=44,'44px touch box');assert(m.inside&&m.rankInside,'slot/rank stay inside tray');if(m.ink){assert(Math.max(m.ink.w,m.ink.h)>=Math.min(m.w,m.h)*.64,'readable silhouette');assert(m.ink.dx<m.w*.08,'horizontal centering');assert(Math.abs(m.ink.base-.78)<.01,'shared table contact baseline');assert(m.ink.top>=-m.h*.23,'bounded upward silhouette');}}
    if(section==='combat'&&kind==='spring'&&tier===1)assert(metrics[0].ink.top<0,'tall cannon can extend above tray');
    results.push({width,section,kind,tier,metrics});await page.locator('.px-game').screenshot({path:`${out}/${width}-${section}-${kind}-${tier}.png`});
   }
  }
  if(section==='combat'){await page.locator('[data-battle=clear]').click();assert.equal(await page.locator('.px-bench__slot').count(),3);assert.equal(await page.locator('.px-bench__slot img,.px-bench__slot .px-rank').count(),0);await page.locator('.px-game').screenshot({path:`${out}/${width}-empty.png`});}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 assert.deepEqual(errors,[]);await page.close();
}await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(`PASS: ${results.length} tray states at 390 / 320 / 1440; rank, alpha fit, centering, 44px targets, empty bays, no JS errors.`);
}finally{await browser.close();}

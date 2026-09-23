import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5194/',out=process.env.QA_OUT||'_qa/preload-r21';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const [width,lang]of [[390,'zh'],[320,'en']]){
  const ctx=await browser.newContext({viewport:{width,height:width===320?568:844},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
  await p.addInitScript(()=>{window.__progress=[];new MutationObserver(()=>{const m=document.querySelector('.tw-pixel-loading [role=progressbar]');if(m){const n=+m.getAttribute('aria-valuenow');if(window.__progress.at(-1)!==n)window.__progress.push(n);window.__total=+m.getAttribute('aria-valuemax');}}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-valuenow']});});
  await p.route('**/spring-v1/frame-0.png',async r=>{await new Promise(resolve=>setTimeout(resolve,11500));await r.continue();});
  await p.goto(base+'?lang='+lang,{waitUntil:'domcontentloaded'});await p.locator('.tw-pixel-loading output').waitFor();
  await p.waitForTimeout(1500);assert.equal(await p.locator('.tw').count(),0);await p.screenshot({path:out+`/${width}-${lang}-loading.png`});
  await p.locator('.tw-pixel-loading__hint').filter({hasText:lang==='zh'?'网络较慢':'Slow connection'}).waitFor({timeout:15000});assert.equal(await p.locator('.tw').count(),0);
  await p.locator('.tw[data-stage=place]').waitFor({timeout:30000});
  const progress=await p.evaluate(()=>({counts:__progress,total:__total}));assert.equal(progress.counts.at(-1),progress.total);assert(progress.counts.every((v,i,a)=>!i||v>=a[i-1]));
  assert(await p.evaluate(()=>document.fonts.check('16px "Jersey 10"')&&document.fonts.check('16px "Workshop Pixel"')));
  assert(!requests.some(u=>u.includes(lang==='zh'?'title-en-':'title-zh-')));assert(!requests.some(u=>u.includes(lang==='zh'?'start-en-':'start-zh-')));
  assert(!requests.some(u=>/assets\/(spring|rail|mortar|bubble|drum)-[^/]+\.png/.test(u)));
  const audio=p.locator('[data-audio-toggle]'),main=p.locator('#main-action'),a=await audio.boundingBox(),m=await main.boundingBox();assert(a.width>=44&&a.height>=44&&a.x>=0&&a.x+a.width<=m.x&&Math.abs(a.y+a.height/2-m.y-m.height/2)<2);
  assert.equal(await audio.getAttribute('aria-pressed'),'true');await audio.tap();const muted=await audio.evaluate(e=>getComputedStyle(e,':before').borderImageSource);await audio.tap();const enabled=await audio.evaluate(e=>getComputedStyle(e,':before').borderImageSource);assert.notEqual(muted,enabled);assert(enabled.includes('gold-blank'));assert(muted.includes('lilac-blank'));
  await p.screenshot({path:out+`/${width}-${lang}-sound-on.png`});await audio.tap();await p.screenshot({path:out+`/${width}-${lang}-sound-off.png`});
  assert.deepEqual(errors,[]);results.push({width,lang,progress,audio:a,main:m,muted,enabled});await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage();await p.route('**/spring-v1/frame-0.png',r=>r.abort());await p.goto(base+'?lang=zh',{waitUntil:'domcontentloaded'});await p.locator('.tw-pixel-loading[role=alert]').waitFor();assert.equal(await p.locator('.tw').count(),0);await p.screenshot({path:out+'/390-load-error.png'});await p.unroute('**/spring-v1/frame-0.png');await p.locator('.tw-pixel-loading button').click();await p.locator('.tw[data-stage=place]').waitFor();await ctx.close();
 await fs.writeFile(out+'/checks.json',JSON.stringify(results,null,2));console.log('PASS real progress, slow network, decoded fonts, locale-only art, removed redundant sprites, failure/retry, 320/390 audio location/colors');
}finally{await browser.close();}

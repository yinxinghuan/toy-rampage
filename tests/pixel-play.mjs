import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5193/',out=process.env.QA_OUT||'_qa/play-r20';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch();
try{for(const [width,height,lang]of [[390,844,'zh'],[320,568,'en']]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(base+'?lang='+lang,{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 await page.locator('.tw[data-renderer=pixel]').waitFor();await page.evaluate(()=>document.fonts.ready);
 const step=ms=>page.clock.runFor(ms),button=a=>page.locator(`[data-action="${a}"]`),action=async a=>{await button(a).tap();await step(80);},stage=()=>page.locator('.tw').getAttribute('data-stage');
 const shot=async name=>{await step(250);await page.locator('.tw img').evaluateAll(images=>Promise.all(images.map(img=>img.decode().catch(()=>{}))));await page.screenshot({path:`${out}/${width}-${name}-platform-layout.png`});};
 const cdp=await context.newCDPSession(page);
 async function drag(source,c,r,name){const a=await page.locator(source).boundingBox(),b=await page.locator(`[data-cell="${c},${r}"]`).boundingBox();assert(a&&b);const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2+32;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
  for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(tx-sx)*i/6,y:sy+(ty-sy)*i/6}]});await step(20);}
  if(name){const ghost=await page.locator('.tw__drag canvas').evaluate(el=>({w:Number(el.dataset.footWidth),h:Number(el.dataset.footHeight)}));assert(Math.abs(ghost.w/b.width-Math.round(ghost.w/b.width))<.01,'integer-cell ghost size');await shot(name);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await step(100);
 }
 await step(1000);await shot('tutorial');assert.equal(await stage(),'place');
 assert(await page.locator('.tw__guide').isVisible());
 await drag('[data-source=tray]',0,0,'first-drag');await step(5000);assert.equal(await stage(),'second');
 await drag('[data-source=tray]',0,0);assert.equal(await stage(),'expand');await step(3000);await shot('expand-guide');
 await drag('[data-source=land]',0,0);assert.equal(await stage(),'expand');
 await drag('[data-source=land]',0,3,'land-drag');assert.equal(await page.locator('.tw').getAttribute('data-cells'),'14');
 await drag('[data-source=tray]',0,2);assert.equal(await stage(),'ready');await shot('ready');
 await action('main');for(let i=0;i<40&&(await stage())==='wave';i++){if(await button('upgrade-0').isVisible()){await shot('upgrade');await action('upgrade-0');}else await step(1500);}
 await step(1000);assert.equal(await stage(),'ready');await shot('after-wave');
 await action('pause');await shot('pause');await action('records');await shot('records');await action('back');await action('rules');await action('reset-lab');await action('confirm');await step(400);assert.equal(await stage(),'fusion');
 await drag('[data-cell="0,0"]',0,3,'fusion-drag');assert.equal(await stage(),'fused');await shot('fusion');
 await drag('[data-source=tray]',0,0);await action('main');await step(1000);await shot('fusion-combat');
 const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>visualViewport.width+.5,audio:(()=>{const r=document.querySelector('[data-audio-toggle]').getBoundingClientRect();return {w:r.width,h:r.height,y:r.y,bottom:r.bottom};})(),cells:[...document.querySelectorAll('[data-cell]')].every(e=>e.getBoundingClientRect().width>=44)}));
 assert.equal(metrics.overflow,false);assert(metrics.cells);assert.equal(metrics.audio.w,44);assert.deepEqual(errors,[]);console.log({width,height,metrics,errors});await context.close();
}}finally{await browser.close();}

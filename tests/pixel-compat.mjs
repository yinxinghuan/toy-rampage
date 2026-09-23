import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/';
const out=process.env.QA_COMPAT_OUT||'_qa/pixel-compat';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{for(const [width,height,lang,touch]of [[1440,1000,'zh',false],[390,844,'zh',true],[320,568,'en',true]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,recordVideo:{dir:out}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(base+`?lang=${lang}&section=experiments&digits=jersey10`,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('.px-game--experiment').waitFor({timeout:60000});
 await page.locator('.px-game img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.evaluate(async()=>{const i=new Image();i.src=getComputedStyle(document.querySelector('.px-game__environment')).backgroundImage.slice(5,-2);await i.decode();});
 await page.locator('.px-game--experiment').waitFor();await page.evaluate(()=>document.fonts.ready);
 const cdp=await context.newCDPSession(page);
 async function drag(source,c,r,inspect=false){
  await page.locator('.px-game').scrollIntoViewIfNeeded();
  const s=await page.locator(source).boundingBox(),b=await page.locator('.px-board').boundingBox();
  // First drag grabs the visible cannon above the tray, not just its old box.
  const from={x:s.x+s.width/2,y:inspect?s.y-5:s.y+s.height/2},to={x:b.x+(c+.5)*b.width/4,y:b.y+(r+.5)*b.height/5+(touch?32:0)};
  if(inspect)assert(await page.evaluate(({x,y})=>Boolean(document.elementFromPoint(x,y)?.closest('[data-exp-source="reserve:0"]')),from),'protruding cannon remains draggable');
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});else{await page.mouse.move(from.x,from.y);await page.mouse.down();}
  for(let i=1;i<=10;i++){const pt={x:from.x+(to.x-from.x)*i/10,y:from.y+(to.y-from.y)*i/10};if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt]});else await page.mouse.move(pt.x,pt.y);}
  if(inspect){const g=await page.locator('.px-exp-ghost').boundingBox();assert(Math.abs(g.width-b.width/4)<1);assert(Math.abs(g.height-b.height/5*2)<1);await page.screenshot({path:`${out}/${width}-${lang}-drag.png`});}
  if(source==='[data-exp-source="land"]'){const g=await page.locator('.px-exp-ghost').boundingBox();assert.equal(await page.locator('.px-exp-land-ghost img').count(),2);assert(Math.abs(g.width-b.width/4*2)<1);assert(Math.abs(g.height-b.height/5)<1);await page.screenshot({path:`${out}/${width}-${lang}-land-drag.png`});}
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
 }
 const initial=await page.locator('.px-board').boundingBox();
 for(const n of [16,20,12]){await page.locator(`[data-exp-preset="${n}"]`).click();assert.equal(await page.locator('[data-open=true]').count(),n);const b=await page.locator('.px-board').boundingBox();assert.equal(b.width,initial.width);assert.equal(b.height,initial.height);await page.locator('.px-game').screenshot({path:`${out}/${width}-${lang}-${n}.png`});}
 await drag('[data-exp-source="reserve:0"]',0,0,true);assert.equal(await page.locator('.px-board .px-machine').count(),1);assert(await page.locator('[data-exp-source="reserve:0"]').isDisabled());
 await drag('[data-exp-source="reserve:1"]',0,0);assert.equal(await page.locator('.px-board .px-rank').textContent(),'2');
 await drag('[data-exp-source="reserve:2"]',0,0);assert.equal(await page.locator('.px-board .px-rank').textContent(),'2');assert(!(await page.locator('[data-exp-source="reserve:2"]').isDisabled()));
 await drag('[data-exp-source="land"]',0,3);assert.equal(await page.locator('[data-open=true]').count(),14);
 await drag('[data-exp-cell="0,0"]',1,0);assert(await page.locator('[data-exp-cell="1,0"]').getAttribute('aria-label').then(x=>x.includes('2')));
 for(const kind of ['spring','rail','mortar','bubble','drum']){
  await page.locator('[data-exp-reset]').click();await page.locator('[data-exp-kind]').selectOption(kind);await drag('[data-exp-source="reserve:0"]',0,0);assert.equal(await page.locator(`.px-board [data-kind="${kind}"]`).count(),1);
 }
 await page.locator('[data-exp-kind]').selectOption('spring');
 await drag('[data-exp-source="reserve:0"]',3,4);assert(!(await page.locator('[data-exp-source="reserve:0"]').isDisabled()));
 await page.locator('[data-exp-source="reserve:0"]').focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');await page.locator('[data-exp-cell="2,0"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.px-board [data-kind="spring"]').count(),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('[data-exp-preset="16"]').click();
 assert.equal(await page.locator('.px-exp-land img').count(),2);
 assert.equal(await page.locator('.px-exp-land-allowance b').textContent(),'4');
 await page.locator('.px-game').screenshot({path:`${out}/${width}-${lang}-land4.png`});
 await drag('[data-exp-source="land"]',0,4);
 assert.equal(await page.locator('[data-open=true]').count(),18);
 assert.equal(await page.locator('.px-exp-land-allowance b').textContent(),'2');
 await drag('[data-exp-source="land"]',2,4);
 assert.equal(await page.locator('[data-open=true]').count(),20);
 assert(await page.locator('[data-exp-source="land"]').isDisabled());
 assert.equal(await page.locator('.px-exp-land img').count(),0);
 assert.equal(await page.locator('.px-exp-land-allowance').textContent(),lang==='zh'?'已铺满':'Full');
 await page.locator('.px-game').screenshot({path:`${out}/${width}-${lang}-land-full.png`});
 await page.locator('[data-action="section:components"]').click();await page.locator('.px-button-spec img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));assert.equal(await page.locator('.px-button-spec .px-refresh-label').count(),lang==='zh'?2:0);await page.screenshot({path:`${out}/${width}-${lang}-components.png`,fullPage:true});
 await page.locator('[data-action="section:assets"]').click();assert.equal(await page.locator('.px-materials img').count(),25);await page.locator('.px-materials img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 assert.equal(await page.locator('.px-image-fallback').count(),0);assert.deepEqual(errors,[]);results.push({width,height,lang,touch,status:'passed'});await context.close();
}await fs.writeFile(`${out}/results.json`,JSON.stringify({base,results},null,2));console.log(results);}finally{await browser.close();}

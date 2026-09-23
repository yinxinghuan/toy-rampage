import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});
const base='https://game.aiwaves.tech/0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae/';
const out=fileURLToPath(new URL('../_qa/ui/',import.meta.url)),results=[];
await fs.mkdir(out,{recursive:true});
try{
 for(const[width,height]of[[390,844],[320,568]]){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,locale:'zh-CN'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'?lang=zh',{waitUntil:'networkidle'});
  assert.match(await p.locator('#edition').textContent(),/v0\.2\.1/);
  await p.screenshot({path:out+'online-v021-external-guest-'+width+'-banner.png',fullPage:true});
  const close=p.getByRole('button',{name:'Close',exact:true});assert.equal(await close.count(),1);await close.tap();
  await p.waitForTimeout(900);assert.equal(await p.locator('.tw__guide').isVisible(),true);
  await p.screenshot({path:out+'online-v021-external-guest-'+width+'-hand.png',fullPage:true});
  const cdp=await ctx.newCDPSession(p),source=id=>p.locator('[data-source="'+id+'"]'),cell=(c,r)=>p.locator('[data-cell="'+c+','+r+'"]');
  async function drag(from,to){
   const a=await from.boundingBox(),b=await to.boundingBox(),coins=await p.locator('#coins').textContent();
   const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
   for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(tx-sx)*i/12,y:sy+(ty-sy)*i/12}]});await p.waitForTimeout(16);}
   assert.equal(await p.locator('#coins').textContent(),coins);assert.equal(await p.locator('.tw__overlay').isVisible(),false);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(100);
  }
  await drag(source('tray'),cell(0,0));await p.waitForFunction(()=>document.querySelector('.tw').dataset.stage==='second');
  await drag(source('tray'),cell(0,0));assert.equal(await p.locator('.tw').getAttribute('data-stage'),'expand');
  await p.locator('#main-action').tap();await drag(source('tray'),cell(0,3));
  // A tap followed by a new drag of the same source must work without dismissing anything.
  await source('shop:2').tap();assert.equal(await p.locator('#coins').textContent(),'8');
  await drag(source('shop:2'),cell(1,0));assert.equal(await p.locator('#coins').textContent(),'5');
  await drag(source('shop:1'),cell(0,3));assert.equal(await p.locator('#coins').textContent(),'2');
  assert.match(await cell(0,3).getAttribute('aria-label'),/2 阶/);
  await p.screenshot({path:out+'online-v021-external-guest-'+width+'-direct-merge.png',fullPage:true});
  await p.locator('#main-action').tap();await p.waitForTimeout(2000);assert.equal(await p.locator('.tw').getAttribute('data-stage'),'wave');
  await p.screenshot({path:out+'online-v021-external-guest-'+width+'-touch-battle.png',fullPage:true});
  assert.deepEqual(errors,[]);results.push({width,height,version:'v0.2.1',bannerClosed:true,continuousTouch:true,tapThenDrag:true,purchaseMerge:true,errors});
  await ctx.close();
 }
 await fs.writeFile(out+'online-v021-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}

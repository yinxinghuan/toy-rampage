import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});
const base='https://game.aiwaves.tech/0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae/';
const out=fileURLToPath(new URL('../_qa/ui/',import.meta.url)),results=[];
try{
 for(const[width,height]of[[390,844],[320,568]]){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,locale:'zh-CN'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'?lang=zh',{waitUntil:'networkidle'});
  assert.match(await p.locator('#edition').textContent(),/v0.2/);
  await p.screenshot({path:out+'online-v02-external-guest-'+width+'-banner.png',fullPage:true});
  const close=p.getByRole('button',{name:'Close',exact:true});assert.equal(await close.count(),1);await close.tap();
  await p.waitForTimeout(900);assert.equal(await p.locator('.tw__guide').isVisible(),true);
  await p.screenshot({path:out+'online-v02-external-guest-'+width+'-hand.png',fullPage:true});
  const part=()=>p.locator('[data-source="tray"]'),cell=(c,r)=>p.locator('[data-cell="'+c+','+r+'"]');
  await part().tap();await cell(0,0).tap();await p.waitForFunction(()=>document.querySelector('.tw').dataset.stage==='second');
  await part().tap();await cell(0,0).tap();assert.equal(await p.locator('.tw').getAttribute('data-stage'),'expand');
  await p.locator('#main-action').tap();await part().tap();await cell(0,3).tap();
  await p.locator('[data-action="buy:2"]').tap();await cell(1,0).tap();await p.locator('#main-action').tap();
  await p.waitForTimeout(2000);assert.equal(await p.locator('.tw').getAttribute('data-stage'),'wave');
  await p.screenshot({path:out+'online-v02-external-guest-'+width+'-touch-battle.png',fullPage:true});
  assert.deepEqual(errors,[]);results.push({width,height,version:'v0.2',bannerClosed:true,directMerge:true,purchaseAndBattle:true,errors});
  await ctx.close();
 }
 await fs.writeFile(out+'online-v02-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}

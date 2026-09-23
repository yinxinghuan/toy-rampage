import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {Workshop,COLS} from '../src/engine.js';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});
const base=process.env.QA_BASE||'http://127.0.0.1:5188/',pass=process.env.QA_PASS||'first';
const out=fileURLToPath(new URL('../_qa/ui/',import.meta.url)),errors=[],measurements=[];
await fs.mkdir(out,{recursive:true});
async function run(width,height,lang='zh',reduced=false,full=false){
 const context=await browser.newContext({viewport:{width,height},locale:lang==='zh'?'zh-CN':'en',hasTouch:true,reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:out,size:{width,height}}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();
 await page.goto(base+'?lang='+lang);await page.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 const step=async(ms=100)=>page.clock.runFor(ms);
 const prefix=pass+'-v02-platform-layout-'+width+'x'+height+'-'+lang;
 const shot=async name=>{await page.screenshot({path:out+prefix+'-'+name+'.png',fullPage:true});};
 const stage=()=>page.locator('.tw').getAttribute('data-stage');
 const cell=(c,r)=>page.locator('[data-cell="'+c+','+r+'"]');
 const button=name=>page.locator('[data-action="'+name+'"]');
 const tap=async loc=>{await loc.tap();await step();};
 async function measure(name){
  const result=await page.evaluate(name=>{
   const field=document.querySelector('.tw__board').getBoundingClientRect(),hint=document.querySelector('#hint-body').getBoundingClientRect();
   const bad=[...document.querySelectorAll('.tw button')].filter(el=>el.offsetWidth&&el.offsetHeight).map(el=>({name:el.getAttribute('aria-label')||el.textContent,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})).filter(b=>b.w<43.5||b.h<43.5);
   return{name,width:innerWidth,lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth,overlap:hint.bottom>field.top,bad};
  },name);measurements.push(result);assert.equal(result.overflow,false);assert.equal(result.overlap,false);assert.deepEqual(result.bad,[]);
 }
 async function drag(from,to){
  await from.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await to.boundingBox();assert.ok(a&&b);
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:14});await page.mouse.up();await step();
 }
 await step(850);await shot('entry-hand');console.log('entry',width,lang,await stage(),await page.locator('.tw__overlay').isVisible());assert.equal(await page.locator('.tw__guide').isVisible(),true);await measure('entry');
 const part=()=>page.locator('[data-source="tray"]');
 // Bad drop is recoverable, and Escape cancels a held pointer without consuming it.
 await tap(part());await tap(cell(0,2));assert.equal(await stage(),'place');assert.equal(await part().count(),1);
 await tap(part());await tap(cell(0,0));await step(2200);assert.equal(await stage(),'second');await shot('merge-hint');
 if(width===320&&lang==='zh'){
  await tap(part());await tap(cell(1,0));assert.equal(await stage(),'merge');
  await drag(cell(1,0),cell(0,0));
 }else await drag(part(),cell(0,0));
 assert.equal(await stage(),'expand');assert.equal(await part().count(),0);await shot('merged');
 await tap(button('main'));await tap(part());await tap(cell(0,3));assert.equal(await stage(),'ready');
 await shot('shop');await measure('shop');
 // Purchase refund returns inventory and gears exactly.
 await tap(button('buy:2'));assert.equal(await page.locator('#coins').textContent(),'5');
 await tap(button('refund'));assert.equal(await page.locator('#coins').textContent(),'8');
 if(full){
  const mirror=new Workshop();mirror.reset('run');
  for(let wave=0;wave<5;wave++){
   let rerolls=0;
   for(let tries=0;tries<18&&mirror.coins>=3;tries++){
    let bought=false;
    for(const kind of ['mortar','spring','rail']){
     const i=mirror.shop.indexOf(kind);if(i<0)continue;mirror.buy(i);
     let pos;
     for(const u of mirror.units){const p=mirror.preview('tray',u.c,u.r);if(p.ok&&p.type==='merge'){pos=[u.c,u.r];break;}}
     if(!pos)outer:for(let r=0;r<mirror.rows;r++)for(let c=0;c<COLS;c++)if(mirror.preview('tray',c,r).ok){pos=[c,r];break outer;}
     if(!pos){mirror.refund();continue;}
     await tap(button('buy:'+i));await tap(cell(...pos));mirror.place('tray',...pos);bought=true;break;
    }
    if(!bought){if(rerolls++<2&&mirror.coins>=5){mirror.refresh();await tap(button('refresh'));}else break;}
   }
   assert.equal(await page.locator('#coins').textContent(),String(mirror.coins));
   await shot('ready-'+(wave+1));await measure('ready-'+(wave+1));
   await tap(button('main'));mirror.startWave();await step(1500);await shot('wave-'+(wave+1));
   if(wave===0){await tap(button('pause'));await shot('pause');const hp=await page.locator('#hp').textContent();await step(500);assert.equal(await page.locator('#hp').textContent(),hp);await tap(button('resume'));}
   for(let i=0;i<12&&(await stage())==='wave';i++)await step(10000);
   for(let i=0;i<8000&&mirror.stage==='wave';i++)mirror.tick(.05);
   assert.equal(await stage(),mirror.stage);assert.equal(await page.locator('#hp').textContent(),String(mirror.hp));
  }
  assert.equal(await stage(),'win');await shot('win');await measure('win');
  await tap(button('lab'));await drag(cell(0,0),cell(0,3));assert.equal(await stage(),'fused');await shot('fusion');
  await tap(part());await tap(cell(0,0));await tap(button('main'));
  for(let i=0;i<10&&(await stage())==='labwave';i++)await step(10000);
  assert.equal(await stage(),'labend');await shot('labend');
  // A second normal run with no purchases must naturally fail.
  await tap(button('run'));await tap(button('main'));
  for(let i=0;i<10&&(await stage())==='wave';i++)await step(10000);
  assert.equal(await stage(),'ready');await tap(button('main'));
  for(let i=0;i<10&&(await stage())==='wave';i++)await step(10000);
  assert.equal(await stage(),'lose');await shot('lose');
 }
 await context.close();
}
try{
 await run(390,844,'zh',false,true);
 await run(320,568);
 await run(320,568,'en',true);
 await run(440,600);
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+pass+'-v02-measurements.json',JSON.stringify({errors,measurements},null,2));
 console.log(JSON.stringify({errors,states:measurements.length}));
}finally{await browser.close();}

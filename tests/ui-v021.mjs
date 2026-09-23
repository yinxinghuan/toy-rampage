import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workshop,COLS} from '../src/engine.js';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});
const base=process.env.QA_BASE||'http://127.0.0.1:5189/',pass=process.env.QA_PASS||'first';
const out=fileURLToPath(new URL('../_qa/ui/',import.meta.url)),results=[];
await fs.mkdir(out,{recursive:true});
async function run(width,height,lang='zh',reduced=false,full=false){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,locale:lang==='zh'?'zh-CN':'en',reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:out,size:{width,height}}});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install();await p.goto(base+'?lang='+lang,{waitUntil:'domcontentloaded'});
 await p.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 const step=ms=>p.clock.runFor(ms),cdp=await ctx.newCDPSession(p);
 const source=id=>p.locator('[data-source="'+id+'"]'),cell=(c,r)=>p.locator('[data-cell="'+c+','+r+'"]'),btn=a=>p.locator('[data-action="'+a+'"]');
 const tap=async loc=>{await loc.tap();await step(60);},stage=()=>p.locator('.tw').getAttribute('data-stage');
 const shot=async name=>p.screenshot({path:out+pass+'-v021-platform-layout-'+width+'-'+lang+'-'+name+'.png',fullPage:true});
 const boxes=()=>p.evaluate(()=>['.tw__board','#supply','#main-action'].map(s=>{const b=document.querySelector(s).getBoundingClientRect();return [b.x,b.y,b.width,b.height];}));
 async function stable(before){const after=await boxes();for(let i=0;i<before.length;i++)for(let j=0;j<4;j++)assert.ok(Math.abs(after[i][j]-before[i][j])<.1,'Layout shifted on selection');}
 async function gesture(from,to,{cancel=false,inspect=false}={}){
  const a=await from.boundingBox(),b=await to.boundingBox();assert.ok(a&&b);
  const before=await boxes(),coins=await p.locator('#coins').textContent(),sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  assert.ok(sy<height,'Source is below viewport');assert.ok(ty<height,'Target is below viewport');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});await step(50);
  await stable(before);assert.equal(await p.locator('#coins').textContent(),coins);
  assert.equal(await p.locator('.tw__overlay').isVisible(),false);
  for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(tx-sx)*i/12,y:sy+(ty-sy)*i/12}]});await step(16);}
  assert.equal(await p.locator('.tw__drag').isVisible(),true);
  await stable(before);assert.equal(await p.locator('#coins').textContent(),coins);
  if(inspect)await shot('held-footprint');
  await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await step(80);
  if(cancel)assert.equal(await p.locator('#coins').textContent(),coins);
 }
 await step(850);await shot('entry');
 assert.equal(await p.locator('.tw__guide').isVisible(),true);
 const text=(await p.locator('.tw').innerText()).replace(/\s/g,'');assert.ok(text.length<(lang==='zh'?85:150),'Too much entry copy');
 await gesture(source('tray'),cell(0,0));await step(2200);assert.equal(await stage(),'second');
 await gesture(source('tray'),cell(0,0),{inspect:true});assert.equal(await stage(),'expand');
 await tap(btn('main'));await gesture(source('tray'),cell(0,3));assert.equal(await stage(),'ready');await shot('ready');
 const before=await boxes();await tap(source('shop:2'));await stable(before);assert.equal(await p.locator('#coins').textContent(),'8');
 assert.equal(await source('shop:2').getAttribute('aria-pressed'),'true');assert.equal(await source('tray').count(),0);await shot('selected-no-panel');
 await tap(btn('deselect'));
 await gesture(source('shop:2'),cell(3,3));assert.equal(await p.locator('#coins').textContent(),'8');assert.equal(await source('shop:2').count(),1);
 await gesture(source('shop:2'),cell(1,0),{cancel:true});assert.equal(await source('shop:2').count(),1);
 await gesture(source('shop:2'),cell(1,0),{inspect:true});assert.equal(await p.locator('#coins').textContent(),'5');assert.equal(await source('shop:2').count(),0);assert.equal(await source('tray').count(),0);
 await gesture(source('shop:1'),cell(0,3),{inspect:true});assert.equal(await p.locator('#coins').textContent(),'2');assert.match(await cell(0,3).getAttribute('aria-label'),lang==='zh'?/2 阶/:/Tier 2/);
 await shot('direct-merge');
 // Selecting an existing machine never moves the shelf or inserts text.
 const boardBefore=await boxes();await tap(cell(1,0));await stable(boardBefore);assert.equal(await p.locator('.tw__selection').count(),0);await tap(btn('deselect'));
 const layout=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.tw button')].filter(el=>el.offsetWidth&&el.offsetHeight).map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})).filter(x=>x.w<43.5||x.h<43.5),footerBottom:document.querySelector('.tw__footer').getBoundingClientRect().bottom}));
 assert.equal(layout.overflow,false);assert.deepEqual(layout.buttons,[]);assert.ok(layout.footerBottom<=height,'Main controls below viewport');
 if(full){
  const mirror=new Workshop();mirror.reset('run');mirror.place('shop:2',1,0);mirror.place('shop:1',0,3);
  for(let wave=0;wave<5;wave++){
   if(wave>0){let rerolls=0;for(let tries=0;tries<18&&mirror.coins>=3;tries++){
    let placed=false;
    for(const kind of ['mortar','spring','rail']){
     const index=mirror.shop.indexOf(kind);if(index<0)continue;const id='shop:'+index;let pos;
     for(const u of mirror.units){const q=mirror.preview(id,u.c,u.r);if(q.ok&&q.type==='merge'){pos=[u.c,u.r];break;}}
     if(!pos)outer:for(let r=0;r<mirror.rows;r++)for(let c=0;c<COLS;c++)if(mirror.preview(id,c,r).ok){pos=[c,r];break outer;}
     if(!pos)continue;await gesture(source(id),cell(...pos));mirror.place(id,...pos);placed=true;break;
    }
    if(!placed){if(rerolls++<2&&mirror.coins>=5){await tap(btn('refresh'));mirror.refresh();}else break;}
   }}
   await tap(btn('main'));mirror.startWave();await step(1500);await shot('wave-'+(wave+1));
   for(let j=0;j<12&&(await stage())==='wave';j++)await step(10000);
   for(let j=0;j<8000&&mirror.stage==='wave';j++)mirror.tick(.05);
   assert.equal(await stage(),mirror.stage);assert.equal(await p.locator('#coins').textContent(),String(mirror.coins));if(mirror.ended)break;
  }
  await shot('result');assert.equal(await stage(),'win');
 }
 if((await stage())==='win')await tap(btn('run'));
 await tap(btn('pause'));await shot('pause');
 results.push({width,height,lang,reduced,entryTextCharacters:text.length,layout,errors,fullRun:full});assert.deepEqual(errors,[]);await ctx.close();
}
try{await run(390,844,'zh',false,true);await run(320,568);await run(320,568,'en',true);await run(440,600);await fs.writeFile(out+pass+'-v021-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}

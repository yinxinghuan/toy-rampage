import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workshop,COLS} from '../src/engine.js';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5192/',pass=process.env.QA_PASS||'first';
const out=fileURLToPath(new URL('../_qa/ui/',import.meta.url));await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
async function run(width,height,lang,full){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,locale:lang==='zh'?'zh-CN':'en',reducedMotion:lang==='en'?'reduce':'no-preference'});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install();await p.goto(base+'?lang='+lang,{waitUntil:'domcontentloaded'});await p.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 const step=ms=>p.clock.runFor(ms),btn=a=>p.locator(`[data-action="${a}"]`),stage=()=>p.locator('.tw').getAttribute('data-stage');
 const tap=async l=>{await l.tap();await step(50);},act=async a=>tap(btn(a)),cell=(c,r)=>p.locator(`[data-cell="${c},${r}"]`);
 const shot=async name=>{await p.screenshot({path:out+pass+'-v03-platform-layout-'+width+'-'+lang+'-'+name+'.png'});};
 const cdp=await ctx.newCDPSession(p);
 async function drag(source,c,r){
  const a=await p.locator(`[data-source="${source}"]`).boundingBox(),b=await cell(c,r).boundingBox();
  assert.ok(a&&b);const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
  const money=await p.locator('#coins').textContent();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(tx-sx)*i/8,y:sy+(ty-sy)*i/8}]});await step(16);}
  assert.equal(await p.locator('#coins').textContent(),money);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await step(50);
 }
 async function audit(){
  const layout=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('.tw button')].filter(e=>e.offsetWidth&&e.offsetHeight).map(e=>({a:e.dataset.action||e.dataset.cell,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(b=>b.w<43.5||b.h<43.5)}));
  assert.equal(layout.overflow,false);assert.deepEqual(layout.small,[]);
 }
 await step(800);await shot('entry');await audit();await act('pause');await shot('pause');await act('records');await shot('empty-records');await act('back');await act('levels');await shot('levels');await audit();
 await act('level-1');await shot('switch-confirm');await act('cancel');assert.equal(await p.locator('.tw').getAttribute('data-level'),'1');assert.equal(await btn('level-1').isVisible(),true);
 const startLevel=Number(process.env.QA_START_LEVEL||0);await act('level-'+startLevel);await act('confirm');
 const levelResults=[];
 for(let level=startLevel;level<(full?4:startLevel+1);level++){
  assert.equal(await p.locator('.tw').getAttribute('data-level'),String(level+1));assert.equal(await stage(),'ready');assert.equal(await p.locator('#coins').textContent(),'8');assert.equal(await p.locator('#hp').textContent(),'100');
  await shot('level-'+(level+1)+'-ready');const mirror=new Workshop();mirror.reset('run',level);
  for(let wave=0;wave<5;wave++){
   let rerolls=0;
   for(let tries=0;tries<18&&mirror.coins>=3;tries++){
    let placed=false;
    for(const kind of ['mortar','spring','rail']){
     const i=mirror.shop.indexOf(kind);if(i<0)continue;const id='shop:'+i;let pos;
     for(const u of mirror.units){const q=mirror.preview(id,u.c,u.r);if(q.ok&&q.type==='merge'){pos=[u.c,u.r];break;}}
     if(!pos)outer:for(let r=0;r<mirror.rows;r++)for(let c=0;c<COLS;c++)if(mirror.preview(id,c,r).ok){pos=[c,r];break outer;}
     if(!pos)continue;await drag(id,...pos);mirror.place(id,...pos);placed=true;break;
    }
    if(!placed){if(rerolls++<2&&mirror.coins>=5){await act('refresh');mirror.refresh();}else break;}
   }
   assert.equal(await p.locator('#coins').textContent(),String(mirror.coins));
   await act('main');mirror.startWave();await step(1500);await shot('level-'+(level+1)+'-wave-'+(wave+1));
   if(wave===0){await act('speed');assert.match(await btn('speed').textContent(),/2×/);await act('speed');await act('pause');const hp=await p.locator('#hp').textContent();await step(3000);assert.equal(await p.locator('#hp').textContent(),hp);await act('resume');}
   for(let i=0;i<15&&(await stage())==='wave';i++)await step(8000);
   for(let i=0;i<8000&&mirror.stage==='wave';i++)mirror.tick(.05);
   if(await stage()==='lose'){await shot('unexpected-loss');await act('records');const downloaded=p.waitForEvent('download');await act('export');const d=await downloaded;await d.saveAs(out+pass+'-v03-unexpected-loss.json');throw Error(`Level ${level+1} wave ${wave+1} failed in renderer`);}
   assert.ok(['ready','win'].includes(await stage()),`Level ${level+1} wave ${wave+1}: ${await stage()}`);
  }
  assert.equal(await stage(),'win');await shot('level-'+(level+1)+'-win');levelResults.push({level:level+1,hp:Number(await p.locator('#hp').textContent())});
  await act('records');assert.equal(await p.locator('[data-action^="wave-record-"]').count(),5);await act('wave-record-4');assert.ok(await p.locator('[data-machine]').count()>0);await shot('level-'+(level+1)+'-record');await audit();
  if(level===3||!full){const download=p.waitForEvent('download');await act('export');const d=await download;const json=JSON.parse(await fs.readFile(await d.path(),'utf8'));assert.equal(json.current.level,level+1);assert.equal(json.current.history.length,5);assert.equal(json.attempts.length,level-startLevel);results.push({width,lang,exportedLevels:json.attempts.map(a=>a.level),current:json.current.level});await fs.writeFile(out+pass+'-v03-'+width+'-export.json',JSON.stringify(json,null,2));}
  await act('back');if(level<3&&full)await act('next-level');
 }
 // Loss and retry from level 4, without buying. Menu routes never require earlier wins.
 await act('levels');await act('level-3');await act('main');for(let i=0;i<8&&(await stage())==='wave';i++)await step(8000);
 assert.equal(await stage(),'lose');await shot('lose');await act('records');assert.equal(await p.locator('[data-action^="wave-record-"]').count(),1);await act('wave-record-0');await shot('failed-record');await act('back');await act('run');assert.equal(await p.locator('.tw').getAttribute('data-level'),'4');assert.equal(await p.locator('#hp').textContent(),'100');assert.equal(await p.locator('#coins').textContent(),'8');
 // Abandoning a wave is kept once, and a cancelled switch leaves it untouched.
 await act('main');await step(1000);await act('pause');await act('levels');await act('level-1');await p.keyboard.press('Escape');await step(50);assert.equal(await btn('level-1').isVisible(),true);await act('level-1');await act('confirm');assert.equal(await p.locator('.tw').getAttribute('data-level'),'2');await act('pause');await act('records');await act('attempt-0');assert.equal(await p.locator('[data-action^="wave-record-"]').count(),1);await shot('abandoned-record');await act('back');await act('rules');await shot('rules');await act('reset-tutorial');await act('confirm');assert.equal(await stage(),'place');assert.equal(await p.locator('.tw').getAttribute('data-level'),'1');await audit();
 assert.deepEqual(errors,[]);results.push({width,height,lang,levelResults,errors});await ctx.close();
}
try{if(process.env.QA_CASE==='en')await run(320,568,'en',false);else{await run(390,844,'zh',true);await run(320,568,'en',false);}await fs.writeFile(out+pass+'-v03-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}

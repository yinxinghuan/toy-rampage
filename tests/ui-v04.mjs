import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workshop} from '../src/engine.js';
import {moves} from './balance.mjs';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5192/',pass=process.env.QA_PASS||'first',out=fileURLToPath(new URL('../_qa/ui/',import.meta.url));
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true}),results=[];
async function run(width,height,lang){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,locale:lang==='zh'?'zh-CN':'en',reducedMotion:lang==='en'?'reduce':'no-preference'}),p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.goto(base+'?lang='+lang,{waitUntil:'domcontentloaded'});await p.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 const step=ms=>p.clock.runFor(ms),btn=a=>p.locator('[data-action="'+a+'"]'),stage=()=>p.locator('.tw').getAttribute('data-stage'),act=async a=>{await btn(a).tap();await step(50);},cell=(c,r)=>p.locator('[data-cell="'+c+','+r+'"]'),source=s=>typeof s==='number'?null:p.locator('[data-source="'+s+'"]');
 const shot=async n=>p.screenshot({path:out+pass+'-v04-platform-layout-'+width+'-'+n+'.png'}),cdp=await ctx.newCDPSession(p);
 async function audit(){const a=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,bottom:document.querySelector('.tw__footer').getBoundingClientRect().bottom,small:[...document.querySelectorAll('.tw button')].filter(e=>e.offsetWidth&&e.offsetHeight).map(e=>({id:e.dataset.action||e.dataset.cell,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(b=>b.w<43.5||b.h<43.5)}));assert.equal(a.overflow,false);assert.ok(a.bottom<=height);assert.deepEqual(a.small,[]);}
 async function hold(s,c,r,mirror){const u=typeof s==='number'?mirror.get(s):null,a=await(u?cell(u.c,u.r):source(s)).boundingBox(),b=await cell(c,r).boundingBox();assert.ok(a&&b);const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(tx-sx)*i/8,y:sy+(ty-sy)*i/8}]});await step(16);} }
 async function release(){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await step(50);}
 async function drag(s,c,r,m){const money=await p.locator('#coins').textContent();await hold(s,c,r,m);assert.equal(await p.locator('#coins').textContent(),money);await release();assert.equal(await p.locator('#coins').textContent(),money);}
 async function finishWave(){for(let i=0;i<100&&(await stage())==='wave';i++){if(await btn('upgrade-0').isVisible()){await shot('upgrade');await audit();const hp=await p.locator('#hp').textContent(),xp=await p.locator('#xp-progress').getAttribute('aria-valuenow');await step(2000);assert.equal(await p.locator('#hp').textContent(),hp);assert.equal(await p.locator('#xp-progress').getAttribute('aria-valuenow'),xp);await act('upgrade-0');}else await step(2000);}if(await btn('upgrade-0').isVisible())await act('upgrade-0');}
 await step(800);await shot('entry');await audit();
 // Real tutorial: drag, observe practice, merge directly, expand, deploy rail.
 await drag('tray',0,0);await step(5000);assert.equal(await stage(),'second');await shot('tutorial-pair');await drag('tray',0,0);assert.equal(await stage(),'expand');await act('expand');await drag('tray',0,3);assert.equal(await stage(),'ready');assert.equal(await p.locator('#coins').textContent(),'0');await shot('zero-gears');await audit();
 assert.equal(await source('reserve:0').getAttribute('data-merge'),'false');assert.equal(await source('reserve:1').getAttribute('data-merge'),'true');
 await drag('reserve:0',0,0);assert.equal(await source('reserve:0').count(),1);assert.match(await p.locator('.tw__notice').textContent(),/1.*2/);/* Invalid touch release already clears selection. */
 await drag('reserve:1',0,3);assert.equal(await source('reserve:1').count(),0);await drag('reserve:2',1,0);
 await act('main');
 // Hold an uncommitted bench unit until the XP popup interrupts the gesture.
 await hold('reserve:0',3,0);assert.equal(await p.locator('.tw__drag').isVisible(),true);
 for(let i=0;i<30&&!(await btn('upgrade-0').isVisible());i++)await step(1000);
 assert.equal(await btn('upgrade-0').isVisible(),true);assert.equal(await p.locator('.tw__drag').isVisible(),false);await shot('interrupted-drag');await release();assert.equal(await source('reserve:0').count(),1);assert.equal(await btn('upgrade-0').isVisible(),true);await act('upgrade-0');await finishWave();assert.equal(await stage(),'ready');await shot('refresh-teaching');
 const coins=await p.locator('#coins').textContent();await act('refresh');assert.equal(await btn('refresh-confirm').isVisible(),true);await shot('replace-confirm');await act('cancel');assert.equal(await p.locator('#coins').textContent(),coins);assert.equal(await source('reserve:0').count(),1);await act('refresh');await act('refresh-confirm');assert.equal(Number(await p.locator('#coins').textContent()),Number(coins)-5);assert.equal(await p.locator('#supply [data-source]').count(),3);await shot('new-batch');
 // Four independent runs using actual touch deployment and merge actions.
 await act('pause');await act('levels');await act('level-0');await act('confirm');const levelResults=[];
 for(let level=0;level<(width===390?4:1);level++){
  const g=new Workshop();g.reset('run',level);assert.equal(await p.locator('#coins').textContent(),'0');assert.equal(await p.locator('#hp').textContent(),'100');
  for(let wave=0;wave<5;wave++){
   for(let batch=0;batch<3;batch++){
    for(let n=0;n<40;n++){const m=moves(g);if(!m)break;await drag(m.source,m.c,m.r,g);assert.ok(g.place(m.source,m.c,m.r).ok);}
    if(g.coins<5||batch===2)break;await act('refresh');if(await btn('refresh-confirm').isVisible())await act('refresh-confirm');g.refresh(true);
   }
   assert.equal(await p.locator('#coins').textContent(),String(g.coins));await shot('level-'+(level+1)+'-ready-'+wave);await act('main');g.startWave();await finishWave();
   for(let n=0;n<8000&&(g.stage==='wave'||g.choices.length);n++){if(g.choices.length)g.chooseUpgrade(0);else g.tick(1/60);}
   assert.equal(await stage(),g.stage);assert.equal(await p.locator('#hp').textContent(),String(g.hp));assert.equal(await stage(),wave===4?'win':'ready');
  }
  await shot('level-'+(level+1)+'-win');await act('records');await shot('records');await audit();const download=p.waitForEvent('download');await act('export');const d=await download,json=JSON.parse(await fs.readFile(await d.path(),'utf8'));assert.equal(json.current.upgrades.length,3);assert.equal(json.current.history.length,5);assert.equal(json.current.level,level+1);await fs.writeFile(out+pass+'-v04-'+width+'-level-'+(level+1)+'.json',JSON.stringify(json,null,2));levelResults.push({level:level+1,hp:g.hp,upgrades:g.upgradeLog.map(u=>u.id)});await act('back');if(width===390&&level<3)await act('next-level');
 }
 await act('levels');await act('level-3');await act('main');await finishWave();assert.equal(await stage(),'lose');await shot('lose');await act('run');assert.equal(await p.locator('#hp').textContent(),'100');assert.equal(await p.locator('#coins').textContent(),'0');await act('pause');await shot('pause');await act('rules');await shot('rules');await audit();assert.deepEqual(errors,[]);results.push({width,height,lang,levelResults,errors});await ctx.close();
}
try{if(process.env.QA_CASE!=='en')await run(390,844,'zh');await run(320,568,'en');await fs.writeFile(out+pass+'-v04-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}

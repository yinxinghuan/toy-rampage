import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workshop,FOOTPRINT} from '../src/engine.js';
import {moves,upgradeIndex} from './balance.mjs';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5192/',pass=process.env.QA_PASS||'first',out=fileURLToPath(new URL('../_qa/ui/',import.meta.url));await fs.mkdir(out,{recursive:true});
const real=process.env.QA_REAL==='1',level=Number(process.env.QA_LEVEL||0),waveLimit=real?4:8;
const pixel=process.env.QA_PIXEL==='1';
const strategy=process.env.QA_STRATEGY||'support';
const browser=await chromium.launch({headless:true}),results=[];
try{for(const[width,height,lang]of[[390,844,'zh'],[320,568,'en'],[440,600,'zh']]){
 if(process.env.QA_WIDTH&&width!==Number(process.env.QA_WIDTH))continue;
 const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,locale:lang==='zh'?'zh-CN':'en',...(real?{recordVideo:{dir:out+'v05-videos/',size:{width,height}}}:{}),reducedMotion:width===320?'reduce':'no-preference'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));if(!real)await p.clock.install();await p.goto(base+'?lang='+lang,{waitUntil:'domcontentloaded'});let externalBanner=false;if(real){assert.equal(await p.locator('meta[name="build-id"]').getAttribute('content'),'toy-workshop-playtest-20260911-r8');await p.locator('#alteru-guest-banner').waitFor({state:'visible',timeout:10000}).catch(()=>{});externalBanner=await p.locator('#alteru-guest-banner').isVisible();await p.screenshot({path:out+pass+'-v05-external-guest-'+width+'.png'});}await p.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 if(pixel)await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000});
 if(process.env.QA_VERSION)assert.equal(await p.locator('#version').textContent(),process.env.QA_VERSION);
 const step=ms=>real?p.waitForTimeout(ms):p.clock.runFor(ms),btn=a=>p.locator('[data-action="'+a+'"]'),act=async a=>{if(pixel)await step(250);await btn(a).filter({visible:true}).tap();await step(pixel?250:50);},stage=()=>p.locator('.tw').getAttribute('data-stage'),cell=(c,r)=>p.locator('[data-cell="'+c+','+r+'"]');
 const shot=async n=>{if(['kit-selected','kit-choices'].includes(n)){const box=await p.locator('.tw__modal').boundingBox();assert(box);for(const id of ['cancel',...(await btn('route-claim-frost').isVisible()?['route-claim-frost']:['route-claim-storm'])]){const b=await btn(id).boundingBox();assert(b&&b.y>=box.y&&b.y+b.height<=box.y+box.height-8,'kit control visible '+id);}}if(process.env.QA_COMPACT_DIALOGS&&await p.locator('.tw__modal').isVisible()){const m=await p.locator('.tw__modal').evaluate(e=>{const r=e.getBoundingClientRect();return{name:e.className,height:r.height,top:r.top,bottom:r.bottom,scroll:e.scrollHeight,client:e.clientHeight,buttons:[...e.querySelectorAll('button')].map(b=>({id:b.dataset.action,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))};});assert(m.top>=0&&m.bottom<=height-60);assert.deepEqual(m.buttons.filter(b=>b.w<43.5||b.h<43.5),[]);if(/^(win|lose|upgrade-)/.test(n))assert(m.scroll<=m.client+1,JSON.stringify({n,...m}));await fs.writeFile(out+pass+'-'+width+'-'+n+'-dialog.json',JSON.stringify(m,null,2));}return p.screenshot({path:out+pass+'-v05-platform-layout-'+width+'-'+n+'.png'});},cdp=await ctx.newCDPSession(p);
 async function audit(){const a=await p.evaluate(()=>({over:document.documentElement.scrollWidth>innerWidth,bottom:document.querySelector('.tw__footer').getBoundingClientRect().bottom,small:[...document.querySelectorAll('button')].filter(e=>e.offsetWidth&&e.offsetHeight).map(e=>({id:e.dataset.action||e.dataset.cell||e.dataset.source,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>!e.id?.includes(',')&&(e.w<43.5||e.h<43.5))}));assert.equal(a.over,false);assert.ok(a.bottom<=height,JSON.stringify(a));assert.deepEqual(a.small,[]);}
 async function drag(src,c,r,name){if(pixel&&src.includes('data-source')&&!(await p.locator(src).count())&&await btn('bench-toggle').isVisible())await act('bench-toggle');const a=await p.locator(src).boundingBox(),b=await cell(c,r).boundingBox();assert.ok(a&&b,src+' -> '+c+','+r);const sx=a.x+a.width/2,sy=a.y+a.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(b.x+b.width/2-sx)*i/8,y:sy+(b.y+b.height/2+(pixel?32:0)-sy)*i/8}]});await step(16);}await p.waitForTimeout(50);await step(50);if(name)await shot(name);if(name==='land-drag')assert.equal(await p.locator('.tw__notice').textContent(),'');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await step(60);}
 async function motionFrames(name){
  const count=await p.evaluate(()=>{const anims=document.getAnimations().filter(a=>a.id==='tw-arrange-motion');for(const a of anims){a.pause();a.currentTime=0;}return anims.length;});assert(count>=1,'motion exists '+name);
  for(const ms of [0,160,400]){await p.evaluate(ms=>{for(const a of document.getAnimations().filter(a=>a.playState==='paused'&&a.id==='tw-arrange-motion'))a.currentTime=ms;},ms);await shot(name+'-'+ms);}
  await p.evaluate(()=>{for(const a of document.getAnimations().filter(a=>a.playState==='paused'&&a.id==='tw-arrange-motion'))a.finish();});
 }
 async function exportRecord(){await act('records');const promise=p.waitForEvent('download');await act('export');const d=await promise,record=JSON.parse(await fs.readFile(await d.path(),'utf8'));await act('back');return record;}
 async function reloadGame(){await step(600);if(!real)await p.clock.resume();await p.reload();try{if(pixel)await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000});}catch(e){await shot('recovery-loading-failed');throw e;}if(!real)await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await step(800);await shot('recovery');await act('recover-run');await step(600);}
 await step(900);await shot('entry');await audit();assert.equal(await p.locator('.tw').getAttribute('data-cells'),'12');
 await drag('[data-source="tray"]',1,2);await step(5000);assert.equal(await stage(),'second');await drag('[data-source="tray"]',1,2);if(process.env.QA_MOTION)await motionFrames('board-merge-motion');assert.equal(await stage(),'expand');await step(3100);await shot('land-guide');
 assert.equal(await p.locator('#supply [data-source^=land]').count(),2);
 if(pixel){assert.equal(await p.locator('.tw-land-credit').count(),1);for(let n=0;n<4;n++){await act('land-rotate');assert.equal(await p.locator('[data-source="land:other"]').getAttribute('data-kind'),'plotL'+((n+1)%4));await shot('first-rotate-'+n);}await reloadGame();assert.equal(await stage(),'expand');}
 await drag('[data-source="land"]',1,2,'land-invalid');assert.equal(await stage(),'expand');await drag('[data-source="land:other"]',0,4,'land-drag');assert.equal(await p.locator('.tw').getAttribute('data-cells'),'15');await shot('land-result');await drag('[data-source="tray"]',1,4);assert.equal(await stage(),'ready');
 if(process.env.QA_SMOKE){await audit();assert.deepEqual(errors,[]);await ctx.close();results.push({width,height,smoke:true,errors});continue;}
 // Use normal menus to start a known independent run; mirror never enters the page.
 await act('pause');await act('levels');await act('level-'+level);await act('confirm');const g=new Workshop();g.reset('run',level);
 let shelfMerges=0,anchoredFusions=0,fullSwap=false;
 if(process.env.QA_REARRANGE){
  await drag('[data-source="reserve:0"]',3,0);assert(g.place('reserve:0',3,0).ok);
  const a=g.at(0,0),b=g.at(3,0);
  await drag('[data-cell="0,0"]',3,0,'swap-preview');assert.equal(g.place(a.id,3,0).type,'swap');if(process.env.QA_MOTION)await motionFrames('swap-motion');await shot('swap-result');
  await drag('[data-cell="3,0"]',0,0);assert.equal(g.place(a.id,0,0).type,'swap');
  await drag('[data-cell="3,0"]',0,2,'swap-invalid');assert.equal(g.place(b.id,0,2).ok,false);assert.equal(g.at(3,0).id,b.id);
 }
 const completed=[];
 for(let wave=0;wave<waveLimit&&!g.ended;wave++){
  if(process.env.QA_SQUARE&&wave===2){
   if(await p.locator('#supply').getAttribute('data-mode')!=='land')await act('bench-toggle');
   assert.equal(await p.locator('#supply [data-source^=land]').count(),3);
   let square;for(let r=0;r<g.rows&&!square;r++)for(let c=0;c<6;c++){const q=g.preview('land:square',c,r);if(q.ok){square=q;break;}}
   assert(square,'a legal square expansion exists');await shot('square-offers');await drag('[data-source="land:square"]',square.c,square.r,'square-drag');assert(g.place('land:square',square.c,square.r).ok);assert.equal(Number(await p.locator('.tw').getAttribute('data-cells')),g.board.filter(Boolean).length);await shot('square-result');
  }
  if(process.env.QA_LAND&&wave===3){
   if(await p.locator('#supply').getAttribute('data-mode')!=='land')await act('bench-toggle');
   assert.equal(g.landRemaining,3);await act('land-choice');assert(g.chooseLand());await shot('land-L-choice');await audit();
   for(let n=0;n<4;n++){await act('land-rotate');assert(g.rotateLand());assert.equal(await p.locator('[data-source=land]').getAttribute('data-kind'),g.landKind());await shot('land-L-rotation-'+n);}
   const a=await p.locator('[data-source=land]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+a.width/2,y:a.y-70}]});await step(60);await shot('land-L-drag');await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await step(100);assert.equal(await p.locator('.tw__drag').isVisible(),false);
   await reloadGame();if(await p.locator('#supply').getAttribute('data-mode')!=='land')await act('bench-toggle');assert.equal(await p.locator('[data-source=land]').getAttribute('data-kind'),g.landKind());
   let m=g.landMove();for(let n=0;!m&&n<4;n++){await act('land-rotate');g.rotateLand();m=g.landMove();}assert(m,'L has a legal destination');const before=g.board.filter(Boolean).length;
   await drag('[data-source=land]',m.c,m.r,'land-L-preview');assert(g.place('land',m.c,m.r).ok);assert.equal(Number(await p.locator('.tw').getAttribute('data-cells')),before+3);await shot('land-L-result');await audit();break;
  }
  if(strategy.startsWith('kit-')&&g.routeSupplies().includes(strategy.slice(4))){
   if(pixel&&await p.locator('#supply').getAttribute('data-mode')==='land')await act('bench-toggle');
   if(process.env.QA_HINT){
    const u=g.units.find(u=>u.kind==='spring'&&u.rank===2);assert(u,'tier-two recipe parent exists');
    await cell(u.c,u.r).tap();await step(300);assert.equal(await btn('fusion-recipe').getAttribute('data-recipe'),'frost');
    await shot('parent-recipe-hint');await act('fusion-recipe');assert.equal(await p.locator('[data-machine="frost:3"]').count(),1);
    assert(!(await btn('fuse-now').isVisible()));await shot('missing-parent-recipe');await act('cancel');await act('deselect');
   }
   await shot('kit-entry');await act('route-supply');await shot('kit-choices');
   const coins=g.coins;await act('cancel');assert.equal(Number(await p.locator('#coins').textContent()),coins);
   await act('route-supply');if(await btn('route-view-'+strategy.slice(4)).isVisible())await act('route-view-'+strategy.slice(4));await shot('kit-selected');await act('route-claim-'+strategy.slice(4));assert(g.claimRoute(strategy.slice(4),true).ok);
   assert.equal(Number(await p.locator('#coins').textContent()),g.coins);assert(!(await btn('route-supply').isVisible()));
   await step(3200);await shot('kit-delivered');assert(await p.locator('.tw__guide').isVisible());
   if(process.env.QA_BENCH){
    assert.equal(await p.locator('[data-source="reserve:1"]').getAttribute('data-fusion-role'),'first');
    assert.equal(await p.locator('[data-source="reserve:0"]').getAttribute('data-fusion-role'),'next');
    assert.equal(await p.locator('[data-fusion-role]').count(),2);
    for(const badge of await p.locator('[data-fusion-role] .tw__fusion-pair').all())assert(await badge.isVisible(),'fusion badge must be visible in pixel skin');
    const shelfDrag=async()=>{const a=await p.locator('[data-source="reserve:0"]').boundingBox(),b=await p.locator('[data-source="reserve:1"]').boundingBox();const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
     for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(tx-sx)*i/8,y:sy+(ty-sy)*i/8}]});await step(16);}
     assert.equal(await p.locator('[data-source="reserve:1"]').getAttribute('data-drop'),'fusion');await shot('bench-fusion-preview');
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await step(60);
    };
    await shelfDrag();assert(await btn('fuse-now').isVisible());await step(350);await shot('bench-fusion-confirm');await act('cancel');
    assert.equal(await p.locator('[data-fusion-role]').count(),2);assert.equal(Number(await p.locator('#coins').textContent()),g.coins);
    await shelfDrag();await btn('fuse-now').tap();await step(16);await motionFrames('bench-fusion-motion');
    assert(g.mergeReserve('reserve:0','reserve:1',true).ok);await step(500);await shot('bench-fused');
    assert.equal(await p.locator('[data-source="reserve:0"]').count(),0);assert.equal(await p.locator('[data-source="reserve:1"]').getAttribute('data-kind'),strategy.slice(4));
    assert.equal(Number(await p.locator('#coins').textContent()),g.coins);
   }
   await reloadGame();assert(!(await btn('route-supply').isVisible()));
  }
  for(let batch=0;batch<3;batch++){
   if(process.env.QA_REARRANGE&&!shelfMerges){
    let pair;for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)if(g.reservePreview('reserve:'+i,'reserve:'+j).ok)pair=[i,j];
    if(pair){
     const [i,j]=pair,source='reserve:'+i,target='reserve:'+j,a=await p.locator(`[data-source="${source}"]`).boundingBox(),b=await p.locator(`[data-source="${target}"]`).boundingBox();
     const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
     for(let n=1;n<=8;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(tx-sx)*n/8,y:sy+(ty-sy)*n/8}]});await step(16);}
     assert.equal(await p.locator(`[data-source="${target}"]`).getAttribute('data-drop'),'merge');await shot('reserve-merge-preview');
     await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await step(100);
     assert.equal(await p.locator('[data-drop]').count(),0);
     assert.equal(await p.locator(`[data-source="${source}"] canvas`).getAttribute('data-rank'),String(g.get(source).rank));
     assert.equal(await p.locator(`[data-source="${target}"] canvas`).getAttribute('data-rank'),String(g.get(target).rank));
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
     for(let n=1;n<=8;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(tx-sx)*n/8,y:sy+(ty-sy)*n/8}]});await step(16);}
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await step(30);if(process.env.QA_MOTION)await motionFrames('reserve-merge-motion');await step(500);await p.waitForTimeout(450);const merged=g.mergeReserve(source,target);assert(merged.ok);
     assert.equal(await p.locator(`[data-source="${source}"]`).count(),0);assert.equal(await p.locator(`[data-source="${target}"] canvas`).getAttribute('data-rank'),String(merged.rank));await shot('reserve-merge-result');shelfMerges++;
    }
   }
   if(pixel){await shot('supply-'+(wave+1)+'-'+batch);const scales=await p.locator('#supply[data-mode=weapons] canvas').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().width/parseFloat(el.style.getPropertyValue('--preview-w'))));if(scales.length>1)assert(Math.max(...scales)-Math.min(...scales)<.2,'All candidates share a cell scale');}
   for(let n=0;n<60;n++){const m=moves(g,strategy);if(!m)break;if(m.action){if(pixel&&await p.locator('#supply').getAttribute('data-mode')!=='land')await act('bench-toggle');await act(m.action);g[{'land-rotate':'rotateLand','land-choice':'chooseLand','land-split':'splitLand'}[m.action]]();continue;}const u=g.get(m.source),src=typeof m.source==='number'?'[data-cell="'+u.c+','+u.r+'"]':'[data-source="'+m.source+'"]';
    if(m.type==='fusion'){
     if(strategy.startsWith('route-')||strategy.startsWith('kit-')){
      const lineup=()=>p.locator('.px-board .px-machine').evaluateAll(els=>els.map(e=>[e.dataset.kind,e.style.getPropertyValue('--x'),e.style.getPropertyValue('--y'),e.querySelector('.px-rank').textContent]));
      const before=await lineup();await drag(src,m.target.c,m.target.r,'new-fusion-preview');
      assert(await btn('fuse-now').isVisible());assert.equal(await p.locator(`.tw__recipe canvas[data-machine="${m.kind}:${g.get(m.source).rank+1}"]`).count(),1);
      assert.deepEqual(await lineup(),before);await shot('new-fusion-confirm');await act('cancel');assert.deepEqual(await lineup(),before);
      await drag(src,m.target.c,m.target.r);await act('fuse-now');await step(500);await shot('new-fusion-result');
     }else{
     if(process.env.QA_REARRANGE){
      const lineup=()=>p.locator('.px-board .px-machine').evaluateAll(els=>els.map(e=>[e.dataset.kind,e.style.getPropertyValue('--x'),e.style.getPropertyValue('--y'),e.querySelector('.px-rank').textContent]));
      const before=await lineup();await drag(src,m.c,m.r,'fusion-drag-preview');assert(await btn('fuse-now').isVisible());assert.deepEqual(await lineup(),before,'drag does not consume fusion materials');await shot('fusion-drag-confirm');await act('cancel');assert.deepEqual(await lineup(),before,'cancel preserves fusion materials');
     }
     if(process.env.QA_REARRANGE){const f=btn('fusion-recipe'),box=await f.boundingBox(),anchor=await cell(m.c+1,m.r).boundingBox();assert(box&&anchor);assert.equal(await f.getAttribute('data-anchor'),m.c+','+m.r);assert(Math.abs(box.x+box.width/2-anchor.x-anchor.width/2)<2);assert(box.y<anchor.y&&box.y+box.height>anchor.y);assert(box.height>=44);await shot('fusion-anchor');anchoredFusions++;}
     await act('fusion-recipe');await shot('fusion-recipe');await act('cancel');
     if(process.env.QA_REARRANGE)await drag(src,m.c,m.r);else await act('fusion-recipe');await act('fuse-now');
     }
    }else await drag(src,m.c,m.r,process.env.QA_TRACE?'trace-'+wave+'-'+n:undefined);
    if(process.env.QA_TRACE)console.log(JSON.stringify({m,cells:await p.locator('.tw').getAttribute('data-cells'),notice:await p.locator('.tw__notice').textContent()}));
    assert.ok(g.place(m.source,m.c,m.r).ok);
    if(process.env.QA_BENCH&&wave===2&&m.source==='reserve:1'&&m.type==='place'){await step(500);await shot('bench-product-deployed');}
   }
   if(g.coins<5||batch===2)break;
   await act('refresh');if(await btn('refresh-confirm').isVisible()){await act('cancel');assert.equal(Number(await p.locator('#coins').textContent()),g.coins);await act('refresh');await act('refresh-confirm');}assert.ok(g.refresh(true).ok);
  }
  await shot('ready-'+(wave+1));await audit();assert.equal(Number(await p.locator('.tw').getAttribute('data-cells')),g.board.filter(Boolean).length);
  if(process.env.QA_FULLSWAP&&!fullSwap&&g.units.reduce((n,u)=>n+FOOTPRINT[u.kind][0]*FOOTPRINT[u.kind][1],0)===g.board.filter(Boolean).length){
   let pair;for(const a of g.units)for(const b of g.units)if(g.preview(a.id,b.c,b.r).type==='swap'&&g.preview(a.id,b.c,b.r).ok)pair=[a,b];
   assert(pair,'a legal full-board swap exists');const[a,b]=pair,origin=[a.c,a.r],destination=[b.c,b.r];
   await drag(`[data-cell="${origin}"]`,...destination,'full-board-swap');assert.equal(g.place(a.id,...destination).type,'swap');await step(500);await shot('full-board-swapped');
   await drag(`[data-cell="${destination}"]`,...origin);assert.equal(g.place(a.id,...origin).type,'swap');await step(500);fullSwap=true;
  }
  if(process.env.QA_KIT_ONLY&&wave===2)break;
  await act('main');assert.ok(g.startWave());const upgrades=[];
  for(let n=0;n<15000&&(g.stage==='wave'||g.choices.length);n++){if(g.choices.length){const i=upgradeIndex(g,strategy);upgrades.push(g.choices[i]);g.chooseUpgrade(i);}else g.tick(1/60);}
  for(let n=0;n<90;n++){
   if(await btn('upgrade-0').isVisible()){await shot('upgrade-'+(wave+1));const id=upgrades.shift();assert.ok(id,'unexpected upgrade');await p.locator('[data-upgrade="'+id+'"]').first().tap();await step(50);}
   else if((await stage())!=='wave')break;
   else{await step(2500);if(n===1&&[1,3,5].includes(wave))await shot('combat-'+(wave+1));}
  }
  if(pixel)await step(600);
  // The last kill can offer an upgrade as the wave changes to ready; do not
  // exit the UI driver before consuming that real, end-of-wave dialog.
  while(await btn('upgrade-0').isVisible()){
   const id=upgrades.shift();assert.ok(id,'unexpected end-of-wave upgrade');await shot('upgrade-end-'+(wave+1));
   await p.locator('[data-upgrade="'+id+'"]').first().tap();await step(300);
  }
  assert.equal(await stage(),g.stage,'wave '+(wave+1));assert.equal(Number(await p.locator('#hp').textContent()),g.hp,'HP '+(wave+1));assert.equal(upgrades.length,0);completed.push(g.wave);
  if(process.env.QA_REARRANGE&&g.ended){assert(shelfMerges>0,'reserve merge exercised');assert(anchoredFusions>0,'anchored fusion exercised');}
 }
 if(process.env.QA_LAND){assert.equal(completed.length,3);assert.deepEqual(errors,[]);results.push({width,height,lang,land:true,cells:g.board.filter(Boolean).length,errors});await ctx.close();console.log('land UI '+width+' passed');continue;}
 if(process.env.QA_KIT_ONLY){assert(g.units.some(u=>u.kind===strategy.slice(4)&&u.rank===3));await act('pause');const record=await exportRecord();assert.deepEqual(record.current.units,g.lineup());assert.deepEqual(errors,[]);results.push({width,height,lang,kitOnly:true,report:record.current,errors});await ctx.close();console.log('kit UI '+width+' passed');continue;}
 if(process.env.QA_FULLSWAP)assert(fullSwap,'full-board touch swap exercised');
 if(real){await act('pause');const record=await exportRecord();assert.equal(record.current.history.length,4);assert.ok(record.current.units.some(u=>u.kind==='bubble'));assert.ok(record.current.units.some(u=>u.kind==='drum'));assert.equal(record.current.units.some(u=>u.kind==='fusion'),!['trial-no-fusion','trial-spread'].includes(strategy));await shot('real-four-waves');assert.deepEqual(errors,[]);results.push({width,height,level,real,externalBanner,report:record.current,errors});await ctx.close();await fs.rename(await p.video().path(),out+'v05-videos/'+pass+'-'+width+'-four-waves.webm');console.log('v05 real '+width+' passed');continue;}
 assert.equal(g.stage,'win');assert.equal(g.history.length,8);if(process.env.QA_RECOVERY){await reloadGame();assert.equal(await stage(),'win');}await shot('win');const record=await exportRecord();assert.equal(record.current.totalWaves,8);assert.equal(record.current.history.length,8);assert.equal(record.current.board.filter(Boolean).length,42);assert.deepEqual(record.current.units,g.lineup());await act('records');await act('wave-record-7');await shot('records');await act('back');await act('run');assert.equal(await p.locator('.tw').getAttribute('data-cells'),'12');assert.equal(await p.locator('#hp').textContent(),'100');
 // A legitimate no-supply run must fail and support retry without stuck overlays.
 for(let i=0;i<4&&(await stage())!=='lose';i++){while(await btn('upgrade-0').isVisible())await act('upgrade-0');await shot('failure-run-before-'+i);assert.equal(await stage(),'ready','failure-run ready');await act('main');for(let j=0;j<80&&(await stage())==='wave';j++){if(await btn('upgrade-0').isVisible())await act('upgrade-0');else await step(2500);}}
 assert.equal(await stage(),'lose');if(process.env.QA_RECOVERY){await reloadGame();assert.equal(await stage(),'lose');}if(pixel)await step(600);await shot('lose');await act('run');await audit();assert.equal(await stage(),'ready');assert.deepEqual(errors,[]);results.push({width,height,lang,completed,report:record.current,errors});await ctx.close();console.log('v05 '+width+' passed');
}await fs.writeFile(out+pass+'-v05-results.json',JSON.stringify(results,null,2));}finally{await browser.close();}

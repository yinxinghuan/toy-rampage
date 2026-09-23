import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5194/',out='_qa/feedback-r36';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{for(const [level,kind,width,height,c,r]of [[4,'rivet',390,844,3,0],[5,'arc',320,568,1,0]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>console.error('REQUEST FAILED',r.url(),r.failure()));
 page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url());});
 page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
 await page.clock.install();await page.goto(base+'?lang=zh&v=r36',{waitUntil:'domcontentloaded'});
 try{await page.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000});}
 catch(error){await page.screenshot({path:`${out}/${kind}-load-failure.png`});console.error(await page.locator('body').innerText(),errors);throw error;}
 await page.clock.runFor(900);
 const act=async id=>{await page.locator(`[data-action="${id}"]`).filter({visible:true}).tap();await page.clock.runFor(300);};
 await act('pause');await act('levels');await page.screenshot({path:`${out}/${kind}-levels.png`});await act('level-'+level);await act('confirm');
 await page.screenshot({path:`${out}/${kind}-supply.png`});
 const a=await page.locator('[data-source="reserve:2"]').boundingBox(),b=await page.locator(`[data-cell="${c},${r}"]`).boundingBox(),cdp=await context.newCDPSession(page);
 const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2+32;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
 for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(tx-sx)*i/8,y:sy+(ty-sy)*i/8}]});await page.clock.runFor(20);}
 const footprint=await page.locator('.tw__drag canvas').evaluate(el=>[Number(el.dataset.footWidth),Number(el.dataset.footHeight)]);
 assert(Math.abs(footprint[0]/b.width-(kind==='rivet'?1:2))<.01);assert(Math.abs(footprint[1]/b.height-(kind==='rivet'?3:2))<.01);
 await page.screenshot({path:`${out}/${kind}-drag.png`});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.clock.runFor(300);
 assert(await page.locator(`.px-machine[data-kind="${kind}"]`).count());await page.screenshot({path:`${out}/${kind}-placed.png`});await act('main');
 let fired=false;for(let i=0;i<100;i++){await page.clock.runFor(60);const shots=JSON.parse(await page.locator('#app').getAttribute('data-shots')||'{}');if(shots[kind]){fired=true;break;}}
 assert(fired);for(let i=0;i<5;i++){await page.clock.runFor(60);await page.screenshot({path:`${out}/${kind}-attack-${i}.png`});}
 let observed=false;for(let i=0;i<300;i++){
  const upgrade=page.locator('[data-action="upgrade-0"]');if(await upgrade.isVisible())await act('upgrade-0');else await page.clock.runFor(60);
  const n=Number(await page.locator('#app').getAttribute(kind==='arc'?'data-chain-targets':'data-breached')||0);
  if(n>=(kind==='arc'?2:1)){observed=true;if(kind==='arc')await page.clock.runFor(230);await page.screenshot({path:`${out}/${kind}-mechanic.png`});break;}
 }
 assert(observed,'actual '+kind+' consequence rendered');
 assert.deepEqual(errors,[]);console.log({kind,width,footprint,errors});await context.close();
}}finally{await browser.close();}

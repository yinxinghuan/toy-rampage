import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5193/',out=process.env.QA_OUT||'_qa/scenes-r30/dev',before=process.env.QA_BEFORE==='1';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{for(const [width,height,lang] of [[320,568,'en'],[390,844,'zh'],[390,600,'zh']]){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install();await p.goto(base+'?lang='+lang);await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:60000});await p.evaluate(()=>document.fonts.ready);await p.clock.runFor(400);
 const action=async a=>{await p.locator(`[data-action="${a}"]`).tap();await p.clock.runFor(100);};
 const shot=async name=>{await p.screenshot({path:`${out}/${width}x${height}-${name}.png`});};
 const check=async name=>{const m=await p.evaluate(()=>{const r=s=>{const e=document.querySelector(s),b=e.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,font:parseFloat(getComputedStyle(e).fontSize)};};return{badge:r('.tw-level-badge'),number:r('.tw-level-badge b'),title:r('#title'),main:r('#main-action'),cell:r('[data-cell="0,0"]'),phase:document.querySelector('#phase').textContent,scene:document.querySelector('.px-game__environment').dataset.scene,overflow:document.documentElement.scrollWidth>innerWidth};});assert(!m.overflow);assert(m.main.bottom<=height);assert(m.badge.right<m.title.x);assert(m.number.font>=30);results.push({width,height,lang,name,...m});return m;};
 await shot('tutorial');if(!before){await check('tutorial');assert.equal(await p.locator('#phase').textContent(),lang==='zh'?'练习':'Practice');}
 let cell;
 for(let i=0;i<4;i++){
  await action('pause');await action('levels');await action('level-'+i);await action('confirm');await p.clock.runFor(200);
  assert.equal(await p.locator('.tw').getAttribute('data-level'),String(i+1));await shot('level-'+(i+1));
  if(!before){const m=await check('level-'+(i+1));assert.equal(m.scene,['environment','assembly','foundry','power'][i]);assert.equal(m.phase,lang==='zh'?'波1/8':'W1/8');assert.equal(await p.locator('.tw-level-badge b').textContent(),String(i+1));if(cell)assert.deepEqual(m.cell,cell);else cell=m.cell;
   await action('main');await p.clock.runFor(1500);assert.equal(await p.locator('.tw').getAttribute('data-stage'),'wave');await shot('wave-'+(i+1));assert.equal(await p.locator('.px-game__environment').getAttribute('data-scene'),m.scene);
  }
 }
 if(!before){await action('pause');await action('reset-run');await action('confirm');assert.equal(await p.locator('.px-game__environment').getAttribute('data-scene'),'power');await action('pause');await action('rules');await action('reset-tutorial');await action('confirm');assert.equal(await p.locator('.px-game__environment').getAttribute('data-scene'),'environment');assert.equal(await p.locator('.tw-level-badge b').textContent(),'1');}
 assert.deepEqual(errors,[]);await ctx.close();
}}finally{await browser.close();}
await fs.writeFile(`${out}/checks.json`,JSON.stringify(results,null,2));console.log('PASS four scene switches, wave states, fixed geometry, retry/tutorial reset, 3 viewports',before?'baseline':'');

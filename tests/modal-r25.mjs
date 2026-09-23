import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5193/',phase=process.env.QA_PASS||'after',out=`_qa/modal-r25/${phase}`;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const [width,height,lang] of [[320,568,'en'],[390,844,'zh'],[390,600,'zh']]){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?lang='+lang);await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:60000});
 const act=a=>p.locator(`[data-action="${a}"]`).tap();
 const check=async name=>{await p.locator('.tw__modal').waitFor();await p.waitForTimeout(220);const m=await p.locator('.tw__modal').evaluate(el=>{const r=el.getBoundingClientRect();return{height:r.height,bottom:r.bottom,top:r.top,width:r.width,scroll:el.scrollHeight,client:el.clientHeight,buttons:[...el.querySelectorAll('button')].filter(b=>b.offsetWidth).map(b=>({id:b.dataset.action,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))};});assert(m.top>=0&&m.bottom<=height-60);assert(m.width<=width);assert.deepEqual(m.buttons.filter(b=>b.w<44||b.h<44),[]);if(phase!=='before'&&name==='pause'){assert(m.height<=390);assert(m.scroll<=m.client+1);}await p.screenshot({path:`${out}/${width}x${height}-${name}.png`});results.push({viewportWidth:width,viewportHeight:height,lang,name,...m});};
 await act('pause');await check('pause');await act('levels');await check('levels');await act('level-0');await check('confirm');await act('cancel');await act('back');await act('records');await check('records');await act('back');await act('rules');await check('rules');await act('back');await act('resume');assert.deepEqual(errors,[]);await ctx.close();
}}finally{await browser.close();}await fs.writeFile(`${out}/checks.json`,JSON.stringify(results,null,2));console.log(results.map(({width,height,name,scroll,client})=>({width,panelHeight:height,name,scroll,client})));

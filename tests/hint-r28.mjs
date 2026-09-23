import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5193/',out=process.env.QA_OUT||'_qa/hint-r28/dev';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{for(const [width,height,lang]of[[320,568,'en'],[390,600,'zh'],[390,844,'zh'],[1280,720,'en']]){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:true}),p=await ctx.newPage();await p.clock.install();await p.goto(base+'?lang='+lang);await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:60000});await p.evaluate(()=>document.fonts.ready);await p.clock.runFor(600);
 // Stress actual localized tutorial strings without advancing the simulation.
 for(const text of lang==='en'?['Drag onto the board','Drag onto three empty cells','Drag matching machines together','New machines are yours · Drag in']:['拖到亮框','拖到连续三格空位','把地块拖到虚线空位','用刚得到的齿轮换一批']){
 await p.locator('#hint-title').evaluate((e,t)=>e.textContent=t,text);const m=await p.evaluate(()=>{const r=s=>{const a=document.querySelector(s).getBoundingClientRect();return{x:a.x,y:a.y,w:a.width,h:a.height,right:a.right,bottom:a.bottom};};return{row:r('.tw__hint'),copy:r('.tw__hint-copy'),title:r('#hint-title'),button:r('[data-action=hint]'),hud:r('.tw__hud')};});assert(Math.abs(m.row.x-m.hud.x)<1);assert(m.title.x>=m.copy.x+7.5);assert(m.title.right<=m.button.x-6);assert(m.title.y>=m.row.y-1&&m.title.bottom<=m.row.bottom+1);assert(m.button.w>=44&&m.button.h>=44);results.push({width,height,lang,text,...m});await p.screenshot({path:`${out}/${width}x${height}-${results.length}.png`});}
 await p.locator('[data-action=hint]').tap();await p.clock.runFor(100);assert(await p.locator('.tw__guide').isVisible());await ctx.close();
}}finally{await browser.close();}await fs.writeFile(`${out}/checks.json`,JSON.stringify(results,null,2));console.log('PASS',results.length,'localized hint layouts, four viewports, replay remains usable');

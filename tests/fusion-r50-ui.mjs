// Controlled saved-state fixtures; actual touch/UI commits, not a full campaign.
import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {Workshop} from '../src/engine.js';import {FUSIONS} from '../src/fusions.js';import {captureRun} from '../src/save.js';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5196/',out='_qa/ui/'+(process.env.QA_PASS||'r50-fusion'),key='alteru:0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae:toy-workshop-run-v1';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const width of [390,320]){
 const ctx=await browser.newContext({viewport:{width,height:width===320?568:844},isMobile:true,hasTouch:true,reducedMotion:width===320?'reduce':'no-preference'});let p=await ctx.newPage(),cdp;const errors=[];
 const act=async name=>{await p.locator(`[data-action="${name}"]`).filter({visible:true}).tap();await p.waitForTimeout(200);};
 const load=async g=>{await p.close();p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));cdp=await ctx.newCDPSession(p);const raw=captureRun(g);await p.addInitScript(({key,raw})=>localStorage.setItem(key,JSON.stringify(raw)),{key,raw});await p.goto(base+'?lang='+(width===320?'en':'zh'));await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000});await act('recover-run');await p.waitForTimeout(400);};
 const read=()=>p.evaluate(()=>JSON.parse(alteruLocalStorage.getItem('toy-workshop-run-v1')).state);
 const drag=async()=>{const a=await p.locator('[data-source="reserve:0"]').boundingBox(),b=await p.locator('[data-cell="1,2"]').boundingBox();const sx=a.x+a.width/2,sy=a.y+a.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(b.x+b.width/2-sx)*i/10,y:sy+(b.y+b.height/2+32-sy)*i/10}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(120);};
 for(const recipe of FUSIONS)for(const reverse of [false,true]){
  const g=new Workshop();g.reset('run',5);g.units=[];g.board.fill(true);g.landRemaining=0;const rank=recipe.rank;
  g.add(reverse?recipe.material:recipe.anchor,rank,1,2);g.reserve=[{kind:reverse?recipe.anchor:recipe.material,rank},null,null];await load(g);
  await drag();assert(await p.locator('[data-action=fuse-now]').isVisible());assert.equal(await p.locator(`.tw__recipe [data-machine="${recipe.kind}:${rank+1}"]`).count(),1);
  await p.screenshot({path:`${out}/${width}-${recipe.kind}-${reverse}-confirm.png`});await act('cancel');assert.equal((await read()).units[0].kind,g.units[0].kind);
  await drag();await act('fuse-now');await p.screenshot({path:`${out}/${width}-${recipe.kind}-${reverse}-motion.png`});await p.waitForTimeout(700);const state=await read();assert.equal(state.units.length,1);assert.equal(state.units[0].kind,recipe.kind);assert.equal(state.units[0].rank,rank+1);assert.equal(state.reserve[0],null);assert.equal(state.coins,0);
  await p.screenshot({path:`${out}/${width}-${recipe.kind}-${reverse}-result.png`});results.push({width,kind:recipe.kind,reverse,passed:true});
 }
 const g=new Workshop();g.reset('run',5);g.units=[];g.board.fill(true);g.landRemaining=0;g.reserve=[null,null,null];g.add('spring',3,1,2);g.add('bubble',3,2,2);await load(g);
 await p.locator('[data-cell="1,2"]').tap();await p.waitForTimeout(150);const button=p.locator('[data-action=fusion-recipe]');assert.equal(await button.textContent(),width===320?'Fuse':'融合');await act('fusion-recipe');assert.equal(await p.locator('.tw__recipe [data-machine="frost:4"]').count(),1);
 await p.screenshot({path:`${out}/${width}-selected-ready-frost.png`});assert.deepEqual(errors,[]);await ctx.close();
 }await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log('PASS',results.length,'touch fusion cases and selected ready route at both sizes');
}finally{await browser.close();}

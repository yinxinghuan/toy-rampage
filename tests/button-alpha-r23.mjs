import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:5194/',phase=process.env.QA_PASS||'after',out=`_qa/buttons-r23/${phase}`;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{for(const [width,height,lang]of [[390,844,'zh'],[320,568,'en']]){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.goto(base+'?lang='+lang);await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:60000});const act=async a=>{await p.locator(`[data-action="${a}"]`).tap();await p.clock.runFor(300);};
 await act('pause');await act('levels');await act('level-0');await act('confirm');await p.clock.runFor(500);await p.screenshot({path:`${out}/${width}-ready.png`});
 for(const sel of ['#main-action','.tw__refresh','[data-audio-toggle]','[data-action=bench-toggle]','[data-action=pause]']){const el=p.locator(sel),b=await el.boundingBox();assert(b.width>=44&&b.height>=44);const bg=await el.evaluate(e=>getComputedStyle(e).backgroundColor);assert.equal(bg,'rgba(0, 0, 0, 0)',sel+' has no rectangular CSS backing');}
 await p.locator('[data-audio-toggle]').tap();await act('bench-toggle');await p.screenshot({path:`${out}/${width}-land-sound-on.png`});
 await act('pause');await p.screenshot({path:`${out}/${width}-pause.png`});await p.locator('[data-action=resume]').focus();await p.screenshot({path:`${out}/${width}-focus.png`});await p.keyboard.press('Enter');assert.equal(await p.locator('.tw__overlay').isVisible(),false);assert.deepEqual(errors,[]);await ctx.close();
}
const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage();await p.goto(base+'pixel-lab/?lang=zh&section=scene&state=win&illustrations=cast');await p.waitForTimeout(2500);await p.locator('.px-game').screenshot({path:`${out}/390-review-win.png`});await ctx.close();
}finally{await browser.close();}
const ids=['gold-blank','lilac-blank','pause','start-zh','start-en'];
for(const id of ids){const {data,info}=await sharp(`src/pixel/images/r23/${id}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}),raw=await sharp(`src/pixel/images/r3/${id}.png`).ensureAlpha().raw().toBuffer();for(const n of [0,info.width-1,(info.height-1)*info.width,info.width*info.height-1])assert.equal(data[n*4+3],0);let changed=0;for(let n=0;n<data.length;n+=4){assert.equal(data[n],raw[n]);assert.equal(data[n+1],raw[n+1]);assert.equal(data[n+2],raw[n+2]);if(data[n+3]!==raw[n+3])changed++;}assert(changed>0);}
const width=920,height=ids.length*170,bg=Buffer.alloc(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const c=(Math.floor(x/12)+Math.floor(y/12))%2?[210,218,210]:[120,143,156];bg.set([...c,255],(y*width+x)*4);}const layers=[];for(let i=0;i<ids.length;i++)for(const [j,dir]of ['r3','r23'].entries())layers.push({input:`src/pixel/images/${dir}/${ids[i]}.png`,left:j*460+8,top:i*170+8});await sharp(bg,{raw:{width,height,channels:4}}).composite(layers).png().toFile(`${out}/alpha-comparison.png`);console.log('PASS buttons, hit areas, focus, CSS backing and source-preserving alpha');

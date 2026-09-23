import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base=process.env.QA_PIXEL_BASE||'http://127.0.0.1:5193/pixel-lab/',out=process.env.QA_IDLE_OUT||'_qa/idle-r15';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
const pixels=c=>{let h=2166136261;for(const v of c.getContext('2d').getImageData(0,0,c.width,c.height).data)h=Math.imul(h^v,16777619)>>>0;return{hash:h,dir:c.dataset.direction,frame:c.dataset.idleFrame,motion:c.dataset.motion,width:c.width,height:c.height};};
try{for(const[width,height,lang]of [[390,844,'zh'],[320,568,'en']]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+`?section=combat&lang=${lang}`);await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);await page.clock.install();
 const host=page.locator('.px-battle'),step=ms=>page.clock.runFor(ms),actor=page.locator('.px-battle-actor').first();
 assert.equal(await host.getAttribute('data-idle-assets-missing'),'');
 for(const kind of ['spring','rail','mortar','bubble','drum','fusion']){
  await page.locator(`[data-battle-weapon=${kind}]`).click();
  for(const rank of kind==='fusion'?[4]:[1,4]){
   if(kind!=='fusion')await page.locator(`[data-battle-rank="${rank}"]`).click();
   await step(700);const hashes=new Set(),frames=new Set(),dims=new Set(),motions=new Set();let snap=false;
   for(let i=0;i<24;i++){
    await step(200);const p=await actor.evaluate(pixels);if(!hashes.has(p.hash)&&width===390&&(rank===1||kind==='fusion')){const uri=await actor.evaluate(c=>c.toDataURL());await fs.writeFile(`${out}/${kind}-frame-${p.frame}.png`,Buffer.from(uri.split(',')[1],'base64'));}hashes.add(p.hash);frames.add(p.frame);dims.add(`${p.width},${p.height},${p.dir}`);motions.add(p.motion);
    if(p.motion==='idle'&&!snap){await page.locator('.px-game').screenshot({path:`${out}/${width}-${kind}-${rank}.png`});snap=true;}
   }
   assert(hashes.size>1,`${kind} tier ${rank} actual pixels must animate`);assert.equal(dims.size,1,'size and aim fixed');assert(motions.has('rest')&&motions.has('idle'));
   assert.equal(await host.getAttribute('data-stage'),'ready');assert.equal(await host.getAttribute('data-hp'),'100');assert.equal(await host.getAttribute('data-kills'),'0');assert.equal(await host.getAttribute('data-shots'),'{}');
   results.push({width,kind,rank,uniquePixels:hashes.size,idleFrames:[...frames]});
  }
 }
 await page.locator('[data-battle=idle]').click();await step(700);const stopped=await actor.evaluate(pixels);await step(5000);assert.equal((await actor.evaluate(pixels)).hash,stopped.hash);
 const elapsedBefore=Number(await host.getAttribute('data-elapsed'));await page.locator('[data-battle=idle]').click();assert.equal(await host.getAttribute('data-stage'),'ready');assert(Number(await host.getAttribute('data-elapsed'))>=elapsedBefore,'toggle cannot reset preparation time');
 await page.emulateMedia({reducedMotion:'reduce'});await step(20);const reduced=await actor.evaluate(pixels);await step(5000);assert.equal((await actor.evaluate(pixels)).hash,reduced.hash);await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('[data-battle-weapon=spring]').click();await page.locator('[data-battle-enemy=boss]').click();await page.locator('[data-battle=start]').click();
 let attacked=false;for(let i=0;i<80;i++){await step(40);const p=await actor.evaluate(pixels);if(p.motion==='attack'){assert.equal(p.frame,'-1','attack priority');attacked=true;break;}}assert(attacked);
 await page.locator('[data-battle=pause]:not([inert] *)').first().click();await step(50);const frozen=await actor.evaluate(pixels),elapsed=await host.getAttribute('data-elapsed');await step(1200);assert.equal((await actor.evaluate(pixels)).hash,frozen.hash);assert.equal(await host.getAttribute('data-elapsed'),elapsed);
 await page.locator('[data-battle=reset]:not([inert] *)').first().click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await page.locator('[data-action="section:aim"]').click();await page.locator('.px-aim[data-ready=true]').waitFor();assert.equal(await page.locator('.px-battle-actor').count(),0);await context.close();console.log(width+' idle checks passed');
 }
 const context=await browser.newContext(),page=await context.newPage();await page.route('**/idle-v1/rail/sheet.png',r=>r.abort());await page.goto(base+'?section=combat&lang=en');await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});assert.equal(await page.locator('.px-battle').getAttribute('data-idle-assets-missing'),'rail');assert.equal(await page.locator('[data-battle=start]').isDisabled(),false);await context.close();
 await fs.writeFile(out+'/results.json',JSON.stringify({base,results,attackPauseReducedOffCleanup:'passed',optionalAssetFailure:'passed',clock:'virtual clock; actual canvas pixel hashes, not only labels'},null,2));
}finally{await browser.close();}

import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const before=process.env.QA_BEFORE==='1',out=`_qa/lane-r16-${before?'before':'after'}`;await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{for(const [width,height]of [[390,844],[320,568],[1440,1000]]){
 const page=await browser.newPage({viewport:{width,height}});await page.goto('http://127.0.0.1:5193/pixel-lab/?section=combat&lang='+ (width===320?'en':'zh'),{waitUntil:'domcontentloaded'});await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);
 if(before)await page.addStyleTag({content:'.px-game--battle-lab{aspect-ratio:2/3.25!important}.px-game--battle-lab .px-game__header{height:12%!important}.px-game--battle-lab .px-hud{top:12%!important;height:4.7%!important}.px-game--battle-lab .px-world{top:17%!important;height:57.3%!important}.px-game--battle-lab .px-floor-beam{top:74.3%!important;height:1.4%!important}.px-game--battle-lab .px-bench{top:76%!important;height:11.5%!important}.px-game--battle-lab .px-actions{top:88%!important;height:9%!important}'});
 await page.evaluate(async before=>{
  const {BattleArt,loadBattleArt}=await import('/src/pixel/battle-art.js'),{createBattle}=await import('/src/pixel/battle-model.js');
  const original=document.querySelector('.px-battle'),host=original.cloneNode(true);original.hidden=true;original.after(host);host.querySelectorAll('.px-battle-fx,.px-battle-enemies').forEach(e=>e.remove());host.classList.add('qa-lane');
  const game=createBattle({weapon:'drum',rank:4});game.enemies=[];const r=new BattleArt(host,game,await loadBattleArt(),()=>true,()=>{});r.observer.disconnect();window.__lane=r;
  // Reconstruct only the old tight paint boundary for a matched before reference.
  if(before)for(const c of [r.canvas,r.enemyCanvas]){c.width=Math.round(r.width);c.height=Math.round(r.height);c.style.cssText=`left:0;top:0;width:${r.width}px;height:${r.height}px`;c.getContext('2d').setTransform(1,0,0,1,0,0);}
 },before);
 const checks=[];for(const kind of ['patrol','runner','swarm','armor','boss']){
  const check=await page.evaluate(kind=>{const r=window.__lane;r.game.enemies=[{id:99,kind,d:110,hp:100,maxHp:100,slowLeft:0}];r.game.elapsed+=.3;r.presentation.capture(r.game,r.time);r.draw(.3);
   const w=r.world.getBoundingClientRect(),hud=r.host.querySelector('.px-hud').getBoundingClientRect(),board=r.board.getBoundingClientRect(),size=r.width*({patrol:.105,runner:.115,swarm:.08,armor:.135,boss:.2}[kind]),top=w.top+r.point(0,24).y-size*.87-5;
   const canvas=r.enemyCanvas.getBoundingClientRect(),data=r.enemyCtx.getImageData(0,0,r.enemyCanvas.width,r.enemyCanvas.height).data;let ink=0;for(let i=3;i<data.length;i+=4)if(data[i])ink++;return{kind,ink,hudGap:top-hud.bottom,canvasGap:top-canvas.top,board:[board.width,board.height],world:[w.width,w.height]};},kind);
  assert(check.ink>20,'fixture must actually render the enemy');checks.push(check);await page.locator('.qa-lane .px-game').screenshot({path:`${out}/${width}-${kind}.png`});if(!before){assert(check.hudGap>=4,`${width} ${kind}: HUD gap ${check.hudGap}`);assert(check.canvasGap>=0,`${kind} clipped by canvas`);}
 }
 await page.evaluate(()=>{const r=window.__lane;r.game.enemies=Array.from({length:7},(_,i)=>({id:100+i,kind:i%2?'armor':'runner',d:65+i*24,hp:100,maxHp:100,slowLeft:0}));r.game.elapsed+=.3;r.presentation.capture(r.game,r.time);r.draw(.3);});await page.locator('.qa-lane .px-game').screenshot({path:`${out}/${width}-crowd.png`});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));results.push({width,height,checks});await page.close();
 }await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}

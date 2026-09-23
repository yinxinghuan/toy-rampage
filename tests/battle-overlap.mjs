// Deterministic QA fixture with production renderer/assets and an actual route pose.
// No production debug hooks or fabricated replacement art.
import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright'),sharp=require('sharp');
const out='_qa/overlap-r10';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{for(const width of[390,320]){const page=await browser.newPage({viewport:{width,height:844}});await page.goto('http://127.0.0.1:5193/pixel-lab/?section=combat&lang=zh');await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});
 const pose=await page.evaluate(async()=>{
  const {BattleArt,loadBattleArt}=await import('/src/pixel/battle-art.js'),{createBattle}=await import('/src/pixel/battle-model.js');
  const original=document.querySelector('.px-battle'),host=original.cloneNode(true);original.hidden=true;original.after(host);host.querySelectorAll('.px-battle-fx,.px-battle-enemies').forEach(e=>e.remove());host.classList.add('qa-overlap');
  const game=createBattle({weapon:'rail',rank:1,enemy:'armor',phase:'single',level:0});game.enemies=[{id:99,kind:'armor',d:101,hp:100,maxHp:100,slowLeft:0}];
  const r=new BattleArt(host,game,await loadBattleArt(),()=>true,()=>{});r.observer.disconnect();r.actors[0].dir=6;r.draw(0);window.__overlap=r;
  return{enemyDistance:101,direction:6};
 });
 const scene=page.locator('.qa-overlap .px-game');await scene.screenshot({path:`${out}/${width}-correct.png`});
 // Pixel-wise proof: where both layers have ink, correct composition equals the
 // weapon-only reference, not the deliberately reversed enemy-on-top image.
 await page.locator('.qa-overlap .px-battle-enemies').evaluate(e=>e.style.visibility='hidden');await scene.screenshot({path:`${out}/${width}-weapon-only.png`});
 await page.locator('.qa-overlap .px-battle-enemies').evaluate(e=>{e.style.visibility='';e.style.zIndex=7;});await scene.screenshot({path:`${out}/${width}-wrong-reference.png`});
 const buffers=await Promise.all(['correct','weapon-only','wrong-reference'].map(async name=>sharp(`${out}/${width}-${name}.png`).removeAlpha().raw().toBuffer()));let proven=0;
 for(let i=0;i<buffers[0].length;i+=3){const dist=(a,b)=>Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(dist(buffers[0],buffers[2])>40&&dist(buffers[0],buffers[1])<3)proven++;}
 assert(proven>4,`No actual overlap proven at ${width}: ${proven}`);results.push({width,...pose,occludedPixels:proven});await page.close();
 }await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}

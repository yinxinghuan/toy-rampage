// Controlled geometry fixture using production renderer and assets, not a playthrough.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{chromium}=require('playwright'),sharp=require('sharp');
const out='_qa/depth-r49';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const width of [390,320]){
 const p=await browser.newPage({viewport:{width,height:width===320?568:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5196/?lang=zh');await p.locator('.tw[data-renderer=pixel]').waitFor({timeout:120000});
 await p.evaluate(async()=>{
  const {BattleArt,loadBattleArt}=await import('/src/pixel/battle-art.js'),{Workshop,W,H}=await import('/src/engine.js');
  const original=document.querySelector('#app'),host=original.cloneNode(true);original.hidden=true;host.id='qa-depth';original.after(host);
  host.querySelectorAll('.px-battle-fx,.px-battle-enemies,.px-depth-enemy,.tw__guide,.tw__overlay').forEach(e=>e.remove());
  const g=new Workshop();g.reset('run');g.board.fill(true);g.landRemaining=0;g.units=[];g.add('rail',4,1,0);
  const r=new BattleArt(host,g,await loadBattleArt(new URL('/animation/',location.origin)),()=>true,()=>{});
  r.enemyScale=.75;r.point=(x,y)=>({x:x/W*r.width,y:y/H*r.height});r.geometry();
  window.depthQA={r,g};
 });
 for(const [name,c,row,d,dir,front]of [
  ['top',1,0,140,6,false],['bottom',1,6,808,2,true],
  ['side-back',3,3,468,0,false],['side-front',3,3,508,0,true]
 ]){
  const data=await p.evaluate(({c,row,d,dir})=>{
   const {r,g}=window.depthQA;g.units[0].c=c;g.units[0].r=row;
   g.enemies=[{id:999,kind:'armor',d,hp:100,maxHp:100,slowLeft:0}];r.build();r.presentation=new r.presentation.constructor(g);r.actors[0].fired=0;r.actors[0].dir=dir;r.draw(0);
   const gun=r.actors[0].machine,enemy=r.enemyActors.get(999);
   return{gunZ:Number(gun.style.zIndex),enemyZ:Number(enemy.style.zIndex),gunGround:Number(gun.dataset.ground),enemyGround:Number(enemy.dataset.ground)};
  },{c,row,d,dir});
  assert.equal(data.enemyZ>data.gunZ,front,name);
  const scene=p.locator('#qa-depth .tw__field'),file=n=>out+'/'+width+'-'+name+'-'+n+'.png';
  await scene.screenshot({path:file('correct')});
  await p.evaluate(front=>{const {r}=window.depthQA;(front?r.actors[0].machine:r.enemyActors.get(999)).style.visibility='hidden';},front);
  await scene.screenshot({path:file('foreground-only')});
  await p.evaluate(front=>{const {r}=window.depthQA;r.actors[0].machine.style.visibility='';const e=r.enemyActors.get(999);e.style.visibility='';e.style.zIndex=front?'1':'24000';},front);
  await scene.screenshot({path:file('wrong')});
  const buffers=await Promise.all(['correct','foreground-only','wrong'].map(n=>sharp(file(n)).removeAlpha().raw().toBuffer()));let pixels=0;
  for(let i=0;i<buffers[0].length;i+=3){const dist=(a,b)=>Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(dist(buffers[0],buffers[2])>40&&dist(buffers[0],buffers[1])<3)pixels++;}
  results.push({width,name,...data,overlapPixels:pixels});if(!name.startsWith('side'))assert(pixels>4,JSON.stringify(results.at(-1)));
  const stable=await p.evaluate(()=>{const {r}=window.depthQA;const z=r.actors[0].machine.style.zIndex;for(let dir=0;dir<8;dir++){r.actors[0].dir=dir;r.actors[0].fired=0;r.draw(0);if(r.actors[0].machine.style.zIndex!==z)return false;}return true;});assert(stable,'aim must not change depth');
 }
 await p.evaluate(()=>{const {g,r}=window.depthQA;g.enemies=[];r.presentation=new r.presentation.constructor(g);r.draw(0);});assert.equal(await p.locator('#qa-depth .px-depth-enemy').count(),0);assert.deepEqual(errors,[]);await p.close();
}await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}

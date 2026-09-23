import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const {chromium}=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('playwright');
const base='https://game.aiwaves.tech/0b7bc17b-d66e-4b51-9b7d-5a5c178dc4ae/',out='_qa/lane-r16-online';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{const run=promisify(execFile),get=async p=>(await run('curl',['-fsS','--connect-timeout','10','--max-time','40',base+p],{encoding:'buffer',maxBuffer:20*1024*1024})).stdout;
 const meta=JSON.parse((await get('review-build.json')).toString());assert.equal(meta.build,'toy-rampage-review-20260912-r16-lane-clearance');
 const html=(await get('pixel-lab/')).toString(),files=[...html.matchAll(/(?:src|href)="\.\.\/(assets\/[^\"]+)"/g)].map(m=>m[1]);assert(files.some(f=>f.endsWith('.js'))&&files.some(f=>f.endsWith('.css')));
 for(const p of files){const local=await fs.readFile('dist/'+p),remote=await get(p),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(local),hash(remote),p);}
 for(const [width,height,lang]of [[390,844,'zh'],[320,568,'en']]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'pixel-lab/?section=combat&lang='+lang,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.px-battle[data-ready=true]').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);await page.clock.install();
  await page.locator('[data-battle-weapon=bubble]').click();await page.locator('[data-battle-enemy=boss]').click();await page.locator('[data-battle=start]').click();await page.clock.runFor(2500);
  const gap=await page.evaluate(()=>{const c=document.querySelector('.px-battle-enemies'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let y=-1;for(let i=3;i<d.length;i+=4)if(d[i]>10){y=Math.floor((i/4)/c.width);break;}if(y<0)return -999;const rect=c.getBoundingClientRect();return rect.top+y*rect.height/c.height-document.querySelector('.px-hud').getBoundingClientRect().bottom;});
  assert(gap>=4,'actual visible enemy/HP ink must clear HUD: '+gap);await page.locator('.px-game').screenshot({path:`${out}/${width}-battle.png`});assert.deepEqual(errors,[]);results.push({width,height,lang,gap,status:'passed'});await context.close();
 }await fs.writeFile(out+'/results.json',JSON.stringify({build:meta.build,verifiedBundles:files,results},null,2));console.log(results);
}finally{await browser.close();}

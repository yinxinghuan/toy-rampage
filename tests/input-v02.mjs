import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const{chromium}=require('playwright'),b=await chromium.launch({headless:true});
try{
 const p=await b.newPage({viewport:{width:320,height:568}});await p.goto('http://127.0.0.1:5188/?lang=zh');await p.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 const part=p.locator('[data-source="tray"]'),box=await part.boundingBox();
 await p.mouse.move(box.x+20,box.y+20);await p.mouse.down();await p.mouse.move(180,280,{steps:8});await p.keyboard.press('Escape');await p.mouse.up();
 assert.equal(await part.count(),1);assert.equal(await p.locator('.tw').getAttribute('data-stage'),'place');
 await part.focus();await p.keyboard.press('Enter');await p.locator('[data-cell="0,0"]').focus();await p.keyboard.press('Enter');
 await p.waitForFunction(()=>document.querySelector('.tw').dataset.stage==='second');
 await part.focus();await p.keyboard.press('Space');await p.locator('[data-cell="0,0"]').focus();await p.keyboard.press('Enter');
 assert.equal(await p.locator('.tw').getAttribute('data-stage'),'expand');
 await p.keyboard.press('Escape');assert.equal(await p.locator('.tw__overlay').isVisible(),true);
 await p.getByRole('button',{name:'继续守夜',exact:true}).click();assert.equal(await p.locator('.tw__overlay').isVisible(),false);
 console.log('Escape drag cancellation + keyboard direct merge + pause/resume: PASS');
}finally{await b.close();}

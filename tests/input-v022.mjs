import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true}),p=await ctx.newPage();
 await p.goto((process.env.QA_BASE||'http://127.0.0.1:5191/')+'?lang=zh');
 await p.addStyleTag({content:'#alteru-guest-banner{display:none!important}'});
 await p.locator('[data-action="pause"]').tap();await p.locator('[data-action="reset-run"]').tap();await p.locator('[data-action="confirm"]').tap();
 const cdp=await ctx.newCDPSession(p),a=await p.locator('[data-source="shop:2"]').boundingBox(),b=await p.locator('[data-cell="1,0"]').boundingBox();
 await p.evaluate(()=>window.addEventListener('pointerdown',e=>window.lastPointer=e.pointerId));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:300,y:400}]});
 // Regression probe: a terminal event has newer coordinates than the last delivered move.
 await p.evaluate(({x,y})=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:window.lastPointer,clientX:x,clientY:y,bubbles:true})),{x:b.x+b.width/2,y:b.y+b.height/2});
 assert.equal(await p.locator('#coins').textContent(),'5');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await p.locator('#coins').textContent(),'5');
 assert.match(await p.locator('[data-cell="1,0"]').getAttribute('aria-label'),/爆米花炮/);
 console.log('PASS release-coordinate regression; exactly one purchase');
 await ctx.close();
}finally{await browser.close();}

import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle} from '../src/pixel/battle-model.js';
import {supportLinks} from '../src/pixel/battle-support.js';
test('support points only from strongest common-edge drum, never diagonal or to itself',()=>{
 const game=createBattle({weapon:'drum',rank:1,enemy:'patrol',phase:'single',level:0});
 const [drum,spring]=game.units;assert.deepEqual(supportLinks(game),[{sourceId:drum.id,targetId:spring.id,boost:game.drumBoost(spring)}]);
 spring.c=1;spring.r=1;assert.deepEqual(supportLinks(game),[]);
 spring.c=1;spring.r=0;
 game.units.push({...drum,id:987,c:2,rank:4});const links=supportLinks(game);
 assert.equal(links.length,1);assert.equal(links[0].sourceId,987);assert.equal(Math.round(links[0].boost*100),30);
 game.buffs.push('drum-boost');assert.equal(Math.round(supportLinks(game)[0].boost*100),40);
 game.units=[];assert.deepEqual(supportLinks(game),[]);
});

import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const ids=['spring','rail','mortar','bubble','drum','robot','title-zh','title-en'];
const dir=new URL('../src/pixel/images/sprites/',import.meta.url),out=new URL('../_qa/pixel-r4-alpha/',import.meta.url);
await fs.mkdir(out,{recursive:true});const stats=[],layers=[];
for(const [index,id] of ids.entries()){
 const file=new URL(id+'.png',dir),meta=await sharp(fileURLToPath(file)).metadata();
 assert(meta.hasAlpha,id+' alpha');const {data,info}=await sharp(fileURLToPath(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let clear=0,filled=0;for(let p=0;p<info.width*info.height;p++){const a=data[p*4+3];if(a===0)clear++;if(a>200)filled++;const x=p%info.width,y=Math.floor(p/info.width);if(x===0||y===0||x===info.width-1||y===info.height-1)assert.equal(a,0,id+' edge padding');}
 assert(clear>info.width*info.height*.12&&filled>100,id+' meaningful alpha');
 stats.push({id,width:info.width,height:info.height,bytes:(await fs.stat(file)).size,clearFraction:clear/(info.width*info.height)});
 if(index<6){const sprite=await sharp(fileURLToPath(file)).resize(212,212,{fit:'contain',kernel:'nearest',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();for(const [row,color]of [[0,'#332b50'],[1,'#f4e8d0']]){layers.push({input:await sharp({create:{width:240,height:240,channels:4,background:color}}).composite([{input:sprite,left:14,top:14}]).png().toBuffer(),left:index*240,top:row*240});}}
}
await sharp({create:{width:1440,height:480,channels:4,background:'#332b50'}}).composite(layers).png().toFile(fileURLToPath(new URL('dark-light-contact.png',out)));
await fs.writeFile(new URL('stats.json',out),JSON.stringify(stats,null,2));console.log(JSON.stringify(stats,null,2));

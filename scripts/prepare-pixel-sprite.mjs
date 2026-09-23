// Preserve generated alpha; normalize transparent margins into a stable sprite canvas.
// Local cutout/asset processing explicitly authorized by the user on 2026-09-11.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const [id,input]=process.argv.slice(2);
const sizes={spring:[128,256],rail:[384,128],mortar:[256,256],bubble:[128,256],drum:[128,128],robot:[96,96],'title-zh':[768,224],'title-en':[768,224]};
if(!sizes[id]||!input)throw Error('Usage: node scripts/prepare-pixel-sprite.mjs <id> <source.png>');
const root=path.resolve(import.meta.dirname||path.dirname(new URL(import.meta.url).pathname),'..');
const original=await fs.readFile(input),meta=await sharp(original).metadata();
const removeNeutral=process.argv.includes('--remove-neutral');
if(!meta.hasAlpha&&!removeNeutral)throw Error('Opaque output: requires explicit background removal, not accepted');
const {data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(removeNeutral){
 // Only edge-connected neutral checkerboard: dark violet outlines protect interior metal.
 const visited=new Uint8Array(info.width*info.height),queue=new Int32Array(visited.length);let head=0,tail=0;
 const push=p=>{if(visited[p])return;visited[p]=1;const i=p*4,r=data[i],g=data[i+1],b=data[i+2];if(Math.max(r,g,b)-Math.min(r,g,b)>18||Math.min(r,g,b)<45)return;queue[tail++]=p;};
 for(let x=0;x<info.width;x++){push(x);push((info.height-1)*info.width+x);}
 for(let y=0;y<info.height;y++){push(y*info.width);push(y*info.width+info.width-1);}
 while(head<tail){const p=queue[head++],x=p%info.width,y=Math.floor(p/info.width);data[p*4+3]=0;if(x>0)push(p-1);if(x+1<info.width)push(p+1);if(y>0)push(p-info.width);if(y+1<info.height)push(p+info.width);}
}
let x0=info.width,y0=info.height,x1=0,y1=0,clear=0,visible=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 const a=data[(y*info.width+x)*4+3];if(a===0)clear++;if(a>8){visible++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
}
if(clear<info.width*info.height*.1||visible<100)throw Error('Alpha not meaningfully transparent');
const [width,height]=sizes[id],padding=4;
const output=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(width-padding*2,height-padding*2,{fit:'contain',kernel:'nearest',background:{r:0,g:0,b:0,alpha:0}}).extend({top:padding,bottom:padding,left:padding,right:padding,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
const production=path.join(root,'_production/pixel-r4'),dest=path.join(root,'src/pixel/images/sprites');
await fs.mkdir(production,{recursive:true});await fs.mkdir(dest,{recursive:true});
await fs.writeFile(path.join(production,id+'-source.png'),original);
await fs.writeFile(path.join(dest,id+'.png'),output);
const record={id,input,width,height,anchor:[.5,1],originalSize:[info.width,info.height],sourceBounds:[x0,y0,x1-x0+1,y1-y0+1],transparentFraction:clear/(info.width*info.height),sourceSha256:createHash('sha256').update(original).digest('hex'),sha256:createHash('sha256').update(output).digest('hex'),processing:'Native generated alpha preserved; alpha bounds crop, nearest resize, 4px transparent margin. No background removal required.'};
if(removeNeutral)record.processing='User-authorized local edge-connected neutral background flood removal; interior colors protected by violet outline; alpha crop, nearest resize, 4px transparent margin.';
await fs.writeFile(path.join(production,id+'.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));

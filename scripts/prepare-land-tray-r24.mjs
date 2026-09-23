// Authorized local cutout of our generated expansion tray; preserve generator original.
import sharp from 'sharp';import fs from 'node:fs/promises';import {createHash}from'node:crypto';
const input=process.argv[2];if(!input)throw Error('Pass generated PNG path');
const original=await fs.readFile(input),{data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const visited=new Uint8Array(info.width*info.height),queue=new Int32Array(visited.length);let head=0,tail=0;
const push=p=>{if(visited[p])return;visited[p]=1;const i=p*4,c=[data[i],data[i+1],data[i+2]];if(Math.max(...c)-Math.min(...c)>26||Math.min(...c)<130)return;queue[tail++]=p;};
for(let x=0;x<info.width;x++){push(x);push((info.height-1)*info.width+x);}for(let y=0;y<info.height;y++){push(y*info.width);push(y*info.width+info.width-1);}
while(head<tail){const p=queue[head++],x=p%info.width,y=Math.floor(p/info.width);data[p*4+3]=0;if(x)push(p-1);if(x+1<info.width)push(p+1);if(y)push(p-info.width);if(y+1<info.height)push(p+info.width);}
let x0=info.width,y0=info.height,x1=0,y1=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){x0=Math.min(x,x0);y0=Math.min(y,y0);x1=Math.max(x,x1);y1=Math.max(y,y1);}
if(tail<info.width*info.height*.01)throw Error('No useful edge transparency');
const crop={left:x0,top:y0,width:x1-x0+1,height:y1-y0+1},output=await sharp(data,{raw:info}).extract(crop).resize(541,172,{fit:'fill',kernel:'nearest'}).extend({left:2,right:2,top:2,bottom:2,background:'#00000000'}).png().toBuffer();
const prod=new URL('../_production/pixel-r24/',import.meta.url),out=new URL('../src/pixel/images/r24/',import.meta.url);await fs.mkdir(prod,{recursive:true});await fs.mkdir(out,{recursive:true});await fs.writeFile(new URL('land-tray-original.png',prod),original);await fs.writeFile(new URL('land-tray.png',out),output);
await fs.writeFile(new URL('manifest.json',out),JSON.stringify({source:'_production/pixel-r24/land-tray-original.png',generator:'Built-in image_gen; existing r3 tray as reference/edit target',processing:'Authorized edge-connected neutral checker removal; alpha bounds crop, nearest resize to existing 545x176 tray footprint with 2px transparent margin. Original preserved.',crop,removed:tail,sourceSha256:createHash('sha256').update(original).digest('hex'),sha256:createHash('sha256').update(output).digest('hex')},null,2)+'\n');console.log({size:[545,176],removed:tail,crop});

// User-authorized local background removal and sprite-sheet slicing; originals preserved.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const input=process.argv[2];if(!input)throw Error('Pass generated sheet PNG');
const out='public/animation/spring-v1',raw='_production/pixel-r6';
await fs.mkdir(out,{recursive:true});await fs.mkdir(raw,{recursive:true});
const original=await fs.readFile(input);await fs.writeFile(`${raw}/spring-sheet-source.png`,original);
const meta=await sharp(original).metadata(),frames=[];
for(let n=0;n<8;n++){
 // Generated output did not honor equal rows: firing spark rises above halfway.
 // Reviewed separator is in the clear gap after the upper row, before the spark.
 const splitY=Math.round(meta.height*584/1287);
 const left=Math.round(n%4*meta.width/4),top=n<4?0:splitY;
 const width=Math.round((n%4+1)*meta.width/4)-left,height=n<4?splitY:meta.height-splitY;
 const {data,info}=await sharp(original).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(width*height),q=new Int32Array(width*height);let start=0,end=0;
 const visit=p=>{if(seen[p])return;seen[p]=1;const i=p*4,r=data[i],g=data[i+1],b=data[i+2];if(Math.max(r,g,b)-Math.min(r,g,b)>22||Math.min(r,g,b)<65)return;q[end++]=p;};
 for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x);}for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1);}
 while(start<end){const p=q[start++],x=p%width,y=Math.floor(p/width);data[p*4+3]=0;if(x)visit(p-1);if(x+1<width)visit(p+1);if(y)visit(p-width);if(y+1<height)visit(p+width);}
 let x0=width,y0=height,x1=-1,y1=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<0||end<width*height*.15)throw Error(`Frame ${n} has bad alpha`);
 frames.push({data,info,bounds:{left:x0,top:y0,width:x1-x0+1,height:y1-y0+1},crop:{left,top,width,height}});
}
// A SINGLE scale for every frame. Bottom/center anchor translation only.
const scale=Math.min(116/Math.max(...frames.map(f=>f.bounds.width)),308/Math.max(...frames.map(f=>f.bounds.height)));
const records=[],buffers=[];
for(let n=0;n<frames.length;n++){
 const f=frames[n],w=Math.round(f.bounds.width*scale),h=Math.round(f.bounds.height*scale);
 const sprite=await sharp(f.data,{raw:f.info}).extract(f.bounds).resize(w,h,{kernel:'nearest'}).png().toBuffer();
 const png=await sharp({create:{width:128,height:320,channels:4,background:'#00000000'}}).composite([{input:sprite,left:Math.round((128-w)/2),top:316-h}]).png().toBuffer();
 await fs.writeFile(`${out}/frame-${n}.png`,png);buffers.push(png);
 records.push({index:n,file:`frame-${n}.png`,sourceCrop:f.crop,sourceBounds:f.bounds,drawBounds:[Math.round((128-w)/2),316-h,w,h],sha256:createHash('sha256').update(png).digest('hex')});
}
const strip=await sharp({create:{width:128*8,height:320,channels:4,background:'#00000000'}}).composite(buffers.map((input,i)=>({input,left:i*128,top:0}))).png().toBuffer();await fs.writeFile(`${out}/sheet.png`,strip);
await sharp('src/pixel/images/sprites/spring.png').extend({top:64,bottom:0,left:0,right:0,background:'#00000000'}).png().toFile(`${out}/static.png`);
const manifest={id:'spring-v1',status:'experimental',generator:'built-in image_gen; reference-guided eight-frame sprite sheet',sourceSha256:createHash('sha256').update(original).digest('hex'),sourceSize:[meta.width,meta.height],frameSize:[128,320],logicalSize:[128,256],anchor:[64,316],scale,processing:'Edge-connected neutral background removal, shared nearest scale, bottom-center translation. No per-frame stretching, no base repainting.',idle:{frames:[0,1,2,3],frameMs:220},fire:{frames:[4,5,6,0],frameMs:100},excludedFromPlayback:[7],knownIssues:['Generated base star/screw details vary.','Generated last firing frame remains compressed; frame 0 is used for settle.','Reference fidelity and temporal style require user review.'],frames:records};
await fs.writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));

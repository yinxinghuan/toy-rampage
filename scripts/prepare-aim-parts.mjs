// User-authorized local cutout and slicing of newly generated game assets.
import {createRequire} from 'node:module';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const [id,input]=process.argv.slice(2);
const configs={mortar:{size:[256,320],logical:[256,256],pivot:[128,232],baseScale:.65,headScale:.61},bubble:{size:[128,320],logical:[128,256],pivot:[64,204],baseScale:.42,headScale:.40},rail:{size:[384,256],logical:[384,128],pivot:[192,180],baseScale:.91,headScale:.52,pivots:[[174,267],[157,264],[208,170],[242,264],[264,263],[248,281],[211,284],[163,281]]}};
if(!configs[id]||!input)throw Error('Usage: prepare-aim-parts.mjs mortar|bubble|rail source.png');
const cfg=configs[id],out=`public/animation/aim-v1/${id}`,raw='_production/pixel-r7';await fs.mkdir(out,{recursive:true});await fs.mkdir(raw,{recursive:true});
const original=await fs.readFile(input),meta=await sharp(original).metadata();await fs.writeFile(`${raw}/${id}-source.png`,original);
const records=[],parts=[];
for(let n=0;n<9;n++){
 const left=Math.round(n%3*meta.width/3),top=Math.round(Math.floor(n/3)*meta.height/3),width=Math.round((n%3+1)*meta.width/3)-left,height=Math.round((Math.floor(n/3)+1)*meta.height/3)-top;
 const {data,info}=await sharp(original).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Chroma-key only bright magenta; preserve violet outlines and coral paint.
 let removed=0;for(let p=0;p<data.length;p+=4){const[r,g,b]=data.subarray(p,p+3);if(r>65&&b>65&&Math.min(r,b)-g>50){data[p+3]=0;removed++;}}
 if(!meta.hasAlpha&&removed<width*height*.2)throw Error('Background not keyed');
 let x0=width,y0=height,x1=0,y1=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 let anchor=[(x0+x1)/2,y1-8*meta.height/1254];
 if(n&&cfg.pivots)anchor=cfg.pivots[n-1].map(v=>v*meta.width/1254);
 else if(n){let total=0,sum=0;for(let y=Math.round(y1-(y1-y0)*.06);y<=y1;y++)for(let x=x0;x<=x1;x++)if(data[(y*width+x)*4+3]>8){sum+=x;total++;}anchor[0]=sum/total;}
 const scale=(n?cfg.headScale:cfg.baseScale)*1254/meta.width,w=Math.round((x1-x0+1)*scale),h=Math.round((y1-y0+1)*scale);
 const x=n?Math.round(cfg.pivot[0]-(anchor[0]-x0)*scale):Math.round((cfg.size[0]-w)/2),y=n?Math.round(cfg.pivot[1]-(anchor[1]-y0)*scale):cfg.size[1]-4-h;
 if(x<0||y<0||x+w>cfg.size[0]||y+h>cfg.size[1])throw Error(`Out of canvas: ${id} frame ${n} [${x},${y},${w},${h}]`);
 const sprite=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(w,h,{kernel:'nearest'}).png().toBuffer();
 const png=await sharp({create:{width:cfg.size[0],height:cfg.size[1],channels:4,background:'#00000000'}}).composite([{input:sprite,left:x,top:y}]).png().toBuffer(),file=n?`head-${n-1}.png`:'base.png';
 await fs.writeFile(`${out}/${file}`,png);parts.push(png);records.push({file,sourceCrop:[left,top,width,height],sourceBounds:[x0,y0,x1-x0+1,y1-y0+1],sourcePivot:anchor,scale,drawBounds:[x,y,w,h],sha256:createHash('sha256').update(png).digest('hex')});
}
const assembled=[];for(let n=1;n<9;n++){const png=await sharp(parts[0]).composite([{input:parts[n]}]).png().toBuffer();assembled.push({input:png,left:((n-1)%4)*cfg.size[0],top:Math.floor((n-1)/4)*cfg.size[1]});}
await sharp({create:{width:cfg.size[0]*4,height:cfg.size[1]*2,channels:4,background:'#00000000'}}).composite(assembled).png().toFile(`${out}/directions.png`);
const manifest={id,status:'directional-art-trial',directions:['E','SE','S','SW','W','NW','N','NE'],...cfg,sourceSize:[meta.width,meta.height],sourceSha256:createHash('sha256').update(original).digest('hex'),processing:'Magenta chroma key; nearest-neighbor resize with one scale for all eight heads; fixed base and calibrated pivot; no per-frame rotation or skeleton.',parts:records};await fs.writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2));console.log(id,JSON.stringify(records.map(r=>({file:r.file,bounds:r.drawBounds}))));

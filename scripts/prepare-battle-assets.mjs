// Offline asset preparation. Preserve generated originals; never synthesize animation poses.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const [type,id,input]=process.argv.slice(2);
if(!['fx','enemy','upgrade','motion'].includes(type)||!id||!input)throw Error('Usage: prepare-battle-assets.mjs fx|enemy|upgrade|motion id input');
const original=await fs.readFile(input),meta=await sharp(original).metadata();
const cols=3,rows=type==='upgrade'?1:2,count=cols*rows;
const sizes={spring:[128,256],rail:[384,128],mortar:[256,256],bubble:[128,256],drum:[128,128]};
const size=type==='upgrade'?sizes[id]:type==='fx'?[128,128]:type==='motion'?[128,160]:[96,96];
const out=`public/animation/battle-v1/${type}/${id}`,raw='_production/pixel-r8';
await fs.mkdir(out,{recursive:true});await fs.mkdir(raw,{recursive:true});await fs.writeFile(`${raw}/${type}-${id}-source.png`,original);
const crops=[];
for(let n=0;n<count;n++){
 const left=Math.round(n%cols*meta.width/cols),top=Math.round(Math.floor(n/cols)*meta.height/rows),width=Math.round((n%cols+1)*meta.width/cols)-left,height=Math.round((Math.floor(n/cols)+1)*meta.height/rows)-top;
 const{data,info}=await sharp(original).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(!meta.hasAlpha)for(let p=0;p<data.length;p+=4){const[r,g,b]=data.subarray(p,p+3);if(r>65&&b>65&&Math.min(r,b)-g>50)data[p+3]=0;}
 let x0=width,y0=height,x1=-1,y1=-1,alpha=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=data[(y*width+x)*4+3];if(a<8)alpha++;if(a>200){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
 if(x1<0||alpha<width*height*.08)throw Error(`Missing transparency or empty frame: ${id}/${n}`);
 crops.push({data,info,crop:[left,top,width,height],bounds:[x0,y0,x1-x0+1,y1-y0+1]});
}
const scale=['enemy','motion'].includes(type)?Math.min((size[0]-10)/Math.max(...crops.map(c=>c.bounds[2])),(size[1]-10)/Math.max(...crops.map(c=>c.bounds[3]))):null;
const frames=[],records=[];
for(let n=0;n<count;n++){
 const c=crops[n];let png;
 if(['enemy','motion'].includes(type)){
  // Shared scale for six poses, feet anchored to y=92. Alpha halo stays inside each cell.
  const w=Math.round(c.info.width*scale),h=Math.round(c.info.height*scale),x=Math.round(size[0]/2-(c.bounds[0]+c.bounds[2]/2)*scale),y=Math.round(size[1]-4-(c.bounds[1]+c.bounds[3])*scale);
  const layer=await sharp(c.data,{raw:c.info}).resize(w,h,{kernel:'nearest'}).png().toBuffer();
  const clipped=await sharp(layer).extract({left:Math.max(0,-x),top:Math.max(0,-y),width:Math.min(w, size[0]-x)-Math.max(0,-x),height:Math.min(h,size[1]-y)-Math.max(0,-y)}).png().toBuffer();
  png=await sharp({create:{width:size[0],height:size[1],channels:4,background:'#00000000'}}).composite([{input:clipped,left:Math.max(0,x),top:Math.max(0,y)}]).png().toBuffer();
 }else png=await sharp(c.data,{raw:c.info}).resize(...size,{fit:'fill',kernel:'nearest'}).png().toBuffer();
 const name=`frame-${n}.png`;await fs.writeFile(`${out}/${name}`,png);frames.push(png);records.push({file:name,sourceCrop:c.crop,opaqueBounds:c.bounds,sha256:createHash('sha256').update(png).digest('hex')});
}
await sharp({create:{width:size[0]*cols,height:size[1]*rows,channels:4,background:'#00000000'}}).composite(frames.map((input,n)=>({input,left:n%cols*size[0],top:Math.floor(n/cols)*size[1]}))).png().toFile(`${out}/sheet.png`);
await fs.writeFile(`${out}/manifest.json`,JSON.stringify({type,id,size,count,scale,source:input,sourceSize:[meta.width,meta.height],sourceSha256:createHash('sha256').update(original).digest('hex'),processing:'Native alpha preserved, magenta keyed only if alpha missing; fixed cell VFX/attachments, common scale and feet alignment for enemy poses; nearest resize.',frames:records},null,2));console.log(type,id,count,size);

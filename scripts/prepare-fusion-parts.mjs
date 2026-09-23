// Crop the actual unequal generated sheet, not the requested ideal grid.
import {createRequire} from 'node:module';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const input=process.argv[2];if(!input)throw Error('Missing input');
const original=await fs.readFile(input),meta=await sharp(original).metadata(),out='public/animation/battle-v1/aim/fusion';await fs.mkdir(out,{recursive:true});await fs.mkdir('_production/pixel-r8',{recursive:true});await fs.writeFile('_production/pixel-r8/aim-fusion-source.png',original);
const cuts=[[0,0,1000,241],[1100,0,550,241],[1700,0,472,241],[250,241,500,241],[1100,241,550,241],[1700,241,472,241],[250,482,500,242],[1100,482,550,242],[1700,482,472,242]],parts=[],records=[];
for(let n=0;n<9;n++){
 const[cx,cy,cw,ch]=cuts[n],rect={left:Math.round(cx*meta.width/2172),top:Math.round(cy*meta.height/724),width:Math.round(cw*meta.width/2172),height:Math.round(ch*meta.height/724)};
 const{data,info}=await sharp(original).extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>200){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const scale=(n?.52:.45)*2172/meta.width,w=Math.round((x1-x0+1)*scale),h=Math.round((y1-y0+1)*scale);
 const left=Math.round(192-w/2),top=n?212-h:252-h;if(left<0||top<0||left+w>384)throw Error('Out of frame');
 const piece=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(w,h,{kernel:'nearest'}).png().toBuffer();const png=await sharp({create:{width:384,height:256,channels:4,background:'#00000000'}}).composite([{input:piece,left,top}]).png().toBuffer();
 const file=n?`head-${n-1}.png`:'base.png';await fs.writeFile(`${out}/${file}`,png);parts.push(png);records.push({file,sourceCrop:rect,bounds:[left,top,w,h],sha256:createHash('sha256').update(png).digest('hex')});
}
const composites=[];for(let n=1;n<=8;n++)composites.push({input:await sharp(parts[0]).composite([{input:parts[n]}]).png().toBuffer(),left:(n-1)%4*384,top:Math.floor((n-1)/4)*256});
await sharp(parts[0]).composite([{input:parts[7]}]).png().toFile(`${out}/static.png`);
await sharp({create:{width:1536,height:512,channels:4,background:'#00000000'}}).composite(composites).png().toFile(`${out}/directions.png`);
await fs.writeFile(`${out}/manifest.json`,JSON.stringify({id:'fusion',size:[384,256],logical:[384,128],pivot:[192,212],directions:['E','SE','S','SW','W','NW','N','NE'],source:input,sourceSha256:createHash('sha256').update(original).digest('hex'),parts:records},null,2));console.log('fusion parts',records.map(p=>p.bounds));

// Original generated images retained. Local cutout authorized by user, 2026-09-11.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'public/ui/dialog-v1'),archive=path.join(root,'_production/pixel-r11');
const sourceRoot='/Users/yin/.codex/generated_images/01a05c25-1216-7f62-a689-914a82db1253';
const sources={win:'exec-692411b7-1c65-4911-9142-0999d14886bd.png',lose:'exec-830e7156-7308-4c97-987a-868e2dd02610.png',upgrade:'exec-da9bdb3d-c16b-4dcf-9082-3bdfc980376f.png',panel:'exec-f2885530-4b36-4a37-8c9d-3eab94e78324.png',titles:'exec-331fedbf-2b5b-4df0-aa3c-c54364d6cc7b.png'};
await fs.mkdir(out,{recursive:true});await fs.mkdir(archive,{recursive:true});
const records=[];
async function cut(input,name,size){
 const meta=await sharp(input).metadata(),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const n=info.width*info.height,visited=new Uint8Array(n),queue=new Int32Array(n);
 // Neutral high-value checker only. Outlined colored artwork is protected.
 if(!meta.hasAlpha){
  for(let start=0;start<n;start++){
   if(visited[start])continue;
   let head=0,tail=0,edge=false,gray=0,white=0;
   const push=p=>{if(visited[p])return;visited[p]=1;const i=p*4,r=data[i],g=data[i+1],b=data[i+2];if(Math.max(r,g,b)-Math.min(r,g,b)>20||Math.min(r,g,b)<165)return;queue[tail++]=p;};
   push(start);
   while(head<tail){const p=queue[head++],x=p%info.width,y=Math.floor(p/info.width),v=data[p*4];edge||=x===0||y===0||x===info.width-1||y===info.height-1;if(v<223)gray++;if(v>237)white++;if(x)push(p-1);if(x<info.width-1)push(p+1);if(y)push(p-info.width);if(y<info.height-1)push(p+info.width);}
   // Interior holes are removed only if a connected region contains both checker tones.
   if(edge||(tail>100&&gray>tail*.18&&white>tail*.18))for(let j=0;j<tail;j++)data[queue[j]*4+3]=0;
  }
 }
 let x0=info.width,y0=info.height,x1=0,y1=0,clear=0;
 for(let p=0;p<n;p++){if(data[p*4+3]<8){clear++;continue;}const x=p%info.width,y=Math.floor(p/info.width);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(clear/n<.01)throw Error(name+' has no useful transparency');
 const output=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(...size,{fit:'contain',kernel:'nearest',background:'#00000000'}).png().toBuffer();
 await fs.writeFile(path.join(out,name+'.png'),output);
 records.push({name,sourceHasAlpha:meta.hasAlpha,size,sourceBounds:[x0,y0,x1-x0+1,y1-y0+1],transparentFraction:clear/n,sha256:createHash('sha256').update(output).digest('hex')});
}
for(const [id,file] of Object.entries(sources)){
 const input=await fs.readFile(path.join(sourceRoot,file));await fs.writeFile(path.join(archive,id+'-source.png'),input);
 if(id==='titles'){
  const {width,height}=await sharp(input).metadata();
  for(const [row,kind] of ['win','lose','upgrade','pause'].entries())for(const [col,lang]of ['zh','en'].entries()){
   const cell=await sharp(input).extract({left:col*width/2,top:row*height/4,width:width/2,height:height/4}).png().toBuffer();
   await cut(cell,'title-'+kind+'-'+lang,[640,190]);
  }
 }else await cut(input,id,id==='panel'?[512,512]:[720,360]);
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({version:'dialog-v1',method:'Built-in imagegen; native alpha preserved where present. Authorized neutral-checker cleanup, alpha crop and nearest resize.',sources,assets:records},null,2)+'\n');
console.log(JSON.stringify(records,null,2));

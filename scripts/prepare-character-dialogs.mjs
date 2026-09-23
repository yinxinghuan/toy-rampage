// r12 only. Original output is retained; local cutout was explicitly authorized.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'public/ui/dialog-character-v1'),archive=path.join(root,'_production/pixel-r12');
const sourceRoot='/Users/yin/.codex/generated_images/01a05c25-1216-7f62-a689-914a82db1253';
const sources={win:'exec-ad96713c-58db-42fe-99b5-87a7cec5a6f6.png',lose:'exec-25275639-5d32-4e12-afa2-17bffbd30c40.png',upgrade:'exec-7da3a672-cce8-42d0-86a0-bccfaa7cf2f9.png'};
await fs.mkdir(out,{recursive:true});await fs.mkdir(archive,{recursive:true});
const records=[];
for(const [name,file]of Object.entries(sources)){
 const input=await fs.readFile(path.join(sourceRoot,file));await fs.writeFile(path.join(archive,name+'-source.png'),input);
 const meta=await sharp(input).metadata(),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const n=info.width*info.height,visited=new Uint8Array(n),queue=new Int32Array(n);
 if(!meta.hasAlpha){
  for(let start=0;start<n;start++){
   if(visited[start])continue;let head=0,tail=0,edge=false,low=0,high=0;
   const push=p=>{if(visited[p])return;visited[p]=1;const i=p*4,r=data[i],g=data[i+1],b=data[i+2];if(Math.max(r,g,b)-Math.min(r,g,b)>22||Math.min(r,g,b)<60)return;queue[tail++]=p;};
   push(start);
   while(head<tail){const p=queue[head++],x=p%info.width,y=Math.floor(p/info.width),v=data[p*4];edge||=x===0||y===0||x===info.width-1||y===info.height-1;if(v<(name==='lose'?135:210))low++;if(v>(name==='lose'?160:238))high++;if(x)push(p-1);if(x<info.width-1)push(p+1);if(y)push(p-info.width);if(y<info.height-1)push(p+info.width);}
   // Dark checker variant needs a lower threshold than r11; colored outlines protect art.
   const sx=start%info.width,sy=Math.floor(start/info.width);
   // Reviewed enclosed negative spaces: winding-key loops and the defeat swirl.
   const reviewedHole=name==='lose'&&((sx>1330&&sx<1440&&sy>250&&sy<420)||(sx>1180&&sx<1320&&sy>65&&sy<220));
   if(edge||reviewedHole||(tail>100&&low>tail*.2&&high>tail*.2))for(let j=0;j<tail;j++)data[queue[j]*4+3]=0;
  }
 }
 let x0=info.width,y0=info.height,x1=0,y1=0,clear=0;
 for(let p=0;p<n;p++){if(data[p*4+3]<8){clear++;continue;}const x=p%info.width,y=Math.floor(p/info.width);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(clear/n<.1)throw Error(name+' lacks useful alpha');
 const output=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(704,344,{fit:'contain',kernel:'nearest',background:'#00000000'}).extend({left:8,right:8,top:8,bottom:8,background:'#00000000'}).png().toBuffer();
 await fs.writeFile(path.join(out,name+'.png'),output);
 records.push({name,size:[720,360],sourceHasAlpha:meta.hasAlpha,sourceBounds:[x0,y0,x1-x0+1,y1-y0+1],transparentFraction:clear/n,sha256:createHash('sha256').update(output).digest('hex')});
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({version:'dialog-character-v1',method:'Built-in imagegen: victory anchor then two identity-reference variants. Native alpha preserved; user-authorized neutral checker cleanup for opaque outputs. Nearest resize and 8px clear margin.',sources,assets:records},null,2)+'\n');
console.log(JSON.stringify(records,null,2));

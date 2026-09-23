// r14 additions only. Original output is retained; local cutout was explicitly authorized.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'public/ui/dialog-cast-v1'),archive=path.join(root,'_production/pixel-r14');
const sourceRoot='/Users/yin/.codex/generated_images/01a05c25-1216-7f62-a689-914a82db1253';
const sources={'win-bubble':'exec-ae208ff1-c8c0-4308-ab2c-1a892435844a.png','win-rail':'exec-163820d5-4788-4ad1-92bc-ca99da1d4e59.png','lose-drum':'exec-2470439c-3956-44a9-bd33-7213ed0b42a9.png','lose-scout':'exec-35277efc-6e80-4b3b-9764-a6d14683a1ab.png'};
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
   while(head<tail){const p=queue[head++],x=p%info.width,y=Math.floor(p/info.width),v=data[p*4];edge||=x===0||y===0||x===info.width-1||y===info.height-1;if(v<135)low++;if(v>160)high++;if(x)push(p-1);if(x<info.width-1)push(p+1);if(y)push(p-info.width);if(y<info.height-1)push(p+info.width);}
   // Dark checker variant needs a lower threshold than r11; colored outlines protect art.
   // Visually reviewed enclosed neutral holes in the beetle's winding key.
   const seeds=name==='lose-scout'?[[1150,110],[1350,238]]:[];
   const reviewedHole=seeds.some(([x,y])=>queue.subarray(0,tail).includes(y*info.width+x));
   if(edge||reviewedHole||(tail>100&&low>tail*.2&&high>tail*.2))for(let j=0;j<tail;j++)data[queue[j]*4+3]=0;
  }
 }
 // The enclosed checker is purple-tinted; a narrow reviewed region protects the key rim.
 if(name==='lose-scout')for(const [x0,y0,x1,y1]of [[1128,88,1175,139],[1331,216,1370,257]])for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const i=(y*info.width+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(Math.min(r,g,b)>=60&&Math.max(r,g,b)-Math.min(r,g,b)<=70)data[i+3]=0;
 }
 let x0=info.width,y0=info.height,x1=0,y1=0,clear=0;
 for(let p=0;p<n;p++){if(data[p*4+3]<8){clear++;continue;}const x=p%info.width,y=Math.floor(p/info.width);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(clear/n<.1)throw Error(name+' lacks useful alpha');
 const output=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(704,344,{fit:'contain',kernel:'nearest',background:'#00000000'}).extend({left:8,right:8,top:8,bottom:8,background:'#00000000'}).png().toBuffer();
 await fs.writeFile(path.join(out,name+'.png'),output);
 records.push({name,size:[720,360],sourceHasAlpha:meta.hasAlpha,sourceBounds:[x0,y0,x1-x0+1,y1-y0+1],transparentFraction:clear/n,sha256:createHash('sha256').update(output).digest('hex')});
}
await fs.writeFile(path.join(out,'manifest-r14.json'),JSON.stringify({version:'dialog-cast-v1',method:'Built-in imagegen: four additional protagonists using the approved r13 tinkerer as style reference only. Native alpha preserved; user-authorized neutral checker cleanup for opaque outputs. Nearest resize and 8px clear margin.',sources,assets:records},null,2)+'\n');
console.log(JSON.stringify(records,null,2));

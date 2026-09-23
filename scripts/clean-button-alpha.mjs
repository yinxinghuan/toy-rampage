// User-authorized local background removal. Original r3 images stay untouched.
// Hand-traced stepped outer silhouettes; never color-key the interior or lettering.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=new URL('../src/pixel/images/r3/',import.meta.url),out=new URL('../src/pixel/images/r23/',import.meta.url);
const gold=[[23,3],[420,3],[420,6],[427,6],[427,11],[433,11],[433,17],[438,17],[438,24],[441,24],[441,110],[438,110],[438,120],[432,120],[432,127],[425,127],[425,133],[418,133],[418,136],[24,136],[24,133],[17,133],[17,127],[11,127],[11,120],[6,120],[6,111],[3,111],[3,22],[7,22],[7,16],[12,16],[12,10],[18,10],[18,6],[23,6]];
const lilac=[[20,5],[174,5],[174,8],[181,8],[181,13],[187,13],[187,20],[192,20],[192,111],[189,111],[189,119],[184,119],[184,126],[179,126],[179,132],[174,132],[174,136],[20,136],[20,132],[14,132],[14,126],[9,126],[9,119],[5,119],[5,112],[2,112],[2,21],[6,21],[6,15],[11,15],[11,10],[16,10],[16,7],[20,7]];
const pause=[[15,3],[62,3],[62,6],[69,6],[69,10],[74,10],[74,64],[70,64],[70,70],[63,70],[63,73],[13,73],[13,70],[8,70],[8,65],[4,65],[4,12],[8,12],[8,7],[15,7]];
const specs={'gold-blank':gold,'lilac-blank':lilac,'pause':pause,'start-zh':gold,'start-en':gold};
function inside(x,y,p){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const[a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
await fs.mkdir(out,{recursive:true});const records=[];
for(const[id,polygon]of Object.entries(specs)){
 const raw=await fs.readFile(new URL(id+'.png',source)),{data,info}=await sharp(raw).ensureAlpha().raw().toBuffer({resolveWithObject:true});let removed=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(!inside(x+.5,y+.5,polygon)){const i=(y*info.width+x)*4;data[i+3]=0;removed++;}
 const png=await sharp(data,{raw:info}).png().toBuffer();await fs.writeFile(new URL(id+'.png',out),png);
 records.push({id,size:[info.width,info.height],polygon,removed,sourceSha256:createHash('sha256').update(raw).digest('hex'),sha256:createHash('sha256').update(png).digest('hex')});
}
await fs.writeFile(new URL('manifest.json',out),JSON.stringify({method:'Original RGB retained; explicit integer stepped outer alpha mask. No resizing, color replacement, interior keying or feathering. Original r3 sources preserved.',assets:records},null,2)+'\n');
console.log(records.map(({id,removed})=>({id,removed})));

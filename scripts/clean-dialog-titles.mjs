// User-authorized local alpha cleanup. Never alter r11 originals.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'public/ui/dialog-titles-v2'),qa=path.join(root,'_qa/titles-r13');
await fs.mkdir(out,{recursive:true});await fs.mkdir(qa,{recursive:true});
const records=[],composites=[];
for(const kind of ['win','lose','upgrade','pause'])for(const lang of ['zh','en']){
 const file=`title-${kind}-${lang}.png`,input=await fs.readFile(path.join(root,'public/ui/dialog-v1',file));
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true}),before=Buffer.from(data);let removed=0;
 // Only light matte pixels connected to already transparent exterior / letter holes.
 // Purple outlines are barriers; cream lettering inside those outlines is untouched.
 for(let pass=0;pass<4;pass++){
  const remove=[];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const p=y*info.width+x,i=p*4;if(!data[i+3])continue;
   const [r,g,b]=data.subarray(i,i+3);if(Math.min(r,g,b)<95||Math.max(r,g,b)-Math.min(r,g,b)>95)continue;
   if((x&&data[i-1]===0)||(x<info.width-1&&data[i+7]===0)||(y&&data[i-info.width*4+3]===0)||(y<info.height-1&&data[i+info.width*4+3]===0))remove.push(p);
  }
  for(const p of remove){data[p*4+3]=0;removed++;}if(!remove.length)break;
 }
 await sharp(data,{raw:info}).png().toFile(path.join(out,file));
 // Pixel-identical retained colors: no global desaturation, recolor, erosion, or white key.
 let retainedChanged=0;for(let i=0;i<data.length;i+=4)if(data[i+3]&&(!data.subarray(i,i+4).equals(before.subarray(i,i+4))))retainedChanged++;
 if(retainedChanged)throw Error('Retained color changed');
 records.push({file,removedMattePixels:removed,retainedChanged});
 for(const [col,buf]of [before,data].entries())for(const [bgIndex,bg]of ['#29203e','#eee7d7'].entries()){
  const tile=await sharp(buf,{raw:info}).flatten({background:bg}).png().toBuffer();
  composites.push({input:tile,left:(col*2+bgIndex)*640,top:(records.length-1)*190});
 }
}
await sharp({create:{width:2560,height:1520,channels:3,background:'#29203e'}}).composite(composites).png().toFile(path.join(qa,'all-titles-before-after.png'));
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({version:'dialog-titles-v2',source:'../dialog-v1/',method:'Four-pass connected light-matte edge cleanup; dark-purple outline barrier; retained RGB and alpha unchanged.',assets:records},null,2)+'\n');
console.log(records);

// Generated source alpha is genuine. Fixed, visually registered cells preserve temporal motion.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const root=path.resolve(import.meta.dirname,'..'),archive=path.join(root,'_production/pixel-r15');
const sourceRoot='/Users/yin/.codex/generated_images/01a05c25-1216-7f62-a689-914a82db1253';
const jobs={
 rail:{source:'exec-3c5eadac-939e-4b06-99d1-e120a58beb30.png',origins:[[154,223],[922,223],[154,680],[922,680]],size:[460,150]},
 bubble:{source:'exec-e30fd24f-4482-45b3-bd56-e6844b56c020.png',origins:[[290,260],[905,260],[290,750],[905,750]],size:[220,250]},
 mortar:{source:'exec-b429a964-991e-4557-8cee-de4dde9990e1.png',origins:[[264,132],[1032,132],[264,644],[1032,644]],size:[240,270]},
 fusion:{source:'exec-924527a5-9a47-48a1-b92e-82896c0e0b32.png',origins:[[294,180],[734,180],[294,740],[734,740]],size:[180,370]},
};
await fs.mkdir(archive,{recursive:true});const manifest=[];
for(const [kind,j] of Object.entries(jobs)){
 const input=await fs.readFile(path.join(sourceRoot,j.source));await fs.writeFile(path.join(archive,kind+'-source.png'),input);
 const meta=await sharp(input).metadata();if(!meta.hasAlpha)throw Error(kind+' requires alpha review');
 const out=path.join(root,'public/animation/idle-v1',kind);await fs.mkdir(out,{recursive:true});
 const frames=[];
 for(const [i,[left,top]]of j.origins.entries()){
  // Shared crop size and transform for all four frames; no independent trim/rescale.
  const frame=await sharp(input).extract({left,top,width:j.size[0],height:j.size[1]}).resize(56,56,{fit:'contain',kernel:'nearest',background:'#00000000'}).extend({left:4,right:4,top:4,bottom:4,background:'#00000000'}).png().toBuffer();
  frames.push(frame);await fs.writeFile(path.join(out,`frame-${i}.png`),frame);
 }
 await sharp({create:{width:128,height:128,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%2*64,top:Math.floor(i/2)*64}))).png().toFile(path.join(out,'sheet.png'));
 manifest.push({kind,...j,frameSize:[64,64],sheetSize:[128,128],frames:4,alpha:'original generated RGBA',registration:'fixed manually reviewed source cells; equal transform, no per-frame bounding box'});
}
await fs.writeFile(path.join(root,'public/animation/idle-v1/manifest.json'),JSON.stringify({version:'idle-v1',assets:manifest},null,2)+'\n');
console.log(manifest.map(({kind,frameSize})=>({kind,frameSize})));

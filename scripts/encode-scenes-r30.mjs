// Format-only, lossless delivery copies; retain the generated PNG originals.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
for(const name of ['assembly','foundry','power']){
 const stem=`src/pixel/images/r30/${name}`,source=await fs.readFile(stem+'.png');
 const result=await sharp(source).webp({lossless:true,effort:6}).toBuffer();
 const raw=async b=>sharp(b).ensureAlpha().raw().toBuffer();
 assert((await raw(source)).equals(await raw(result)),name+' RGBA mismatch');
 await fs.writeFile(stem+'.webp',result);
 console.log(name,source.length,'→',result.length,'bytes; RGBA exact');
}

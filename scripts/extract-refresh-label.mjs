// User-requested repair of the original Chinese raster label, not a new font rendering.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const source=fileURLToPath(new URL('../src/review/images/pixel.png',import.meta.url));
// Original ink occupies x706..808, y1378..1411. Gear starts y1419: explicitly excluded.
const crop={left:702,top:1374,width:110,height:42};
const {data,info}=await sharp(source).extract(crop).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let p=0;p<info.width*info.height;p++){const i=p*4;data[i+3]=data[i]<120&&data[i+1]<110&&data[i+2]<145?255:0;}
const out=new URL('../src/pixel/images/r3/refresh-label-zh-v2.png',import.meta.url);
await sharp(data,{raw:info}).png().toFile(fileURLToPath(out));
await fs.writeFile(new URL('../doc/refresh-label-crop.json',import.meta.url),JSON.stringify({source:'src/review/images/pixel.png',crop,oldCrop:{left:699,top:1373,width:113,height:47},issue:'Old crop includes first gear pixels at y1419 and excessive vertical padding.',method:'Original dark ink pixels retained unchanged; light panel removed to alpha, no generated or font-rendered replacement.',output:'src/pixel/images/r3/refresh-label-zh-v2.png'},null,2)+'\n');

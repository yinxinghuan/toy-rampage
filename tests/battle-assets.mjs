import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const root='public/animation/battle-v1',groups=[];
for(const[type,ids]of Object.entries({fx:['spring','rail','mortar','bubble','drum','fusion'],enemy:['patrol','runner','swarm','armor','boss'],upgrade:['spring','rail','mortar','bubble','drum'],motion:['drum']}))for(const id of ids)groups.push(`${type}/${id}`);
let frames=0;
for(const group of groups){const dir=path.join(root,group),manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json')));assert.equal(manifest.frames.length,manifest.count);
 for(const f of manifest.frames){const bytes=await fs.readFile(path.join(dir,f.file)),meta=await sharp(bytes).metadata();assert(meta.hasAlpha,group+' transparent alpha');assert.deepEqual([meta.width,meta.height],manifest.size);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});let empty=0,opaque=0;for(let i=3;i<data.length;i+=info.channels){if(data[i]===0)empty++;if(data[i]>200)opaque++;}assert(empty>0&&opaque>0,group+' meaningful transparent pixels');frames++;}
}
for(let i=0;i<8;i++){const meta=await sharp(path.join(root,`aim/fusion/head-${i}.png`)).metadata();assert(meta.hasAlpha);assert.deepEqual([meta.width,meta.height],[384,256]);}
console.log({groups:groups.length,frames,fusionDirections:8,status:'passed'});

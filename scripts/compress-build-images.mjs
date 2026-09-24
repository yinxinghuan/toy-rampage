import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const project=process.cwd(),target=path.resolve(project,process.argv[2]||'dist');
if(JSON.parse(await fs.readFile(path.join(project,'package.json'),'utf8')).name!=='toy-workshop-slice')throw Error('Run only in the Toy Workshop project.');
await fs.access(path.join(target,'index.html'));
const files=[];async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.isFile()&&e.name.endsWith('.png'))files.push(p);}}await walk(target);
const digest=buffer=>createHash('sha256').update(buffer).digest('hex'),results=[];let cursor=0;
await Promise.all(Array.from({length:2},async()=>{while(cursor<files.length){const file=files[cursor++],before=await fs.readFile(file),candidate=await sharp(before).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer();let after=before,verified=false;
 if(candidate.length<before.length){const [a,b]=await Promise.all([sharp(before).ensureAlpha().raw().toBuffer(),sharp(candidate).ensureAlpha().raw().toBuffer()]);if(!a.equals(b))throw Error('Pixel mismatch: '+file);after=candidate;verified=true;await fs.writeFile(file,after);}
 results.push({path:path.relative(target,file),before:before.length,after:after.length,saved:before.length-after.length,rgbaExact:verified||before===after,authoringSHA256:digest(before),transportSHA256:digest(after)});
}}));
results.sort((a,b)=>a.path.localeCompare(b.path));const before=results.reduce((n,r)=>n+r.before,0),after=results.reduce((n,r)=>n+r.after,0);
const folder=path.basename(target);
await fs.writeFile(path.join(target,'image-compression.json'),JSON.stringify({method:'lossless PNG re-encoding; unchanged decoded RGBA; authoring sources untouched',scope:`all PNG files in ${folder}, not the first-load budget`,before,after,saved:before-after,files:results},null,2));
console.log(`[images] ${files.length} PNGs: ${(before/1e6).toFixed(2)} MB → ${(after/1e6).toFixed(2)} MB; saved ${((1-after/before)*100).toFixed(1)}%; decoded RGBA identical.`);

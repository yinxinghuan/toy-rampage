// User-requested fine slicing of our selected generated concept, not third-party game art.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const sharp=createRequire('/Users/yin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('sharp');
const source=fileURLToPath(new URL('../src/review/images/pixel.png',import.meta.url));
const out=fileURLToPath(new URL('../src/pixel/images/r3/',import.meta.url));
await fs.mkdir(out,{recursive:true});
const cuts={
 'title-zh':[308,0,406,108],
 'hud-source':[207,105,613,82],
 'tile':[506,541,151,130],
 'tile-locked':[202,926,151,118],
 'entry':[120,173,123,101],
 'exit':[108,1025,130,117],
 'land':[675,1166,231,177],
 'tray-source':[113,1151,544,190],
 'start-zh':[207,1350,443,141],
 'refresh-source':[657,1350,195,141],
 'pause':[935,12,77,75],
 'floor-beam':[173,1138,740,21],
 'route-horizontal':[246,211,116,38],
 'route-vertical':[837,454,42,138],
 'route-corner-top':[828,210,51,59],
 'route-corner-bottom':[824,1052,55,56],
 'gear':[678,119,43,43],
 'heart':[230,120,44,43],
};
for(const [id,[left,top,width,height]] of Object.entries(cuts))await sharp(source).extract({left,top,width,height}).png().toFile(`${out}/${id}.png`);
const clean=fileURLToPath(new URL('../_production/pixel-r3/clean-skin.png',import.meta.url));
const cleanCuts={
 'hud':[207,105,613,82], 'tray':[113,1168,545,176],
 'gold-blank':[207,1350,443,141], 'lilac-blank':[657,1350,195,141],
 'panel':[319,0,387,107], 'tile-clean':[355,542,150,130],
 'route-vertical-clean':[837,270,42,776],
 'route-top-clean':[240,211,590,42], 'route-bottom-clean':[237,1065,588,42],
 'refresh-label-zh':[699,1373,113,47],
 'floor-beam':[173,1138,740,21],
 'route-corner-top':[828,210,51,59], 'route-corner-bottom':[824,1052,55,56],
};
for(const [id,[left,top,width,height]] of Object.entries(cleanCuts))await sharp(id==='refresh-label-zh'?source:clean).extract({left,top,width,height}).png().toFile(`${out}/${id}.png`);
for(const [id,w,h] of [['title-en',406,108],['start-en',443,141]])await sharp(fileURLToPath(new URL(`../_production/pixel-r3/${id}.png`,import.meta.url))).trim({background:'#ffffff',threshold:20}).resize(w,h,{fit:'fill',kernel:'nearest'}).png().toFile(`${out}/${id}.png`);
await fs.writeFile(`${out}/slices.json`,JSON.stringify({source:'src/review/images/pixel.png',sourceSize:[1024,1536],method:'User-requested fine raster slicing; original-color cuts, clean-source cuts, English variants trimmed and resized nearest',cuts,cleanSource:'_production/pixel-r3/clean-skin.png',cleanCuts},null,2)+'\n');
console.log(`Sliced ${Object.keys(cuts).length} original-color components`);

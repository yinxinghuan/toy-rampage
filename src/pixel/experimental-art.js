// Temporary component-built art for mechanics trials, using owned pixel assets.
// One drawing contract is shared by board, tray and drag; footprints never vary.
export const EXPERIMENT_SPECS={rivet:{size:[192,432],logical:[128,384]},arc:{size:[256,288],logical:[256,256]}};
Object.assign(EXPERIMENT_SPECS,{frost:{size:[256,320],logical:[256,256]},storm:{size:[384,320],logical:[384,256]}});
export function drawExperiment(ctx,kind,rank,art,dir=6,time=0,active=false){
 const spec=EXPERIMENT_SPECS[kind];if(!spec)return false;
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(kind==='frost'){
  ctx.drawImage(art.aim.mortar.base,0,0,256,320,0,32,256,288);
  for(const x of [12,172])ctx.drawImage(art.spring[0],x,122,72,180);
  ctx.drawImage(art.aim.bubble.base,0,0,128,320,64,0,128,288);
  ctx.drawImage(art.aim.bubble.heads[dir],0,0,128,320,64,0,128,288);
  ctx.fillStyle='#d7f8ff';for(const x of [40,200]){ctx.fillRect(x,236,12,36);ctx.fillRect(x-8,248,28,10);}
  if(active){ctx.fillStyle='#b4eff0';ctx.fillRect(90,72-Math.floor(time*4)%3*8,8,8);}
 }else if(kind==='storm'){
  ctx.drawImage(art.aim.rail.base,0,0,384,256,0,64,384,256);
  for(const x of [28,276]){
   ctx.drawImage(art.spring[0],x,24,80,224);
   ctx.fillStyle='#403552';ctx.fillRect(x-4,34,88,20);ctx.fillStyle='#d8bbff';ctx.fillRect(x,30,80,12);
  }
  ctx.drawImage(art.aim.rail.heads[dir],0,0,384,256,48,48,288,192);
  ctx.strokeStyle=active&&Math.floor(time*5)%2?'#eddbff':'#ad8ad2';ctx.lineWidth=6;
  ctx.beginPath();ctx.moveTo(68,62);ctx.lineTo(150,88);ctx.lineTo(228,62);ctx.lineTo(316,82);ctx.stroke();
 }else if(kind==='rivet'){
  ctx.drawImage(art.spring[active?Math.floor(time*5)%4:0],32,70,128,320);
  // Broad metal breech and narrow upright feed column distinguish the 1×3 gun.
  ctx.drawImage(art.aim.rail.base,0,0,384,256,28,292,136,90);
  ctx.drawImage(art.aim.rail.heads[dir],0,0,384,256,-48,90,288,192);
  for(let i=0;i<rank+1;i++){
   ctx.fillStyle='#30283e';ctx.fillRect(36,192+i*27,40,22);
   ctx.fillStyle='#dc9e68';ctx.fillRect(40,196+i*27,30,14);
   ctx.fillStyle='#fff0b2';ctx.fillRect(40,196+i*27,6,14);
  }
 }else{
  ctx.drawImage(art.aim.mortar.base,0,0,256,320,0,16,256,272);
  for(const x of [42,166]){
   ctx.drawImage(art.spring[0],x-12,56,72,180);
   ctx.fillStyle='#33243d';ctx.fillRect(x+12,44,20,67);ctx.fillRect(x-4,42,56,22);
   ctx.fillStyle='#b6a0db';ctx.fillRect(x+18,50,8,57);
   ctx.fillStyle='#665584';ctx.fillRect(x,38,48,22);
   ctx.fillStyle=active&&Math.floor(time*4)%2?'#fff0bb':'#a9d5ff';ctx.fillRect(x+4,38,40,10);
   for(let i=0;i<rank;i++){ctx.fillStyle='#d8bbff';ctx.fillRect(x,104+i*24,44,8);}
  }
  ctx.strokeStyle='#f3d895';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(58,214);ctx.lineTo(128,238);ctx.lineTo(198,214);ctx.stroke();
  const a=dir*Math.PI/4;ctx.fillStyle='#eff8ff';ctx.fillRect(124+Math.cos(a)*22,90+Math.sin(a)*22,8,8);
 }
 ctx.restore();return true;
}

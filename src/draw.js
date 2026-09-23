import { CELL, GX, GY, COLS, ROWS, FOOTPRINT, STATS, center, pointAt, PATH, W, H, adjacent, occupied } from './engine.js';
const ink='#213F3C', gold='#EABD58', colors={spring:gold,rail:'#659CA8',mortar:'#D87D60',fusion:'#E7B754'};
let appearance='open';
export function setAppearance(value){appearance=value==='block'?'block':'open';}
export function getAppearance(){return appearance;}
function rect(c,x,y,w,h,color,r=6,stroke){c.beginPath();c.roundRect(x,y,Math.max(0,w),Math.max(0,h),r);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.8;c.stroke();}}
function circle(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
function line(c,p,color,width=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function text(c,s,x,y,size=11,color=ink,align='center'){c.fillStyle=color;c.font=`700 ${size}px "PingFang SC",system-ui,sans-serif`;c.textAlign=align;c.fillText(s,x,y);}
function screw(c,x,y){circle(c,x,y,3,'#DCBD80');line(c,[[x-1.5,y+1.5],[x+1.5,y-1.5]],'#846134',1);}
export function machine(c,kind,rank,x,y,scale=1,recoil=0,reduced=false){
  if(kind.startsWith('plot')||['bubble','drum','rivet','arc'].includes(kind)){newMachine(c,kind,rank,x,y,scale);return;}
  if(appearance==='open'){openMachine(c,kind,rank,x,y,scale,recoil,reduced);return;}
  c.save();c.translate(x,y);c.scale(scale,scale);
  const[fw,fh]=FOOTPRINT[kind],w=fw*CELL-6,h=fh*CELL-6,paint=colors[kind],kick=reduced?0:recoil*28;
  rect(c,3,7,w,h,'#132A2940',10);rect(c,1,1,w,h,'#203C38',9);
  rect(c,3,1,w-4,h-6,paint,8);line(c,[[10,5],[w-8,5]],'#FFFFFF80',2);
  if(kind==='spring'){
    rect(c,8,58,32,30,'#74573B',5);for(let i=0;i<5;i++)line(c,[[11,60+i*5],[37,63+i*5]],'#F7D989',3);
    rect(c,8,15+kick,32,43,'#F0CA72',7,ink);
    rect(c,14,2+kick,20,25,'#52665B',4,ink);rect(c,10,2+kick,28,10,'#D4DDD0',3,ink);
    rect(c,15,4+kick,18,4,'#1D3938',2);
    rect(c,11,30+kick,26,12,'#F9EAD1',4,ink);circle(c,18,36+kick,2.5,ink);circle(c,30,36+kick,2.5,ink);
    line(c,[[19,48+kick],[25,51+kick],[30,48+kick]],ink,1.5);
    rect(c,5,65,5,21,'#DFE0C6',2);rect(c,38,65,5,21,'#DFE0C6',2);
  }else if(kind==='mortar'){
    for(const xx of[11,w-21])rect(c,xx,22,10,h-40,'#374C43',4);
    circle(c,w/2,h/2+6,34,'#924839');circle(c,w/2,h/2+1,33,paint);
    circle(c,w/2,h/2-8+kick,25,'#F1CCA3');circle(c,w/2,h/2-8+kick,18,'#293E39');circle(c,w/2-4,h/2-12+kick,9,'#52645A');
    rect(c,w/2-17,h-32,34,15,'#F7DCAA',5,ink);circle(c,w/2-7,h-25,2.5,ink);circle(c,w/2+7,h-25,2.5,ink);
    screw(c,13,13);screw(c,w-12,13);
  }else{
    for(const yy of[8,34]){rect(c,10,yy,w-20,8,'#263F3B',4);line(c,[[14,yy+2],[w-13,yy+2]],'#DAE4CD',2);}
    rect(c,24+kick,15,w-50,18,kind==='fusion'?'#D89838':'#C5DBD0',5,ink);
    for(let i=0;i<6;i++)rect(c,29+i*14,16,5,14,kind==='fusion'?'#F7D679':'#6D9796',2);
    rect(c,w-33,13,23,22,'#EEF0D6',5,ink);circle(c,w-21,24,6,ink);circle(c,w-21,24,3,'#A9DBDA');
    rect(c,7,17,18,15,paint,4,ink);circle(c,15,23,2,ink);
    if(kind==='fusion'){circle(c,79,24,14,'#F4D884');circle(c,79,24,8,'#D77C3E');}
  }
  rect(c,w-17,h-19,23,23,'#FFF2CF',7,ink);text(c,String(rank),w-5,h-2,15);
  c.restore();
}
function newMachine(c,kind,rank,x,y,scale){
  c.save();c.translate(x,y);c.scale(scale,scale);const[w,h]=FOOTPRINT[kind],ww=w*CELL-6,hh=h*CELL-6;
  if(kind.startsWith('plot')){
    for(const[i,j]of occupied({kind,c:0,r:0})){rect(c,i*CELL+2,j*CELL+2,CELL-5,CELL-5,'#A3BC83',5,ink);line(c,[[i*CELL+18,j*CELL+26],[i*CELL+34,j*CELL+26]],ink,2);line(c,[[i*CELL+26,j*CELL+18],[i*CELL+26,j*CELL+34]],ink,2);}text(c,'+'+rank,ww-10,hh-5,12);c.restore();return;
  }
  rect(c,1,1,ww,hh,appearance==='block'?(kind==='bubble'?'#74B9AE':'#A597BE'):'#132A2918',5);
  if(kind==='rivet'){
    rect(c,17,8,15,hh-22,'#a78062',4,ink);rect(c,10,8,29,28,'#c3c8bd',4,ink);
    for(let i=0;i<rank+2;i++)rect(c,7,48+i*17,24,9,'#EABD58',2,ink);
  }else if(kind==='arc'){
    for(const xx of[20,ww-30]){rect(c,xx,20,14,hh-35,'#756299',4,ink);for(let i=0;i<rank+2;i++)rect(c,xx-4,29+i*11,22,5,'#bce1ed',1);circle(c,xx+7,18,10,'#dfd2ff');}
    line(c,[[27,hh-13],[ww/2,hh-5],[ww-23,hh-13]],'#EABD58',3);
  }else if(kind==='bubble'){
    for(const xx of[10,30]){rect(c,xx,40,11,43,'#8CD5C3',5,ink);line(c,[[xx+3,48],[xx+3,70]],'#DBF6DC',2);circle(c,xx+5,88,5,ink);}
    rect(c,12,16,26,31,'#74B9AE',8,ink);circle(c,25,13,12,ink);circle(c,25,13,8,'#C2F0DF');circle(c,25,13,5,'#648F89');
    circle(c,17,32,2,ink);circle(c,31,32,2,ink);line(c,[[16,54],[36,54]],ink,3);
  }else{
    for(const xx of[12,36])line(c,[[xx,32],[xx,44]],ink,4);
    circle(c,24,25,20,ink);circle(c,24,23,17,'#A597BE');circle(c,24,21,12,'#E8DACA');
    line(c,[[7,6],[26,22]],ink,3);line(c,[[40,6],[25,22]],ink,3);circle(c,7,6,4,'#D8B977');circle(c,40,6,4,'#D8B977');
  }
  rect(c,ww-17,hh-19,23,23,'#FFF2CF',7,ink);text(c,String(rank),ww-5,hh-2,15);c.restore();
}
function openMachine(c,kind,rank,x,y,scale,recoil,reduced){
  c.save();c.translate(x,y);c.scale(scale,scale);
  const[fw,fh]=FOOTPRINT[kind],w=fw*CELL-6,h=fh*CELL-6,paint=colors[kind],kick=reduced?0:recoil*28;
  // Empty-looking gaps are still occupied: quiet ground tint and corner brackets.
  rect(c,1,1,w,h,'#132A2918',5);
  for(const[sx,sy,dx,dy]of[[2,2,1,1],[w-1,2,-1,1],[2,h-1,1,-1],[w-1,h-1,-1,-1]])line(c,[[sx+dx*7,sy],[sx,sy],[sx,sy+dy*7]],'#ACC2AE70',1);
  if(kind==='spring'){
    circle(c,24,84,12,'#132A2945');
    line(c,[[24,48],[24,91]],'#243E38',5);
    for(let i=0;i<6;i++)line(c,[[16,53+i*5],[32,55+i*5],[16,58+i*5]],'#F7D989',2.5);
    for(const xx of[9,30])rect(c,xx,88,10,8,'#547166',3,ink);
    rect(c,12,16+kick,25,31,paint,9,ink);
    rect(c,17,3+kick,15,24,'#71887B',4,ink);rect(c,13,2+kick,23,10,'#D4DDD0',4,ink);
    rect(c,17,4+kick,15,4,ink,2);rect(c,14,29+kick,21,10,'#FFF0CC',4,ink);
    circle(c,20,34+kick,2,ink);circle(c,29,34+kick,2,ink);
    for(const xx of[7,38])circle(c,xx,45,4,'#C49B44');
    line(c,[[17,20+kick],[20,18+kick],[32,18+kick]],'#FFF0C080',1.5);
  }else if(kind==='mortar'){
    const cx=w/2,cy=h/2;
    for(const[dx,dy]of[[-1,-1],[1,-1],[-1,1],[1,1]]){line(c,[[cx+dx*17,cy+dy*17],[cx+dx*35,cy+dy*34]],ink,9);line(c,[[cx+dx*20,cy+dy*20],[cx+dx*35,cy+dy*34]],'#779082',5);circle(c,cx+dx*35,cy+dy*34,6,paint);}
    circle(c,cx+2,cy+6,29,'#132A2955');circle(c,cx,cy,27,paint);circle(c,cx,cy-5+kick,22,'#F1CCA3');circle(c,cx,cy-5+kick,15,ink);circle(c,cx-3,cy-9+kick,7,'#52645A');
    rect(c,cx-13,cy+19,26,12,'#F7DCAA',5,ink);circle(c,cx-5,cy+25,2,ink);circle(c,cx+5,cy+25,2,ink);
  }else{
    for(const xx of[21,w-24])for(const yy of[9,35])circle(c,xx,yy,6,ink);
    for(const yy of[12,33]){line(c,[[10,yy],[w-7,yy]],'#243E38',7);line(c,[[12,yy-1],[w-9,yy-1]],paint,3);line(c,[[13,yy-2],[w-10,yy-2]],'#C8E1CB',1);}
    for(const xx of[15,44,112,141])line(c,[[xx,14],[xx,31]],'#778F7F',2);
    rect(c,53+kick,15,43,16,kind==='fusion'?'#D89838':paint,6,ink);
    rect(c,90+kick,18,35,9,'#DCE8D1',4,ink);circle(c,125+kick,22,5,ink);
    rect(c,58+kick,17,14,10,'#DDEAD6',3);circle(c,65+kick,22,2,ink);
    for(let i=0;i<3;i++)line(c,[[77+i*5+kick,18],[77+i*5+kick,27]],'#FFFFFF90',2);
    if(kind==='fusion'){for(const xx of[31,40]){circle(c,xx,23,10,'#EABD58');circle(c,xx,23,5,'#D77C3E');}line(c,[[21,23],[51,23]],'#FFF0BC',2);}
  }
  rect(c,w-17,h-19,23,23,'#FFF2CF',7,ink);text(c,String(rank),w-5,h-2,15);c.restore();
}
export function drawTray(canvas,kind,rank){
  canvas.width=240;canvas.height=136;const c=canvas.getContext('2d');c.scale(2,2);
  const[w,h]=FOOTPRINT[kind],s=Math.min(112/(w*CELL),61/(h*CELL));machine(c,kind,rank,(120-w*CELL*s)/2,2,s);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)rect(c,4+x*6,62-h*6+y*6,5,5,'#315449',1);
}
export function drawDrag(canvas,kind,rank,scale){
  const[w,h]=FOOTPRINT[kind],dpr=Math.min(devicePixelRatio||1,2),width=w*CELL*scale,height=h*CELL*scale;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';
  const c=canvas.getContext('2d');c.setTransform(scale*dpr,0,0,scale*dpr,0,0);c.globalAlpha=.8;
  if(appearance==='open')for(let r=0;r<h;r++)for(let col=0;col<w;col++)rect(c,col*CELL+2,r*CELL+2,CELL-4,CELL-4,'#F5E3B52A',5,'#E7D6A9');
  machine(c,kind,rank,2,2);
}
export function draw(canvas,g,selection,hover,reduced,guideTarget){
  const c=canvas.getContext('2d'),dpr=Math.min(devicePixelRatio||1,2),size=Math.round(canvas.clientWidth*dpr);
  if(canvas.width!==size){canvas.width=size;canvas.height=Math.round(size*H/W);}
  c.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);c.clearRect(0,0,W,H);
  rect(c,0,0,W,H,'#AD7847',16);rect(c,0,0,W,H-6,'#D8AD70',16);
  for(let i=0;i<8;i++){line(c,[[1,i*43+10],[W-1,i*43+10]],'#BE915D',1);line(c,[[i*47,2],[i*47+24,7]],'#ECD09B',1);}
  line(c,PATH,'#9F744B',30);line(c,PATH,'#ECD2A1',24);
  c.setLineDash([2,10]);line(c,PATH,'#B58E5A',1.5);c.setLineDash([]);
  for(const[x,y,angle]of[[170,24,0],[334,177,Math.PI/2],[190,346,Math.PI]]){c.save();c.translate(x,y);c.rotate(angle);line(c,[[-5,-5],[0,0],[-5,5]],'#9F7849',2);c.restore();}
  // The route explains itself: red entry gate, directional motion, heart-marked goal.
  for(const yy of[12,33])rect(c,17,yy,18,4,'#AA5140',2);
  if(!reduced)for(let i=0;i<3;i++){const d=(g.elapsed*35+i*290)%850,[x,y]=pointAt(d),[nx,ny]=pointAt(d+2);c.save();c.translate(x,y);c.rotate(Math.atan2(ny-y,nx-x));line(c,[[-4,-3],[0,0],[-4,3]],'#B4844B',2);c.restore();}
  rect(c,GX-7,GY-7,CELL*COLS+14,CELL*ROWS+14,'#A17141',9);
  rect(c,GX-5,GY-7,CELL*COLS+10,CELL*ROWS+10,'#244A42',8);
  for(let r=0;r<ROWS;r++)for(let col=0;col<COLS;col++){
    const x=GX+col*CELL,y=GY+r*CELL,locked=!g.hasCell(col,r);
    rect(c,x+2,y+2,CELL-4,CELL-4,locked?'#344E42':'#547465',5,'#203F37');
    if(locked){c.save();c.setLineDash([3,5]);c.strokeStyle='#7C9784';c.lineWidth=1;c.strokeRect(x+5,y+5,CELL-10,CELL-10);c.restore();}
    if(locked){line(c,[[x+21,y+27],[x+33,y+27]],'#9EA68A',2);line(c,[[x+27,y+21],[x+27,y+33]],'#9EA68A',2);}
    else for(const dx of[12,42])for(const dy of[12,42]){circle(c,x+dx,y+dy,2.3,'#284B40');circle(c,x+dx,y+dy-.8,1.2,'#7F9880');}
  }
  if(typeof selection==='number'){const u=g.get(selection);if(u){const[x,y]=center(u);c.save();c.beginPath();c.rect(0,0,W,H);c.clip();c.fillStyle='#F5E7AB0D';c.strokeStyle='#EED99790';c.setLineDash([4,6]);c.lineWidth=1;c.beginPath();c.arc(x,y,STATS[u.kind].range,0,Math.PI*2);c.fill();c.stroke();c.restore();}}
  rect(c,9,332,38,26,'#93663D',4,ink);rect(c,6,326,44,10,'#DFAC57',3,ink);rect(c,22,326,10,12,'#F8DE9F',2,ink);
  c.save();c.translate(22,340);c.scale(.55,.55);c.beginPath();c.moveTo(12,5);c.bezierCurveTo(0,-4,-6,8,3,15);c.lineTo(12,23);c.lineTo(21,15);c.bezierCurveTo(30,8,24,-4,12,5);c.fillStyle='#F8DFA5';c.fill();c.restore();
  rect(c,10,363,40,5,'#735333',2);rect(c,10,363,40*g.hp/100,5,g.hp>40?'#AACC89':'#D4654B',2);
  for(const drum of g.units.filter(u=>u.kind==='drum'))for(const u of g.units.filter(u=>u.kind!=='drum'&&adjacent(drum,u))){const a=center(drum),b=center(u);line(c,[a,b],selection===drum.id?'#E6D7FB':'#BBA6D290',selection===drum.id?4:2);circle(c,b[0],b[1],4,'#E6D7FB');}
  for(const u of g.units){machine(c,u.kind,u.rank,GX+u.c*CELL+2,GY+u.r*CELL+2,1,u.recoil,reduced);
    if(selection===u.id){const[w,h]=FOOTPRINT[u.kind];c.strokeStyle='#BFE9E2';c.lineWidth=2;c.strokeRect(GX+u.c*CELL+1,GY+u.r*CELL+1,w*CELL-2,h*CELL-2);}
    if(g.partner(u.id)!==null){const[w]=FOOTPRINT[u.kind],x=GX+(u.c+w)*CELL-13,y=GY+u.r*CELL+14;circle(c,x,y,10,'#FFE5A0');line(c,[[x-5,y],[x,y-4],[x+5,y]],ink,1.6);line(c,[[x-5,y+5],[x,y+1],[x+5,y+5]],ink,1.6);}
  }
  const held=g.get(selection);
  if(held)for(const u of g.units)if(u.id!==selection&&u.kind===held.kind&&u.rank===held.rank&&u.rank<4)outline(c,u.kind,u.c,u.r,true);
  if(guideTarget&&!hover)outline(c,guideTarget.kind,guideTarget.c,guideTarget.r,true);
  if(hover&&!hover.reserve&&selection!==null){
    const p=g.preview(selection,hover.c,hover.r),u=g.get(selection);
    if(u){
      const col=p.c??hover.c,row=p.r??hover.r,[w,h]=FOOTPRINT[p.kind||u.kind];
      for(const[x,y]of occupied({kind:p.kind||u.kind,c:col,r:row}))if(x>=0&&x<COLS&&y>=0&&y<g.rows)rect(c,GX+x*CELL+3,GY+y*CELL+3,CELL-6,CELL-6,p.ok?'#FAE1A03A':'#E4766355',5);
      outline(c,p.kind||u.kind,col,row,p.ok);
      if(p.type==='swap')outline(c,p.other.kind,p.other.c,p.other.r,p.ok);
      if(p.ok&&(p.type==='merge'||p.type==='fusion')){
        const x=GX+col*CELL+w*CELL/2,y=GY+row*CELL+h*CELL/2;
        rect(c,x-17,y-18,34,36,'#FFF0C2',9,ink);text(c,p.type==='fusion'?'4':String(u.rank+1),x,y+10,22);
        line(c,[[x-6,y-9],[x,y-14],[x+6,y-9]],ink,2);
      }
    }
  }
  for(const e of g.enemies){
    const[x,y]=pointAt(e.d),s=e.kind==='boss'?1.3:e.kind==='runner'?.85:1,bob=reduced?0:Math.sin(g.elapsed*15+e.id)*1.2;
    c.save();c.translate(x,y);c.scale(s,s);
    if(e.slowLeft>0){c.beginPath();c.arc(0,0,23,0,Math.PI*2);c.fillStyle='#A5E7DA30';c.fill();c.strokeStyle='#C7F4E4';c.lineWidth=2;c.stroke();}
    circle(c,0,10,14,'#593D3025');
    for(const xx of[-9,9]){circle(c,xx,7,5,'#433C32');circle(c,xx,7,2,'#DEB572');}
    rect(c,-13,-12+bob,26,22,e.flash?'#FFF0BB':e.kind==='armor'?'#76877C':'#B84F3F',7,'#6E3C31');
    if(e.kind==='armor'||e.kind==='boss'){rect(c,-14,-15+bob,28,9,e.kind==='boss'?'#D3A344':'#B2B6A0',4,ink);screw(c,0,-11+bob);}
    rect(c,-10,-5+bob,20,8,'#EEDAB1',3);circle(c,-5,-1+bob,2,ink);circle(c,5,-1+bob,2,ink);
    line(c,[[0,-12+bob],[0,-17+bob],[6,-17+bob],[6,-12+bob]],'#6E3C31',2);
    rect(c,-14,16,28,4,'#685A3D',2);rect(c,-14,16,Math.max(0,28*e.hp/e.maxHp),4,'#F8E6A8',2);c.restore();
  }
  for(const e of g.effects){
    c.globalAlpha=reduced?.7:Math.min(1,e.life/e.max*2);
    if(e.type==='expand'){
      for(const[x,y]of e.tiles||[])rect(c,GX+x*CELL+2,GY+y*CELL+2,CELL-4,CELL-4,'#FFE6A077',5,'#FFE5A0');
    }
    else if(e.type==='leak'){rect(c,6,326,45,34,'#DA6B4B66',5);text(c,'−'+e.damage,e.x,e.y-20-(reduced?0:(1-e.life/e.max)*18),17,'#8E2C25');}
    else if(e.type==='shot'){line(c,[[e.x,e.y],[e.tx,e.ty]],e.bubble?'#AFF0DB':e.mortar?'#EAB68B':e.rail?'#DAF6E5':'#FFE694',e.rail?3:2);circle(c,e.tx,e.ty,4,'#FFF2C9');}
    else{
      const radius=reduced?25:(1-e.life/e.max)*(e.type==='blast'?(e.radius??48):43)+5;
      c.beginPath();c.arc(e.x,e.y,radius,0,Math.PI*2);c.strokeStyle='#FFE4A0';c.lineWidth=e.type==='merge'?4:3;c.stroke();
      if(!reduced)for(let i=0;i<8;i++){const a=i*Math.PI/4;rect(c,e.x+Math.cos(a)*radius-2,e.y+Math.sin(a)*radius-2,4,4,'#FFF2C9',1);}
    }c.globalAlpha=1;
  }
  [[8,8],[352,8],[8,364],[352,364]].forEach(([x,y])=>screw(c,x,y));
}
function outline(c,kind,col,row,valid){
  if(kind.startsWith('plot')){c.save();c.strokeStyle=valid?'#FFE5A0':'#FFAD91';c.lineWidth=3;for(const[x,y]of occupied({kind,c:col,r:row}))c.strokeRect(GX+x*CELL+2,GY+y*CELL+2,CELL-4,CELL-4);c.restore();return;}
  const[w,h]=FOOTPRINT[kind];c.save();c.strokeStyle=valid?'#FFE5A0':'#FFAD91';c.lineWidth=3;c.setLineDash(valid?[8,4]:[2,4]);c.beginPath();c.roundRect(GX+col*CELL+2,GY+row*CELL+2,w*CELL-4,h*CELL-4,7);c.stroke();c.setLineDash([]);
  const x=GX+col*CELL+w*CELL-13,y=GY+row*CELL+13;circle(c,x,y,8,valid?'#F6D17B':'#A73531');line(c,valid?[[x-4,y],[x-1,y+3],[x+4,y-3]]:[[x-3,y-3],[x+3,y+3]],valid?ink:'#FFF2CF',2);if(!valid)line(c,[[x+3,y-3],[x-3,y+3]],'#FFF2CF',2);c.restore();
}

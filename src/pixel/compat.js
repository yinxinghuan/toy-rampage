import {tierAttachment} from './tier-art.js';
import {Workshop,FOOTPRINT,COLS,ROWS} from '../engine.js';
import {assetFor} from './assets.js';
import {pick} from './copy.js';
import './compat.css';

const tx=(zh,en)=>pick([zh,en]);
const landTile=new URL('./images/r3/tile.png',import.meta.url).href;
const landTiles=(n)=>Array.from({length:n},()=>`<img src="${landTile}" alt="" draggable="false">`).join('');
function landSupply(){
 const piece=game.get('land'),count=piece?(piece.kind==='plot1'?1:2):0;
 const label=piece?tx(`拖入${count}格地板，还可扩${game.landRemaining}格`,`Drag ${count} floor tiles; ${game.landRemaining} cells left`):tx('地板已铺满','Floor complete');
 return `<button class="px-land" data-exp-source="land" ${piece?'':'disabled'} aria-label="${label}"><span class="px-exp-land">${landTiles(count)}</span><span class="px-exp-land-allowance">${piece?tx(`余 <b>${game.landRemaining}</b> 格`,`<b>${game.landRemaining}</b> left`):tx('已铺满','Full')}</span></button>`;
}
const kinds=['spring','rail','mortar','bubble','drum'];
const game=new Workshop();
let selected=null,kind='spring',rank=1,preset=12;
const sprite=(id)=>`<img class="px-sprite" src="${assetFor(id).src}" alt="${pick(assetFor(id).name)}" draggable="false">`;
const machine=(u,cls='')=>`<div class="px-machine ${cls}" style="--x:${u.c||0};--y:${u.r||0};--w:${FOOTPRINT[u.kind][0]};--h:${FOOTPRINT[u.kind][1]};--identity:${assetFor(u.kind).color}" data-kind="${u.kind}">${sprite(u.kind)}${tierAttachment(u.kind,u.rank)}<span class="px-rank">${u.rank}</span></div>`;
function refill(){game.reserve=Array.from({length:3},()=>({kind,rank}));}
function reset(n=12){preset=n;selected=null;game.reset('run',0);game.units=[];game.board=Array.from({length:20},(_,i)=>i<n);game.landRemaining=20-n;refill();}
reset();

export function compatibility(scene){return `<section class="px-compat">
 <header class="px-experiment-intro"><span class="px-review-status">${tx('可操作实验 · 非战斗版','Interactive experiment · No combat')}</span><h2>${tx('扩得开，拿得准，放得稳','Expand, pick up, place precisely')}</h2><p>${tx('切换板块阶段，或把下方武器和地块拖上去。所有补给免费，只影响本实验。','Choose a board stage, or drag machines and land from the bench. Supplies are free and affect only this experiment.')}</p></header>
 <div class="px-exp-controls"><div class="px-exp-presets" role="group" aria-label="${tx('重置阵地阶段','Reset board stage')}">${[12,16,20].map(n=>`<button data-exp-preset="${n}" aria-pressed="${preset===n}">${n} / 20</button>`).join('')}</div>
 <label>${tx('补给种类','Supply type')}<select data-exp-kind>${kinds.map(k=>`<option value="${k}" ${kind===k?'selected':''}>${pick(assetFor(k).name)} · ${FOOTPRINT[k].join('×')}</option>`).join('')}</select></label>
 <label>${tx('阶位','Tier')}<select data-exp-rank>${[1,2].map(n=>`<option ${rank===n?'selected':''}>${n}</option>`).join('')}</select></label></div>
 <p class="px-exp-status" role="status">${tx('先拖入武器，再拖一件相同同阶的到一起。','Place a machine, then drag an identical tier onto it.')}</p>
 ${scene}
 <p class="px-exp-metrics"></p>
 <div class="px-exp-notes">
 <details open><summary>${tx('本轮怎么测','What to test')}</summary><ol><li>${tx('12 → 16 → 20格：棋盘、已有武器与进出口不跳位。切换预设会清空实验阵容。','12 → 16 → 20 cells: board, machines and gates keep their geometry. Presets clear the experiment lineup.')}</li><li>${tx('拿起后与落地同尺寸；试长条磁轨、2×2爆米花，以及小型发条鼓。','Dragged and placed sizes match. Try the long rail, 2×2 popcorn and small drum.')}</li><li>${tx('同种同阶可合并；异阶、未铺地和越界不能放，取消不丢武器。','Matching type and tier merge. Different tiers, unbuilt land and out-of-bounds drops preserve the source.')}</li><li>${tx('手机手指会挡住哪里？落点是否符合预期？真人理解与实体Safari仍待验证。','Does your finger hide the target? Does the drop match your intent? Human comprehension and device Safari remain unverified.')}</li></ol></details>
 <details><summary>${tx('原版证据与边界','Reference evidence and limits')}</summary><p>${tx('2026-09-09实机：首关4×3，L形三格/横向三格地块可拖入；后续观察过3×3起步。原版后期最大边界、扩格镜头变化及精确拖拽缩放仍待专项复验。本页12→20格和触屏抬高32px是我们的实验参数。','Observed on 2026-09-09: initial 4×3, draggable L-shaped and horizontal three-cell land; later a 3×3 start. Late-game limits, camera changes and exact drag scaling still need reference testing. The 12→20 range and 32px touch offset are our experiment settings.')}</p></details>
 <details><summary>${tx('更大地图与动画：下一步','Larger maps and animation: next')}</summary><p>${tx('当前窄屏每格约46px，直接塞第五列会降到约36.5px。更大容量先重排侧景或使用更大关卡布局，不在每次扩地时缩小整场。路线、射程和战斗尚未接入本实验；动画等布局通过后再测试，固定画布、锚点和占格，不逐帧重新裁边。','Narrow screens have roughly 46px cells; a fifth column in the same space would reduce this to 36.5px. Larger maps need side-scene reflow or a different level layout, not repeated zoom-out. Combat, pathing and ranges are not connected here. Animation follows layout approval, with fixed canvas, anchors and footprints.')}</p></details>
 <details><summary>${tx('已经锁定的视觉与素材','Accepted visuals and assets')}</summary><p>${tx('像素工坊与留白轮廓；五种装置和发条兵独立透明PNG；中英文图片标题；Jersey 10数字；换批图片字去底、修裁切、两行居中。组件与素材页同步当前版本。弹簧炮序列帧见动画实验，本页仍为静态；融合形态不在本实验内。','Pixel workshop, open silhouettes, five independent machine cutouts and one enemy, localized image titles, Jersey 10 digits, cleaned and centered image reroll label. Components and inventory reflect the current version. Spring frames are in the Animation tab; this test remains static, without fusion artwork.')}</p></details>
 </div></section>`;}

export function mountCompatibility(root,refreshButton){
 const host=root.querySelector('.px-compat');if(!host)return()=>{};
 const board=host.querySelector('.px-board'),bench=host.querySelector('.px-bench'),status=host.querySelector('.px-exp-status');
 const view=host.querySelector('.px-game');view.classList.add('px-game--experiment');
 view.querySelectorAll('.px-overlay,.px-enemy,.px-xp').forEach(e=>e.remove());
 view.querySelectorAll('[inert]').forEach(e=>e.inert=false);
 view.querySelectorAll('[data-action]').forEach(e=>e.removeAttribute('data-action'));
 const pause=view.querySelector('.px-game__header button');pause.disabled=true;pause.setAttribute('aria-label',tx('实验没有战斗','No combat in this experiment'));
 view.querySelector('.px-actions').innerHTML=`<button class="px-button px-button--gold" data-exp-reset>${tx('重置实验','Reset')}</button>${refreshButton('exp-refill',false,0)}`;
 const refillButton=view.querySelector('[data-action="exp-refill"]');refillButton.removeAttribute('data-action');refillButton.dataset.expRefill='';
 const ghost=document.createElement('div');ghost.className='px-exp-ghost';ghost.hidden=true;document.body.append(ghost);
 let drag=null;
 function say(zh,en){status.textContent=tx(zh,en);}
 function clearPreview(){board.querySelectorAll('.px-drop-ok,.px-drop-bad').forEach(e=>{e.classList.remove('px-drop-ok','px-drop-bad');e.removeAttribute('data-drop');});}
 function cancel(){drag=null;ghost.hidden=true;clearPreview();}
 function sync(){
  board.innerHTML=Array.from({length:20},(_,i)=>{const c=i%4,r=Math.floor(i/4),u=game.at(c,r);return `<button class="px-cell ${game.hasCell(c,r)?'':'px-cell--locked'} ${selected!==null&&u?.id===selected?'px-cell--selected':''}" data-exp-cell="${c},${r}" aria-label="${tx('格','Cell')} ${c+1},${r+1}${u?' · '+pick(assetFor(u.kind).name)+' '+u.rank:''}" data-open="${game.hasCell(c,r)}"></button>`;}).join('')+game.units.map(u=>machine(u)).join('');
  bench.innerHTML=game.reserve.map((u,i)=>`<button class="px-bench__slot ${selected==='reserve:'+i?'is-selected':''}" data-exp-source="reserve:${i}" ${u?'':'disabled'} aria-label="${u?pick(assetFor(u.kind).name)+' '+u.rank:tx('空槽','Empty slot')}">${u?sprite(u.kind)+`<span class="px-rank">${u.rank}</span>`:''}</button>`).join('')+landSupply();
  const nums=view.querySelectorAll('.px-hud b');nums[0].textContent='100';nums[1].textContent=game.board.filter(Boolean).length+'/20';nums[1].parentElement.setAttribute('aria-label',tx('已铺格数','Built cells'));nums[2].textContent='0';
  host.querySelectorAll('[data-exp-preset]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.expPreset)===preset));
  const b=board.getBoundingClientRect();host.querySelector('.px-exp-metrics').textContent=tx('实测格尺寸','Measured cell')+` ${ (b.width/4).toFixed(1)} × ${(b.height/5).toFixed(1)} px · `+tx('落地与拖影 1:1','Placed : dragged = 1:1');
 }
 function result(c,r){
  const preview=game.preview(selected,c,r);
  if(preview.type==='fusion'){say('融合造型尚未接入本实验，材料保留。','Fusion artwork is not connected here; materials preserved.');return;}
  const p=game.place(selected,c,r);
  if(p.ok){selected=null;game.effects=[];game.events=[];say(p.type==='expand'?'地板已安装，格子尺寸不变。':p.type==='merge'?'合并成功，阶位已提升。':'已放置，拖影与落地尺寸一致。',p.type==='expand'?'Land installed; cell size unchanged.':p.type==='merge'?'Merged; tier increased.':'Placed at the preview size.');}
  else {const reasons={differentRank:['同种但阶位不同，不能合并。','Same type, different tier; cannot merge.'],maxRank:['已到最高阶。','Already at maximum tier.'],lockedCell:['先在这里铺地板。','Build land here first.'],landOverlap:['地块不能覆盖已有地板。','Land cannot overlap built cells.'],landConnect:['地块需要连接已有地板。','Land must connect to the board.']};say(...(reasons[p.reason]||['这里放不下，来源已保留。','Cannot place here; source preserved.']));}
  sync();
 }
 function sourceAt(button){if(button.dataset.expSource)return{source:button.dataset.expSource,offsetC:0,offsetR:0};const[c,r]=button.dataset.expCell.split(',').map(Number),u=game.at(c,r);return u?{source:u.id,offsetC:c-u.c,offsetR:r-u.r}:null;}
 function down(e){const button=e.target.closest('[data-exp-source],[data-exp-cell]');if(!button||button.disabled||e.button!==0||drag)return;
  if(button.dataset.expCell&&selected!==null){const[c,r]=button.dataset.expCell.split(',').map(Number);if(game.at(c,r)?.id!==selected){result(c,r);return;}}
  const src=sourceAt(button);if(!src||!game.get(src.source))return;selected=src.source;
  const rect=board.getBoundingClientRect(),u=game.get(selected);
  const grabC=button.dataset.expCell?(e.clientX-rect.left)/(rect.width/4)-u.c:.5,grabR=button.dataset.expCell?(e.clientY-rect.top)/(rect.height/5)-u.r:.5;
  drag={...src,grabC,grabR,id:e.pointerId,x:e.clientX,y:e.clientY,touch:e.pointerType==='touch',moved:false};
  board.querySelectorAll('.px-cell--selected').forEach(b=>b.classList.remove('px-cell--selected'));button.classList.add('px-cell--selected');
  host.setPointerCapture(e.pointerId);
 }
 function move(e){if(!drag||e.pointerId!==drag.id)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(!drag.moved)return;
  const rect=board.getBoundingClientRect(),cw=rect.width/COLS,ch=rect.height/ROWS,u=game.get(selected);if(!u){cancel();return;}
  const y=e.clientY-(drag.touch?32:0),pc=Math.floor((e.clientX-rect.left)/cw),pr=Math.floor((y-rect.top)/ch),target=game.at(pc,pr);
  const c=target&&target.id!==selected?pc:Math.round((e.clientX-rect.left)/cw-drag.grabC),r=target&&target.id!==selected?pr:Math.round((y-rect.top)/ch-drag.grabR);
  drag.dest={c,r};const[w,h]=FOOTPRINT[u.kind],p=game.preview(selected,c,r),valid=p.ok&&p.type!=='fusion';
  ghost.hidden=false;ghost.style.cssText=`left:${e.clientX-drag.grabC*cw}px;top:${y-drag.grabR*ch}px;width:${w*cw}px;height:${h*ch}px;--cw:${cw}px;--ch:${ch}px;--pad:${getComputedStyle(view).getPropertyValue('--px-machine-pad')||'3px'}`;
  ghost.innerHTML=selected==='land'?`<div class="px-exp-land-ghost">${landTiles(w*h)}</div>`:machine(u,'px-exp-ghost-machine');
  clearPreview();const cells=p.type==='expand'?p.tiles:Array.from({length:w*h},(_,i)=>[(p.c??c)+i%w,(p.r??r)+Math.floor(i/w)]);
  for(const[x,z]of cells||[]){const el=board.querySelector(`[data-exp-cell="${x},${z}"]`);if(el){el.classList.add(valid?'px-drop-ok':'px-drop-bad');el.dataset.drop=valid?'+':'×';}}
 }
 function up(e){if(!drag||e.pointerId!==drag.id)return;move(e);const d=drag;cancel();if(d.moved&&d.dest)result(d.dest.c,d.dest.r);}
 function click(e){const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-exp-preset')){cancel();reset(Number(b.dataset.expPreset));sync();say('已重置实验阵地。','Experiment board reset.');}
  else if(b.hasAttribute('data-exp-reset')){cancel();reset(preset);sync();say('已重置实验阵地。','Experiment board reset.');}
  else if(b.hasAttribute('data-exp-refill')){cancel();selected=null;refill();sync();say('实验免费补充三件，不改变场上武器。','Three free experiment supplies; board unchanged.');}
  else if(e.detail===0&&(b.dataset.expCell||b.dataset.expSource)){if(b.dataset.expCell&&selected!==null){result(...b.dataset.expCell.split(',').map(Number));}else{selected=sourceAt(b)?.source??null;sync();}}
 }
 function change(e){cancel();selected=null;if(e.target.matches('[data-exp-kind]'))kind=e.target.value;if(e.target.matches('[data-exp-rank]'))rank=Number(e.target.value);refill();sync();}
 function interrupt(){cancel();selected=null;}
 function key(e){if(e.key==='Escape'){interrupt();sync();say('已取消，来源保留。','Cancelled; source preserved.');}}
 host.addEventListener('pointerdown',down);host.addEventListener('click',click);host.addEventListener('change',change);
 window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',interrupt);window.addEventListener('blur',interrupt);window.addEventListener('resize',interrupt);window.addEventListener('keydown',key);
 const resize=new ResizeObserver(()=>{cancel();const b=board.getBoundingClientRect();host.querySelector('.px-exp-metrics').textContent=tx('实测格尺寸','Measured cell')+` ${(b.width/4).toFixed(1)} × ${(b.height/5).toFixed(1)} px · 1:1`;});resize.observe(board);sync();
 return()=>{cancel();ghost.remove();resize.disconnect();for(const[type,fn]of [['pointermove',move],['pointerup',up],['pointercancel',interrupt],['blur',interrupt],['resize',interrupt],['keydown',key]])window.removeEventListener(type,fn);};
}

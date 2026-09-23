const dict={
numberCompare:['数字字体 · 点选看场景','Number fonts · Tap to preview'],
entrance:['入场口','Entrance'],exitGoal:['出口零件箱','Exit parts box'],
materialTitle:['已拆分的图片组件','Sliced image components'],materialHelp:['原色切片、独立背景、可伸缩空底和中英标题图。控件可以单独替换，数字保持实时；不是整屏截图覆盖。','Original-color slices, environment, scalable empty shells and localized title images. Components stay replaceable and numbers remain live, not baked into a screenshot.'],downloadMaterial:['下载素材','Download asset'],environmentMaterial:['工坊环境层','Workshop environment'],metalMaterial:['机械面板框','Metal panel frame'],goldMaterial:['金色主按钮','Gold action frame'],lilacMaterial:['紫色辅助按钮','Lilac action frame'],tileMaterial:['凹槽格板','Recessed tile'],
liveFrame:['HTML 实际界面','Live HTML interface'],conceptFrame:['已选方向 · 原效果图','Selected direction · Concept'],conceptAlt:['选中的像素工坊效果图','Selected pixel workshop concept'],
compareReference:['对照效果图','Compare concept'],environmentLayer:['工坊环境','Workshop layer'],placeholderLayer:['占格轮廓','Footprint guides'],
referenceNote:['参考图的格数与个别占位有偏差；实际界面保持 4×5，文字和控件均独立。','The concept has grid and footprint inconsistencies. The live UI keeps 4×5 cells and editable controls.'],
staticPendingNote:['五种装置与发条兵已接入独立透明素材。当前展示静态造型，尚未播放序列帧。','Five machines and a clockwork enemy use independent alpha sprites. Static artwork only; no sprite animation yet.'],
title:['玩具大暴走','Toy Rampage'],lab:['玩具大暴走 · 评审台','Toy Rampage · Review'],phase:['正在验证动态敌人、武器打击与升级外观','Testing animated enemies, weapon impacts and visual upgrades'],
scope:['r25 · 主试玩缩小标题、压缩弹窗并适配窗口高度；扩格按钮加大，换用青绿施工底板。保留透明按钮、切换托盘与像素手势。以下前序实验保留作对照，最新交互请打开完整试玩。','r25 · The full game has a smaller title, compact dialogs and height-aware layout, a larger expansion switch and a teal drafting tray. Transparent buttons, shared tray and pixel guidance remain. Earlier experiments below stay available for comparison.'],
animation:['动画实验','Animation'],
aim:['瞄准实验','Aiming'],combat:['战斗实验','Combat lab'],
scene:['画面','Screens'],experiments:['兼容实验','Experiments'],components:['组件','Components'],assets:['素材','Assets'],
ready:['备战','Ready'],battle:['战斗','Battle'],upgrade:['强化','Upgrade'],pause:['暂停','Pause'],win:['胜利','Win'],lose:['失败','Defeat'],loading:['加载','Loading'],error:['异常','Error'],
state:['当前预览状态','Preview state'],start:['开始战斗','Start battle'],refresh:['换一批','Reroll'],drag:['拖动武器布阵','Arrange your machines'],firing:['守住零件箱','Protect the parts box'],
coins:['齿轮','Gears'],health:['生命','Health'],land:['扩建地块','Land tile'],rank:['阶','Tier'],wave:['波','Wave'],close:['关闭','Close'],resume:['继续守夜','Resume'],
pauseTitle:['工坊休息中','Taking a break'],pauseBody:['这一页只预览样式，不会影响原试玩的对局。','This page only previews styles. Your original playtest is unaffected.'],
original:['打开原试玩','Open playtest'],restart:['重新布阵','Rearrange'],choose:['选一项强化','Choose an upgrade'],chooseHint:['三选一 · 画面预览','Pick one · Preview'],
bubbleUp:['泡泡连发','Rapid bubbles'],bubbleDesc:['泡泡枪攻速 +25%','Bubble attack speed +25%'],railUp:['宽轨贯穿','Wide rail'],railDesc:['多穿透 1 个敌人','Pierce 1 more enemy'],repair:['修复箱子','Repair the box'],repairDesc:['恢复 20 生命','Restore 20 health'],
victory:['这一夜，守住了','The workshop is safe'],defeat:['零件箱失守了','The parts box was lost'],next:['下一关','Next level'],passed:['守住 8 / 8 波','Survived 8 / 8 waves'],lost:['止步第 6 波','Stopped at wave 6'],
nextHelp:['下一关画面的样式仍与备战一致','The next level reuses the ready layout'],
loadTitle:['正在整理工坊','Preparing the workshop'],loadHelp:['素材就绪后进入布阵','Enter once assets are ready'],retry:['重试','Retry'],errorTitle:['素材没有加载成功','An asset did not load'],errorHelp:['保留格板与控件，可重试或返回。','The board and controls remain available. Retry or return.'],
empty:['已取走','Taken'],selected:['已选中','Selected'],pending:['待透明素材','Cutout pending'],static:['静态 · 真透明','Static · Alpha'],
stylesTitle:['一套样式，覆盖整局','One system, every state'],stylesHelp:['图片组件承载细节，真实控件承载交互；标题按语言换图，数字使用独立粗像素字体。','Image components carry the art; real controls carry interactions. Titles swap by language and live numbers use a dedicated bold pixel face.'],numberSet:['数字字形','Numeric glyphs'],
buttonSet:['按钮与状态','Buttons & states'],normal:['常态','Default'],disabled:['暂不可用','Unavailable'],selectedLabel:['选中','Selected'],confirm:['确定','Confirm'],cancel:['取消','Cancel'],
palette:['固定调色板','Fixed palette'],dark:['背景','Backdrop'],surface:['面板','Panel'],edge:['边框','Edge'],text:['文字','Text'],primary:['主操作','Primary'],support:['辅助','Support'],
assetTitle:['静态素材接入表','Static asset inventory'],assetHelp:['只把通过透明边缘检查的独立素材放进场景。带棋盘格背景的生图不算合格素材。','Only independent cutouts that pass alpha checks enter the scene. Painted checkerboards are not transparency.'],
source:['原始素材','Source asset'],download:['下载 PNG','Download PNG'],footprint:['占格','Footprint'],frameContract:['序列帧合同','Sprite-frame contract'],frameHelp:['固定画布、固定锚点、独立透明帧；更换帧不改变占格。动画实验页先验证弹簧炮。','Fixed canvas and anchor, separate transparent frames; frames never change the footprint. Test the spring cannon in the Animation tab.'],
shapePending:['轮廓占位，未接素材','Footprint placeholder; art pending'],pretend:['仅预览此操作的界面状态','Previewing the UI response only'],
batchTitle:['替换剩余武器？','Replace the bench?'],batchHelp:['花 5 齿轮换新 3 件，场上武器不变。','Spend 5 gears for 3 new machines. The board is unchanged.'],batchConfirm:['换新 3 件','Replace 3'],
openMenu:['预览菜单','Preview menu'],unit:['装置','Machine'],preview:['预览','Preview'],back:['返回','Back'],noAnimations:['评审版 r25 · 紧凑主试玩与弹窗','Review r25 · Compact play and dialogs'],
};
export let locale=new URLSearchParams(location.search).get('lang')==='en'?'en':'zh';
export function setLocale(value){locale=value==='en'?'en':'zh';}
export const pick=a=>a[locale==='zh'?0:1];
export const t=k=>dict[k]?pick(dict[k]):k;
export function toggleLocale(){locale=locale==='zh'?'en':'zh';const u=new URL(location.href);u.searchParams.set('lang',locale);history.replaceState(null,'',u);}

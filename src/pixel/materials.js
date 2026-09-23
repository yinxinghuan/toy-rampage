const files=import.meta.glob(['./images/r23/*.png','./images/r3/*.png','!./images/r3/gold-blank.png','!./images/r3/lilac-blank.png','!./images/r3/pause.png','!./images/r3/start-zh.png','!./images/r3/start-en.png','!./images/r3/*-source.png','!./images/r3/title-*.png','!./images/r3/refresh-label-zh.png','!./images/r3/route-horizontal.png','!./images/r3/route-vertical.png','!./images/r3/tile-clean.png'],{eager:true,query:'?url',import:'default'});
const landTray=new URL('./images/r24/land-tray.png',import.meta.url).href;
export const material=id=>id==='land-tray'?landTray:files[`./images/r23/${id}.png`]||files[`./images/r3/${id}.png`];
export const materialList=[
 ['title-zh',['中文标题字','Chinese wordmark']],['title-en',['英文标题字','English wordmark']],
 ['start-zh',['中文主按钮','Chinese action']],['start-en',['英文主按钮','English action']],
 ['hud',['三槽仪表底图','HUD shell']],['panel',['可伸缩铭牌框','Scalable panel']],
 ['tile',['普通格片','Board tile']],['tile-locked',['扩建格片','Expansion tile']],
 ['entry',['入口管口','Entrance pipe']],['exit',['出口箱与接管','Exit and pipe']],
 ['route-top-clean',['横向进场路径','Entry route']],['route-vertical-clean',['纵向路径','Vertical route']],
 ['route-bottom-clean',['横向返回路径','Return route']],['route-corner-top',['上弯角','Upper bend']],['route-corner-bottom',['下弯角','Lower bend']],
 ['tray',['三件式托盘底图','Three-slot tray']],['land',['独立土地槽','Land holder']],
 ['land-tray',['扩格施工底板','Expansion drafting tray']],
 ['gold-blank',['金色空按钮','Blank gold button']],['lilac-blank',['紫色空按钮','Blank lilac button']],
 ['pause',['暂停按钮','Pause button']],['floor-beam',['地板横梁','Floor beam']],
 ['heart',['生命图标','Health icon']],['gear',['齿轮图标','Gear icon']],
];

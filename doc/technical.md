# 玩具大暴走 · r50 技术说明

## 1. 技术栈

Vanilla JavaScript ES modules、Canvas/DOM、CSS、Vite 6。Node24用于构建与Playwright。base为./，game、art-review、pixel-lab三入口；无账户、数据库或云存档。worker只提供health探针，不需要业务API base。

## 2. 目录结构

- src/engine.js：Workshop权威状态、固定步进、空间、经济、攻击与升级。
- src/levels.js、upgrades.js、fusions.js：六关参数、13项强化、三路线尺寸和继承。
- src/progression.js：供给与扩格时间、手册推荐路线；保留随机池顺序。src/land-shapes.js：地块离散掩码及包围尺寸。
- src/main.js、copy.js、style.css：输入、弹窗、提示、双语与布局。
- src/play/：正式皮肤、预加载、音乐与手指。src/pixel/：素材、动作、朝向、表现、声音和评审工具。
- src/save.js：本机快照/校验；src/combat-report.js：有效伤害与漏怪记录。
- public/：序列、音频、字体notice、存储adapter和build-info。
- tests/：逻辑、策略与触控测试；_qa/原始证据不提交。
- worker/index.js：既有未列出试玩部署健康接口。

## 3. 核心模块

### 规则与表现
r50由fusion-hints.boardFusionHint统一入口显示和点击解析：可执行的选中相关配方→其他可执行配方→缺料说明；不再在main中用FUSIONS.find覆盖可执行结果。benchFusionHint也优先可执行配对并识别反向材料。engine.preview对候补到棋盘双向匹配，以棋盘目标坐标承载结果；板内保留配方锚点。fusionMove保留原扫描顺序，再补反向候补路径，避免改提示时无意改变自动策略。规则阶数/消耗/保存版本不变。
r49新局开放c1–4/r2–4，初始3格额度。landOffers返回共享额度的land与land:other两个源，额度≥4时增加land:square，get/preview/place/partner统一识别。landMove逐个候选查实际掩码；旋转从expand教学阶段可用。main在每波首次备战自动展示地块、可随时切回武器，共同额度只显示一次；guidePlan扩格态优先所见候选。
r49统一COLS=6/ROWS=7/CELL=45/GX=45/GY=29.5，路径仍938；land-shapes定义10个离散掩码（新增plot4），FOOTPRINT只给包围尺寸，occupied返回实际格集合。landPreview、拖影、预览和手指共用掩码。landAdvice只返回旋转/拆格建议，不自动变形；额度用progression.landReward。测试策略显式执行相同动作。正式皮肤和战斗评审的机器比例从共享维度读取，历史静态评审页不伪装成可玩关卡。
r46 reservePreview双向识别reserve-fusion；mergeReserve第三参数必须显式确认才提交异种融合，默认调用不吞材料。main保存两件材料对象身份，确认前复核预览与身份，提交后清除pending；暂停/重载未确认操作不提交。产物留目标reserve槽，复用reserveMerge截图汇聚，事件为fusion。原save item校验已支持合法融合种类与阶数，版本不变；benchFusionHint为候补对返回台子内目标，棋盘对仍用完整占格preview。
r45的src/fusion-hints.js为只读候补配对查询，复用matchFusion和preview，不修改随机数或状态。普通换批与定向材料同样判断；锚点推荐检查完整产物范围。main按选择刷新成对标记和手指，底部异种互拖只反馈上板步骤。配方、费用、伤害、融合提交规则不变。
SimulationClock使用1/60秒固定步进，暂停/强化/确认模态不推进。BattlePresentation将画面接触与实体弹延迟对齐，不重算伤害。
preview校验完整占格；同阶优先合成，配方优先融合，非法不隐式交换。融合确认复核目标ID。UI用fusionMove(null)查全路线，旧策略默认基础融合用于基线比较。
affectedUnits按具体强化ID继承；等效攻速只针对未受益目标。frost/storm支持2+2→3及3+3→4；伤害为STATS基准除以1.85^(4-rank)，不乘普通阶数倍率。fusionRankAllowed统一材料档位；preview携带结果rank，place不写死4。3阶产物不可同类合并。report只计有效伤害，破甲队友增量和鼓/链命中另列。

### 画面、音频与加载
scene-depth以脚底/底座在world中的归一化Y生成稳定z-index，同高度敌人在前；aim不参与。battle-art为每只可见敌人建立局部Canvas，死亡表现结束后移除，destroy统一清理；机器仍用原独立Canvas。board解除整组stacking context，FX=25000、交互格=30000、融合入口=30001，拖影/手指保持外层。grid-input为拖动格边提供4/45格滞后，非法位置仍由engine拒绝。地块托盘只渲染实际候选，不能为尚无额度的第三形状插空槽撑出第二行。
skin共享Workshop；独立机器Canvas、拖影、脚印共用逻辑尺寸。experimental-art从现有透明零件绘制霜泡/雷网，复用已有FX，无假素材下载。
预加载有有限并发、成功解码计数和失败重试；音乐按战斗/模态切换，不随模拟加速。audio-controls默认静音并保存偏好，AudioContext running才显示开启。
构建后PNG无损压缩逐张比对RGBA；目前257张由33.41MB降至27.68MB。资源保持相对路径，dist包含第三方字体许可。

### 本机恢复
r44的routeSupplies/claimRoute依据现有supplyLog.route判断本关领取一次，不新增存档必填字段；取消不调用领取，恢复保留次数，旧档仍兼容。main的routeChoice是纯UI状态，真实领取和资金校验在engine。guidePlan优先有效融合及可容纳结果的锚点，不替玩家执行。
SAVE_VERSION=4；保留landChoice/landRotation/landSplit。v2/v3先校验旧5×6边界，再逐坐标映射6×7，保留单位坐标，补已结束波次新旧扩格差额（v2另补初始1格）；v1按旧4×5映射6×7并补累计差。v4恢复不重复补发。显式字段白名单排除effects/events、DOM和未确认动作，保存敌人、冷却、随机数、强化、资源和当前局记录。经alteruLocalStorage adapter存toy-workshop-run-v1，真实键带部署UUID，不清其他游戏数据。
还原校验版本、有限数值、数组、单位ID/占格/阶位、阶段、敌人、强化和战报，失败整档拒绝；重建Workshop并重接当前LEVELS。每500ms及pagehide/隐藏保存，隐藏暂停；恢复确认前不覆盖，继续才重置表现层。无离线推进、无云同步；存储异常仅提示。
当前局记录恢复，过去尝试列表只内存。r44只扩展合法融合产物阶位为3/4，不改旧4阶参数；数值/格式不兼容更新应提升版本并设计迁移。

### 验证与发布
r50运行提交4eb965d已更新既有UUID，333份线上文件SHA一致、health为r50；132项规则通过，320/390本地与线上各12个融合触控夹具及选中提示通过，三尺寸教学/扩格/恢复通过。详见qa-fusion-r50.md，夹具不等于真人理解与乐趣验证。
r49运行提交9da4b29已更新既有UUID；全部333份线上文件SHA与dist一致、health为r49，线上390触控教学/扩格/恢复通过。两次整批上传超时后以仓库外临时传输适配器分24批成功，未改变源码构建或平台配置。完整记录见qa-board-depth-r49.md。
r49本地：130项规则、184份真实r48快照、55对/110次策略对照；三尺寸教学/旋转/恢复，390和320第6关完整42格雷网路线通过。320额外实际拖放四格方块；390/320上下重叠像素及8向不跳层通过。侧边夹具仅验证排序值（素材未相交），不冒称像素验收。详见qa-board-depth-r49.md，线上状态以其发布补记为准。
r48运行提交ac3d3b0已更新既有外部试玩；36份关键线上资源SHA与dist一致、health为r48，线上390正常触控教学/旋转/L形/恢复通过。首次验证曾遇短暂单文件404，复验恢复，详见qa-centered-r48.md。
r48本地：127项规则回归、184份真实r47快照迁移、55对/110次策略对照通过执行；三尺寸教学/旋转/恢复、390完整第6关30格雷网路线及胜负恢复通过。新版位置会影响策略收益，第4关固定霜泡策略失败明确保留，详见qa-centered-r48.md；不把通关脚本或断言更新解释为真人难度验证。发布状态以该记录最终补记为准。
r47运行代码4a6348c已更新既有外部试玩，36份关键线上文件SHA与dist一致、health为r47。125项规则回归、55对/110次新旧策略对照、111份真实旧档迁移、三尺寸L形触控及第6关完整30格路线通过；真实计时线上教学与刷新恢复通过。测试时钟加载同步修正及详细证据见qa-board-r47.md。
r46运行代码65613c1已部署；122项回归、两手机尺寸本机触控及390线上触控通过，覆盖台子融合确认取消、动画、恢复和上阵。36个关键线上资源与dist哈希一致，health为r46；凭据/UI扫描、构建和notice检查通过。见qa-fusion-r46.md。
r45运行代码`24cb456`已更新既有外部试玩；121项回归通过，320英文/390中文正常触控融合流程通过，线上390再次通过。全部333份线上文件与dist哈希一致，health为r45。详见qa-fusion-r45.md。
r44最终运行代码`2baec66`已部署到既有外部试玩地址；关键线上资源与最终dist哈希一致，health为r44。本轮详细证据见`qa-fusion-r44.md`；未进行AlterU上架或公开源码。
r44新增可达性回归117项及65次多种子/策略对照，证据见qa-fusion-r44.md。以下为r43历史验收：规则111项，强化同条件32项，中段多策略700次探针加正式140次，r43再次140次；两条新融合有正常供给及群体/重甲/首领同材料对照。320/390真实触控、满板交换、动画、确认/取消、重载证据见qa-six-step-progress，不代表真人胜率。源码2cfea84已发布，线上全部333个文件SHA匹配dist，health为r43。
以上为外部主线 r50 之前的历史发布记录。AlterU 快照使用独立 UUID `03855703-d241-4f8c-90a9-ccf0bb72972e`，`index.html` 先加载按部署地址隔离的浏览器存储适配器，再加载游戏；另接入平台访客扩展。Vite 只构建正式游戏入口，`meta.json` 和 `public/poster.png` 提供平台封面，GitHub Pages 工作流构建同一源码的静态镜像。Worker 只提供健康检查，不处理付费、账号或共享存档；业务 API Base 审计对它不适用。

## 4. 扩展点

数值与敌人改engine/levels；供给改progression；融合改fusions+攻击分支+experimental-art+copy并补占格/继承/代价测试。皮肤改play/pixel，棋盘维度与坐标以engine导出为准，不在皮肤另定碰撞格数。声音改music/battle-audio/audio-controls。存档改save版本和恢复测试；跨设备或业务后台需另行设计授权。
历史结构与旧发布记录见[技术历史](./technical-history.md)。

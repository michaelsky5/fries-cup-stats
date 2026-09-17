# 全高杯 S4 技术分析 · 本地预览 v0.2

2026-08-31。此文记录独立预览页的实现与验收，不代表已经部署或确定最终对外名单。

## 入口与范围

- 总览：`/scouting/qgcs4-preview`。
- 位置：`/scouting/qgcs4-preview/positions/:positionSlug`，五位置分别为 `tank`、`hitscan`、`flex-dps`、`main-support`、`flex-support`。
- 个人：`/scouting/qgcs4-preview/players/:playerId`，仅本轮 20 名候选提供独立档案。
- 语言：中文默认，`?lang=en` / `?lang=ko`；默认经理视图，`view=analysis` 打开教练视图。
- 所有入口位于 `import.meta.env.DEV` 路由集合内。没有主站导航入口，没有生产发布。

默认先呈现五位置结论，再进入同位置比较与个人档案。经理视图突出结论、优势与观察项，教练视图展开原始统计和分析条件；两种视图使用相同结论。个人档案提供同位置雷达图、英雄×地图记录和两场经分析稿选取的比赛入口；模型贡献、阶段条件与删场检查可展开。不把模型顺位称作签约结论或固定名单层级。

## v0.2 的变化与边界

- 采用与 FCR26 报告一致的黑金视觉、五位置强调色、透明英雄素材和总览—位置—档案结构；样本和分析模型仍然独立。
- 同位置可选 2–3 名候选，分别查看综合指标、发挥稳定性、强敌与阶段、英雄与地图。这里只切换证据，不调整模型权重、指数或顺位，不称为四套用人侧重评分。
- 对比选择使用 `compare`，证据视角使用 `focus=overall|consistency|pressure|heroes`；切换语言、阅读视图或进入档案后返回时保留，切换位置时重置候选选择。
- 英雄×地图格子只统计本位置真实出场记录，并关联对应比赛和地图序号。桌面用矩阵，手机用地图卡片；手机点选后在该地图下方显示比赛，不要求读者滑到整张表末尾。
- 总览长昵称、手机姓名与指数、极窄屏候选选择及三人比较分别调整布局，不通过省略姓名解决拥挤。
- 报告展示版本统一为 v0.2；分析数据仍是模型 v0.1 / revision 3，没有借视觉升级改分。

## 数据与身份

- 固定 QGCS4 V30、`selection-v0.1-r3.json`：36 场真实比赛、124 张真实地图、43 名合格参考选手、20 份档案。
- 展示数据是约 120 KiB 的字段白名单投影，不在浏览器重新计算模型，不下载完整研究产物。
- 43 名参考选手均按 V30 `players[].player_id` 唯一关联，校验队伍一致后读取 `player_name` 中的战网 ID。重复 ID、队伍不符或无有效标签时构建失败，不靠昵称猜测。
- 国籍补充（2026-08-31）：用户确认本轮 20 名候选均为中国大陆，已按这 20 个本届选手 ID 单独记录，不改写 V30、不延伸到其他参考选手或跨届同名选手。联系方式不输出，也没有人工录像评价。
- 20 名候选各保留两条经分析稿选取的真实比赛引用。比赛网站可能更新，报告数字仍固定于 V30。
- 原模型产物及其哈希未因补充身份字段而变更。

## 复核入口

```powershell
node scripts/buildQgcs4Preview.mjs --check
node scripts/assertQgcs4Preview.mjs
node scripts/assertQgcs4Selection.mjs --artifact
node scripts/assertQgcs4ScoutingAudit.mjs
node scripts/assertScoutingReport.mjs
node node_modules/eslint/bin/eslint.js scripts/buildQgcs4Preview.mjs scripts/assertQgcs4Preview.mjs src/features/scouting/qgcs4 src/pages/scouting/qgcs4 src/app/router.jsx
```

更新展示投影时运行 `node scripts/buildQgcs4Preview.mjs`；只写本预览的 `qgcs4PreviewData.json`，不生成 FCR26 公开产物。启动预览可直接运行 Vite，避免执行无关产物生成生命周期：

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3031 --strictPort
```

## 本轮验收

- 17 项预览数据与界面契约（含国籍范围、对比选择与英雄×地图证据）、25 项模型契约、原始复核与 FCR26 报告回归通过；相关文件 ESLint 通过。
- 浏览器走通三语言、五位置和 20 份个人档案；每份有雷达图与两条比赛引用。英文、韩文个人档案亦逐一核对。
- 320px 英文五位置四种对比状态、390px 韩文五位置、1440px 中文五位置检查通过；中文 390px、英文 320px、韩文 390px 的 20 份个人档案分别走通，无横向溢出、无异常数值。
- 1280px 总览长昵称、320px 长昵称首位卡片与三人比较已目视复核；20 人战网 ID 和已确认国籍保持正确。
- 阅读深度、语言切换与浏览器返回保留正确页面状态；返回列表恢复滚动位置。已验证选择 2–3 人的上下限与同位置约束。
- 英文教练视图的英雄×地图深链打开正确证据区，点选 D.Mon / Route 66 对应两场真实季后赛；中文手机点选安娜 / 釜山，在该地图下方显示小水对 SPS 的小组赛第 1 图。均不把出场次数当成能力分。
- 小头像与大幅透明英雄素材实际加载；控制台未见错误。抽查一条线上证据链接，确实落到对应的本届比赛数据。
- 使用独立输出目录 `artifacts/qgcs4-preview-v02-production-check-20260831`、禁用公共目录复制的生产构建通过；产出 JS/CSS 不含本预览的路由或数据模块。没有运行生产部署，也没有改写公开数据快照。

## 尚未完成

- 最终对外候选名单确认；后续如新增选手，需另行确认身份信息。
- 打印 / PDF 的逐页视觉验收，以及正式发布后的真实移动浏览器验收。
- 生产访问与链接发布。当前只能在本机预览，不能把 localhost 链接发送给俱乐部使用。

本报告是本届数据的技术分析；删场与权重敏感性不等同于独立赛事预测验证。没有职业赛事强度换算，也不把沟通、指挥、终极技能时机与队伍化学反应写成已测量能力。

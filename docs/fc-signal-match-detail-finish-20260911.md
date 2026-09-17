# 比赛详情本地收尾

日期：2026-09-11。承接[比赛详情首版精修](fc-signal-match-detail-refinement-20260911.md)，按用户确认的三项范围收尾：比赛摘要、MVP 信息聚合、章末操作。本页本次设计迭代到此结束；本地修改未提交、未发布。

## 最终调整

- 比分下方增加一句比赛摘要，复用赛程精选的 `getScheduleHighlightFact`，不建立另一套比分判断。仅显示已核实的逆转或决胜图看点。ECNU–BANANA 为“ECNU 从 0:2 落后追至 3:2，拿下系列赛。”英文对应同一事实；判罚、弃权、缺失或矛盾记录没有此类摘要。
- MVP 由分散的姓名、中央英雄图和右侧数据，调整为左侧英雄与身份相邻、右侧评分及关键统计。保留实际英雄来源、出场图数、评分口径和档案回程。展开评分说明时，人物图保持原有高度；手机延续身份与评分并列、完整统计随后呈现。
- 桌面章末把回放代码、复制、录像和上一图／下一图合在一栏。1440 px 实测约 68 px 高，较本轮开始时的两条操作栏更紧凑。手机按内容自然分行，复制与录像入口至少 44 px，地图导航按钮约 54 px；首图、末图保持正确方向。复制反馈通过原有状态区播报。

## 验证

- `node --test scripts/assertMatchReadingState.mjs scripts/assertMatchReview.mjs scripts/assertScheduleRefinement.mjs scripts/assertSchedulePresentation.mjs scripts/assertSignalLaunchBatch1.mjs scripts/assertSignalLaunchBatch2.mjs`：56/56 通过，日志为本批临时目录 `tests.log`。复用了已有的真实赛果、缺图、比分矛盾、弃权、判罚、比较与回程测试，没有为纯排版编写结构镜像断言。
- 本批三个 JSX 文件通过 ESLint，记录为 `lint.log`。直接 Vite 构建通过，9.93 秒，输出隔离到 `dist/`，日志为 `build.log`；仅有 CSS 插件耗时提示，未运行会生成公共素材和快照的 npm 前置脚本。
- FCR2026 中文 1440 / 1280 px：摘要正确；MVP 评分说明可展开和关闭，人物图没有随说明拉高；完整五图及每图十条选手行保留。第 2 图复制成功后出现“已复制”，新工具栏的下一图进入第 3 图，标题落在固定导航下方约 16 px。
- 中文 390 px：摘要、MVP、评分说明和统计可读；收起第 1 图后从章末进入第 2 图，网址保持 `collapsed=1&map=2`；复制与录像入口实测 44 px 高，上一图／下一图约 54.7 px 高。
- 英文 320 px：摘要自然换行，末图代码复制显示 Copied；章末上一图能返回 New Junk City，没有多余的下一图。上述新版视口均没有外页横向溢出，手机统计仍使用原有内部横向滚动。
- QGCS4 英文真实弃权场次 `QGCS4-GROUP-R1-M01`：保留 FORFEIT、3:0 判罚结果及登记名单，没有摘要、MVP 或地图统计。FCR2026 原版没有本批摘要、MVP 与 Signal 双队表格标记。

## 交付与边界

- 预览：`http://127.0.0.1:3026/matches/FCR26-LCQ-M14?design=kpr5&lang=zh&season=FCR2026`。
- 修改前备份：`tmp/match-detail-finish-20260911-201021/before/`。本轮范围见同目录 `review-files.json`，相对本轮起点的差异为 `changes.patch`。
- 设计规范升级为 2.5.6。保留前序轮次的备份和验证记录，不清理其他工作中的文件。
- 公共数据偶发刷新失败仍是独立问题，现有缓存、失败说明与重试入口保留。比赛房、分享产物、生产发布与网络稳定性不属于本批验收。

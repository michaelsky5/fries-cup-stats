# 赛季球探报告生成

新赛季报告由 `season-report/` 的通用页面与适配器生成，不为每届赛事复制 React 页面或 CSS。页头、报告标题、版本信息、阅读深度切换、岗位驾驶舱和选手“30 秒决策摘要”由 `shared/ScoutingReportChrome.jsx` 统一提供，FCR26 与通用赛季使用同一个组件实现。

## 日常生成

```powershell
node scripts/buildSeasonScoutingReport.mjs --list
node scripts/buildSeasonScoutingReport.mjs --season QGCS4 --check
node scripts/buildSeasonScoutingReport.mjs --season QGCS4
```

`--check` 只核对固定数据与报告契约，不写入报告数据；不带 `--check` 才执行该赛季已注册的生成命令。

## 接入新赛季

1. 在 `seasonReportCatalog.js` 登记赛事编号、模型版本、数据产物与生成/核对命令。
2. 分析管线输出统一的角色相对报告数据：合格池、候选顺位、分项指标、样本、阶段、对手环境、稳定性和比赛证据。
3. 提供赛事适配器：位置配置、三语界面文案、候选分析文案及统一数据函数。
4. 在 `seasonReportAdapters.js` 注册适配器。通用预览路由会自动识别它；不新增页面、CSS 或交互组件。
5. 运行适配器契约、模型审计和浏览器验收，再由负责人确认名单与身份信息。

自动化只生成技术分析草稿。国籍、身份歧义、人工录像结论和对外发布仍需明确确认；缺失证据显示为缺失，不以零分或推测补齐。

## 当前迁移状态

- QGCS4 已接入 `role-relative-v1` 通用渲染器，旧预览链接仍可使用；总览入口状态、整卡岗位跳转和返回阅读位置与 FCR26 保持同一交互合同。
- FCR26 继续使用已发布的 `legacy-fcr26` 数据管线与公开分享入口，并作为视觉、组件和交互回归基准。两套数据合同尚未合并：FCR26 有 Selection v2.7 的用人侧重与完整模型审计，QGCS4 只呈现其 V30 固定分析能够支持的证据切面，不用占位数据伪装同等分析能力。

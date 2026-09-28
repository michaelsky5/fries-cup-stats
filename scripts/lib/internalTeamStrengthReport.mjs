import fs from 'node:fs'
import { MODEL_LABELS } from './internalTeamStrengthEngine.mjs'

export function renderTeamStrengthHtml(report) {
  const css = fs.readFileSync(new URL('../team-strength-ui/report.css', import.meta.url), 'utf8')
  const js = fs.readFileSync(new URL('../team-strength-ui/report.js', import.meta.url), 'utf8')
  const payload = JSON.stringify(report).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>队伍实力实验室 · Fries Cup</title><style>${css}</style></head><body>
  <header><div class="eyebrow">FRIES CUP / INTERNAL RESEARCH</div><h1>队伍实力实验室 <span class="badge">v0.1 · 离线实验</span></h1><p class="lead">从真实对战估计队伍实力。一起看分数、证据和不确定度，为后续赛事分档建立可检验的依据。</p><div class="metrics"><div class="metric"><strong id="total-matches">—</strong><span>正常系列赛</span></div><div class="metric"><strong id="total-entries">—</strong><span>队伍赛事条目 · 未跨赛事去重</span></div><div class="metric"><strong>3</strong><span>独立赛事评级池</span></div><div class="metric"><strong id="candidate-identities">—</strong><span>待核对跨赛事身份</span></div></div></header>
  <main><div class="notice" id="selection-note"></div><div class="toolbar"><label>赛事<select id="season-select"></select></label><label>搜索队伍<input id="team-search" type="search" placeholder="队名、简称或 ID" autocomplete="off"></label><span class="grow" id="visible-count" aria-live="polite"></span></div>
  <div class="layout"><div><section class="panel"><h2>队伍评级</h2><p class="fine">点击队伍查看变化，列表可滚动。区间为模型估计；暂定队伍不自动进入低档。</p><div class="table-scroll team-list" tabindex="0" role="region" aria-label="队伍评级列表"><table><thead><tr><th>队伍</th><th>实力分</th><th>近似 95% 区间</th><th>场 / 对手</th><th>状态</th></tr></thead><tbody id="team-rows"></tbody></table></div></section>
  <section class="panel"><h2>同赛事对阵参考</h2><div class="match-controls"><label>队伍 A<select id="team-a"></select></label><label>队伍 B<select id="team-b"></select></label></div><div class="match-result" id="match-result" aria-live="polite"></div></section></div>
  <aside><section class="panel" id="team-detail" aria-live="polite"></section><section class="panel"><h2>数据覆盖</h2><div class="quality-grid" id="quality"></div><p class="fine" id="quality-note"></p><p class="fine">赛果、阵容和表现分别检查。部分地图有赛果而没有可靠统计；缺失值不作为低表现。</p></section></aside></div>
  <section class="panel comparison"><h2>按时间回放 · 模型对照</h2><p class="subtle" id="comparison-note"></p><div class="table-scroll"><table><thead><tr><th>模型</th><th>Log loss ↓</th><th>Brier ↓</th><th>方向准确率</th><th>相对 Elo 的损失差区间</th></tr></thead><tbody id="comparison-rows"></tbody></table></div><details><summary>阵容模型的概率校准</summary><p class="fine">按赛前较被看好的一方分组。小样本分组只能作为线索。</p><div class="table-scroll"><table><thead><tr><th>预测区间</th><th>场次</th><th>平均预测</th><th>实际获胜比例</th></tr></thead><tbody id="calibration-rows"></tbody></table></div></details></section>
  <section class="panel"><h2>使用边界</h2><p class="fine">这是历史归档实验，尚未用于正式分档。不同赛事及不连通对战网络的分数不能直接比较；完整 BattleTag 相同只是身份核对候选。内部实力分不直接转换成游戏段位，也不证明申报不实。</p><p class="fine">换人会降低历史继承、扩大不确定度。实际阵容在赛后才被观察，不能提升同场赛前预测。区间覆盖率、实验档位边界仍需用未来比赛验证。</p><details><summary>固定输入与复验信息</summary><ul id="provenance"></ul><p>模型公式、筛选规则、逐场预测与排除明细均记录在 JSON 报告。</p></details><div class="report-links"><a href="report.json" download>完整 JSON</a><a href="predictions.json" download>逐场预测</a><a href="identity-candidates.json" download>身份核对清单</a><a href="README.md">实验报告</a></div></section><footer>Fries Cup · 内部分析 · 生成日期 ${report.generatedAt.slice(0, 10)} · 本地归档回放</footer></main>
  <script id="report-data" type="application/json">${payload}</script><script>${js}</script></body></html>`
}

export function renderTeamStrengthMarkdown(report) {
  const lines = ['# 内部队伍实力实验报告 v0.1', '', `生成时间：${report.generatedAt}。仅本地实验，尚未用于正式分档或发布。`, '',
    `开发集选择：**${MODEL_LABELS[report.evaluation.developmentChoice]}**。选择仅使用 FCA/FCR 各赛事等权平均 log loss。`,
    `全高杯验证集相对 Elo 的 log loss 点估计：${report.evaluation.validationImprovesOverElo ? '改善' : '未改善'}。候选差值区间：${JSON.stringify(report.evaluation.validationDifference?.interval ?? null)}。`, '',
    `开发集内仍逊于 Elo 的赛事：${report.evaluation.developmentRegressions.join('、') || '无'}。选手统计的额外收益需看相对阵容模型的配对比较，不能将全部改进归因于统计数据。`, '',
    '队伍表展示 Glicko + 阵容的实验评分，模型选择结果不构成自动采用；完整对照保留于 JSON。', '',
    '| 赛事 | 模型 | 对局 | Log loss | Brier | 准确率 |', '| --- | --- | ---: | ---: | ---: | ---: |']
  for (const season of report.evaluation.summaries) for (const [model, result] of Object.entries(season.all.models)) lines.push(`| ${season.seasonId} | ${MODEL_LABELS[model]} | ${season.all.matches} | ${result.logLoss} | ${result.brier} | ${(result.accuracy * 100).toFixed(1)}% |`)
  lines.push('', '## 输入与覆盖', '', '| 赛事 | 登记队伍 | 正常 / 全部系列赛 | 阵容可核对地图 | 表现输入地图 | 段位缺失 |', '| --- | ---: | ---: | ---: | ---: | ---: |')
  for (const season of report.seasons) { const a = season.audit; lines.push(`| ${season.seasonId} | ${a.registeredTeams} | ${a.eligibleSeries} / ${a.totalMatches} | ${a.verifiedLineupMaps} / ${a.listedMaps} | ${a.performanceMaps} | ${a.missingDeclarations} / ${a.registeredPlayers} |`) }
  lines.push('', '## 解读限制', '',
    '- 这是基于当前归档重建的历史回放；缺少当时发布时点及赛前阵容公告的完整存档。',
    '- 全高杯此前已被分析过，只能称为后续赛事历史验证，不能称为从未接触的盲测。',
    `- 全高杯候选的损失差区间：${JSON.stringify(report.evaluation.validationDifference?.interval ?? null)}。若区间跨过零，尚不能证明稳定收益。`,
    ...Object.entries(report.evaluation.performanceIncrement).map(([season, result]) => `- ${season} 表现信号相对阵容模型的 log loss 差：${result.difference}；配对区间 ${JSON.stringify(result.interval)}。负数为改善，区间跨零则证据不足。`),
    '- 实际阵容在赛后才进入引擎，临时换人不会改善同一场的赛前预测。',
    '- 队伍实力、选手个人技术和团队配合无法仅凭当前数据完整分离。', '',
    `- 跨赛事完整 BattleTag 候选 ${report.identityAudit.candidates.length} 个，自动继承评级 0 次；见 identity-candidates.json。`,
    '- 每个赛事与连通分量独立评级，无法据此构造统一跨赛事段位榜。', '- 模型区间尚未验证覆盖率。样本达标和 A/B/C/D 为实验规则，不是游戏段位，也不证明填写不实。', '',
    '## 复验', '', '`npm run test:team-strength`', '', '`npm run analyze:team-strength`', '', '`npm run preview:team-strength`', '',
    '输入 SHA-256 和引擎代码 SHA-256 见 report.json。结果、预测和队伍评分均在固定输入及模型代码下可重算。', '')
  return lines.join('\n')
}

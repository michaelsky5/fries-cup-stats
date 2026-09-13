import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { prepareValidationData } from './lib/seasonRatingValidation.mjs'
import { TEAM_MODEL_POLICY, auditPlayerTeamNesting, buildSeriesObservations, replayTeamPool, buildSameRolePairs, replayPairHistory, summarizeTeamAnalysis } from './lib/seasonTeamModelAnalysis.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  if (!args.includes(name)) return fallback
  const value = args[args.indexOf(name) + 1]
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
  return value
}
const input = path.resolve(option('--input', 'public/data/fcr2026_local_public.json'))
const diagnosticsPath = path.resolve(option('--diagnostics', 'artifacts/season-rating-diagnostics-20260906/report.json'))
const output = path.resolve(option('--output', 'artifacts/season-team-model-analysis-20260906'))
const outputReport = path.join(output, 'report.json')
if (fs.existsSync(outputReport) && JSON.parse(fs.readFileSync(outputReport)).policy?.version !== TEAM_MODEL_POLICY.version) throw new Error('Preserve existing reports: use a separate output directory')
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const diagnosticsBytes = fs.readFileSync(diagnosticsPath)
const diagnostics = JSON.parse(diagnosticsBytes)
if (diagnostics.policy?.version !== 'context-residual-audit-v1') throw new Error('Unsupported diagnostic source')
const validationPath = path.resolve(option('--validation', diagnostics.provenance.validationPath))
const validationBytes = fs.readFileSync(validationPath)
const validation = JSON.parse(validationBytes)
const inputBytes = fs.readFileSync(input)
if (hash(inputBytes) !== diagnostics.provenance.inputSha256 || hash(validationBytes) !== diagnostics.provenance.validationSha256) throw new Error('Source data changed: regenerate earlier diagnostics')
const sourceHashes = { ...diagnostics.provenance.sourceModelHashes, ...diagnostics.provenance.diagnosticHashes }
for (const [file, expected] of Object.entries(sourceHashes)) if (hash(fs.readFileSync(file)) !== expected) throw new Error(`Source code changed: ${file}`)
const analysisFiles = ['scripts/analyzeSeasonTeamModel.mjs', 'scripts/lib/seasonTeamModelAnalysis.mjs']
const analysisHashes = Object.fromEntries(analysisFiles.map(file => [file, hash(fs.readFileSync(file))]))
const data = prepareValidationData(JSON.parse(inputBytes), validation.provenance.seasonId)
const nesting = auditPlayerTeamNesting(data.logs)
const observations = buildSeriesObservations(diagnostics.rows, validation.folds)
const teamFolds = replayTeamPool(observations)
const paired = buildSameRolePairs(diagnostics.rows, teamFolds)
const pairFolds = replayPairHistory(paired.pairs)
const summary = summarizeTeamAnalysis(teamFolds, pairFolds)
if (Math.abs(summary.team.performance.current.maeByMatch - validation.summary.performance.sampleAdjusted.maeByMatch) > 0.0001) throw new Error('Source baseline error changed')
for (const [file, expected] of Object.entries({ ...sourceHashes, ...analysisHashes })) if (hash(fs.readFileSync(file)) !== expected) throw new Error(`Code changed during analysis: ${file}`)
if (hash(fs.readFileSync(input)) !== hash(inputBytes) || hash(fs.readFileSync(diagnosticsPath)) !== hash(diagnosticsBytes) || hash(fs.readFileSync(validationPath)) !== hash(validationBytes)) throw new Error('Source file changed during analysis')
const report = { generatedAt: new Date().toISOString(), policy: TEAM_MODEL_POLICY,
  provenance: { input, inputSha256: hash(inputBytes), diagnosticsPath, diagnosticsSha256: hash(diagnosticsBytes),
    validationPath, validationSha256: hash(validationBytes), sourceHashes, analysisHashes },
  interpretation: {
    status: 'Offline research only; no public rating, OVR or model-weight changes.',
    teamCandidate: 'Predict raw performance as current sample-adjusted score plus sum of earlier team-series mean forecast errors divided by (team-series count + K). Team-series means use evaluated player-role observations; prior mean is zero. K=4 is fixed in advance; K=1 and 8 are reported sensitivity checks, not a model selection grid.',
    teamTiming: 'Both estimation and team assignment use earlier competition-day data. All same-day predictions precede adding that day to history. First team-series receives zero correction. Actual current peer statistics, map results and actual hero/mode/duration are not predictor inputs.',
    pairCandidate: 'Canonical same-team same-role pairs are evaluated only on common full-duration maps with at least 10 shared minutes per series. Both players already satisfy the original formal eligibility. Historical pair differences are shrunk toward zero with three neutral-series equivalents; no history falls back to the current score difference.',
    pairTarget: 'Which player has the higher time-weighted raw statistical score on the shared maps. The held-out pairing and shared-map participation define a conditional evaluation cohort, not a forecast of who will play. Target ties are omitted from accuracy and counted; prediction ties receive half credit.',
    units: 'Team MAE is individual raw-performance error averaged within series then across series. Pair gap MAE is raw-score difference error; OVR differences are evaluated for direction only, never raw-scale MAE.',
    identifiability: nesting.explanation,
    sameTeamInvariance: 'A shared additive team term cancels exactly in differences between same-team players. It can change cross-team ordering without adding within-team discrimination.',
    limits: 'No independent skill labels, no new-season holdout. Repeated pairs and same-team players are dependent. Competition-day bootstrap is exploratory and does not correct for model development on this season. Player IDs may not resolve identities across separate registrations.'
  }, nesting, pairCoverage: { mapPairs: paired.mapPairs, exclusions: paired.exclusions }, summary,
  teamFits: teamFolds.map(({ date, fitted }) => ({ date, fitted })), pairFits: pairFolds.map(({ date, fitted }) => ({ date, fitted })) }
const fmt = value => value == null ? '—' : Number(value).toFixed(3)
const pct = value => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const interval = value => value ? `[${fmt(value.low)}, ${fmt(value.high)}]` : '样本不足'
const teamNames = { current: '当前样本收敛分', roleMean: '同职责历史均值', teamK1: '团队项 K=1（敏感性）', teamK4: '团队项 K=4（预定候选）', teamK8: '团队项 K=8（敏感性）' }
const pairNames = { current: '当前样本收敛分差', ovr: '当前 v1.4 OVR 差', teamK4: '加入共享团队项', history: '历史同队分差 + 收敛', zero: '始终预测同分' }
const lines = [
  '# 团队环境与个人相对表现：继续验证', '',
  '离线研究，不改变网页评分。两项问题分别检验：历史团队偏差能否改善后续原始表现预测，以及历史同队表现差能否判断下次谁的数据表现更高。', '',
  `数据 SHA-256：\`${report.provenance.inputSha256}\`。`, '',
  '## 首先核对能否分开队伍和个人', '',
  `正常日志中有 ${nesting.players} 个玩家 ID、${nesting.teams} 支队伍，跨队 ID ${nesting.playersWithMultipleTeams.length} 个。`, '',
  '在「个人常数项 + 队伍常数项」模型里，如果同队所有个人项减去 c，队伍项加上 c，拟合总和仍然相同。没有跨队变化时，数据无法单独确定这种分配；约束或先验能选定一种分配，但不能被描述为已从数据识别了独立个人技术。这个结论限定于这种加法模型和当前身份记录。', '',
  '方法依据：[Stan 关于重复截距及模型识别的说明](https://mc-stan.org/docs/stan-users-guide/problematic-posteriors.html#collinearity-of-predictors-in-regressions)。', '',
  '## 带小样本收敛的团队项', '',
  '每次先计算过去每场队伍的平均预测偏差，一场只计一个样本。团队项 = 过去偏差之和 /（已观测场数 + K），向 0 收敛。K=4 在本轮运行前固定；K=1 和 K=8 只检查参数敏感性，全部报告。', '',
  `沿用 ${summary.sample.observations} 个观测、${summary.sample.matches} 场、${summary.sample.days} 日；${summary.sample.activeObservations} 条已有团队项历史。使用赛前队伍 ID，当场队伍变化的观测有 ${summary.sample.changedTeamObservations} 条。`, '',
  '| 方法 | 原始表现 MAE | 相对当前差值 | 差值探索区间 | 同日同职责成对排序 |', '| --- | ---: | ---: | --- | ---: |',
  ...Object.entries(summary.team.performance).map(([model, metric]) => `| ${teamNames[model]} | ${fmt(metric.maeByMatch)} | ${fmt(metric.differenceFromCurrent)} | ${interval(metric.differenceInterval)} | ${pct(metric.acrossTeamRolePairAccuracy)} |`), '',
  `K=4 已启用观测的平均绝对改动 ${fmt(summary.team.activeMeanAbsoluteOffset)}，最大 ${fmt(summary.team.maxAbsoluteOffset)} 个原始分。只有一场团队历史的 ${summary.team.onePriorMatch.observations} 条观测，最大改动 ${fmt(summary.team.onePriorMatch.maxAbsoluteOffset)}。这些不是网页 OVR 改动或置信区间。`, '',
  `对赛前队伍 Elo 低于 1500、且此前分数高于本轮同队同职责同伴的 ${summary.team.lowerEloPriorRoleLeaders.observations} 个观测，平均团队项 ${fmt(summary.team.lowerEloPriorRoleLeaders.meanOffset)}，其中 ${summary.team.lowerEloPriorRoleLeaders.negativeOffsets} 个被下调。这个子集不是独立标注的高技术选手，只用于检查候选对已有相对高分者的行为。`, '',
  '## 同队同职责是否更分得开', '',
  `匹配到 ${paired.mapPairs} 个地图内配对；要求双方共同完整出场至少 10 分钟后，得到 ${summary.pair.all.pairs} 个队友配对场次、${summary.pair.all.distinctPairs} 对不同队友、${summary.pair.all.matches} 场比赛、${summary.pair.all.days} 日。排除短共同出场 ${paired.exclusions.shortSharedSeries} 个配对场次。`, '',
  '同一对队友按固定 ID 顺序做差，目标只使用共同地图的原始表现差。历史均差按 3 场中性经验收敛，没有历史时沿用当前分差；整日计算完预测才加入当天结果。真实配对和地图参与只定义检验样本，不表示能提前知道谁会出场。', '',
  '| 方法 | 全部配对正确率 | 已有配对历史正确率 | 有历史时分差 MAE |', '| --- | ---: | ---: | ---: |',
  ...Object.keys(summary.pair.all.performance).map(model => `| ${pairNames[model]} | ${pct(summary.pair.all.performance[model].accuracy)} | ${pct(summary.pair.repeated.performance[model].accuracy)} | ${fmt(summary.pair.repeated.performance[model].gapMae)} |`), '',
  `当前 OVR 全部配对的匹配率探索区间：按比赛日聚类 ${interval(summary.pair.all.performance.ovr.accuracyIntervalByDate)}，按队伍聚类 ${interval(summary.pair.all.performance.ovr.accuracyIntervalByTeam)}。各对队友等权后的匹配率为 ${pct(summary.pair.all.performance.ovr.equalPairAccuracy)}。两种聚类是依赖性敏感检查，都不能替代新赛季检验。`, '',
  `已有历史的共同样本 ${summary.pair.repeated.pairs} 个，历史分差方法相对当前分差的准确率差值探索区间 ${interval(summary.pair.repeated.performance.history.differenceInterval)}（比例单位）。OVR 与原始分尺度不同，因此 OVR 只比较方向。`, '',
  `共享团队项改变了同队原始分差的次数：${summary.team.sameTeamPairDifferencesChanged}。它在相减时抵消，所以跨队排名变化不能作为同队区分能力提升的证据。`, '',
  '| 职责 | 配对场次 | 有历史配对场次 | 当前分差正确率（有历史） | 历史分差正确率（有历史） |', '| --- | ---: | ---: | ---: | ---: |',
  ...['TANK', 'DPS', 'SUPPORT'].map(role => `| ${role} | ${summary.pair.byRole[role].pairs} | ${summary.pair.repeatedByRole[role].pairs} | ${pct(summary.pair.repeatedByRole[role].performance.current.accuracy)} | ${pct(summary.pair.repeatedByRole[role].performance.history.accuracy)} |`), '',
  '这批数据中没有可以检验的同队同职责重装配对；重装不能直接套用该结论。目标仍是统计表现，不是瞄准、站位、决策或实际技能贡献的独立标签。', '',
  '## 配对历史量与表现', '',
  '| 以前共同场数 | 当前样本数 | 当前分差正确率 | 历史分差正确率 | 历史分差 MAE |', '| --- | ---: | ---: | ---: | ---: |',
  ...summary.pair.byHistory.map(group => `| ${group.history} | ${group.pairs} | ${pct(group.performance.current.accuracy)} | ${pct(group.performance.history.accuracy)} | ${fmt(group.performance.history.gapMae)} |`), '',
  '收敛抑制分差幅度，不能凭空增加领先方向的信息。样本少、分差接近零时不应包装成确定的技术差距。', '',
  '参数只使用更早比赛日，方法参考 [时间滚动验证](https://otexts.com/fpp3/tscv.html)。本赛季已被用于开发方向选择；跨日重复选手、队友及多项探索限制结论，探索区间不代表新赛季验证。完整数据、训练边界与排除项见 `report.json`。'
]
fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(outputReport, JSON.stringify(report, null, 2) + '\n')
fs.writeFileSync(path.join(output, 'report.md'), lines.join('\n') + '\n')
console.log(JSON.stringify({ output, nesting, sample: summary.sample, team: summary.team,
  pairs: { coverage: report.pairCoverage, all: summary.pair.all, repeated: summary.pair.repeated, byRole: summary.pair.repeatedByRole } }, null, 2))

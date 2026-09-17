import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { prepareValidationData } from './lib/seasonRatingValidation.mjs'
import { DIAGNOSTIC_POLICY, auditContextCoverage, buildDiagnosticRows, attachPeerResiduals, replayContextBiases, summarizeDiagnostics } from './lib/seasonRatingDiagnostics.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  if (!args.includes(name)) return fallback
  const value = args[args.indexOf(name) + 1]
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
  return value
}
const input = path.resolve(option('--input', 'public/data/fcr2026_local_public.json'))
const validationPath = path.resolve(option('--validation', 'artifacts/season-rating-validation-20260906/report.json'))
const output = path.resolve(option('--output', 'artifacts/season-rating-diagnostics-20260906'))
const directoryKey = directory => {
  const resolved = fs.existsSync(directory) ? fs.realpathSync(directory) : directory
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}
if (directoryKey(output) === directoryKey(path.dirname(validationPath))) throw new Error('Use a separate output directory to preserve source validation')
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const validationBytes = fs.readFileSync(validationPath)
const validation = JSON.parse(validationBytes)
const bytes = fs.readFileSync(input)
if (validation.policy?.version !== 'rolling-day-v1') throw new Error('Unsupported source validation policy')
if (hash(bytes) !== validation.provenance.inputSha256) throw new Error('Input snapshot changed: regenerate source validation')
for (const [file, expected] of Object.entries(validation.provenance.modelHashes)) {
  if (hash(fs.readFileSync(file)) !== expected) throw new Error(`Source model changed: ${file}; regenerate source validation`)
}
const files = ['scripts/diagnoseSeasonRatings.mjs', 'scripts/lib/seasonRatingDiagnostics.mjs', 'scripts/lib/seasonRatingCalibration.mjs', 'src/lib/heroes.js']
const diagnosticHashes = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]))
const data = prepareValidationData(JSON.parse(bytes), validation.provenance.seasonId)
const coverage = auditContextCoverage(data)
const built = buildDiagnosticRows(data, validation.folds)
const rows = attachPeerResiduals(built.rows)
const folds = replayContextBiases(rows)
const summary = summarizeDiagnostics(rows, folds)
if (summary.sample.observations !== validation.summary.sample.observations) throw new Error('Changed source observation cohort')
if (Math.abs(summary.performance.current.maeByMatch - validation.summary.performance.sampleAdjusted.maeByMatch) > 0.0001) throw new Error('Changed source forecast error')
for (const [file, expected] of Object.entries({ ...validation.provenance.modelHashes, ...diagnosticHashes })) {
  if (hash(fs.readFileSync(file)) !== expected) throw new Error(`Code changed during diagnostics: ${file}`)
}
if (hash(fs.readFileSync(input)) !== hash(bytes) || hash(fs.readFileSync(validationPath)) !== hash(validationBytes)) throw new Error('Source data changed during diagnostics')
const report = {
  generatedAt: new Date().toISOString(), policy: DIAGNOSTIC_POLICY,
  provenance: { input, inputSha256: hash(bytes), validationPath, validationSha256: hash(validationBytes),
    sourceModelHashes: validation.provenance.modelHashes, diagnosticHashes },
  interpretation: {
    status: 'Offline error-source investigation; no OVR, hero baseline, model weight or public ranking changed.',
    mapRecords: 'Raw scores are reconstructed with the strictly pre-day baseline. Time-weighting each player-role series must reproduce every original held-out target. A recorded hero label does not establish exact hero time or an uninterrupted composition.',
    sign: 'Residual = realized raw performance minus the earlier sample-adjusted score. Positive means underprediction, not evidence that a hero deserves a bonus.',
    weighting: 'Each series has equal total weight, each eligible player-role within it has equal weight, and map-record minutes split that player-role weight. Map-level absolute errors differ from series-level absolute errors.',
    peers: 'Same-team, same-map residual of other eligible players only, requiring at least two distinct peers. Same-day peer performance and map results are descriptive diagnostics, never fitting inputs for the rolling offsets.',
    conditionalReplay: 'Each facet is tested separately on top of a prior role-bias intercept. Effects are weighted historical residual means after subtracting historical role intercepts. Gates are fixed, no grid search. All parameters use earlier days, with unavailable effects falling back to role bias.',
    futureConditions: 'Actual hero, played map mode, final map duration and actual participant team are used to condition held-out map records. Their availability before the match is not established. This is a conditional normalization experiment, not deployable pre-match prediction or validated individual-skill ranking.',
    confounding: 'Hero, mode, team, opponent and duration overlap. Their associations cannot be added up as causal contributions. Peer-centering and repeated directions are descriptive, not causal controls.',
    repetition: 'A group must satisfy support gates. Its first and second halves of observed dates each need 10 observations, 3 series, 2 days, and absolute mean residual at least 2 with matching signs. This screen is exploratory and sees the full diagnostic sample.',
    multiplicity: 'All six prespecified facets are reported. Bootstrap intervals group by competition day; they do not adjust for multiple comparisons, same-season development or repeated players across days. A new-season check is needed before promoting any candidate.'
  }, coverage, reconciliation: built.reconciliation, summary,
  folds: folds.map(({ date, fitted }) => ({ date, fitted })), rows
}
const names = { current: '当前样本收敛分', roleMean: '同职责历史均值', roleBias: '只修正职责平均偏差',
  hero: '英雄', mode: '地图模式', team: '队伍', opponent: '对手赛前 Elo 档位', matchup: '赛前双方 Elo 差', duration: '地图时长' }
const fmt = value => value == null ? '—' : Number(value).toFixed(3)
const pct = value => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const interval = value => value ? `[${fmt(value.low)}, ${fmt(value.high)}]` : '样本不足'
const lines = [
  '# 评分误差来源：英雄、模式与团队环境', '',
  '本次研究现有统计分与后续表现的偏差，没有改动网页 OVR。所有结果属于同赛季回溯性探索，不是个人技术的独立验证。', '',
  `数据 SHA-256：\`${report.provenance.inputSha256}\`。`, '',
  '## 数据覆盖', '',
  `正常英雄记录 ${coverage.normalLogs} 条，对应 ${coverage.playerMapRecords} 个玩家职责地图记录；其中同一玩家职责地图含多个英雄记录的有 ${coverage.multipleHeroRecordsOnSamePlayerMap} 个。`, '',
  '| 字段 | 有效记录数 | 覆盖率 |', '| --- | ---: | ---: |',
  ...[['knownHero', '可识别英雄'], ['knownMode', '一致地图模式'], ['historicalTeam', '历史队伍'], ['opponentHistory', '对手至少 3 场历史'], ['matchupHistory', '双方至少 3 场历史'], ['mapDuration', '地图总时长'], ['explicitRowTime', '独立 rowTime'], ['minutesEqualMapDuration', '记录分钟等于地图总时长']]
    .map(([field, label]) => `| ${label} | ${coverage[field].rows} | ${pct(coverage.normalLogs ? coverage[field].rows / coverage.normalLogs : null)} |`), '',
  '地图按正式比赛 ID 和地图序号匹配；冲突、重复、行政图不猜测模式。英雄标签不能证明完整换人／换英雄时序，地图记录也不能直接代表持续不变的阵容。', '',
  '## 原验证目标对齐', '',
  `对齐原先全部 ${built.reconciliation.observations} 个选手职责场次，展开为 ${summary.sample.mapRecords} 条地图记录、${summary.sample.maps} 张图。原始分按记录分钟聚合后与原目标最大差异为 ${built.reconciliation.maxError.toExponential(2)}。当前按场等权平均绝对误差仍为 ${fmt(summary.performance.current.maeByMatch)}。`, '',
  '残差 = 实际原始表现 − 赛前样本收敛分。正数表示预测偏低；不是应该给某英雄加分的结论。每场总权重相等，场内选手职责等权，再按地图记录分钟分配。', '',
  '## 同队是否一起高于或低于预测', '',
  `至少有两位其他合资格队友的地图记录 ${summary.peerContext.mapRecords} 条，覆盖 ${summary.peerContext.matches} 场、${summary.peerContext.days} 日。本人残差与其他队友平均残差的加权相关为 ${fmt(summary.peerContext.correlation)}，同方向权重占比 ${pct(summary.peerContext.sameSignWeightShare)}。队友均值排除本人全部英雄记录。`, '',
  '| 当图结果（仅描述） | 场次观测数 | 平均残差 | 扣除其他队友残差后的差值 |', '| --- | ---: | ---: | ---: |',
  ...summary.outcomeDiagnostics.map(group => `| ${group.id} | ${group.support.observations} | ${fmt(group.bias)} | ${fmt(group.peerAdjustedBias)} |`), '',
  '队友本场表现与本场胜负都只用于诊断，不能用作赛前特征；相关性不能区分个人作用、团队协同、对手或地图节奏的因果贡献。', '',
  '## 哪些分组方向反复出现', '',
  '样本门槛固定为至少 20 个不同选手职责场次、8 场、4 日、5 位玩家。日期前后两半各需至少 10 个观测、3 场、2 日，平均残差同号且绝对值均达到 2，才标记为方向重复。小样本仍保留在 JSON，不据它调整评分。', '',
  '| 因素 | 总分组 | 样本足够 | 前后方向重复 |', '| --- | ---: | ---: | ---: |',
  ...Object.entries(summary.groups).map(([facet, groups]) => `| ${names[facet]} | ${groups.length} | ${groups.filter(group => group.sufficient).length} | ${groups.filter(group => group.repeatDirection).length} |`), '',
  '| 因素 / 分组 | 观测 / 场 / 日 / 人 | 前半残差 | 后半残差 | 扣除队友后残差 |', '| --- | ---: | ---: | ---: | ---: |',
  ...Object.entries(summary.groups).flatMap(([facet, groups]) => groups.filter(group => group.repeatDirection).map(group => `| ${names[facet]} / ${group.id} | ${group.support.observations} / ${group.support.matches} / ${group.support.days} / ${group.support.players} | ${fmt(group.halves[0].bias)} | ${fmt(group.halves[1].bias)} | ${fmt(group.peerAdjustedBias)} |`)), '',
  '上述分组互有重叠，不能把偏差相加作为误差来源百分比。队友差值也是描述性比较，未消除英雄专精、阵容选择或对手选择的影响。', '',
  '## 过去的偏差能否延续到后续记录', '',
  '先只用以前日期估计职责平均残差，作为共同对照；再分别加入一个因素的历史平均偏差。因素不足门槛则回退职责对照，不叠加多个因素，也不根据结果搜索参数。', '',
  '**这里是给定实际英雄、实际地图和时长的条件校正实验，并非赛前预测成绩。** 实际阵容信息是否提前可用没有历史证据。测试中的队伍与该玩家此前队伍不一致的场次观测为 ' + summary.teamChanges + ' 个。对手 Elo 数值本身只用更早日期赛果。', '',
  '| 方法 | 场次平均绝对误差 | 相对职责对照差值 | 差值探索区间 | 成对排序正确率 | 因素启用权重 |', '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...Object.entries(summary.performance).map(([model, metric]) => `| ${names[model]} | ${fmt(metric.maeByMatch)} | ${fmt(metric.differenceFromRoleBias)} | ${interval(metric.differenceInterval)} | ${pct(metric.meanPairConcordance)} | ${pct(metric.activatedWeightShare)} |`), '',
  ...(summary.performance.team.activatedWeightShare === 0 ? ['本轮固定队伍偏差在待检验记录中的启用权重为 0：没有队伍在满足历史门槛后又提供可检验记录。因此该行完全沿用职责对照，不能据此判断队伍偏差校正有效或无效。', ''] : []),
  '差值为负表示误差下降。排序在同日同职责至少 6 位不同选手的共同组计算，预测同分计半分；加入队伍因素带来的跨队排序变化不能当成队内个人技术区分的证明。', '',
  '六项探索都完整报告。探索区间按比赛日重抽样，没有校正多重比较、同赛季开发选择和跨日重复玩家。新赛事的检验仍是后续模型接入前的重要证据。', '',
  '方法参考：[残差诊断](https://otexts.com/fpp3/diagnostics.html)、[时间滚动验证](https://otexts.com/fpp3/tscv.html)。完整分组、逐日参数和记录见 `report.json`。'
]
fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
fs.writeFileSync(path.join(output, 'report.md'), lines.join('\n') + '\n')
console.log(JSON.stringify({ output, coverage, reconciliation: built.reconciliation, sample: summary.sample,
  peers: summary.peerContext, performance: summary.performance,
  repeatGroups: Object.fromEntries(Object.entries(summary.groups).map(([facet, groups]) => [facet, groups.filter(group => group.repeatDirection)])) }, null, 2))

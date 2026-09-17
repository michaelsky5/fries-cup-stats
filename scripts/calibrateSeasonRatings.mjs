import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { CALIBRATION_POLICY, replayCalibration, summarizeCalibration } from './lib/seasonRatingCalibration.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  if (!args.includes(name)) return fallback
  const value = args[args.indexOf(name) + 1]
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
  return value
}
const input = path.resolve(option('--input', 'public/data/fcr2026_local_public.json'))
const validationPath = path.resolve(option('--validation', 'artifacts/season-rating-validation-20260906/report.json'))
const output = path.resolve(option('--output', 'artifacts/season-rating-calibration-20260906'))
const directoryKey = directory => {
  const resolved = fs.existsSync(directory) ? fs.realpathSync(directory) : directory
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}
if (directoryKey(output) === directoryKey(path.dirname(validationPath))) throw new Error('Use a separate output directory to preserve the source validation report')
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const bytes = fs.readFileSync(validationPath)
const validation = JSON.parse(bytes)
if (validation.policy?.version !== 'rolling-day-v1') throw new Error('Unsupported source validation protocol')
if (hash(fs.readFileSync(input)) !== validation.provenance.inputSha256) throw new Error('Input snapshot changed: regenerate the source validation report first')
for (const [file, expected] of Object.entries(validation.provenance.modelHashes)) {
  if (hash(fs.readFileSync(file)) !== expected) throw new Error(`Source model changed: ${file}. Regenerate validation first.`)
}
const calibrationFiles = ['scripts/calibrateSeasonRatings.mjs', 'scripts/lib/seasonRatingCalibration.mjs']
const calibrationHashes = Object.fromEntries(calibrationFiles.map(file => [file, hash(fs.readFileSync(file))]))
const folds = replayCalibration(validation.folds)
const summary = summarizeCalibration(folds)
if (summary.sample.observations !== validation.summary.sample.observations) throw new Error('Calibration changed the validation cohort')
for (const [file, before] of Object.entries({ ...validation.provenance.modelHashes, ...calibrationHashes })) {
  if (hash(fs.readFileSync(file)) !== before) throw new Error(`Code changed during calibration: ${file}`)
}
if (hash(fs.readFileSync(validationPath)) !== hash(bytes) || hash(fs.readFileSync(input)) !== validation.provenance.inputSha256) throw new Error('Source data changed during calibration')
const report = {
  generatedAt: new Date().toISOString(), policy: CALIBRATION_POLICY,
  provenance: { input, inputSha256: validation.provenance.inputSha256, seasonId: validation.provenance.seasonId,
    validationPath, validationSha256: hash(bytes), validationPolicy: validation.policy,
    sourceModelHashes: validation.provenance.modelHashes, calibrationHashes },
  interpretation: {
    status: 'Offline research candidate only; no production OVR, ranking or team-outcome model changes.',
    target: validation.interpretation.performanceTarget,
    training: 'Fit each day using only earlier out-of-time forecast/target pairs. A complete competition day is predicted before any of its labels enter training. Role training falls back to pooled roles and then current sample adjustment.',
    fitting: 'Each series has equal fitting weight within the selected role or pooled sample. Alpha minimizes squared error without an intercept and is clipped to [0, 1]. Gates and formula are fixed for this replay, without searching alternative candidates.',
    uncertainty: 'Bands use only errors from predictions actually emitted before earlier labels were seen, including warm-up fallback predictions. They are empirical 80% future raw-performance bands, not OVR or technical-skill confidence intervals. Distribution drift and repeated players prevent a coverage guarantee.',
    discrimination: 'A positive shared role alpha preserves raw-score ordering within a date-role group. This candidate calibrates magnitude; it does not add new skill signals. Flat groups receive half credit for pair concordance and remain in the report.',
    rankings: 'One player per date-role group; same-day series targets are averaged equally. Groups need at least six distinct players. Spearman is compared only in common nonconstant groups; pair concordance also retains collapsed groups.',
    independenceLimit: 'The candidate direction was chosen after seeing the original same-season report. Even with past-only parameter fitting, this is retrospective development evidence, not a pristine holdout. Fixed source rules also had access to this season.',
    intervalsOfDifferences: 'Exploratory competition-day cluster bootstrap. Does not correct for choosing this development direction, returning-player selection or repeated players across days.'
  }, summary, folds
}
const names = { neutral: '固定 50 分', roleMean: '同职责历史均值', rawAverage: '个人历史原始均分', sampleAdjusted: '当前样本收敛分', learnedRoleShrink: '按职责学习收敛（候选）', opponentOvr: '当前 v1.4 OVR' }
const fmt = value => value == null ? '—' : Number(value).toFixed(3)
const pct = value => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const interval = value => value ? `[${fmt(value.low)}, ${fmt(value.high)}]` : '样本不足'
const candidate = summary.performance.learnedRoleShrink
const lines = [
  '# 按职责学习收敛与未来表现范围：离线候选', '',
  '本报告比较原始数据表现分的预测，不改动网页 OVR。候选方向是在看过上一轮同赛季报告后确定，因此仍属回溯开发证据。', '',
  `数据 SHA-256：\`${report.provenance.inputSha256}\`。基础逐日验证报告 SHA-256：\`${report.provenance.validationSha256}\`。`, '',
  '## 固定方法', '',
  '- 预测 = 同职责历史均值 + α ×（个人历史原始均分 − 同职责历史均值）。α 限制在 0–1，按此前预测与实际表现的配对数据、各场等权最小化平方误差。',
  `- 学习门槛：至少 ${CALIBRATION_POLICY.minimumObservations} 条记录、${CALIBRATION_POLICY.minimumMatches} 场、${CALIBRATION_POLICY.minimumDays} 日、${CALIBRATION_POLICY.minimumPlayerRoles} 个选手职责。该职责不足时用整体历史，再不足时沿用当前样本收敛分。没有搜索其他公式或门槛。`,
  '- 只学习比赛日之前已发生的预测与结果，同一天所有比赛先预测、再纳入历史。原验证的英雄基线也只使用更早日期，关闭冻结基线。',
  '- 误差带取此前真正发出的预测的绝对误差第 80 百分位；包含早期回退预测。它是未来原始统计表现范围，不是个人技术能力或 OVR 的置信区间，亦不保证未来覆盖 80%。', '',
  '## 同样本误差', '',
  `共 ${summary.sample.observations} 条、${summary.sample.matches} 场、${summary.sample.days} 日、${summary.sample.playerRoles} 个选手职责。学习参数用于 ${summary.sample.learnedObservations} 条（职责 ${summary.sample.roleFitObservations}、整体 ${summary.sample.pooledFitObservations}）；${summary.sample.fallbackObservations} 条沿用现有分数。`, '',
  '每场先平均个人绝对误差，再对各场等权。负差值表示候选误差更小。比较目标由当前数据指标定义，不能视为独立技术标签。', '',
  '| 方法 | 平均绝对误差 | 观测 RMSE | 相对当前误差差值 | 差值探索区间 |', '| --- | ---: | ---: | ---: | --- |',
  ...Object.entries(summary.performance).map(([model, metric]) => `| ${names[model]} | ${fmt(metric.maeByMatch)} | ${fmt(metric.rmseByObservation)} | ${fmt(metric.differenceFromCurrent)} | ${interval(metric.differenceFromCurrentInterval)} |`), '',
  `候选相对同职责均值的误差差值：${fmt(candidate.differenceFromRoleMean)}，探索区间 ${interval(candidate.differenceFromRoleMeanInterval)}。`, '',
  `仅学习已启用的共同样本：${summary.learnedOnly.sample.observations} 条、${summary.learnedOnly.sample.matches} 场；当前误差 ${fmt(summary.learnedOnly.performance.sampleAdjusted.maeByMatch)}，候选 ${fmt(summary.learnedOnly.performance.learnedRoleShrink.maeByMatch)}，职责均值 ${fmt(summary.learnedOnly.performance.roleMean.maeByMatch)}。`, '',
  '## 区分选手能力', '',
  '同日同职责按不同选手计算，至少 6 人；同人同日多场目标等权平均。成对顺序正确率对预测同分计半分，因此分数全部收缩到均值的组不会消失。Spearman 只比较所有方法均非恒定的共同组。正 α 不改变个人原始均分的组内顺序，误差变小本身不能说明排序能力提高。', '',
  '| 方法 | 成对顺序正确率 | 共同组平均 Spearman | 共同组 / 总组 | 恒定预测组 |', '| --- | ---: | ---: | ---: | ---: |',
  ...Object.entries(summary.rankings).map(([model, metric]) => `| ${names[model]} | ${pct(metric.meanPairConcordance)} | ${fmt(metric.meanCommonSpearman)} | ${metric.commonSpearmanGroups} / ${metric.groups} | ${metric.constantPredictionGroups} |`), '',
  `候选相对当前收敛分的成对正确率差值 ${fmt(summary.rankings.learnedRoleShrink.pairDifferenceFromCurrent == null ? null : summary.rankings.learnedRoleShrink.pairDifferenceFromCurrent * 100)} 个百分点，探索区间 ${interval(summary.rankings.learnedRoleShrink.pairDifferenceInterval)}（比例单位）。原始分与候选组内标准差均值分别为 ${fmt(summary.rankings.rawAverage.meanPredictionSd)}、${fmt(summary.rankings.learnedRoleShrink.meanPredictionSd)}；OVR 与原始分的标准差不可直接比较。`, '',
  '## 未来表现范围', '',
  '只比较两种方法都已有足够历史误差的共同样本；覆盖率按观测计算，JSON 另提供按比赛等权结果。范围未人为截断。', '',
  '| 方法 | 样本数 | 实际覆盖率 | 平均区间宽度 |', '| --- | ---: | ---: | ---: |',
  ...Object.entries(summary.intervals.metrics).map(([model, metric]) => `| ${names[model]} | ${metric.observations} | ${pct(metric.coverageByObservation)} | ${fmt(metric.meanWidth)} |`), '',
  '| 职责 | 样本数 | 候选实际覆盖率 | 候选平均宽度 |', '| --- | ---: | ---: | ---: |',
  ...Object.entries(summary.intervals.byRole).map(([role, metric]) => `| ${role} | ${metric.learnedRoleShrink.observations} | ${pct(metric.learnedRoleShrink.coverageByObservation)} | ${fmt(metric.learnedRoleShrink.meanWidth)} |`), '',
  '## 最后一个留出日前的参数', '',
  `预测日：${summary.latestParameters?.beforeExclusive ?? '—'}。这些是该日之前的训练参数，不是用完整赛季拟合的最终上线参数。`, '',
  '| 职责 | α（保留原始分差的比例） | 来源 | 历史条数 / 场 / 日 |', '| --- | ---: | --- | ---: |',
  ...Object.entries(summary.latestParameters?.byRole ?? {}).map(([role, entry]) => `| ${role} | ${fmt(entry.alpha)} | ${entry.source} | ${entry.training.observations} / ${entry.training.matches} / ${entry.training.days} |`), '',
  '当前没有把候选接入 OVR、排名、对手强度或胜负预测。仅评价达到正式资格且继续参赛的选手，存在同队与跨日重复依赖。探索区间不能消除同赛季开发选择的影响，需要新赛事数据检验。', '',
  '方法参考：[Forecasting: Principles and Practice — Time series cross-validation](https://otexts.com/fpp3/tscv.html)。完整参数、历史边界、逐条预测和误差带见 `report.json`。'
]
fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
fs.writeFileSync(path.join(output, 'report.md'), lines.join('\n') + '\n')
console.log(JSON.stringify({ output, sample: summary.sample, performance: summary.performance, rankings: summary.rankings,
  intervals: summary.intervals, latestParameters: summary.latestParameters }, null, 2))

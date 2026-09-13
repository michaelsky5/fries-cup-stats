import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { prepareValidationData, forecastAtDate, evaluateDate, summarizeValidation, VALIDATION_POLICY } from './lib/seasonRatingValidation.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const input = path.resolve(option('--input', 'public/data/fcr2026_local_public.json'))
const output = path.resolve(option('--output', 'artifacts/season-rating-validation-20260906'))
const seasonId = option('--season', 'FCR26')
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const modelFiles = ['src/config/ratingModelConfig.js', 'src/config/heroSubroles.js', 'src/lib/ratingBaselines.js', 'src/lib/ratingModel.js', 'src/lib/scoringEngineAdapter.js', 'src/lib/leaderboardScoring.js', 'src/lib/seasonRatingPolicy.js', 'src/lib/seasonOpponentStrength.js', 'scripts/lib/seasonRatingValidation.mjs']
const modelHashes = Object.fromEntries(modelFiles.map(file => [file, hash(fs.readFileSync(file))]))
const bytes = fs.readFileSync(input)
const db = JSON.parse(bytes)
const data = prepareValidationData(db, seasonId)
const dates = [...new Set(data.matches.map(row => row.date))].sort()
const folds = []
for (const date of dates) {
  const forecast = forecastAtDate(data, date)
  folds.push(evaluateDate(data, forecast))
}
for (const [file, before] of Object.entries(modelHashes)) {
  if (hash(fs.readFileSync(file)) !== before) throw new Error(`Model file changed during validation: ${file}`)
}
const summary = summarizeValidation(folds)
const report = {
  generatedAt: new Date().toISOString(), policy: VALIDATION_POLICY,
  provenance: { input, inputSha256: hash(bytes), seasonId, modelHashes },
  data: { selectedLogs: data.cleaning.rawSelectedLogs, cleanedLogs: data.cleaning.validLogs, usableNormalLogs: data.logs.length, normalMatches: data.matches.length, normalMatchesWithLogs: new Set(data.logs.map(row => row.matchId)).size, excludedLogs: data.excluded },
  interpretation: {
    performanceTarget: 'Future player-role series raw performance evaluated against a baseline rebuilt strictly from earlier competition days. This tests persistence of the chosen statistical construct, not independently labelled technical skill.',
    outcomeTarget: 'Normal series winner. Both teams must have a prior-data-only 1 tank / 2 DPS / 2 support lineup; choose past participation leaders, never the actual held-out lineup. Draws excluded; tied predictions receive half credit.',
    baselinePolicy: 'Swiss-final frozen baseline disabled. All data-driven baselines, sample counts, player histories, team assignments and opponent histories are reconstructed before each date. Current fixed hand-designed weights remain unchanged.',
    intervals: 'Exploratory competition-day cluster bootstrap, preserving same-day dependence. Repeated players across days and selection of returning players remain limitations.',
    independenceLimit: 'Current rules were designed with access to this season. This is retrospective temporal evaluation of fixed rules, not a pristine prospective holdout or cross-season validation.',
    outcomeLimit: 'Winning is a team outcome, so successful winner prediction does not establish individual skill validity.'
  },
  summary,
  folds
}
fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
const fmt = (value, digits = 3) => value == null ? '—' : Number(value).toFixed(digits)
const pct = value => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const names = { neutral: '固定 50 分', roleMean: '同职责历史均值', rawAverage: '个人历史原始均分', sampleAdjusted: '当前样本收敛分', lastMatch: '上一场表现', recentThree: '最近三场均分', baseOvr: '原 OVR（v1.3）', opponentOvr: '对手校正 OVR（v1.4）', teamElo: '赛前队伍 Elo' }
const interval = value => value ? `[${fmt(value.low)}, ${fmt(value.high)}]` : '样本不足'
const lines = [
  '# 赛季评分：基于现有数据的时间验证', '',
  `数据 SHA-256：\`${report.provenance.inputSha256}\`。固定当前规则逐日回放，基线每次仅使用比赛日之前的数据，关闭赛季末冻结基线。`, '',
  `可用正常赛果 ${report.data.normalMatches} 场，其中 ${report.data.normalMatchesWithLogs} 场有有效玩家记录；有效正常英雄记录 ${report.data.usableNormalLogs} 条。`, '',
  '## 后续个人数据表现', '',
  `纳入 ${summary.sample.observations} 个选手 × 职责 × 比赛样本，覆盖 ${summary.sample.playerRoles} 个选手职责、${summary.sample.performanceMatches} 场比赛、${summary.sample.performanceDays} 个比赛日。预测时要求正式样本资格，目标比赛本职责至少 ${VALIDATION_POLICY.minimumTargetMinutes} 分钟。`, '',
  '目标是后续比赛的原始数据表现分。误差越小越好；每场先平均选手误差，再对各场等权。这个目标仍由现有指标定义，衡量其后续延续性，不能当成独立技术标签。', '',
  '| 预测方法 | 平均绝对误差 | 相对当前收敛分的误差差值 | 差值探索区间 |',
  '| --- | ---: | ---: | --- |',
  ...Object.entries(summary.performance).map(([name, metric]) => `| ${names[name]} | ${fmt(metric.maeByMatch)} | ${fmt(metric.maeDifferenceFromSampleAdjusted)} | ${interval(metric.differenceInterval)} |`), '',
  '## OVR 对后续表现的排序', '',
  '同一比赛日、同一职责内计算 Spearman 排序相关，每组至少 6 条。相关越高表示前期排名与后续表现顺序越一致。按组汇总，避免将不同日期重建的基线直接混为一个相关系数。', '',
  '| 方法 | 分组相关中位数 | 分组相关平均数 | 组数 |', '| --- | ---: | ---: | ---: |',
  ...Object.entries(summary.rankings).map(([name, metric]) => `| ${names[name]} | ${fmt(metric.medianWithinDateRoleSpearman)} | ${fmt(metric.meanWithinDateRoleSpearman)} | ${metric.groups} |`), '',
  '## 正常比赛胜负', '',
  `共同样本 ${summary.sample.outcomeMatches} 场、${summary.sample.outcomeDays} 个比赛日。根据历史出场时长选出 1 重装、2 输出、2 支援；两队均需满足该样本要求，不能使用待验证比赛的实际首发名单。比较两边平均评分，预测分相同时计半个正确。`, '',
  '| 方法 | 匹配率（同分半计） | 明确正确 | 同分预测 | 样本数 |', '| --- | ---: | ---: | ---: | ---: |',
  ...Object.entries(summary.winners).map(([name, metric]) => `| ${names[name]} | ${pct(metric.accuracyWithHalfCreditForTies)} | ${metric.correct} | ${metric.tiedPredictions} | ${metric.n} |`), '',
  '## 解释范围', '',
  '- 不需要新增人工标注；结果可从同一份公开 JSON 重复计算。',
  '- 每个比赛日整体留出，同一天的比赛与英雄片段不会拆到训练集里。玩家赛季汇总、当前队伍及最终排名不用于重建历史评分。',
  '- 样本收敛、个人历史均值、最近表现与常数／职责均值在同一批样本比较；v1.3 与 v1.4 也使用共同样本。',
  '- 当前权重曾参考本赛季数据，因此这是固定规则的回溯性时间验证；真正的新赛季验证仍需未来数据。',
  '- 只有继续参赛且数据足够的选手进入个人评估；样本选择及跨日重复玩家限制了推广范围。按比赛日重抽样的区间仅作探索。',
  '- 场次胜负是团队结果；预测胜负有效，不等于个人技术排名已得到证明。',
  '- 本次只新增离线验证工具与报告，评分页面和生产模型规则未变。', '',
  '方法参考：[Forecasting: Principles and Practice — Time series cross-validation](https://otexts.com/fpp3/tscv.html)。', '',
  '完整分日训练范围、排除计数、预测与目标见同目录 `report.json`。'
]
fs.writeFileSync(path.join(output, 'report.md'), lines.join('\n') + '\n')
console.log(JSON.stringify({ output, data: report.data, sample: summary.sample, performance: summary.performance, rankings: summary.rankings, winners: summary.winners, byRole: summary.byRole }, null, 2))

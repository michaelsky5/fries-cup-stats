import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { getStatisticalRatingDataset } from '../src/lib/statisticalRatingAdapter.js'
import { mapRawScoreToMapRating } from '../src/lib/ratingModel.js'
import { MAP_RATING_CONFIG } from '../src/config/ratingModelConfig.js'

const args = process.argv.slice(2)
const option = name => args[args.indexOf(name) + 1]
assert.ok(args.includes('--inputs') && args.includes('--output'), 'Usage: node scripts/analyzeRatingDisplayCandidates.mjs --inputs FORWARD_LOCK_DIR --output REPORT_DIR')
const input = resolve(option('--inputs'))
const output = resolve(option('--output'))
const sourceBytes = readFileSync(resolve(input, 'baseline-sources.json'))
const sources = JSON.parse(sourceBytes)
const lock = JSON.parse(readFileSync(resolve(input, 'forward-lock.json')))
assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), lock.baselineSourcesSha256, 'The input manifest must match the forward lock')
const candidates = [
  { id: 'current', label: '当前刻度', curve: MAP_RATING_CONFIG.curve },
  { id: 'gentle', label: '温和反馈候选', upper: [7.9, 8.6, 9.2, 9.6, 9.8] },
  { id: 'highlight', label: '高分反馈候选', upper: [8.0, 8.8, 9.4, 9.7, 9.8] }
].map(candidate => ({ ...candidate, curve: candidate.curve || MAP_RATING_CONFIG.curve.map((point, index) =>
  ({ ...point, value: point.percentile <= 50 ? point.value : candidate.upper[index - 4] })) }))
const score = (raw, candidate) => typeof raw === 'number' && Number.isFinite(raw)
  ? mapRawScoreToMapRating(raw, { curve: candidate.curve }) : null
const round = value => +value.toFixed(3)
function summary(values) {
  const available = values.filter(value => value !== null).sort((a, b) => a - b)
  return { available: available.length, missing: values.length - available.length,
    mean: available.length ? round(available.reduce((sum, value) => sum + value, 0) / available.length) : null,
    median: available.length ? available[Math.floor(available.length / 2)] : null,
    min: available[0] ?? null, max: available.at(-1) ?? null,
    atLeast8: available.filter(value => value >= 8).length, atLeast8_5: available.filter(value => value >= 8.5).length,
    atLeast9: available.filter(value => value >= 9).length }
}
for (const candidate of candidates) {
  assert.equal(score(null, candidate), null)
  assert.equal(score(50, candidate), 7)
  let previous = -Infinity
  for (let step = 0; step <= 100000; step++) {
    const raw = step / 1000
    const value = score(raw, candidate)
    assert.ok(value >= previous && value >= 5.5 && value <= 9.8, `${candidate.id}: non-monotone or out of range at ${raw}`)
    if (raw <= 50) assert.equal(value, score(raw, candidates[0]))
    previous = value
  }
}
const observations = []
const inputHashes = []
for (const source of sources.seasonInputs) {
  const bytes = readFileSync(resolve(input, source.file))
  const db = JSON.parse(bytes)
  inputHashes.push({ seasonId: source.seasonId, sha256: createHash('sha256').update(bytes).digest('hex') })
  const dataset = getStatisticalRatingDataset(db, source.seasonId)
  for (const row of dataset.rows) {
    const rating = dataset.scores.get(row.rowId)
    observations.push({ season: source.seasonId, match: row.matchId, map: row.mapOrder, team: row.teamId,
      player: row.playerId, role: row.resolution.officialRole, raw: rating.rawScore })
  }
}
function bestGroups(rows, candidate) {
  const groups = new Map()
  for (const row of rows.filter(row => row.raw !== null)) {
    const key = [row.season, row.match, row.map, row.team].join('|')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return new Map([...groups].map(([key, rows]) => {
    const high = Math.max(...rows.map(row => score(row.raw, candidate)))
    return [key, rows.filter(row => score(row.raw, candidate) === high).map(row => row.player).sort().join('|')]
  }))
}
const targetIds = new Set(['FCW26-SWISS-R1-M13', 'FCW26-SWISS-R1-M14', 'FCW26-SWISS-R1-M15'])
const target = observations.filter(row => row.season === 'FCW26' && targetIds.has(row.match))
assert.equal(target.length, 150)
const baselineBest = bestGroups(target, candidates[0])
assert.equal(baselineBest.size, 30)
const report = {
  schema: 'statistical-rating-display-review-v1', generatedAt: new Date().toISOString(), inputLock: lock.lockId,
  sourceManifestSha256: createHash('sha256').update(sourceBytes).digest('hex'), inputHashes,
  productionChange: false, candidatesSelected: false, accuracyValidated: false, playerEnjoymentValidated: false,
  rule: 'Fixed global display curves; values at or below raw 50 are unchanged; raw scores, eligibility, opponent adjustment and OVR are not recalculated.',
  countingUnit: 'Unweighted normalized player-map observation; archived seasons are diagnostic replay only, not a proposed activation.',
  mathematicalChecks: { gridsPerCurve: 100001, lowerHalfUnchanged: true, monotone: true, missingRemainsNull: true },
  curves: candidates.map(({ upper: _upper, ...candidate }) => candidate),
  overall: candidates.map(candidate => ({ id: candidate.id, ...summary(observations.map(row => score(row.raw, candidate))) })),
  target: candidates.map(candidate => {
    const best = bestGroups(target, candidate)
    return { id: candidate.id, ...summary(target.map(row => score(row.raw, candidate))),
      teamMapGroups: best.size, teamBestTieGroupsChanged: [...best].filter(([key, winners]) => winners !== baselineBest.get(key)).length }
  }),
  bySeason: sources.seasonInputs.map(source => ({ season: source.seasonId,
    results: candidates.map(candidate => ({ id: candidate.id, ...summary(observations.filter(row => row.season === source.seasonId).map(row => score(row.raw, candidate))) })) }))
}
mkdirSync(output, { recursive: true })
writeFileSync(resolve(output, 'candidate-display-review.json'), JSON.stringify(report, null, 2) + '\n')
const labels = Object.fromEntries(candidates.map(candidate => [candidate.id, candidate.label]))
const lines = [
  '# 评分显示刻度候选回放（尚未上线）', '',
  '用户决定：本次先上线比赛详情展示整理；新刻度只做候选回放。正式评分、MVP 与 OVR 保持现行规则。', '',
  '候选只更改原始分超过 50 时的十分制显示映射，原始 50 仍显示 7.0，50 以下完整保留现行曲线。所有候选使用同一条固定曲线，不按选手、英雄、胜负或当前地图名次分配高分。锚点是产品设计候选，没有按目标均分或高分比例拟合，也未验证玩家体验。', '',
  '## 固定映射锚点', '',
  '| 原始分 | 当前刻度 | 温和候选 | 高分反馈候选 |', '| ---: | ---: | ---: | ---: |',
  ...MAP_RATING_CONFIG.curve.map(point => `| ${point.percentile} | ${candidates.map(candidate => score(point.percentile, candidate).toFixed(1)).join(' | ')} |`), '',
  '## 10 月 11 日三场，共 150 条选手地图记录', '',
  '| 刻度 | 均分 | 8 分及以上 | 8.5 分及以上 | 9 分及以上 | 最高分 | 本队最佳并列集合变化 |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...report.target.map(result => `| ${labels[result.id]} | ${result.mean.toFixed(2)} | ${result.atLeast8} | ${result.atLeast8_5} | ${result.atLeast9} | ${result.max.toFixed(1)} | ${result.teamBestTieGroupsChanged} / ${result.teamMapGroups} |`), '',
  '## 四份锁定快照的计算检查', '',
  ...report.overall.map(result => `- ${labels[result.id]}：${result.available} 条可显示、${result.missing} 条缺分；选手地图条目均分 ${result.mean.toFixed(2)}，8 分及以上 ${result.atLeast8} 条，9 分及以上 ${result.atLeast9} 条。`), '',
  '每条曲线检查 100,001 个原始分点，均单调、范围 5.5–9.8、同分同待遇、缺分保持空值。这验证显示规则，不证明原始评分准确或玩家更满意。四份快照的候选重放不启用已归档赛事的新模型。', '',
  '取一位小数后，本队最高显示分的并列集合可能变化。若将来采用新刻度，需要明确地图最佳标记如何处理这些并列；不能把“单调”直接等同于所有显示奖项都完全不变。', '',
  `输入锁：\`${lock.lockId}\`。详细输入哈希、逐赛事统计及规则见 candidate-display-review.json。`, '',
  '建议先观察修整后的页面体验。若继续评估刻度，优先讨论温和候选；尚未选定或上线任何新曲线。', ''
]
writeFileSync(resolve(output, 'candidate-display-review.md'), lines.join('\n'))
console.log(JSON.stringify({ observations: observations.length, overall: report.overall, target: report.target, checks: report.mathematicalChecks, report: resolve(output, 'candidate-display-review.md') }, null, 2))

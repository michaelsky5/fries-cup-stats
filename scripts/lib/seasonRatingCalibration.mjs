import { bootstrapByDate, spearman, VALIDATION_POLICY } from './seasonRatingValidation.mjs'

// One prespecified offline candidate. Do not select these gates on the held-out day.
export const CALIBRATION_POLICY = Object.freeze({
  version: 'role-shrink-prequential-v1',
  minimumObservations: 30, minimumMatches: 5, minimumDays: 3, minimumPlayerRoles: 10,
  minimumRankPlayers: VALIDATION_POLICY.minimumRankGroup,
  intervalCoverage: 0.8,
  formula: 'roleMean + alpha * (rawAverage - roleMean)',
  fitting: 'match-balanced least squares through the role prior; alpha bounded to [0, 1]',
  fallback: 'pooled earlier roles, then current sample-adjusted score',
  interval: 'earlier prequential absolute-error empirical quantile; no coverage guarantee'
})
const roles = ['TANK', 'DPS', 'SUPPORT']
const models = ['neutral', 'roleMean', 'rawAverage', 'sampleAdjusted', 'learnedRoleShrink']
const rankModels = ['rawAverage', 'sampleAdjusted', 'learnedRoleShrink', 'opponentOvr']
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const round = value => Number.isFinite(value) ? Number(value.toFixed(6)) : null
const groupBy = (rows, key) => {
  const groups = new Map()
  for (const row of rows) {
    const id = key(row)
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(row)
  }
  return groups
}
const matchKey = row => `${row.date}:${row.matchId}`
const valid = row => roles.includes(row.role) && row.date && row.matchId && row.entryKey &&
  [row.target, row.predictions?.roleMean, row.predictions?.rawAverage, row.predictions?.sampleAdjusted].every(Number.isFinite)
const support = rows => ({
  observations: rows.length, matches: new Set(rows.map(matchKey)).size,
  days: new Set(rows.map(row => row.date)).size, playerRoles: new Set(rows.map(row => row.entryKey)).size,
  maxLabelDate: rows.length ? rows.map(row => row.date).sort().at(-1) : null
})
const enough = counts => counts.observations >= CALIBRATION_POLICY.minimumObservations &&
  counts.matches >= CALIBRATION_POLICY.minimumMatches && counts.days >= CALIBRATION_POLICY.minimumDays &&
  counts.playerRoles >= CALIBRATION_POLICY.minimumPlayerRoles
const supportedPool = (history, role) => {
  const own = history.filter(row => row.role === role)
  if (enough(support(own))) return { rows: own, source: 'role', counts: support(own) }
  if (enough(support(history))) return { rows: history, source: 'pooled', counts: support(history) }
  return { rows: [], source: 'unavailable', counts: support(history) }
}

export function fitRoleCalibration(history, beforeExclusive) {
  // Filtering here as well as in the replay prevents callers from admitting same-day labels.
  const prior = history.filter(row => row.date < beforeExclusive && valid(row))
  const byRole = Object.fromEntries(roles.map(role => {
    const pool = supportedPool(prior, role)
    if (!pool.rows.length) return [role, { alpha: null, source: 'current-fallback', training: pool.counts }]
    let numerator = 0
    let denominator = 0
    for (const rows of groupBy(pool.rows, matchKey).values()) {
      for (const row of rows) {
        const x = row.predictions.rawAverage - row.predictions.roleMean
        const y = row.target - row.predictions.roleMean
        numerator += x * y / rows.length
        denominator += x * x / rows.length
      }
    }
    // With no historical separation there is no estimable slope; use the role prior.
    const alpha = denominator > 1e-12 ? Math.max(0, Math.min(1, numerator / denominator)) : 0
    return [role, { alpha, source: pool.source, training: pool.counts, degenerate: denominator <= 1e-12 }]
  }))
  return { beforeExclusive, byRole }
}

export function predictCalibrated(predictions, role, calibration) {
  const alpha = calibration.byRole[role]?.alpha
  if (![predictions?.roleMean, predictions?.rawAverage, predictions?.sampleAdjusted].every(Number.isFinite)) return null
  return alpha == null ? predictions.sampleAdjusted : predictions.roleMean + alpha * (predictions.rawAverage - predictions.roleMean)
}

export function fitErrorBands(history, beforeExclusive) {
  const prior = history.filter(row => row.date < beforeExclusive && valid(row) && Number.isFinite(row.predictions.learnedRoleShrink))
  return {
    beforeExclusive,
    byRole: Object.fromEntries(roles.map(role => {
      const pool = supportedPool(prior, role)
      const widths = Object.fromEntries(['sampleAdjusted', 'learnedRoleShrink'].map(model => {
        const errors = pool.rows.map(row => Math.abs(row.target - row.predictions[model])).sort((a, b) => a - b)
        // Descriptive nearest-rank quantile, not a conformal or technical-skill interval.
        return [model, errors.length ? errors[Math.ceil(errors.length * CALIBRATION_POLICY.intervalCoverage) - 1] : null]
      }))
      return [role, { source: pool.source, training: pool.counts, halfWidths: widths }]
    }))
  }
}

export function replayCalibration(folds) {
  const days = new Map()
  const seen = new Set()
  for (const fold of folds) {
    const date = fold.training.beforeExclusive
    if (fold.training.frozenBaselineUsed !== false || fold.training.baselineMode !== 'runtime' ||
      (fold.training.maxLogDate && fold.training.maxLogDate >= date)) throw new Error(`Unsafe baseline chronology: ${date}`)
    if (!days.has(date)) days.set(date, [])
    for (const row of fold.observations) {
      if (row.date !== date || !valid(row) || ![row.predictions.neutral, row.opponentOvr].every(Number.isFinite)) throw new Error(`Invalid observation: ${date}`)
      const id = `${matchKey(row)}:${row.entryKey}`
      if (seen.has(id)) throw new Error(`Duplicate player-role series: ${id}`)
      seen.add(id)
      days.get(date).push(row)
    }
  }
  const history = []
  const output = []
  for (const [date, rows] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
    const calibration = fitRoleCalibration(history, date)
    const errorBands = fitErrorBands(history, date)
    // Fit once per whole competition day. Append targets only after all its forecasts exist.
    const observations = rows.map(row => {
      const predictions = { ...row.predictions, learnedRoleShrink: predictCalibrated(row.predictions, row.role, calibration) }
      const intervals = Object.fromEntries(['sampleAdjusted', 'learnedRoleShrink'].map(model => {
        const halfWidth = errorBands.byRole[row.role].halfWidths[model]
        return [model, halfWidth == null ? null : { low: predictions[model] - halfWidth, high: predictions[model] + halfWidth }]
      }))
      return { ...row, predictions, intervals, calibrationSource: calibration.byRole[row.role].source }
    })
    output.push({ date, calibration, errorBands, observations })
    history.push(...observations)
  }
  return output
}

// Flat predictions receive half credit instead of vanishing from the ranking report.
export function pairConcordance(predictions, targets) {
  if (predictions.length !== targets.length || [...predictions, ...targets].some(value => !Number.isFinite(value))) return { credit: null, pairs: 0 }
  let correct = 0
  let pairs = 0
  for (let i = 0; i < targets.length; i += 1) {
    for (let j = i + 1; j < targets.length; j += 1) {
      const actual = targets[i] - targets[j]
      if (Math.abs(actual) < 1e-9) continue
      const predicted = predictions[i] - predictions[j]
      correct += Math.abs(predicted) < 1e-9 ? 0.5 : Number(Math.sign(predicted) === Math.sign(actual))
      pairs += 1
    }
  }
  return { credit: pairs ? correct / pairs : null, pairs }
}

function performance(rows) {
  const errors = [...groupBy(rows, matchKey).values()].map(group => ({ date: group[0].date,
    mae: Object.fromEntries(models.map(model => [model, mean(group.map(row => Math.abs(row.predictions[model] - row.target)))]))
  }))
  return Object.fromEntries(models.map(model => [model, {
    maeByMatch: round(mean(errors.map(row => row.mae[model]))),
    rmseByObservation: rows.length ? round(Math.sqrt(mean(rows.map(row => (row.predictions[model] - row.target) ** 2)))) : null,
    differenceFromCurrent: round(mean(errors.map(row => row.mae[model] - row.mae.sampleAdjusted))),
    differenceFromCurrentInterval: bootstrapByDate(errors, row => row.mae[model] - row.mae.sampleAdjusted),
    differenceFromRoleMean: round(mean(errors.map(row => row.mae[model] - row.mae.roleMean))),
    differenceFromRoleMeanInterval: bootstrapByDate(errors, row => row.mae[model] - row.mae.roleMean)
  }]))
}

export function summarizeCalibration(folds) {
  const observations = folds.flatMap(fold => fold.observations)
  const rankingGroups = [...groupBy(observations, row => `${row.date}:${row.role}`)].flatMap(([id, group]) => {
    // One player per date-role group even if they played several series that day.
    const rows = [...groupBy(group, row => row.entryKey).values()].map(series => ({
      ...series[0], target: mean(series.map(row => row.target))
    }))
    if (rows.length < CALIBRATION_POLICY.minimumRankPlayers) return []
    const metrics = Object.fromEntries(rankModels.map(model => {
      const predictions = rows.map(row => model === 'opponentOvr' ? row.opponentOvr : row.predictions[model])
      const targets = rows.map(row => row.target)
      return [model, { spearman: spearman(predictions, targets), ...pairConcordance(predictions, targets),
        predictionSd: Math.sqrt(mean(predictions.map(value => (value - mean(predictions)) ** 2))) }]
    }))
    return [{ id, date: rows[0].date, role: rows[0].role, players: rows.length, metrics }]
  })
  const commonSpearman = rankingGroups.filter(group => rankModels.every(model => group.metrics[model].spearman != null))
  const rankings = Object.fromEntries(rankModels.map(model => [model, {
    groups: rankingGroups.length, commonSpearmanGroups: commonSpearman.length,
    constantPredictionGroups: rankingGroups.filter(group => group.metrics[model].predictionSd < 1e-9).length,
    meanCommonSpearman: round(mean(commonSpearman.map(group => group.metrics[model].spearman))),
    meanPairConcordance: round(mean(rankingGroups.map(group => group.metrics[model].credit).filter(value => value != null))),
    meanPredictionSd: round(mean(rankingGroups.map(group => group.metrics[model].predictionSd))),
    pairDifferenceFromCurrent: round(mean(rankingGroups.filter(group => group.metrics[model].credit != null && group.metrics.sampleAdjusted.credit != null)
      .map(group => group.metrics[model].credit - group.metrics.sampleAdjusted.credit))),
    pairDifferenceInterval: bootstrapByDate(rankingGroups.filter(group => group.metrics[model].credit != null && group.metrics.sampleAdjusted.credit != null),
      group => group.metrics[model].credit - group.metrics.sampleAdjusted.credit)
  }]))
  const bandRows = observations.filter(row => row.intervals.sampleAdjusted && row.intervals.learnedRoleShrink)
  const bandSummary = rows => Object.fromEntries(['sampleAdjusted', 'learnedRoleShrink'].map(model => {
    const covered = row => Number(row.target >= row.intervals[model].low && row.target <= row.intervals[model].high)
    const matches = [...groupBy(rows, matchKey).values()]
    return [model, { observations: rows.length, matches: matches.length,
      coverageByObservation: round(mean(rows.map(covered))),
      coverageByMatch: round(mean(matches.map(group => mean(group.map(covered))))),
      meanWidth: round(mean(rows.map(row => row.intervals[model].high - row.intervals[model].low))) }]
  }))
  const active = observations.filter(row => row.calibrationSource !== 'current-fallback')
  return {
    sample: { observations: observations.length, matches: new Set(observations.map(matchKey)).size,
      days: new Set(observations.map(row => row.date)).size, playerRoles: new Set(observations.map(row => row.entryKey)).size,
      learnedObservations: active.length, fallbackObservations: observations.length - active.length,
      roleFitObservations: observations.filter(row => row.calibrationSource === 'role').length,
      pooledFitObservations: observations.filter(row => row.calibrationSource === 'pooled').length },
    performance: performance(observations),
    learnedOnly: { sample: support(active), performance: performance(active) },
    rankings, rankingGroups,
    intervals: { nominalCoverage: CALIBRATION_POLICY.intervalCoverage, metrics: bandSummary(bandRows),
      byRole: Object.fromEntries(roles.map(role => [role, bandSummary(bandRows.filter(row => row.role === role))])) },
    byRole: Object.fromEntries(roles.map(role => [role, { sample: support(observations.filter(row => row.role === role)), performance: performance(observations.filter(row => row.role === role)) }])),
    latestParameters: folds.at(-1)?.calibration ?? null
  }
}

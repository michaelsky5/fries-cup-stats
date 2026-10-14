import { CLAMP_CONFIG, DEFAULT_PROFILE_BY_SUBROLE, PROFILE_WEIGHTS, RATING_METRICS,
  SUPPORT_MINIMUM_RULES } from '../config/ratingModelConfig.js'
import { STATISTICAL_RATING_POLICY as POLICY, STATISTICAL_RATING_VERSION, STAT_KEYS } from '../config/statisticalRatingConfig.js'
import { mapRawScoreToMapRating } from './ratingModel.js'
import { evidenceKey, groupBy, round } from './statisticalRatingEvidence.js'

const finite = value => typeof value === 'number' && Number.isFinite(value)
const fields = { hero: 'byHero', profile: 'byProfile', subrole: 'bySubrole' }
const requireValid = (condition, message) => { if (!condition) throw new Error(message) }

function profileFor(row) {
  const original = row.resolution.scoringProfile
  const config = PROFILE_WEIGHTS[original] || PROFILE_WEIGHTS[DEFAULT_PROFILE_BY_SUBROLE[row.resolution.resolvedSubrole]]
  return config ? { key: original, original, weights: { ...config.weights }, subrole: row.resolution.resolvedSubrole } : null
}

function referenceKeys(row) {
  const prefix = row.seasonId + '|' + row.era.key + '|'
  return { hero: prefix + row.hero + '@' + row.heroVersion,
    profile: prefix + profileFor(row)?.key, subrole: prefix + row.resolution.resolvedSubrole }
}

function support(rows) {
  return { logs: new Set(rows.map(row => evidenceKey(row.parentRow || row))).size,
    records: rows.length, minutes: round(rows.reduce((sum, row) => sum + row.playtimeMinutes, 0)),
    matches: new Set(rows.map(row => row.matchId)).size, players: new Set(rows.map(row => row.playerId)).size,
    days: new Set(rows.map(row => row.day)).size }
}

function maturity(counts) {
  if (!counts?.logs) return 0
  return Math.max(0, Math.min(1, ...Object.keys(POLICY.maturity).map(key => counts[key] / POLICY.maturity[key])))
}

export function makeStatisticalDistribution(points) {
  const combined = new Map()
  for (const point of points) {
    requireValid(finite(point.value) && point.value >= 0 && finite(point.weight) && point.weight > 0, 'Invalid reference metric')
    combined.set(point.value, (combined.get(point.value) || 0) + point.weight)
  }
  let total = 0
  const values = [...combined].sort((a, b) => a[0] - b[0]).map(([value, weight]) => {
    const below = total
    total += weight
    return { value, weight, below }
  })
  return { values, total }
}

export function continuousStatisticalMidrank(value, distribution) {
  requireValid(finite(value) && value >= 0, 'Invalid target metric')
  if (!distribution?.total) return null
  const points = distribution.values
  let low = 0
  let high = points.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (points[middle].value < value) low = middle + 1
    else high = middle
  }
  if (low === points.length) return 100
  const next = points[low]
  const nextRank = (next.below + next.weight / 2) / distribution.total * 100
  if (value === next.value) return nextRank
  if (low === 0) return value / next.value * nextRank
  const previous = points[low - 1]
  const previousRank = (previous.below + previous.weight / 2) / distribution.total * 100
  return previousRank + (value - previous.value) / (next.value - previous.value) * (nextRank - previousRank)
}

function makeReference(rows) {
  const result = { ...support(rows), metrics: {} }
  for (const stat of STAT_KEYS) {
    const observed = rows.filter(row => row.metricStates[stat] === 'OBSERVED' && finite(row.per10[stat]))
    const byMatch = groupBy(observed, row => row.matchId)
    const points = [...byMatch.values()].flatMap(records => {
      const minutes = records.reduce((sum, row) => sum + row.playtimeMinutes, 0)
      return records.map(row => ({ value: row.per10[stat], weight: row.playtimeMinutes / minutes }))
    })
    const raw = makeStatisticalDistribution(points)
    const epsilon = Math.max(1, raw.total) * Number.EPSILON * 16
    const p95 = raw.values.find(point => point.below + point.weight + epsilon >= raw.total * 0.95)?.value ?? null
    const counts = support(observed)
    const winsorize = counts.logs >= 5
    const distribution = winsorize ? makeStatisticalDistribution(points.map(point =>
      ({ ...point, value: Math.min(point.value, p95) }))) : raw
    // Exact serialized membership replaces the offline SHA identifier. It is
    // used only to recognize identical pools, never as a numerical input.
    const membership = observed.map(row => JSON.stringify([row.rowId, row.hero, row.playtimeMinutes, row.per10[stat]])).sort().join('\n')
    result.metrics[stat] = { counts, p95, winsorize, distribution, matches: byMatch.size,
      zeroOnly: raw.total > 0 && raw.values.at(-1).value === 0, membership,
      heroes: [...new Set(observed.map(row => row.hero))].sort() }
  }
  return result
}

function validateRatingRows(rows) {
  requireValid(new Set(rows.map(row => row.rowId)).size === rows.length, 'Duplicate rating row')
  const unconfirmed = rows.filter(row => !row.verified)
  requireValid(new Set(unconfirmed.map(evidenceKey)).size === unconfirmed.length, 'Ambiguous player-map identity')
  requireValid(rows.every(row => finite(row.playtimeMinutes) && row.playtimeMinutes > 0), 'Invalid source duration')
}

function makeBaselines(training, beforeDay) {
  const result = { beforeDay, training: support(training), byHero: {}, byProfile: {}, bySubrole: {},
    maxTrainingDay: training.length ? training.map(row => row.day).sort().at(-1) : null,
    trainingMatchIds: [...new Set(training.map(row => row.matchId))] }
  for (const [type, field] of Object.entries(fields)) {
    for (const [key, cohort] of groupBy(training, row => referenceKeys(row)[type])) result[field][key] = makeReference(cohort)
  }
  return result
}

export function buildStatisticalRatingBaselines(rows, { beforeDay } = {}) {
  requireValid(Boolean(beforeDay), 'A strict reference date is required')
  validateRatingRows(rows)
  const training = rows.filter(row => row.day && row.day < beforeDay && row.era.key !== 'unknown-transition'
    && row.playtimeMinutes * 60 >= POLICY.targetReliability.minimumSeconds)
  return makeBaselines(training, beforeDay)
}

export function buildRetrospectiveStatisticalRatingBaselines(rows, target, { throughDay, referenceMatchIds } = {}) {
  requireValid(Boolean(target?.day && throughDay && target.day <= throughDay && target.era?.key !== 'unknown-transition'),
    'A valid retrospective target and cutoff are required')
  requireValid(Array.isArray(referenceMatchIds) && !referenceMatchIds.includes(target.matchId), 'Whole-match holdout is required')
  validateRatingRows(rows)
  const references = new Set(referenceMatchIds)
  const training = rows.filter(row => row.seasonId === target.seasonId && row.era.key === target.era.key
    && row.day && row.day <= throughDay && references.has(row.matchId) && row.matchId !== target.matchId
    && row.playtimeMinutes * 60 >= POLICY.targetReliability.minimumSeconds)
  return { ...makeBaselines(training, target.day), retrospective: {
    matchId: target.matchId, seasonId: target.seasonId, era: target.era.key, throughDay,
    referenceMatchIds: [...referenceMatchIds], cutoff: 'RETROSPECTIVE_SAME_VERSION_ENTIRE_MATCH_HELD_OUT'
  } }
}

function metricPercentile(row, baselines, metric) {
  const stat = metric === 'survival' ? 'deaths' : metric
  const keys = referenceKeys(row)
  const references = Object.fromEntries(Object.entries(fields).map(([source, field]) =>
    [source, baselines[field][keys[source]]?.metrics[stat]]).filter(([, reference]) => reference?.counts.logs))
  const heroMaturity = maturity(references.hero?.counts)
  const directHero = POLICY.maximumDirectHeroShare * heroMaturity
  const sourceWeights = { hero: directHero, profile: (1 - directHero) * 0.6 * maturity(references.profile?.counts), subrole: 0 }
  sourceWeights.subrole = 1 - sourceWeights.hero - sourceWeights.profile
  for (const source of Object.keys(sourceWeights)) if (!references[source]) sourceWeights[source] = 0
  const total = Object.values(sourceWeights).reduce((sum, weight) => sum + weight, 0)
  if (!total) return { state: 'OBSERVED', percentile: null, sourceWeights, heroMaturity, sources: {}, groups: [], heroOnlyPoolShare: 0 }
  let percentile = 0
  let heroOnlyPoolShare = 0
  const sources = {}
  const groups = new Map()
  for (const [source, weight] of Object.entries(sourceWeights)) {
    sourceWeights[source] = weight / total
    if (!weight) continue
    const reference = references[source]
    const target = reference.winsorize ? Math.min(row.per10[stat], reference.p95) : row.per10[stat]
    let rank = reference.zeroOnly ? 50 : continuousStatisticalMidrank(target, reference.distribution)
    if (!reference.zeroOnly && metric === 'survival') rank = 100 - rank
    if (metric === 'healing' && rank > 90) rank = 90 + (rank - 90) * CLAMP_CONFIG.metrics.healing.postP90PercentileMultiplier
    rank = Math.min(CLAMP_CONFIG.metrics[metric]?.maxMetricPercentile ?? 100, rank)
    percentile += sourceWeights[source] * rank
    sources[source] = { weight: round(sourceWeights[source], 8), percentile: round(rank), matches: reference.matches, zeroOnly: reference.zeroOnly }
    if (reference.heroes.length === 1 && reference.heroes[0] === row.hero) heroOnlyPoolShare += sourceWeights[source]
    if (!groups.has(reference.membership)) groups.set(reference.membership, { sources: [], weight: 0 })
    const group = groups.get(reference.membership)
    group.sources.push(source)
    group.weight += sourceWeights[source]
  }
  return { state: 'OBSERVED', percentile: round(percentile), sourceWeights, heroMaturity, sources,
    groups: [...groups.values()], heroOnlyPoolShare: round(heroOnlyPoolShare, 8) }
}

export function describeStatisticalReferenceUse(scored) {
  const activeSources = []
  const uncheckedSources = []
  if (scored.rawScore !== null) for (const metric of RATING_METRICS) {
    if (!scored.weights[metric]) continue
    const entry = scored.metricPercentiles[metric]
    const mixed = Object.entries(entry?.sourceWeights || {}).filter(([, share]) => share > 0)
    if (!mixed.length) uncheckedSources.push(metric + '/ALL')
    else if (Math.abs(mixed.reduce((sum, [, share]) => sum + share, 0) - 1) > 1e-7) uncheckedSources.push(metric + '/MIXTURE')
    for (const [source, share] of mixed) {
      const count = entry.sources?.[source]?.matches
      if (!Number.isInteger(count) || count < 1) uncheckedSources.push(metric + '/' + source)
      else activeSources.push({ metric, source, mixtureWeight: share, matches: count })
    }
  }
  const earlySources = activeSources.filter(source => source.matches < POLICY.minimumSourceMatches)
  const stage = scored.rawScore === null ? 'REFERENCE_UNAVAILABLE' : earlySources.length ? 'EARLY_REFERENCE'
    : uncheckedSources.length ? 'REFERENCE_SUPPORT_NOT_CHECKED' : scored.baselineMature ? 'REFERENCE_MATURITY_GATE_PASSED' : 'REFERENCE_MATURITY_PENDING'
  return { stage, activeSources, earlySources, uncheckedSources,
    minimumObservedActiveSourceMatches: activeSources.length ? Math.min(...activeSources.map(source => source.matches)) : null,
    provisional: !['REFERENCE_UNAVAILABLE', 'REFERENCE_MATURITY_GATE_PASSED'].includes(stage),
    gateIsAccuracyValidation: false, probability: null,
    statisticalScope: scored.flags.includes('HERO_STATS_UNATTRIBUTED') ? 'MAP_TOTAL_WITH_UNCONFIRMED_HERO_ATTRIBUTION' : 'AS_RECORDED',
    patchIsInferred: scored.flags.includes('PATCH_INFERRED') }
}

export function scoreStatisticalRatingRow(row, baselines) {
  const retrospective = baselines.retrospective
  const validReferenceScope = retrospective
    ? retrospective.matchId === row.matchId && retrospective.seasonId === row.seasonId && retrospective.era === row.era.key
      && row.day <= retrospective.throughDay && (baselines.maxTrainingDay === null || baselines.maxTrainingDay <= retrospective.throughDay)
      && baselines.trainingMatchIds.every(id => retrospective.referenceMatchIds.includes(id))
    : baselines.maxTrainingDay === null || baselines.maxTrainingDay < row.day
  requireValid(row.day && row.day === baselines.beforeDay && validReferenceScope
    && !baselines.trainingMatchIds.includes(row.matchId), 'Temporal or whole-match leakage')
  const profile = profileFor(row)
  const flags = []
  if (retrospective) flags.push('RETROSPECTIVE_REFERENCE_REVIEW')
  const seconds = finite(row.playtimeMinutes) && row.playtimeMinutes > 0 ? row.playtimeMinutes * 60 : null
  const targetReliability = { seconds, minimumSeconds: POLICY.targetReliability.minimumSeconds,
    durationEligible: seconds !== null && seconds >= POLICY.targetReliability.minimumSeconds }
  if (!targetReliability.durationEligible) flags.push(seconds === null ? 'TARGET_DURATION_INVALID' : 'SHORT_TARGET_REVIEW')
  if (!row.verified) flags.push('HERO_STATS_UNATTRIBUTED')
  if (!row.era.verified) flags.push('PATCH_INFERRED')
  if (!profile) flags.push('UNKNOWN_PROFILE')
  const weights = { ...(profile?.weights || Object.fromEntries(RATING_METRICS.map(metric => [metric, 0]))) }
  const metricPercentiles = {}
  let missing = !profile
  for (const metric of RATING_METRICS) {
    const stat = metric === 'survival' ? 'deaths' : metric
    if (row.metricStates[stat] === 'NOT_APPLICABLE') {
      weights[metric] = 0
      metricPercentiles[metric] = { state: 'NOT_APPLICABLE', percentile: null }
    } else if (row.metricStates[stat] !== 'OBSERVED' || !finite(row.per10[stat])) {
      metricPercentiles[metric] = { state: 'MISSING', percentile: null }
      if (weights[metric] > 0) missing = true
    } else {
      requireValid(row.per10[stat] >= 0, 'Negative target metric')
      metricPercentiles[metric] = metricPercentile(row, baselines, metric)
      if (weights[metric] > 0 && !finite(metricPercentiles[metric].percentile)) missing = true
    }
  }
  if (missing) flags.push('INCOMPLETE_METRICS_OR_BASELINES')
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  for (const metric of RATING_METRICS) weights[metric] = total ? weights[metric] / total * 100 : 0
  const metricContributions = Object.fromEntries(RATING_METRICS.map(metric => [metric,
    weights[metric] === 0 ? 0 : finite(metricPercentiles[metric].percentile) ? weights[metric] * metricPercentiles[metric].percentile / 100 : null]))
  const rawScore = !missing && seconds !== null && total > 0 ? round(Object.values(metricContributions).reduce((sum, value) => sum + value, 0), 3) : null
  const reviewValues = ['healing', 'assists', 'survival'].map(metric => metricPercentiles[metric].percentile)
  const supportReview = profile && SUPPORT_MINIMUM_RULES.subroles.includes(profile.subrole)
    && !SUPPORT_MINIMUM_RULES.exemptProfiles.includes(profile.original) && reviewValues.every(finite)
    && reviewValues[0] < SUPPORT_MINIMUM_RULES.healingPercentileBelow && reviewValues[1] < SUPPORT_MINIMUM_RULES.assistsPercentileBelow
    && reviewValues[2] < SUPPORT_MINIMUM_RULES.survivalPercentileBelow
  if (supportReview) flags.push('SUPPORT_MINIMUM_REVIEW')
  const baselineMature = RATING_METRICS.filter(metric => weights[metric] > 0).every(metric => metricPercentiles[metric].heroMaturity === 1)
  if (!baselineMature) flags.push('HERO_BASELINE_IMMATURE')
  const identical = RATING_METRICS.filter(metric => weights[metric] > 0).flatMap(metric => metricPercentiles[metric].groups || []).filter(group => group.sources.length > 1)
  const scored = { version: STATISTICAL_RATING_VERSION, rawScore, rawScoreBeforeReview: rawScore,
    mapRating: rawScore === null ? null : mapRawScoreToMapRating(rawScore), profile: profile?.key || '', weights, metricPercentiles, metricContributions,
    flags, baselineMature, targetReliability, reviewOnly: Boolean(supportReview) || !targetReliability.durationEligible,
    accuracyValidated: false, status: rawScore === null ? 'UNAVAILABLE' : 'STATISTICAL_PERFORMANCE',
    referenceAudit: rawScore === null ? null : { method: POLICY.formula, hasIdenticalPools: identical.length > 0,
      maximumIdenticalPoolShare: identical.length ? Math.max(...identical.map(group => group.weight)) : 0,
      heroOnlyPoolShare: round(RATING_METRICS.reduce((sum, metric) => sum + weights[metric] * (metricPercentiles[metric].heroOnlyPoolShare || 0) / 100, 0), 8) } }
  if (retrospective) scored.retrospective = { ...retrospective, trainingMatchIds: [...baselines.trainingMatchIds] }
  scored.referenceUse = describeStatisticalReferenceUse(scored)
  if (scored.referenceUse.stage === 'EARLY_REFERENCE') flags.push('EARLY_REFERENCE_REVIEW')
  if (scored.referenceUse.stage === 'REFERENCE_SUPPORT_NOT_CHECKED') flags.push('REFERENCE_SUPPORT_REVIEW')
  return scored
}

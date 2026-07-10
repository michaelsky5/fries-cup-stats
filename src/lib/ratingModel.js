import {
  BASELINE_BLEND_CONFIG,
  CLAMP_CONFIG,
  DEFAULT_PROFILE_BY_SUBROLE,
  MAP_RATING_CONFIG,
  METRIC_DEFINITIONS,
  METRIC_DIRECTIONS,
  OVR_CONFIG,
  PROFILE_WEIGHTS,
  RATING_METRICS,
  RATING_MODEL_VERSION,
  SAMPLE_ELIGIBILITY_CONFIG,
  SUPPORT_MINIMUM_RULES
} from '../config/ratingModelConfig.js'

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function isFiniteScore(value) {
  if (value === null || value === undefined || value === '') return false
  return Number.isFinite(Number(value))
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, toFiniteNumber(value)))
}

function round(value, digits = 3) {
  if (!isFiniteScore(value)) return null
  const number = Number(value)
  return Number(number.toFixed(digits))
}

function devWarn(message, detail) {
  if (globalThis.process?.env?.NODE_ENV === 'production') return
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[ratingModel] ${message}`, detail || '')
  }
}

function getNestedStat(source, names) {
  const totals = source?.totals && typeof source.totals === 'object' ? source.totals : {}
  for (const name of names) {
    if (source?.[name] !== undefined) return toFiniteNumber(source[name])
    if (totals[name] !== undefined) return toFiniteNumber(totals[name])
  }
  return 0
}

function getMetricDefinition(metric) {
  if (metric === 'survival') return METRIC_DEFINITIONS.deaths
  return METRIC_DEFINITIONS[metric]
}

function getBaselineMetricKey(metric) {
  return getMetricDefinition(metric)?.per10Key || `${metric}Per10`
}

function getStatsObject(baseline, metric, mode = 'winsorizedPercentiles') {
  const key = getBaselineMetricKey(metric)
  const metricStats = baseline?.metrics?.[key]
  return metricStats?.[mode] || metricStats?.rawPercentiles || metricStats?.winsorizedPercentiles || null
}

function getPercentileStat(baseline, metric, stat = 'p95') {
  const raw = getStatsObject(baseline, metric, 'rawPercentiles')
  const winsorized = getStatsObject(baseline, metric, 'winsorizedPercentiles')
  return raw?.[stat] ?? winsorized?.[stat] ?? null
}

function interpolateCurve(input, curve, min, max) {
  const value = clamp(input)
  const points = [...curve].sort((a, b) => a.percentile - b.percentile)

  if (!points.length) return round(value)
  if (value <= points[0].percentile) return round(points[0].value)

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]
    const next = points[index]
    if (value <= next.percentile) {
      const span = next.percentile - prev.percentile
      const ratio = span > 0 ? (value - prev.percentile) / span : 0
      return round(Math.min(max, Math.max(min, prev.value + ((next.value - prev.value) * ratio))), 1)
    }
  }

  return round(Math.min(max, Math.max(min, points[points.length - 1].value)), 1)
}

function collapsePercentilePoints(points) {
  const grouped = new Map()

  points
    .filter(point => Number.isFinite(point.value) && Number.isFinite(point.percentile))
    .forEach(point => {
      const key = String(point.value)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(point.percentile)
    })

  return Array.from(grouped.entries())
    .map(([value, percentiles]) => ({
      value: Number(value),
      percentile: percentiles.reduce((sum, pct) => sum + pct, 0) / percentiles.length
    }))
    .sort((a, b) => a.value - b.value || a.percentile - b.percentile)
}

function percentileFromStats(value, stats) {
  if (!stats) return null
  const max = toFiniteNumber(stats.max, NaN)
  const p95 = toFiniteNumber(stats.p95, NaN)
  if (Number.isFinite(max) && max === 0) return CLAMP_CONFIG.neutralPercentile

  const rawPoints = [
    { percentile: 0, value: 0 },
    { percentile: 10, value: stats.p10 },
    { percentile: 25, value: stats.p25 },
    { percentile: 50, value: stats.p50 },
    { percentile: 75, value: stats.p75 },
    { percentile: 90, value: stats.p90 },
    { percentile: 95, value: stats.p95 },
    { percentile: 100, value: Number.isFinite(max) ? max : p95 }
  ]

  const points = collapsePercentilePoints(rawPoints)
  if (!points.length) return null

  const safeValue = toFiniteNumber(value, NaN)
  if (!Number.isFinite(safeValue)) return null
  if (safeValue <= points[0].value) return clamp(points[0].percentile)

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]
    const next = points[index]
    if (safeValue <= next.value) {
      const span = next.value - prev.value
      const ratio = span > 0 ? (safeValue - prev.value) / span : 0
      return clamp(prev.percentile + ((next.percentile - prev.percentile) * ratio))
    }
  }

  return clamp(points[points.length - 1].percentile)
}

function getBaselineMaturity(baseline, fallbackStatus = '') {
  if (!baseline) return 0

  const sampleLogs = toFiniteNumber(baseline.sampleLogs, NaN)
  const totalPlaytimeMinutes = toFiniteNumber(baseline.totalPlaytimeMinutes, NaN)
  if (Number.isFinite(sampleLogs) && Number.isFinite(totalPlaytimeMinutes)) {
    const logTarget = Math.max(1, toFiniteNumber(SAMPLE_ELIGIBILITY_CONFIG.ok.minSampleLogs, 20))
    const timeTarget = Math.max(1, toFiniteNumber(SAMPLE_ELIGIBILITY_CONFIG.ok.minTotalPlaytimeMinutes, 120))
    return clamp(Math.min(sampleLogs / logTarget, totalPlaytimeMinutes / timeTarget))
  }

  const status = fallbackStatus || baseline.sampleStatus
  if (status === SAMPLE_ELIGIBILITY_CONFIG.statuses.ok) return 1
  if (status === SAMPLE_ELIGIBILITY_CONFIG.statuses.low) return 0.25
  return 0
}

function getSourceWeights(heroBaseline, profileBaseline, sampleStatus) {
  const heroMaturity = getBaselineMaturity(heroBaseline, sampleStatus)
  const profileMaturity = getBaselineMaturity(profileBaseline)
  const maxHeroWeight = toFiniteNumber(BASELINE_BLEND_CONFIG.HERO_OK.hero, 0.5)
  const profileShareWithoutHero = toFiniteNumber(BASELINE_BLEND_CONFIG.HERO_LOW_SAMPLE.profile, 0.6)
  const hero = maxHeroWeight * heroMaturity
  const remaining = 1 - hero
  const profile = remaining * profileShareWithoutHero * profileMaturity

  return {
    hero,
    profile,
    subrole: Math.max(0, remaining - profile)
  }
}

function normalizeWeightsForAvailableBaselines(weights, baselines) {
  const normalized = { ...weights }
  Object.keys(normalized).forEach(source => {
    if (!baselines[source]) normalized[source] = 0
  })

  const total = Object.values(normalized).reduce((sum, value) => sum + value, 0)
  if (total <= 0) return normalized

  Object.keys(normalized).forEach(source => {
    normalized[source] = normalized[source] / total
  })

  return normalized
}

function getClampLimit(metric, baseline, fallbackBaselines = []) {
  const clampMetric = metric === 'survival' ? 'deaths' : metric
  const statName = CLAMP_CONFIG.metrics[clampMetric]?.clampAt || CLAMP_CONFIG.clampPercentile
  const candidates = [baseline, ...fallbackBaselines].filter(Boolean)

  for (const candidate of candidates) {
    const value = getPercentileStat(candidate, clampMetric, statName)
    if (Number.isFinite(Number(value))) return Number(value)
  }

  return null
}

function getWinsorizedMetricValue(value, metric, baseline, fallbackBaselines = []) {
  const safeValue = toFiniteNumber(value, NaN)
  if (!Number.isFinite(safeValue)) return safeValue
  const limit = getClampLimit(metric, baseline, fallbackBaselines)
  if (!Number.isFinite(Number(limit))) return safeValue
  return Math.min(safeValue, Number(limit))
}

function applyMetricPercentileRules(percentile, metric) {
  let output = clamp(percentile)

  if (metric === 'healing') {
    const rule = CLAMP_CONFIG.metrics.healing
    if (output > 90) {
      output = 90 + ((output - 90) * toFiniteNumber(rule.postP90PercentileMultiplier, 0.5))
    }
  }

  const maxMetricPercentile = CLAMP_CONFIG.metrics[metric]?.maxMetricPercentile
  if (Number.isFinite(Number(maxMetricPercentile))) {
    output = Math.min(output, Number(maxMetricPercentile))
  }

  return clamp(output)
}

export function getPer10Stats(log) {
  const playtimeMinutes = toFiniteNumber(log?.playtimeMinutes ?? log?.raw_time_mins ?? log?.timeMins)

  return {
    elims: playtimeMinutes > 0 ? getNestedStat(log, METRIC_DEFINITIONS.elims.totalKeys) / playtimeMinutes * 10 : toFiniteNumber(log?.elimsPer10),
    assists: playtimeMinutes > 0 ? getNestedStat(log, METRIC_DEFINITIONS.assists.totalKeys) / playtimeMinutes * 10 : toFiniteNumber(log?.assistsPer10),
    deaths: playtimeMinutes > 0 ? getNestedStat(log, METRIC_DEFINITIONS.deaths.totalKeys) / playtimeMinutes * 10 : toFiniteNumber(log?.deathsPer10),
    damage: playtimeMinutes > 0 ? getNestedStat(log, METRIC_DEFINITIONS.damage.totalKeys) / playtimeMinutes * 10 : toFiniteNumber(log?.damagePer10),
    healing: playtimeMinutes > 0 ? getNestedStat(log, METRIC_DEFINITIONS.healing.totalKeys) / playtimeMinutes * 10 : toFiniteNumber(log?.healingPer10),
    blocked: playtimeMinutes > 0 ? getNestedStat(log, METRIC_DEFINITIONS.blocked.totalKeys) / playtimeMinutes * 10 : toFiniteNumber(log?.blockedPer10)
  }
}

export function getMetricPercentile(value, baseline, metric) {
  if (!baseline) {
    devWarn('Missing baseline, using neutral percentile', { metric })
    return CLAMP_CONFIG.neutralPercentile
  }

  if (metric === 'survival') {
    return getSurvivalPercentile(value, baseline)
  }

  const direction = METRIC_DIRECTIONS[metric] || 'positive'
  const stats = getStatsObject(baseline, metric)
  const clampedValue = getWinsorizedMetricValue(value, metric, baseline)
  const percentile = percentileFromStats(clampedValue, stats)

  if (!Number.isFinite(Number(percentile))) {
    devWarn('Missing percentile stats, using neutral percentile', { metric, baseline: baseline.key })
    return CLAMP_CONFIG.neutralPercentile
  }

  const directed = direction === 'negative' ? 100 - percentile : percentile
  return applyMetricPercentileRules(directed, metric)
}

export function getSurvivalPercentile(deathsPer10, baseline) {
  if (!baseline) {
    devWarn('Missing deaths baseline, using neutral survival percentile')
    return CLAMP_CONFIG.neutralPercentile
  }

  const stats = getStatsObject(baseline, 'deaths')
  const clampedDeaths = getWinsorizedMetricValue(deathsPer10, 'deaths', baseline)
  const deathsPercentile = percentileFromStats(clampedDeaths, stats)

  if (!Number.isFinite(Number(deathsPercentile))) {
    devWarn('Missing deaths percentile stats, using neutral survival percentile', { baseline: baseline.key })
    return CLAMP_CONFIG.neutralPercentile
  }

  return clamp(100 - deathsPercentile)
}

export function getBlendedMetricPercentile({
  metric,
  value,
  heroBaseline,
  profileBaseline,
  subroleBaseline,
  sampleStatus
}) {
  const baselines = {
    hero: heroBaseline || null,
    profile: profileBaseline || null,
    subrole: subroleBaseline || null
  }
  const sourceWeights = normalizeWeightsForAvailableBaselines(
    getSourceWeights(heroBaseline, profileBaseline, sampleStatus),
    baselines
  )
  const sourcePercentiles = {}
  let weighted = 0
  let weightTotal = 0

  Object.entries(sourceWeights).forEach(([source, weight]) => {
    if (weight <= 0) return
    const baseline = baselines[source]
    const fallbackBaselines = Object.values(baselines).filter(item => item && item !== baseline)
    const sourceValue = getWinsorizedMetricValue(value, metric, baseline, fallbackBaselines)
    const percentile = metric === 'survival'
      ? getSurvivalPercentile(sourceValue, baseline)
      : getMetricPercentile(sourceValue, baseline, metric)

    sourcePercentiles[source] = round(percentile)
    weighted += percentile * weight
    weightTotal += weight
  })

  if (weightTotal <= 0) {
    devWarn('No usable baselines, using neutral percentile', { metric })
    return {
      metric,
      percentile: CLAMP_CONFIG.neutralPercentile,
      sourcePercentiles,
      sourceWeights
    }
  }

  return {
    metric,
    percentile: round(weighted / weightTotal),
    sourcePercentiles,
    sourceWeights
  }
}

export function getProfileWeights(scoringProfile, subrole = '') {
  const profileConfig = PROFILE_WEIGHTS[scoringProfile]
  if (profileConfig) {
    return {
      scoringProfile,
      requestedProfile: scoringProfile,
      weights: profileConfig.weights,
      profileConfig,
      usedFallback: false
    }
  }

  const fallbackProfile = DEFAULT_PROFILE_BY_SUBROLE[subrole]
  const fallbackConfig = fallbackProfile ? PROFILE_WEIGHTS[fallbackProfile] : null

  if (fallbackConfig) {
    devWarn('Missing scoring profile, using subrole default profile', { scoringProfile, subrole, fallbackProfile })
    return {
      scoringProfile: fallbackProfile,
      requestedProfile: scoringProfile,
      weights: fallbackConfig.weights,
      profileConfig: fallbackConfig,
      usedFallback: true
    }
  }

  devWarn('Missing scoring profile and subrole fallback', { scoringProfile, subrole })
  return null
}

function applySupportMinimumRules(rawScore, metricPercentiles, scoringProfile, subrole) {
  if (!SUPPORT_MINIMUM_RULES.enabled) return rawScore
  if (!SUPPORT_MINIMUM_RULES.subroles.includes(subrole)) return rawScore
  if (SUPPORT_MINIMUM_RULES.exemptProfiles.includes(scoringProfile)) return rawScore

  const healing = toFiniteNumber(metricPercentiles.healing?.percentile, CLAMP_CONFIG.neutralPercentile)
  const assists = toFiniteNumber(metricPercentiles.assists?.percentile, CLAMP_CONFIG.neutralPercentile)
  const survival = toFiniteNumber(metricPercentiles.survival?.percentile, CLAMP_CONFIG.neutralPercentile)

  if (
    healing < SUPPORT_MINIMUM_RULES.healingPercentileBelow &&
    assists < SUPPORT_MINIMUM_RULES.assistsPercentileBelow &&
    survival < SUPPORT_MINIMUM_RULES.survivalPercentileBelow
  ) {
    return Math.min(rawScore, SUPPORT_MINIMUM_RULES.rawScoreCap)
  }

  return rawScore
}

export function calculateRawProfileScore({
  per10Stats,
  heroBaseline,
  profileBaseline,
  subroleBaseline,
  scoringProfile,
  sampleStatus
}) {
  const subrole = subroleBaseline?.key || subroleBaseline?.label || profileBaseline?.subroles?.[0] || heroBaseline?.subroles?.[0] || ''
  const profileWeights = getProfileWeights(scoringProfile, subrole)

  if (!profileWeights) {
    return {
      ratingModelVersion: RATING_MODEL_VERSION,
      rawScore: null,
      mapRating: null,
      metricPercentiles: {},
      scoringProfile,
      effectiveScoringProfile: null,
      profileFallbackUsed: false,
      sampleStatus: sampleStatus || heroBaseline?.sampleStatus || SAMPLE_ELIGIBILITY_CONFIG.statuses.veryLow
    }
  }

  const effectiveSampleStatus = sampleStatus || heroBaseline?.sampleStatus || SAMPLE_ELIGIBILITY_CONFIG.statuses.veryLow
  const metricPercentiles = {}
  let weighted = 0
  let weightTotal = 0

  RATING_METRICS.forEach(metric => {
    const value = metric === 'survival' ? per10Stats?.deaths : per10Stats?.[metric]
    const result = getBlendedMetricPercentile({
      metric,
      value,
      heroBaseline,
      profileBaseline,
      subroleBaseline,
      sampleStatus: effectiveSampleStatus
    })
    const weight = toFiniteNumber(profileWeights.weights[metric])

    metricPercentiles[metric] = result
    weighted += result.percentile * weight
    weightTotal += weight
  })

  const rawScoreBeforeCaps = weightTotal > 0 ? weighted / weightTotal : null
  const cappedScore = isFiniteScore(rawScoreBeforeCaps)
    ? applySupportMinimumRules(rawScoreBeforeCaps, metricPercentiles, profileWeights.scoringProfile, subrole)
    : null
  const rawScore = isFiniteScore(cappedScore) ? round(cappedScore) : null

  return {
    ratingModelVersion: RATING_MODEL_VERSION,
    rawScore,
    rawScoreBeforeCaps: isFiniteScore(rawScoreBeforeCaps) ? round(rawScoreBeforeCaps) : null,
    mapRating: rawScore === null ? null : mapRawScoreToMapRating(rawScore),
    metricPercentiles,
    scoringProfile,
    effectiveScoringProfile: profileWeights.scoringProfile,
    profileFallbackUsed: profileWeights.usedFallback,
    sampleStatus: effectiveSampleStatus,
    subrole,
    weights: profileWeights.weights
  }
}

export function mapRawScoreToMapRating(rawScore, options = {}) {
  const value = options.percentile ?? rawScore
  return interpolateCurve(value, options.curve || MAP_RATING_CONFIG.curve, MAP_RATING_CONFIG.min, MAP_RATING_CONFIG.max)
}

export function mapRawScoreToOVR(rawScore, percentile, options = {}) {
  const sampleStatus = options.sampleStatus || SAMPLE_ELIGIBILITY_CONFIG.statuses.veryLow
  if (sampleStatus !== (options.requireSampleStatus || OVR_CONFIG.requireSampleStatus)) {
    return options.unratedValue ?? OVR_CONFIG.unratedValue
  }

  const value = isFiniteScore(percentile) ? percentile : rawScore
  const mapped = interpolateCurve(value, options.curve || OVR_CONFIG.curve, OVR_CONFIG.min, OVR_CONFIG.max)
  return Math.round(Math.min(OVR_CONFIG.max, Math.max(OVR_CONFIG.min, mapped)))
}

export function getRatingModelVersion() {
  return RATING_MODEL_VERSION
}

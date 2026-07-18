import { getOwHeroAssetKey } from './heroes.js'
import { attachRatingModelScoreToLeaderboardRows } from './scoringEngineAdapter.js'
import { mapRawScoreToOVR } from './ratingModel.js'
import { OVR_CONFIG, SEASON_SCORE_CONFIG } from '../config/ratingModelConfig.js'

export const ROLE_ORDER = ['TANK', 'DPS', 'SUPPORT']

export const ROLE_COLORS = {
  TANK: '#3978C5',
  DPS: '#CC4944',
  SUPPORT: '#3F9369'
}

export const PUBLIC_METRICS = [
  { id: 'elim', totalKey: 'total_elim', avgKey: 'avg_elim', label: '消灭', short: 'ELIM', direction: 'positive' },
  { id: 'ast', totalKey: 'total_ast', avgKey: 'avg_ast', label: '助攻', short: 'AST', direction: 'positive' },
  { id: 'dth', totalKey: 'total_dth', avgKey: 'avg_dth', label: '阵亡', short: 'DTH', direction: 'negative' },
  { id: 'dmg', totalKey: 'total_dmg', avgKey: 'avg_dmg', label: '伤害', short: 'DMG', direction: 'positive' },
  { id: 'heal', totalKey: 'total_heal', avgKey: 'avg_heal', label: '治疗', short: 'HEAL', direction: 'positive' },
  { id: 'block', totalKey: 'total_block', avgKey: 'avg_block', label: '阻挡', short: 'BLOCK', direction: 'positive' }
]

export const PUBLIC_METRIC_IDS = PUBLIC_METRICS.map(metric => metric.id)

const SCORE_NEUTRAL_BASELINE = 50
const SAMPLE_CONFIDENCE_FLOOR = 0.65
const SAMPLE_CONFIDENCE_TIME_MULTIPLIER = 3
const SAMPLE_CONFIDENCE_MIN_MAPS = 2
const SAMPLE_CONFIDENCE_TARGET_MAPS = 10

export const ROLE_SCORE_CONFIG = {
  TANK: {
    label: '重装',
    en: 'TANK',
    color: ROLE_COLORS.TANK,
    coreMetrics: ['block', 'dth', 'elim'],
    weights: {
      block: 0.32,
      dth: 0.18,
      elim: 0.22,
      ast: 0.10,
      dmg: 0.12,
      heal: 0.06
    }
  },
  DPS: {
    label: '输出',
    en: 'DPS',
    color: ROLE_COLORS.DPS,
    coreMetrics: ['elim', 'dmg', 'dth'],
    weights: {
      elim: 0.32,
      dmg: 0.30,
      dth: 0.20,
      ast: 0.08,
      heal: 0.05,
      block: 0.05
    }
  },
  SUPPORT: {
    label: '支援',
    en: 'SUP',
    color: ROLE_COLORS.SUPPORT,
    coreMetrics: ['heal', 'ast', 'dth'],
    weights: {
      heal: 0.34,
      ast: 0.24,
      dth: 0.20,
      elim: 0.10,
      dmg: 0.07,
      block: 0.05
    }
  }
}

// Hero profiles adjust metric weights for stat lines that role-only scoring
// tends to misread. They do not add bonus points; all metrics are still
// normalized against qualified players in the same role.
export const HERO_SCORE_PROFILES = {
  TANK: {
    d_va: {
      label: 'dive_tank',
      influence: 0.58,
      coreMetrics: ['elim', 'dth', 'dmg'],
      weights: { elim: 0.26, dth: 0.26, dmg: 0.18, block: 0.12, ast: 0.12, heal: 0.06 }
    },
    doomfist: {
      label: 'dive_tank',
      influence: 0.58,
      coreMetrics: ['elim', 'dth', 'dmg'],
      weights: { elim: 0.26, dth: 0.26, dmg: 0.18, block: 0.12, ast: 0.12, heal: 0.06 }
    },
    hazard: {
      label: 'dive_tank',
      influence: 0.58,
      coreMetrics: ['elim', 'dth', 'dmg'],
      weights: { elim: 0.26, dth: 0.26, dmg: 0.18, block: 0.12, ast: 0.12, heal: 0.06 }
    },
    winston: {
      label: 'dive_tank',
      influence: 0.54,
      coreMetrics: ['elim', 'dth', 'block'],
      weights: { elim: 0.24, dth: 0.24, block: 0.18, ast: 0.12, dmg: 0.16, heal: 0.06 }
    },
    wrecking_ball: {
      label: 'dive_tank',
      influence: 0.68,
      coreMetrics: ['elim', 'dth', 'dmg'],
      weights: { elim: 0.28, dth: 0.28, dmg: 0.20, ast: 0.12, block: 0.06, heal: 0.06 }
    },
    junker_queen: {
      label: 'brawl_tank',
      influence: 0.55,
      coreMetrics: ['elim', 'dmg', 'dth'],
      weights: { elim: 0.26, dmg: 0.26, dth: 0.22, ast: 0.08, block: 0.12, heal: 0.06 }
    },
    mauga: {
      label: 'brawl_tank',
      influence: 0.55,
      coreMetrics: ['elim', 'dmg', 'dth'],
      weights: { elim: 0.26, dmg: 0.26, dth: 0.22, ast: 0.08, block: 0.12, heal: 0.06 }
    },
    roadhog: {
      label: 'brawl_tank',
      influence: 0.55,
      coreMetrics: ['elim', 'dmg', 'dth'],
      weights: { elim: 0.26, dmg: 0.24, dth: 0.24, ast: 0.08, block: 0.08, heal: 0.10 }
    }
  },
  DPS: {
    genji: {
      label: 'flank_dps',
      influence: 0.42,
      coreMetrics: ['elim', 'dth', 'dmg'],
      weights: { elim: 0.34, dth: 0.24, dmg: 0.24, ast: 0.10, heal: 0.04, block: 0.04 }
    },
    sombra: {
      label: 'utility_dps',
      influence: 0.48,
      coreMetrics: ['elim', 'ast', 'dth'],
      weights: { elim: 0.30, ast: 0.18, dth: 0.24, dmg: 0.20, heal: 0.04, block: 0.04 }
    },
    shion: {
      label: 'flank_dps',
      influence: 0.42,
      coreMetrics: ['elim', 'dth', 'dmg'],
      weights: { elim: 0.34, dth: 0.24, dmg: 0.24, ast: 0.10, heal: 0.04, block: 0.04 }
    },
    tracer: {
      label: 'flank_dps',
      influence: 0.42,
      coreMetrics: ['elim', 'dth', 'dmg'],
      weights: { elim: 0.34, dth: 0.24, dmg: 0.24, ast: 0.10, heal: 0.04, block: 0.04 }
    },
    venture: {
      label: 'flank_dps',
      influence: 0.42,
      coreMetrics: ['elim', 'dth', 'dmg'],
      weights: { elim: 0.34, dth: 0.24, dmg: 0.24, ast: 0.10, heal: 0.04, block: 0.04 }
    },
    vendetta: {
      label: 'flank_dps',
      influence: 0.42,
      coreMetrics: ['elim', 'dth', 'dmg'],
      weights: { elim: 0.34, dth: 0.24, dmg: 0.24, ast: 0.10, heal: 0.04, block: 0.04 }
    },
    echo: {
      label: 'flex_dps',
      influence: 0.34,
      coreMetrics: ['elim', 'dmg', 'dth'],
      weights: { elim: 0.32, dmg: 0.28, dth: 0.22, ast: 0.10, heal: 0.04, block: 0.04 }
    },
    mei: {
      label: 'utility_dps',
      influence: 0.45,
      coreMetrics: ['elim', 'ast', 'dth'],
      weights: { elim: 0.28, dmg: 0.24, dth: 0.22, ast: 0.18, heal: 0.04, block: 0.04 }
    },
    symmetra: {
      label: 'utility_dps',
      influence: 0.45,
      coreMetrics: ['elim', 'ast', 'dth'],
      weights: { elim: 0.28, dmg: 0.24, dth: 0.22, ast: 0.18, heal: 0.04, block: 0.04 }
    }
  },
  SUPPORT: {
    lucio: {
      label: 'tempo_support',
      influence: 0.92,
      coreMetrics: ['block', 'ast', 'dth'],
      weights: { block: 0.30, ast: 0.22, dth: 0.22, elim: 0.18, heal: 0.05, dmg: 0.03 }
    },
    zenyatta: {
      label: 'damage_support',
      influence: 0.66,
      coreMetrics: ['ast', 'dmg', 'dth'],
      weights: { ast: 0.28, dmg: 0.24, dth: 0.22, elim: 0.16, heal: 0.06, block: 0.04 }
    },
    brigitte: {
      label: 'utility_support',
      influence: 0.62,
      coreMetrics: ['ast', 'dth', 'heal'],
      weights: { ast: 0.28, dth: 0.22, heal: 0.20, elim: 0.14, dmg: 0.12, block: 0.04 }
    },
    mercy: {
      label: 'pocket_support',
      influence: 0.62,
      coreMetrics: ['heal', 'ast', 'dth'],
      weights: { heal: 0.34, ast: 0.32, dth: 0.22, elim: 0.04, dmg: 0.04, block: 0.04 }
    },
    ana: {
      label: 'throughput_support',
      influence: 0.28,
      coreMetrics: ['heal', 'ast', 'dth'],
      weights: { heal: 0.32, ast: 0.24, dth: 0.20, dmg: 0.10, elim: 0.10, block: 0.04 }
    },
    baptiste: {
      label: 'throughput_support',
      influence: 0.32,
      coreMetrics: ['heal', 'dmg', 'dth'],
      weights: { heal: 0.28, dmg: 0.18, ast: 0.20, dth: 0.20, elim: 0.10, block: 0.04 }
    },
    illari: {
      label: 'damage_support',
      influence: 0.42,
      coreMetrics: ['heal', 'dmg', 'dth'],
      weights: { heal: 0.26, dmg: 0.20, ast: 0.20, dth: 0.20, elim: 0.10, block: 0.04 }
    },
    juno: {
      label: 'tempo_support',
      influence: 0.42,
      coreMetrics: ['heal', 'ast', 'dth'],
      weights: { heal: 0.26, ast: 0.28, dth: 0.20, elim: 0.10, dmg: 0.12, block: 0.04 }
    },
    kiriko: {
      label: 'flex_support',
      influence: 0.34,
      coreMetrics: ['heal', 'ast', 'dth'],
      weights: { heal: 0.28, ast: 0.24, dth: 0.22, dmg: 0.12, elim: 0.10, block: 0.04 }
    },
    lifeweaver: {
      label: 'throughput_support',
      influence: 0.40,
      coreMetrics: ['heal', 'dth', 'ast'],
      weights: { heal: 0.36, dth: 0.22, ast: 0.22, elim: 0.06, dmg: 0.10, block: 0.04 }
    },
    mizuki: {
      label: 'flex_support',
      influence: 0.34,
      coreMetrics: ['heal', 'ast', 'dth'],
      weights: { heal: 0.28, ast: 0.24, dth: 0.22, dmg: 0.12, elim: 0.10, block: 0.04 }
    },
    moira: {
      label: 'throughput_support',
      influence: 0.36,
      coreMetrics: ['heal', 'dmg', 'dth'],
      weights: { heal: 0.30, dmg: 0.18, dth: 0.20, elim: 0.12, ast: 0.16, block: 0.04 }
    }
  }
}

const METRIC_BY_ID = PUBLIC_METRICS.reduce((acc, metric) => {
  acc[metric.id] = metric
  return acc
}, {})

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function normalizeHeroKey(heroName) {
  return String(heroName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function getHeroKeyCandidates(heroName) {
  return Array.from(new Set([
    getOwHeroAssetKey(heroName),
    normalizeHeroKey(heroName)
  ].filter(Boolean)))
}

function blendWeights(baseWeights, profileWeights, influence = 0.5) {
  const ratio = clamp(toFiniteNumber(influence, 0.5), 0, 1)
  const metricIds = Array.from(new Set([
    ...Object.keys(baseWeights || {}),
    ...Object.keys(profileWeights || {})
  ]))

  return metricIds.reduce((acc, metricId) => {
    const base = toFiniteNumber(baseWeights?.[metricId])
    const profile = toFiniteNumber(profileWeights?.[metricId], base)
    acc[metricId] = (base * (1 - ratio)) + (profile * ratio)
    return acc
  }, {})
}

export function getHeroScoreProfile(role, heroName) {
  const profiles = HERO_SCORE_PROFILES[role] || {}
  return getHeroKeyCandidates(heroName).map(heroKey => profiles[heroKey]).find(Boolean) || null
}

export function getRoleScoreConfig(role, heroName = '') {
  const baseConfig = ROLE_SCORE_CONFIG[role]
  if (!baseConfig) return null

  const profile = getHeroScoreProfile(role, heroName)
  if (!profile) return baseConfig

  return {
    ...baseConfig,
    scoreProfile: profile.label,
    heroProfile: profile,
    coreMetrics: profile.coreMetrics || baseConfig.coreMetrics,
    weights: blendWeights(baseConfig.weights, profile.weights, profile.influence)
  }
}

function percentile(sortedValues, pct) {
  if (!sortedValues.length) return 0
  const index = (sortedValues.length - 1) * pct
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]
  const ratio = index - lower
  return sortedValues[lower] * (1 - ratio) + sortedValues[upper] * ratio
}

function getMetricValue(entry, metricId) {
  return toFiniteNumber(entry?.metrics?.per10?.[metricId])
}

function buildBenchmarks(entries, role) {
  const samples = entries.filter(entry => entry.role === role && entry.eligible)
  const benchmarks = {}

  PUBLIC_METRIC_IDS.forEach(metricId => {
    const values = samples
      .map(entry => getMetricValue(entry, metricId))
      .filter(value => Number.isFinite(value))
      .sort((a, b) => a - b)

    if (values.length < 2) {
      benchmarks[metricId] = {
        min: values[0] ?? 0,
        max: values[0] ?? 0,
        sampleSize: values.length
      }
      return
    }

    // Winsorized min/max keeps one extreme map sample from dominating the 0-100 scale.
    const p05 = percentile(values, 0.05)
    const p95 = percentile(values, 0.95)

    benchmarks[metricId] = {
      min: p05,
      max: p95,
      sampleSize: values.length
    }
  })

  return benchmarks
}

function normalizeMetric(entry, metricId, benchmark) {
  const metric = METRIC_BY_ID[metricId]
  const value = getMetricValue(entry, metricId)
  const min = toFiniteNumber(benchmark?.min)
  const max = toFiniteNumber(benchmark?.max)

  if (!metric || !Number.isFinite(value)) return 0
  if (!benchmark || benchmark.sampleSize === 0) return 0
  if (max === min) return 0.5

  const normalized = clamp((value - min) / (max - min))

  if (metric.direction === 'negative') {
    if (toFiniteNumber(entry?.roleTimeMins) <= 0) return 0
    return 1 - normalized
  }

  return normalized
}

function getSampleConfidence(entry, minTimeMins) {
  const roleTimeMins = toFiniteNumber(entry?.roleTimeMins)
  const mapsPlayed = toFiniteNumber(entry?.roleMapsPlayed)
  const targetTimeMins = minTimeMins + (minTimeMins * SAMPLE_CONFIDENCE_TIME_MULTIPLIER)

  if (roleTimeMins <= 0) return 0

  const timeProgress = targetTimeMins > minTimeMins
    ? clamp((roleTimeMins - minTimeMins) / (targetTimeMins - minTimeMins))
    : 1

  const mapProgress = mapsPlayed > 0
    ? clamp((mapsPlayed - SAMPLE_CONFIDENCE_MIN_MAPS) / (SAMPLE_CONFIDENCE_TARGET_MAPS - SAMPLE_CONFIDENCE_MIN_MAPS))
    : timeProgress

  if (roleTimeMins < minTimeMins) {
    return clamp((roleTimeMins / Math.max(1, minTimeMins)) * SAMPLE_CONFIDENCE_FLOOR, 0, SAMPLE_CONFIDENCE_FLOOR)
  }

  return SAMPLE_CONFIDENCE_FLOOR + ((1 - SAMPLE_CONFIDENCE_FLOOR) * Math.min(timeProgress, mapProgress))
}

function applySampleConfidence(score, confidence) {
  const safeScore = toFiniteNumber(score)
  const safeConfidence = clamp(toFiniteNumber(confidence), 0, 1)
  return SCORE_NEUTRAL_BASELINE + ((safeScore - SCORE_NEUTRAL_BASELINE) * safeConfidence)
}

function getRankPercentile(rank, total) {
  if (!rank || total <= 0) return null
  if (total === 1) return 100
  return Math.round(((total - rank) / (total - 1)) * 100)
}

export function getSeasonOvrConfidenceCap(confidence) {
  const floorConfidence = toFiniteNumber(SEASON_SCORE_CONFIG.confidenceFloor, 0.65)
  const solidConfidence = toFiniteNumber(SEASON_SCORE_CONFIG.solidConfidence, 0.85)
  const stableConfidence = toFiniteNumber(SEASON_SCORE_CONFIG.stableConfidence, 0.95)
  const provisionalCap = toFiniteNumber(SEASON_SCORE_CONFIG.provisionalOvrCap, 89)
  const solidCap = toFiniteNumber(SEASON_SCORE_CONFIG.solidOvrCap, 94)
  const stableCap = toFiniteNumber(SEASON_SCORE_CONFIG.stableOvrCap, 99)
  const value = toFiniteNumber(confidence, floorConfidence)

  if (value <= floorConfidence) return provisionalCap
  if (value < solidConfidence) {
    const progress = (value - floorConfidence) / Math.max(0.001, solidConfidence - floorConfidence)
    return Math.round(provisionalCap + ((solidCap - provisionalCap) * progress))
  }
  if (value < stableConfidence) {
    const progress = (value - solidConfidence) / Math.max(0.001, stableConfidence - solidConfidence)
    return Math.round(solidCap + ((stableCap - solidCap) * progress))
  }
  return stableCap
}

export function getSeasonPerformancePercentile(seasonScore) {
  const points = OVR_CONFIG.seasonBlend?.performancePercentileCurve || []
  const value = Number(seasonScore)
  if (!Number.isFinite(value) || !points.length) return null
  if (value <= points[0].score) return clamp(toFiniteNumber(points[0].percentile), 0, 100)

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const next = points[index]
    if (value <= next.score) {
      const span = toFiniteNumber(next.score) - toFiniteNumber(previous.score)
      const progress = span > 0 ? (value - previous.score) / span : 0
      return clamp(
        toFiniteNumber(previous.percentile) +
          ((toFiniteNumber(next.percentile) - toFiniteNumber(previous.percentile)) * progress),
        0,
        100
      )
    }
  }

  return clamp(toFiniteNumber(points[points.length - 1].percentile), 0, 100)
}

export function getSeasonOvrBlendPercentile(seasonScore, rolePercentile) {
  const performancePercentile = getSeasonPerformancePercentile(seasonScore)
  const roleValue = Number(rolePercentile)
  if (!Number.isFinite(performancePercentile) || !Number.isFinite(roleValue)) return null

  const performanceWeight = Math.max(0, toFiniteNumber(OVR_CONFIG.seasonBlend?.performanceWeight, 0.7))
  const roleWeight = Math.max(0, toFiniteNumber(OVR_CONFIG.seasonBlend?.rolePercentileWeight, 0.3))
  const weightTotal = performanceWeight + roleWeight
  if (weightTotal <= 0) return null

  return clamp(
    ((performancePercentile * performanceWeight) + (clamp(roleValue, 0, 100) * roleWeight)) / weightTotal,
    0,
    100
  )
}

function applySeasonOvrConfidenceCap(ovr, confidence) {
  const value = Number(ovr)
  if (!Number.isFinite(value)) return null
  return Math.min(value, getSeasonOvrConfidenceCap(confidence))
}

export function getSeasonOvrValue(seasonScore, rolePercentile, confidence) {
  const blendedPercentile = getSeasonOvrBlendPercentile(seasonScore, rolePercentile)
  const percentileOvr = Number.isFinite(blendedPercentile)
    ? mapRawScoreToOVR(null, blendedPercentile, { sampleStatus: 'OK' })
    : null
  return applySeasonOvrConfidenceCap(percentileOvr, confidence)
}

function attachSeasonOvrFields(scored) {
  const eligibleRows = scored.filter(entry => entry.eligible)
  const overallTotal = eligibleRows.length

  ROLE_ORDER.forEach(role => {
    const roleRows = scored.filter(entry => entry.role === role && entry.eligible)
    const roleTotal = roleRows.length

    roleRows.forEach(entry => {
      entry.seasonScoreRoleRank = entry.roleRank
      entry.seasonScoreOverallRank = entry.overallRank
      entry.seasonRolePercentile = getRankPercentile(entry.roleRank, roleTotal)
      entry.seasonOverallPercentile = getRankPercentile(entry.overallRank, overallTotal)
      entry.seasonPerformancePercentile = getSeasonPerformancePercentile(entry.seasonScore)
      entry.seasonOvrPercentile = getSeasonOvrBlendPercentile(entry.seasonScore, entry.seasonRolePercentile)
      entry.seasonOvr = getSeasonOvrValue(entry.seasonScore, entry.seasonRolePercentile, entry.seasonScoreConfidence)
      entry.seasonOvrCap = getSeasonOvrConfidenceCap(entry.seasonScoreConfidence)
      entry.seasonOvrSource = 'performance_role_blend'
    })
  })

  scored
    .filter(entry => !entry.eligible)
    .forEach(entry => {
      entry.seasonRolePercentile = null
      entry.seasonOverallPercentile = null
      entry.seasonPerformancePercentile = null
      entry.seasonOvrPercentile = null
      entry.seasonOvr = null
      entry.seasonOvrCap = null
      entry.seasonOvrSource = 'unrated'
    })

  return scored
}

export function getRoleConfig(role) {
  return ROLE_SCORE_CONFIG[role] || null
}

export function getRoleCoreMetricIds(role, heroName = '') {
  return getRoleScoreConfig(role, heroName)?.coreMetrics || []
}

export function isRoleCoreMetric(role, metricId, heroName = '') {
  return getRoleCoreMetricIds(role, heroName).includes(metricId)
}

export function getPrimaryTieMetric(role, heroName = '') {
  return getRoleCoreMetricIds(role, heroName).find(metricId => metricId !== 'dth') || 'elim'
}

export function compareLeaderboardEntries(a, b) {
  const scoreDelta = toFiniteNumber(b.roleScore) - toFiniteNumber(a.roleScore)
  if (scoreDelta !== 0) return scoreDelta

  const primaryMetricA = getPrimaryTieMetric(a.role, a.most_played_hero)
  const primaryMetricB = getPrimaryTieMetric(b.role, b.most_played_hero)
  const primaryA = toFiniteNumber(a.normalizedMetrics?.[primaryMetricA], getMetricValue(a, primaryMetricA))
  const primaryB = toFiniteNumber(b.normalizedMetrics?.[primaryMetricB], getMetricValue(b, primaryMetricB))
  const primaryDelta = primaryB - primaryA
  if (primaryDelta !== 0) return primaryDelta

  const timeDelta = toFiniteNumber(b.roleTimeMins) - toFiniteNumber(a.roleTimeMins)
  if (timeDelta !== 0) return timeDelta

  const deathDelta = getMetricValue(a, 'dth') - getMetricValue(b, 'dth')
  if (deathDelta !== 0) return deathDelta

  return String(a.player_id || a.entryKey).localeCompare(String(b.player_id || b.entryKey))
}

export function scoreLeaderboardEntriesLegacy(entries, minTimeMins = 30) {
  const prepared = entries.map(entry => ({
    ...entry,
    eligible: toFiniteNumber(entry.roleTimeMins) >= minTimeMins,
    eligibilityReason: toFiniteNumber(entry.roleTimeMins) >= minTimeMins ? 'qualified' : 'insufficient_sample'
  }))

  const benchmarksByRole = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = buildBenchmarks(prepared, role)
    return acc
  }, {})

  const scored = prepared.map(entry => {
    const config = getRoleScoreConfig(entry.role, entry.most_played_hero)
    const benchmarks = benchmarksByRole[entry.role]
    const normalizedMetrics = {}

    if (!config || !benchmarks) {
      return {
        ...entry,
        roleScore: 0,
        normalizedMetrics,
        roleRank: null,
        overallRank: null
      }
    }

    let weightedScore = 0
    let weightTotal = 0

    Object.entries(config.weights).forEach(([metricId, weight]) => {
      const normalized = normalizeMetric(entry, metricId, benchmarks[metricId])
      normalizedMetrics[metricId] = normalized
      weightedScore += normalized * weight
      weightTotal += weight
    })

    const rawRoleScore = weightTotal > 0 ? (weightedScore / weightTotal) * 100 : 0
    const sampleConfidence = getSampleConfidence(entry, minTimeMins)
    const roleScore = applySampleConfidence(rawRoleScore, sampleConfidence)

    return {
      ...entry,
      rawRoleScore: Number(rawRoleScore.toFixed(3)),
      roleScore: Number(roleScore.toFixed(3)),
      sampleConfidence: Number(sampleConfidence.toFixed(3)),
      normalizedMetrics,
      scoreProfile: config.scoreProfile || 'role_default',
      scoreWeights: config.weights,
      roleRank: null,
      overallRank: null
    }
  })

  ROLE_ORDER.forEach(role => {
    scored
      .filter(entry => entry.role === role && entry.eligible)
      .sort(compareLeaderboardEntries)
      .forEach((entry, index) => {
        entry.roleRank = index + 1
      })
  })

  scored
    .filter(entry => entry.eligible)
    .sort(compareLeaderboardEntries)
    .forEach((entry, index) => {
      entry.overallRank = index + 1
    })

  return scored
}

export function scoreLeaderboardEntries(entries, minTimeMins = 30, options = {}) {
  const scoreContext = options.scoreContext || 'season'
  const legacyScored = scoreLeaderboardEntriesLegacy(entries, minTimeMins)
  const ratingScored = attachRatingModelScoreToLeaderboardRows({
    entries: legacyScored,
    db: options.db,
    players: options.players,
    baselines: options.baselines,
    season: options.season,
    seasonId: options.seasonId,
    scoreContext,
    winnerTeamKeys: options.winnerTeamKeys,
    currentMatchIds: options.currentMatchIds,
    currentMapOrders: options.currentMapOrders,
    mapDurationsByOrder: options.mapDurationsByOrder,
    minTimeMins
  }).map(entry => ({
    ...entry,
    roleRank: null,
    overallRank: null
  }))

  assignEntryRanks(ratingScored, compareLeaderboardEntries)
  if (scoreContext !== 'season') return ratingScored

  const withSeasonOvr = attachSeasonOvrFields(ratingScored)
  assignEntryRanks(withSeasonOvr, compareSeasonOvrEntries)
  return withSeasonOvr
}

function compareSeasonOvrEntries(a, b) {
  const aOvr = Number(a?.seasonOvr)
  const bOvr = Number(b?.seasonOvr)
  const aHasOvr = Number.isFinite(aOvr)
  const bHasOvr = Number.isFinite(bOvr)

  if (aHasOvr !== bHasOvr) return aHasOvr ? -1 : 1
  if (aHasOvr && aOvr !== bOvr) return bOvr - aOvr
  return compareLeaderboardEntries(a, b)
}

function assignEntryRanks(scored, comparator) {
  scored.forEach(entry => {
    entry.roleRank = null
    entry.overallRank = null
  })

  ROLE_ORDER.forEach(role => {
    scored
      .filter(entry => entry.role === role && entry.eligible)
      .sort(comparator)
      .forEach((entry, index) => {
        entry.roleRank = index + 1
      })
  })

  scored
    .filter(entry => entry.eligible)
    .sort(comparator)
    .forEach((entry, index) => {
      entry.overallRank = index + 1
    })

  return scored
}

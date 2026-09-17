import { getPlayerDossier } from '../../lib/playerDetailSelectors.js'
import { getLeaderboardRows, normalizeLeaderboardRole } from '../../lib/leaderboardSelectors.js'
import { resolveHeroSubrole } from '../../lib/heroSubroleSelectors.js'
import {
  buildScoutingOpponentStrengthModel,
  getScoutingOpponentStrengthSignals
} from './scoutingOpponentStrength.js'
import {
  buildScoutingProfessionalReference,
  getScoutingProfessionalReferenceMeta
} from './scoutingProfessionalReference.js'

export { getScoutingAccessRecord } from './scoutingAccess.js'

export const SCOUTING_SAMPLE_GATE = Object.freeze({
  maps: 20,
  minutes: 200,
  matches: 6
})

export const SCOUTING_MODEL_VERSION = 'scouting-selection-v2.7'

export const SCOUTING_SUBROLE_EVIDENCE_GATE = Object.freeze({
  maps: 10,
  minutes: 100,
  matches: 4
})

export const SCOUTING_SUBROLE_CONFIDENCE_TARGET = Object.freeze({
  maps: 20,
  minutes: 200,
  matches: 6
})

export const SCOUTING_V1_SELECTED_PLAYERS = Object.freeze([
  { playerId: 'FCR26-P0098', role: 'TANK', subrole: 'TANK' },
  { playerId: 'FCR26-P0001', role: 'TANK', subrole: 'TANK' },
  { playerId: 'FCR26-P0080', role: 'TANK', subrole: 'TANK' },
  { playerId: 'FCR26-P0130', role: 'TANK', subrole: 'TANK' },
  { playerId: 'FCR26-P0157', role: 'DPS', subrole: 'HITSCAN' },
  { playerId: 'FCR26-P0101', role: 'DPS', subrole: 'HITSCAN' },
  { playerId: 'FCR26-P0002', role: 'DPS', subrole: 'HITSCAN' },
  { playerId: 'FCR26-P0082', role: 'DPS', subrole: 'HITSCAN' },
  { playerId: 'FCR26-P0100', role: 'DPS', subrole: 'FLEX_DPS' },
  { playerId: 'FCR26-P0248', role: 'DPS', subrole: 'FLEX_DPS' },
  { playerId: 'FCR26-P0156', role: 'DPS', subrole: 'FLEX_DPS' },
  { playerId: 'FCR26-P0006', role: 'DPS', subrole: 'FLEX_DPS' },
  { playerId: 'FCR26-P0249', role: 'SUPPORT', subrole: 'MAIN_SUPPORT' },
  { playerId: 'FCR26-P0005', role: 'SUPPORT', subrole: 'MAIN_SUPPORT' },
  { playerId: 'FCR26-P0117', role: 'SUPPORT', subrole: 'MAIN_SUPPORT' },
  { playerId: 'FCR26-P0135', role: 'SUPPORT', subrole: 'MAIN_SUPPORT' },
  { playerId: 'FCR26-P0161', role: 'SUPPORT', subrole: 'FLEX_SUPPORT' },
  { playerId: 'FCR26-P0170', role: 'SUPPORT', subrole: 'FLEX_SUPPORT' },
  { playerId: 'FCR26-P0102', role: 'SUPPORT', subrole: 'FLEX_SUPPORT' },
  { playerId: 'FCR26-P0250', role: 'SUPPORT', subrole: 'FLEX_SUPPORT' }
])

export const SCOUTING_PLAYER_NATIONALITIES = Object.freeze({
  'FCR26-P0098': 'CN-MAINLAND',
  'FCR26-P0001': 'CN-MAINLAND',
  'FCR26-P0080': 'CN-MAINLAND',
  'FCR26-P0130': 'CN-MAINLAND',
  'FCR26-P0157': 'CN-MAINLAND',
  'FCR26-P0101': 'CN-MAINLAND',
  'FCR26-P0002': 'CN-MAINLAND',
  'FCR26-P0082': 'CN-MAINLAND',
  'FCR26-P0100': 'CN-MAINLAND',
  'FCR26-P0248': 'CN-MAINLAND',
  'FCR26-P0156': 'CN-MAINLAND',
  'FCR26-P0006': 'CN-MAINLAND',
  'FCR26-P0249': 'CN-MAINLAND',
  'FCR26-P0005': 'CN-MAINLAND',
  'FCR26-P0117': 'CN-MAINLAND',
  'FCR26-P0135': 'CN-MAINLAND',
  'FCR26-P0161': 'CN-MAINLAND',
  'FCR26-P0170': 'CN-MAINLAND',
  'FCR26-P0102': 'KR',
  'FCR26-P0250': 'CN-MAINLAND',
  'FCR26-P0167': 'CN-MAINLAND',
  'FCR26-P0169': 'CN-MAINLAND',
  'FCR26-P0081': 'CN-MAINLAND',
  'FCR26-P0173': 'CN-MAINLAND',
  'FCR26-P0103': 'KR',
  'FCR26-P0003': 'CN-MAINLAND'
})

export const SCOUTING_ROLE_SLOT_PLAN = Object.freeze({
  TANK: 5,
  DPS: 10,
  SUPPORT: 10
})

export const SCOUTING_SUBROLE_SLOT_PLAN = Object.freeze({
  TANK: 5,
  HITSCAN: 5,
  FLEX_DPS: 5,
  MAIN_SUPPORT: 5,
  FLEX_SUPPORT: 5
})

export const SCOUTING_CORE_SUBROLE_SLOT_PLAN = Object.freeze({
  TANK: 4,
  HITSCAN: 4,
  FLEX_DPS: 4,
  MAIN_SUPPORT: 4,
  FLEX_SUPPORT: 4
})

export const SCOUTING_PRIORITY_SUBROLE_SLOT_PLAN = Object.freeze({
  TANK: 3,
  HITSCAN: 3,
  FLEX_DPS: 3,
  MAIN_SUPPORT: 3,
  FLEX_SUPPORT: 3
})

export const SCOUTING_SELECTION_WEIGHTS = Object.freeze({
  performance: 0.25,
  opponentAdjusted: 0.2,
  profileFloor: 0.15,
  consistency: 0.15,
  stageValidation: 0.1,
  sampleDepth: 0.1,
  versatility: 0.05
})

export const SCOUTING_SUBROLE_SELECTION_WEIGHTS = Object.freeze({
  TANK: Object.freeze({
    performance: 0.22,
    opponentAdjusted: 0.2,
    profileFloor: 0.18,
    consistency: 0.14,
    stageValidation: 0.12,
    sampleDepth: 0.09,
    versatility: 0.05
  }),
  HITSCAN: Object.freeze({
    performance: 0.28,
    opponentAdjusted: 0.22,
    profileFloor: 0.13,
    consistency: 0.12,
    stageValidation: 0.12,
    sampleDepth: 0.08,
    versatility: 0.05
  }),
  FLEX_DPS: Object.freeze({
    performance: 0.23,
    opponentAdjusted: 0.19,
    profileFloor: 0.12,
    consistency: 0.12,
    stageValidation: 0.1,
    sampleDepth: 0.09,
    versatility: 0.15
  }),
  MAIN_SUPPORT: Object.freeze({
    performance: 0.18,
    opponentAdjusted: 0.18,
    profileFloor: 0.2,
    consistency: 0.18,
    stageValidation: 0.12,
    sampleDepth: 0.1,
    versatility: 0.04
  }),
  FLEX_SUPPORT: Object.freeze({
    performance: 0.23,
    opponentAdjusted: 0.2,
    profileFloor: 0.16,
    consistency: 0.14,
    stageValidation: 0.1,
    sampleDepth: 0.1,
    versatility: 0.07
  })
})

export const SCOUTING_PREFERENCE_SENSITIVITY = Object.freeze({
  trials: 5000,
  weightVariationPct: 30,
  seed: 20260822
})

export const SCOUTING_PAIRWISE_BOOTSTRAP = Object.freeze({
  trials: 5000,
  minimumMatches: 3,
  seed: 20260823
})

export const SCOUTING_DECISION_PROFILE = Object.freeze({
  method: 'role-relative-decision-profile-v1',
  scale: 'role-relative-decision-index-0-100',
  benchmark: 50,
  axisIds: Object.freeze([
    'adjustedPerformance',
    'competitiveFloor',
    'consistency',
    'pressureReadiness',
    'contextPortability'
  ])
})

export const SCOUTING_DEPLOYMENT_WEIGHTS = Object.freeze({
  baselineReliability: Object.freeze({ floor: 0.6, consistency: 0.4 }),
  pressureReadiness: Object.freeze({ strongOpponent: 0.55, stageValidation: 0.45 }),
  contextPortability: Object.freeze({ heroBreadth: 0.45, mapCoverage: 0.3, mapBalance: 0.25 })
})

export const SCOUTING_SUBROLE_DEPLOYMENT_WEIGHTS = Object.freeze({
  TANK: Object.freeze({
    baselineReliability: Object.freeze({ floor: 0.65, consistency: 0.35 }),
    pressureReadiness: Object.freeze({ strongOpponent: 0.6, stageValidation: 0.4 }),
    contextPortability: Object.freeze({ heroBreadth: 0.35, mapCoverage: 0.35, mapBalance: 0.3 })
  }),
  HITSCAN: Object.freeze({
    baselineReliability: Object.freeze({ floor: 0.55, consistency: 0.45 }),
    pressureReadiness: Object.freeze({ strongOpponent: 0.6, stageValidation: 0.4 }),
    contextPortability: Object.freeze({ heroBreadth: 0.5, mapCoverage: 0.25, mapBalance: 0.25 })
  }),
  FLEX_DPS: Object.freeze({
    baselineReliability: Object.freeze({ floor: 0.5, consistency: 0.5 }),
    pressureReadiness: Object.freeze({ strongOpponent: 0.5, stageValidation: 0.5 }),
    contextPortability: Object.freeze({ heroBreadth: 0.6, mapCoverage: 0.2, mapBalance: 0.2 })
  }),
  MAIN_SUPPORT: Object.freeze({
    baselineReliability: Object.freeze({ floor: 0.6, consistency: 0.4 }),
    pressureReadiness: Object.freeze({ strongOpponent: 0.5, stageValidation: 0.5 }),
    contextPortability: Object.freeze({ heroBreadth: 0.35, mapCoverage: 0.35, mapBalance: 0.3 })
  }),
  FLEX_SUPPORT: Object.freeze({
    baselineReliability: Object.freeze({ floor: 0.55, consistency: 0.45 }),
    pressureReadiness: Object.freeze({ strongOpponent: 0.55, stageValidation: 0.45 }),
    contextPortability: Object.freeze({ heroBreadth: 0.45, mapCoverage: 0.3, mapBalance: 0.25 })
  })
})

export const SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS = Object.freeze({
  BALANCED: Object.freeze({
    selectionScore: 0.25,
    baselineReliability: 0.25,
    pressureReadiness: 0.2,
    contextPortability: 0.15,
    evidenceConfidence: 0.1,
    selectionStability: 0.05
  }),
  RELIABLE_CORE: Object.freeze({
    selectionScore: 0.2,
    baselineReliability: 0.4,
    pressureReadiness: 0.15,
    contextPortability: 0.1,
    evidenceConfidence: 0.1,
    selectionStability: 0.05
  }),
  PRESSURE_MATCH: Object.freeze({
    selectionScore: 0.2,
    baselineReliability: 0.15,
    pressureReadiness: 0.4,
    contextPortability: 0.1,
    evidenceConfidence: 0.1,
    selectionStability: 0.05
  }),
  FLEXIBLE_POOL: Object.freeze({
    selectionScore: 0.2,
    baselineReliability: 0.15,
    pressureReadiness: 0.1,
    contextPortability: 0.4,
    evidenceConfidence: 0.1,
    selectionStability: 0.05
  })
})

export const SCOUTING_SUBROLE_RECRUITMENT_SCENARIO_WEIGHTS = Object.freeze({
  TANK: Object.freeze({
    BALANCED: Object.freeze({ selectionScore: 0.22, baselineReliability: 0.27, pressureReadiness: 0.22, contextPortability: 0.14, evidenceConfidence: 0.1, selectionStability: 0.05 }),
    RELIABLE_CORE: Object.freeze({ selectionScore: 0.16, baselineReliability: 0.44, pressureReadiness: 0.16, contextPortability: 0.08, evidenceConfidence: 0.11, selectionStability: 0.05 }),
    PRESSURE_MATCH: Object.freeze({ selectionScore: 0.18, baselineReliability: 0.17, pressureReadiness: 0.43, contextPortability: 0.08, evidenceConfidence: 0.09, selectionStability: 0.05 }),
    FLEXIBLE_POOL: Object.freeze({ selectionScore: 0.18, baselineReliability: 0.16, pressureReadiness: 0.12, contextPortability: 0.39, evidenceConfidence: 0.1, selectionStability: 0.05 })
  }),
  HITSCAN: Object.freeze({
    BALANCED: Object.freeze({ selectionScore: 0.3, baselineReliability: 0.2, pressureReadiness: 0.23, contextPortability: 0.12, evidenceConfidence: 0.1, selectionStability: 0.05 }),
    RELIABLE_CORE: Object.freeze({ selectionScore: 0.24, baselineReliability: 0.35, pressureReadiness: 0.18, contextPortability: 0.08, evidenceConfidence: 0.1, selectionStability: 0.05 }),
    PRESSURE_MATCH: Object.freeze({ selectionScore: 0.24, baselineReliability: 0.12, pressureReadiness: 0.45, contextPortability: 0.07, evidenceConfidence: 0.07, selectionStability: 0.05 }),
    FLEXIBLE_POOL: Object.freeze({ selectionScore: 0.24, baselineReliability: 0.12, pressureReadiness: 0.12, contextPortability: 0.39, evidenceConfidence: 0.08, selectionStability: 0.05 })
  }),
  FLEX_DPS: Object.freeze({
    BALANCED: Object.freeze({ selectionScore: 0.23, baselineReliability: 0.18, pressureReadiness: 0.19, contextPortability: 0.25, evidenceConfidence: 0.1, selectionStability: 0.05 }),
    RELIABLE_CORE: Object.freeze({ selectionScore: 0.18, baselineReliability: 0.35, pressureReadiness: 0.15, contextPortability: 0.17, evidenceConfidence: 0.1, selectionStability: 0.05 }),
    PRESSURE_MATCH: Object.freeze({ selectionScore: 0.2, baselineReliability: 0.12, pressureReadiness: 0.4, contextPortability: 0.18, evidenceConfidence: 0.05, selectionStability: 0.05 }),
    FLEXIBLE_POOL: Object.freeze({ selectionScore: 0.18, baselineReliability: 0.12, pressureReadiness: 0.1, contextPortability: 0.48, evidenceConfidence: 0.07, selectionStability: 0.05 })
  }),
  MAIN_SUPPORT: Object.freeze({
    BALANCED: Object.freeze({ selectionScore: 0.18, baselineReliability: 0.3, pressureReadiness: 0.18, contextPortability: 0.12, evidenceConfidence: 0.15, selectionStability: 0.07 }),
    RELIABLE_CORE: Object.freeze({ selectionScore: 0.14, baselineReliability: 0.45, pressureReadiness: 0.12, contextPortability: 0.08, evidenceConfidence: 0.15, selectionStability: 0.06 }),
    PRESSURE_MATCH: Object.freeze({ selectionScore: 0.16, baselineReliability: 0.23, pressureReadiness: 0.35, contextPortability: 0.08, evidenceConfidence: 0.12, selectionStability: 0.06 }),
    FLEXIBLE_POOL: Object.freeze({ selectionScore: 0.16, baselineReliability: 0.22, pressureReadiness: 0.1, contextPortability: 0.34, evidenceConfidence: 0.12, selectionStability: 0.06 })
  }),
  FLEX_SUPPORT: Object.freeze({
    BALANCED: Object.freeze({ selectionScore: 0.23, baselineReliability: 0.24, pressureReadiness: 0.21, contextPortability: 0.14, evidenceConfidence: 0.12, selectionStability: 0.06 }),
    RELIABLE_CORE: Object.freeze({ selectionScore: 0.18, baselineReliability: 0.4, pressureReadiness: 0.15, contextPortability: 0.1, evidenceConfidence: 0.12, selectionStability: 0.05 }),
    PRESSURE_MATCH: Object.freeze({ selectionScore: 0.2, baselineReliability: 0.15, pressureReadiness: 0.4, contextPortability: 0.09, evidenceConfidence: 0.11, selectionStability: 0.05 }),
    FLEXIBLE_POOL: Object.freeze({ selectionScore: 0.19, baselineReliability: 0.16, pressureReadiness: 0.11, contextPortability: 0.41, evidenceConfidence: 0.08, selectionStability: 0.05 })
  })
})

const ROLE_METRICS = {
  TANK: ['dmg', 'ast', 'dth', 'elim', 'block'],
  DPS: ['elim', 'dmg', 'dth', 'ast'],
  SUPPORT: ['heal', 'ast', 'dth', 'dmg', 'elim']
}

const SUBROLE_METRIC_PRIORITY = Object.freeze({
  TANK: ['dth', 'block', 'ast', 'dmg', 'elim'],
  HITSCAN: ['dmg', 'elim', 'dth', 'ast'],
  FLEX_DPS: ['elim', 'dmg', 'dth', 'ast'],
  MAIN_SUPPORT: ['ast', 'dth', 'heal', 'elim', 'dmg'],
  FLEX_SUPPORT: ['heal', 'dmg', 'ast', 'dth', 'elim']
})

const SCOUTING_TEAM_SHARE_SHADOW_WEIGHTS = Object.freeze({
  TANK: Object.freeze({ dmg: 0.45, elim: 0.3, ast: 0.25 }),
  HITSCAN: Object.freeze({ dmg: 0.6, elim: 0.4 }),
  FLEX_DPS: Object.freeze({ elim: 0.4, dmg: 0.4, ast: 0.2 }),
  MAIN_SUPPORT: Object.freeze({ heal: 0.45, ast: 0.4, elim: 0.15 }),
  FLEX_SUPPORT: Object.freeze({ heal: 0.4, dmg: 0.35, ast: 0.25 })
})

const TREND_METRIC_BY_ROLE = {
  TANK: 'dmg',
  DPS: 'dmg',
  SUPPORT: 'heal'
}

const MIN_CONTEXT_MATCHES = 2

function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function getSelectionWeights(subrole) {
  return SCOUTING_SUBROLE_SELECTION_WEIGHTS[subrole] || SCOUTING_SELECTION_WEIGHTS
}

function getDeploymentWeights(subrole) {
  return SCOUTING_SUBROLE_DEPLOYMENT_WEIGHTS[subrole] || SCOUTING_DEPLOYMENT_WEIGHTS
}

function getRecruitmentScenarioWeights(subrole, scenario) {
  return SCOUTING_SUBROLE_RECRUITMENT_SCENARIO_WEIGHTS[subrole]?.[scenario] ||
    SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS[scenario]
}

function getPlayerName(row) {
  return String(row?.display_name || row?.nickname || row?.player_name || row?.player_id || '').trim()
}

function getRoleLogs(player, role) {
  const normalizedRole = normalizeLeaderboardRole(role)
  return safeArr(player?.match_logs).filter(log => normalizeLeaderboardRole(log?.role || player?.role) === normalizedRole)
}

function getRoleMatchCount(player, role) {
  return new Set(getRoleLogs(player, role).map(log => log?.matchId || log?.match_id).filter(Boolean)).size
}

function getLogTotals(log) {
  const totals = log?.totals || log || {}
  return {
    elim: toNumber(totals.elims ?? totals.eliminations ?? totals.total_elim),
    ast: toNumber(totals.assists ?? totals.total_ast),
    dth: toNumber(totals.deaths ?? totals.total_dth),
    dmg: toNumber(totals.damage ?? totals.total_dmg),
    heal: toNumber(totals.healing ?? totals.total_heal),
    block: toNumber(totals.blocked ?? totals.mitigation ?? totals.total_block)
  }
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function quantile(values, percentile) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return 0
  const index = (sorted.length - 1) * percentile
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function getPer10(log, metricId) {
  const minutes = toNumber(log?.playtimeMinutes ?? log?.raw_time_mins)
  if (minutes <= 0) return 0
  return (getLogTotals(log)[metricId] / minutes) * 10
}

function getMetricSeries(player, role, metricId) {
  return getRoleLogs(player, role)
    .map(log => ({
      log,
      minutes: toNumber(log?.playtimeMinutes ?? log?.raw_time_mins),
      value: getPer10(log, metricId)
    }))
    .filter(row => row.minutes > 0 && row.value > 0)
}

function getVariationCoefficient(series) {
  const values = series.map(row => row.value)
  const mean = average(values)
  if (values.length < 5 || mean <= 0) return null
  const variance = average(values.map(value => (value - mean) ** 2))
  return Math.sqrt(variance) / mean
}

function getLowerIsBetterPercentile(values, target) {
  const valid = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!valid.length || !Number.isFinite(target)) return null
  const worseOrEqual = valid.filter(value => value >= target).length
  return Math.max(1, Math.min(100, Math.round((worseOrEqual / valid.length) * 100)))
}

function getHigherIsBetterPercentile(values, target) {
  const valid = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!valid.length || !Number.isFinite(target)) return null
  const lowerOrEqual = valid.filter(value => value <= target).length
  return Math.max(1, Math.min(100, Math.round((lowerOrEqual / valid.length) * 100)))
}

function getConsistencyBenchmarks(db, qualifiedPool) {
  const playersById = new Map(safeArr(db?.players).map(player => [player.player_id, player]))
  return qualifiedPool.reduce((benchmarks, candidate) => {
    const player = playersById.get(candidate.playerId)
    const metricId = TREND_METRIC_BY_ROLE[candidate.role] || 'dmg'
    const coefficient = getVariationCoefficient(getMetricSeries(player, candidate.role, metricId))
    if (!Number.isFinite(coefficient)) return benchmarks
    if (!benchmarks.has(candidate.role)) benchmarks.set(candidate.role, [])
    benchmarks.get(candidate.role).push(coefficient)
    return benchmarks
  }, new Map())
}

function getHeroPoolSignals(heroPool) {
  const shares = safeArr(heroPool).map(hero => toNumber(hero?.usagePct)).filter(value => value > 0)
  const concentration = shares.reduce((sum, share) => sum + share ** 2, 0)
  let cumulative = 0
  let coverage80 = 0

  for (const share of shares) {
    if (cumulative >= 0.8) break
    cumulative += share
    coverage80 += 1
  }

  return {
    recordedHeroes: shares.length,
    effectiveHeroes: concentration > 0 ? Number((1 / concentration).toFixed(1)) : 0,
    coverage80,
    primarySharePct: Math.round((shares[0] || 0) * 100)
  }
}

function getHeroMinutes(hero) {
  return toNumber(hero?.minutes ?? hero?.timeMins ?? hero?.playtimeMinutes ?? hero?.raw_time_mins)
}

function getSubroleProfile(heroPool, role) {
  if (role === 'TANK') {
    return {
      primary: 'TANK',
      primarySharePct: 100,
      secondary: null,
      secondarySharePct: 0,
      knownSharePct: 100,
      confidence: 'HIGH',
      hybrid: false,
      shares: [{ subrole: 'TANK', sharePct: 100 }]
    }
  }

  const totals = new Map()
  let knownMinutes = 0
  let totalMinutes = 0

  safeArr(heroPool).forEach(hero => {
    const minutes = getHeroMinutes(hero)
    if (minutes <= 0) return
    const resolution = resolveHeroSubrole(hero?.hero, { role })
    const subrole = resolution.resolvedSubrole
    totalMinutes += minutes
    if (resolution.known) knownMinutes += minutes
    totals.set(subrole, (totals.get(subrole) || 0) + minutes)
  })

  const fallback = role === 'DPS' ? 'FLEX_DPS' : 'FLEX_SUPPORT'
  const shares = [...totals.entries()]
    .map(([subrole, minutes]) => ({
      subrole,
      minutes: Number(minutes.toFixed(1)),
      sharePct: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0
    }))
    .sort((a, b) => b.minutes - a.minutes || a.subrole.localeCompare(b.subrole))
  const primary = shares[0] || { subrole: fallback, sharePct: 100 }
  const secondary = shares[1] || null

  return {
    primary: primary.subrole,
    primarySharePct: primary.sharePct,
    secondary: secondary?.subrole || null,
    secondarySharePct: secondary?.sharePct || 0,
    knownSharePct: totalMinutes > 0 ? Math.round((knownMinutes / totalMinutes) * 100) : 0,
    confidence: primary.sharePct >= 70 ? 'HIGH' : primary.sharePct >= 60 ? 'MEDIUM' : 'MIXED',
    hybrid: primary.sharePct < 60,
    shares
  }
}

function getSubroleHeroPool(heroPool, role, subrole) {
  const scoped = safeArr(heroPool).filter(hero => (
    role === 'TANK' || resolveHeroSubrole(hero?.hero, { role }).resolvedSubrole === subrole
  ))
  const totalMinutes = scoped.reduce((sum, hero) => sum + getHeroMinutes(hero), 0)

  return scoped.map(hero => {
    const usagePct = totalMinutes > 0 ? getHeroMinutes(hero) / totalMinutes : 0
    return {
      ...hero,
      usagePct,
      usageLabel: `${Math.round(usagePct * 100)}%`
    }
  })
}

function getSubroleEvidence(opponentStrength, subroleProfile) {
  const maps = toNumber(opponentStrength?.maps)
  const minutes = toNumber(opponentStrength?.minutes)
  const matches = toNumber(opponentStrength?.matches)
  const mapConfidence = Math.min(1, maps / SCOUTING_SUBROLE_CONFIDENCE_TARGET.maps)
  const minuteConfidence = Math.min(1, minutes / SCOUTING_SUBROLE_CONFIDENCE_TARGET.minutes)
  const matchConfidence = Math.min(1, matches / SCOUTING_SUBROLE_CONFIDENCE_TARGET.matches)
  const confidencePct = Math.round((mapConfidence * 0.4 + minuteConfidence * 0.4 + matchConfidence * 0.2) * 100)
  const eligible = (
    maps >= SCOUTING_SUBROLE_EVIDENCE_GATE.maps &&
    minutes >= SCOUTING_SUBROLE_EVIDENCE_GATE.minutes &&
    matches >= SCOUTING_SUBROLE_EVIDENCE_GATE.matches
  )
  const fullEvidence = (
    maps >= SCOUTING_SUBROLE_CONFIDENCE_TARGET.maps &&
    minutes >= SCOUTING_SUBROLE_CONFIDENCE_TARGET.minutes &&
    matches >= SCOUTING_SUBROLE_CONFIDENCE_TARGET.matches
  )

  return {
    maps,
    minutes: Number(minutes.toFixed(1)),
    matches,
    confidencePct,
    eligible,
    grade: fullEvidence ? 'FULL' : eligible ? 'PARTIAL' : 'LIMITED',
    purityPct: toNumber(subroleProfile?.primarySharePct),
    hybrid: Boolean(subroleProfile?.hybrid)
  }
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase()
}

function getTeamKeys(team) {
  return [
    team?.team_id,
    team?.id,
    team?.team_short_name,
    team?.short,
    team?.team_name,
    team?.name
  ].map(normalizeKey).filter(Boolean)
}

function getMatchSide(match, basePlayer, logs) {
  const playerKeys = [
    ...logs.flatMap(log => [log?.teamId, log?.team_id]),
    basePlayer?.team_id,
    basePlayer?.team_short_name,
    basePlayer?.team_name
  ].map(normalizeKey).filter(Boolean)
  const teamAKeys = getTeamKeys(match?.team_a)
  const teamBKeys = getTeamKeys(match?.team_b)

  if (playerKeys.some(key => teamAKeys.includes(key))) return 'A'
  if (playerKeys.some(key => teamBKeys.includes(key))) return 'B'
  return ''
}

function getMatchResult(match, side) {
  const scoreA = Number(match?.team_a?.score)
  const scoreB = Number(match?.team_b?.score)
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || !side) return 'unknown'
  const own = side === 'A' ? scoreA : scoreB
  const opponent = side === 'A' ? scoreB : scoreA
  if (own > opponent) return 'win'
  if (own < opponent) return 'loss'
  return 'draw'
}

function buildRoleMatches(db, basePlayer, role) {
  const matchesById = new Map()
  safeArr(db?.matches).forEach(match => {
    [match?.match_id, match?.raw_match_id, match?.id]
      .map(normalizeKey)
      .filter(Boolean)
      .forEach(id => matchesById.set(id, match))
  })

  const groups = new Map()
  getRoleLogs(basePlayer, role).forEach(log => {
    const matchKey = normalizeKey(log?.matchId || log?.match_id || log?.rawMatchId || log?.raw_match_id)
    if (!matchKey) return
    if (!groups.has(matchKey)) groups.set(matchKey, [])
    groups.get(matchKey).push(log)
  })

  return [...groups.entries()].map(([matchKey, logs]) => {
    const match = matchesById.get(matchKey) || logs
      .flatMap(log => [log?.matchId, log?.match_id, log?.rawMatchId, log?.raw_match_id])
      .map(normalizeKey)
      .filter(Boolean)
      .map(id => matchesById.get(id))
      .find(Boolean)
    const side = getMatchSide(match, basePlayer, logs)
    const totals = logs.reduce((sum, log) => {
      const row = getLogTotals(log)
      Object.keys(sum).forEach(metricId => { sum[metricId] += row[metricId] })
      return sum
    }, { elim: 0, ast: 0, dth: 0, dmg: 0, heal: 0, block: 0 })

    return {
      matchId: match?.match_id || logs[0]?.matchId || matchKey,
      stage: String(match?.stage || logs[0]?.stage || '').toUpperCase(),
      minutes: logs.reduce((sum, log) => sum + toNumber(log?.playtimeMinutes ?? log?.raw_time_mins), 0),
      maps: new Set(logs.map(log => `${log?.mapOrder || ''}:${log?.mapName || log?.map_name || ''}`)).size,
      totals,
      result: getMatchResult(match, side)
    }
  })
}

function aggregateMatchMetric(matches, metricId, predicate) {
  const rows = safeArr(matches).filter(match => predicate(match) && toNumber(match?.minutes) > 0)
  const minutes = rows.reduce((sum, match) => sum + toNumber(match.minutes), 0)
  const total = rows.reduce((sum, match) => sum + toNumber(match?.totals?.[metricId]), 0)
  return {
    matches: rows.length,
    minutes,
    value: minutes > 0 ? Number(((total / minutes) * 10).toFixed(1)) : null
  }
}

function getDeltaPct(current, baseline) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline <= 0) return null
  return Math.round(((current - baseline) / baseline) * 100)
}

function getResultContext(matches, metricId) {
  const wins = aggregateMatchMetric(matches, metricId, match => match?.result === 'win')
  const losses = aggregateMatchMetric(matches, metricId, match => match?.result === 'loss')
  return {
    wins,
    losses,
    deltaPct: wins.matches >= MIN_CONTEXT_MATCHES && losses.matches >= MIN_CONTEXT_MATCHES
      ? getDeltaPct(losses.value, wins.value)
      : null
  }
}

function getStageContext(matches, metricId) {
  const playoffs = aggregateMatchMetric(matches, metricId, match => String(match?.stage || '').toUpperCase() === 'PLAYOFFS')
  const earlier = aggregateMatchMetric(matches, metricId, match => String(match?.stage || '').toUpperCase() !== 'PLAYOFFS')
  return {
    playoffs,
    earlier,
    deltaPct: playoffs.matches >= MIN_CONTEXT_MATCHES && earlier.matches >= MIN_CONTEXT_MATCHES
      ? getDeltaPct(playoffs.value, earlier.value)
      : null
  }
}

function getMapTypeProfile(series, metricId) {
  const groups = new Map()

  series.forEach(({ log, minutes }) => {
    const mapType = String(log?.mapType || log?.map_type || '').trim()
    if (!mapType) return
    if (!groups.has(mapType)) groups.set(mapType, { mapType, maps: 0, minutes: 0, total: 0 })
    const group = groups.get(mapType)
    group.maps += 1
    group.minutes += minutes
    group.total += getLogTotals(log)[metricId]
  })

  const rows = [...groups.values()]
    .filter(group => group.maps >= 2 && group.minutes >= 15)
    .map(group => ({
      mapType: group.mapType,
      maps: group.maps,
      minutes: Number(group.minutes.toFixed(1)),
      value: Number(((group.total / group.minutes) * 10).toFixed(1))
    }))
    .sort((a, b) => b.value - a.value)

  return {
    strongest: rows[0] || null,
    comparison: rows.length > 1 ? rows.at(-1) : null,
    groups: rows
  }
}

function buildPerformanceSignals(basePlayer, roleData, role, consistencyBenchmarks, roleMatches) {
  const metricId = TREND_METRIC_BY_ROLE[role] || 'dmg'
  const series = getMetricSeries(basePlayer, role, metricId)
  const values = series.map(row => row.value)
  const recent = values.slice(-5)
  const previous = values.slice(-10, -5)
  const coefficient = getVariationCoefficient(series)
  const recentValue = recent.length >= 3 ? average(recent) : null
  const previousValue = previous.length >= 3 ? average(previous) : null

  return {
    focusMetricId: metricId,
    consistency: {
      percentile: getLowerIsBetterPercentile(consistencyBenchmarks, coefficient),
      variationPct: Number.isFinite(coefficient) ? Math.round(coefficient * 100) : null,
      middle50Low: values.length ? Number(quantile(values, 0.25).toFixed(1)) : null,
      middle50High: values.length ? Number(quantile(values, 0.75).toFixed(1)) : null,
      maps: values.length
    },
    form: {
      recentValue: Number.isFinite(recentValue) ? Number(recentValue.toFixed(1)) : null,
      previousValue: Number.isFinite(previousValue) ? Number(previousValue.toFixed(1)) : null,
      deltaPct: getDeltaPct(recentValue, previousValue),
      recentMaps: recent.length,
      previousMaps: previous.length
    },
    heroPool: getHeroPoolSignals(roleData?.heroPool),
    resultContext: getResultContext(roleMatches, metricId),
    stageContext: getStageContext(roleMatches, metricId),
    mapTypeProfile: getMapTypeProfile(series, metricId)
  }
}

function getTrend(player, role) {
  const metricId = TREND_METRIC_BY_ROLE[role] || 'dmg'
  const rows = getRoleLogs(player, role)
    .map((log, index) => {
      const minutes = toNumber(log?.playtimeMinutes ?? log?.raw_time_mins)
      const totals = getLogTotals(log)
      return {
        order: index + 1,
        mapName: String(log?.mapName || log?.map_name || '').trim(),
        hero: String(log?.hero || log?.heroes_played || '').trim(),
        value: minutes > 0 ? Number(((totals[metricId] / minutes) * 10).toFixed(1)) : 0
      }
    })
    .filter(row => row.value > 0)
    .slice(-10)

  return { metricId, rows }
}

function getSampleDepth({ maps, minutes, matches }) {
  const mapDepth = Math.min(1, toNumber(maps) / 32)
  const minuteDepth = Math.min(1, toNumber(minutes) / 360)
  const matchDepth = Math.min(1, toNumber(matches) / 10)
  return Math.round((mapDepth * 0.4 + minuteDepth * 0.4 + matchDepth * 0.2) * 100)
}

function getQualifiedPool(db, season) {
  const playersById = new Map(safeArr(db?.players).map(player => [player.player_id, player]))

  return getLeaderboardRows(db, season)
    .map(row => {
      const role = normalizeLeaderboardRole(row.role)
      const player = playersById.get(row.player_id)
      const maps = toNumber(row.roleMapsPlayed ?? row.maps_played)
      const minutes = toNumber(row.roleTimeMins ?? row.raw_time_mins)
      const matches = getRoleMatchCount(player, role)

      return {
        playerId: row.player_id,
        name: getPlayerName(row),
        team: String(row.team_short_name || row.team_name || '').trim(),
        role,
        ovr: Math.round(toNumber(row.seasonOvr)),
        maps,
        minutes,
        matches,
        sampleDepth: getSampleDepth({ maps, minutes, matches })
      }
    })
    .filter(row => (
      row.maps >= SCOUTING_SAMPLE_GATE.maps &&
      row.minutes >= SCOUTING_SAMPLE_GATE.minutes &&
      row.matches >= SCOUTING_SAMPLE_GATE.matches
    ))
}

function buildAnalysisTokens(roleData) {
  const role = normalizeLeaderboardRole(roleData?.role)
  const relevantMetrics = new Set(ROLE_METRICS[role] || ROLE_METRICS.DPS)
  const metrics = safeArr(roleData?.coreStats)
    .filter(metric => relevantMetrics.has(metric.id) && Number.isFinite(Number(metric.percentile)))
    .map(metric => ({
      metricId: metric.id,
      percentile: Math.round(Number(metric.percentile)),
      value: metric.valueLabel,
      average: metric.averageLabel
    }))
    .sort((a, b) => b.percentile - a.percentile)

  const heroPool = safeArr(roleData?.heroPool)
  const strengths = metrics.slice(0, 2).map(metric => ({
    type: 'metric_strength',
    ...metric
  }))
  const risks = []
  const relativeLow = [...metrics].sort((a, b) => a.percentile - b.percentile)[0]

  if (relativeLow) {
    risks.push({
      type: relativeLow.percentile < 45 ? 'metric_risk' : 'relative_watch',
      ...relativeLow
    })
  }

  if (heroPool.length <= 3) {
    risks.push({
      type: 'pool_depth',
      heroCount: heroPool.length,
      primaryHero: heroPool[0]?.hero || ''
    })
  } else if (toNumber(heroPool[0]?.usagePct) >= 0.5) {
    risks.push({
      type: 'hero_concentration',
      usagePct: Math.round(toNumber(heroPool[0]?.usagePct) * 100),
      primaryHero: heroPool[0]?.hero || ''
    })
  }

  return {
    strengths,
    risks: risks.slice(0, 2)
  }
}

function formatMetricBenchmarkValue(metricId, value) {
  if (!Number.isFinite(Number(value))) return '—'
  if (['dmg', 'heal', 'block'].includes(metricId)) {
    return Math.round(Number(value)).toLocaleString('en-US')
  }
  return Number(value).toFixed(1)
}

function addSubroleMetricBenchmarks(players) {
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())

  return players.map(player => {
    const peers = subroleGroups.get(player.subrole) || []
    const priority = SUBROLE_METRIC_PRIORITY[player.subrole] || ROLE_METRICS[player.role] || []
    const metrics = safeArr(player.roleMetrics).map(metric => {
      const peerValues = peers
        .map(peer => Number(safeArr(peer.roleMetrics).find(item => item.id === metric.id)?.value))
        .filter(Number.isFinite)
      const value = Number(metric.value)
      const lowerIsBetter = metric.direction === 'negative' || metric.id === 'dth'
      const subrolePercentile = lowerIsBetter
        ? getLowerIsBetterPercentile(peerValues, value)
        : getHigherIsBetterPercentile(peerValues, value)
      const subroleRank = 1 + peerValues.filter(peerValue => (
        lowerIsBetter ? peerValue < value : peerValue > value
      )).length
      const subroleAverage = peerValues.length ? average(peerValues) : null

      return {
        ...metric,
        subrolePercentile,
        subroleRank,
        subroleTotal: peerValues.length,
        subroleAverage: Number.isFinite(subroleAverage) ? Number(subroleAverage.toFixed(2)) : null,
        subroleAverageLabel: formatMetricBenchmarkValue(metric.id, subroleAverage)
      }
    })
    const tokens = metrics
      .filter(metric => Number.isFinite(Number(metric.subrolePercentile)))
      .map(metric => ({
        type: 'metric_strength',
        metricId: metric.id,
        percentile: metric.subrolePercentile,
        rolePercentile: metric.percentile,
        subroleRank: metric.subroleRank,
        subroleTotal: metric.subroleTotal,
        value: metric.valueLabel,
        average: metric.subroleAverageLabel,
        roleAverage: metric.averageLabel,
        benchmarkScope: 'subrole'
      }))
      .sort((a, b) => (
        b.percentile - a.percentile ||
        priority.indexOf(a.metricId) - priority.indexOf(b.metricId)
      ))
    const relativeLow = [...tokens].sort((a, b) => (
      a.percentile - b.percentile ||
      priority.indexOf(a.metricId) - priority.indexOf(b.metricId)
    ))[0]
    const contextualRisks = safeArr(player.risks).filter(item => (
      item.type === 'pool_depth' || item.type === 'hero_concentration'
    ))
    const metricRisk = relativeLow ? {
      ...relativeLow,
      type: relativeLow.percentile < 45 ? 'metric_risk' : 'relative_watch'
    } : null

    return {
      ...player,
      roleMetrics: metrics,
      strengths: tokens.slice(0, 2),
      risks: [metricRisk, ...contextualRisks].filter(Boolean).slice(0, 2)
    }
  })
}

function addTemporalValidation(players) {
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())

  return players.map(player => {
    const holdout = player?.performanceSignals?.opponentStrength?.temporalHoldout
    const peers = (subroleGroups.get(player.subrole) || [])
      .filter(peer => peer?.performanceSignals?.opponentStrength?.temporalHoldout?.eligible)
    const earlyScores = peers.map(peer => Number(
      peer.performanceSignals.opponentStrength.temporalHoldout.earlyAdjustedScore
    )).filter(Number.isFinite)
    const lateScores = peers.map(peer => Number(
      peer.performanceSignals.opponentStrength.temporalHoldout.lateAdjustedScore
    )).filter(Number.isFinite)
    const earlyScore = Number(holdout?.earlyAdjustedScore)
    const lateScore = Number(holdout?.lateAdjustedScore)
    const eligible = Boolean(holdout?.eligible && Number.isFinite(earlyScore) && Number.isFinite(lateScore))
    const earlyRank = eligible ? 1 + earlyScores.filter(score => score > earlyScore).length : null
    const lateRank = eligible ? 1 + lateScores.filter(score => score > lateScore).length : null
    const rankChange = eligible ? earlyRank - lateRank : null
    const status = !eligible
      ? 'INSUFFICIENT'
      : rankChange >= 2 ? 'IMPROVED' : rankChange <= -2 ? 'DECLINED' : 'STABLE'

    return {
      ...player,
      performanceSignals: {
        ...player.performanceSignals,
        temporalValidation: {
          method: holdout?.method || 'chronological-match-holdout-v1',
          rankingImpact: false,
          eligible,
          earlyMatches: holdout?.earlyMatches || 0,
          lateMatches: holdout?.lateMatches || 0,
          earlyAdjustedScore: Number.isFinite(earlyScore) ? earlyScore : null,
          lateAdjustedScore: Number.isFinite(lateScore) ? lateScore : null,
          delta: Number.isFinite(Number(holdout?.delta)) ? Number(holdout.delta) : null,
          earlyPercentile: eligible ? getHigherIsBetterPercentile(earlyScores, earlyScore) : null,
          latePercentile: eligible ? getHigherIsBetterPercentile(lateScores, lateScore) : null,
          earlyRank,
          lateRank,
          total: eligible ? peers.length : 0,
          rankChange,
          status
        }
      }
    }
  })
}

function hashBootstrapSeed(value) {
  let hash = SCOUTING_PAIRWISE_BOOTSTRAP.seed >>> 0
  for (const character of String(value)) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  }
  return hash >>> 0
}

function createBootstrapRandom(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function bootstrapClusterMean(clusters, random) {
  let sum = 0
  for (let index = 0; index < clusters.length; index += 1) {
    const sampled = clusters[Math.floor(random() * clusters.length)]
    sum += toNumber(sampled?.adjustedScore)
  }
  return clusters.length ? sum / clusters.length : 0
}

function buildPairwiseBootstrap(playerA, playerB) {
  const clustersA = safeArr(playerA?.performanceSignals?.opponentStrength?.comparisonClusters)
  const clustersB = safeArr(playerB?.performanceSignals?.opponentStrength?.comparisonClusters)
  if (
    clustersA.length < SCOUTING_PAIRWISE_BOOTSTRAP.minimumMatches ||
    clustersB.length < SCOUTING_PAIRWISE_BOOTSTRAP.minimumMatches
  ) return null

  const random = createBootstrapRandom(hashBootstrapSeed(`${playerA.playerId}|${playerB.playerId}`))
  const deltas = []
  let playerAWins = 0
  let ties = 0
  for (let trial = 0; trial < SCOUTING_PAIRWISE_BOOTSTRAP.trials; trial += 1) {
    const delta = bootstrapClusterMean(clustersA, random) - bootstrapClusterMean(clustersB, random)
    deltas.push(delta)
    if (delta > 0) playerAWins += 1
    else if (delta === 0) ties += 1
  }
  deltas.sort((a, b) => a - b)
  const probabilityPct = Number((((playerAWins + (ties * 0.5)) / SCOUTING_PAIRWISE_BOOTSTRAP.trials) * 100).toFixed(1))
  const lowIndex = Math.floor((deltas.length - 1) * 0.05)
  const highIndex = Math.ceil((deltas.length - 1) * 0.95)

  return {
    method: 'independent-match-cluster-bootstrap-v1',
    trials: SCOUTING_PAIRWISE_BOOTSTRAP.trials,
    probabilityPct,
    deltaLow90: Number(deltas[lowIndex].toFixed(1)),
    deltaHigh90: Number(deltas[highIndex].toFixed(1)),
    playerAMatches: clustersA.length,
    playerBMatches: clustersB.length
  }
}

function addPairwiseBootstrap(players) {
  const comparisonsByPlayer = new Map(players.map(player => [player.playerId, []]))
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())

  subroleGroups.forEach(peers => {
    for (let left = 0; left < peers.length; left += 1) {
      for (let right = left + 1; right < peers.length; right += 1) {
        const playerA = peers[left]
        const playerB = peers[right]
        const result = buildPairwiseBootstrap(playerA, playerB)
        if (!result) continue
        comparisonsByPlayer.get(playerA.playerId).push({
          opponentPlayerId: playerB.playerId,
          ...result
        })
        comparisonsByPlayer.get(playerB.playerId).push({
          opponentPlayerId: playerA.playerId,
          ...result,
          probabilityPct: Number((100 - result.probabilityPct).toFixed(1)),
          deltaLow90: Number((-result.deltaHigh90).toFixed(1)),
          deltaHigh90: Number((-result.deltaLow90).toFixed(1)),
          playerAMatches: result.playerBMatches,
          playerBMatches: result.playerAMatches
        })
      }
    }
  })

  return players.map(player => ({
    ...player,
    performanceSignals: {
      ...player.performanceSignals,
      pairwiseAdjustedPerformance: comparisonsByPlayer.get(player.playerId) || []
    }
  }))
}

function getTeamPlacement(db, basePlayer, identity) {
  const teamKeys = new Set([
    basePlayer?.team_id,
    basePlayer?.team_short_name,
    basePlayer?.team_name,
    identity?.teamRouteId,
    identity?.teamShort,
    identity?.teamFull
  ].map(normalizeKey).filter(Boolean))
  const records = [
    ...safeArr(db?.team_reviews),
    ...safeArr(db?.teams),
    ...safeArr(db?.standings)
  ]
  const record = records.find(team => getTeamKeys(team).some(key => teamKeys.has(key)))
  const rank = toNumber(record?.final_rank || record?.current_rank, 0)
  if (rank <= 0) return null

  return {
    rank,
    finalRankText: String(record?.final_rank_text || '').trim(),
    rankStage: String(record?.current_rank_stage || record?.rank_stage || '').toUpperCase(),
    isChampion: rank === 1
  }
}

function buildPrototypePlayer(db, season, spec, consistencyBenchmarks, opponentStrengthModel) {
  const dossier = getPlayerDossier(db, spec.playerId, spec.role, season)
  const roleData = dossier?.roleEntries?.find(entry => entry.role === spec.role) || dossier?.selectedRoleData
  if (!dossier || !roleData) return null

  const basePlayer = dossier.basePlayer
  const roleMatches = buildRoleMatches(db, basePlayer, spec.role)
  const matchCount = getRoleMatchCount(basePlayer, spec.role)
  const analysisTokens = buildAnalysisTokens(roleData)
  const subroleProfile = getSubroleProfile(roleData.heroPool, spec.role)
  const subroleHeroPool = getSubroleHeroPool(roleData.heroPool, spec.role, subroleProfile.primary)
  const opponentStrength = getScoutingOpponentStrengthSignals(
    opponentStrengthModel,
    spec.playerId,
    spec.role,
    subroleProfile.primary
  )
  const subroleEvidence = getSubroleEvidence(opponentStrength, subroleProfile)
  const basePerformanceSignals = buildPerformanceSignals(
    basePlayer,
    roleData,
    spec.role,
    consistencyBenchmarks,
    roleMatches
  )
  const envelope = opponentStrength?.performanceEnvelope

  return {
    playerId: spec.playerId,
    identity: dossier.identity,
    teamPlacement: getTeamPlacement(db, basePlayer, dossier.identity),
    role: spec.role,
    subrole: subroleProfile.primary,
    subroleProfile,
    subroleEvidence,
    summary: roleData.summary,
    heroPool: safeArr(roleData.heroPool),
    subroleHeroPool,
    radarData: safeArr(roleData.radarData),
    coreStats: safeArr(roleData.coreStats),
    roleMetrics: safeArr(roleData.coreStats).filter(metric => (ROLE_METRICS[spec.role] || []).includes(metric.id)),
    recentMatches: safeArr(roleData.recentMatches),
    trend: opponentStrength?.scoreTrend || getTrend(basePlayer, spec.role),
    performanceSignals: {
      ...basePerformanceSignals,
      focusMetricId: opponentStrength ? 'impact' : basePerformanceSignals.focusMetricId,
      consistency: opponentStrength ? {
        ...basePerformanceSignals.consistency,
        variationPct: opponentStrength.scoreVariationPct,
        middle50Low: envelope?.floor ?? null,
        middle50High: envelope?.ceiling ?? null,
        maps: opponentStrength.maps
      } : basePerformanceSignals.consistency,
      form: opponentStrength?.form || basePerformanceSignals.form,
      heroPool: getHeroPoolSignals(subroleHeroPool),
      opponentStrength
    },
    matchCount,
    sampleDepth: getSampleDepth({
      maps: roleData.summary.maps,
      minutes: roleData.summary.timeMins,
      matches: matchCount
    }),
    subroleSampleDepth: getSampleDepth(subroleEvidence),
    ...analysisTokens
  }
}

function getProfileFloor(player) {
  const percentiles = safeArr(player?.roleMetrics)
    .map(metric => Number(metric?.percentile))
    .filter(Number.isFinite)
  return percentiles.length ? Math.round(quantile(percentiles, 0.25)) : 0
}

function addOpponentStrengthPercentiles(players) {
  const scheduleRatings = players
    .map(player => Number(player?.performanceSignals?.opponentStrength?.scheduleRating))
    .filter(Number.isFinite)
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())

  return players.map(player => {
    const signals = player?.performanceSignals?.opponentStrength
    if (!signals) return player
    const peers = subroleGroups.get(player.subrole) || []
    const adjustedScores = peers
      .map(peer => Number(peer?.performanceSignals?.opponentStrength?.adjustedScore))
      .filter(Number.isFinite)
    const rawScores = peers
      .map(peer => Number(peer?.performanceSignals?.opponentStrength?.rawScore))
      .filter(Number.isFinite)

    return {
      ...player,
      performanceSignals: {
        ...player.performanceSignals,
        opponentStrength: {
          ...signals,
          schedulePercentile: getHigherIsBetterPercentile(scheduleRatings, Number(signals.scheduleRating)),
          rawPercentile: getHigherIsBetterPercentile(rawScores, Number(signals.rawScore)),
          adjustedPercentile: getHigherIsBetterPercentile(adjustedScores, Number(signals.adjustedScore))
        }
      }
    }
  })
}

function addDecisionIntelligence(players) {
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())

  return players.map(player => {
    const peers = subroleGroups.get(player.subrole) || []
    const signals = player?.performanceSignals?.opponentStrength
    const envelope = signals?.performanceEnvelope
    const pressure = signals?.pressureTest
    if (!signals || !envelope) return player

    const peerEnvelopes = peers
      .map(peer => peer?.performanceSignals?.opponentStrength?.performanceEnvelope)
      .filter(Boolean)
    const pressurePeers = peers
      .map(peer => peer?.performanceSignals?.opponentStrength?.pressureTest)
      .filter(item => item?.eligible && Number.isFinite(item?.adjustedScore) && Number.isFinite(item?.retentionPct))
    const variationPeers = peers
      .map(peer => Number(peer?.performanceSignals?.opponentStrength?.scoreVariationPct))
      .filter(Number.isFinite)
    const floorPercentile = getHigherIsBetterPercentile(
      peerEnvelopes.map(item => Number(item.floor)),
      Number(envelope.floor)
    )
    const typicalPercentile = getHigherIsBetterPercentile(
      peerEnvelopes.map(item => Number(item.median)),
      Number(envelope.median)
    )
    const ceilingPercentile = getHigherIsBetterPercentile(
      peerEnvelopes.map(item => Number(item.ceiling)),
      Number(envelope.ceiling)
    )
    const pressureScorePercentile = pressure?.eligible
      ? getHigherIsBetterPercentile(
          pressurePeers.map(item => Number(item.adjustedScore)),
          Number(pressure.adjustedScore)
        )
      : 50
    const pressureRetentionPercentile = pressure?.eligible
      ? getHigherIsBetterPercentile(
          pressurePeers.map(item => Number(item.retentionPct)),
          Number(pressure.retentionPct)
        )
      : 50
    const pressureRawPercentile = pressure?.eligible
      ? (toNumber(pressureScorePercentile, 50) * 0.7) + (toNumber(pressureRetentionPercentile, 50) * 0.3)
      : 50
    const pressureConfidence = toNumber(pressure?.confidencePct) / 100
    const pressurePercentile = Math.max(1, Math.min(100, Math.round(
      50 + ((pressureRawPercentile - 50) * pressureConfidence)
    )))
    const consistencyPercentile = getLowerIsBetterPercentile(
      variationPeers,
      Number(signals.scoreVariationPct)
    ) || 50
    const evidenceConfidencePct = Math.min(
      toNumber(signals?.evidenceQuality?.confidencePct),
      toNumber(player?.subroleEvidence?.confidencePct)
    )
    const evidenceGrade = evidenceConfidencePct >= 82 ? 'A' : evidenceConfidencePct >= 68 ? 'B' : 'C'

    return {
      ...player,
      performanceSignals: {
        ...player.performanceSignals,
        consistency: {
          ...player.performanceSignals.consistency,
          percentile: consistencyPercentile,
          variationPct: signals.scoreVariationPct,
          middle50Low: envelope.floor,
          middle50High: envelope.ceiling,
          maps: signals.maps
        },
        opponentStrength: {
          ...signals,
          evidenceQuality: {
            ...signals.evidenceQuality,
            confidencePct: evidenceConfidencePct,
            grade: evidenceGrade,
            subroleExposurePct: toNumber(player?.subroleEvidence?.confidencePct)
          },
          performanceEnvelope: {
            ...envelope,
            floorPercentile,
            typicalPercentile,
            ceilingPercentile
          },
          pressureTest: {
            ...pressure,
            scorePercentile: pressureScorePercentile,
            retentionPercentile: pressureRetentionPercentile,
            percentile: pressurePercentile
          },
          decisionProfile: {
            floorPercentile,
            typicalPercentile,
            ceilingPercentile,
            pressurePercentile,
            consistencyPercentile,
            evidenceConfidencePct,
            evidenceGrade
          }
        }
      }
    }
  })
}

function addStageValidationPercentiles(players) {
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())

  return players.map(player => {
    const peers = subroleGroups.get(player.subrole) || []
    const eligiblePeers = peers.filter(peer => {
      const context = peer?.performanceSignals?.opponentStrength?.stageContext
      return context?.playoffs?.matches >= 2 && Number.isFinite(context?.adjustedDeltaPct)
    })
    const context = player?.performanceSignals?.opponentStrength?.stageContext
    const eligible = context?.playoffs?.matches >= 2 && Number.isFinite(context?.adjustedDeltaPct)
    const playoffPerformancePercentile = eligible
      ? getHigherIsBetterPercentile(
          eligiblePeers.map(peer => Number(peer.performanceSignals.opponentStrength.stageContext.playoffs.adjustedScore)),
          Number(context.playoffs.adjustedScore)
        )
      : null
    const resiliencePercentile = eligible
      ? getHigherIsBetterPercentile(
          eligiblePeers.map(peer => Number(peer.performanceSignals.opponentStrength.stageContext.adjustedDeltaPct)),
          Number(context.adjustedDeltaPct)
        )
      : null
    const playoffMaps = toNumber(context?.playoffs?.maps)
    const playoffMatches = toNumber(context?.playoffs?.matches)
    const confidence = eligible
      ? (Math.min(1, playoffMaps / 10) * 0.6) + (Math.min(1, playoffMatches / 4) * 0.4)
      : 0
    const rawPercentile = eligible
      ? (toNumber(playoffPerformancePercentile, 50) * 0.65) + (toNumber(resiliencePercentile, 50) * 0.35)
      : 50
    const stagePercentile = Math.max(1, Math.min(100, Math.round(50 + ((rawPercentile - 50) * confidence))))

    return {
      ...player,
      performanceSignals: {
        ...player.performanceSignals,
        stageValidation: {
          percentile: stagePercentile,
          playoffPerformancePercentile,
          resiliencePercentile,
          confidencePct: Math.round(confidence * 100),
          eligible,
          playoffs: context?.playoffs || null,
          earlier: context?.earlier || null,
          adjustedDeltaPct: context?.adjustedDeltaPct ?? null
        }
      }
    }
  })
}

function getEligibleMapTypeGroups(player) {
  return safeArr(player?.performanceSignals?.opponentStrength?.adjustedMapTypes?.groups)
    .filter(group => group.maps >= 2 && Number.isFinite(Number(group.adjustedScore)))
}

function getMapTypeSpread(player) {
  const scores = getEligibleMapTypeGroups(player).map(group => Number(group.adjustedScore))
  if (scores.length < 2) return null
  return Math.max(...scores) - Math.min(...scores)
}

function getDeploymentMode(baselineReliability, pressureReadiness) {
  if (baselineReliability >= 65 && pressureReadiness >= 65) return 'CORE_READY'
  if (baselineReliability >= 65) return 'RELIABLE_BASE'
  if (pressureReadiness >= 65) return 'PRESSURE_OPTION'
  if (baselineReliability >= 50 && pressureReadiness >= 50) return 'BALANCED'
  return 'TARGETED_USE'
}

function getDeploymentContextStatus(retentionPct) {
  if (retentionPct >= 104) return 'PRIMARY'
  if (retentionPct >= 97) return 'STABLE'
  return 'CONDITIONAL'
}

function addContextDeploymentProfiles(players) {
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())

  return players.map(player => {
    const peers = subroleGroups.get(player.subrole) || []
    const signals = player?.performanceSignals?.opponentStrength
    if (!signals) return player
    const deploymentWeights = getDeploymentWeights(player.subrole)
    const eligibleMapTypes = getEligibleMapTypeGroups(player)
    const maximumMapTypeCoverage = Math.max(1, ...peers.map(peer => getEligibleMapTypeGroups(peer).length))
    const mapCoveragePct = Math.round((eligibleMapTypes.length / maximumMapTypeCoverage) * 100)
    const mapSpread = getMapTypeSpread(player)
    const peerSpreads = peers.map(getMapTypeSpread).filter(Number.isFinite)
    const mapBalancePercentile = Number.isFinite(mapSpread)
      ? getLowerIsBetterPercentile(peerSpreads, mapSpread)
      : 50
    const heroBreadthPercentile = getHigherIsBetterPercentile(
      peers.map(peer => toNumber(peer?.performanceSignals?.heroPool?.effectiveHeroes)).filter(value => value > 0),
      toNumber(player?.performanceSignals?.heroPool?.effectiveHeroes)
    )
    const floorPercentile = toNumber(signals?.performanceEnvelope?.floorPercentile, 50)
    const consistencyPercentile = toNumber(player?.performanceSignals?.consistency?.percentile, 50)
    const pressurePercentile = toNumber(signals?.pressureTest?.percentile, 50)
    const stagePercentile = toNumber(player?.performanceSignals?.stageValidation?.percentile, 50)
    const baselineReliability = Math.round(
      (floorPercentile * deploymentWeights.baselineReliability.floor) +
      (consistencyPercentile * deploymentWeights.baselineReliability.consistency)
    )
    const pressureReadiness = Math.round(
      (pressurePercentile * deploymentWeights.pressureReadiness.strongOpponent) +
      (stagePercentile * deploymentWeights.pressureReadiness.stageValidation)
    )
    const contextPortability = Math.round(
      (toNumber(heroBreadthPercentile, 50) * deploymentWeights.contextPortability.heroBreadth) +
      (mapCoveragePct * deploymentWeights.contextPortability.mapCoverage) +
      (toNumber(mapBalancePercentile, 50) * deploymentWeights.contextPortability.mapBalance)
    )
    const adjustedMapTypes = safeArr(signals?.adjustedMapTypes?.groups).map(group => {
      const peerScores = peers
        .flatMap(peer => safeArr(peer?.performanceSignals?.opponentStrength?.adjustedMapTypes?.groups))
        .filter(peerGroup => peerGroup.key === group.key && peerGroup.maps >= 2)
        .map(peerGroup => Number(peerGroup.adjustedScore))
        .filter(Number.isFinite)
      return {
        ...group,
        eligible: group.maps >= 2,
        percentile: group.maps >= 2
          ? getHigherIsBetterPercentile(peerScores, Number(group.adjustedScore))
          : null,
        retentionPct: signals.adjustedScore > 0 ? Math.round((group.adjustedScore / signals.adjustedScore) * 100) : null,
        confidencePct: Math.round((Math.min(1, group.maps / 8) * 0.7 + Math.min(1, group.matches / 4) * 0.3) * 100)
      }
    })
    const opponentTiers = safeArr(signals?.opponentTiers).map(tier => {
      const peerScores = peers
        .map(peer => safeArr(peer?.performanceSignals?.opponentStrength?.opponentTiers).find(item => item.key === tier.key))
        .filter(item => item?.maps >= 2 && Number.isFinite(Number(item.adjustedScore)))
        .map(item => Number(item.adjustedScore))
      return {
        ...tier,
        eligible: tier.maps >= 2,
        percentile: tier.maps >= 2
          ? getHigherIsBetterPercentile(peerScores, Number(tier.adjustedScore))
          : null,
        confidencePct: Math.round((
          (Math.min(1, tier.maps / 10) * 0.6) +
          (Math.min(1, tier.matches / 4) * 0.25) +
          (Math.min(1, tier.opponents / 3) * 0.15)
        ) * 100)
      }
    })
    const adjustedHeroContexts = safeArr(signals?.adjustedHeroContexts?.groups)
      .filter(group => group.maps >= 2)
      .slice(0, 4)
      .map(group => ({
        ...group,
        retentionPct: signals.adjustedScore > 0 ? Math.round((group.adjustedScore / signals.adjustedScore) * 100) : null,
        confidencePct: Math.round((Math.min(1, group.maps / 10) * 0.7 + Math.min(1, group.matches / 4) * 0.3) * 100)
      }))
    const playbook = signals?.deploymentPlaybook || {}
    const heroMapCells = safeArr(playbook.heroMapCells).map(cell => {
      const peerScores = peers
        .flatMap(peer => safeArr(peer?.performanceSignals?.opponentStrength?.deploymentPlaybook?.heroMapCells))
        .filter(peerCell => peerCell.hero === cell.hero && peerCell.mapType === cell.mapType && peerCell.eligible)
        .map(peerCell => Number(peerCell.contextScore))
        .filter(Number.isFinite)
      return {
        ...cell,
        percentile: peerScores.length >= 3
          ? getHigherIsBetterPercentile(peerScores, Number(cell.contextScore))
          : null,
        status: getDeploymentContextStatus(cell.retentionPct)
      }
    }).sort((a, b) => b.retentionPct - a.retentionPct || b.confidencePct - a.confidencePct)
    const enrichLineupContexts = (contexts, key) => safeArr(contexts).map(context => {
      const peerScores = peers
        .flatMap(peer => safeArr(peer?.performanceSignals?.opponentStrength?.deploymentPlaybook?.[key]))
        .filter(peerContext => peerContext.key === context.key && peerContext.eligible)
        .map(peerContext => Number(peerContext.contextScore))
        .filter(Number.isFinite)
      return {
        ...context,
        percentile: peerScores.length >= 3
          ? getHigherIsBetterPercentile(peerScores, Number(context.contextScore))
          : null,
        status: getDeploymentContextStatus(context.retentionPct)
      }
    }).sort((a, b) => b.retentionPct - a.retentionPct || b.confidencePct - a.confidencePct)
    const lineupAnchors = enrichLineupContexts(playbook.lineupAnchors, 'lineupAnchors')
    const partnerContexts = enrichLineupContexts(playbook.partnerContexts, 'partnerContexts')
    const primaryUse = heroMapCells[0] || null
    const secondaryUse = heroMapCells.find(cell => (
      !primaryUse || cell.hero !== primaryUse.hero || cell.mapType !== primaryUse.mapType
    )) || null
    const watchContext = [...heroMapCells]
      .sort((a, b) => a.retentionPct - b.retentionPct || b.confidencePct - a.confidencePct)
      .find(cell => cell.retentionPct < 97) || null
    const deploymentPlaybook = {
      ...playbook,
      coveragePct: playbook.observedHeroMapCells > 0
        ? Math.round((heroMapCells.length / playbook.observedHeroMapCells) * 100)
        : 0,
      eligibleHeroes: new Set(heroMapCells.map(cell => cell.hero)).size,
      eligibleMapTypes: new Set(heroMapCells.map(cell => cell.mapType)).size,
      heroMapCells,
      lineupAnchors,
      partnerContexts,
      recommendations: {
        primaryUse,
        secondaryUse,
        watchContext,
        bestAnchor: lineupAnchors[0] || null,
        bestPartner: partnerContexts[0] || null
      }
    }

    return {
      ...player,
      performanceSignals: {
        ...player.performanceSignals,
        opponentStrength: {
          ...signals,
          adjustedMapTypes: {
            ...signals.adjustedMapTypes,
            groups: adjustedMapTypes,
            strongest: adjustedMapTypes.filter(group => group.eligible).sort((a, b) => b.adjustedScore - a.adjustedScore)[0] || null,
            weakest: adjustedMapTypes.filter(group => group.eligible).sort((a, b) => a.adjustedScore - b.adjustedScore)[0] || null
          },
          opponentTiers,
          adjustedHeroContexts: {
            ...signals.adjustedHeroContexts,
            groups: adjustedHeroContexts
          },
          deploymentPlaybook
        },
        deploymentProfile: {
          baselineReliability,
          pressureReadiness,
          contextPortability,
          mode: getDeploymentMode(baselineReliability, pressureReadiness),
          weightProfile: player.subrole,
          components: {
            floorPercentile,
            consistencyPercentile,
            pressurePercentile,
            stagePercentile,
            heroBreadthPercentile,
            mapCoveragePct,
            mapBalancePercentile,
            mapTypeSpread: Number.isFinite(mapSpread) ? Number(mapSpread.toFixed(1)) : null
          }
        }
      }
    }
  })
}

function addSelectionScores(players) {
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())

  return players.map(player => {
    const subrolePeers = subroleGroups.get(player.subrole) || []
    const selectionWeights = getSelectionWeights(player.subrole)
    const versatility = getHigherIsBetterPercentile(
      subrolePeers.map(peer => toNumber(peer?.performanceSignals?.heroPool?.effectiveHeroes)),
      toNumber(player?.performanceSignals?.heroPool?.effectiveHeroes)
    )
    const factors = {
      performance: toNumber(player?.performanceSignals?.opponentStrength?.rawPercentile, 50),
      opponentAdjusted: toNumber(player?.performanceSignals?.opponentStrength?.adjustedPercentile),
      profileFloor: toNumber(
        player?.performanceSignals?.opponentStrength?.performanceEnvelope?.floorPercentile,
        getProfileFloor(player)
      ),
      consistency: toNumber(player?.performanceSignals?.consistency?.percentile),
      stageValidation: toNumber(player?.performanceSignals?.stageValidation?.percentile, 50),
      sampleDepth: toNumber(player?.subroleEvidence?.confidencePct),
      versatility: versatility || 0
    }
    const rawSelectionScore = Object.entries(selectionWeights).reduce((score, [factor, weight]) => (
      score + factors[factor] * weight
    ), 0)
    const roundedRawSelectionScore = Number(rawSelectionScore.toFixed(1))
    const subroleConfidence = toNumber(player?.subroleEvidence?.confidencePct) / 100
    const selectionScore = 50 + ((roundedRawSelectionScore - 50) * subroleConfidence)

    return {
      ...player,
      selection: {
        score: Number(selectionScore.toFixed(1)),
        rawScore: roundedRawSelectionScore,
        subroleConfidencePct: toNumber(player?.subroleEvidence?.confidencePct),
        weightProfile: player.subrole,
        factors
      }
    }
  })
}

function addDecisionProfiles(players) {
  return players.map(player => {
    const factors = player?.selection?.factors || {}
    const deployment = player?.performanceSignals?.deploymentProfile || {}
    const evidence = player?.performanceSignals?.opponentStrength?.evidenceQuality || {}
    const toIndex = value => Math.max(1, Math.min(100, Math.round(toNumber(value, 50))))
    const values = {
      adjustedPerformance: factors.opponentAdjusted,
      competitiveFloor: factors.profileFloor,
      consistency: factors.consistency,
      pressureReadiness: deployment.pressureReadiness,
      contextPortability: deployment.contextPortability
    }

    return {
      ...player,
      performanceSignals: {
        ...player.performanceSignals,
        decisionProfile: {
          method: SCOUTING_DECISION_PROFILE.method,
          scale: SCOUTING_DECISION_PROFILE.scale,
          benchmark: SCOUTING_DECISION_PROFILE.benchmark,
          weightProfile: player.subrole,
          roleComparisonOnly: true,
          evidenceConfidencePct: toNumber(evidence.confidencePct),
          evidenceGrade: evidence.grade || '—',
          axes: SCOUTING_DECISION_PROFILE.axisIds.map(id => ({
            id,
            value: toIndex(values[id])
          }))
        }
      }
    }
  })
}

function getRecruitmentScenarioInputs(player) {
  const deployment = player?.performanceSignals?.deploymentProfile
  return {
    selectionScore: toNumber(player?.selection?.score, 50),
    baselineReliability: toNumber(deployment?.baselineReliability, 50),
    pressureReadiness: toNumber(deployment?.pressureReadiness, 50),
    contextPortability: toNumber(deployment?.contextPortability, 50),
    evidenceConfidence: toNumber(player?.performanceSignals?.opponentStrength?.evidenceQuality?.confidencePct, 50),
    selectionStability: toNumber(player?.selection?.preferenceSensitivity?.relevantPct, 50)
  }
}

function addRecruitmentScenarioProfiles(players) {
  const scoredPlayers = players.map(player => {
    const inputs = getRecruitmentScenarioInputs(player)
    const fits = Object.fromEntries(Object.keys(SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS).map(scenario => {
      const weights = getRecruitmentScenarioWeights(player.subrole, scenario)
      const score = Object.entries(weights).reduce((sum, [factor, weight]) => (
        sum + (inputs[factor] * weight)
      ), 0)
      return [scenario, { score: Number(score.toFixed(1)) }]
    }))

    return {
      ...player,
      performanceSignals: {
        ...player.performanceSignals,
        recruitmentScenarios: { inputs, fits }
      }
    }
  })
  const ranksByPlayer = new Map(scoredPlayers.map(player => [player.playerId, {}]))

  Object.keys(SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS).forEach(scenario => {
    Object.keys(SCOUTING_SUBROLE_SLOT_PLAN).forEach(subrole => {
      const peers = scoredPlayers
        .filter(player => player.subrole === subrole)
        .sort((a, b) => (
          b.performanceSignals.recruitmentScenarios.fits[scenario].score - a.performanceSignals.recruitmentScenarios.fits[scenario].score ||
          b.selection.score - a.selection.score ||
          a.playerId.localeCompare(b.playerId)
        ))

      peers.forEach((player, index) => {
        ranksByPlayer.get(player.playerId)[scenario] = {
          rank: index + 1,
          total: peers.length
        }
      })
    })
  })

  return scoredPlayers.map(player => ({
    ...player,
    performanceSignals: {
      ...player.performanceSignals,
      recruitmentScenarios: {
        inputs: player.performanceSignals.recruitmentScenarios.inputs,
        fits: Object.fromEntries(Object.entries(player.performanceSignals.recruitmentScenarios.fits).map(([scenario, fit]) => [
          scenario,
          { ...fit, ...ranksByPlayer.get(player.playerId)[scenario] }
        ]))
      }
    }
  }))
}

function addPublicShortlistScenarioRanks(players) {
  const shortlistRanksByPlayer = new Map(players.map(player => [player.playerId, {}]))

  Object.keys(SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS).forEach(scenario => {
    Object.keys(SCOUTING_SUBROLE_SLOT_PLAN).forEach(subrole => {
      const peers = players
        .filter(player => player.subrole === subrole)
        .sort((a, b) => (
          b.performanceSignals.recruitmentScenarios.fits[scenario].score - a.performanceSignals.recruitmentScenarios.fits[scenario].score ||
          b.selection.score - a.selection.score ||
          a.playerId.localeCompare(b.playerId)
        ))

      peers.forEach((player, index) => {
        shortlistRanksByPlayer.get(player.playerId)[scenario] = {
          shortlistRank: index + 1,
          shortlistTotal: peers.length
        }
      })
    })
  })

  return players.map(player => ({
    ...player,
    performanceSignals: {
      ...player.performanceSignals,
      recruitmentScenarios: {
        ...player.performanceSignals.recruitmentScenarios,
        fits: Object.fromEntries(Object.entries(player.performanceSignals.recruitmentScenarios.fits).map(([scenario, fit]) => [
          scenario,
          { ...fit, ...shortlistRanksByPlayer.get(player.playerId)[scenario] }
        ]))
      }
    }
  }))
}

function buildScenarioMarketCoverage(players) {
  return Object.fromEntries(Object.keys(SCOUTING_SUBROLE_SLOT_PLAN).map(subrole => {
    const peers = players.filter(player => player.subrole === subrole)
    const selectedIds = new Set(peers.filter(player => player.selection.selectedByModel).map(player => player.playerId))
    const scenarios = Object.fromEntries(Object.keys(SCOUTING_RECRUITMENT_SCENARIO_WEIGHTS).map(scenario => {
      const ranked = [...peers].sort((a, b) => (
        b.performanceSignals.recruitmentScenarios.fits[scenario].score - a.performanceSignals.recruitmentScenarios.fits[scenario].score ||
        b.selection.score - a.selection.score ||
        a.playerId.localeCompare(b.playerId)
      ))
      const leader = ranked[0]
      const topThree = ranked.slice(0, 3)
      return [scenario, {
        leaderPlayerId: leader?.playerId || '',
        leaderSelected: Boolean(leader && selectedIds.has(leader.playerId)),
        topThreeSelected: topThree.filter(player => selectedIds.has(player.playerId)).length,
        topThreeTotal: topThree.length
      }]
    }))
    const complete = Object.values(scenarios).every(item => item.leaderSelected && item.topThreeSelected === item.topThreeTotal)
    return [subrole, { complete, scenarios }]
  }))
}

function rankSelectionCandidates(players) {
  const subroleRanks = new Map()

  return [...players]
    .sort((a, b) => (
      b.selection.score - a.selection.score ||
      b.selection.rawScore - a.selection.rawScore ||
      b.subroleSampleDepth - a.subroleSampleDepth ||
      a.playerId.localeCompare(b.playerId)
    ))
    .map(player => {
      const rank = (subroleRanks.get(player.subrole) || 0) + 1
      subroleRanks.set(player.subrole, rank)
      return {
        ...player,
        selection: {
          ...player.selection,
          subroleSelectionRank: rank,
          priorityByModel: rank <= SCOUTING_PRIORITY_SUBROLE_SLOT_PLAN[player.subrole],
          extendedByModel: rank === SCOUTING_CORE_SUBROLE_SLOT_PLAN[player.subrole],
          watchByModel: rank > SCOUTING_CORE_SUBROLE_SLOT_PLAN[player.subrole] && rank <= SCOUTING_SUBROLE_SLOT_PLAN[player.subrole],
          selectedByModel: rank <= SCOUTING_SUBROLE_SLOT_PLAN[player.subrole]
        }
      }
    })
}

function calculateStressedSelectionScore(player, opponentAdjusted) {
  const selectionWeights = getSelectionWeights(player.subrole)
  const factors = {
    ...player.selection.factors,
    opponentAdjusted: toNumber(opponentAdjusted, player.selection.factors.opponentAdjusted)
  }
  const rawScore = Object.entries(selectionWeights).reduce((score, [factor, weight]) => (
    score + (toNumber(factors[factor]) * weight)
  ), 0)
  const roundedRawScore = Number(rawScore.toFixed(1))
  const confidence = toNumber(player?.subroleEvidence?.confidencePct) / 100
  const score = 50 + ((roundedRawScore - 50) * confidence)
  return { score: Number(score.toFixed(1)), rawScore: roundedRawScore, opponentAdjusted: factors.opponentAdjusted }
}

function addRankingRobustness(players) {
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())
  const robustnessByPlayer = new Map()

  subroleGroups.forEach(subrolePlayers => {
    const stressTests = [
      {
        key: 'removeWeakestOpponent',
        getAdjustedScore: player => player?.performanceSignals?.opponentStrength?.robustness?.removeWeakestOpponent?.adjustedScore
      },
      {
        key: 'leaveOneMatchOut',
        getAdjustedScore: player => player?.performanceSignals?.opponentStrength?.robustness?.leaveOneMatchOut?.worstAdjustedScore
      }
    ]
    const stressedResults = new Map(subrolePlayers.map(player => [player.playerId, {}]))

    stressTests.forEach(test => {
      const adjustedScores = subrolePlayers.map(player => {
        const stressed = Number(test.getAdjustedScore(player))
        return Number.isFinite(stressed)
          ? stressed
          : toNumber(player?.performanceSignals?.opponentStrength?.adjustedScore)
      })
      const ranked = subrolePlayers
        .map((player, index) => calculateStressedSelectionScore(
          player,
          getHigherIsBetterPercentile(adjustedScores, adjustedScores[index])
        ))
        .map((result, index) => ({ player: subrolePlayers[index], ...result }))
        .sort((a, b) => (
          b.score - a.score ||
          b.rawScore - a.rawScore ||
          b.player.subroleSampleDepth - a.player.subroleSampleDepth ||
          a.player.playerId.localeCompare(b.player.playerId)
        ))

      ranked.forEach((result, index) => {
        const baseRank = result.player.selection.subroleSelectionRank
        const baseScore = result.player.selection.score
        stressedResults.get(result.player.playerId)[test.key] = {
          score: result.score,
          rawScore: result.rawScore,
          opponentAdjustedPercentile: result.opponentAdjusted,
          rank: index + 1,
          rankDelta: (index + 1) - baseRank,
          scoreDelta: Number((result.score - baseScore).toFixed(1))
        }
      })
    })

    subrolePlayers.forEach(player => {
      const source = player?.performanceSignals?.opponentStrength?.robustness || {}
      const results = stressedResults.get(player.playerId)
      const removeWeakestOpponent = {
        ...results.removeWeakestOpponent,
        eligible: Boolean(source.removeWeakestOpponent?.eligible),
        opponentTeamId: source.removeWeakestOpponent?.opponentTeamId || '',
        opponentTeamName: source.removeWeakestOpponent?.opponentTeamName || '',
        opponentRating: source.removeWeakestOpponent?.opponentRating ?? null,
        removedMaps: source.removeWeakestOpponent?.removedMaps || 0,
        adjustedScore: source.removeWeakestOpponent?.adjustedScore ?? null
      }
      const leaveOneMatchOut = {
        ...results.leaveOneMatchOut,
        eligible: Boolean(source.leaveOneMatchOut?.eligible),
        trials: source.leaveOneMatchOut?.trials || 0,
        influentialMatchId: source.leaveOneMatchOut?.influentialMatchId || '',
        influentialOpponentName: source.leaveOneMatchOut?.influentialOpponentName || '',
        removedMaps: source.leaveOneMatchOut?.removedMaps || 0,
        adjustedScore: source.leaveOneMatchOut?.worstAdjustedScore ?? null
      }
      const worstRankDrop = Math.max(0, removeWeakestOpponent.rankDelta || 0, leaveOneMatchOut.rankDelta || 0)
      const worstScoreDrop = Math.max(0, -(removeWeakestOpponent.scoreDelta || 0), -(leaveOneMatchOut.scoreDelta || 0))
      const status = worstRankDrop === 0 && worstScoreDrop <= 1.5
        ? 'STABLE'
        : worstRankDrop <= 1 && worstScoreDrop <= 3.5 ? 'SENSITIVE' : 'FRAGILE'

      robustnessByPlayer.set(player.playerId, {
        method: 'opponent-adjusted-factor-rerank',
        status,
        baseRank: player.selection.subroleSelectionRank,
        baseScore: player.selection.score,
        worstRankDrop,
        worstScoreDrop: Number(worstScoreDrop.toFixed(1)),
        removeWeakestOpponent,
        leaveOneMatchOut
      })
    })
  })

  return players.map(player => ({
    ...player,
    selection: {
      ...player.selection,
      robustness: robustnessByPlayer.get(player.playerId)
    }
  }))
}

function createSeededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = ((state * 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function getSensitivitySeed(subrole) {
  return [...String(subrole)].reduce(
    (seed, character) => (((seed * 31) + character.charCodeAt(0)) >>> 0),
    SCOUTING_PREFERENCE_SENSITIVITY.seed
  )
}

function addPreferenceSensitivity(players) {
  const subroleGroups = players.reduce((groups, player) => {
    if (!groups.has(player.subrole)) groups.set(player.subrole, [])
    groups.get(player.subrole).push(player)
    return groups
  }, new Map())
  const sensitivityByPlayer = new Map()
  const variation = SCOUTING_PREFERENCE_SENSITIVITY.weightVariationPct / 100

  subroleGroups.forEach((subrolePlayers, subrole) => {
    const random = createSeededRandom(getSensitivitySeed(subrole))
    const selectionWeights = getSelectionWeights(subrole)
    const factorNames = Object.keys(selectionWeights)
    const counts = new Map(subrolePlayers.map(player => [player.playerId, { leader: 0, priority: 0, shortlist: 0, publicPool: 0 }]))

    for (let trial = 0; trial < SCOUTING_PREFERENCE_SENSITIVITY.trials; trial += 1) {
      const variedWeights = factorNames.map(factor => {
        const multiplier = (1 - variation) + (random() * variation * 2)
        return [factor, selectionWeights[factor] * multiplier]
      })
      const weightTotal = variedWeights.reduce((sum, [, weight]) => sum + weight, 0)
      const ranked = [...subrolePlayers].sort((a, b) => {
        const score = player => {
          const rawScore = variedWeights.reduce((sum, [factor, weight]) => (
          sum + (toNumber(player.selection.factors[factor]) * (weight / weightTotal))
          ), 0)
          const confidence = toNumber(player?.subroleEvidence?.confidencePct) / 100
          return 50 + ((rawScore - 50) * confidence)
        }
        return score(b) - score(a) ||
          b.selection.rawScore - a.selection.rawScore ||
          b.subroleSampleDepth - a.subroleSampleDepth ||
          a.playerId.localeCompare(b.playerId)
      })

      ranked.forEach((player, index) => {
        const count = counts.get(player.playerId)
        if (index === 0) count.leader += 1
        if (index < SCOUTING_PRIORITY_SUBROLE_SLOT_PLAN[subrole]) count.priority += 1
        if (index < SCOUTING_CORE_SUBROLE_SLOT_PLAN[subrole]) count.shortlist += 1
        if (index < SCOUTING_SUBROLE_SLOT_PLAN[subrole]) count.publicPool += 1
      })
    }

    subrolePlayers.forEach(player => {
      const count = counts.get(player.playerId)
      const leaderPct = Number(((count.leader / SCOUTING_PREFERENCE_SENSITIVITY.trials) * 100).toFixed(1))
      const priorityPct = Number(((count.priority / SCOUTING_PREFERENCE_SENSITIVITY.trials) * 100).toFixed(1))
      const shortlistPct = Number(((count.shortlist / SCOUTING_PREFERENCE_SENSITIVITY.trials) * 100).toFixed(1))
      const publicPoolPct = Number(((count.publicPool / SCOUTING_PREFERENCE_SENSITIVITY.trials) * 100).toFixed(1))
      const target = player.selection.priorityByModel
        ? 'PRIORITY'
        : player.selection.extendedByModel ? 'SHORTLIST' : 'CORE_ENTRY'
      const relevantPct = target === 'PRIORITY' ? priorityPct : shortlistPct
      const status = relevantPct >= 90 ? 'STABLE' : relevantPct >= 70 ? 'WATCH' : 'BOUNDARY'

      sensitivityByPlayer.set(player.playerId, {
        trials: SCOUTING_PREFERENCE_SENSITIVITY.trials,
        weightVariationPct: SCOUTING_PREFERENCE_SENSITIVITY.weightVariationPct,
        weightProfile: subrole,
        target,
        leaderPct,
        priorityPct,
        shortlistPct,
        publicPoolPct,
        rankProbability: {
          top1Pct: leaderPct,
          top3Pct: priorityPct,
          top5Pct: publicPoolPct
        },
        relevantPct,
        status
      })
    })
  })

  return players.map(player => ({
    ...player,
    selection: {
      ...player.selection,
      preferenceSensitivity: sensitivityByPlayer.get(player.playerId)
    }
  }))
}

export function buildScoutingSelectionAudit(db, season) {
  const qualifiedPool = getQualifiedPool(db, season)
  const consistencyBenchmarks = getConsistencyBenchmarks(db, qualifiedPool)
  const opponentStrengthModel = buildScoutingOpponentStrengthModel(db)
  const candidates = qualifiedPool
    .map(candidate => buildPrototypePlayer(db, season, {
      playerId: candidate.playerId,
      role: candidate.role
    }, consistencyBenchmarks.get(candidate.role) || [], opponentStrengthModel))
    .filter(player => player?.subroleEvidence?.eligible)
  const rankedCandidates = addRecruitmentScenarioProfiles(
    addPreferenceSensitivity(
      addRankingRobustness(
        rankSelectionCandidates(
          addDecisionProfiles(
            addSelectionScores(
              addContextDeploymentProfiles(
                addStageValidationPercentiles(
                  addTemporalValidation(
                    addPairwiseBootstrap(
                      addSubroleMetricBenchmarks(
                        addDecisionIntelligence(
                          addOpponentStrengthPercentiles(candidates)
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
  const candidatesById = new Map(rankedCandidates.map(candidate => [candidate.playerId, candidate]))

  return {
    qualifiedPool: qualifiedPool.map(candidate => {
      const detailed = candidatesById.get(candidate.playerId)
      return {
        ...candidate,
        subrole: detailed?.subrole || candidate.role,
        subroleProfile: detailed?.subroleProfile || null,
        subroleEvidence: detailed?.subroleEvidence || null,
        selectionScore: detailed?.selection?.score || 0,
        subroleRank: detailed?.selection?.subroleSelectionRank || null,
        opponentStrength: detailed?.performanceSignals?.opponentStrength || null
      }
    }),
    candidates: rankedCandidates,
    roleSlotPlan: SCOUTING_ROLE_SLOT_PLAN,
    subroleSlotPlan: SCOUTING_SUBROLE_SLOT_PLAN,
    coreSubroleSlotPlan: SCOUTING_CORE_SUBROLE_SLOT_PLAN,
    prioritySubroleSlotPlan: SCOUTING_PRIORITY_SUBROLE_SLOT_PLAN,
    modelVersion: SCOUTING_MODEL_VERSION,
    subroleEvidenceGate: SCOUTING_SUBROLE_EVIDENCE_GATE,
    subroleConfidenceTarget: SCOUTING_SUBROLE_CONFIDENCE_TARGET,
    weights: SCOUTING_SUBROLE_SELECTION_WEIGHTS,
    deploymentWeights: SCOUTING_SUBROLE_DEPLOYMENT_WEIGHTS,
    recruitmentScenarioWeights: SCOUTING_SUBROLE_RECRUITMENT_SCENARIO_WEIGHTS,
    marketCoverage: buildScenarioMarketCoverage(rankedCandidates),
    preferenceSensitivity: SCOUTING_PREFERENCE_SENSITIVITY,
    opponentStrength: {
      observationCount: opponentStrengthModel.observationCount,
      eligibleMatchCount: opponentStrengthModel.eligibleMatchCount,
      thresholds: opponentStrengthModel.thresholds,
      roleModels: Object.fromEntries([...opponentStrengthModel.roleModels].map(([role, model]) => [role, {
        observations: model.observations,
        completeLineupObservations: model.completeLineupObservations,
        heroContexts: model.heroMeans.size,
        lineupAnchorContexts: model.lineupAnchorMeans.size,
        partnerContexts: model.lineupPartnerMeans.size,
        opponentCoefficientPer100: Number(model.opponentCoefficient.toFixed(2)),
        ownTeamCoefficientPer100: Number(model.ownTeamCoefficient.toFixed(2))
      }])),
      subroleModels: Object.fromEntries([...opponentStrengthModel.subroleModels].map(([subrole, model]) => [subrole, {
        observations: model.observations,
        completeLineupObservations: model.completeLineupObservations,
        heroContexts: model.heroMeans.size,
        lineupAnchorContexts: model.lineupAnchorMeans.size,
        partnerContexts: model.lineupPartnerMeans.size,
        opponentCoefficientPer100: Number(model.opponentCoefficient.toFixed(2)),
        ownTeamCoefficientPer100: Number(model.ownTeamCoefficient.toFixed(2))
      }]))
    }
  }
}

function buildSelectedPairwiseComparisons(players) {
  const selectedIds = new Set(players.map(player => player.playerId))
  return players.flatMap(player => safeArr(player?.performanceSignals?.pairwiseAdjustedPerformance)
    .filter(comparison => (
      selectedIds.has(comparison.opponentPlayerId) &&
      player.playerId.localeCompare(comparison.opponentPlayerId) < 0
    ))
    .map(comparison => ({
      subrole: player.subrole,
      playerAId: player.playerId,
      playerBId: comparison.opponentPlayerId,
      playerAWinProbabilityPct: comparison.probabilityPct,
      deltaLow90: comparison.deltaLow90,
      deltaHigh90: comparison.deltaHigh90,
      playerAMatches: comparison.playerAMatches,
      playerBMatches: comparison.playerBMatches,
      trials: comparison.trials,
      method: comparison.method
    })))
}

function getCorrelation(rows, xSelector, ySelector) {
  const pairs = safeArr(rows)
    .map(row => ({ x: Number(xSelector(row)), y: Number(ySelector(row)) }))
    .filter(pair => Number.isFinite(pair.x) && Number.isFinite(pair.y))
  if (pairs.length < 3) return null
  const meanX = average(pairs.map(pair => pair.x))
  const meanY = average(pairs.map(pair => pair.y))
  const covariance = pairs.reduce((sum, pair) => sum + ((pair.x - meanX) * (pair.y - meanY)), 0)
  const varianceX = pairs.reduce((sum, pair) => sum + ((pair.x - meanX) ** 2), 0)
  const varianceY = pairs.reduce((sum, pair) => sum + ((pair.y - meanY) ** 2), 0)
  const denominator = Math.sqrt(varianceX * varianceY)
  return denominator > 0 ? Number((covariance / denominator).toFixed(2)) : null
}

function getTeamShareComposite(player) {
  const weights = SCOUTING_TEAM_SHARE_SHADOW_WEIGHTS[player?.subrole] || {}
  const metrics = player?.performanceSignals?.opponentStrength?.teamContribution?.metrics || {}
  const weighted = Object.entries(weights)
    .map(([metricId, weight]) => ({ value: Number(metrics?.[metricId]?.sharePct), weight: Number(weight) }))
    .filter(row => Number.isFinite(row.value) && Number.isFinite(row.weight))
  const weightTotal = weighted.reduce((sum, row) => sum + row.weight, 0)
  if (weightTotal <= 0) return null
  return Number((weighted.reduce((sum, row) => sum + (row.value * row.weight), 0) / weightTotal).toFixed(1))
}

function buildTemporalValidationAudit(candidates) {
  const subroles = Object.keys(SCOUTING_SUBROLE_SLOT_PLAN).map(subrole => {
    const peers = candidates.filter(player => (
      player.subrole === subrole && player?.performanceSignals?.temporalValidation?.eligible
    ))
    const earlyTopThree = [...peers]
      .sort((a, b) => a.performanceSignals.temporalValidation.earlyRank - b.performanceSignals.temporalValidation.earlyRank)
      .slice(0, 3)
      .map(player => player.playerId)
    const lateTopThree = [...peers]
      .sort((a, b) => a.performanceSignals.temporalValidation.lateRank - b.performanceSignals.temporalValidation.lateRank)
      .slice(0, 3)
      .map(player => player.playerId)
    const retained = earlyTopThree.filter(playerId => lateTopThree.includes(playerId)).length
    const topThreeTotal = Math.min(3, earlyTopThree.length, lateTopThree.length)
    const topThreeRetentionPct = topThreeTotal > 0 ? Math.round((retained / topThreeTotal) * 100) : null
    const rankCorrelation = getCorrelation(
      peers,
      player => player.performanceSignals.temporalValidation.earlyRank,
      player => player.performanceSignals.temporalValidation.lateRank
    )
    const meanAbsoluteRankChange = peers.length
      ? Number(average(peers.map(player => Math.abs(player.performanceSignals.temporalValidation.rankChange))).toFixed(1))
      : null

    return {
      subrole,
      eligiblePlayers: peers.length,
      topThreeRetentionPct,
      rankCorrelation,
      meanAbsoluteRankChange
    }
  })
  const eligibleSubroles = subroles.filter(item => Number.isFinite(item.topThreeRetentionPct))
  const correlationSubroles = subroles.filter(item => Number.isFinite(item.rankCorrelation))
  const averageTopThreeRetentionPct = eligibleSubroles.length
    ? Math.round(average(eligibleSubroles.map(item => item.topThreeRetentionPct)))
    : null
  const averageRankCorrelation = correlationSubroles.length
    ? Number(average(correlationSubroles.map(item => item.rankCorrelation)).toFixed(2))
    : null

  return {
    method: 'chronological-match-holdout-v1',
    eligiblePlayers: subroles.reduce((sum, item) => sum + item.eligiblePlayers, 0),
    averageTopThreeRetentionPct,
    averageRankCorrelation,
    status: averageTopThreeRetentionPct >= 80 && averageRankCorrelation >= 0.6 ? 'STABLE' : 'REVIEW',
    subroles
  }
}

function buildPairwiseValidationAudit(players, pairwiseComparisons) {
  const playersById = new Map(players.map(player => [player.playerId, player]))
  const evaluated = safeArr(pairwiseComparisons).map(comparison => {
    const playerA = playersById.get(comparison.playerAId)
    const playerB = playersById.get(comparison.playerBId)
    const fitA = Number(playerA?.performanceSignals?.recruitmentScenarios?.fits?.BALANCED?.score)
    const fitB = Number(playerB?.performanceSignals?.recruitmentScenarios?.fits?.BALANCED?.score)
    if (!playerA || !playerB || !Number.isFinite(fitA) || !Number.isFinite(fitB) || fitA === fitB) return null
    const playerALead = fitA > fitB
    const fitLeaderProbabilityPct = playerALead
      ? Number(comparison.playerAWinProbabilityPct)
      : Number((100 - Number(comparison.playerAWinProbabilityPct)).toFixed(1))
    return {
      subrole: playerA.subrole,
      fitLeaderProbabilityPct,
      aligned: fitLeaderProbabilityPct >= 50,
      strongSupport: fitLeaderProbabilityPct >= 65,
      ambiguous: fitLeaderProbabilityPct >= 45 && fitLeaderProbabilityPct <= 55,
      contradiction: fitLeaderProbabilityPct < 45
    }
  }).filter(Boolean)
  const summarize = rows => ({
    comparisons: rows.length,
    concordancePct: rows.length ? Math.round((rows.filter(row => row.aligned).length / rows.length) * 100) : null,
    strongSupportPct: rows.length ? Math.round((rows.filter(row => row.strongSupport).length / rows.length) * 100) : null,
    ambiguityPct: rows.length ? Math.round((rows.filter(row => row.ambiguous).length / rows.length) * 100) : null,
    contradictionPct: rows.length ? Math.round((rows.filter(row => row.contradiction).length / rows.length) * 100) : null,
    medianFitLeaderProbabilityPct: rows.length
      ? Number(quantile(rows.map(row => row.fitLeaderProbabilityPct), 0.5).toFixed(1))
      : null
  })
  const summary = summarize(evaluated)

  return {
    method: 'fit-vs-match-cluster-bootstrap-v1',
    trialsPerComparison: SCOUTING_PAIRWISE_BOOTSTRAP.trials,
    ...summary,
    status: summary.concordancePct >= 70 && summary.medianFitLeaderProbabilityPct >= 60 ? 'ALIGNED' : 'MIXED',
    subroles: Object.keys(SCOUTING_SUBROLE_SLOT_PLAN).map(subrole => ({
      subrole,
      ...summarize(evaluated.filter(row => row.subrole === subrole))
    }))
  }
}

function buildTeamContributionValidationAudit(candidates) {
  const subroles = Object.keys(SCOUTING_SUBROLE_SLOT_PLAN).map(subrole => {
    const peers = candidates
      .filter(player => player.subrole === subrole)
      .map(player => ({
        player,
        compositeSharePct: getTeamShareComposite(player)
      }))
      .filter(row => Number.isFinite(row.compositeSharePct))
    return {
      subrole,
      players: peers.length,
      fitCorrelation: getCorrelation(peers, row => row.compositeSharePct, row => row.player.selection.score),
      adjustedPerformanceCorrelation: getCorrelation(
        peers,
        row => row.compositeSharePct,
        row => row.player.performanceSignals.opponentStrength?.adjustedPercentile
      ),
      averageCompositeSharePct: peers.length
        ? Number(average(peers.map(row => row.compositeSharePct)).toFixed(1))
        : null
    }
  })
  const fitCorrelations = subroles.map(item => item.fitCorrelation).filter(Number.isFinite)
  const adjustedCorrelations = subroles.map(item => item.adjustedPerformanceCorrelation).filter(Number.isFinite)
  const externalShapeReference = getScoutingProfessionalReferenceMeta()

  return {
    method: 'same-map-team-share-shadow-v1',
    status: 'SHADOW_ONLY',
    averageFitCorrelation: fitCorrelations.length ? Number(average(fitCorrelations).toFixed(2)) : null,
    averageAdjustedPerformanceCorrelation: adjustedCorrelations.length
      ? Number(average(adjustedCorrelations).toFixed(2))
      : null,
    externalShapeReferenceAvailable: true,
    externalShapeReference: {
      version: externalShapeReference.version,
      status: externalShapeReference.status,
      strengthEquivalent: externalShapeReference.strengthEquivalent,
      crossTierCalibration: externalShapeReference.crossTierCalibration
    },
    externalReplicationAvailable: false,
    externalReplicationReason: 'NO_CROSS_TIER_CALIBRATION_BRIDGE',
    subroles
  }
}

export function buildScoutingValidationAudit(candidates, players, pairwiseComparisons) {
  const temporal = buildTemporalValidationAudit(candidates)
  const pairwise = buildPairwiseValidationAudit(players, pairwiseComparisons)
  const teamContribution = buildTeamContributionValidationAudit(candidates)
  const promotionGate = {
    temporalTopThreeRetentionTargetPct: 80,
    pairwiseConcordanceTargetPct: 70,
    externalReplicationRequired: true
  }
  promotionGate.passed = (
    temporal.averageTopThreeRetentionPct >= promotionGate.temporalTopThreeRetentionTargetPct &&
    pairwise.concordancePct >= promotionGate.pairwiseConcordanceTargetPct &&
    teamContribution.externalReplicationAvailable
  )

  return {
    version: 'scouting-shadow-validation-v1',
    rankingImpact: false,
    verdict: promotionGate.passed ? 'PROMOTE_SHADOW_SIGNALS' : 'HOLD_WEIGHTS',
    temporal,
    pairwise,
    teamContribution,
    promotionGate
  }
}

export function buildScoutingReportModel(db, season) {
  const selectionAudit = buildScoutingSelectionAudit(db, season)
  const qualifiedPool = selectionAudit.qualifiedPool
  const selectedCandidates = selectionAudit.candidates.filter(candidate => candidate.selection.selectedByModel)
  const selectedIds = new Set(selectedCandidates.map(candidate => candidate.playerId))
  const previousSelectedIds = new Set(SCOUTING_V1_SELECTED_PLAYERS.map(item => item.playerId))
  const rolePools = new Map()
  const subrolePools = new Map()

  qualifiedPool.forEach(player => {
    if (!rolePools.has(player.role)) rolePools.set(player.role, [])
    rolePools.get(player.role).push(player)
    if (!subrolePools.has(player.subrole)) subrolePools.set(player.subrole, [])
    subrolePools.get(player.subrole).push(player)
  })
  rolePools.forEach(pool => pool.sort((a, b) => b.ovr - a.ovr || b.sampleDepth - a.sampleDepth))

  const subroleOrder = Object.keys(SCOUTING_SUBROLE_SLOT_PLAN)
  const selectedPlayers = selectedCandidates
    .sort((a, b) => (
      subroleOrder.indexOf(a.subrole) - subroleOrder.indexOf(b.subrole) ||
      a.selection.subroleSelectionRank - b.selection.subroleSelectionRank
    ))
    .map(player => {
      const rolePool = rolePools.get(player.role) || []
      const roleRank = rolePool.findIndex(candidate => candidate.playerId === player.playerId)
      const subrolePool = subrolePools.get(player.subrole) || []
      const professionalReference = buildScoutingProfessionalReference(player)
      return {
        ...player,
        identity: {
          ...player.identity,
          nationality: SCOUTING_PLAYER_NATIONALITIES[player.playerId] || 'CN-MAINLAND'
        },
        performanceSignals: {
          ...player.performanceSignals,
          professionalReference
        },
        tier: player.selection.priorityByModel
          ? 'PRIORITY'
          : player.selection.extendedByModel ? 'EXTENDED' : 'WATCH',
        highSampleRoleRank: roleRank >= 0 ? roleRank + 1 : null,
        highSampleRoleTotal: rolePool.length,
        highSampleSubroleRank: player.selection.subroleSelectionRank,
        highSampleSubroleTotal: subrolePool.length
      }
    })
  const players = addPublicShortlistScenarioRanks(selectedPlayers)
  const pairwiseComparisons = buildSelectedPairwiseComparisons(players)
  const validationAudit = buildScoutingValidationAudit(selectionAudit.candidates, players, pairwiseComparisons)

  return {
    modelVersion: SCOUTING_MODEL_VERSION,
    sampleGate: SCOUTING_SAMPLE_GATE,
    subroleEvidenceGate: SCOUTING_SUBROLE_EVIDENCE_GATE,
    subroleConfidenceTarget: SCOUTING_SUBROLE_CONFIDENCE_TARGET,
    qualifiedPool: qualifiedPool.map(player => ({
      ...player,
      selected: selectedIds.has(player.playerId)
    })),
    players,
    priorityPlayers: players.filter(player => player.tier === 'PRIORITY'),
    extendedPlayers: players.filter(player => player.tier === 'EXTENDED'),
    watchPlayers: players.filter(player => player.tier === 'WATCH'),
    selectedCount: players.length,
    priorityCount: players.filter(player => player.tier === 'PRIORITY').length,
    extendedCount: players.filter(player => player.tier === 'EXTENDED').length,
    watchCount: players.filter(player => player.tier === 'WATCH').length,
    targetCount: Object.values(SCOUTING_SUBROLE_SLOT_PLAN).reduce((sum, count) => sum + count, 0),
    coreTargetCount: Object.values(SCOUTING_CORE_SUBROLE_SLOT_PLAN).reduce((sum, count) => sum + count, 0),
    watchTargetCount: (
      Object.values(SCOUTING_SUBROLE_SLOT_PLAN).reduce((sum, count) => sum + count, 0) -
      Object.values(SCOUTING_CORE_SUBROLE_SLOT_PLAN).reduce((sum, count) => sum + count, 0)
    ),
    priorityTargetCount: Object.values(SCOUTING_PRIORITY_SUBROLE_SLOT_PLAN).reduce((sum, count) => sum + count, 0),
    selectionWeights: SCOUTING_SUBROLE_SELECTION_WEIGHTS,
    deploymentWeights: SCOUTING_SUBROLE_DEPLOYMENT_WEIGHTS,
    recruitmentScenarioWeights: SCOUTING_SUBROLE_RECRUITMENT_SCENARIO_WEIGHTS,
    professionalReference: getScoutingProfessionalReferenceMeta(),
    pairwiseComparisons,
    validationAudit,
    marketCoverage: selectionAudit.marketCoverage,
    selectionAudit: {
      roleSlotPlan: selectionAudit.roleSlotPlan,
      subroleSlotPlan: selectionAudit.subroleSlotPlan,
      coreSubroleSlotPlan: selectionAudit.coreSubroleSlotPlan,
      prioritySubroleSlotPlan: selectionAudit.prioritySubroleSlotPlan,
      modelVersion: selectionAudit.modelVersion,
      subroleEvidenceGate: selectionAudit.subroleEvidenceGate,
      subroleConfidenceTarget: selectionAudit.subroleConfidenceTarget,
      weights: selectionAudit.weights,
      preferenceSensitivity: selectionAudit.preferenceSensitivity,
      opponentStrength: selectionAudit.opponentStrength,
      candidates: selectionAudit.candidates.map(candidate => ({
        playerId: candidate.playerId,
        name: candidate.identity.displayName,
        team: candidate.identity.teamShort,
        role: candidate.role,
        subrole: candidate.subrole,
        subroleProfile: candidate.subroleProfile,
        subroleEvidence: candidate.subroleEvidence,
        score: candidate.selection.score,
        rawScore: candidate.selection.rawScore,
        subroleRank: candidate.selection.subroleSelectionRank,
        selected: selectedIds.has(candidate.playerId),
        previouslySelected: previousSelectedIds.has(candidate.playerId),
        priority: candidate.selection.priorityByModel,
        extended: candidate.selection.extendedByModel,
        watch: candidate.selection.watchByModel,
        selectedByModel: candidate.selection.selectedByModel,
        factors: candidate.selection.factors,
        robustness: candidate.selection.robustness,
        preferenceSensitivity: candidate.selection.preferenceSensitivity
      }))
    }
  }
}

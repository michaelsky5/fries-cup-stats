// QGCS4 research model. Deliberately not imported by the public FCR26 report.
// These are auditable within-event indices, not calibrated ability estimates.
export const QGCS4_SELECTION_VERSION = 'qgcs4-selection-v0.1'
export const QGCS4_POSITIONS = Object.freeze(['TANK', 'HITSCAN', 'FLEX_DPS', 'MAIN_SUPPORT', 'FLEX_SUPPORT'])
export const QGCS4_FACTOR_LABELS = Object.freeze({
  performance: '基础表现',
  opponentAdjusted: '对手与环境校正',
  profileFloor: '较差地图表现',
  consistency: '发挥稳定性',
  stageValidation: '季后赛证据',
  versatility: '英雄覆盖'
})

// Retain the relative weights of the existing six performance factors. Remove
// sampleDepth, then normalize once. Do not tune weights to named candidates.
const WEIGHT_RATIOS = Object.freeze({
  TANK: Object.freeze([22, 20, 18, 14, 12, 5]),
  HITSCAN: Object.freeze([28, 22, 13, 12, 12, 5]),
  FLEX_DPS: Object.freeze([23, 19, 12, 12, 10, 15]),
  MAIN_SUPPORT: Object.freeze([18, 18, 20, 18, 12, 4]),
  FLEX_SUPPORT: Object.freeze([23, 20, 16, 14, 10, 7])
})
const FACTOR_KEYS = Object.freeze(Object.keys(QGCS4_FACTOR_LABELS))
export const QGCS4_SELECTION_WEIGHTS = Object.freeze(Object.fromEntries(QGCS4_POSITIONS.map(position => {
  const ratios = WEIGHT_RATIOS[position]
  const total = ratios.reduce((sum, value) => sum + value, 0)
  return [position, Object.freeze(Object.fromEntries(FACTOR_KEYS.map((key, index) => [key, ratios[index] / total])))]
})))

export const QGCS4_SELECTION_POLICY = Object.freeze({
  shortlistPerPosition: 4,
  sampleDepthIsPerformanceFactor: false,
  outerExposureShrink: false,
  // Local evidence shrinkage remains; missing evidence is never zero skill.
  playoffMinimumMatches: 2,
  playoffMinimumMaps: 6,
  trendMinimumEarlierMatches: 2,
  trendMinimumEarlierMaps: 3,
  minimumStageReferencePlayers: 3,
  playoffReferenceMethod: 'MIDRANK',
  playoffWeight: 0.65,
  changeWeight: 0.35,
  stageMapTarget: 10,
  stageMatchTarget: 4,
  stageMapWeight: 0.6,
  stageMatchWeight: 0.4,
  neutralFactor: 50,
  scoreMeaning: 'within-position research index; not a success probability'
})

const round = (value, digits = 4) => Number(value.toFixed(digits))
const clamp01 = value => Math.max(0, Math.min(1, value))
const requireValue = (condition, message) => { if (!condition) throw new Error(message) }
const finite = value => typeof value === 'number' && Number.isFinite(value)

export function empiricalPercentile(values, target, { lowerIsBetter = false, midrank = false } = {}) {
  requireValue(values.length > 0 && values.every(finite) && finite(target), 'Percentiles need observed finite values')
  const betterDirection = value => lowerIsBetter ? value > target : value < target
  const worse = values.filter(betterDirection).length
  const ties = values.filter(value => value === target).length
  const percentile = (worse + ties * (midrank ? 0.5 : 1)) / values.length * 100
  // The legacy factors use rounded inclusive empirical ranks. Stage factors
  // use a tie-aware midrank so equal values remain neutral, not all "100".
  return midrank ? round(percentile) : Math.max(1, Math.min(100, Math.round(percentile)))
}

export function getEffectiveHeroCount(heroes) {
  requireValue(Array.isArray(heroes) && heroes.length > 0, 'Hero coverage requires real records')
  requireValue(heroes.every(hero => finite(hero.minutes) && hero.minutes > 0), 'Invalid hero exposure')
  const minutes = heroes.reduce((sum, hero) => sum + hero.minutes, 0)
  return round(1 / heroes.reduce((sum, hero) => sum + (hero.minutes / minutes) ** 2, 0), 1)
}

function phaseObserved(phase) {
  return phase && phase.matches > 0 && phase.maps > 0 && finite(phase.adjustedScore)
}

function hasPlayoffSample(candidate) {
  const phase = candidate.stages.playoffs
  return phaseObserved(phase) && phase.matches >= QGCS4_SELECTION_POLICY.playoffMinimumMatches &&
    phase.maps >= QGCS4_SELECTION_POLICY.playoffMinimumMaps
}

function hasTrendSample(candidate) {
  const earlier = candidate.stages.earlier
  return hasPlayoffSample(candidate) && phaseObserved(earlier) &&
    earlier.matches >= QGCS4_SELECTION_POLICY.trendMinimumEarlierMatches &&
    earlier.maps >= QGCS4_SELECTION_POLICY.trendMinimumEarlierMaps
}

function stageConfidence(phase) {
  const policy = QGCS4_SELECTION_POLICY
  return clamp01(phase.maps / policy.stageMapTarget) * policy.stageMapWeight +
    clamp01(phase.matches / policy.stageMatchTarget) * policy.stageMatchWeight
}

function phaseStatus(candidate, kind, referenceCount) {
  const observed = kind === 'playoff' ? phaseObserved(candidate.stages.playoffs) :
    phaseObserved(candidate.stages.playoffs) && phaseObserved(candidate.stages.earlier)
  if (!observed) return 'NOT_OBSERVED'
  const qualified = kind === 'playoff' ? hasPlayoffSample(candidate) : hasTrendSample(candidate)
  if (!qualified) return 'LIMITED_SAMPLE'
  return referenceCount < QGCS4_SELECTION_POLICY.minimumStageReferencePlayers ? 'LIMITED_REFERENCE' : 'COMPARABLE'
}

export function buildQgcs4StageEvidence(candidate, peers) {
  requireValue(peers.every(peer => peer.position === candidate.position), 'Stage reference must use the same position')
  const policy = QGCS4_SELECTION_POLICY
  const playoffPeers = peers.filter(hasPlayoffSample)
  const trendPeers = peers.filter(hasTrendSample)
  const playoffStatus = phaseStatus(candidate, 'playoff', playoffPeers.length)
  const trendStatus = phaseStatus(candidate, 'change', trendPeers.length)
  const playoff = candidate.stages.playoffs
  const earlier = candidate.stages.earlier
  const playoffPercentile = playoffStatus === 'COMPARABLE'
    ? empiricalPercentile(playoffPeers.map(peer => peer.stages.playoffs.adjustedScore), playoff.adjustedScore, { midrank: true })
    : null
  // Additive differences of an index are meaningful here; percentage changes
  // of a score with an arbitrary origin are not interpreted as skill growth.
  const delta = phaseObserved(playoff) && phaseObserved(earlier)
    ? round(playoff.adjustedScore - earlier.adjustedScore) : null
  const changePercentile = trendStatus === 'COMPARABLE'
    ? empiricalPercentile(trendPeers.map(peer => round(peer.stages.playoffs.adjustedScore - peer.stages.earlier.adjustedScore)), delta, { midrank: true })
    : null
  const playoffConfidence = playoffPercentile === null ? 0 : stageConfidence(playoff)
  const changeConfidence = changePercentile === null ? 0 : Math.min(stageConfidence(playoff), stageConfidence(earlier))
  const playoffShift = playoffPercentile === null ? 0 : (playoffPercentile - policy.neutralFactor) * playoffConfidence
  const changeShift = changePercentile === null ? 0 : (changePercentile - policy.neutralFactor) * changeConfidence
  return {
    factor: round(policy.neutralFactor + policy.playoffWeight * playoffShift + policy.changeWeight * changeShift),
    playoff: {
      status: playoffStatus, observed: Boolean(phaseObserved(playoff)), eligible: hasPlayoffSample(candidate),
      maps: playoff.maps, matches: playoff.matches, value: phaseObserved(playoff) ? playoff.adjustedScore : null,
      referenceCount: playoffPeers.length, percentile: playoffPercentile, shrinkWeight: round(playoffConfidence),
      centeredContribution: round(policy.playoffWeight * playoffShift)
    },
    change: {
      status: trendStatus, eligible: hasTrendSample(candidate),
      earlierMaps: earlier.maps, earlierMatches: earlier.matches,
      // A descriptive difference remains available, but is never labelled a
      // validated trend when only one phase has sufficient observations.
      descriptiveDelta: delta, value: hasTrendSample(candidate) ? delta : null,
      referenceCount: trendPeers.length, percentile: changePercentile, shrinkWeight: round(changeConfidence),
      centeredContribution: round(policy.changeWeight * changeShift)
    }
  }
}

function validateInput(input) {
  requireValue(input?.source?.season === 'QGCS4', 'QGCS4 selection must not consume another event')
  requireValue(Array.isArray(input.candidates) && input.candidates.length > 0, 'Missing candidate observations')
  requireValue(Array.isArray(input.referenceIds), 'An explicit frozen reference pool is required')
  const actualIds = input.candidates.map(candidate => candidate.id).sort()
  requireValue(new Set(actualIds).size === actualIds.length, 'Duplicate candidate identity')
  requireValue(JSON.stringify(actualIds) === JSON.stringify([...input.referenceIds].sort()), 'Reference pool changed; filter the report, not the model input')
  for (const candidate of input.candidates) {
    requireValue(QGCS4_POSITIONS.includes(candidate.position), 'Unknown position')
    requireValue(candidate.id.startsWith('QGCS4-'), 'Cross-event candidate identity')
    for (const key of ['raw', 'adjusted', 'floor', 'variation', 'effectiveHeroes']) {
      requireValue(finite(candidate.performance[key]), `Missing ${key} for ${candidate.id}`)
    }
    requireValue(candidate.scope.maps > 0 && candidate.scope.matches > 0 && candidate.scope.minutes > 0, 'Missing scoped exposure')
    for (const phase of [candidate.stages.earlier, candidate.stages.playoffs]) {
      requireValue(Number.isInteger(phase.maps) && phase.maps >= 0 && Number.isInteger(phase.matches) && phase.matches >= 0, 'Invalid phase counts')
      requireValue((phase.maps === 0) === (phase.matches === 0), 'Inconsistent phase counts')
      requireValue(phase.maps === 0 ? phase.adjustedScore === null : finite(phase.adjustedScore), 'Missing phase performance must stay null')
    }
  }
}

export function scoreQgcs4Factors(position, factors, weights = QGCS4_SELECTION_WEIGHTS[position]) {
  requireValue(QGCS4_POSITIONS.includes(position), 'Unknown position')
  requireValue(FACTOR_KEYS.every(key => finite(factors[key]) && factors[key] >= 0 && factors[key] <= 100), 'Invalid factor')
  requireValue(Object.keys(weights).length === FACTOR_KEYS.length && FACTOR_KEYS.every(key => finite(weights[key]) && weights[key] >= 0), 'Invalid weights')
  requireValue(Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-8, 'Weights must sum to one')
  return Object.entries(weights).reduce((sum, [key, weight]) => sum + factors[key] * weight, 0)
}

function evidenceFlags(candidate, stage) {
  const flags = []
  if (candidate.scope.matches < 4) flags.push('BELOW_MAIN_MATCH_GATE_AFTER_OMISSION')
  if (!stage.playoff.observed) flags.push('PLAYOFF_NOT_OBSERVED')
  else if (!stage.playoff.eligible) flags.push('PLAYOFF_SAMPLE_LIMITED')
  if (stage.playoff.status === 'LIMITED_REFERENCE') flags.push('PLAYOFF_COMPARISON_POOL_LIMITED')
  if (!stage.change.eligible) flags.push('STAGE_CHANGE_NOT_ESTABLISHED')
  if (candidate.evidence?.mainHeroSharePct >= 80) flags.push('HERO_RECORDS_CONCENTRATED')
  return flags
}

export function buildQgcs4Selection(input) {
  validateInput(input)
  const candidates = input.candidates.map(candidate => {
    const peers = input.candidates.filter(peer => peer.position === candidate.position)
    const stage = buildQgcs4StageEvidence(candidate, peers)
    const factors = {
      performance: empiricalPercentile(peers.map(peer => peer.performance.raw), candidate.performance.raw),
      opponentAdjusted: empiricalPercentile(peers.map(peer => peer.performance.adjusted), candidate.performance.adjusted),
      profileFloor: empiricalPercentile(peers.map(peer => peer.performance.floor), candidate.performance.floor),
      consistency: empiricalPercentile(peers.map(peer => peer.performance.variation), candidate.performance.variation, { lowerIsBetter: true }),
      stageValidation: stage.factor,
      versatility: empiricalPercentile(peers.map(peer => peer.performance.effectiveHeroes), candidate.performance.effectiveHeroes)
    }
    const weights = QGCS4_SELECTION_WEIGHTS[candidate.position]
    const exactScore = scoreQgcs4Factors(candidate.position, factors)
    const contributions = FACTOR_KEYS.map(key => ({ key, label: QGCS4_FACTOR_LABELS[key],
      value: factors[key], weight: round(weights[key], 8), points: round(factors[key] * weights[key], 6) }))
    return {
      id: candidate.id, name: candidate.name, team: candidate.team, position: candidate.position,
      score: round(exactScore, 1), exactScore: round(exactScore, 8), factors, contributions,
      evidence: { scope: { ...candidate.scope }, ...candidate.evidence, stage, flags: evidenceFlags(candidate, stage) },
      metrics: candidate.metrics, heroes: candidate.heroes, matches: candidate.matches,
      scoreInterpretation: 'ROLE_RELATIVE_RESEARCH_INDEX',
      missing: ['nationality', 'battleTag', 'exact hero-switch timing', 'VOD review', 'communication', 'shotcalling']
    }
  })
  const rankings = Object.fromEntries(QGCS4_POSITIONS.map(position => {
    const ranked = candidates.filter(candidate => candidate.position === position)
      .sort((a, b) => b.exactScore - a.exactScore || a.id.localeCompare(b.id))
    return [position, ranked.map((candidate, index) => {
      const firstEqual = ranked.findIndex(peer => Math.abs(peer.exactScore - candidate.exactScore) < 1e-8)
      const exactTies = ranked.filter(peer => Math.abs(peer.exactScore - candidate.exactScore) < 1e-8).length
      return { ...candidate, rankInPool: index + 1, sharedRankInPool: firstEqual + 1,
        exactTieCrossesShortlistBoundary: firstEqual < QGCS4_SELECTION_POLICY.shortlistPerPosition &&
          firstEqual + exactTies > QGCS4_SELECTION_POLICY.shortlistPerPosition,
        poolSize: ranked.length, selected: index < QGCS4_SELECTION_POLICY.shortlistPerPosition,
        tiedAtDisplayedPrecision: ranked.some(peer => peer.id !== candidate.id && peer.score === candidate.score) }
    })]
  }))
  return {
    modelVersion: QGCS4_SELECTION_VERSION, status: 'RESEARCH_NOT_PUBLISHED',
    source: { ...input.source }, policy: QGCS4_SELECTION_POLICY,
    referenceIds: [...input.referenceIds].sort(), referenceCount: input.referenceIds.length,
    weights: QGCS4_SELECTION_WEIGHTS, rankings,
    candidates: QGCS4_POSITIONS.flatMap(position => rankings[position]),
    shortlistIds: QGCS4_POSITIONS.flatMap(position => rankings[position].filter(candidate => candidate.selected).map(candidate => candidate.id))
  }
}

// Presentation filters must never rebuild percentiles from the visible subset.
export function getQgcs4PositionView(report, position, { shortlistedOnly = false } = {}) {
  requireValue(QGCS4_POSITIONS.includes(position), 'Unknown position')
  const all = report.rankings[position]
  return { position, poolSize: all.length,
    candidates: shortlistedOnly ? all.filter(candidate => candidate.selected) : [...all] }
}

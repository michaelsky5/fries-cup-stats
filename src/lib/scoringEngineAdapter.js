import { SCORING_ENGINE_CONFIG } from '../config/scoringEngineConfig.js'
import { SEASON_SCORE_CONFIG } from '../config/ratingModelConfig.js'
import { buildRatingBaselinesFromDb, buildRatingBaselinesFromPlayerLogs } from './ratingBaselines.js'
import { resolveHeroSubrole } from './heroSubroleSelectors.js'
import {
  calculateRawProfileScore,
  getRatingModelVersion,
  mapRawScoreToMapRating
} from './ratingModel.js'

const ROLE_ALIAS = {
  TANK: 'TANK',
  DPS: 'DPS',
  DAMAGE: 'DPS',
  DMG: 'DPS',
  HITSCAN: 'DPS',
  FLEX_DPS: 'DPS',
  SUP: 'SUPPORT',
  SUPPORT: 'SUPPORT',
  HEALER: 'SUPPORT',
  MAIN_SUPPORT: 'SUPPORT',
  FLEX_SUPPORT: 'SUPPORT'
}

function cleanText(value) {
  return String(value ?? '').trim()
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function isFiniteScore(value) {
  if (value === null || value === undefined || value === '') return false
  return Number.isFinite(Number(value))
}

function round(value, digits = 3) {
  if (!isFiniteScore(value)) return null
  const number = Number(value)
  return Number(number.toFixed(digits))
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, toFiniteNumber(value)))
}

function normalizeRole(value) {
  const key = cleanText(value).toUpperCase()
  return ROLE_ALIAS[key] || ''
}

function roleFromResolution(resolution) {
  if (resolution?.officialRole === 'DAMAGE') return 'DPS'
  return normalizeRole(resolution?.officialRole || resolution?.resolvedSubrole)
}

function devWarn(message, detail) {
  if (globalThis.process?.env?.NODE_ENV === 'production') return
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[scoringEngineAdapter] ${message}`, detail || '')
  }
}

function getBaselines(args = {}) {
  if (args.baselines) return args.baselines
  if (args.db) return buildRatingBaselinesFromDb(args.db, args)
  return buildRatingBaselinesFromPlayerLogs(args.players || [], args)
}

function getEntryPer10Stats(entry) {
  const per10 = entry?.metrics?.per10 || {}
  return {
    elims: toFiniteNumber(per10.elim ?? entry?.avg_elim),
    assists: toFiniteNumber(per10.ast ?? entry?.avg_ast),
    deaths: toFiniteNumber(per10.dth ?? entry?.avg_dth),
    damage: toFiniteNumber(per10.dmg ?? entry?.avg_dmg),
    healing: toFiniteNumber(per10.heal ?? entry?.avg_heal),
    blocked: toFiniteNumber(per10.block ?? entry?.avg_block)
  }
}

function getLogPer10Stats(logRow) {
  return {
    elims: toFiniteNumber(logRow?.per10?.elimsPer10),
    assists: toFiniteNumber(logRow?.per10?.assistsPer10),
    deaths: toFiniteNumber(logRow?.per10?.deathsPer10),
    damage: toFiniteNumber(logRow?.per10?.damagePer10),
    healing: toFiniteNumber(logRow?.per10?.healingPer10),
    blocked: toFiniteNumber(logRow?.per10?.blockedPer10)
  }
}

function getRatingBaselinesForResolution(baselines, resolution) {
  return {
    heroBaseline: baselines?.byHero?.[resolution?.canonicalHeroName] || null,
    profileBaseline: baselines?.byScoringProfile?.[resolution?.scoringProfile] || null,
    subroleBaseline: baselines?.bySubrole?.[resolution?.resolvedSubrole] || null
  }
}

function getPrimaryByMinutes(items, key) {
  const totals = new Map()
  items.forEach(item => {
    const value = item?.[key]
    if (!value) return
    totals.set(value, (totals.get(value) || 0) + toFiniteNumber(item.minutes ?? item.playtimeMinutes))
  })
  return [...totals.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] || ''
}

function weightedAverage(items, key, weightKey = 'minutes') {
  const weightedItems = items
    .map(item => ({
      value: item?.[key],
      weight: toFiniteNumber(item?.[weightKey])
    }))
    .filter(item => isFiniteScore(item.value) && item.weight > 0)
  const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) return null
  return weightedItems.reduce((sum, item) => sum + (Number(item.value) * item.weight), 0) / totalWeight
}

function buildEntryLogRatings(entry, baselines) {
  const playerId = cleanText(entry?.player_id)
  const role = normalizeRole(entry?.role)
  if (!playerId || !role) return []

  return (baselines?.logs || [])
    .filter(logRow => cleanText(logRow.playerId) === playerId && roleFromResolution(logRow.resolution) === role)
    .map(logRow => {
      const { heroBaseline, profileBaseline, subroleBaseline } = getRatingBaselinesForResolution(baselines, logRow.resolution)
      const rating = calculateRawProfileScore({
        per10Stats: getLogPer10Stats(logRow),
        heroBaseline,
        profileBaseline,
        subroleBaseline,
        scoringProfile: logRow.resolution.scoringProfile,
        sampleStatus: heroBaseline?.sampleStatus
      })

      return {
        canonicalHeroName: logRow.resolution.canonicalHeroName,
        subrole: logRow.resolution.resolvedSubrole,
        scoringProfile: logRow.resolution.scoringProfile,
        effectiveScoringProfile: rating.effectiveScoringProfile,
        sampleStatus: rating.sampleStatus,
        rawScore: rating.rawScore,
        mapRating: rating.mapRating,
        minutes: logRow.playtimeMinutes,
        rating
      }
    })
    .filter(item => isFiniteScore(item.rawScore))
}

function calculateEntryFallbackRating(entry, baselines) {
  const resolution = resolveHeroSubrole(entry?.most_played_hero || entry?.hero || '', {
    role: entry?.role,
    playerId: entry?.player_id,
    teamId: entry?.team_id
  })
  const { heroBaseline, profileBaseline, subroleBaseline } = getRatingBaselinesForResolution(baselines, resolution)
  const rating = calculateRawProfileScore({
    per10Stats: getEntryPer10Stats(entry),
    heroBaseline,
    profileBaseline,
    subroleBaseline,
    scoringProfile: resolution.scoringProfile,
    sampleStatus: heroBaseline?.sampleStatus
  })

  return {
    canonicalHeroName: resolution.canonicalHeroName,
    subrole: resolution.resolvedSubrole,
    scoringProfile: resolution.scoringProfile,
    effectiveScoringProfile: rating.effectiveScoringProfile,
    sampleStatus: rating.sampleStatus,
    rawScore: rating.rawScore,
    mapRating: rating.mapRating,
    minutes: toFiniteNumber(entry?.roleTimeMins ?? entry?.raw_time_mins),
    rating
  }
}

function normalizeOutputScore(ratingSummary, legacyScore, scoreContext) {
  if (!ratingSummary || !isFiniteScore(ratingSummary.rawScore)) return null
  if (scoreContext === 'map') {
    const mapRating = isFiniteScore(ratingSummary.mapRating)
      ? ratingSummary.mapRating
      : mapRawScoreToMapRating(ratingSummary.rawScore)
    return round(mapRating * 10)
  }
  return round(ratingSummary.rawScore)
}

function getSeasonScoreConfidence(entry, minTimeMins = 30) {
  const minTime = toFiniteNumber(minTimeMins)
  if (minTime <= 0) return 1

  const roleTimeMins = toFiniteNumber(entry?.roleTimeMins ?? entry?.raw_time_mins)
  const mapsPlayed = toFiniteNumber(entry?.roleMapsPlayed ?? entry?.maps_played)
  const targetTimeMins = minTime + (minTime * toFiniteNumber(SEASON_SCORE_CONFIG.timeTargetMultiplier, 3))

  if (roleTimeMins <= 0) return 0

  if (roleTimeMins < minTime) {
    return round(
      clamp((roleTimeMins / Math.max(1, minTime)) * SEASON_SCORE_CONFIG.confidenceFloor),
      3
    )
  }

  const timeProgress = targetTimeMins > minTime
    ? clamp((roleTimeMins - minTime) / (targetTimeMins - minTime))
    : 1
  const mapProgress = mapsPlayed > 0
    ? clamp((mapsPlayed - SEASON_SCORE_CONFIG.minMapCount) / Math.max(1, SEASON_SCORE_CONFIG.targetMapCount - SEASON_SCORE_CONFIG.minMapCount))
    : timeProgress
  const confidence = SEASON_SCORE_CONFIG.confidenceFloor +
    ((1 - SEASON_SCORE_CONFIG.confidenceFloor) * Math.min(timeProgress, mapProgress))

  return round(confidence, 3)
}

function applySeasonScoreConfidence(rawScore, confidence) {
  if (!isFiniteScore(rawScore)) return null
  const safeConfidence = clamp(confidence)
  const neutral = toFiniteNumber(SEASON_SCORE_CONFIG.neutralScore, 50)
  return round(neutral + ((Number(rawScore) - neutral) * safeConfidence))
}

function getSeasonScoreStatus(confidence) {
  const value = toFiniteNumber(confidence)
  if (value >= SEASON_SCORE_CONFIG.stableConfidence) return 'STABLE'
  if (value >= SEASON_SCORE_CONFIG.solidConfidence) return 'SOLID'
  return 'PROVISIONAL'
}

function buildRatingSummaryForEntry(entry, baselines) {
  const logRatings = buildEntryLogRatings(entry, baselines)
  const fallbackRating = logRatings.length ? null : calculateEntryFallbackRating(entry, baselines)
  const items = logRatings.length ? logRatings : [fallbackRating].filter(Boolean)

  if (!items.length) return null

  const rawScore = weightedAverage(items, 'rawScore') ?? fallbackRating?.rawScore ?? null
  const mapRating = weightedAverage(items, 'mapRating') ?? (isFiniteScore(rawScore) ? mapRawScoreToMapRating(rawScore) : null)
  const primarySubrole = getPrimaryByMinutes(items, 'subrole')
  const primaryProfile = getPrimaryByMinutes(items, 'scoringProfile')
  const primaryEffectiveProfile = getPrimaryByMinutes(items, 'effectiveScoringProfile') || primaryProfile
  const primaryHero = getPrimaryByMinutes(items, 'canonicalHeroName')
  const sampleStatus = items.some(item => item.sampleStatus === 'OK')
    ? 'OK'
    : items.some(item => item.sampleStatus === 'LOW_SAMPLE')
      ? 'LOW_SAMPLE'
      : 'VERY_LOW_SAMPLE'

  return {
    rawScore: round(rawScore),
    mapRating: round(mapRating, 1),
    canonicalHeroName: primaryHero,
    subrole: primarySubrole,
    scoringProfile: primaryProfile,
    effectiveScoringProfile: primaryEffectiveProfile,
    sampleStatus,
    sourceLogCount: logRatings.length,
    profileFallbackUsed: items.some(item => item.rating?.profileFallbackUsed)
  }
}

function withFallback(entry, legacyScore, scoreContext, reason) {
  if (!SCORING_ENGINE_CONFIG.allowLegacyFallback) {
    return {
      ...entry,
      ratingModelVersion: getRatingModelVersion(),
      scoringEngine: 'rating_v1',
      scoringError: reason,
      roleScore: null,
      score: null,
      impactScore: null
    }
  }

  devWarn('Rating v1 failed; using legacy score fallback', { entryKey: entry?.entryKey, reason })
  const fallbackScore = isFiniteScore(legacyScore) ? Number(legacyScore) : null
  return {
    ...entry,
    ratingModelVersion: getRatingModelVersion(),
    scoringEngine: 'legacy_fallback',
    scoringError: reason,
    legacyScore: fallbackScore,
    legacyImpactScore: fallbackScore,
    roleScore: fallbackScore,
    rawScore: fallbackScore,
    score: fallbackScore,
    impactScore: fallbackScore,
    rating: scoreContext === 'map' && fallbackScore !== null ? round(fallbackScore / 10, 1) : fallbackScore
  }
}

function attachRatingModelScore(entry, args = {}) {
  const legacyScore = getLegacyScore({ entry })
  if (SCORING_ENGINE_CONFIG.activeEngine !== 'rating_v1') {
    return withFallback(entry, legacyScore, args.scoreContext, 'active_engine_not_rating_v1')
  }

  const baselines = getBaselines(args)
  const summary = buildRatingSummaryForEntry(entry, baselines)
  const outputScore = normalizeOutputScore(summary, legacyScore, args.scoreContext)
  const seasonScoreConfidence = args.scoreContext === 'season'
    ? getSeasonScoreConfidence(entry, args.minTimeMins)
    : 1
  const seasonScore = args.scoreContext === 'season'
    ? applySeasonScoreConfidence(summary?.rawScore, seasonScoreConfidence)
    : summary?.rawScore
  const roleScore = args.scoreContext === 'season' ? seasonScore : outputScore

  if (!summary || !isFiniteScore(roleScore)) {
    return withFallback(entry, legacyScore, args.scoreContext, 'rating_v1_unavailable')
  }

  return {
    ...entry,
    ratingModelVersion: getRatingModelVersion(),
    scoringEngine: 'rating_v1',
    legacyScore,
    legacyImpactScore: legacyScore,
    roleScore,
    seasonScore,
    seasonScoreConfidence,
    seasonScoreStatus: getSeasonScoreStatus(seasonScoreConfidence),
    rawRoleScore: summary.rawScore,
    rawScore: summary.rawScore,
    mapRating: summary.mapRating,
    score: args.scoreContext === 'map' ? summary.mapRating : summary.rawScore,
    rating: args.scoreContext === 'map' ? summary.mapRating : summary.rawScore,
    impactScore: summary.rawScore,
    scoringProfile: summary.effectiveScoringProfile || summary.scoringProfile,
    requestedScoringProfile: summary.scoringProfile,
    subrole: summary.subrole,
    sampleStatus: summary.sampleStatus,
    ratingModelSourceLogs: summary.sourceLogCount,
    ratingProfileFallbackUsed: summary.profileFallbackUsed
  }
}

export function getActiveScoringEngine() {
  return SCORING_ENGINE_CONFIG.activeEngine
}

export function getLegacyScore(args = {}) {
  const entry = args.entry || args
  const candidates = [
    entry?.legacyScore,
    entry?.legacyImpactScore,
    entry?.roleScore,
    entry?.rawRoleScore,
    entry?.impactScore,
    entry?.impact_score,
    entry?.rawImpactScore,
    entry?.score,
    entry?.rating
  ]
  const value = candidates.find(isFiniteScore)
  return value === undefined ? null : Number(value)
}

export function calculateSeasonPlayerScoreV1(args = {}) {
  const entry = args.entry || args
  const summary = buildRatingSummaryForEntry(entry, getBaselines(args))
  if (!summary) return null

  const seasonScoreConfidence = getSeasonScoreConfidence(entry, args.minTimeMins)
  const seasonScore = applySeasonScoreConfidence(summary.rawScore, seasonScoreConfidence)

  return {
    ...summary,
    seasonScore,
    seasonScoreConfidence,
    seasonScoreStatus: getSeasonScoreStatus(seasonScoreConfidence)
  }
}

export function calculateLeaderboardScoreV1(args = {}) {
  const summary = calculateSeasonPlayerScoreV1(args)
  return summary ? round(summary.seasonScore ?? summary.rawScore) : null
}

export function calculateMatchPlayerScoreV1(args = {}) {
  const summary = calculateSeasonPlayerScoreV1(args)
  return summary ? {
    ...summary,
    score: summary.rawScore,
    rating: summary.mapRating
  } : null
}

export function calculateMapPlayerScoreV1(args = {}) {
  const entry = args.entry || args
  const summary = calculateSeasonPlayerScoreV1({ ...args, entry })
  return summary ? {
    ...summary,
    score: summary.mapRating,
    rating: summary.mapRating,
    impactScore: summary.rawScore
  } : null
}

export function attachRatingModelScoreToLeaderboardRows(args = {}) {
  const entries = args.entries || args.rows || []
  return entries.map(entry => attachRatingModelScore(entry, { ...args, scoreContext: args.scoreContext || 'season' }))
}

export function attachRatingModelScoreToMapRows(args = {}) {
  const entries = args.entries || args.rows || []
  return entries.map(entry => attachRatingModelScore(entry, { ...args, scoreContext: 'map' }))
}

export function attachRatingModelScoreToPlayerDetail(args = {}) {
  const entry = args.entry || args
  return attachRatingModelScore(entry, { ...args, scoreContext: 'season' })
}

export function compareLegacyAndRatingV1(args = {}) {
  const entry = args.entry || args
  const legacyScore = getLegacyScore({ entry })
  const scored = attachRatingModelScore(entry, args)
  return {
    entryKey: entry?.entryKey,
    playerId: entry?.player_id,
    legacyScore,
    ratingV1Score: scored.rawScore,
    ratingV1MapRating: scored.mapRating,
    delta: isFiniteScore(scored.rawScore) && isFiniteScore(legacyScore)
      ? round(scored.rawScore - legacyScore)
      : null,
    scored
  }
}

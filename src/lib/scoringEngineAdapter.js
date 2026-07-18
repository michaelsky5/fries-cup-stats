import { SCORING_ENGINE_CONFIG } from '../config/scoringEngineConfig.js'
import { MAP_RATING_CONFIG, SEASON_SCORE_CONFIG } from '../config/ratingModelConfig.js'
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

function normalizeLookupKey(value) {
  return cleanText(value).toLowerCase()
}

function createLookupSet(values) {
  return new Set((Array.isArray(values) ? values : []).map(normalizeLookupKey).filter(Boolean))
}

function getMapDuration(mapDurationsByOrder, mapOrder) {
  const key = cleanText(mapOrder)
  if (!key || !mapDurationsByOrder) return 0
  if (mapDurationsByOrder instanceof Map) return toFiniteNumber(mapDurationsByOrder.get(key))
  return toFiniteNumber(mapDurationsByOrder[key])
}

function capLogRatingMinutesByMap(items, mapDurationsByOrder) {
  const groups = new Map()
  items.forEach(item => {
    const mapOrder = cleanText(item.mapOrder)
    if (!mapOrder) return
    if (!groups.has(mapOrder)) groups.set(mapOrder, [])
    groups.get(mapOrder).push(item)
  })

  groups.forEach((mapItems, mapOrder) => {
    const totalMinutes = mapItems.reduce((sum, item) => sum + toFiniteNumber(item.minutes), 0)
    const mapDuration = getMapDuration(mapDurationsByOrder, mapOrder)
    if (totalMinutes <= 0 || mapDuration <= 0 || totalMinutes <= mapDuration) return
    const scale = mapDuration / totalMinutes
    mapItems.forEach(item => {
      item.minutes = toFiniteNumber(item.minutes) * scale
    })
  })

  return items
}

function buildEntryLogRatings(entry, baselines, options = {}) {
  const playerId = cleanText(entry?.player_id)
  const role = normalizeRole(entry?.role)
  if (!playerId || !role) return []

  const matchIds = createLookupSet(options.currentMatchIds)
  const mapOrders = createLookupSet(options.currentMapOrders)

  const ratings = (baselines?.logs || [])
    .filter(logRow => {
      if (cleanText(logRow.playerId) !== playerId || roleFromResolution(logRow.resolution) !== role) return false
      if (matchIds.size) {
        const matchesCurrentMatch = [logRow.matchId, logRow.rawMatchId]
          .map(normalizeLookupKey)
          .some(matchId => matchIds.has(matchId))
        if (!matchesCurrentMatch) return false
      }
      if (mapOrders.size && !mapOrders.has(normalizeLookupKey(logRow.mapOrder))) return false
      return true
    })
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
        mapOrder: logRow.mapOrder,
        rating
      }
    })
    .filter(item => isFiniteScore(item.rawScore))

  return capLogRatingMinutesByMap(ratings, options.mapDurationsByOrder)
}

function calculateEntryRating(entry, baselines) {
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

function buildRatingSummaryForEntry(entry, baselines, scoreContext = 'season', args = {}) {
  const usesCurrentPerformance = scoreContext === 'map' || scoreContext === 'match'
  const hasCurrentLogScope = Array.isArray(args.currentMatchIds) && args.currentMatchIds.length > 0
  const logRatings = usesCurrentPerformance
    ? hasCurrentLogScope ? buildEntryLogRatings(entry, baselines, args) : []
    : buildEntryLogRatings(entry, baselines)
  const entryRating = !logRatings.length
    ? calculateEntryRating(entry, baselines)
    : null
  const items = logRatings.length ? logRatings : [entryRating].filter(Boolean)

  if (!items.length) return null

  const rawScore = weightedAverage(items, 'rawScore') ?? entryRating?.rawScore ?? null
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
    sourceMinutes: round(items.reduce((sum, item) => sum + toFiniteNumber(item?.minutes), 0)),
    sourceScope: usesCurrentPerformance
      ? logRatings.length ? `current_${scoreContext}_hero_logs` : `current_${scoreContext}`
      : logRatings.length ? 'season_logs' : 'season_entry',
    aggregation: logRatings.length ? 'hero_log_time_weighted' : 'aggregate_entry',
    profileFallbackUsed: items.some(item => item.rating?.profileFallbackUsed)
  }
}

function normalizeTeamKey(value) {
  return cleanText(value).toLowerCase()
}

function isWinningEntry(entry, winnerTeamKeys = []) {
  const entryKeys = [
    entry?.team_id,
    entry?.team_name,
    entry?.team_short_name
  ].map(normalizeTeamKey).filter(Boolean)
  const winnerKeys = winnerTeamKeys.map(normalizeTeamKey).filter(Boolean)

  return entryKeys.some(key => winnerKeys.includes(key))
}

function applyMapResultAdjustment(summary, entry, args = {}) {
  if (args.scoreContext !== 'map' || !summary || !isFiniteScore(summary.mapRating)) return summary

  const winnerTeamKeys = Array.isArray(args.winnerTeamKeys) ? args.winnerTeamKeys : []
  if (!winnerTeamKeys.length) return { ...summary, mapResultAdjustment: 0 }

  const wonMap = isWinningEntry(entry, winnerTeamKeys)
  const bonusConfig = MAP_RATING_CONFIG.winningSideBonus || {}
  const adjustment = wonMap
    ? Math.abs(toFiniteNumber(bonusConfig.amount))
    : -Math.abs(toFiniteNumber(MAP_RATING_CONFIG.losingSidePenalty))
  const mapRating = round(
    Math.min(MAP_RATING_CONFIG.max, Math.max(MAP_RATING_CONFIG.min, Number(summary.mapRating) + adjustment)),
    1
  )

  return {
    ...summary,
    mapRating,
    mapResultAdjustment: round(adjustment, 3),
    mapResult: wonMap ? 'WIN' : 'LOSS'
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
  const scoreContext = args.scoreContext || 'season'
  const legacyScore = getLegacyScore({ entry })
  if (SCORING_ENGINE_CONFIG.activeEngine !== 'rating_v1') {
    return withFallback(entry, legacyScore, scoreContext, 'active_engine_not_rating_v1')
  }

  const baselines = getBaselines(args)
  const baseSummary = buildRatingSummaryForEntry(entry, baselines, scoreContext, args)
  const summary = applyMapResultAdjustment(baseSummary, entry, { ...args, scoreContext })
  const outputScore = normalizeOutputScore(summary, legacyScore, scoreContext)
  const seasonScoreConfidence = scoreContext === 'season'
    ? getSeasonScoreConfidence(entry, args.minTimeMins)
    : 1
  const seasonScore = scoreContext === 'season'
    ? applySeasonScoreConfidence(summary?.rawScore, seasonScoreConfidence)
    : summary?.rawScore
  const roleScore = scoreContext === 'season' ? seasonScore : outputScore

  if (!summary || !isFiniteScore(roleScore)) {
    return withFallback(entry, legacyScore, scoreContext, 'rating_v1_unavailable')
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
    score: scoreContext === 'map' ? summary.mapRating : summary.rawScore,
    rating: scoreContext === 'map' ? summary.mapRating : summary.rawScore,
    impactScore: summary.rawScore,
    scoringProfile: summary.effectiveScoringProfile || summary.scoringProfile,
    requestedScoringProfile: summary.scoringProfile,
    subrole: summary.subrole,
    sampleStatus: summary.sampleStatus,
    ratingModelSourceLogs: summary.sourceLogCount,
    ratingModelSourceMinutes: summary.sourceMinutes,
    ratingModelSourceScope: summary.sourceScope,
    ratingModelAggregation: summary.aggregation,
    ratingBaselineMode: baselines.baselineMode || 'runtime',
    ratingBaselineFreezeId: baselines.freezeId || null,
    ratingBaselineSourceVersion: baselines.frozenBaselineSource?.publishVersion || null,
    mapResultAdjustment: summary.mapResultAdjustment ?? 0,
    mapResult: summary.mapResult || null,
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
  const summary = buildRatingSummaryForEntry(entry, getBaselines(args), 'season', args)
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
  const entry = args.entry || args
  const summary = buildRatingSummaryForEntry(entry, getBaselines(args), 'match', args)
  return summary ? {
    ...summary,
    score: summary.rawScore,
    rating: summary.mapRating
  } : null
}

export function calculateMapPlayerScoreV1(args = {}) {
  const entry = args.entry || args
  const baseSummary = buildRatingSummaryForEntry(entry, getBaselines(args), 'map', args)
  const summary = applyMapResultAdjustment(baseSummary, entry, { ...args, scoreContext: 'map' })
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

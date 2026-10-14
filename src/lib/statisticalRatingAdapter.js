import { STATISTICAL_RATING_BACKFILL as BACKFILL, STATISTICAL_RATING_SEASONS, STATISTICAL_RATING_VERSION } from '../config/statisticalRatingConfig.js'
import { RATING_METRICS } from '../config/ratingModelConfig.js'
import { prepareStatisticalRatingData, round, text } from './statisticalRatingEvidence.js'
import { buildRetrospectiveStatisticalRatingBaselines, buildStatisticalRatingBaselines, scoreStatisticalRatingRow } from './statisticalRatingModel.js'
import { mapRawScoreToMapRating } from './ratingModel.js'
import { buildSeasonOpponentEvidence } from './seasonOpponentStrength.js'

const cache = new WeakMap()
const finite = value => typeof value === 'number' && Number.isFinite(value)
const normalized = value => text(value).toUpperCase()
const roleOf = row => row.resolution.officialRole === 'DAMAGE' ? 'DPS' : row.resolution.officialRole

export function statisticalRatingSeasonId(args = {}) {
  return normalized(args.seasonId || args.season?.id || args.season?.publicCode || args.db?.season?.id || args.db?.meta?.season_id)
    .replace(/^FCW2026$/, 'FCW26')
}

export function usesStatisticalRating(args = {}) {
  return STATISTICAL_RATING_SEASONS.includes(statisticalRatingSeasonId(args))
}

export function getStatisticalRatingDataset(db, seasonId = statisticalRatingSeasonId({ db })) {
  if (!db || typeof db !== 'object') return { rows: [], byId: new Map(), scores: new Map(), backfillScores: new Map() }
  const cached = cache.get(db)
  if (cached?.seasonId === seasonId) return cached
  const prepared = prepareStatisticalRatingData(db, seasonId)
  const baselines = new Map()
  const scores = new Map()
  for (const row of prepared.rows) {
    if (!baselines.has(row.day)) baselines.set(row.day, buildStatisticalRatingBaselines(prepared.rows, { beforeDay: row.day }))
    scores.set(row.rowId, scoreStatisticalRatingRow(row, baselines.get(row.day)))
  }
  const backfillScores = new Map()
  if (seasonId === BACKFILL.seasonId) for (const matchId of BACKFILL.targetMatchIds) {
    const targets = prepared.rows.filter(row => row.matchId === matchId)
    // Never replace an existing score or repair missing observations by changing references.
    if (!targets.length || targets.some(row => finite(scores.get(row.rowId)?.rawScore))
      || targets.some(row => row.day > BACKFILL.throughDay || row.era.key === 'unknown-transition')) continue
    const referencesByEra = new Map()
    for (const row of targets) {
      const key = row.day + '|' + row.era.key
      if (!referencesByEra.has(key)) referencesByEra.set(key,
        buildRetrospectiveStatisticalRatingBaselines(prepared.rows, row, BACKFILL))
      backfillScores.set(row.rowId, scoreStatisticalRatingRow(row, referencesByEra.get(key)))
    }
  }
  const dataset = { ...prepared, byId: new Map(prepared.rows.map(row => [row.rowId, row])), scores, backfillScores }
  cache.set(db, dataset)
  return dataset
}

function primary(items, key) {
  const totals = new Map()
  for (const item of items) totals.set(item[key], (totals.get(item[key]) || 0) + item.minutes)
  return [...totals].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] || ''
}

function evidenceFor(items, minutes) {
  if (!minutes) return null
  const metrics = RATING_METRICS.map(metric => {
    const weight = items.reduce((sum, item) => sum + item.rating.weights[metric] * item.minutes / minutes, 0)
    const contribution = items.reduce((sum, item) => sum + item.rating.metricContributions[metric] * item.minutes / minutes, 0)
    return { metric, weight: round(weight, 3), contribution: round(contribution, 3),
      percentile: weight > 0 ? round(contribution / weight * 100, 3) : null, delta: round(contribution - weight / 2, 3) }
  })
  const baselineMix = { hero: 0, profile: 0, subrole: 0 }
  for (const item of items) for (const metric of RATING_METRICS) for (const source of Object.keys(baselineMix)) {
    baselineMix[source] += (item.rating.metricPercentiles[metric]?.sourceWeights?.[source] || 0)
      * item.rating.weights[metric] / 100 * item.minutes / minutes
  }
  return { metrics, baselineMix, ruleAdjustment: 0, version: STATISTICAL_RATING_VERSION }
}

export function buildStatisticalRatingSummary(entry, args = {}, scoreContext = 'season') {
  const dataset = getStatisticalRatingDataset(args.db, statisticalRatingSeasonId(args))
  const current = scoreContext === 'map' || scoreContext === 'match'
  const matchIds = new Set((args.currentMatchIds || []).map(normalized))
  const mapOrders = new Set((args.currentMapOrders || []).map(normalized))
  const selected = dataset.rows.filter(row => text(row.playerId) === text(entry.player_id)
    && roleOf(row) === normalized(entry.role).replace(/^SUP$/, 'SUPPORT').replace(/^DAMAGE$/, 'DPS')
    && (!current || matchIds.size > 0 && [row.matchId, row.rawMatchId].some(id => matchIds.has(normalized(id))))
    && (!current || mapOrders.size === 0 || mapOrders.has(normalized(row.mapOrder))))
  const items = selected.map(row => ({ canonicalHeroName: row.hero, subrole: row.resolution.resolvedSubrole,
    scoringProfile: row.resolution.scoringProfile, effectiveScoringProfile: row.resolution.scoringProfile,
    minutes: row.playtimeMinutes, matchId: row.matchId, rawMatchId: row.rawMatchId, mapOrder: row.mapOrder,
    teamId: text(row.rawLog?.teamId || row.rawLog?.team_id),
    rating: (current ? dataset.backfillScores.get(row.rowId) : null) || dataset.scores.get(row.rowId), row }))
  const available = items.filter(item => finite(item.rating.rawScore))
  const sourceMinutes = available.reduce((sum, item) => sum + item.minutes, 0)
  const observedMinutes = selected.reduce((sum, row) => sum + row.playtimeMinutes, 0)
  const expectedMinutes = Number(entry.roleTimeMins ?? entry.raw_time_mins)
  const totalMinutes = Math.max(observedMinutes, Number.isFinite(expectedMinutes) && expectedMinutes > 0 ? expectedMinutes : 0)
  const coverage = totalMinutes > 0 ? Math.min(1, sourceMinutes / totalMinutes) : 0
  const flags = [...new Set(items.flatMap(item => item.rating.flags))]
  if (coverage < 0.999999) flags.push('PARTIAL_SCORING_COVERAGE_REVIEW')
  if (!available.length) flags.push('STATISTICAL_SCORE_UNAVAILABLE')
  const activeCounts = available.map(item => item.rating.referenceUse.minimumObservedActiveSourceMatches).filter(finite)
  const early = available.some(item => item.rating.referenceUse.stage === 'EARLY_REFERENCE')
  const retrospective = available.find(item => item.rating.retrospective)?.rating.retrospective
  const provisional = Boolean(retrospective) || available.some(item => item.rating.referenceUse.provisional) || coverage < 0.999999
  const rawScore = sourceMinutes ? round(available.reduce((sum, item) => sum + item.rating.rawScore * item.minutes, 0) / sourceMinutes, 3) : null
  const sampleStatus = available.length && available.every(item => item.rating.baselineMature) ? 'OK' : 'LOW_SAMPLE'
  const identityItems = available.length ? available : items
  return { rawScore, mapRating: rawScore === null ? null : mapRawScoreToMapRating(rawScore),
    ratingModelVersion: STATISTICAL_RATING_VERSION,
    canonicalHeroName: primary(identityItems, 'canonicalHeroName'), subrole: primary(identityItems, 'subrole'),
    scoringProfile: primary(identityItems, 'scoringProfile'), effectiveScoringProfile: primary(identityItems, 'effectiveScoringProfile'),
    sampleStatus, sourceLogCount: available.length, sourceMatchCount: new Set(available.map(item => item.matchId)).size,
    sourceMinutes: round(sourceMinutes, 3), sourceScope: `${retrospective ? 'retrospective' : 'strict_prior_day'}_${scoreContext}_published_logs`,
    aggregation: 'published_log_time_weighted', profileFallbackUsed: false,
    evidence: evidenceFor(available, sourceMinutes),
    opponentEvidence: scoreContext === 'season' ? buildSeasonOpponentEvidence({ db: args.db, logs: available, totalMinutes: sourceMinutes }) : null,
    statisticalRating: { version: STATISTICAL_RATING_VERSION, flags, provisional, reviewOnly: items.some(item => item.rating.reviewOnly),
      sourceMinutes: round(sourceMinutes, 3), totalMinutes: round(totalMinutes, 3), coverage,
      availableLogs: available.length, totalLogs: items.length, missingLogs: items.length - available.length,
      referenceStage: !available.length ? 'REFERENCE_UNAVAILABLE' : retrospective ? 'RETROSPECTIVE_REFERENCE' : early ? 'EARLY_REFERENCE' : provisional ? 'REFERENCE_MATURITY_PENDING' : 'REFERENCE_MATURITY_GATE_PASSED',
      minimumSourceMatches: activeCounts.length ? Math.min(...activeCounts) : null,
      heroAttributionVerified: available.length > 0 && available.every(item => item.row.verified),
      accuracyValidated: false, referenceCutoff: retrospective?.cutoff || 'STRICTLY_EARLIER_DAYS_ENTIRE_MATCH_HELD_OUT',
      ...(retrospective ? { retrospective: { ...retrospective, policyVersion: BACKFILL.version } } : {}) } }
}

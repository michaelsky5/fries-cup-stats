import { buildRatingBaselinesFromDb } from '../../lib/ratingBaselines.js'
import { normalizeLeaderboardRole } from '../../lib/leaderboardSelectors.js'
import { calculateMapPlayerScoreV1 } from '../../lib/scoringEngineAdapter.js'
import { isForfeitMatch } from '../../lib/matchesSelectors.js'

export const SCOUTING_TEAM_RATING_CONFIG = Object.freeze({
  initialRating: 1500,
  mapKFactor: 20,
  matureOpponentMatches: 3,
  minimumMapMinutes: 3,
  ridgeLambda: 50,
  heroContextPriorWeight: 120,
  lineupContextPriorWeight: 180,
  heroLineupBlend: 0.1,
  deploymentHeroMapMinMaps: 2,
  deploymentContextMinMaps: 3,
  deploymentMinMatches: 2,
  deploymentHeroMapMinMinutes: 12,
  deploymentContextMinMinutes: 20,
  deploymentMinConfidence: 0.45
})

const ROLE_METRICS = ['elim', 'ast', 'dth', 'dmg', 'heal', 'block']

function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function cleanText(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase()
}

function getTeamKeys(team) {
  return [team?.id, team?.team_id, team?.name, team?.team_name, team?.short, team?.team_short_name]
    .map(normalizeKey)
    .filter(Boolean)
}

function getMatchTimestamp(match) {
  const timestamp = Date.parse(match?.scheduled_at || match?.updated_at || '')
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

function expectedScore(ownRating, opponentRating) {
  return 1 / (1 + (10 ** ((opponentRating - ownRating) / 400)))
}

function resolveMapOutcome(map, teamA, teamB) {
  const winnerKey = normalizeKey(map?.winner || map?.winner_label)
  const teamAKeys = getTeamKeys(teamA)
  const teamBKeys = getTeamKeys(teamB)
  if (winnerKey && teamAKeys.includes(winnerKey)) return 1
  if (winnerKey && teamBKeys.includes(winnerKey)) return 0

  const scoreA = Number(map?.score_a)
  const scoreB = Number(map?.score_b)
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return null
  if (scoreA === scoreB) return 0.5
  return scoreA > scoreB ? 1 : 0
}

function resolveMatchOutcome(match) {
  const scoreA = Number(match?.team_a?.score)
  const scoreB = Number(match?.team_b?.score)
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return null
  if (scoreA === scoreB) return 0.5
  return scoreA > scoreB ? 1 : 0
}

function getMapResult(outcome) {
  if (!Number.isFinite(outcome)) return 'unknown'
  if (outcome > 0.5) return 'win'
  if (outcome < 0.5) return 'loss'
  return 'draw'
}

function addMatchContextKeys(contextByMatchId, match, context) {
  [match?.match_id, match?.raw_match_id, match?.id]
    .map(normalizeKey)
    .filter(Boolean)
    .forEach(matchId => contextByMatchId.set(matchId, context))
}

function buildTeamRatingTimeline(db) {
  const ratings = new Map()
  const ratedMatches = new Map()
  const contextByMatchId = new Map()
  const contexts = []
  let ratingEligibleMatchCount = 0
  const matches = [...safeArr(db?.matches)].sort((a, b) => (
    getMatchTimestamp(a) - getMatchTimestamp(b) ||
    cleanText(a?.match_id).localeCompare(cleanText(b?.match_id))
  ))

  const getRating = teamId => ratings.get(teamId) ?? SCOUTING_TEAM_RATING_CONFIG.initialRating
  const getRatedMatches = teamId => ratedMatches.get(teamId) || 0

  matches.forEach(match => {
    const teamAId = cleanText(match?.team_a?.id || match?.team_a?.team_id)
    const teamBId = cleanText(match?.team_b?.id || match?.team_b?.team_id)
    if (!teamAId || !teamBId) return

    const mapOutcomes = safeArr(match?.maps).map(map => ({
      mapOrder: toNumber(map?.map_order ?? map?.mapOrder),
      mapName: normalizeKey(map?.map_name || map?.mapName),
      outcomeA: resolveMapOutcome(map, match?.team_a, match?.team_b)
    }))
    const context = {
      matchId: cleanText(match?.match_id || match?.raw_match_id),
      scheduledAt: match?.scheduled_at || '',
      stage: cleanText(match?.stage).toUpperCase(),
      teamAId,
      teamBId,
      teamAName: cleanText(match?.team_a?.short || match?.team_a?.name || teamAId),
      teamBName: cleanText(match?.team_b?.short || match?.team_b?.name || teamBId),
      teamARating: getRating(teamAId),
      teamBRating: getRating(teamBId),
      teamAPriorMatches: getRatedMatches(teamAId),
      teamBPriorMatches: getRatedMatches(teamBId),
      mapOutcomes
    }
    contexts.push(context)
    addMatchContextKeys(contextByMatchId, match, context)

    const ratingEligible = (
      cleanText(match?.status).toUpperCase() === 'COMPLETE' &&
      cleanText(match?.result_mode).toUpperCase() === 'NORMAL' &&
      !isForfeitMatch(match)
    )
    if (!ratingEligible) return

    const ratedMapOutcomes = mapOutcomes.map(map => map.outcomeA).filter(outcome => Number.isFinite(outcome))
    const outcomes = ratedMapOutcomes.length ? ratedMapOutcomes : [resolveMatchOutcome(match)].filter(Number.isFinite)
    if (!outcomes.length) return
    ratingEligibleMatchCount += 1

    let ratingA = context.teamARating
    let ratingB = context.teamBRating
    outcomes.forEach(outcomeA => {
      const expectedA = expectedScore(ratingA, ratingB)
      const change = SCOUTING_TEAM_RATING_CONFIG.mapKFactor * (outcomeA - expectedA)
      ratingA += change
      ratingB -= change
    })

    ratings.set(teamAId, ratingA)
    ratings.set(teamBId, ratingB)
    ratedMatches.set(teamAId, getRatedMatches(teamAId) + 1)
    ratedMatches.set(teamBId, getRatedMatches(teamBId) + 1)
  })

  return { contextByMatchId, contexts, finalRatings: ratings, ratedMatches, ratingEligibleMatchCount }
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

function buildMapRatingEntry(player, log, role, minutes) {
  const totals = getLogTotals(log)
  const per10 = {}
  ROLE_METRICS.forEach(metricId => {
    per10[metricId] = minutes > 0 ? (totals[metricId] / minutes) * 10 : 0
  })

  return {
    player_id: player?.player_id,
    team_id: log?.teamId || log?.team_id || player?.team_id,
    role,
    hero: log?.hero,
    most_played_hero: log?.hero,
    roleTimeMins: minutes,
    raw_time_mins: minutes,
    roleMapsPlayed: 1,
    maps_played: 1,
    metrics: { per10 },
    avg_elim: per10.elim,
    avg_ast: per10.ast,
    avg_dth: per10.dth,
    avg_dmg: per10.dmg,
    avg_heal: per10.heal,
    avg_block: per10.block
  }
}

function getTeamMatchContext(context, teamId, log) {
  if (!context || !teamId) return null
  const mapOrder = toNumber(log?.mapOrder ?? log?.map_order)
  const mapName = normalizeKey(log?.mapName || log?.map_name)
  const mapContext = safeArr(context?.mapOutcomes).find(map => (
    (mapOrder > 0 && map.mapOrder === mapOrder) ||
    (mapName && map.mapName === mapName)
  ))
  if (teamId === context.teamAId) {
    return {
      ownTeamId: context.teamAId,
      ownTeamName: context.teamAName,
      opponentTeamId: context.teamBId,
      opponentTeamName: context.teamBName,
      ownRating: context.teamARating,
      opponentRating: context.teamBRating,
      ownPriorMatches: context.teamAPriorMatches,
      opponentPriorMatches: context.teamBPriorMatches,
      mapResult: getMapResult(mapContext?.outcomeA)
    }
  }
  if (teamId === context.teamBId) {
    return {
      ownTeamId: context.teamBId,
      ownTeamName: context.teamBName,
      opponentTeamId: context.teamAId,
      opponentTeamName: context.teamAName,
      ownRating: context.teamBRating,
      opponentRating: context.teamARating,
      ownPriorMatches: context.teamBPriorMatches,
      opponentPriorMatches: context.teamAPriorMatches,
      mapResult: getMapResult(Number.isFinite(mapContext?.outcomeA) ? 1 - mapContext.outcomeA : null)
    }
  }
  return null
}

function buildMapObservations(db, timeline) {
  const baselines = buildRatingBaselinesFromDb(db, { seasonId: db?.season?.season_id || 'FCR26' })
  const rows = []

  safeArr(db?.players).forEach(player => {
    safeArr(player?.match_logs).forEach(log => {
      const role = normalizeLeaderboardRole(log?.role || player?.role)
      const minutes = toNumber(log?.playtimeMinutes ?? log?.raw_time_mins)
      if (!role || minutes < SCOUTING_TEAM_RATING_CONFIG.minimumMapMinutes) return

      const matchId = normalizeKey(log?.matchId || log?.match_id || log?.rawMatchId || log?.raw_match_id)
      const context = timeline.contextByMatchId.get(matchId)
      const teamId = cleanText(log?.teamId || log?.team_id || player?.team_id)
      const teamContext = getTeamMatchContext(context, teamId, log)
      if (!teamContext) return

      const rating = calculateMapPlayerScoreV1({
        entry: buildMapRatingEntry(player, log, role, minutes),
        baselines
      })
      if (!Number.isFinite(rating?.rawScore)) return
      const totals = getLogTotals(log)

      rows.push({
        playerId: player?.player_id,
        role,
        subrole: rating.subrole || role,
        matchId: context.matchId,
        mapOrder: toNumber(log?.mapOrder ?? log?.map_order),
        mapName: cleanText(log?.mapName || log?.map_name),
        mapType: cleanText(log?.mapType || log?.map_type) || 'UNKNOWN',
        stage: cleanText(log?.stage || context.stage).toUpperCase(),
        scheduledAt: context.scheduledAt,
        hero: rating.canonicalHeroName || cleanText(log?.hero),
        minutes,
        totals,
        rawScore: rating.rawScore,
        ...teamContext
      })
    })
  })

  return addLineupContexts(rows)
}

function getMapTeamKey(row) {
  const mapKey = toNumber(row?.mapOrder) > 0
    ? `order:${toNumber(row.mapOrder)}`
    : `name:${normalizeKey(row?.mapName)}`
  return `${normalizeKey(row?.matchId)}|${mapKey}|${normalizeKey(row?.ownTeamId)}`
}

function getSortedHeroKey(rows) {
  return safeArr(rows)
    .map(row => cleanText(row?.hero))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join(' + ')
}

function addLineupContexts(rows) {
  const groups = new Map()
  safeArr(rows).forEach(row => {
    const key = getMapTeamKey(row)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })

  return safeArr(rows).map(row => {
    const teammates = groups.get(getMapTeamKey(row)) || []
    const tanks = teammates.filter(item => item.role === 'TANK')
    const damage = teammates.filter(item => item.role === 'DPS')
    const supports = teammates.filter(item => item.role === 'SUPPORT')
    const sameRolePartners = teammates.filter(item => item.role === row.role && item.playerId !== row.playerId)
    const tankHero = cleanText(tanks[0]?.hero)
    const supportPair = getSortedHeroKey(supports)
    const damagePair = getSortedHeroKey(damage)
    const anchorContext = row.role === 'TANK' ? supportPair : tankHero
    const partnerContext = row.role === 'TANK' ? damagePair : getSortedHeroKey(sameRolePartners)
    const lineupComplete = tanks.length >= 1 && damage.length >= 2 && supports.length >= 2
    const teamTotals = Object.fromEntries(ROLE_METRICS.map(metricId => [
      metricId,
      teammates.reduce((sum, teammate) => sum + toNumber(teammate?.totals?.[metricId]), 0)
    ]))
    const teamShares = Object.fromEntries(ROLE_METRICS.map(metricId => {
      const teamTotal = teamTotals[metricId]
      const playerTotal = toNumber(row?.totals?.[metricId])
      return [metricId, teamTotal > 0 ? playerTotal / teamTotal : null]
    }))

    return {
      ...row,
      lineupComplete,
      lineupSize: new Set(teammates.map(item => item.playerId).filter(Boolean)).size,
      lineupAnchor: anchorContext || 'UNKNOWN',
      lineupPartner: partnerContext || 'UNKNOWN',
      lineupSignature: `${tankHero || 'UNKNOWN'} | ${damagePair || 'UNKNOWN'} | ${supportPair || 'UNKNOWN'}`,
      teamShares
    }
  })
}

function buildMatchClusters(rows) {
  const groups = new Map()
  safeArr(rows).forEach((row, index) => {
    const matchId = cleanText(row?.matchId) || `match-${index}`
    if (!groups.has(matchId)) groups.set(matchId, [])
    groups.get(matchId).push(row)
  })

  return [...groups.entries()].map(([matchId, matchRows]) => ({
    matchId,
    maps: matchRows.length,
    minutes: Number(matchRows.reduce((sum, row) => sum + toNumber(row?.minutes), 0).toFixed(1)),
    adjustedScore: Number((weightedMean(matchRows, row => row.adjustedScore) || 0).toFixed(2))
  }))
}

function buildTemporalHoldout(matchClusters) {
  const clusters = safeArr(matchClusters)
  const splitIndex = Math.floor(clusters.length / 2)
  const early = clusters.slice(0, splitIndex)
  const late = clusters.slice(splitIndex)
  const eligible = early.length >= 3 && late.length >= 3
  const getClusterMean = values => values.length
    ? values.reduce((sum, row) => sum + toNumber(row?.adjustedScore), 0) / values.length
    : null
  const earlyScore = getClusterMean(early)
  const lateScore = getClusterMean(late)

  return {
    method: 'chronological-match-holdout-v1',
    eligible,
    earlyMatches: early.length,
    lateMatches: late.length,
    earlyAdjustedScore: Number.isFinite(earlyScore) ? Number(earlyScore.toFixed(1)) : null,
    lateAdjustedScore: Number.isFinite(lateScore) ? Number(lateScore.toFixed(1)) : null,
    delta: Number.isFinite(earlyScore) && Number.isFinite(lateScore)
      ? Number((lateScore - earlyScore).toFixed(1))
      : null
  }
}

function weightedMean(rows, valueSelector) {
  const valid = safeArr(rows)
    .map(row => ({ value: Number(valueSelector(row)), weight: Math.min(15, Math.max(1, toNumber(row?.minutes, 1))) }))
    .filter(row => Number.isFinite(row.value) && row.weight > 0)
  const totalWeight = valid.reduce((sum, row) => sum + row.weight, 0)
  if (totalWeight <= 0) return null
  return valid.reduce((sum, row) => sum + (row.value * row.weight), 0) / totalWeight
}

function average(values) {
  const valid = safeArr(values).map(Number).filter(Number.isFinite)
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function weightedQuantile(rows, valueSelector, percentile) {
  const values = safeArr(rows)
    .map(row => ({
      value: Number(valueSelector(row)),
      weight: Math.min(15, Math.max(1, toNumber(row?.minutes, 1)))
    }))
    .filter(row => Number.isFinite(row.value) && row.weight > 0)
    .sort((a, b) => a.value - b.value)
  if (!values.length) return null

  const totalWeight = values.reduce((sum, row) => sum + row.weight, 0)
  const target = Math.max(0, Math.min(1, percentile)) * totalWeight
  let cumulative = 0

  for (const row of values) {
    cumulative += row.weight
    if (cumulative >= target) return row.value
  }
  return values.at(-1)?.value ?? null
}

function summarizeScoreDistribution(rows, roleMean) {
  const valid = safeArr(rows).filter(row => Number.isFinite(Number(row?.adjustedScore)))
  if (!valid.length) return null

  const mean = weightedMean(valid, row => row.adjustedScore)
  const weights = valid.map(row => Math.min(15, Math.max(1, toNumber(row?.minutes, 1))))
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const weightSquareSum = weights.reduce((sum, weight) => sum + (weight ** 2), 0)
  const effectiveMaps = weightSquareSum > 0 ? (weightSum ** 2) / weightSquareSum : 0
  const variance = weightSum > 0
    ? valid.reduce((sum, row, index) => sum + (weights[index] * ((row.adjustedScore - mean) ** 2)), 0) / weightSum
    : 0
  const mapStandardError = effectiveMaps > 0 ? Math.sqrt(variance / effectiveMaps) : 0
  const matchGroups = new Map()
  valid.forEach((row, index) => {
    const key = cleanText(row?.matchId) || `map-${index}`
    if (!matchGroups.has(key)) matchGroups.set(key, [])
    matchGroups.get(key).push({ row, weight: weights[index] })
  })
  const matchClusters = [...matchGroups.values()].map(cluster => {
    const clusterWeight = cluster.reduce((sum, item) => sum + item.weight, 0)
    const clusterMean = clusterWeight > 0
      ? cluster.reduce((sum, item) => sum + (item.row.adjustedScore * item.weight), 0) / clusterWeight
      : mean
    return { value: clusterMean, weight: clusterWeight }
  })
  const matchWeightSum = matchClusters.reduce((sum, cluster) => sum + cluster.weight, 0)
  const matchWeightSquareSum = matchClusters.reduce((sum, cluster) => sum + (cluster.weight ** 2), 0)
  const effectiveMatches = matchWeightSquareSum > 0 ? (matchWeightSum ** 2) / matchWeightSquareSum : 0
  const matchVariance = matchWeightSum > 0
    ? matchClusters.reduce((sum, cluster) => sum + (cluster.weight * ((cluster.value - mean) ** 2)), 0) / matchWeightSum
    : 0
  const matchStandardError = effectiveMatches > 1 ? Math.sqrt(matchVariance / effectiveMatches) : 0
  const standardError = Math.max(mapStandardError, matchStandardError)
  const margin90 = standardError * 1.645
  const aboveReferenceWeight = valid.reduce((sum, row, index) => (
    sum + (row.adjustedScore >= roleMean ? weights[index] : 0)
  ), 0)

  return {
    floor: Number(weightedQuantile(valid, row => row.adjustedScore, 0.25).toFixed(1)),
    median: Number(weightedQuantile(valid, row => row.adjustedScore, 0.5).toFixed(1)),
    ceiling: Number(weightedQuantile(valid, row => row.adjustedScore, 0.75).toFixed(1)),
    mean: Number(mean.toFixed(1)),
    spread: Number((weightedQuantile(valid, row => row.adjustedScore, 0.75) - weightedQuantile(valid, row => row.adjustedScore, 0.25)).toFixed(1)),
    effectiveMaps: Number(effectiveMaps.toFixed(1)),
    effectiveMatches: Number(effectiveMatches.toFixed(1)),
    intervalMethod: matchClusters.length >= 2 ? 'MATCH_CLUSTERED' : 'MAP_FALLBACK',
    standardError: Number(standardError.toFixed(2)),
    margin90: Number(margin90.toFixed(1)),
    rangeLow90: Number((mean - margin90).toFixed(1)),
    rangeHigh90: Number((mean + margin90).toFixed(1)),
    aboveRoleMeanPct: weightSum > 0 ? Math.round((aboveReferenceWeight / weightSum) * 100) : 0
  }
}

function getEffectiveOpponentCount(opponents) {
  const totalMinutes = safeArr(opponents).reduce((sum, opponent) => sum + toNumber(opponent?.minutes), 0)
  if (totalMinutes <= 0) return 0
  const concentration = opponents.reduce((sum, opponent) => {
    const share = toNumber(opponent?.minutes) / totalMinutes
    return sum + (share ** 2)
  }, 0)
  return concentration > 0 ? 1 / concentration : 0
}

function groupAdjustedContext(rows, keySelector) {
  const groups = new Map()
  safeArr(rows).forEach(row => {
    const key = cleanText(keySelector(row))
    if (!key) return
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })

  return [...groups.entries()].map(([key, contextRows]) => ({
    key,
    maps: contextRows.length,
    matches: new Set(contextRows.map(row => row.matchId)).size,
    minutes: Number(contextRows.reduce((sum, row) => sum + row.minutes, 0).toFixed(1)),
    adjustedScore: Number((weightedMean(contextRows, row => row.adjustedScore) || 0).toFixed(1))
  })).sort((a, b) => b.adjustedScore - a.adjustedScore || b.minutes - a.minutes)
}

function summarizeDeploymentContext(contextRows, baselineScore, gate) {
  const maps = contextRows.length
  const matches = new Set(contextRows.map(row => row.matchId)).size
  const minutes = contextRows.reduce((sum, row) => sum + toNumber(row?.minutes), 0)
  const rawContextScore = weightedMean(contextRows, row => row.adjustedScore) ?? baselineScore
  const confidence = (
    (Math.min(1, maps / 6) * 0.45) +
    (Math.min(1, matches / 3) * 0.35) +
    (Math.min(1, minutes / 60) * 0.2)
  )
  const contextScore = baselineScore + ((rawContextScore - baselineScore) * confidence)
  const eligible = (
    maps >= gate.minMaps &&
    matches >= gate.minMatches &&
    minutes >= gate.minMinutes &&
    confidence >= SCOUTING_TEAM_RATING_CONFIG.deploymentMinConfidence
  )

  return {
    maps,
    matches,
    minutes: Number(minutes.toFixed(1)),
    rawContextScore: Number(rawContextScore.toFixed(1)),
    contextScore: Number(contextScore.toFixed(1)),
    delta: Number((contextScore - baselineScore).toFixed(1)),
    retentionPct: baselineScore > 0 ? Math.round((contextScore / baselineScore) * 100) : null,
    confidencePct: Math.round(confidence * 100),
    evidenceGrade: confidence >= 0.75 ? 'A' : confidence >= 0.55 ? 'B' : 'C',
    eligible
  }
}

function groupDeploymentContexts(rows, keySelector, baselineScore, gate) {
  const groups = new Map()
  safeArr(rows).forEach(row => {
    const key = cleanText(keySelector(row))
    if (!key || key.includes('UNKNOWN')) return
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })

  return [...groups.entries()].map(([key, contextRows]) => ({
    key,
    ...summarizeDeploymentContext(contextRows, baselineScore, gate)
  }))
}

function buildDeploymentPlaybook(rows, baselineScore) {
  const heroMapGate = {
    minMaps: SCOUTING_TEAM_RATING_CONFIG.deploymentHeroMapMinMaps,
    minMatches: SCOUTING_TEAM_RATING_CONFIG.deploymentMinMatches,
    minMinutes: SCOUTING_TEAM_RATING_CONFIG.deploymentHeroMapMinMinutes,
    minConfidencePct: Math.round(SCOUTING_TEAM_RATING_CONFIG.deploymentMinConfidence * 100)
  }
  const contextGate = {
    minMaps: SCOUTING_TEAM_RATING_CONFIG.deploymentContextMinMaps,
    minMatches: SCOUTING_TEAM_RATING_CONFIG.deploymentMinMatches,
    minMinutes: SCOUTING_TEAM_RATING_CONFIG.deploymentContextMinMinutes,
    minConfidencePct: Math.round(SCOUTING_TEAM_RATING_CONFIG.deploymentMinConfidence * 100)
  }
  const observedHeroMapCells = groupDeploymentContexts(
    rows,
    row => `${cleanText(row.hero)}|||${cleanText(row.mapType)}`,
    baselineScore,
    heroMapGate
  )
  const heroMapCells = observedHeroMapCells
    .filter(cell => cell.eligible)
    .map(cell => {
      const [hero, mapType] = cell.key.split('|||')
      return { ...cell, hero, mapType }
    })
    .sort((a, b) => b.retentionPct - a.retentionPct || b.confidencePct - a.confidencePct)
  const heroContexts = groupDeploymentContexts(rows, row => row.hero, baselineScore, contextGate)
    .filter(context => context.eligible)
    .map(context => ({ ...context, hero: context.key }))
    .sort((a, b) => b.minutes - a.minutes || b.retentionPct - a.retentionPct)
  const lineupAnchors = groupDeploymentContexts(rows, row => row.lineupAnchor, baselineScore, contextGate)
    .filter(context => context.eligible)
    .sort((a, b) => b.retentionPct - a.retentionPct || b.confidencePct - a.confidencePct)
    .slice(0, 8)
  const partnerContexts = groupDeploymentContexts(rows, row => row.lineupPartner, baselineScore, contextGate)
    .filter(context => context.eligible)
    .sort((a, b) => b.retentionPct - a.retentionPct || b.confidencePct - a.confidencePct)
    .slice(0, 8)

  return {
    method: 'shrunk-context-fit-v1',
    caveat: 'same-map-association-not-causal',
    baselineScore: Number(baselineScore.toFixed(1)),
    sampleGate: {
      heroMap: heroMapGate,
      lineupContext: contextGate
    },
    observedHeroMapCells: observedHeroMapCells.length,
    eligibleHeroMapCells: heroMapCells.length,
    heroMapCells,
    heroContexts,
    lineupAnchors,
    partnerContexts
  }
}

function getDeltaPct(current, baseline) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline <= 0) return null
  return Math.round(((current - baseline) / baseline) * 100)
}

function quantile(values, percentile) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const index = (sorted.length - 1) * percentile
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + ((sorted[upper] - sorted[lower]) * (index - lower))
}

function solveLinearSystem(matrix, vector) {
  const size = vector.length
  const augmented = matrix.map((row, index) => [...row, vector[index]])

  for (let column = 0; column < size; column += 1) {
    let pivot = column
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row
    }
    if (Math.abs(augmented[pivot][column]) < 1e-9) return null
    if (pivot !== column) [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]]

    const divisor = augmented[column][column]
    for (let index = column; index <= size; index += 1) augmented[column][index] /= divisor

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue
      const factor = augmented[row][column]
      for (let index = column; index <= size; index += 1) {
        augmented[row][index] -= factor * augmented[column][index]
      }
    }
  }

  return augmented.map(row => row[size])
}

function buildShrunkContextMeans(rows, keySelector, valueSelector, roleMean, priorWeight) {
  const groups = new Map()
  safeArr(rows).forEach(row => {
    const key = cleanText(keySelector(row)) || 'UNKNOWN'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })

  return new Map([...groups.entries()].map(([key, contextRows]) => {
    const contextMean = weightedMean(contextRows, valueSelector) ?? roleMean
    const contextWeight = contextRows.reduce(
      (sum, row) => sum + Math.min(15, Math.max(1, toNumber(row?.minutes, 1))),
      0
    )
    const reliability = contextWeight / (contextWeight + priorWeight)
    return [key, {
      mean: roleMean + ((contextMean - roleMean) * reliability),
      rawMean: contextMean,
      reliability,
      maps: contextRows.length,
      minutes: contextRows.reduce((sum, row) => sum + toNumber(row?.minutes), 0)
    }]
  }))
}

function getContextMean(contexts, key, roleMean) {
  return contexts.get(cleanText(key) || 'UNKNOWN')?.mean ?? roleMean
}

function fitRoleContextModel(rows, role) {
  const roleRows = rows.filter(row => row.role === role)
  const roleMean = weightedMean(roleRows, row => row.rawScore) || 50
  const mapTypeMeans = new Map()

  new Set(roleRows.map(row => row.mapType)).forEach(mapType => {
    const mapRows = roleRows.filter(row => row.mapType === mapType)
    mapTypeMeans.set(mapType, mapRows.length >= 20
      ? weightedMean(mapRows, row => row.rawScore) || roleMean
      : roleMean)
  })

  const mapNeutralRows = roleRows.map(row => {
    const mapMean = mapTypeMeans.get(row.mapType) || roleMean
    return { ...row, mapNeutralScore: row.rawScore - mapMean + roleMean }
  })
  const heroMeans = buildShrunkContextMeans(
    mapNeutralRows,
    row => row.hero,
    row => row.mapNeutralScore,
    roleMean,
    SCOUTING_TEAM_RATING_CONFIG.heroContextPriorWeight
  )
  const heroNeutralRows = mapNeutralRows.map(row => ({
    ...row,
    heroNeutralScore: row.mapNeutralScore - getContextMean(heroMeans, row.hero, roleMean) + roleMean
  }))
  const lineupAnchorMeans = buildShrunkContextMeans(
    heroNeutralRows,
    row => row.lineupAnchor,
    row => row.heroNeutralScore,
    roleMean,
    SCOUTING_TEAM_RATING_CONFIG.lineupContextPriorWeight
  )
  const anchorNeutralRows = heroNeutralRows.map(row => ({
    ...row,
    anchorNeutralScore: row.heroNeutralScore - getContextMean(lineupAnchorMeans, row.lineupAnchor, roleMean) + roleMean
  }))
  const lineupPartnerMeans = buildShrunkContextMeans(
    anchorNeutralRows,
    row => row.lineupPartner,
    row => row.anchorNeutralScore,
    roleMean,
    SCOUTING_TEAM_RATING_CONFIG.lineupContextPriorWeight
  )
  const contextNeutralRows = anchorNeutralRows.map(row => ({
    ...row,
    lineupNeutralScore: row.anchorNeutralScore - getContextMean(lineupPartnerMeans, row.lineupPartner, roleMean) + roleMean
  }))
  const meanOpponentRating = weightedMean(roleRows, row => row.opponentRating) || SCOUTING_TEAM_RATING_CONFIG.initialRating
  const meanOwnRating = weightedMean(roleRows, row => row.ownRating) || SCOUTING_TEAM_RATING_CONFIG.initialRating
  const matrix = Array.from({ length: 3 }, () => [0, 0, 0])
  const vector = [0, 0, 0]

  contextNeutralRows.forEach(row => {
    const weight = Math.min(15, Math.max(1, row.minutes))
    const features = [
      1,
      (row.opponentRating - meanOpponentRating) / 100,
      (row.ownRating - meanOwnRating) / 100
    ]
    const target = row.lineupNeutralScore

    for (let i = 0; i < features.length; i += 1) {
      vector[i] += weight * features[i] * target
      for (let j = 0; j < features.length; j += 1) {
        matrix[i][j] += weight * features[i] * features[j]
      }
    }
  })

  matrix[1][1] += SCOUTING_TEAM_RATING_CONFIG.ridgeLambda
  matrix[2][2] += SCOUTING_TEAM_RATING_CONFIG.ridgeLambda
  const coefficients = solveLinearSystem(matrix, vector) || [roleMean, 0, 0]

  return {
    role,
    roleMean,
    mapTypeMeans,
    heroMeans,
    lineupAnchorMeans,
    lineupPartnerMeans,
    meanOpponentRating,
    meanOwnRating,
    intercept: coefficients[0],
    opponentCoefficient: Math.min(0, coefficients[1]),
    ownTeamCoefficient: Math.max(0, coefficients[2]),
    observations: roleRows.length,
    completeLineupObservations: roleRows.filter(row => row.lineupComplete).length
  }
}

function applyContextAdjustment(row, model) {
  const mapMean = model.mapTypeMeans.get(row.mapType) || model.roleMean
  const mapNeutralScore = row.rawScore - mapMean + model.roleMean
  const heroMean = getContextMean(model.heroMeans, row.hero, model.roleMean)
  const heroAdjustment = model.roleMean - heroMean
  const heroNeutralScore = mapNeutralScore + heroAdjustment
  const lineupAnchorMean = getContextMean(model.lineupAnchorMeans, row.lineupAnchor, model.roleMean)
  const lineupAnchorAdjustment = model.roleMean - lineupAnchorMean
  const anchorNeutralScore = heroNeutralScore + lineupAnchorAdjustment
  const lineupPartnerMean = getContextMean(model.lineupPartnerMeans, row.lineupPartner, model.roleMean)
  const lineupPartnerAdjustment = model.roleMean - lineupPartnerMean
  const lineupAdjustment = lineupAnchorAdjustment + lineupPartnerAdjustment
  const lineupNeutralScore = anchorNeutralScore + lineupPartnerAdjustment
  const appliedHeroLineupAdjustment = (heroAdjustment + lineupAdjustment) * SCOUTING_TEAM_RATING_CONFIG.heroLineupBlend
  const opponentFeature = (row.opponentRating - model.meanOpponentRating) / 100
  const ownFeature = (row.ownRating - model.meanOwnRating) / 100
  const opponentAdjustment = -(model.opponentCoefficient * opponentFeature)
  const ownTeamAdjustment = -(model.ownTeamCoefficient * ownFeature)

  return {
    ...row,
    mapNeutralScore,
    heroNeutralScore,
    lineupNeutralScore,
    heroAdjustment,
    lineupAnchorAdjustment,
    lineupPartnerAdjustment,
    lineupAdjustment,
    heroLineupAdjustment: heroAdjustment + lineupAdjustment,
    appliedHeroLineupAdjustment,
    opponentAdjustment,
    ownTeamAdjustment,
    adjustedScore: mapNeutralScore + appliedHeroLineupAdjustment + opponentAdjustment + ownTeamAdjustment
  }
}

function groupOpponentRows(rows) {
  const groups = new Map()
  rows.forEach(row => {
    if (!groups.has(row.opponentTeamId)) groups.set(row.opponentTeamId, [])
    groups.get(row.opponentTeamId).push(row)
  })

  return [...groups.entries()].map(([opponentTeamId, opponentRows]) => ({
    opponentTeamId,
    opponentTeamName: opponentRows[0]?.opponentTeamName || opponentTeamId,
    maps: opponentRows.length,
    matches: new Set(opponentRows.map(row => row.matchId)).size,
    minutes: Number(opponentRows.reduce((sum, row) => sum + row.minutes, 0).toFixed(1)),
    opponentRating: Math.round(weightedMean(opponentRows, row => row.opponentRating) || 0),
    rawScore: Number((weightedMean(opponentRows, row => row.rawScore) || 0).toFixed(1)),
    adjustedScore: Number((weightedMean(opponentRows, row => row.adjustedScore) || 0).toFixed(1))
  })).sort((a, b) => b.opponentRating - a.opponentRating || b.minutes - a.minutes)
}

function buildPlayerSignals(rows, thresholds, roleModel) {
  const strongRows = rows.filter(row => row.opponentRating >= thresholds.strong)
  const weakRows = rows.filter(row => row.opponentRating <= thresholds.weak)
  const peerRows = rows.filter(row => row.opponentRating > thresholds.weak && row.opponentRating < thresholds.strong)
  const matureRows = rows.filter(row => row.opponentPriorMatches >= SCOUTING_TEAM_RATING_CONFIG.matureOpponentMatches)
  const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0)
  const matureMinutes = matureRows.reduce((sum, row) => sum + row.minutes, 0)
  const opponents = groupOpponentRows(rows)
  const matches = new Set(rows.map(row => row.matchId)).size
  const mapTypes = groupAdjustedContext(rows, row => row.mapType)
  const heroContexts = groupAdjustedContext(rows, row => row.hero)
    .sort((a, b) => b.minutes - a.minutes || b.maps - a.maps)
  const resultGroups = groupAdjustedContext(rows.filter(row => row.mapResult !== 'unknown'), row => row.mapResult)
  const wins = resultGroups.find(group => group.key === 'win') || null
  const losses = resultGroups.find(group => group.key === 'loss') || null
  const performanceEnvelope = summarizeScoreDistribution(rows, roleModel.roleMean)
  const effectiveOpponents = getEffectiveOpponentCount(opponents)
  const chronologicalRows = [...rows].sort((a, b) => (
    Date.parse(a.scheduledAt || '') - Date.parse(b.scheduledAt || '') ||
    a.mapOrder - b.mapOrder ||
    a.mapName.localeCompare(b.mapName)
  ))
  const comparisonClusters = buildMatchClusters(chronologicalRows)
  const temporalHoldout = buildTemporalHoldout(comparisonClusters)
  const scoreValues = chronologicalRows.map(row => row.adjustedScore).filter(Number.isFinite)
  const recentValues = scoreValues.slice(-5)
  const previousValues = scoreValues.slice(-10, -5)
  const recentScore = recentValues.length >= 3 ? average(recentValues) : null
  const previousScore = previousValues.length >= 3 ? average(previousValues) : null
  const meanScore = average(scoreValues)
  const scoreVariance = scoreValues.length >= 5 && meanScore > 0
    ? average(scoreValues.map(value => (value - meanScore) ** 2))
    : null
  const scoreVariationPct = Number.isFinite(scoreVariance)
    ? Math.round((Math.sqrt(scoreVariance) / meanScore) * 100)
    : null

  const summarizeRows = selectedRows => ({
    maps: selectedRows.length,
    matches: new Set(selectedRows.map(row => row.matchId)).size,
    minutes: Number(selectedRows.reduce((sum, row) => sum + row.minutes, 0).toFixed(1)),
    rawScore: selectedRows.length ? Number((weightedMean(selectedRows, row => row.rawScore) || 0).toFixed(1)) : null,
    adjustedScore: selectedRows.length ? Number((weightedMean(selectedRows, row => row.adjustedScore) || 0).toFixed(1)) : null,
    envelope: selectedRows.length ? summarizeScoreDistribution(selectedRows, roleModel.roleMean) : null
  })

  const rawScore = weightedMean(rows, row => row.rawScore)
  const adjustedScore = weightedMean(rows, row => row.adjustedScore)
  const heroNeutralScore = weightedMean(rows, row => row.heroNeutralScore)
  const lineupNeutralScore = weightedMean(rows, row => row.lineupNeutralScore)
  const deploymentPlaybook = buildDeploymentPlaybook(rows, adjustedScore || roleModel.roleMean)
  const completeLineupRows = rows.filter(row => row.lineupComplete)
  const completeLineupMinutes = completeLineupRows.reduce((sum, row) => sum + row.minutes, 0)
  const teamContributionMetrics = Object.fromEntries(ROLE_METRICS.map(metricId => {
    const metricRows = rows.filter(row => (
      row?.teamShares?.[metricId] !== null &&
      row?.teamShares?.[metricId] !== undefined &&
      Number.isFinite(Number(row.teamShares[metricId]))
    ))
    const share = weightedMean(metricRows, row => row.teamShares[metricId])
    return [metricId, {
      sharePct: Number.isFinite(share) ? Number((share * 100).toFixed(1)) : null,
      maps: metricRows.length
    }]
  }))
  const ownHeroContexts = new Set(rows.map(row => cleanText(row.hero)).filter(Boolean))
  const lineupAnchorContexts = new Set(rows.map(row => cleanText(row.lineupAnchor)).filter(value => value && value !== 'UNKNOWN'))
  const partnerContexts = new Set(rows.map(row => cleanText(row.lineupPartner)).filter(value => value && value !== 'UNKNOWN'))
  const weakestOpponent = [...opponents]
    .sort((a, b) => a.opponentRating - b.opponentRating || b.minutes - a.minutes)[0] || null
  const withoutWeakestOpponent = weakestOpponent
    ? rows.filter(row => row.opponentTeamId !== weakestOpponent.opponentTeamId)
    : []
  const removeWeakestEligible = opponents.length > 1 && withoutWeakestOpponent.length >= 3
  const removeWeakestAdjustedScore = removeWeakestEligible
    ? weightedMean(withoutWeakestOpponent, row => row.adjustedScore)
    : null
  const matchIds = [...new Set(rows.map(row => row.matchId))]
  const leaveOneMatchOutTrials = matchIds
    .map(matchId => {
      const removedRows = rows.filter(row => row.matchId === matchId)
      const remainingRows = rows.filter(row => row.matchId !== matchId)
      const trialScore = remainingRows.length >= 3
        ? weightedMean(remainingRows, row => row.adjustedScore)
        : null
      if (!Number.isFinite(trialScore)) return null
      return {
        matchId,
        opponentTeamId: removedRows[0]?.opponentTeamId || '',
        opponentTeamName: removedRows[0]?.opponentTeamName || removedRows[0]?.opponentTeamId || '',
        removedMaps: removedRows.length,
        adjustedScore: Number(trialScore.toFixed(1)),
        delta: Number((trialScore - adjustedScore).toFixed(1))
      }
    })
    .filter(Boolean)
  const weakestLeaveOneOut = [...leaveOneMatchOutTrials]
    .sort((a, b) => a.adjustedScore - b.adjustedScore || b.removedMaps - a.removedMaps)[0] || null
  const strongestLeaveOneOut = [...leaveOneMatchOutTrials]
    .sort((a, b) => b.adjustedScore - a.adjustedScore || b.removedMaps - a.removedMaps)[0] || null
  const playoffs = summarizeRows(rows.filter(row => row.stage === 'PLAYOFFS'))
  const earlier = summarizeRows(rows.filter(row => row.stage !== 'PLAYOFFS'))
  const strong = summarizeRows(strongRows)
  const weak = summarizeRows(weakRows)
  const opponentTiers = [
    ['STRONG', strongRows],
    ['PEER', peerRows],
    ['LOWER', weakRows]
  ].map(([key, tierRows]) => {
    const summary = summarizeRows(tierRows)
    return {
      key,
      ...summary,
      opponents: new Set(tierRows.map(row => row.opponentTeamId)).size,
      retentionPct: summary.maps >= 2 && adjustedScore > 0
        ? Math.round((summary.adjustedScore / adjustedScore) * 100)
        : null
    }
  })
  const strongOpponentCount = new Set(strongRows.map(row => row.opponentTeamId)).size
  const strongConfidence = strong.maps >= 3
    ? (Math.min(1, strong.maps / 12) * 0.5) +
      (Math.min(1, strong.matches / 4) * 0.3) +
      (Math.min(1, strongOpponentCount / 3) * 0.2)
    : 0
  const strongRetentionPct = strong.maps >= 3 && adjustedScore > 0
    ? Math.round((strong.adjustedScore / adjustedScore) * 100)
    : null
  const evidenceConfidence = (
    (Math.min(1, rows.length / 32) * 0.3) +
    (Math.min(1, matches / 10) * 0.2) +
    (Math.min(1, effectiveOpponents / 4) * 0.2) +
    (Math.min(1, mapTypes.length / 4) * 0.1) +
    ((totalMinutes > 0 ? matureMinutes / totalMinutes : 0) * 0.2)
  )

  return {
    maps: rows.length,
    matches,
    minutes: Number(totalMinutes.toFixed(1)),
    subrole: rows[0]?.subrole || rows[0]?.role || '',
    scheduleRating: Math.round(weightedMean(rows, row => row.opponentRating) || SCOUTING_TEAM_RATING_CONFIG.initialRating),
    averageExpectedWinPct: Math.round((weightedMean(rows, row => expectedScore(row.ownRating, row.opponentRating)) || 0.5) * 100),
    rawScore: Number((rawScore || 0).toFixed(1)),
    adjustedScore: Number((adjustedScore || 0).toFixed(1)),
    adjustment: Number(((adjustedScore || 0) - (rawScore || 0)).toFixed(1)),
    heroLineupContext: {
      method: 'shrunken-hero-lineup-neutralization-v1',
      heroNeutralScore: Number((heroNeutralScore || 0).toFixed(1)),
      lineupNeutralScore: Number((lineupNeutralScore || 0).toFixed(1)),
      heroAdjustment: Number((weightedMean(rows, row => row.heroAdjustment) || 0).toFixed(1)),
      lineupAdjustment: Number((weightedMean(rows, row => row.lineupAdjustment) || 0).toFixed(1)),
      combinedAdjustment: Number((weightedMean(rows, row => row.heroLineupAdjustment) || 0).toFixed(1)),
      appliedAdjustment: Number((weightedMean(rows, row => row.appliedHeroLineupAdjustment) || 0).toFixed(1)),
      appliedWeightPct: Math.round(SCOUTING_TEAM_RATING_CONFIG.heroLineupBlend * 100),
      coveragePct: totalMinutes > 0 ? Math.round((completeLineupMinutes / totalMinutes) * 100) : 0,
      completeMaps: completeLineupRows.length,
      ownHeroContexts: ownHeroContexts.size,
      lineupAnchorContexts: lineupAnchorContexts.size,
      partnerContexts: partnerContexts.size
    },
    teamContribution: {
      method: 'same-map-team-share-shadow-v1',
      rankingImpact: false,
      coveragePct: totalMinutes > 0 ? Math.round((completeLineupMinutes / totalMinutes) * 100) : 0,
      completeMaps: completeLineupRows.length,
      metrics: teamContributionMetrics
    },
    comparisonClusters,
    temporalHoldout,
    opponentAdjustment: Number((weightedMean(rows, row => row.opponentAdjustment) || 0).toFixed(1)),
    ownTeamAdjustment: Number((weightedMean(rows, row => row.ownTeamAdjustment) || 0).toFixed(1)),
    matureContextPct: totalMinutes > 0 ? Math.round((matureMinutes / totalMinutes) * 100) : 0,
    strong,
    weak,
    performanceEnvelope,
    scoreVariationPct,
    scoreTrend: {
      metricId: 'impact',
      rows: chronologicalRows.slice(-10).map((row, index) => ({
        order: index + 1,
        mapName: row.mapName,
        hero: row.hero,
        value: Number(row.adjustedScore.toFixed(1))
      }))
    },
    form: {
      recentValue: Number.isFinite(recentScore) ? Number(recentScore.toFixed(1)) : null,
      previousValue: Number.isFinite(previousScore) ? Number(previousScore.toFixed(1)) : null,
      deltaPct: getDeltaPct(recentScore, previousScore),
      recentMaps: recentValues.length,
      previousMaps: previousValues.length
    },
    pressureTest: {
      eligible: strong.maps >= 3,
      maps: strong.maps,
      matches: strong.matches,
      opponents: strongOpponentCount,
      adjustedScore: strong.adjustedScore,
      retentionPct: strongRetentionPct,
      confidencePct: Math.round(strongConfidence * 100)
    },
    mapResultContext: {
      wins,
      losses,
      lossRetentionPct: wins?.maps >= 2 && losses?.maps >= 2 && wins.adjustedScore > 0
        ? Math.round((losses.adjustedScore / wins.adjustedScore) * 100)
        : null
    },
    adjustedMapTypes: {
      groups: mapTypes,
      strongest: mapTypes.find(group => group.maps >= 2) || null,
      weakest: [...mapTypes].reverse().find(group => group.maps >= 2) || null
    },
    adjustedHeroContexts: {
      groups: heroContexts,
      primary: heroContexts[0] || null,
      strongest: [...heroContexts]
        .filter(group => group.maps >= 2)
        .sort((a, b) => b.adjustedScore - a.adjustedScore || b.minutes - a.minutes)[0] || null
    },
    deploymentPlaybook,
    opponentTiers,
    evidenceQuality: {
      confidencePct: Math.round(evidenceConfidence * 100),
      grade: evidenceConfidence >= 0.82 ? 'A' : evidenceConfidence >= 0.68 ? 'B' : 'C',
      effectiveMaps: performanceEnvelope?.effectiveMaps || 0,
      uniqueOpponents: opponents.length,
      effectiveOpponents: Number(effectiveOpponents.toFixed(1)),
      mapTypes: mapTypes.length
    },
    robustness: {
      metricId: 'adjusted-impact',
      removeWeakestOpponent: {
        eligible: removeWeakestEligible,
        opponentTeamId: weakestOpponent?.opponentTeamId || '',
        opponentTeamName: weakestOpponent?.opponentTeamName || '',
        opponentRating: weakestOpponent?.opponentRating || null,
        removedMaps: weakestOpponent?.maps || 0,
        removedMatches: weakestOpponent?.matches || 0,
        adjustedScore: Number.isFinite(removeWeakestAdjustedScore)
          ? Number(removeWeakestAdjustedScore.toFixed(1))
          : null,
        delta: Number.isFinite(removeWeakestAdjustedScore)
          ? Number((removeWeakestAdjustedScore - adjustedScore).toFixed(1))
          : null
      },
      leaveOneMatchOut: {
        eligible: leaveOneMatchOutTrials.length >= 2,
        trials: leaveOneMatchOutTrials.length,
        worstAdjustedScore: weakestLeaveOneOut?.adjustedScore ?? null,
        bestAdjustedScore: strongestLeaveOneOut?.adjustedScore ?? null,
        maxDrop: weakestLeaveOneOut?.delta ?? null,
        maxGain: strongestLeaveOneOut?.delta ?? null,
        influentialMatchId: weakestLeaveOneOut?.matchId || '',
        influentialOpponentTeamId: weakestLeaveOneOut?.opponentTeamId || '',
        influentialOpponentName: weakestLeaveOneOut?.opponentTeamName || '',
        removedMaps: weakestLeaveOneOut?.removedMaps || 0
      }
    },
    strongestOpponents: opponents.slice(0, 3),
    stageContext: {
      playoffs,
      earlier,
      adjustedDeltaPct: playoffs.matches >= 2 && earlier.matches >= 2
        ? getDeltaPct(playoffs.adjustedScore, earlier.adjustedScore)
        : null
    },
    thresholds,
    model: {
      observations: roleModel.observations,
      opponentCoefficientPer100: Number(roleModel.opponentCoefficient.toFixed(2)),
      ownTeamCoefficientPer100: Number(roleModel.ownTeamCoefficient.toFixed(2))
    }
  }
}

export function buildScoutingOpponentStrengthModel(db) {
  const timeline = buildTeamRatingTimeline(db)
  const rawRows = buildMapObservations(db, timeline)
  const ratingSamples = timeline.contexts.flatMap(context => [context.teamARating, context.teamBRating])
  const thresholds = {
    weak: quantile(ratingSamples, 0.33) || SCOUTING_TEAM_RATING_CONFIG.initialRating,
    strong: quantile(ratingSamples, 0.67) || SCOUTING_TEAM_RATING_CONFIG.initialRating
  }
  const roleModels = new Map(['TANK', 'DPS', 'SUPPORT'].map(role => [role, fitRoleContextModel(rawRows, role)]))
  const subroles = ['TANK', 'HITSCAN', 'FLEX_DPS', 'MAIN_SUPPORT', 'FLEX_SUPPORT']
  const subroleModels = new Map(subroles.map(subrole => {
    const subroleRows = rawRows.filter(row => row.subrole === subrole)
    const model = fitRoleContextModel(
      subroleRows.map(row => ({ ...row, role: subrole })),
      subrole
    )
    return [subrole, { ...model, subrole }]
  }))
  const rows = rawRows.map(row => applyContextAdjustment(row, subroleModels.get(row.subrole) || roleModels.get(row.role)))
  const rowsByPlayerRole = new Map()
  const rowsByPlayerSubrole = new Map()

  rows.forEach(row => {
    const roleKey = `${row.playerId}:${row.role}`
    const subroleKey = `${row.playerId}:${row.subrole}`
    if (!rowsByPlayerRole.has(roleKey)) rowsByPlayerRole.set(roleKey, [])
    if (!rowsByPlayerSubrole.has(subroleKey)) rowsByPlayerSubrole.set(subroleKey, [])
    rowsByPlayerRole.get(roleKey).push(row)
    rowsByPlayerSubrole.get(subroleKey).push(row)
  })

  const signalsByPlayerRole = new Map()
  rowsByPlayerRole.forEach((playerRows, key) => {
    signalsByPlayerRole.set(key, buildPlayerSignals(playerRows, thresholds, roleModels.get(playerRows[0].role)))
  })
  const signalsByPlayerSubrole = new Map()
  rowsByPlayerSubrole.forEach((playerRows, key) => {
    signalsByPlayerSubrole.set(key, buildPlayerSignals(
      playerRows,
      thresholds,
      subroleModels.get(playerRows[0].subrole) || roleModels.get(playerRows[0].role)
    ))
  })

  return {
    signalsByPlayerRole,
    signalsByPlayerSubrole,
    thresholds,
    roleModels,
    subroleModels,
    teamRatings: timeline.finalRatings,
    ratedMatches: timeline.ratedMatches,
    observationCount: rows.length,
    eligibleMatchCount: timeline.ratingEligibleMatchCount
  }
}

export function getScoutingOpponentStrengthSignals(model, playerId, role, subrole = '') {
  if (subrole) {
    const scoped = model?.signalsByPlayerSubrole?.get(`${playerId}:${subrole}`)
    if (scoped) return scoped
  }
  return model?.signalsByPlayerRole?.get(`${playerId}:${normalizeLeaderboardRole(role)}`) || null
}

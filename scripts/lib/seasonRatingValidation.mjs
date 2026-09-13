import { collectRatingLogRowsFromPlayers, buildRatingBaselinesFromDb } from '../../src/lib/ratingBaselines.js'
import { calculateRawProfileScore } from '../../src/lib/ratingModel.js'
import { scoreLeaderboardEntries } from '../../src/lib/leaderboardScoring.js'
import { getSeasonRatingValue } from '../../src/lib/seasonRatingPolicy.js'
import { buildSeasonTeamTimeline } from '../../src/lib/seasonOpponentStrength.js'

export const VALIDATION_POLICY = Object.freeze({
  version: 'rolling-day-v1', minimumTargetMinutes: 10, minimumRankGroup: 6,
  recentMatches: 3, bootstrapReplicates: 2000, seed: 20260906
})
const key = value => String(value ?? '').trim().toLowerCase()
const round = value => Number.isFinite(value) ? Number(value.toFixed(4)) : null
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const weightedMean = (rows, value) => {
  const total = rows.reduce((sum, row) => sum + row.minutes, 0)
  return total > 0 ? rows.reduce((sum, row) => sum + value(row) * row.minutes, 0) / total : null
}
const groupBy = (rows, getKey) => {
  const groups = new Map()
  for (const row of rows) {
    const id = getKey(row)
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(row)
  }
  return groups
}
const metricNames = { elim: 'elims', ast: 'assists', dth: 'deaths', dmg: 'damage', heal: 'healing', block: 'blocked' }

export function prepareValidationData(db, seasonId = 'FCR26') {
  const timeline = buildSeasonTeamTimeline(db)
  const collected = collectRatingLogRowsFromPlayers(db.players, { seasonId })
  const excluded = { invalidMatch: 0, missingHistoricalTeam: 0, teamMismatch: 0, missingMap: 0, unknownRole: 0 }
  const logs = []
  for (const row of collected.rows) {
    let context = null
    for (const id of [...new Set([row.matchId, row.rawMatchId].map(key).filter(Boolean))]) {
      if (timeline.canonical.has(id)) { context = timeline.canonical.get(id); break }
      if (timeline.aliases.has(id)) { context = timeline.aliases.get(id); break }
    }
    if (!context?.eligible) { excluded.invalidMatch += 1; continue }
    const teamId = key(row.rawLog?.teamId || row.rawLog?.team_id)
    if (!teamId) { excluded.missingHistoricalTeam += 1; continue }
    if (![context.teamA, context.teamB].includes(teamId)) { excluded.teamMismatch += 1; continue }
    if (!row.mapOrder && !row.mapName) { excluded.missingMap += 1; continue }
    const role = row.resolution.officialRole === 'DAMAGE' ? 'DPS' : row.resolution.officialRole
    if (!['TANK', 'DPS', 'SUPPORT'].includes(role)) { excluded.unknownRole += 1; continue }
    logs.push({
      ...row, teamId, role, minutes: row.playtimeMinutes, date: context.date,
      matchId: context.matchId, entryKey: `${row.playerId}:${role}`,
      mapKey: `${context.matchId}:${row.mapOrder || row.mapName}`,
      rawLog: { ...row.rawLog, matchId: context.matchId, teamId }
    })
  }
  logs.sort((a, b) => a.date.localeCompare(b.date) || a.matchId.localeCompare(b.matchId) || a.entryKey.localeCompare(b.entryKey))
  const matches = (db.matches || []).flatMap(source => {
    const context = timeline.canonical.get(key(source.match_id || source.id || source.raw_match_id))
    return context?.eligible ? [{ ...context, source }] : []
  }).sort((a, b) => a.date.localeCompare(b.date) || a.matchId.localeCompare(b.matchId))
  return { seasonId, logs, matches, excluded, cleaning: collected.cleaning }
}

function makeEntry(logs) {
  const last = logs.at(-1)
  const minutes = logs.reduce((sum, row) => sum + row.minutes, 0)
  const totals = Object.fromEntries(Object.entries(metricNames).map(([metric, source]) => [metric, logs.reduce((sum, row) => sum + row.totals[source], 0)]))
  const per10 = Object.fromEntries(Object.entries(totals).map(([metric, value]) => [metric, minutes > 0 ? value / minutes * 10 : 0]))
  const heroes = [...groupBy(logs, row => row.hero)].map(([hero, rows]) => ({ hero, minutes: rows.reduce((sum, row) => sum + row.minutes, 0) })).sort((a, b) => b.minutes - a.minutes || a.hero.localeCompare(b.hero))
  return {
    entryKey: last.entryKey, player_id: last.playerId, team_id: last.teamId, role: last.role,
    roleTimeMins: minutes, roleMapsPlayed: new Set(logs.map(row => row.mapKey)).size,
    roleMatchesPlayed: new Set(logs.map(row => row.matchId)).size,
    most_played_hero: heroes[0]?.hero, metrics: { total: totals, per10 }
  }
}

function rawScoreForLog(row, baselines) {
  const r = row.resolution
  const heroBaseline = baselines.byHero[r.canonicalHeroName]
  return calculateRawProfileScore({
    per10Stats: Object.fromEntries(['elims', 'assists', 'deaths', 'damage', 'healing', 'blocked'].map(metric => [metric, row.totals[metric] / row.minutes * 10])),
    heroBaseline, profileBaseline: baselines.byScoringProfile[r.scoringProfile],
    subroleBaseline: baselines.bySubrole[r.resolvedSubrole], scoringProfile: r.scoringProfile,
    sampleStatus: heroBaseline?.sampleStatus
  }).rawScore
}

export function forecastAtDate(data, date) {
  const history = data.logs.filter(row => row.date < date)
  const pastMatches = data.matches.filter(match => match.date < date)
  const players = [...groupBy(history, row => row.playerId)].map(([id, logs]) => ({ player_id: id, match_logs: logs.map(row => row.rawLog) }))
  // Reconstruct exclusively from historical logs: current roster assignments,
  // exported season totals and the Swiss-final frozen baseline are unavailable.
  const pastDb = { meta: { season_id: data.seasonId }, players, matches: pastMatches.map(match => match.source) }
  const baselines = buildRatingBaselinesFromDb(pastDb, { seasonId: data.seasonId, useFrozenBaselines: false })
  const historyGroups = groupBy(history, row => row.entryKey)
  const entries = scoreLeaderboardEntries([...historyGroups.values()].map(makeEntry), 30, { db: pastDb, baselines, seasonId: data.seasonId })
  const scoredLogs = history.map(row => ({ ...row, raw: rawScoreForLog(row, baselines) })).filter(row => Number.isFinite(row.raw))
  const scoredGroups = groupBy(scoredLogs, row => row.entryKey)
  const roleMeans = new Map([...groupBy(scoredLogs, row => row.role)].map(([role, rows]) => [role, weightedMean(rows, row => row.raw)]))
  const forecasts = entries.map(entry => {
    const rows = scoredGroups.get(entry.entryKey) || []
    const matches = [...groupBy(rows, row => row.matchId).values()]
    const recent = matches.slice(-VALIDATION_POLICY.recentMatches).flat()
    const last = matches.at(-1) || []
    return {
      ...entry,
      validationPredictions: {
        neutral: 50, roleMean: roleMeans.get(entry.role) ?? 50,
        rawAverage: entry.rawScore, sampleAdjusted: entry.seasonScore,
        lastMatch: weightedMean(last, row => row.raw), recentThree: weightedMean(recent, row => row.raw)
      }
    }
  })
  return {
    date, baselines, forecasts, history,
    training: { beforeExclusive: date, maxLogDate: history.at(-1)?.date ?? null, logs: history.length, normalMatches: pastMatches.length, baselineMode: baselines.baselineMode || 'runtime', frozenBaselineUsed: Boolean(baselines.baselineFrozen) }
  }
}

function buildPriorLineups(forecast) {
  const byEntry = new Map(forecast.forecasts.map(row => [row.entryKey, row]))
  const latestTeams = new Map()
  for (const row of forecast.history) latestTeams.set(row.playerId, row.teamId)
  const teamRoleGroups = groupBy(forecast.history.filter(row => row.teamId === latestTeams.get(row.playerId)), row => `${row.teamId}:${row.role}`)
  const teams = new Map()
  for (const [id, rows] of teamRoleGroups) {
    const split = id.lastIndexOf(':')
    const teamId = id.slice(0, split)
    const role = id.slice(split + 1)
    const required = role === 'TANK' ? 1 : 2
    const candidates = [...groupBy(rows, row => row.entryKey)].map(([entryKey, logs]) => ({ entry: byEntry.get(entryKey), minutes: logs.reduce((sum, row) => sum + row.minutes, 0) }))
      .filter(row => row.entry && getSeasonRatingValue(row.entry) != null)
      .sort((a, b) => b.minutes - a.minutes || a.entry.entryKey.localeCompare(b.entry.entryKey))
    if (!teams.has(teamId)) teams.set(teamId, {})
    teams.get(teamId)[role] = candidates.length >= required ? candidates.slice(0, required).map(row => row.entry) : null
  }
  const lineups = new Map()
  for (const [id, roles] of teams) {
    if (!['TANK', 'DPS', 'SUPPORT'].every(role => roles[role])) continue
    const players = [...roles.TANK, ...roles.DPS, ...roles.SUPPORT]
    // A flex player cannot occupy two positions in the same forecast lineup.
    if (new Set(players.map(row => row.player_id)).size !== 5) continue
    lineups.set(id, {
      players: players.map(row => row.entryKey),
      baseOvr: mean(players.map(row => row.seasonOvrBeforeOpponent)),
      opponentOvr: mean(players.map(row => getSeasonRatingValue(row))),
      rawAverage: mean(players.map(row => row.rawScore))
    })
  }
  return lineups
}

const credit = (difference, result) => difference === 0 ? 0.5 : Number((difference > 0) === (result === 1))

export function evaluateDate(data, forecast) {
  const testLogs = data.logs.filter(row => row.date === forecast.date)
  const byEntry = new Map(forecast.forecasts.map(row => [row.entryKey, row]))
  const excluded = { noFormalHistory: 0, shortTarget: 0, unavailablePrediction: 0, unavailableTarget: 0 }
  const observations = []
  for (const rows of groupBy(testLogs, row => `${row.matchId}:${row.entryKey}`).values()) {
    const first = rows[0]
    const before = byEntry.get(first.entryKey)
    if (!before?.eligible) { excluded.noFormalHistory += 1; continue }
    if (before.scoringEngine !== 'rating_v1' || ![...Object.values(before.validationPredictions), before.seasonOvrBeforeOpponent, before.seasonOvr].every(Number.isFinite)) {
      excluded.unavailablePrediction += 1
      continue
    }
    const minutes = rows.reduce((sum, row) => sum + row.minutes, 0)
    if (minutes < VALIDATION_POLICY.minimumTargetMinutes) { excluded.shortTarget += 1; continue }
    const scored = rows.map(row => ({ ...row, raw: rawScoreForLog(row, forecast.baselines) }))
    if (scored.some(row => !Number.isFinite(row.raw))) { excluded.unavailableTarget += 1; continue }
    observations.push({
      date: forecast.date, matchId: first.matchId, playerId: first.playerId, role: first.role,
      entryKey: first.entryKey, minutes, target: weightedMean(scored, row => row.raw),
      predictions: before.validationPredictions,
      baseOvr: before.seasonOvrBeforeOpponent, opponentOvr: before.seasonOvr,
      priorMatches: before.roleMatchesPlayed, priorMinutes: before.roleTimeMins
    })
  }
  const lineups = buildPriorLineups(forecast)
  const matchPredictions = []
  const matchExclusions = { noPriorLineup: 0, draw: 0 }
  for (const match of data.matches.filter(row => row.date === forecast.date)) {
    if (match.result === 0.5) { matchExclusions.draw += 1; continue }
    const a = lineups.get(match.teamA)
    const b = lineups.get(match.teamB)
    if (!a || !b) { matchExclusions.noPriorLineup += 1; continue }
    const differences = {
      rawAverage: a.rawAverage - b.rawAverage,
      baseOvr: a.baseOvr - b.baseOvr,
      opponentOvr: a.opponentOvr - b.opponentOvr,
      teamElo: match.teamARating - match.teamBRating
    }
    matchPredictions.push({
      date: forecast.date, matchId: match.matchId, result: match.result,
      teamA: match.teamA, teamB: match.teamB, lineupA: a.players, lineupB: b.players,
      differences, credits: Object.fromEntries(Object.entries(differences).map(([name, delta]) => [name, credit(delta, match.result)]))
    })
  }
  return { training: forecast.training, observations, excluded, matchPredictions, matchExclusions }
}

function averageRanks(values) {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value)
  const ranks = Array(values.length)
  for (let start = 0; start < sorted.length;) {
    let end = start + 1
    while (end < sorted.length && sorted[end].value === sorted[start].value) end += 1
    for (let i = start; i < end; i += 1) ranks[sorted[i].index] = (start + end - 1) / 2 + 1
    start = end
  }
  return ranks
}

export function spearman(x, y) {
  if (x.length !== y.length || x.length < 2 || [...x, ...y].some(value => !Number.isFinite(value))) return null
  const a = averageRanks(x)
  const b = averageRanks(y)
  const aMean = mean(a)
  const bMean = mean(b)
  const denominator = Math.sqrt(a.reduce((sum, value) => sum + (value - aMean) ** 2, 0) * b.reduce((sum, value) => sum + (value - bMean) ** 2, 0))
  return denominator > 0 ? a.reduce((sum, value, i) => sum + (value - aMean) * (b[i] - bMean), 0) / denominator : null
}

function quantile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return null
  const index = (sorted.length - 1) * p
  return sorted[Math.floor(index)] + (sorted[Math.ceil(index)] - sorted[Math.floor(index)]) * (index % 1)
}

export function bootstrapByDate(rows, getValue) {
  const groups = [...groupBy(rows, row => row.date).values()].map(group => ({ sum: group.reduce((sum, row) => sum + getValue(row), 0), n: group.length }))
  if (groups.length < 3) return null
  let state = VALIDATION_POLICY.seed
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296 }
  const estimates = []
  for (let i = 0; i < VALIDATION_POLICY.bootstrapReplicates; i += 1) {
    let sum = 0
    let n = 0
    for (let j = 0; j < groups.length; j += 1) {
      const group = groups[Math.floor(random() * groups.length)]
      sum += group.sum
      n += group.n
    }
    estimates.push(sum / n)
  }
  return { low: round(quantile(estimates, 0.025)), high: round(quantile(estimates, 0.975)), clusters: groups.length, method: 'competition-day-cluster-bootstrap', exploratory: true }
}

export function summarizeValidation(folds) {
  const observations = folds.flatMap(fold => fold.observations)
  const matchPredictions = folds.flatMap(fold => fold.matchPredictions)
  const matchErrors = [...groupBy(observations, row => row.matchId)].map(([matchId, rows]) => ({
    matchId, date: rows[0].date,
    mae: Object.fromEntries(Object.keys(rows[0].predictions).map(model => [model, mean(rows.map(row => Math.abs(row.predictions[model] - row.target)))]))
  }))
  const performance = Object.fromEntries(['neutral', 'roleMean', 'rawAverage', 'sampleAdjusted', 'lastMatch', 'recentThree'].map(model => [model, {
    maeByMatch: round(mean(matchErrors.map(row => row.mae[model]))),
    rmseByObservation: observations.length ? round(Math.sqrt(mean(observations.map(row => (row.predictions[model] - row.target) ** 2)))) : null,
    maeDifferenceFromSampleAdjusted: round(mean(matchErrors.map(row => row.mae[model] - row.mae.sampleAdjusted))),
    differenceInterval: bootstrapByDate(matchErrors, row => row.mae[model] - row.mae.sampleAdjusted)
  }]))
  const rankingGroups = [...groupBy(observations, row => `${row.date}:${row.role}`)].flatMap(([id, rows]) => {
    if (rows.length < VALIDATION_POLICY.minimumRankGroup) return []
    const correlations = Object.fromEntries(['baseOvr', 'opponentOvr'].map(model => [model, spearman(rows.map(row => row[model]), rows.map(row => row.target))]))
    if (Object.values(correlations).some(value => value == null)) return []
    return [{ id, n: rows.length, correlations }]
  })
  const rankings = Object.fromEntries(['baseOvr', 'opponentOvr'].map(model => [model, {
    medianWithinDateRoleSpearman: round(quantile(rankingGroups.map(row => row.correlations[model]), 0.5)),
    meanWithinDateRoleSpearman: round(mean(rankingGroups.map(row => row.correlations[model]))),
    groups: rankingGroups.length
  }]))
  const winners = Object.fromEntries(['rawAverage', 'baseOvr', 'opponentOvr', 'teamElo'].map(model => [model, {
    accuracyWithHalfCreditForTies: round(mean(matchPredictions.map(row => row.credits[model]))),
    correct: matchPredictions.filter(row => row.differences[model] !== 0 && row.credits[model] === 1).length,
    tiedPredictions: matchPredictions.filter(row => row.differences[model] === 0).length,
    n: matchPredictions.length,
    differenceFromBaseOvr: round(mean(matchPredictions.map(row => row.credits[model] - row.credits.baseOvr))),
    differenceInterval: bootstrapByDate(matchPredictions, row => row.credits[model] - row.credits.baseOvr)
  }]))
  return {
    sample: { observations: observations.length, playerRoles: new Set(observations.map(row => row.entryKey)).size, performanceMatches: matchErrors.length, performanceDays: new Set(observations.map(row => row.date)).size, outcomeMatches: matchPredictions.length, outcomeDays: new Set(matchPredictions.map(row => row.date)).size },
    performance, rankings, winners, rankingGroups,
    byRole: Object.fromEntries(['TANK', 'DPS', 'SUPPORT'].map(role => {
      const rows = observations.filter(row => row.role === role)
      return [role, { n: rows.length, sampleAdjustedMae: round(mean(rows.map(row => Math.abs(row.predictions.sampleAdjusted - row.target)))), rawAverageMae: round(mean(rows.map(row => Math.abs(row.predictions.rawAverage - row.target)))) }]
    })),
    byDay: folds.map(fold => ({ date: fold.training.beforeExclusive, training: fold.training, observations: fold.observations.length, matches: fold.matchPredictions.length, excluded: fold.excluded, matchExclusions: fold.matchExclusions }))
  }
}

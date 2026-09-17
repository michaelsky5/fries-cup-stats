import { bootstrapByDate } from './seasonRatingValidation.mjs'
import { pairConcordance } from './seasonRatingCalibration.mjs'

export const TEAM_MODEL_POLICY = Object.freeze({
  version: 'team-pooling-and-paired-history-v1',
  teamPriorMatches: 4, teamSensitivityPriors: [1, 4, 8], pairPriorMatches: 3,
  minimumSharedMinutes: 10, epsilon: 1e-9,
  interpretation: 'Past-only team residual pooling and within-team same-role statistical performance; not independent technical skill'
})
const teamModels = ['current', 'roleMean', 'teamK1', 'teamK4', 'teamK8']
const pairModels = ['current', 'ovr', 'teamK4', 'history', 'zero']
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const round = value => Number.isFinite(value) ? Number(value.toFixed(6)) + 0 : null
const groupBy = (rows, key) => {
  const groups = new Map()
  for (const row of rows) {
    const id = key(row)
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(row)
  }
  return groups
}
const weighted = (rows, value) => {
  const minutes = rows.reduce((sum, row) => sum + row.minutes, 0)
  return minutes > 0 ? rows.reduce((sum, row) => sum + value(row) * row.minutes, 0) / minutes : null
}
const same = values => new Set(values).size === 1
const sign = value => Math.abs(value) < TEAM_MODEL_POLICY.epsilon ? 0 : Math.sign(value)
const credit = (prediction, target) => sign(target) === 0 ? null : sign(prediction) === 0 ? 0.5 : Number(sign(prediction) === sign(target))

export function auditPlayerTeamNesting(logs) {
  const players = [...groupBy(logs, row => row.playerId)].map(([playerId, rows]) => ({
    playerId, teams: [...new Set(rows.map(row => row.teamId))].sort()
  }))
  const teams = [...new Set(logs.map(row => row.teamId))].sort()
  return { players: players.length, teams: teams.length, playersWithMultipleTeams: players.filter(row => row.teams.length > 1),
    allPlayersNested: players.length ? players.every(row => row.teams.length === 1) : null,
    unidentifiedTeamPlayerShifts: players.length && players.every(row => row.teams.length === 1) ? teams.length : null,
    explanation: 'For a player intercept plus a team intercept, adding c to a team and subtracting c from all its players leaves fitted sums unchanged when players are nested. Priors or constraints choose an allocation; they do not create cross-team observations.' }
}

export function buildSeriesObservations(rows, validationFolds) {
  const source = new Map(validationFolds.flatMap(fold => fold.observations).map(row => [`${row.matchId}:${row.entryKey}`, row]))
  const observations = [...groupBy(rows, row => row.observationId)].map(([id, group]) => {
    const original = source.get(id)
    if (!original || !same(group.map(row => row.date)) || !same(group.map(row => row.priorTeamId)) ||
      group[0].date !== original.date || Math.abs(group.reduce((sum, row) => sum + row.share, 0) - 1) > 1e-6) throw new Error(`Invalid source observation: ${id}`)
    const target = group.reduce((sum, row) => sum + row.share * row.target, 0)
    if (Math.abs(target - original.target) > 1e-6 || Math.abs(group[0].prediction - original.predictions.sampleAdjusted) > 1e-6) throw new Error(`Source target drift: ${id}`)
    return { id, date: original.date, matchId: original.matchId, playerId: original.playerId, entryKey: original.entryKey,
      role: original.role, teamId: group[0].priorTeamId,
      // Use the pre-day team for prediction. Changed actual teams are flagged, not used as known rosters.
      changedTeam: group.some(row => row.context.teamId !== row.priorTeamId),
      ownRating: group.every(row => row.context.teamId === row.priorTeamId) ? group[0].context.ownRating : null,
      priorMatches: original.priorMatches, target, current: original.predictions.sampleAdjusted,
      roleMean: original.predictions.roleMean, ovr: original.opponentOvr }
  })
  if (observations.length !== source.size) throw new Error('Diagnostic source changed the original cohort')
  if (observations.some(row => !row.teamId || ![row.target, row.current, row.roleMean, row.ovr].every(Number.isFinite))) throw new Error('Invalid series values')
  return observations
}

export function fitTeamPool(observations, beforeExclusive, priorMatches = TEAM_MODEL_POLICY.teamPriorMatches) {
  if (!Number.isFinite(priorMatches) || priorMatches <= 0) throw new Error('Team prior must be positive')
  // A whole team-series is one unit; five players or more maps do not become five matches.
  const history = observations.filter(row => row.date < beforeExclusive && !row.changedTeam)
  const meetings = [...groupBy(history, row => `${row.matchId}:${row.teamId}`).values()].map(group => ({
    date: group[0].date, teamId: group[0].teamId, residual: mean(group.map(row => row.target - row.current))
  }))
  return { beforeExclusive, priorMatches, teams: Object.fromEntries([...groupBy(meetings, row => row.teamId)].map(([teamId, group]) => {
    const n = group.length
    return [teamId, { offset: group.reduce((sum, row) => sum + row.residual, 0) / (n + priorMatches),
      matches: n, reliability: n / (n + priorMatches), meanResidual: mean(group.map(row => row.residual)),
      maxLabelDate: group.map(row => row.date).sort().at(-1) }]
  })) }
}

export function replayTeamPool(observations) {
  const history = []
  const folds = []
  for (const [date, current] of [...groupBy(observations, row => row.date)].sort(([a], [b]) => a.localeCompare(b))) {
    const fitted = Object.fromEntries(TEAM_MODEL_POLICY.teamSensitivityPriors.map(k => [`teamK${k}`, fitTeamPool(history, date, k)]))
    const evaluated = current.map(row => ({ ...row, predictions: { current: row.current, roleMean: row.roleMean,
      ...Object.fromEntries(Object.entries(fitted).map(([model, fit]) => [model, row.current + (fit.teams[row.teamId]?.offset ?? 0)])) },
      teamHistoryMatches: fitted.teamK4.teams[row.teamId]?.matches ?? 0,
      teamOffset: fitted.teamK4.teams[row.teamId]?.offset ?? 0 }))
    folds.push({ date, fitted, observations: evaluated })
    history.push(...current)
  }
  return folds
}

export function buildSameRolePairs(rows, teamFolds) {
  const series = new Map(teamFolds.flatMap(fold => fold.observations).map(row => [row.id, row]))
  const exclusions = { noSameRolePeerMaps: 0, ambiguousRoleMaps: 0, partialOrUnverifiedTime: 0,
    changedTeamMaps: 0, shortSharedSeries: 0 }
  const playerMaps = [...groupBy(rows, row => `${row.mapKey}:${row.entryKey}`).values()].map(group => ({
    ...group[0], minutes: group.reduce((sum, row) => sum + row.minutes, 0), target: weighted(group, row => row.target)
  }))
  const mapPairs = []
  for (const group of groupBy(playerMaps, row => `${row.mapKey}:${row.context.teamId}:${row.role}`).values()) {
    if (group.length < 2) { exclusions.noSameRolePeerMaps += 1; continue }
    if (group.length !== 2 || !['DPS', 'SUPPORT'].includes(group[0].role)) { exclusions.ambiguousRoleMaps += 1; continue }
    const [a, b] = [...group].sort((x, y) => x.entryKey.localeCompare(y.entryKey))
    const oa = series.get(a.observationId)
    const ob = series.get(b.observationId)
    if (!oa || !ob) throw new Error('Pair missing source forecasts')
    if (oa.changedTeam || ob.changedTeam || oa.teamId !== ob.teamId) { exclusions.changedTeamMaps += 1; continue }
    if (group.some(row => row.context.mapStatus !== 'matched' || !(row.context.duration > 0) || Math.abs(row.minutes - row.context.duration) > 1 / 60) || Math.abs(a.minutes - b.minutes) > 1 / 60) {
      exclusions.partialOrUnverifiedTime += 1
      continue
    }
    mapPairs.push({ date: a.date, matchId: a.matchId, mapKey: a.mapKey, teamId: oa.teamId, role: a.role,
      pairId: `${oa.teamId}:${a.entryKey}|${b.entryKey}`, a: a.entryKey, b: b.entryKey,
      minutes: Math.min(a.minutes, b.minutes), target: a.target - b.target,
      current: oa.current - ob.current, ovr: oa.ovr - ob.ovr,
      teamK4: oa.predictions.teamK4 - ob.predictions.teamK4 })
  }
  const pairs = [...groupBy(mapPairs, row => `${row.matchId}:${row.pairId}`).values()].flatMap(group => {
    const minutes = group.reduce((sum, row) => sum + row.minutes, 0)
    if (minutes < TEAM_MODEL_POLICY.minimumSharedMinutes) { exclusions.shortSharedSeries += 1; return [] }
    return [{ ...group[0], minutes, maps: group.length, mapKeys: group.map(row => row.mapKey),
      target: weighted(group, row => row.target) }]
  })
  return { pairs, exclusions, mapPairs: mapPairs.length }
}

export function fitPairHistory(pairs, beforeExclusive) {
  const history = pairs.filter(row => row.date < beforeExclusive)
  return { beforeExclusive, pairs: Object.fromEntries([...groupBy(history, row => row.pairId)].map(([pairId, group]) => [pairId, {
    difference: group.reduce((sum, row) => sum + row.target, 0) / (group.length + TEAM_MODEL_POLICY.pairPriorMatches),
    matches: group.length, reliability: group.length / (group.length + TEAM_MODEL_POLICY.pairPriorMatches),
    maxLabelDate: group.map(row => row.date).sort().at(-1)
  }])) }
}

export function replayPairHistory(pairs) {
  const history = []
  const folds = []
  for (const [date, current] of [...groupBy(pairs, row => row.date)].sort(([a], [b]) => a.localeCompare(b))) {
    const fitted = fitPairHistory(history, date)
    const evaluated = current.map(row => {
      const prior = fitted.pairs[row.pairId]
      const predictions = { current: row.current, ovr: row.ovr, teamK4: row.teamK4, history: prior?.difference ?? row.current, zero: 0 }
      return { ...row, priorPairMatches: prior?.matches ?? 0, predictions,
        credits: Object.fromEntries(pairModels.map(model => [model, credit(predictions[model], row.target)])) }
    })
    folds.push({ date, fitted, pairs: evaluated })
    history.push(...current)
  }
  return folds
}

function pairSummary(rows) {
  const decided = rows.filter(row => sign(row.target) !== 0)
  return { pairs: rows.length, distinctPairs: new Set(rows.map(row => row.pairId)).size,
    teams: new Set(rows.map(row => row.teamId)).size,
    matches: new Set(rows.map(row => row.matchId)).size, days: new Set(rows.map(row => row.date)).size,
    equalTargets: rows.length - decided.length,
    performance: Object.fromEntries(pairModels.map(model => [model, {
      accuracy: round(mean(decided.map(row => row.credits[model]))),
      equalPairAccuracy: round(mean([...groupBy(decided, row => row.pairId).values()].map(group => mean(group.map(row => row.credits[model]))))),
      accuracyIntervalByDate: bootstrapByDate(decided, row => row.credits[model]),
      accuracyIntervalByTeam: (() => {
        const result = bootstrapByDate(decided.map(row => ({ ...row, date: row.teamId })), row => row.credits[model])
        return result ? { ...result, method: 'team-cluster-bootstrap' } : null
      })(),
      correct: decided.filter(row => row.credits[model] === 1).length,
      ties: decided.filter(row => row.credits[model] === 0.5).length,
      gapMae: model === 'ovr' ? null : round(mean(rows.map(row => Math.abs(row.predictions[model] - row.target)))),
      accuracyDifferenceFromCurrent: round(mean(decided.map(row => row.credits[model] - row.credits.current))),
      differenceInterval: bootstrapByDate(decided, row => row.credits[model] - row.credits.current)
    }])) }
}

export function summarizeTeamAnalysis(teamFolds, pairFolds) {
  const observations = teamFolds.flatMap(fold => fold.observations)
  const pairs = pairFolds.flatMap(fold => fold.pairs)
  const matchErrors = [...groupBy(observations, row => row.matchId).values()].map(group => ({ date: group[0].date,
    mae: Object.fromEntries(teamModels.map(model => [model, mean(group.map(row => Math.abs(row.predictions[model] - row.target)))])) }))
  const rankingGroups = [...groupBy(observations, row => `${row.date}:${row.role}`)].flatMap(([id, group]) => {
    const players = [...groupBy(group, row => row.entryKey).values()].map(games => ({
      target: mean(games.map(row => row.target)), predictions: Object.fromEntries(teamModels.map(model => [model, mean(games.map(row => row.predictions[model]))])) }))
    if (players.length < 6) return []
    return [{ id, date: group[0].date, credits: Object.fromEntries(teamModels.map(model => [model, pairConcordance(players.map(row => row.predictions[model]), players.map(row => row.target)).credit])) }]
  })
  const performance = Object.fromEntries(teamModels.map(model => [model, {
    maeByMatch: round(mean(matchErrors.map(row => row.mae[model]))),
    differenceFromCurrent: round(mean(matchErrors.map(row => row.mae[model] - row.mae.current))),
    differenceInterval: bootstrapByDate(matchErrors, row => row.mae[model] - row.mae.current),
    acrossTeamRolePairAccuracy: round(mean(rankingGroups.map(group => group.credits[model]).filter(value => value != null)))
  }]))
  const weakTeamLeaders = new Set()
  for (const group of groupBy(observations, row => `${row.matchId}:${row.teamId}:${row.role}`).values()) {
    if (group.length < 2 || group.some(row => row.ownRating == null || row.ownRating >= 1500 || row.changedTeam)) continue
    for (const row of group) if (row.current > Math.max(...group.filter(other => other.id !== row.id).map(other => other.current))) weakTeamLeaders.add(row.id)
  }
  const weakLeaders = observations.filter(row => weakTeamLeaders.has(row.id))
  const active = observations.filter(row => row.teamHistoryMatches > 0)
  const lowHistory = observations.filter(row => row.teamHistoryMatches === 1)
  const summariesByHistory = [0, 1, 2, 3, 4].map(n => ({
    history: n === 4 ? '4-plus' : String(n), ...pairSummary(pairs.filter(row => n === 4 ? row.priorPairMatches >= n : row.priorPairMatches === n))
  }))
  return { sample: { observations: observations.length, matches: matchErrors.length, days: new Set(observations.map(row => row.date)).size,
    activeObservations: active.length, changedTeamObservations: observations.filter(row => row.changedTeam).length },
    team: { performance, sameTeamPairDifferencesChanged: pairs.filter(row => Math.abs(row.predictions.teamK4 - row.predictions.current) > 1e-8).length,
      activeMeanAbsoluteOffset: round(mean(active.map(row => Math.abs(row.teamOffset)))),
      maxAbsoluteOffset: active.length ? round(Math.max(...active.map(row => Math.abs(row.teamOffset)))) : null,
      onePriorMatch: { observations: lowHistory.length, maxAbsoluteOffset: lowHistory.length ? round(Math.max(...lowHistory.map(row => Math.abs(row.teamOffset)))) : null },
      lowerEloPriorRoleLeaders: { observations: weakLeaders.length, meanOffset: round(mean(weakLeaders.map(row => row.teamOffset))), negativeOffsets: weakLeaders.filter(row => row.teamOffset < 0).length,
        note: 'Selected by pre-day Elo below 1500 and highest prior sample score among evaluated same-team same-role peers. This is not an independent high-skill label.' } },
    pair: { all: pairSummary(pairs), repeated: pairSummary(pairs.filter(row => row.priorPairMatches > 0)),
      byRole: Object.fromEntries(['TANK', 'DPS', 'SUPPORT'].map(role => [role, pairSummary(pairs.filter(row => row.role === role))])),
      repeatedByRole: Object.fromEntries(['TANK', 'DPS', 'SUPPORT'].map(role => [role, pairSummary(pairs.filter(row => row.role === role && row.priorPairMatches > 0))])),
      byHistory: summariesByHistory }, observations, pairs }
}

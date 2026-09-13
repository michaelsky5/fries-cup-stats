import { getOwMapMode } from '../../src/lib/heroes.js'
import { calculateRawProfileScore } from '../../src/lib/ratingModel.js'
import { forecastAtDate, bootstrapByDate } from './seasonRatingValidation.mjs'
import { pairConcordance } from './seasonRatingCalibration.mjs'

export const DIAGNOSTIC_POLICY = Object.freeze({
  version: 'context-residual-audit-v1', minimumObservations: 20, minimumMatches: 8,
  minimumDays: 4, minimumPlayers: 5, minimumPeers: 2,
  opponentBandHalfWidth: 25, matchupBandHalfWidth: 50, durationCuts: [8, 12],
  repeatMinimumAbsoluteBias: 2,
  facets: ['hero', 'mode', 'team', 'opponent', 'matchup', 'duration'],
  target: 'Raw map-record performance relative to the pre-day sample-adjusted season score',
  weighting: 'Minutes within player-role series, then equal players within series, then equal series',
  interpretation: 'Conditional residual diagnostics; actual hero, mode, duration and lineup are not pre-match forecasts'
})
const roles = ['TANK', 'DPS', 'SUPPORT']
const facets = DIAGNOSTIC_POLICY.facets
const models = ['current', 'roleMean', 'roleBias', ...facets]
const key = value => String(value ?? '').trim().toLowerCase()
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const round = value => Number.isFinite(value) ? Number(value.toFixed(6)) : null
const groupBy = (rows, getKey) => {
  const groups = new Map()
  for (const row of rows) {
    const id = getKey(row)
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(row)
  }
  return groups
}
const weightedMean = (rows, getValue, getWeight = row => row.weight) => {
  const total = rows.reduce((sum, row) => sum + getWeight(row), 0)
  return total > 0 ? rows.reduce((sum, row) => sum + getValue(row) * getWeight(row), 0) / total : null
}
const support = rows => ({ observations: new Set(rows.map(row => row.observationId)).size,
  maps: new Set(rows.map(row => row.mapKey)).size, matches: new Set(rows.map(row => row.matchId)).size,
  days: new Set(rows.map(row => row.date)).size, players: new Set(rows.map(row => row.playerId)).size,
  maxLabelDate: rows.length ? rows.map(row => row.date).sort().at(-1) : null })
const enough = count => count.observations >= DIAGNOSTIC_POLICY.minimumObservations &&
  count.matches >= DIAGNOSTIC_POLICY.minimumMatches && count.days >= DIAGNOSTIC_POLICY.minimumDays &&
  count.players >= DIAGNOSTIC_POLICY.minimumPlayers

function mapMinutes(map) {
  const text = String(map?.match_time || map?.time || '').trim()
  if (!/^\d+:\d{2}(?::\d{2})?$/.test(text)) return null
  const parts = text.split(':').map(Number)
  if (parts.slice(1).some(value => value >= 60)) return null
  const minutes = parts.reduce((sum, value) => sum * 60 + value, 0) / 60
  return minutes > 0 ? minutes : null
}

export function contextForLog(row, match) {
  const maps = match?.source?.maps || []
  const candidates = row.mapOrder ? maps.filter(map => String(map.map_order) === String(row.mapOrder)) : maps.filter(map => key(map.map_name) === key(row.mapName))
  const map = candidates.length === 1 ? candidates[0] : null
  const logMode = getOwMapMode(row.rawLog?.mapType || row.rawLog?.map_type)
  const officialMode = getOwMapMode(map?.map_type)
  const modeConflict = Boolean(logMode && officialMode && logMode !== officialMode)
  const nameConflict = Boolean(map && row.mapName && key(map.map_name) !== key(row.mapName))
  const mapStatus = !map ? candidates.length > 1 ? 'ambiguous' : 'unmatched' : map.is_administrative || map.rating_eligible === false ? 'administrative' : modeConflict || nameConflict ? 'conflict' : 'matched'
  const mode = mapStatus === 'matched' ? officialMode || logMode : ''
  const isA = row.teamId === match?.teamA
  const validTeam = Boolean(match?.eligible && [match.teamA, match.teamB].includes(row.teamId))
  const ownRating = validTeam ? isA ? match.teamARating : match.teamBRating : null
  const opponentRating = validTeam ? isA ? match.teamBRating : match.teamARating : null
  const ownPriorMatches = validTeam ? isA ? match.teamAPriorMatches : match.teamBPriorMatches : 0
  const opponentPriorMatches = validTeam ? isA ? match.teamBPriorMatches : match.teamAPriorMatches : 0
  const gap = ownRating == null || opponentRating == null ? null : ownRating - opponentRating
  const duration = mapStatus === 'matched' ? mapMinutes(map) : null
  const hero = row.resolution?.known ? row.resolution.canonicalHeroName : ''
  const opponentBand = opponentPriorMatches >= 3 ? opponentRating < 1475 ? 'below-1475' : opponentRating > 1525 ? 'above-1525' : '1475-to-1525' : null
  const matchupBand = ownPriorMatches >= 3 && opponentPriorMatches >= 3 ? gap < -50 ? 'below-minus-50' : gap > 50 ? 'above-50' : 'minus-50-to-50' : null
  const durationBand = duration == null ? null : duration < 8 ? 'under-8m' : duration < 12 ? '8-to-12m' : '12m-plus'
  const winner = key(map?.winner)
  const mapResult = mapStatus !== 'matched' || !validTeam || ![match.teamA, match.teamB].includes(winner) ? null : winner === row.teamId ? 'win' : 'loss'
  return { hero, mode, mapStatus, duration, ownRating, opponentRating, ownPriorMatches, opponentPriorMatches, gap,
    teamId: validTeam ? row.teamId : null, opponentId: validTeam ? isA ? match.teamB : match.teamA : null, mapResult,
    explicitRowTime: Boolean(String(row.rawLog?.rowTime || '').trim()),
    minutesEqualMapDuration: duration != null && Math.abs(row.minutes - duration) < 1 / 60,
    dimensions: { hero: hero ? `${row.role}:${hero}` : null, mode: mode ? `${row.role}:${mode}` : null,
      team: validTeam ? row.teamId : null, opponent: opponentBand ? `${row.role}:${opponentBand}` : null,
      matchup: matchupBand ? `${row.role}:${matchupBand}` : null, duration: durationBand ? `${row.role}:${durationBand}` : null }
  }
}

export function auditContextCoverage(data) {
  const matches = new Map(data.matches.map(match => [match.matchId, match]))
  const rows = data.logs.map(row => ({ ...row, context: contextForLog(row, matches.get(row.matchId)) }))
  const field = condition => ({ rows: rows.filter(condition).length,
    minutes: round(rows.filter(condition).reduce((sum, row) => sum + row.minutes, 0)) })
  const playerMaps = [...groupBy(rows, row => `${row.mapKey}:${row.entryKey}`).values()]
  return { normalLogs: rows.length, minutes: round(rows.reduce((sum, row) => sum + row.minutes, 0)),
    knownHero: field(row => row.context.hero), knownMode: field(row => row.context.mode), historicalTeam: field(row => row.context.teamId),
    opponentHistory: field(row => row.context.opponentPriorMatches >= 3), matchupHistory: field(row => row.context.opponentPriorMatches >= 3 && row.context.ownPriorMatches >= 3),
    mapDuration: field(row => row.context.duration != null), explicitRowTime: field(row => row.context.explicitRowTime),
    minutesEqualMapDuration: field(row => row.context.minutesEqualMapDuration),
    mapStatus: Object.fromEntries([...groupBy(rows, row => row.context.mapStatus)].map(([status, group]) => [status, group.length])),
    playerMapRecords: playerMaps.length, multipleHeroRecordsOnSamePlayerMap: playerMaps.filter(group => new Set(group.map(row => row.hero)).size > 1).length }
}

function rawScore(row, baselines) {
  const resolution = row.resolution
  const heroBaseline = baselines.byHero[resolution.canonicalHeroName]
  return calculateRawProfileScore({
    per10Stats: Object.fromEntries(['elims', 'assists', 'deaths', 'damage', 'healing', 'blocked'].map(metric => [metric, row.totals[metric] / row.minutes * 10])),
    heroBaseline, profileBaseline: baselines.byScoringProfile[resolution.scoringProfile],
    subroleBaseline: baselines.bySubrole[resolution.resolvedSubrole], scoringProfile: resolution.scoringProfile,
    sampleStatus: heroBaseline?.sampleStatus
  }).rawScore
}

export function buildDiagnosticRows(data, validationFolds) {
  const logs = groupBy(data.logs, row => `${row.matchId}:${row.entryKey}`)
  const matches = new Map(data.matches.map(match => [match.matchId, match]))
  const output = []
  let reconciledObservations = 0
  let maxReconciliationError = 0
  const seen = new Set()
  for (const fold of validationFolds) {
    const date = fold.training.beforeExclusive
    if (fold.training.frozenBaselineUsed !== false || fold.training.baselineMode !== 'runtime' || (fold.training.maxLogDate && fold.training.maxLogDate >= date)) throw new Error(`Unsafe source baseline: ${date}`)
    if (!fold.observations.length) continue
    const forecast = forecastAtDate(data, date)
    const entries = new Map(forecast.forecasts.map(row => [row.entryKey, row]))
    const matchCounts = new Map([...groupBy(fold.observations, row => row.matchId)].map(([id, rows]) => [id, rows.length]))
    for (const observation of fold.observations) {
      const observationId = `${observation.matchId}:${observation.entryKey}`
      if (seen.has(observationId)) throw new Error(`Duplicate observation: ${observationId}`)
      seen.add(observationId)
      const source = logs.get(observationId) || []
      if (!source.length || source.some(row => row.date !== date) || observation.date !== date) throw new Error(`Unmatched observation date: ${observationId}`)
      const entry = entries.get(observation.entryKey)
      if (!entry?.eligible || Math.abs(entry.seasonScore - observation.predictions.sampleAdjusted) > 1e-6) throw new Error(`Source forecast drift: ${observationId}`)
      const minutes = source.reduce((sum, row) => sum + row.minutes, 0)
      if (Math.abs(minutes - observation.minutes) > 1e-6) throw new Error(`Source minute drift: ${observationId}`)
      const rows = source.map(row => {
        const target = rawScore(row, forecast.baselines)
        if (!Number.isFinite(target)) throw new Error(`Invalid raw score: ${row.rowId}`)
        return { id: row.rowId, observationId, date, matchId: row.matchId, mapKey: row.mapKey,
          playerId: row.playerId, entryKey: row.entryKey, role: row.role, minutes: row.minutes,
          share: row.minutes / minutes, weight: row.minutes / minutes / matchCounts.get(row.matchId),
          prediction: observation.predictions.sampleAdjusted, roleMeanPrediction: observation.predictions.roleMean,
          target, seriesTarget: observation.target, residual: target - observation.predictions.sampleAdjusted,
          priorTeamId: key(entry.team_id), context: contextForLog(row, matches.get(row.matchId)) }
      })
      const error = Math.abs(rows.reduce((sum, row) => sum + row.target * row.share, 0) - observation.target)
      maxReconciliationError = Math.max(maxReconciliationError, error)
      if (error > 1e-6) throw new Error(`Map targets fail series reconciliation: ${observationId}`)
      output.push(...rows)
      reconciledObservations += 1
    }
  }
  return { rows: output, reconciliation: { observations: reconciledObservations, maxError: maxReconciliationError } }
}

export function attachPeerResiduals(rows) {
  const output = rows.map(row => ({ ...row, peerResidual: null, peers: 0 }))
  for (const group of groupBy(output.filter(row => row.context.teamId), row => `${row.mapKey}:${row.context.teamId}`).values()) {
    const players = [...groupBy(group, row => row.entryKey)].map(([entryKey, logs]) => ({ entryKey,
      residual: weightedMean(logs, row => row.residual, row => row.minutes) }))
    for (const row of group) {
      const peers = players.filter(player => player.entryKey !== row.entryKey)
      row.peers = peers.length
      if (peers.length >= DIAGNOSTIC_POLICY.minimumPeers) row.peerResidual = mean(peers.map(player => player.residual))
    }
  }
  return output
}

export function fitContextBiases(rows, beforeExclusive) {
  const history = rows.filter(row => row.date < beforeExclusive)
  const roleBias = Object.fromEntries(roles.map(role => {
    const selected = history.filter(row => row.role === role)
    const count = support(selected)
    return [role, { value: enough(count) ? weightedMean(selected, row => row.residual) : 0, active: enough(count), support: count }]
  }))
  const effects = Object.fromEntries(facets.map(facet => [facet, Object.fromEntries(
    [...groupBy(history.filter(row => row.context.dimensions[facet]), row => row.context.dimensions[facet])].flatMap(([id, selected]) => {
      const count = support(selected)
      return enough(count) ? [[id, { value: weightedMean(selected, row => row.residual - roleBias[row.role].value), support: count }]] : []
    })
  )]))
  return { beforeExclusive, roleBias, effects }
}

export function replayContextBiases(rows) {
  const history = []
  const folds = []
  for (const [date, current] of [...groupBy(rows, row => row.date)].sort(([a], [b]) => a.localeCompare(b))) {
    const fitted = fitContextBiases(history, date)
    const evaluated = current.map(row => {
      const roleBias = row.prediction + fitted.roleBias[row.role].value
      return { ...row, predictions: { current: row.prediction, roleMean: row.roleMeanPrediction, roleBias,
        ...Object.fromEntries(facets.map(facet => [facet, roleBias + (fitted.effects[facet][row.context.dimensions[facet]]?.value ?? 0)])) },
      activated: Object.fromEntries(facets.map(facet => [facet, Boolean(fitted.effects[facet][row.context.dimensions[facet]])])) }
    })
    folds.push({ date, fitted, rows: evaluated })
    history.push(...current)
  }
  return folds
}

function weightedCorrelation(rows) {
  const x = weightedMean(rows, row => row.residual)
  const y = weightedMean(rows, row => row.peerResidual)
  const covariance = weightedMean(rows, row => (row.residual - x) * (row.peerResidual - y))
  const vx = weightedMean(rows, row => (row.residual - x) ** 2)
  const vy = weightedMean(rows, row => (row.peerResidual - y) ** 2)
  return vx > 0 && vy > 0 ? covariance / Math.sqrt(vx * vy) : null
}

function describeGroup(rows) {
  const count = support(rows)
  const dates = [...new Set(rows.map(row => row.date))].sort()
  const cut = dates[Math.ceil(dates.length / 2)]
  const halves = [rows.filter(row => !cut || row.date < cut), rows.filter(row => cut && row.date >= cut)].map(half => ({
    support: support(half), bias: weightedMean(half, row => row.residual) }))
  const repeatDirection = enough(count) && halves.every(half => half.support.observations >= 10 && half.support.matches >= 3 && half.support.days >= 2 && Math.abs(half.bias) >= DIAGNOSTIC_POLICY.repeatMinimumAbsoluteBias) && Math.sign(halves[0].bias) === Math.sign(halves[1].bias)
  const peers = rows.filter(row => row.peerResidual != null)
  return { support: count, sufficient: enough(count), bias: round(weightedMean(rows, row => row.residual)),
    mapRecordMae: round(weightedMean(rows, row => Math.abs(row.residual))),
    peerAdjustedBias: round(weightedMean(peers, row => row.residual - row.peerResidual)), peerObservations: support(peers).observations,
    halves: halves.map(half => ({ ...half, bias: round(half.bias) })), repeatDirection }
}

export function summarizeDiagnostics(rows, folds) {
  const peerRows = rows.filter(row => row.peerResidual != null)
  const conditionalRows = folds.flatMap(fold => fold.rows)
  const observations = [...groupBy(conditionalRows, row => row.observationId).values()].map(group => ({
    observationId: group[0].observationId, entryKey: group[0].entryKey, date: group[0].date, matchId: group[0].matchId,
    role: group[0].role, target: group[0].seriesTarget,
    predictions: Object.fromEntries(models.map(model => [model, group.reduce((sum, row) => sum + row.predictions[model] * row.share, 0)]))
  }))
  const matchErrors = [...groupBy(observations, row => row.matchId).values()].map(group => ({ date: group[0].date,
    mae: Object.fromEntries(models.map(model => [model, mean(group.map(row => Math.abs(row.predictions[model] - row.target)))])) }))
  const rankingGroups = [...groupBy(observations, row => `${row.date}:${row.role}`)].flatMap(([id, group]) => {
    const players = [...groupBy(group, row => row.entryKey).values()].map(series => ({
      target: mean(series.map(row => row.target)), predictions: Object.fromEntries(models.map(model => [model, mean(series.map(row => row.predictions[model]))])) }))
    if (players.length < 6) return []
    return [{ id, date: group[0].date, players: players.length, credits: Object.fromEntries(models.map(model => [model, pairConcordance(players.map(row => row.predictions[model]), players.map(row => row.target)).credit])) }]
  })
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0)
  const performance = Object.fromEntries(models.map(model => [model, {
    maeByMatch: round(mean(matchErrors.map(row => row.mae[model]))),
    differenceFromCurrent: round(mean(matchErrors.map(row => row.mae[model] - row.mae.current))),
    differenceFromRoleBias: round(mean(matchErrors.map(row => row.mae[model] - row.mae.roleBias))),
    differenceInterval: bootstrapByDate(matchErrors, row => row.mae[model] - row.mae.roleBias),
    meanPairConcordance: round(mean(rankingGroups.map(group => group.credits[model]).filter(value => value != null))),
    rankingDifferenceInterval: bootstrapByDate(rankingGroups.filter(group => group.credits[model] != null && group.credits.roleBias != null), group => group.credits[model] - group.credits.roleBias),
    activatedWeightShare: facets.includes(model) && totalWeight > 0 ? round(conditionalRows.filter(row => row.activated[model]).reduce((sum, row) => sum + row.weight, 0) / totalWeight) : null
  }]))
  return { sample: { ...support(rows), mapRecords: rows.length, rankingGroups: rankingGroups.length },
    peerContext: { mapRecords: peerRows.length, playerMaps: new Set(peerRows.map(row => `${row.mapKey}:${row.entryKey}`)).size,
      ...support(peerRows), correlation: round(weightedCorrelation(peerRows)),
      sameSignWeightShare: round(weightedMean(peerRows, row => Number(Math.sign(row.residual) === Math.sign(row.peerResidual)))) },
    teamChanges: new Set(rows.filter(row => row.priorTeamId !== row.context.teamId).map(row => row.observationId)).size,
    groups: Object.fromEntries(facets.map(facet => [facet, [...groupBy(rows.filter(row => row.context.dimensions[facet]), row => row.context.dimensions[facet])]
      .sort(([a], [b]) => a.localeCompare(b)).map(([id, group]) => ({ id, ...describeGroup(group) }))])),
    outcomeDiagnostics: [...groupBy(rows.filter(row => row.context.mapResult), row => row.context.mapResult)].map(([id, group]) => ({ id, ...describeGroup(group) })),
    performance, rankingGroups, observations }
}

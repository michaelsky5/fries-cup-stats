import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareValidationData, forecastAtDate, evaluateDate, summarizeValidation, spearman, bootstrapByDate } from './lib/seasonRatingValidation.mjs'
import { calculateMatchPlayerScoreV1 } from '../src/lib/scoringEngineAdapter.js'

function fixture() {
  const positions = [['TANK', 'Reinhardt'], ['DPS', 'Tracer'], ['DPS', 'Genji'], ['SUPPORT', 'Ana'], ['SUPPORT', 'Lucio']]
  const players = ['A', 'B', 'C', 'D'].flatMap(team => positions.map(([role], index) => ({ player_id: `${team}-${index}`, team_id: team, role, match_logs: [] })))
  const matches = []
  for (let day = 1; day <= 5; day += 1) {
    for (const [a, b] of [['A', 'B'], ['C', 'D']]) {
      const id = `D${day}-${a}${b}`
      matches.push({ match_id: id, scheduled_at: `2026-07-0${day}T12:00:00Z`, status: 'COMPLETE', result_mode: 'NORMAL', team_a: { id: a, name: a, score: 2 }, team_b: { id: b, name: b, score: 0 }, winner: a })
      for (const player of players.filter(row => [a, b].includes(row.team_id))) {
        const index = Number(player.player_id.at(-1))
        const [role, hero] = positions[index]
        for (const mapOrder of [1, 2]) {
          const strength = (player.team_id === a ? 1.3 : 0.8) + index * 0.02 + day * 0.01
          player.match_logs.push({ matchId: id, teamId: player.team_id, role, hero, mapOrder, playtimeMinutes: 10,
            totals: { elims: 12 * strength, assists: 8 * strength, deaths: 5 / strength, damage: 6500 * strength, healing: role === 'SUPPORT' ? 9000 * strength : 0, blocked: role === 'TANK' ? 8000 * strength : 0 } })
        }
      }
    }
  }
  return { meta: { season_id: 'FCR26', ranking_min_time_mins: 30 }, players, matches }
}

test('each date uses only earlier normal logs and explicitly disables the season-final baseline', () => {
  const forecast = forecastAtDate(prepareValidationData(fixture()), '2026-07-04')
  assert.equal(forecast.training.maxLogDate, '2026-07-03')
  assert.equal(forecast.training.logs, 120)
  assert.equal(forecast.training.normalMatches, 6)
  assert.equal(forecast.training.frozenBaselineUsed, false)
  assert.equal(forecast.baselines.freezeId, undefined)
  assert.ok(forecast.forecasts.every(row => row.eligible && row.roleMatchesPlayed === 3 && row.roleMapsPlayed === 6 && row.roleTimeMins === 60))
})

test('future metrics, final ranks and current roster metadata cannot change an earlier forecast', () => {
  const db = fixture()
  const before = forecastAtDate(prepareValidationData(db), '2026-07-04')
  const changed = structuredClone(db)
  for (const player of changed.players) {
    player.team_id = 'FUTURE-TEAM'
    player.rank = 1
    player.raw_time_mins = 1e6
    player.role_breakdown = { DPS: { raw_time_mins: 1e6, total_dmg: 1e12 } }
    for (const row of player.match_logs.filter(log => /^D[45]/.test(log.matchId))) {
      for (const field of Object.keys(row.totals)) row.totals[field] *= 100
    }
  }
  changed.matches.forEach(match => { match.team_a.current_rank = 1; match.team_b.swiss_rank = 99 })
  const after = forecastAtDate(prepareValidationData(changed), '2026-07-04')
  assert.deepEqual(after.forecasts, before.forecasts)
  assert.deepEqual(after.baselines, before.baselines)
  const originalTargets = evaluateDate(prepareValidationData(db), before).observations.map(row => row.target)
  const changedTargets = evaluateDate(prepareValidationData(changed), after).observations.map(row => row.target)
  assert.notDeepEqual(changedTargets, originalTargets)
})

test('whole same-day series stay together and hero segments form one player-role target', () => {
  const db = fixture()
  const targetPlayer = db.players[1]
  const targetLog = targetPlayer.match_logs.find(row => row.matchId === 'D4-AB' && row.mapOrder === 1)
  const second = structuredClone(targetLog)
  targetLog.playtimeMinutes = 6
  second.playtimeMinutes = 4
  second.hero = 'Genji'
  for (const field of Object.keys(second.totals)) { targetLog.totals[field] *= 0.6; second.totals[field] *= 0.4 }
  targetPlayer.match_logs.push(second)
  const data = prepareValidationData(db)
  const forecast = forecastAtDate(data, '2026-07-04')
  const evaluated = evaluateDate(data, forecast)
  const records = evaluated.observations.filter(row => row.entryKey === 'A-1:DPS' && row.matchId === 'D4-AB')
  assert.equal(records.length, 1)
  assert.equal(records[0].minutes, 20)
  assert.ok(forecast.history.every(row => !row.matchId.startsWith('D4')))
  assert.equal(evaluated.observations.length, 20)
})

test('winner forecasts use historical lineups even when held-out player records are absent', () => {
  const db = fixture()
  const data = prepareValidationData(db)
  const forecast = forecastAtDate(data, '2026-07-04')
  const original = evaluateDate(data, forecast)
  const noFutureStats = structuredClone(db)
  noFutureStats.players.forEach(player => { player.match_logs = player.match_logs.filter(row => !/^D[45]/.test(row.matchId)) })
  const changedData = prepareValidationData(noFutureStats)
  const changed = evaluateDate(changedData, forecastAtDate(changedData, '2026-07-04'))
  assert.deepEqual(changed.matchPredictions, original.matchPredictions)
  assert.equal(changed.observations.length, 0)
  assert.equal(changed.matchPredictions.length, 2)
  assert.ok(changed.matchPredictions.every(row => new Set(row.lineupA.map(id => id.split(':')[0])).size === 5))
})

test('held-out targets agree with the application scoring adapter using the historical baseline', () => {
  const data = prepareValidationData(fixture())
  const forecast = forecastAtDate(data, '2026-07-04')
  const evaluated = evaluateDate(data, forecast)
  const targetBaselines = { ...forecast.baselines, logs: data.logs.filter(row => row.date === '2026-07-04') }
  for (const observation of evaluated.observations) {
    const entry = forecast.forecasts.find(row => row.entryKey === observation.entryKey)
    const central = calculateMatchPlayerScoreV1({ entry, baselines: targetBaselines, currentMatchIds: [observation.matchId] })
    assert.ok(Math.abs(central.rawScore - observation.target) < 0.001, observation.entryKey)
    assert.equal(central.sourceScope, 'current_match_hero_logs')
  }
})

test('administrative results and missing historical team IDs are excluded with counts', () => {
  const db = fixture()
  db.matches[0].result_mode = 'FORFEIT'
  delete db.players[0].match_logs.find(row => row.matchId === 'D2-AB').teamId
  const data = prepareValidationData(db)
  assert.equal(data.excluded.invalidMatch, 20)
  assert.equal(data.excluded.missingHistoricalTeam, 1)
  assert.equal(data.matches.length, 9)
  assert.equal(data.logs.length, 179)
})

test('ranking correlation handles ties and undefined or constant samples honestly', () => {
  assert.equal(spearman([1, 2, 3], [3, 2, 1]), -1)
  assert.equal(spearman([1, 1, 2, 3], [1, 1, 2, 3]), 1)
  assert.equal(spearman([1, 1, 1], [1, 2, 3]), null)
  assert.equal(spearman([1, NaN], [1, 2]), null)
  assert.equal(spearman([], []), null)
})

test('date bootstrap is reproducible and keeps common-date observations grouped', () => {
  const rows = [{ date: 'A', delta: -2 }, { date: 'A', delta: 2 }, { date: 'B', delta: 0 }, { date: 'C', delta: 0 }]
  const interval = bootstrapByDate(rows, row => row.delta)
  assert.equal(interval.low, 0)
  assert.equal(interval.high, 0)
  assert.deepEqual(bootstrapByDate(rows, row => row.delta), interval)
  assert.equal(bootstrapByDate(rows.slice(0, 2), row => row.delta), null)
})

test('empty validation stays unavailable rather than reporting zero error or perfect accuracy', () => {
  const summary = summarizeValidation([])
  assert.equal(summary.sample.observations, 0)
  assert.equal(summary.performance.sampleAdjusted.maeByMatch, null)
  assert.equal(summary.winners.opponentOvr.accuracyWithHalfCreditForTies, null)
  assert.equal(summary.rankings.opponentOvr.meanWithinDateRoleSpearman, null)
})

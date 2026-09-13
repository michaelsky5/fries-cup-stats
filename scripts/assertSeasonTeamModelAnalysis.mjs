import assert from 'node:assert/strict'
import test from 'node:test'
import { auditPlayerTeamNesting, buildSeriesObservations, fitTeamPool, replayTeamPool, buildSameRolePairs, fitPairHistory, replayPairHistory, summarizeTeamAnalysis } from './lib/seasonTeamModelAnalysis.mjs'

function observations(days = 5) {
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1
    return ['a', 'b'].flatMap(teamId => [0, 1].map(player => ({
      id: `M${day}:${teamId}${player}`, date: `2026-07-0${day}`, matchId: `M${day}`, teamId,
      entryKey: `${teamId}${player}:DPS`, playerId: `${teamId}${player}`, role: 'DPS', changedTeam: false,
      ownRating: 1500, priorMatches: 3, current: 50 + player * 10, roleMean: 50, ovr: 75 + player * 10,
      target: 50 + player * 10 + (teamId === 'a' ? 20 : -10)
    })))
  }).flat()
}
function diagnosticRows(series) {
  return series.flatMap(row => [1, 2].map(order => ({
    id: `${row.id}:${order}`, observationId: row.id, date: row.date, matchId: row.matchId, mapKey: `${row.matchId}:${order}`,
    entryKey: row.entryKey, playerId: row.playerId, role: row.role, priorTeamId: row.teamId,
    minutes: 10, share: 0.5, target: row.target, prediction: row.current,
    context: { teamId: row.teamId, mapStatus: 'matched', duration: 10, ownRating: row.ownRating }
  })))
}
function pairs() {
  return Array.from({ length: 5 }, (_, index) => ({
    date: `2026-07-0${index + 1}`, matchId: `M${index + 1}`, pairId: 'a:p1|p2', teamId: 'a', role: 'DPS',
    target: 8, current: 4, teamK4: 4, ovr: 5, minutes: 20, maps: 2
  }))
}

test('the observed team-player nesting exposes the additive allocation ambiguity', () => {
  const logs = [{ playerId: 'p1', teamId: 'a' }, { playerId: 'p2', teamId: 'a' }, { playerId: 'p3', teamId: 'b' }]
  const audit = auditPlayerTeamNesting(logs)
  assert.equal(audit.allPlayersNested, true)
  assert.equal(audit.unidentifiedTeamPlayerShifts, 2)
  const playerEffects = { p1: 2, p2: -1, p3: 4 }
  const teamEffects = { a: 10, b: 20 }
  const shifts = { a: 7, b: -3 }
  for (const row of logs) {
    assert.equal(playerEffects[row.playerId] + teamEffects[row.teamId], playerEffects[row.playerId] - shifts[row.teamId] + teamEffects[row.teamId] + shifts[row.teamId])
  }
  assert.equal(auditPlayerTeamNesting([...logs, { playerId: 'p1', teamId: 'b' }]).allPlayersNested, false)
})

test('one team-series is one fitting unit and one observed match gets the declared shrinkage', () => {
  const rows = observations()
  const fit = fitTeamPool(rows, '2026-07-02')
  assert.equal(fit.teams.a.matches, 1)
  assert.equal(fit.teams.a.offset, 4)
  assert.equal(fit.teams.a.reliability, 0.2)
  const expanded = [...rows, ...rows.filter(row => row.teamId === 'a' && row.date === '2026-07-01').map(row => ({ ...row, id: `extra:${row.id}` }))]
  assert.deepEqual(fitTeamPool(expanded, '2026-07-02'), fit)
  assert.equal(fit.teams.a.maxLabelDate, '2026-07-01')
  assert.throws(() => fitTeamPool(rows, '2026-07-02', 0), /positive/)
})

test('team estimates and predictions do not see same-day or future targets', () => {
  const original = observations()
  const changed = structuredClone(original)
  changed.filter(row => row.date >= '2026-07-03').forEach(row => { row.target += 100 })
  const a = replayTeamPool(original)
  const b = replayTeamPool(changed)
  for (let index = 0; index < 3; index += 1) {
    assert.deepEqual(a[index].fitted, b[index].fitted)
    assert.deepEqual(a[index].observations.map(row => row.predictions), b[index].observations.map(row => row.predictions))
  }
  assert.notDeepEqual(a[3].fitted, b[3].fitted)
  assert.ok(a[0].observations.every(row => row.teamOffset === 0))
})

test('a shared team correction cancels in within-team differences', () => {
  for (const fold of replayTeamPool(observations())) {
    const [a, b] = fold.observations.filter(row => row.teamId === 'a')
    assert.ok(Math.abs((a.predictions.teamK4 - b.predictions.teamK4) - (a.current - b.current)) < 1e-8)
  }
})

test('pairs use only common complete maps, canonical player order and existing forecasts', () => {
  const source = observations(1)
  const rows = diagnosticRows(source)
  const built = buildSameRolePairs([...rows].reverse(), replayTeamPool(source))
  assert.equal(built.pairs.length, 2)
  assert.ok(built.pairs.every(row => row.minutes === 20 && row.maps === 2 && row.target === -10))
  const incomplete = rows.filter(row => !(row.entryKey === 'a0:DPS' && row.mapKey.endsWith(':2')))
  const narrowed = buildSameRolePairs(incomplete, replayTeamPool(source))
  assert.equal(narrowed.pairs.find(row => row.teamId === 'a').minutes, 10)
  const partial = rows.map(row => row.entryKey === 'a0:DPS' ? { ...row, minutes: 5 } : row)
  assert.equal(buildSameRolePairs(partial, replayTeamPool(source)).pairs.length, 1)
})

test('splitting a hero record cannot inflate pair samples or minutes', () => {
  const source = observations(2)
  const rows = diagnosticRows(source)
  const split = rows.flatMap(row => [{ ...row, id: `${row.id}-1`, minutes: 6 }, { ...row, id: `${row.id}-2`, minutes: 4 }])
  assert.deepEqual(buildSameRolePairs(split, replayTeamPool(source)), buildSameRolePairs(rows, replayTeamPool(source)))
})

test('a changed actual team is never silently used as a pre-day team observation', () => {
  const rows = observations()
  rows.filter(row => row.teamId === 'a').forEach(row => { row.changedTeam = true })
  assert.equal(fitTeamPool(rows, '2026-07-05').teams.a, undefined)
  assert.equal(buildSameRolePairs(diagnosticRows(rows), replayTeamPool(rows)).pairs.some(row => row.teamId === 'a'), false)
})

test('paired forecasts use earlier shared-series targets and fall back before the first one', () => {
  const original = pairs()
  const a = replayPairHistory(original)
  assert.equal(a[0].pairs[0].predictions.history, 4)
  assert.equal(a[1].pairs[0].predictions.history, 2)
  assert.equal(fitPairHistory(original, '2026-07-03').pairs['a:p1|p2'].matches, 2)
  const changed = structuredClone(original)
  changed.filter(row => row.date >= '2026-07-03').forEach(row => { row.target = -80 })
  const b = replayPairHistory(changed)
  for (let index = 0; index < 3; index += 1) {
    assert.deepEqual(a[index].fitted, b[index].fitted)
    assert.deepEqual(a[index].pairs.map(row => row.predictions), b[index].pairs.map(row => row.predictions))
  }
  assert.notDeepEqual(a[3].fitted, b[3].fitted)
})

test('ties and unavailable tank pairs are explicit and OVR is not compared in raw-score MAE', () => {
  const sample = pairs().slice(0, 2)
  sample[0].target = 0
  sample[1].current = 0
  const summary = summarizeTeamAnalysis([], replayPairHistory(sample))
  assert.equal(summary.pair.all.equalTargets, 1)
  assert.equal(summary.pair.all.performance.current.accuracy, 0.5)
  assert.equal(summary.pair.all.performance.ovr.gapMae, null)
  assert.equal(summary.pair.byRole.TANK.performance.current.accuracy, null)
})

test('source cohort integrity requires every observation and the original target', () => {
  const row = { ...observations(1)[0], id: 'M1:a0:DPS' }
  const rows = diagnosticRows([row])
  const fold = { observations: [{ matchId: 'M1', entryKey: 'a0:DPS', playerId: 'a0', date: row.date, role: 'DPS', target: row.target,
    predictions: { sampleAdjusted: row.current, roleMean: row.roleMean }, opponentOvr: row.ovr, priorMatches: 3 }] }
  assert.equal(buildSeriesObservations(rows, [fold]).length, 1)
  assert.throws(() => buildSeriesObservations([], [fold]), /cohort/)
  assert.throws(() => buildSeriesObservations(rows.map(record => ({ ...record, target: record.target + 1 })), [fold]), /drift/)
})

test('empty analysis never invents accuracy, errors or cross-team evidence', () => {
  const summary = summarizeTeamAnalysis([], [])
  assert.equal(summary.team.performance.current.maeByMatch, null)
  assert.equal(summary.pair.all.performance.history.accuracy, null)
  assert.equal(auditPlayerTeamNesting([]).allPlayersNested, null)
})

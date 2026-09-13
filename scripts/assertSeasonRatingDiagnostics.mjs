import assert from 'node:assert/strict'
import test from 'node:test'
import { contextForLog, auditContextCoverage, buildDiagnosticRows, attachPeerResiduals, fitContextBiases, replayContextBiases, summarizeDiagnostics } from './lib/seasonRatingDiagnostics.mjs'

function mapFixture() {
  const row = { playerId: 'P1', entryKey: 'P1:DPS', teamId: 'a', role: 'DPS', matchId: 'M1',
    mapOrder: '1', mapName: 'Ilios', mapKey: 'M1:1', hero: 'Tracer', minutes: 10,
    resolution: { known: true, canonicalHeroName: 'Tracer' }, rawLog: { mapType: 'Control', rowTime: '' } }
  const match = { matchId: 'M1', eligible: true, teamA: 'a', teamB: 'b', teamARating: 1600, teamBRating: 1400,
    teamAPriorMatches: 3, teamBPriorMatches: 3, source: { maps: [{ map_order: 1, map_name: 'Ilios', map_type: 'Control', match_time: '10:00', winner: 'a' }] } }
  return { row, match }
}

function diagnosticRows(days = 8) {
  const rows = []
  for (let day = 1; day <= days; day += 1) {
    for (let match = 0; match < 2; match += 1) {
      for (let player = 0; player < 5; player += 1) {
        const hero = (player + day) % 2 === 0 ? 'A' : 'B'
        const residual = hero === 'A' ? 8 : -4
        rows.push({ id: `${day}:${match}:${player}`, date: `2026-07-0${day}`, matchId: `${day}:${match}`,
          observationId: `${day}:${match}:P${player}`, entryKey: `P${match * 5 + player}:DPS`, playerId: `P${match * 5 + player}`, role: 'DPS',
          mapKey: `${day}:${match}:1`, minutes: 10, share: 1, weight: 0.2, prediction: 50, roleMeanPrediction: 50,
          target: 50 + residual, seriesTarget: 50 + residual, residual, priorTeamId: 'a',
          context: { teamId: 'a', mapResult: 'win', dimensions: { hero: `DPS:${hero}`, mode: 'DPS:control', team: 'a', opponent: null, matchup: null, duration: 'DPS:8-to-12m' } } })
      }
    }
  }
  return rows
}

test('map context requires consistent metadata and classifies prior Elo without the result', () => {
  const { row, match } = mapFixture()
  const context = contextForLog(row, match)
  assert.equal(context.mode, 'control')
  assert.equal(context.dimensions.opponent, 'DPS:below-1475')
  assert.equal(context.dimensions.matchup, 'DPS:above-50')
  assert.equal(context.dimensions.duration, 'DPS:8-to-12m')
  assert.equal(context.mapResult, 'win')
  assert.equal(context.minutesEqualMapDuration, true)
  const changed = structuredClone(match)
  changed.source.maps[0].winner = 'b'
  assert.deepEqual(contextForLog(row, changed).dimensions, context.dimensions)
})

test('ambiguous, administrative and contradictory map data remain unavailable', () => {
  const { row, match } = mapFixture()
  const duplicate = structuredClone(match)
  duplicate.source.maps.push({ ...duplicate.source.maps[0] })
  assert.equal(contextForLog(row, duplicate).mapStatus, 'ambiguous')
  assert.equal(contextForLog(row, duplicate).mode, '')
  assert.equal(contextForLog({ ...row, rawLog: { mapType: 'Escort' } }, match).mapStatus, 'conflict')
  const administrative = structuredClone(match)
  administrative.source.maps[0].is_administrative = true
  assert.equal(contextForLog(row, administrative).dimensions.mode, null)
  assert.equal(contextForLog(row, { ...match, teamBPriorMatches: 0 }).dimensions.opponent, null)
  assert.equal(contextForLog({ ...row, teamId: 'unknown' }, match).dimensions.team, null)
})

test('coverage counts multiple hero labels without inventing separate timing records', () => {
  const { row, match } = mapFixture()
  const second = { ...row, hero: 'Genji', resolution: { known: true, canonicalHeroName: 'Genji' } }
  const coverage = auditContextCoverage({ logs: [row, second], matches: [match] })
  assert.equal(coverage.normalLogs, 2)
  assert.equal(coverage.playerMapRecords, 1)
  assert.equal(coverage.multipleHeroRecordsOnSamePlayerMap, 1)
  assert.equal(coverage.explicitRowTime.rows, 0)
})

test('peer residual excludes all own hero records and all opponents and other maps', () => {
  const row = diagnosticRows()[0]
  const make = (entryKey, residual, minutes = 10) => ({ ...row, entryKey, playerId: entryKey, residual, minutes })
  const rows = [make('self', 100, 5), make('self', 50, 5), make('peer1', 1), make('peer2', 3),
    { ...make('opponent', 999), context: { ...row.context, teamId: 'b' } },
    { ...make('other-map', 9999), mapKey: 'other' }]
  const result = attachPeerResiduals(rows)
  assert.equal(result[0].peerResidual, 2)
  assert.equal(result[1].peerResidual, 2)
  assert.equal(result[2].peerResidual, 39)
  assert.equal(result[4].peerResidual, null)
  assert.equal(result[5].peerResidual, null)
  assert.equal(rows[0].peerResidual, undefined)
})

test('historical role and group offsets recover a known contextual mean after the support gate', () => {
  const fitted = fitContextBiases(diagnosticRows(), '2026-07-07')
  assert.ok(Math.abs(fitted.roleBias.DPS.value - 2) < 1e-9)
  assert.ok(Math.abs(fitted.effects.hero['DPS:A'].value - 6) < 1e-9)
  assert.ok(Math.abs(fitted.effects.hero['DPS:B'].value + 6) < 1e-9)
  assert.equal(fitted.effects.hero['DPS:A'].support.maxLabelDate, '2026-07-06')
  assert.deepEqual(fitContextBiases(diagnosticRows(), '2026-07-03').effects.hero, {})
})

test('same-day and later target changes do not alter earlier fitted offsets or predictions', () => {
  const rows = diagnosticRows()
  const baseline = replayContextBiases(rows)
  const changed = structuredClone(rows)
  changed.filter(row => row.date >= '2026-07-07').forEach(row => { row.residual += 100; row.target += 100; row.seriesTarget += 100 })
  const after = replayContextBiases(changed)
  for (let index = 0; index < 7; index += 1) {
    assert.deepEqual(after[index].fitted, baseline[index].fitted)
    assert.deepEqual(after[index].rows.map(row => row.predictions), baseline[index].rows.map(row => row.predictions))
  }
  assert.notDeepEqual(after[7].fitted, baseline[7].fitted)
})

test('same-match peer outcomes and map winners are never fitting inputs', () => {
  const rows = attachPeerResiduals(diagnosticRows())
  const changed = structuredClone(rows)
  changed.forEach(row => { row.peerResidual = 1e8; row.context.mapResult = 'loss' })
  const a = replayContextBiases(rows)
  const b = replayContextBiases(changed)
  assert.deepEqual(a.map(fold => fold.fitted), b.map(fold => fold.fitted))
  assert.deepEqual(a.flatMap(fold => fold.rows.map(row => row.predictions)), b.flatMap(fold => fold.rows.map(row => row.predictions)))
})

test('splitting a record preserves total weight, series predictions and support counts', () => {
  const original = diagnosticRows()
  const split = original.flatMap(row => [
    { ...row, id: `${row.id}-1`, minutes: 5, share: 0.5, weight: 0.1 },
    { ...row, id: `${row.id}-2`, minutes: 5, share: 0.5, weight: 0.1 }
  ])
  const a = summarizeDiagnostics(original, replayContextBiases(original))
  const b = summarizeDiagnostics(split, replayContextBiases(split))
  assert.equal(a.sample.observations, b.sample.observations)
  assert.equal(a.sample.matches, b.sample.matches)
  // The exported report canonicalizes -0; floating summation order may change its sign.
  assert.deepEqual(JSON.parse(JSON.stringify(a.performance)), JSON.parse(JSON.stringify(b.performance)))
  assert.equal(a.groups.hero[0].support.observations, b.groups.hero[0].support.observations)
})

test('unsafe frozen or same-day baseline provenance is rejected before reconstruction', () => {
  const training = { beforeExclusive: '2026-07-04', maxLogDate: '2026-07-04', baselineMode: 'runtime', frozenBaselineUsed: false }
  assert.throws(() => buildDiagnosticRows({ logs: [], matches: [] }, [{ training, observations: [] }]), /Unsafe/)
  assert.throws(() => buildDiagnosticRows({ logs: [], matches: [] }, [{ training: { ...training, maxLogDate: null, frozenBaselineUsed: true }, observations: [] }]), /Unsafe/)
})

test('conditional ranking retains flat warm-up groups and uses distinct same-day players', () => {
  const rows = diagnosticRows()
  const summary = summarizeDiagnostics(rows, replayContextBiases(rows))
  assert.equal(summary.sample.rankingGroups, 8)
  assert.equal(summary.performance.current.meanPairConcordance, 0.5)
  assert.equal(summary.performance.hero.meanPairConcordance, 0.75)
})

test('empty diagnostics report unavailable error and correlation', () => {
  const result = summarizeDiagnostics([], [])
  assert.equal(result.performance.current.maeByMatch, null)
  assert.equal(result.peerContext.correlation, null)
  assert.equal(result.performance.hero.meanPairConcordance, null)
  assert.equal(result.sample.observations, 0)
})

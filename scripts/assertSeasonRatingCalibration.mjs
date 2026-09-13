import assert from 'node:assert/strict'
import test from 'node:test'
import { fitRoleCalibration, predictCalibrated, fitErrorBands, replayCalibration, summarizeCalibration, pairConcordance } from './lib/seasonRatingCalibration.mjs'

function observations(role = 'DPS', slope = 0.25, days = 5) {
  const rows = []
  for (let day = 1; day <= days; day += 1) {
    for (let match = 0; match < 2; match += 1) {
      for (let player = 0; player < 5; player += 1) {
        const x = (match * 5 + player - 4.5) * 3
        rows.push({ date: `2026-07-0${day}`, matchId: `M${day}-${match}`, entryKey: `P${match * 5 + player}:${role}`, role,
          target: 50 + slope * x, opponentOvr: 80 + x,
          predictions: { neutral: 50, roleMean: 50, rawAverage: 50 + x, sampleAdjusted: 50 + 0.8 * x } })
      }
    }
  }
  return rows
}
const foldsFor = rows => [...new Set(rows.map(row => row.date))].map(date => ({
  training: { beforeExclusive: date, maxLogDate: '2026-06-30', frozenBaselineUsed: false, baselineMode: 'runtime' },
  observations: rows.filter(row => row.date === date)
}))

test('past role observations recover the known shrinkage independently for each role', () => {
  const history = [...observations(), ...observations('SUPPORT', 0.75)]
  const fit = fitRoleCalibration(history, '2026-07-04')
  assert.equal(fit.byRole.DPS.alpha, 0.25)
  assert.equal(fit.byRole.SUPPORT.alpha, 0.75)
  assert.equal(fit.byRole.DPS.source, 'role')
  assert.equal(fit.byRole.DPS.training.observations, 30)
  assert.equal(fit.byRole.DPS.training.maxLabelDate, '2026-07-03')
  assert.equal(fit.byRole.TANK.source, 'pooled')
  assert.equal(predictCalibrated({ roleMean: 50, rawAverage: 70, sampleAdjusted: 66 }, 'DPS', fit), 55)
})

test('fit stays bounded and falls back without sufficient diverse historical samples', () => {
  assert.equal(fitRoleCalibration(observations('DPS', -1), '2026-07-04').byRole.DPS.alpha, 0)
  assert.equal(fitRoleCalibration(observations('DPS', 2), '2026-07-04').byRole.DPS.alpha, 1)
  const fit = fitRoleCalibration(observations(), '2026-07-03')
  assert.equal(fit.byRole.DPS.alpha, null)
  assert.equal(predictCalibrated({ roleMean: 50, rawAverage: 70, sampleAdjusted: 66 }, 'DPS', fit), 66)
  const repeated = Array.from({ length: 50 }, () => observations()[0])
  assert.equal(fitRoleCalibration(repeated, '2026-07-04').byRole.DPS.source, 'current-fallback')
  assert.equal(predictCalibrated({ roleMean: 50, rawAverage: NaN, sampleAdjusted: 60 }, 'DPS', fit), null)
})

test('series keep equal fitting weight when one series contains more player observations', () => {
  const history = observations('DPS', 1, 3)
  history.filter(row => row.matchId === 'M1-0').forEach(row => { row.target = 50 })
  const expanded = [...history, ...history.filter(row => row.matchId === 'M1-0').map(row => ({ ...row, entryKey: `extra-${row.entryKey}` }))]
  const a = fitRoleCalibration(history, '2026-07-04').byRole.DPS.alpha
  const b = fitRoleCalibration(expanded, '2026-07-04').byRole.DPS.alpha
  assert.ok(Math.abs(a - b) < 1e-12)
})

test('unidentifiable historical slope is explicit and predicts the role prior', () => {
  const history = observations().map(row => ({ ...row, predictions: { ...row.predictions, rawAverage: 50 } }))
  const fit = fitRoleCalibration(history, '2026-07-04')
  assert.equal(fit.byRole.DPS.degenerate, true)
  assert.equal(fit.byRole.DPS.alpha, 0)
  assert.equal(predictCalibrated({ roleMean: 50, rawAverage: 90, sampleAdjusted: 80 }, 'DPS', fit), 50)
})

test('same-day and future labels cannot change the days calibration, forecasts or error bands', () => {
  const rows = observations()
  const baseline = replayCalibration(foldsFor(rows))
  const changed = structuredClone(rows)
  changed.filter(row => row.date >= '2026-07-04').forEach(row => { row.target = 50 + (row.target - 50) * 20 })
  const replay = replayCalibration(foldsFor(changed))
  for (let index = 0; index < 4; index += 1) {
    assert.deepEqual(replay[index].calibration, baseline[index].calibration)
    assert.deepEqual(replay[index].errorBands, baseline[index].errorBands)
    assert.deepEqual(replay[index].observations.map(row => [row.predictions, row.intervals]), baseline[index].observations.map(row => [row.predictions, row.intervals]))
  }
  assert.notDeepEqual(replay[4].calibration, baseline[4].calibration)
  assert.equal(baseline[3].calibration.byRole.DPS.training.maxLabelDate, '2026-07-03')
})

test('splitting a day into input shards still fits once before the entire day', () => {
  const folds = foldsFor(observations())
  const split = folds.flatMap(fold => [
    { ...fold, observations: fold.observations.slice(0, 5) },
    { ...fold, observations: fold.observations.slice(5) }
  ])
  assert.deepEqual(replayCalibration(split), replayCalibration(folds))
})

test('bands use errors from emitted past predictions instead of errors from refitting old targets', () => {
  const history = observations().map(row => ({ ...row, target: 60, predictions: { ...row.predictions, learnedRoleShrink: 50 } }))
  const bands = fitErrorBands(history, '2026-07-04')
  assert.equal(bands.byRole.DPS.halfWidths.learnedRoleShrink, 10)
  assert.equal(bands.byRole.DPS.training.observations, 30)
  assert.equal(bands.byRole.DPS.training.maxLabelDate, '2026-07-03')
  assert.equal(fitErrorBands(history, '2026-07-03').byRole.DPS.halfWidths.learnedRoleShrink, null)
})

test('coverage and width are measured on the same available prequential interval cohort', () => {
  const summary = summarizeCalibration(replayCalibration(foldsFor(observations())))
  assert.equal(summary.intervals.metrics.learnedRoleShrink.observations, 20)
  assert.equal(summary.intervals.metrics.sampleAdjusted.observations, 20)
  assert.equal(summary.intervals.metrics.learnedRoleShrink.coverageByObservation, 1)
  assert.equal(summary.intervals.metrics.sampleAdjusted.coverageByObservation, 0.8)
  assert.equal(summary.intervals.metrics.learnedRoleShrink.meanWidth, 11.55)
})

test('duplicate player-role series and unsafe source-baseline chronology are rejected', () => {
  const folds = foldsFor(observations())
  assert.throws(() => replayCalibration([...folds, folds[0]]), /Duplicate/)
  assert.throws(() => replayCalibration([{ ...folds[0], training: { ...folds[0].training, frozenBaselineUsed: true } }]), /Unsafe/)
  assert.throws(() => replayCalibration([{ ...folds[0], training: { ...folds[0].training, maxLogDate: '2026-07-01' } }]), /Unsafe/)
})

test('collapsed predictions remain in ranking groups with half credit and no invented correlation', () => {
  const replay = replayCalibration(foldsFor(observations()))
  replay.forEach(fold => fold.observations.forEach(row => { row.predictions.learnedRoleShrink = 50 }))
  const summary = summarizeCalibration(replay)
  assert.equal(summary.rankings.learnedRoleShrink.constantPredictionGroups, 5)
  assert.equal(summary.rankings.learnedRoleShrink.meanPairConcordance, 0.5)
  assert.equal(summary.rankings.learnedRoleShrink.commonSpearmanGroups, 0)
  assert.equal(summary.rankings.learnedRoleShrink.meanCommonSpearman, null)
  assert.deepEqual(pairConcordance([2, 2], [1, 2]), { credit: 0.5, pairs: 1 })
})

test('same-day repeat series do not inflate the number of distinct ranked players', () => {
  const replay = replayCalibration(foldsFor(observations()))
  const before = summarizeCalibration(replay)
  const repeated = structuredClone(replay)
  repeated[0].observations.push(...repeated[0].observations.map(row => ({ ...row, matchId: `${row.matchId}-extra` })))
  assert.deepEqual(summarizeCalibration(repeated).rankingGroups, before.rankingGroups)
})

test('empty calibration reports unavailable metrics and no uncertainty coverage', () => {
  const summary = summarizeCalibration([])
  assert.equal(summary.performance.learnedRoleShrink.maeByMatch, null)
  assert.equal(summary.rankings.learnedRoleShrink.meanPairConcordance, null)
  assert.equal(summary.intervals.metrics.learnedRoleShrink.coverageByObservation, null)
  assert.equal(summary.latestParameters, null)
})

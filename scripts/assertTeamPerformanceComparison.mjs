import test from 'node:test'
import assert from 'node:assert/strict'
import { PERFORMANCE_METRICS } from '../src/features/team-dossier/teamPerformance.js'
import {
  getPerformanceComparison,
  getComparisonExtent,
  comparisonPosition,
  comparisonLabel
} from '../src/features/team-dossier/teamPerformanceComparison.js'

const metricSet = (value, count) =>
  Object.fromEntries(PERFORMANCE_METRICS.map(({ id }) => [id, { value, count }]))
const report = {
  metrics: metricSet(120, 9),
  wins: metricSet(130, 6),
  losses: metricSet(100, 3),
  paired: Object.fromEntries(
    PERFORMANCE_METRICS.map(({ id }) => [
      id,
      { own: { value: 90, count: 5 }, opponent: { value: 100, count: 5 } }
    ])
  )
}
const field = Object.fromEntries(
  PERFORMANCE_METRICS.map(({ id }) => [id, { median: 100, samples: [{}, {}, {}] }])
)

test('comparison modes keep raw values and sample counts from their own aggregation', () => {
  const baseline = getPerformanceComparison(report, field)[0]
  const paired = getPerformanceComparison(report, field, 'paired')[0]
  const outcome = getPerformanceComparison(report, field, 'outcome')[0]
  assert.equal(baseline.own.value, 120)
  assert.equal(baseline.reference.count, 3)
  assert.equal(comparisonLabel(baseline.difference), '+20.0%')
  assert.equal(paired.own.count, paired.reference.count)
  assert.equal(comparisonLabel(paired.difference), '-10.0%')
  assert.equal(outcome.own.count, 6)
  assert.equal(outcome.reference.count, 3)
  assert.equal(comparisonLabel(outcome.difference), '+30.0%')
})

test('zero observations are a real minus 100 percent, missing or zero reference stays unknown', () => {
  const zero = getPerformanceComparison({ ...report, metrics: metricSet(0, 4) }, field)[0]
  assert.equal(zero.difference, -100)
  for (const value of [null, undefined, NaN]) {
    assert.equal(
      getPerformanceComparison({ ...report, metrics: metricSet(value, 0) }, field)[0].difference,
      null
    )
  }
  const zeroField = { ...field, damage: { median: 0, samples: [{}] } }
  assert.equal(getPerformanceComparison(report, zeroField)[0].difference, null)
  assert.equal(comparisonPosition(null, 25), null)
})

test('one symmetric scale contains all six observations including large differences', () => {
  const rows = [{ difference: -100 }, { difference: 400 }, { difference: 25 }, { difference: null }]
  const extent = getComparisonExtent(rows)
  assert.equal(extent, 400)
  assert.equal(comparisonPosition(0, extent), 50)
  assert.equal(comparisonPosition(400, extent), 96)
  assert.equal(comparisonPosition(-400, extent), 4)
  assert.equal(comparisonPosition(100, extent) - 50, 50 - comparisonPosition(-100, extent))
  assert.equal(getComparisonExtent([{ difference: null }]), 25)
})

test('rounding removes negative zero and equality stays at the reference', () => {
  assert.equal(comparisonLabel(-0.0001), '0.0%')
  assert.equal(comparisonLabel(0), '0.0%')
  assert.equal(comparisonLabel(null), '—')
  assert.equal(comparisonPosition(0, 25), 50)
})

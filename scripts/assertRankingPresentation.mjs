import assert from 'node:assert/strict'
import test from 'node:test'
import { getComparisonCells, getRankingValue, sanitizeComparisonKeys } from '../src/features/kpr-design/rankingPresentation.js'
import { getReturnState, readReturnState } from '../src/lib/navigationState.js'

const entry = (key, value, overrides = {}) => ({
  entryKey: key, role: 'SUPPORT', seasonOvr: value,
  metrics: { per10: { heal: value, dth: value }, total: { heal: value }, perMap: { heal: value } }, ...overrides
})

test('missing, non-finite and blank statistics stay unavailable, while zero remains observed', () => {
  for (const value of [null, undefined, '', '  ', NaN, Infinity, 'unknown']) {
    assert.equal(getRankingValue(entry('a', value), 'heal'), null)
  }
  assert.equal(getRankingValue(entry('a', 0), 'heal'), 0)
  assert.equal(getRankingValue(entry('a', '1.5'), 'heal'), 1.5)
  assert.equal(getRankingValue({ metrics: {} }, 'heal'), null)
})

test('comparison uses the published rating status including provisional and unrated values', () => {
  assert.equal(getRankingValue(entry('a', 98), 'score'), 98)
  assert.equal(getRankingValue(entry('a', 98, { seasonRatingStatus: 'PROVISIONAL', provisionalSeasonOvr: 72 }), 'score'), 72)
  assert.equal(getRankingValue(entry('a', 98, { seasonRatingStatus: 'UNRATED' }), 'score'), null)
  assert.equal(getRankingValue({ roleScore: 95 }, 'score'), null)
})

test('differences follow the selected baseline and the precision shown to readers', () => {
  const cells = getComparisonCells([entry('a', 10.34), entry('b', 12.37)], 'heal', 'per10', 'b')
  assert.deepEqual(cells.map(cell => cell.value), [10.3, 12.4])
  assert.deepEqual(cells.map(cell => cell.delta), [-2.1, 0])
  assert.deepEqual(cells.map(cell => cell.isBaseline), [false, true])
  const scores = getComparisonCells([entry('a', 98.4), entry('b', 98.5)], 'score', 'per10', 'a')
  assert.deepEqual(scores.map(cell => cell.delta), [0, 1])
})

test('a removed baseline falls back to the first valid selection', () => {
  const cells = getComparisonCells([entry('a', 3), entry('b', 8)], 'heal', 'perMap', 'removed')
  assert.deepEqual(cells.map(cell => cell.delta), [0, 5])
  assert.equal(cells[0].isBaseline, true)
})

test('lower deaths and higher other statistics are marked only among differing observed values', () => {
  const entries = [entry('a', 0), entry('b', 3), entry('c', null)]
  assert.deepEqual(getComparisonCells(entries, 'dth', 'per10', 'a').map(cell => cell.isExtreme), [true, false, false])
  assert.deepEqual(getComparisonCells(entries, 'heal', 'per10', 'a').map(cell => cell.isExtreme), [false, true, false])
  assert.deepEqual(getComparisonCells([entry('a', 3), entry('b', 3)], 'heal', 'per10', 'a').map(cell => cell.isExtreme), [false, false])
})

test('ties at an extremum are retained and a lone observation is not a comparison winner', () => {
  assert.deepEqual(getComparisonCells([entry('a', 3), entry('b', 5), entry('c', 5)], 'heal', 'per10', 'a').map(cell => cell.isExtreme), [false, true, true])
  assert.deepEqual(getComparisonCells([entry('a', null), entry('b', 5)], 'heal', 'per10', 'a').map(cell => cell.isExtreme), [false, false])
})

test('a missing baseline produces no fabricated zero-based differences', () => {
  const cells = getComparisonCells([entry('a', null), entry('b', 12)], 'heal', 'per10', 'a')
  assert.deepEqual(cells.map(cell => cell.delta), [null, null])
  assert.equal(cells[0].fraction, 0)
})

test('total-statistic rows do not imply higher accumulated volume is superior', () => {
  const entries = [entry('a', 100), entry('b', 200)]
  assert.deepEqual(getComparisonCells(entries, 'heal', 'total', 'a').map(cell => cell.isExtreme), [false, false])
  assert.deepEqual(getComparisonCells(entries, 'heal', 'total', 'a').map(cell => cell.delta), [0, 100])
})

test('URL selections retain order, remove stale and duplicate keys, enforce one role and four players', () => {
  const entries = ['a', 'b', 'c', 'd', 'e'].map(key => entry(key, 1))
  entries.push(entry('tank', 1, { role: 'TANK' }))
  const byKey = new Map(entries.map(item => [item.entryKey, item]))
  assert.deepEqual(sanitizeComparisonKeys(['missing', 'b', 'b', 'tank', 'a', 'd', 'c', 'e'], byKey), ['b', 'a', 'd', 'c'])
  assert.deepEqual(sanitizeComparisonKeys(['tank', 'a'], byKey), ['tank'])
  assert.deepEqual(sanitizeComparisonKeys(['missing'], byKey), [])
})

test('a ranking return path retains lookup and comparison context while rejecting external paths', () => {
  const search = '?design=kpr5&season=FCR2026&team=A&sort=heal&preview=one%3ASUPPORT&compare=one%3ASUPPORT&compare=two%3ASUPPORT'
  const state = getReturnState({ pathname: '/leaderboard', search })
  assert.equal(readReturnState(state, { allowedPrefixes: ['/leaderboard'] }).returnTo, `/leaderboard${search}`)
  assert.equal(readReturnState({ returnTo: '//example.com' }, { allowedPrefixes: ['/leaderboard'] }).returnTo, '')
})

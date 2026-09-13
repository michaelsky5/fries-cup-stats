import assert from 'node:assert/strict'
import { buildWeeklyOverview, isWeeklyOverview, weeklyMapSlots, weeklyMatchState, weeklyScore } from '../src/features/weekly-overview/weeklyOverviewModel.js'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'

let checks = 0
const test = (name, fn) => { fn(); checks += 1; console.log(`PASS ${name}`) }
const db = buildWeeklyOverviewFixture()
const active = buildWeeklyOverview(db)
test('current week wins over a later published week', () => assert.equal(active.week.week_number, 3))
test('raw System IDs resolve to public match routes', () => assert.equal(active.focus.id, 'FCW26-W3-M1'))
test('RR5 at 3:0 remains live with two unrecorded maps', () => {
  assert.equal(active.focus.state, 'live')
  assert.deepEqual(weeklyMapSlots(active.focus).map(slot => slot.state), ['recorded', 'recorded', 'recorded', 'pending', 'pending'])
})
test('upcoming week preserves unpublished scores', () => {
  const next = buildWeeklyOverview(db, { weekId: 'sample-cycle-1-w4' })
  assert.equal(next.focus.state, 'upcoming')
  assert.equal(weeklyScore(next.focus.team_a.score), '—')
  assert.equal(weeklyMapSlots(next.focus).length, 5)
})
test('published standings remain cycle totals when browsing history', () => {
  const history = buildWeeklyOverview(db, { weekId: 'sample-cycle-1-w1' })
  assert.equal(history.focus.state, 'complete')
  assert.deepEqual(history.standings.map(row => row.points), active.standings.map(row => row.points))
  assert.deepEqual(active.standings.map(row => row.display_rank), [1, 2, 3, 4, 4, 6])
  assert.equal(active.standings[3].tied, true)
})
test('Pilot selection isolates its week and suppresses points', () => {
  const pilot = buildWeeklyOverview(db, { cycleId: 'sample-pilot', weekId: 'sample-cycle-1-w3', match: active.focus.id })
  assert.equal(pilot.isPilot, true)
  assert.equal(pilot.focus.id, 'FCW26-W1-MP')
  assert.equal(pilot.standings.length, 0)
})
test('invalid URL selections recover inside the visible cycle', () => {
  const invalid = buildWeeklyOverview(db, { cycleId: 'missing', weekId: 'missing', match: 'missing' })
  assert.equal(invalid.focus.id, active.focus.id)
})
test('hidden cycles and weeks never enter the public overview', () => {
  const fixture = structuredClone(db)
  fixture.weekly_competition.cycles.push({ ...fixture.weekly_competition.cycles[1], id: 'draft', sequence: 99, status: 'DRAFT' })
  fixture.weekly_competition.cycles[1].weeks.push({ id: 'draft-week', week_number: 5, status: 'PAIRING' })
  const output = buildWeeklyOverview(fixture)
  assert.equal(output.cycles.length, 2)
  assert.equal(output.weeks.length, 4)
})
test('a week cannot expose another cycle through a stale match reference', () => {
  const fixture = structuredClone(db)
  fixture.weekly_competition.cycles[1].weeks[2].match_ids.push('raw-FCW26-W1-MP')
  assert.equal(buildWeeklyOverview(fixture).matches.length, 3)
})
test('unlisted, duplicate and missing match IDs are not fabricated', () => {
  const fixture = structuredClone(db)
  fixture.weekly_competition.cycles[1].weeks[2].match_ids = ['missing', 'raw-FCW26-W3-M1', 'FCW26-W3-M1']
  assert.equal(buildWeeklyOverview(fixture).matches.length, 1)
})
test('a bye does not become a featured scheduled match', () => {
  const fixture = structuredClone(db)
  fixture.matches.find(match => match.match_id === active.focus.id).team_b = { id: 'bye', name: '轮空' }
  assert.equal(buildWeeklyOverview(fixture).matches.length, 2)
})
test('rulings, cancellations and unknown status do not become normal wins', () => {
  assert.equal(weeklyMatchState({ status: 'CANCELLED', is_forfeit: true }), 'cancelled')
  assert.equal(weeklyMatchState({ status: 'POSTPONED' }), 'postponed')
  assert.equal(weeklyMatchState({ status: 'COMPLETE', is_forfeit: true }), 'ruling')
  assert.equal(weeklyMatchState({ winner: 'team-a' }), 'unknown')
})
test('missing and zero scores are distinct', () => {
  for (const value of ['', ' ', undefined, null, false, -1, 'NaN']) assert.equal(weeklyScore(value), '—')
  assert.equal(weeklyScore(0), '0')
})
test('empty or administrative maps never become played maps', () => {
  const slots = weeklyMapSlots({ format: 'RR5', maps: [{ map_order: 1, score_a: 0, score_b: 0, time: '00:00' }, { map_order: 2, is_administrative: true, winner: 'a' }] })
  assert.equal(slots[0].state, 'pending')
  assert.equal(slots[1].state, 'ruling')
})

test('forfeit stops unplayed maps without manufacturing scores or leaving them pending', () => {
  const match = { format: 'RR5', status: 'COMPLETE', is_forfeit: true, maps: [{ map_order: 1, status: 'COMPLETE', score_a: 2, score_b: 0 }] }
  const slots = weeklyMapSlots(match)
  assert.deepEqual(slots.map(slot => slot.state), ['recorded', 'not-played', 'not-played', 'not-played', 'not-played'])
  assert.ok(slots.slice(1).every(slot => slot.map === undefined))
  assert.equal(weeklyMapSlots({ ...match, status: 'CANCELLED' })[1].state, 'pending')
})
test('playoff formats do not inherit the fixed-five-map rule', () => assert.equal(weeklyMapSlots({ format: 'FT3', maps: [{}] }).length, 1))
test('unknown future schemas remain an explicit empty state', () => {
  assert.equal(buildWeeklyOverview({ weekly_competition: { schema_version: 'v99', cycles: db.weekly_competition.cycles } }).cycles.length, 0)
  assert.equal(buildWeeklyOverview({}).focus, null)
})
test('weekly routing is opt-in and leaves ordinary seasons unchanged', () => {
  assert.equal(isWeeklyOverview({}, { id: 'FCR26' }), false)
  assert.equal(isWeeklyOverview(db), true)
  assert.equal(isWeeklyOverview({}, { rules: { weeklyCompetition: { enabled: true } } }), true)
})
test('explicit focus survives followed-team prioritization', () => {
  const choice = buildWeeklyOverview(db, { match: 'FCW26-W3-M3', followedTeamIds: ['FCW26-T001'] })
  assert.equal(choice.focus.id, 'FCW26-W3-M3')
})
console.log(`${checks} weekly overview checks passed.`)

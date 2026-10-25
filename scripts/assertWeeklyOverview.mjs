import assert from 'node:assert/strict'
import { buildWeeklyFollowedTeams, buildWeeklyOverview, isWeeklyOverview, weeklyMapSlots, weeklyMatchState, weeklyScore } from '../src/features/weekly-overview/weeklyOverviewModel.js'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'
import { COUNTDOWN_WINDOW_MS, formatMatchCountdown } from '../src/features/weekly-overview/matchCountdown.js'
import { buildWeeklyPhases, openWeeklyConfirmation } from '../src/features/weekly-overview/weeklyPhase.js'

let checks = 0
const test = (name, fn) => { fn(); checks += 1; console.log(`PASS ${name}`) }
const db = buildWeeklyOverviewFixture()
const active = buildWeeklyOverview(db)
test('current week wins over a later published week', () => assert.equal(active.week.week_number, 3))

test('default and stale week URLs select the latest published week without reordering the payload', () => {
  const fixture = structuredClone(db)
  const cycle = fixture.weekly_competition.cycles[1]
  cycle.weeks.forEach(week => { week.status = 'PUBLISHED' })
  cycle.weeks.reverse()
  const inputOrder = cycle.weeks.map(week => week.id)
  const output = buildWeeklyOverview(fixture)
  assert.equal(output.week.week_number, 4)
  assert.equal(buildWeeklyOverview(fixture, { weekId: 'missing' }).week.week_number, 4)
  assert.deepEqual(output.weeks.map(week => week.week_number), [1, 2, 3, 4])
  assert.deepEqual(cycle.weeks.map(week => week.id), inputOrder)
})

test('explicit history remains selected when newer weeks have been published', () => {
  const fixture = structuredClone(db)
  fixture.weekly_competition.cycles[1].weeks.forEach(week => { week.status = 'PUBLISHED' })
  const history = buildWeeklyOverview(fixture, { weekId: 'sample-cycle-1-w1' })
  assert.equal(history.week.week_number, 1)
  assert.equal(history.focus.state, 'complete')
  assert.deepEqual(history.standings, buildWeeklyOverview(fixture).standings)
})

test('a week awaiting result review takes priority over a later published week', () => {
  const fixture = structuredClone(db)
  fixture.weekly_competition.cycles[1].weeks[2].status = 'RESULT_REVIEW'
  assert.equal(buildWeeklyOverview(fixture).week.week_number, 3)
})
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
test('focus countdown runs for the coming week and never claims a live match', () => {
  const start = Date.parse('2026-10-31T11:00:00.000Z')
  assert.equal(formatMatchCountdown(start, start - (2 * 3600 + 30 * 60) * 1000, 'zh-CN').text, '距开赛 02:30:00')
  assert.equal(formatMatchCountdown('2026-10-31T11:00:00.000Z', start - (26 * 3600 + 5) * 1000, 'zh-CN').text, '距开赛 1 天 02:00:05')
  assert.equal(formatMatchCountdown(start, start - (26 * 3600) * 1000, 'en-US').text, 'Starts in 1d 02:00:00')
  assert.equal(formatMatchCountdown(start, start - COUNTDOWN_WINDOW_MS - 1000, 'zh-CN'), null)
  assert.deepEqual(formatMatchCountdown(start, start, 'zh-CN'), { done: true, text: '已到开赛时间' })
  assert.equal(formatMatchCountdown(start, start + 60000, 'zh-CN').done, true)
  for (const value of [null, '', 'TBD']) assert.equal(formatMatchCountdown(value, start, 'zh-CN'), null)
})
test('票 2.46: the confirmation deadline counts down, then says it has closed', () => {
  const deadline = Date.parse('2026-10-30T04:00:00.000Z')
  assert.equal(formatMatchCountdown(deadline, deadline - (2 * 3600 + 30 * 60) * 1000, 'zh-CN', 'deadline').text, '距截止 02:30:00')
  assert.equal(formatMatchCountdown(deadline, deadline - (26 * 3600) * 1000, 'en-US', 'deadline').text, 'Closes in 1d 02:00:00')
  assert.deepEqual(formatMatchCountdown(deadline, deadline, 'zh-CN', 'deadline'), { done: true, text: '已截止' })
  assert.equal(formatMatchCountdown(deadline, deadline - 1000, 'zh-CN').text, '距开赛 00:00:01', 'match countdowns keep their wording')
})
test('票 2.46: the open confirmation is read from the public snapshot by time alone', () => {
  const registration = { week_number: 1, status: 'CONFIRMATION_OPEN', cycle_name: '第二周期', opens_at: '2026-10-26T04:00:00.000Z', closes_at: '2026-10-30T04:00:00.000Z' }
  const snapshot = { weekly_competition: { registration } }
  assert.equal(openWeeklyConfirmation(snapshot, Date.parse('2026-10-26T03:59:00.000Z')), null, 'not open yet')
  assert.equal(openWeeklyConfirmation(snapshot, Date.parse('2026-10-28T00:00:00.000Z')).closesAt, Date.parse(registration.closes_at))
  assert.equal(openWeeklyConfirmation(snapshot, Date.parse(registration.closes_at)), null, 'closed at the deadline')
  assert.equal(openWeeklyConfirmation({ weekly_competition: {} }, Date.parse('2026-10-28T00:00:00.000Z')), null)
})
test('phase card leads with the live match and honours deadlines instead of the published status', () => {
  const now = Date.parse('2026-10-29T04:00:00.000Z')
  const fixture = structuredClone(db)
  assert.equal(buildWeeklyPhases(fixture, { now })[0].kind, 'live')
  fixture.weekly_competition.registration = { week_number: 4, status: 'CONFIRMATION_OPEN', opens_at: '2026-10-26T04:00:00.000Z', closes_at: '2026-10-30T04:00:00.000Z' }
  fixture.season = { ...(fixture.season || {}), rules: { registration: { enabled: true, closesAt: null } } }
  assert.deepEqual(buildWeeklyPhases(fixture, { now }).map(phase => phase.kind).filter(kind => kind !== 'matchweek'), ['live', 'confirmation', 'registration'])
  // Past the deadline the window is gone even though System still says CONFIRMATION_OPEN.
  assert.ok(!buildWeeklyPhases(fixture, { now: Date.parse('2026-10-30T05:00:00.000Z') }).some(phase => phase.kind === 'confirmation'))
  fixture.season.rules.registration.closesAt = '2026-10-25T15:59:00.000Z'
  assert.ok(!buildWeeklyPhases(fixture, { now }).some(phase => phase.kind === 'registration'))
})
test('票 2.22: a followed team shows its live, next or latest published match', () => {
  const rows = buildWeeklyFollowedTeams(db, ['FCW26-T001', 'NOT-A-TEAM'])
  assert.equal(rows.length, 1, 'unknown ids are dropped')
  const [row] = rows
  const own = match => [match.team_a, match.team_b].some(team => (team.id || team.team_id) === 'FCW26-T001')
  for (const key of ['live', 'next', 'latest']) if (row[key]) assert.ok(own(row[key].match), `${key} belongs to the team`)
  if (row.next) assert.equal(row.next.match.state, 'upcoming')
  if (row.latest) assert.ok(['complete', 'ruling'].includes(row.latest.match.state))
  assert.ok(row.live || row.next || row.latest, 'the fixture team has published matches')
  assert.deepEqual(buildWeeklyFollowedTeams(db, []), [])
})
console.log(`${checks} weekly overview checks passed.`)

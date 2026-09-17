import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'
import { buildWeeklyAdvance, resetWeeklyAdvanceSearch, weeklyPublishedRank, weeklyTeamMatch } from '../src/features/weekly-advance/weeklyAdvanceModel.js'
import { weeklyScore } from '../src/features/weekly-overview/weeklyOverviewModel.js'
import { getWeeklyNavigationPath } from '../src/components/layout/publicNavigation.js'
import { readReturnState } from '../src/lib/navigationState.js'

test('published order, ranks and ties are preserved without a new tiebreaker', () => {
  const db = buildWeeklyOverviewFixture()
  const published = db.weekly_competition.cycles[1].standings
  const model = buildWeeklyAdvance(db)
  assert.deepEqual(model.rows.map(row => row.standing), published.map(row => ({ ...row, team: db.teams.find(team => team.team_id === row.team_id) })))
  assert.deepEqual(model.rows.map(row => row.standing.display_rank), [1, 2, 3, 4, 4, 6])
  assert.equal(model.rows.filter(row => row.standing.tied).length, 2)
  assert.equal(model.selected.id, 'FCW26-T004')
})

test('live 3:0 stays live and does not change published points or played counts', () => {
  const model = buildWeeklyAdvance(buildWeeklyOverviewFixture(), { teamId: 'FCW26-T001' })
  assert.equal(model.selected.standing.points, 17)
  assert.equal(model.selected.standing.played, 2)
  const live = model.journey[2].fixtures[0]
  assert.equal(live.score, '3 : 0')
  assert.equal(live.match.state, 'live')
})

test('week context never turns published cycle totals into historical standings', () => {
  const db = buildWeeklyOverviewFixture()
  const first = buildWeeklyAdvance(db, { weekId: 'sample-cycle-1-w1' })
  const fourth = buildWeeklyAdvance(db, { weekId: 'sample-cycle-1-w4' })
  assert.deepEqual(first.rows, fourth.rows)
  assert.deepEqual(first.journey, fourth.journey)
  assert.equal(first.week.week_number, 1)
  assert.equal(fourth.week.week_number, 4)
})

test('team B scores are presented from the selected team perspective', () => {
  const model = buildWeeklyAdvance(buildWeeklyOverviewFixture(), { teamId: 'FCW26-T002' })
  const fixture = model.journey[2].fixtures[0]
  assert.equal(fixture.score, '0 : 3')
  assert.equal(fixture.opponent.short, 'AIP')
  assert.equal(fixture.own.short, 'REG')
  assert.equal(weeklyTeamMatch(fixture.match, 'other'), null)
})

test('pending fixtures use VS even if a stale score is present', () => {
  const match = { state: 'upcoming', team_a: { id: 'a', score: 0 }, team_b: { id: 'b', score: 0 } }
  assert.equal(weeklyTeamMatch(match, 'a').score, 'VS')
})

test('private, duplicate and cross-cycle references cannot enter a team journey', () => {
  const db = buildWeeklyOverviewFixture()
  const cycle = db.weekly_competition.cycles[1]
  cycle.weeks.push({ id: 'private', week_number: 5, status: 'DRAFT', match_ids: ['hidden'] })
  cycle.weeks[2].match_ids.push('raw-FCW26-W1-MP', 'raw-FCW26-W3-M1', 'raw-FCW26-W4-M1')
  db.matches.push({ ...db.matches[0], match_id: 'hidden', raw_match_id: 'raw-hidden', cycle_week_id: 'private' })
  const model = buildWeeklyAdvance(db, { teamId: 'FCW26-T001' })
  assert.equal(model.journey.length, 4)
  assert.equal(model.journey.flatMap(entry => entry.fixtures).length, 4)
})

test('a published week without a team match remains an empty week, with no inferred loss', () => {
  const db = buildWeeklyOverviewFixture()
  db.weekly_competition.cycles[1].weeks[3].match_ids = []
  const model = buildWeeklyAdvance(db, { teamId: 'FCW26-T001' })
  assert.equal(model.journey[3].fixtures.length, 0)
  assert.equal(model.selected.standing.losses, 0)
  assert.equal(model.selected.standing.points, 17)
})

test('Pilot keeps the disclosed team matches but suppresses any stray standings', () => {
  const db = buildWeeklyOverviewFixture()
  db.weekly_competition.cycles[0].standings = db.weekly_competition.cycles[1].standings
  const model = buildWeeklyAdvance(db, { cycleId: 'sample-pilot', teamId: 'FCW26-T004' })
  assert.equal(model.hasStandings, false)
  assert.equal(model.publishedCount, 0)
  assert.deepEqual(model.rows.map(row => row.id), ['FCW26-T001', 'FCW26-T002'])
  assert.ok(model.rows.every(row => row.standing === null))
  assert.equal(model.journey[0].fixtures[0].match.id, 'FCW26-W1-MP')
  assert.equal(model.activeStage, null)
})

test('public matches without standings remain browsable without manufactured points', () => {
  const db = buildWeeklyOverviewFixture()
  db.weekly_competition.cycles[1].standings = []
  const model = buildWeeklyAdvance(db)
  assert.equal(model.rows.length, 6)
  assert.equal(model.hasStandings, false)
  assert.equal(model.selected.standing, null)
})

test('a team missing from the standings is appended as unranked in published match order', () => {
  const db = buildWeeklyOverviewFixture()
  db.weekly_competition.cycles[1].standings = db.weekly_competition.cycles[1].standings.slice(0, 2)
  const model = buildWeeklyAdvance(db, { teamId: 'FCW26-T001' })
  assert.equal(model.publishedCount, 2)
  assert.equal(model.totalTeams, 6)
  assert.equal(model.selected.standing, null)
  assert.deepEqual(model.rows.slice(0, 2).map(row => row.standing.display_rank), [1, 2])
})

test('full-width search and normalized favorite IDs work together', () => {
  const model = buildWeeklyAdvance(buildWeeklyOverviewFixture(), { query: 'ａｉｐ', followedOnly: true, followedTeamIds: ['fcw26-t001'] })
  assert.equal(model.rows.length, 1)
  assert.equal(model.selected.id, 'FCW26-T001')
  assert.equal(buildWeeklyAdvance(buildWeeklyOverviewFixture(), { query: '研究生' }).selected.id, 'FCW26-T003')
})

test('empty filters clear the visible selection instead of showing a hidden team', () => {
  const model = buildWeeklyAdvance(buildWeeklyOverviewFixture(), { teamId: 'FCW26-T001', followedOnly: true })
  assert.equal(model.rows.length, 0)
  assert.equal(model.selected, null)
  assert.deepEqual(model.journey, [])
})

test('reset clears only filters, retaining cycle, return week, selection and language', () => {
  const params = new URLSearchParams('cycle=c1&week=w2&teamId=a&lang=en&query=zzz&followed=1')
  assert.equal(resetWeeklyAdvanceSearch(params).toString(), 'cycle=c1&week=w2&teamId=a&lang=en')
  assert.equal(params.get('query'), 'zzz')
})

test('missing and zero values remain distinct; zero is not a published rank', () => {
  assert.equal(weeklyScore(0), '0')
  for (const value of [null, undefined, '', true, -1, Infinity]) assert.equal(weeklyScore(value), '—')
  assert.equal(weeklyPublishedRank(0), '—')
  assert.equal(weeklyPublishedRank(4), '4')
})

test('cycle state marks only its known stage and never infers Major or qualification', () => {
  const db = buildWeeklyOverviewFixture()
  const cycle = db.weekly_competition.cycles[1]
  assert.equal(buildWeeklyAdvance(db).activeStage, 'points')
  cycle.status = 'PLAYOFFS'
  assert.equal(buildWeeklyAdvance(db).activeStage, 'playoffs')
  cycle.status = 'CLOSED'
  const model = buildWeeklyAdvance(db)
  assert.equal(model.activeStage, null)
  assert.ok(model.rows.every(row => !('qualified' in row) && !('eliminated' in row)))
})

test('absent supported public data returns an empty cycle', () => {
  const model = buildWeeklyAdvance({})
  assert.equal(model.cycle, null)
  assert.equal(model.selected, null)
  assert.equal(model.totalTeams, 0)
})

test('weekly navigation preserves cycle and team between standings and schedule only', () => {
  const query = 'cycle=c1&week=all&teamId=a&query=zzz&status=live'
  assert.equal(getWeeklyNavigationPath('/advance', query, true), '/advance?cycle=c1&week=all&teamId=a')
  assert.equal(getWeeklyNavigationPath('/matches', query, true), '/matches?cycle=c1&week=all&teamId=a')
  assert.equal(getWeeklyNavigationPath('/', query, true), '/?cycle=c1')
  assert.equal(getWeeklyNavigationPath('/advance', query, false), '/advance')
})

test('match details can safely return to an internal advancement path', () => {
  const state = { returnTo: '/advance?cycle=c1&teamId=a', returnScrollY: 532 }
  assert.deepEqual(readReturnState(state, { allowedPrefixes: ['/advance'] }), state)
  assert.equal(readReturnState({ returnTo: 'https://other.test/advance' }, { allowedPrefixes: ['/advance'] }).returnTo, '')
})

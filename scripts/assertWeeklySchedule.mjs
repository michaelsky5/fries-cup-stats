import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'
import { buildWeeklySchedule, resetWeeklyScheduleSearch, weeklyMatchDay } from '../src/features/match-schedule/weeklyScheduleModel.js'
import { getWeeklyNavigationPath } from '../src/components/layout/publicNavigation.js'
import { getScheduleReturnLabel } from '../src/features/match-schedule/schedulePresentation.js'
import { weeklyMapSlots } from '../src/features/weekly-overview/weeklyOverviewModel.js'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { getMatchReviewProgress, getMatchReviewMvp } from '../src/lib/matchReviewSelectors.js'
const rows = model => model.entries.flatMap(entry => entry.matches)

test('default schedule uses the active published week, not a later pending fixture', () => {
  const model = buildWeeklySchedule(buildWeeklyOverviewFixture())
  assert.equal(model.selectedWeekId, 'sample-cycle-1-w3')
  assert.equal(model.total, 3)
  assert.deepEqual(model.counts, { all: 3, live: 1, upcoming: 1, final: 1, review: 0, changed: 0, unknown: 0 })
})
test('whole-cycle schedule is grouped by published weeks and never includes Pilot', () => {
  const model = buildWeeklySchedule(buildWeeklyOverviewFixture(), { weekId: 'all' })
  assert.equal(model.total, 12)
  assert.deepEqual(model.entries.map(entry => entry.week.week_number), [1, 2, 3, 4])
  assert.ok(rows(model).every(match => match.cycle_id === 'sample-cycle-1'))
})
test('stale selections recover within the chosen cycle', () => {
  const model = buildWeeklySchedule(buildWeeklyOverviewFixture(), { cycleId: 'sample-pilot', weekId: 'sample-cycle-1-w4' })
  assert.equal(model.selectedWeekId, 'sample-pilot-w1')
  assert.equal(model.resultCount, 1)
  assert.equal(model.isPilot, true)
})
test('private, unlisted, duplicate and cross-week matches cannot leak into the schedule', () => {
  const db = buildWeeklyOverviewFixture()
  const cycle = db.weekly_competition.cycles[1]
  cycle.weeks.push({ id: 'private', week_number: 5, status: 'DRAFT', match_ids: ['hidden'] })
  cycle.weeks[2].match_ids.push('raw-FCW26-W1-MP', 'raw-FCW26-W3-M1', 'raw-FCW26-W4-M1')
  db.matches.push({ ...db.matches[0], match_id: 'hidden', raw_match_id: 'raw-hidden', cycle_week_id: 'private' })
  const model = buildWeeklySchedule(db, { weekId: 'all' })
  assert.equal(model.total, 12)
  assert.equal(model.weeks.length, 4)
})
test('RR5 3:0 remains live, with only three recorded maps', () => {
  const model = buildWeeklySchedule(buildWeeklyOverviewFixture(), { status: 'live' })
  assert.equal(model.resultCount, 1)
  const match = rows(model)[0]
  assert.equal(match.team_b.score, 0)
  assert.equal(weeklyMapSlots(match).length, 5)
  assert.equal(weeklyMapSlots(match).filter(map => map.state === 'recorded').length, 3)
})
test('search normalizes full-width names and matches full team names', () => {
  assert.equal(buildWeeklySchedule(buildWeeklyOverviewFixture(), { query: 'ａｉｐ' }).resultCount, 1)
  assert.equal(buildWeeklySchedule(buildWeeklyOverviewFixture(), { query: '研究生' }).resultCount, 1)
  assert.equal(buildWeeklySchedule(buildWeeklyOverviewFixture(), { query: 'apes regret' }).resultCount, 1)
})
test('team and followed filters intersect with status without hiding other status counts', () => {
  const model = buildWeeklySchedule(buildWeeklyOverviewFixture(), { weekId: 'all', teamId: 'FCW26-T001', followedOnly: true, followedTeamIds: ['FCW26-T001'], status: 'live' })
  assert.equal(model.counts.all, 4)
  assert.equal(model.counts.final, 2)
  assert.equal(model.resultCount, 1)
  assert.equal(model.entries[0].days[0].matches[0].followed, true)
})
test('no followed teams yields a real empty result', () => {
  const model = buildWeeklySchedule(buildWeeklyOverviewFixture(), { followedOnly: true })
  assert.equal(model.total, 3)
  assert.equal(model.resultCount, 0)
  assert.equal(model.hasFilters, true)
})
test('stored normalized favorite IDs match the public team IDs', () => {
  const model = buildWeeklySchedule(buildWeeklyOverviewFixture(), { followedOnly: true, followedTeamIds: ['fcw26-t001'] })
  assert.equal(model.resultCount, 1)
  assert.equal(rows(model)[0].team_a.short, 'AIP')
})
test('review, postponed, cancelled, ruling and unknown remain separate from live or normal finals', () => {
  const db = buildWeeklyOverviewFixture()
  const statuses = ['RESULT_REVIEW', 'POSTPONED', 'CANCELLED', 'ADMIN_COMPLETED', 'MYSTERY']
  statuses.forEach((status, index) => { db.matches[index].status = status })
  const model = buildWeeklySchedule(db, { weekId: 'all' })
  assert.equal(model.counts.review, 1)
  assert.equal(model.counts.changed, 2)
  assert.equal(model.counts.unknown, 1)
  assert.equal(model.counts.final, 3)
  assert.equal(buildWeeklySchedule(db, { weekId: 'all', status: 'changed' }).resultCount, 2)
})
test('dates group in UTC+8; missing dates go last without invented exact times', () => {
  assert.equal(weeklyMatchDay({ scheduled_at: '2026-09-12T18:00:00Z' }), '2026-09-13')
  assert.equal(weeklyMatchDay({ scheduled_at: null }), 'tbd')
  assert.equal(weeklyMatchDay({ scheduled_at: 'invalid' }), 'tbd')
  const model = buildWeeklySchedule(buildWeeklyOverviewFixture(), { weekId: 'sample-cycle-1-w4' })
  assert.equal(model.entries[0].days.at(-1).day, 'tbd')
  assert.equal(model.entries[0].days.at(-1).matches[0].team_a.score, '')
})
test('no supported public snapshot remains an explicit empty schedule', () => {
  const model = buildWeeklySchedule({ matches: [{ match_id: 'private', status: 'LIVE' }] })
  assert.equal(model.resultCount, 0)
  assert.equal(model.cycles.length, 0)
})
test('reset removes filters while retaining event, language and period', () => {
  const params = resetWeeklyScheduleSearch('season=FCW2026&design=kpr5&lang=en&cycle=c1&week=w2&query=aip&teamId=t1&status=live&followed=1')
  assert.deepEqual(Object.fromEntries(params), { season: 'FCW2026', design: 'kpr5', lang: 'en', cycle: 'c1', week: 'w2' })
})
test('overview and schedule navigation retains period only for weekly events', () => {
  const search = '?cycle=c1&week=w2&query=aip'
  assert.equal(getWeeklyNavigationPath('/matches', search, true), '/matches?cycle=c1&week=w2')
  assert.equal(getWeeklyNavigationPath('/', search, true), '/?cycle=c1&week=w2')
  assert.equal(getWeeklyNavigationPath('/', '?cycle=c1&week=all', true), '/?cycle=c1')
  assert.equal(getWeeklyNavigationPath('/leaderboard', search, true), '/leaderboard')
  assert.equal(getWeeklyNavigationPath('/matches', search, false), '/matches')
})
test('match details offer a weekly return without changing archive or other page labels', () => {
  assert.equal(getScheduleReturnLabel('/matches?cycle=c1&week=w3'), '返回周赛赛程')
  assert.equal(getScheduleReturnLabel('/matches?cycle=c1&week=all&status=live', 'en-US'), 'Back to weekly schedule')
  assert.equal(getScheduleReturnLabel('/matches?view=list'), '返回完整赛程')
  assert.equal(getScheduleReturnLabel('/teams/a?cycle=c1'), '')
})

test('weekly detail preserves live scores and recorded maps without declaring a winner or a rating', () => {
  const dossier = getMatchDossier(buildWeeklyOverviewFixture(), 'FCW26-W3-M1')
  assert.equal(dossier.scoreLabel, '3 : 0')
  assert.equal(dossier.state.isLive, true)
  assert.equal(dossier.state.isComplete, false)
  assert.equal(dossier.winnerSide, '')
  assert.equal(dossier.mapRecords.filter(map => map.hasResult).length, 3)
  assert.deepEqual(getMatchReviewProgress(dossier).map(map => map.cumulative), ['1:0', '2:0', '3:0'])
  assert.equal(dossier.rating.supported, false)
  assert.equal(getMatchReviewMvp(dossier), null)
})
test('weekly review keeps published provisional scores, while upcoming and cancelled records hide results', () => {
  const db = buildWeeklyOverviewFixture()
  const match = db.matches.find(match => match.match_id === 'FCW26-W3-M1')
  match.status = 'RESULT_REVIEW'
  let dossier = getMatchDossier(db, match.match_id)
  assert.equal(dossier.statusLabel, '结果待审核')
  assert.equal(dossier.statusEn, 'UNDER REVIEW')
  assert.equal(dossier.scoreLabel, '3 : 0')
  assert.equal(dossier.winnerSide, '')
  assert.equal(dossier.rating.supported, false)
  for (const status of ['PENDING', 'CANCELLED', 'POSTPONED']) {
    match.status = status
    dossier = getMatchDossier(db, match.match_id)
    assert.equal(dossier.scoreLabel, 'VS')
    assert.equal(dossier.winnerSide, '')
    assert.ok(dossier.mapRecords.every(map => !map.hasResult))
  }
})
test('an administrative ending is not silently relabeled as a forfeit', () => {
  const db = buildWeeklyOverviewFixture()
  const match = db.matches.find(match => match.match_id === 'FCW26-W3-M1')
  match.status = 'ADMIN_COMPLETED'
  const dossier = getMatchDossier(db, match.match_id)
  assert.equal(dossier.state.isForfeit, false)
  assert.equal(dossier.statusLabel, '判定结束')
  assert.equal(dossier.state.isUpcoming, false)
  assert.equal(dossier.rating.supported, false)
})
test('unplayed map placeholders cannot add a result to a live series', () => {
  const db = buildWeeklyOverviewFixture()
  const match = db.matches.find(match => match.match_id === 'FCW26-W3-M1')
  match.maps.push({ map_order: 4, map_name: '新皇后街', score_a: 0, score_b: 0 })
  const dossier = getMatchDossier(db, match.match_id)
  assert.equal(dossier.mapRecords.length, 4)
  assert.equal(dossier.mapRecords[3].hasResult, false)
  assert.equal(dossier.mapRecords[3].scoreA, '—')
  assert.equal(getMatchReviewProgress(dossier)[3].cumulative, '—')
})

test('RR5 forfeits preserve actual maps and their progress, not unplayed or awarded placeholders', () => {
  const db = buildWeeklyOverviewFixture()
  const match = db.matches.find(match => match.match_id === 'FCW26-W3-M1')
  Object.assign(match, { status: 'COMPLETE', result_mode: 'FORFEIT', winner: match.team_b.name })
  match.maps[0].match_time = '00:00'
  match.maps.push(
    { map_order: 4, map_name: '新皇后街', score_a: 0, score_b: 0 },
    { map_order: 5, map_name: '苏拉瓦萨', status: 'COMPLETE', is_administrative: true, winner: match.team_b.id, score_a: 0, score_b: 1 }
  )
  const dossier = getMatchDossier(db, match.match_id)
  assert.equal(dossier.statusEn, 'FORFEIT')
  assert.equal(dossier.mapRecords.length, 3)
  assert.equal(dossier.mapCountLabel, '3')
  assert.equal(dossier.mapRecords[0].matchTime, '')
  assert.deepEqual(getMatchReviewProgress(dossier).map(map => map.cumulative), ['1:0', '2:0', '3:0'])
  assert.equal(dossier.scoreLabel, '3 : 0', 'the played score is preserved even when the leading team forfeits')
  assert.equal(dossier.winnerSide, 'B', 'the declared ruling determines the series winner')
  assert.equal(dossier.rating.supported, false)
  assert.equal(getMatchReviewMvp(dossier), null)
  assert.ok(dossier.maps.slice(3).every(map => !map.hasResult && !map.hasStats))

  match.maps[1].winner = 'DRAW'
  match.maps[1].score_a = match.maps[1].score_b = 1
  assert.deepEqual(getMatchReviewProgress(getMatchDossier(db, match.match_id)).map(map => map.cumulative), ['1:0', '1:0', '2:0'])
})

test('weekly rulings do not infer a winner from the score when the ruling winner is absent', () => {
  const db = buildWeeklyOverviewFixture()
  const match = db.matches.find(match => match.match_id === 'FCW26-W3-M1')
  for (const status of ['FORFEIT', 'ADMIN_COMPLETED']) {
    match.status = status
    match.winner = null
    assert.equal(getMatchDossier(db, match.match_id).winnerSide, '')
    match.winner = match.team_b.id
    assert.equal(getMatchDossier(db, match.match_id).winnerSide, 'B')
  }
})

test('a pre-match weekly forfeit exposes no fake maps or zero-zero played score', () => {
  const db = buildWeeklyOverviewFixture()
  const match = db.matches.find(match => match.match_id === 'FCW26-W3-M1')
  Object.assign(match, { status: 'FORFEIT', winner: match.team_a.id, maps: [] })
  match.team_a.score = match.team_b.score = ''
  const dossier = getMatchDossier(db, match.match_id)
  assert.equal(dossier.hasMapRecords, false)
  assert.equal(dossier.scoreLabel, '- : -')
  assert.equal(dossier.winnerSide, 'A')
  assert.deepEqual(getMatchReviewProgress(dossier), [])
})

test('weekly participants enter the current room by its raw ID; archive matches keep their existing room', () => {
  const db = buildWeeklyOverviewFixture()
  const match = db.matches.find(match => match.match_id === 'FCW26-W3-M1')
  assert.equal(getMatchDossier(db, match.match_id).roomPath, '/me/matches/raw-FCW26-W3-M1/room')
  delete match.raw_match_id
  assert.equal(getMatchDossier(db, match.match_id).roomPath, '/me?section=matches')
  delete match.cycle_week_id
  match.stage = 'PLAYOFFS'
  assert.equal(getMatchDossier(db, match.match_id).roomPath, '/matches/FCW26-W3-M1/room')
})

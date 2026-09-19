import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { getMatchReviewProgress } from '../src/lib/matchReviewSelectors.js'
import { getMatchPhasePresentation, getWeeklyMatchPeriod } from '../src/components/matches/detail/matchPhasePresentation.js'

const LIVE_ID = 'FCW26-W3-M1'
function scenario(id = LIVE_ID, edit = () => {}, locale = 'zh-CN') {
  const db = buildWeeklyOverviewFixture()
  const match = db.matches.find(item => item.match_id === id)
  edit(match, db)
  const dossier = getMatchDossier(db, id, { locale })
  const phase = getMatchPhasePresentation(dossier, getMatchReviewProgress(dossier), locale)
  return { db, match, dossier, phase }
}

test('a live RR5 at 3:0 retains all five places and never invents the current map', () => {
  const { dossier, phase } = scenario()
  assert.equal(phase.key, 'live')
  assert.equal(dossier.scoreLabel, '3 : 0')
  assert.deepEqual(phase.slots.map(slot => slot.state), ['recorded', 'recorded', 'recorded', 'pending', 'pending'])
  assert.deepEqual(phase.records.map(map => map.cumulative), ['1:0', '2:0', '3:0'])
  assert.equal(phase.slots[3].record, undefined)
  assert.equal(phase.slots[3].name, '地图待公布')
  assert.equal(phase.canAnalyze, false)
  assert.equal(dossier.winnerSide, '')
})

test('only an explicitly live map is highlighted; its zero scores are not a published result', () => {
  const { phase } = scenario(LIVE_ID, match => {
    match.maps.push({ map_order: 4, map_name: '新皇后街', map_type: 'PUSH', status: 'IN_PROGRESS', score_a: 0, score_b: 0, player_stats: [] })
  })
  assert.equal(phase.slots[3].state, 'live')
  assert.equal(phase.slots[3].name, '新皇后街')
  assert.equal(phase.slots[3].record, undefined)
  assert.equal(phase.recordedCount, 3)
})

test('an unplayed placeholder keeps its published map name without becoming a 0:0 result', () => {
  const { phase } = scenario(LIVE_ID, match => {
    match.maps.push({ map_order: 4, map_name: '新皇后街', map_type: 'PUSH', status: 'PENDING', score_a: 0, score_b: 0, player_stats: [] })
  })
  assert.equal(phase.slots[3].state, 'pending')
  assert.equal(phase.slots[3].name, '新皇后街')
  assert.equal(phase.recordedCount, 3)
})

test('five records still await a final state instead of declaring an MVP or series winner', () => {
  const { dossier, phase } = scenario('FCW26-W3-M2', match => { match.status = 'IN_PROGRESS' })
  assert.equal(phase.recordedCount, 5)
  assert.equal(phase.key, 'live')
  assert.match(phase.caption, /状态仍为进行中/)
  assert.equal(phase.canAnalyze, false)
  assert.equal(dossier.winnerSide, '')
})

test('under-review scores and map records remain provisional, not final analysis', () => {
  const { dossier, phase } = scenario(LIVE_ID, match => { match.status = 'RESULT_REVIEW' }, 'en-US')
  assert.equal(phase.key, 'review')
  assert.equal(phase.scoreTitle, 'SCORE UNDER REVIEW')
  assert.equal(dossier.scoreLabel, '3 : 0')
  assert.equal(phase.recordedCount, 3)
  assert.equal(phase.canAnalyze, false)
})

test('upcoming dates never start a match automatically or display stored placeholder scores', () => {
  for (const scheduled_at of ['2020-01-01T00:00:00Z', '2030-01-01T00:00:00Z']) {
    const { dossier, phase } = scenario(LIVE_ID, match => { match.status = 'PENDING'; match.scheduled_at = scheduled_at })
    assert.equal(phase.key, 'upcoming')
    assert.equal(dossier.scoreLabel, 'VS')
    assert.equal(phase.records.length, 0)
    assert.equal(phase.slots.length, 5)
    assert.ok(phase.slots.every(slot => slot.state === 'pending' && !slot.record))
  }
})

test('missing and synthetic times stay explicitly unknown, with dates formatted in UTC+8', () => {
  assert.equal(scenario('FCW26-W4-M2').phase.scheduleLabel, '时间待定')
  const dateOnly = scenario(LIVE_ID, match => { match.scheduled_at = '2026-09-12T18:00:00Z'; match.schedule_meta = { syntheticSortTime: true } })
  assert.match(dateOnly.phase.scheduleLabel, /09\/13/)
  assert.match(dateOnly.phase.scheduleLabel, /时间待定/)
  assert.doesNotMatch(dateOnly.phase.scheduleLabel, /02:00/)
  const exact = scenario(LIVE_ID, match => { match.scheduled_at = '2026-09-12T18:00:00Z' })
  assert.match(exact.phase.scheduleLabel, /09\/13.*02:00/)
  const noTime = scenario(LIVE_ID, match => { match.schedule_meta = { exactTime: false } }, 'en-US')
  assert.match(noTime.phase.scheduleLabel, /Time TBD/)
  assert.equal(scenario(LIVE_ID, match => { match.scheduled_at = 'invalid' }).phase.scheduleLabel, '时间待定')
})

test('postponed, cancelled and unknown statuses do not imply play or a final score', () => {
  const postponed = scenario(LIVE_ID, match => { match.status = 'POSTPONED' })
  assert.equal(postponed.phase.key, 'postponed')
  assert.match(postponed.phase.scheduleLabel, /^原定 /)
  assert.equal(postponed.dossier.scoreLabel, 'VS')
  for (const status of ['CANCELLED', 'VOID', 'MYSTERY']) {
    const { phase } = scenario(LIVE_ID, match => { match.status = status })
    assert.equal(phase.slots.length, 0)
    assert.equal(phase.records.length, 0)
    assert.equal(phase.liveStreams.length, 0)
    assert.equal(phase.canAnalyze, false)
  }
})

test('forfeit and administrative endings preserve their own final meanings', () => {
  for (const [status, key] of [['FORFEIT', 'forfeit'], ['ADMIN_COMPLETED', 'ruling']]) {
    const { phase } = scenario(LIVE_ID, match => { match.status = status })
    assert.equal(phase.key, key)
    assert.equal(phase.active, false)
    assert.equal(phase.slots.length, 0)
    assert.equal(phase.canAnalyze, false)
    assert.equal(phase.liveStreams.length, 0)
  }
})

test('broadcast staff comes from published data and missing broadcasts stay empty', () => {
  const { dossier, phase } = scenario()
  assert.equal(phase.liveStreams[0].url, 'https://example.com/fries-cup-design-preview')
  assert.deepEqual(dossier.broadcast.staffGroups.map(group => group.role), ['CASTER', 'REFEREE'])
  const missing = scenario('FCW26-W3-M3')
  assert.deepEqual(missing.phase.liveStreams, [])
  assert.deepEqual(missing.dossier.broadcast.staffGroups, [])
})

test('watch-live actions exclude archive, replay and non-web links', () => {
  const { dossier } = scenario()
  dossier.broadcast.streamLinks = [
    { url: 'https://example.com/live' }, { url: 'https://example.com/replay', kind: 'replay' },
    { url: 'https://example.com/archive', kind: 'archive' }, { url: 'javascript:alert(1)' }, { url: 'invalid' }
  ]
  assert.deepEqual(getMatchPhasePresentation(dossier).liveStreams.map(link => link.url), ['https://example.com/live'])
})

test('weekly detail links identify only the public cycle and the week containing this match', () => {
  const { db, match } = scenario()
  assert.equal(getWeeklyMatchPeriod(db, match).week.id, 'sample-cycle-1-w3')
  assert.equal(getWeeklyMatchPeriod(db, { ...match, cycle_id: 'sample-pilot' }), null)
  assert.equal(getWeeklyMatchPeriod(db, { ...match, cycle_week_id: 'sample-cycle-1-w4' }), null)
  const cycle = db.weekly_competition.cycles[1]
  cycle.weeks[2].status = 'DRAFT'
  assert.equal(getWeeklyMatchPeriod(db, match), null)
  cycle.weeks[2].status = 'IN_PROGRESS'
  cycle.status = 'DRAFT'
  assert.equal(getWeeklyMatchPeriod(db, match), null)
  assert.equal(getWeeklyMatchPeriod({}, match), null)
})

test('non-RR5 events only show their published map slots', () => {
  const { phase } = scenario(LIVE_ID, match => { match.format = 'FT3' })
  assert.equal(phase.rr5, false)
  assert.equal(phase.slots.length, 3)
  assert.doesNotMatch(phase.caption, /五局/)
})

test('completed archive matches retain their full analysis and recorded maps', () => {
  const db = JSON.parse(fs.readFileSync('public/data/fcr2026_local_public.json', 'utf8'))
  const dossier = db.matches.map(match => getMatchDossier(db, match.match_id)).find(item => item?.state.isComplete && !item.state.isForfeit && item.statsMapCount > 0)
  assert.ok(dossier)
  const progress = getMatchReviewProgress(dossier)
  const phase = getMatchPhasePresentation(dossier, progress)
  assert.equal(phase.active, false)
  assert.equal(phase.key, 'complete')
  assert.equal(phase.canAnalyze, true)
  assert.equal(phase.slots.length, 0)
  assert.equal(phase.recordedCount, progress.length)
  assert.equal(phase.liveStreams.length, 0)
  assert.equal(dossier.roomPath, null, 'archives must not link to the retired room')
})

test('weekly public details route by the raw System ID without inventing an account match ID', () => {
  const { dossier, match, db } = scenario(LIVE_ID, match => { match.raw_match_id = 'system-match-42' })
  assert.equal(dossier.roomPath, '/me/matches/system-match-42/room')
  delete match.raw_match_id
  assert.equal(getMatchDossier(db, LIVE_ID).roomPath, '/me?section=matches')
})

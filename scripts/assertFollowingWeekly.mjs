import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'
import { buildFollowingFeed } from '../src/features/following/followingFeedModel.js'
import { getFollowingBriefing } from '../src/features/following/followingBriefingModel.js'
import { getFollowingTeamSummaries } from '../src/features/following/followingTeamSummary.js'
import { getFollowingView, updateFollowingSearch } from '../src/features/following/followingViewModel.js'
import { createFollowingObservation, followingObservationKey, getFollowingChanges } from '../src/features/following/followingObservationModel.js'
import { followingMatchPath } from '../src/features/following/followingMatchPresentation.js'

const season = { id: 'FCW2026', lifecycle: 'ACTIVE', rules: { weeklyCompetition: { enabled: true } } }
const favorites = { favoriteTeamIds: ['AIP', 'REG', 'ECNU'], favoritePlayerIds: [] }
const feed = (db, cycleId, locale = 'zh-CN') => buildFollowingFeed(db, favorites, { season, cycleId, locale, now: Date.parse('2030-01-01') })
const liveId = 'FCW26-W3-M1'
const changeLive = (db, status) => { db.matches.find(match => match.match_id === liveId).status = status; return db }

test('only the selected public cycle contributes matches; unknown cycle uses the public default', () => {
  const db = buildWeeklyOverviewFixture()
  const active = feed(db)
  assert.equal(active.weekly.cycle.id, 'sample-cycle-1')
  assert.ok(active.matches.every(match => match.cycleId === 'sample-cycle-1'))
  assert.equal(active.matches.some(match => match.id === 'FCW26-W1-MP'), false)
  assert.equal(feed(db, 'sample-pilot').matches.length, 1)
  assert.equal(feed(db, 'private').weekly.cycle.id, active.weekly.cycle.id)
  db.matches.push({ ...db.matches[0], id: 'unlisted', match_id: 'unlisted', raw_match_id: 'raw-unlisted' })
  assert.equal(feed(db).matches.some(match => match.id === 'unlisted'), false)
})

test('RR5 3:0 remains live, exactly five slots preserve missing maps and published wins', () => {
  const item = feed(buildWeeklyOverviewFixture()).groups.live[0]
  assert.equal(item.id, liveId)
  assert.equal(item.presentation.score, '3 : 0')
  assert.equal(item.presentation.slots.length, 5)
  assert.equal(item.presentation.slots.filter(slot => slot.record).length, 3)
  assert.deepEqual(item.presentation.slots.slice(3).map(slot => slot.state), ['pending', 'pending'])
  assert.equal(item.stage, '第 3 周')
  assert.equal(followingMatchPath(item), '/matches/FCW26-W3-M1?cycle=sample-cycle-1&week=sample-cycle-1-w3')
  assert.equal(followingMatchPath(item, 2), '/matches/FCW26-W3-M1?cycle=sample-cycle-1&week=sample-cycle-1-w3&map=2#map-2')
})

test('weekly pending state remains pending play after its date passes, with no invented results', () => {
  const db = changeLive(buildWeeklyOverviewFixture(), 'PENDING')
  const item = feed(db).matches.find(match => match.id === liveId)
  assert.equal(item.group, 'upcoming')
  assert.equal(item.presentation.score, 'VS')
  assert.ok(item.presentation.slots.every(slot => !slot.record && slot.state === 'pending'))
})

test('review stays visible and never looks like a settled result', () => {
  const model = feed(changeLive(buildWeeklyOverviewFixture(), 'RESULT_REVIEW'))
  const item = model.groups.review[0]
  assert.equal(item.id, liveId)
  assert.equal(item.presentation.label, '结果待审核')
  assert.equal(item.presentation.scoreLabel, '待审核比分')
  assert.equal(getFollowingBriefing(model).lead.id, liveId)
  assert.equal(getFollowingView(model, 'followState=review').entries.length, 1)
})

test('cancellation, postponement, ruling and unknown status keep distinct public meanings', () => {
  for (const [status, group, label, score] of [
    ['CANCELLED', 'cancelled', '已取消', 'VS'], ['POSTPONED', 'postponed', '已延期', 'VS'],
    ['FORFEIT', 'results', '弃权', '3 : 0'], ['ADMIN_COMPLETED', 'results', '判定结束', '3 : 0'],
    ['UNRECOGNIZED', 'pending', '状态待更新', 'VS']
  ]) {
    const item = feed(changeLive(buildWeeklyOverviewFixture(), status)).matches.find(match => match.id === liveId)
    assert.equal(item.group, group, status)
    assert.equal(item.presentation.label, label, status)
    assert.equal(item.presentation.score, score, status)
    assert.ok(item.presentation.slots.every(slot => !slot.record), status)
  }
})

test('published points and ties are preserved without adding the live score', () => {
  const db = buildWeeklyOverviewFixture()
  const model = feed(db)
  const summaries = getFollowingTeamSummaries(db, season, model.teams, 'zh-CN', model.weekly.cycle.id)
  assert.equal(summaries.get('AIP').label, '17 分')
  assert.match(summaries.get('AIP').zone, /第 3 名.*已赛 2 场/)
  assert.match(summaries.get('REG').zone, /并列第 4 名/)
  assert.match(summaries.get('AIP').advanceHref, /cycle=sample-cycle-1&teamId=FCW26-T001/)
})

test('pilot and absent published data never create zero points or Swiss ranks', () => {
  const db = buildWeeklyOverviewFixture()
  const pilot = feed(db, 'sample-pilot')
  assert.equal(pilot.archived, true)
  assert.equal(getFollowingTeamSummaries(db, season, pilot.teams, 'zh-CN', 'sample-pilot').get('AIP').label, '不计积分')
  delete db.weekly_competition
  assert.equal(feed(db).matches.length, 0)
  const summary = getFollowingTeamSummaries(db, season, pilot.teams, 'zh-CN').get('AIP')
  assert.equal(summary.label, '—')
  assert.doesNotMatch(summary.zone, /瑞士|第 1 名/)
})

test('switching cycle resets state pagination but preserves following, language and design', () => {
  const params = updateFollowingSearch('season=FCW2026&lang=en&design=kpr5&follow=team:AIP&followState=live&followLimit=18&week=old', { cycleId: 'sample-pilot' })
  assert.equal(params.get('follow'), 'team:AIP')
  assert.equal(params.get('lang'), 'en')
  assert.equal(params.get('design'), 'kpr5')
  assert.equal(params.get('cycle'), 'sample-pilot')
  assert.equal(params.has('followState') || params.has('followLimit') || params.has('week'), false)
})

test('viewing history is isolated by cycle and still reports a real review transition', () => {
  const db = buildWeeklyOverviewFixture()
  const options = { seasonId: season.id, accountId: 'guest', db }
  const active = createFollowingObservation(feed(db), options)
  const pilot = createFollowingObservation(feed(db, 'sample-pilot'), options)
  assert.notEqual(followingObservationKey(season.id, 'guest', active.cycleId), followingObservationKey(season.id, 'guest', pilot.cycleId))
  assert.deepEqual(getFollowingChanges(active, pilot).updates, [])
  changeLive(db, 'RESULT_REVIEW')
  assert.ok(getFollowingChanges(active, createFollowingObservation(feed(db), options)).updates.some(item => item.id === liveId && item.kinds.includes('status')))
})

test('English weekly labels and read-only selection', () => {
  const db = buildWeeklyOverviewFixture()
  const original = structuredClone(db)
  const model = feed(db, undefined, 'en-US')
  assert.equal(model.groups.live[0].stage, 'Week 3')
  assert.equal(model.groups.live[0].presentation.scoreLabel, 'CURRENT SCORE')
  assert.deepEqual(db, original)
})

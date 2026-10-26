import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildWeeklyPlayoffFixture } from './lib/weeklyPlayoffFixture.mjs'
import { getPlayerCycleHonors, getTeamCycleHonors, getWeeklyCycleHonors, weeklyHonorLabel } from '../src/features/weekly-advance/weeklyCycleHonors.js'
import { getTeamSeasonPresentation } from '../src/lib/teamSeasonPresentation.js'
import { getFollowingTeamSummaries } from '../src/features/following/followingTeamSummary.js'

const season = { id: 'FCW26', rules: { weeklyCompetition: { enabled: true } }, competitionFormat: 'WEEKLY' }
const medalDb = () => {
  const db = buildWeeklyPlayoffFixture('medal-complete')
  db.weekly_competition.cycles.find(cycle => cycle.id === 'sample-cycle-1').status = 'CLOSED'
  return db
}

test('票 2.19: the four published placements become honours, in medal order', () => {
  const db = medalDb()
  const seeds = db.weekly_competition.cycles.find(cycle => cycle.id === 'sample-cycle-1').elimination.seed_team_ids
  const honors = getWeeklyCycleHonors(db)
  assert.deepEqual(honors.map(honor => [honor.rank, honor.teamId]), seeds.map((id, index) => [index + 1, id.toLowerCase()]))
  assert.match(weeklyHonorLabel(honors[0], 'zh-CN'), /优胜者$/)
  assert.match(weeklyHonorLabel(honors[3], 'zh-CN'), /第四名$/)
  assert.match(weeklyHonorLabel(honors[0], 'zh-TW'), /優勝者$/)
  assert.strictEqual(getWeeklyCycleHonors(db), honors, 'one computation per snapshot')
})

test('an incomplete bracket gives no honours, and points rank alone never does', () => {
  for (const state of ['complete', 'final-live', 'semifinals', 'pending-seeds']) {
    assert.deepEqual(getWeeklyCycleHonors(buildWeeklyPlayoffFixture(state)), [], state)
  }
})

test('the team tag leads with the honour and keeps the points rank as its second line', () => {
  const db = medalDb()
  const [winner] = getWeeklyCycleHonors(db)
  const team = db.teams.find(item => item.team_id.toLowerCase() === winner.teamId)
  const tag = getTeamSeasonPresentation({ db, season, team, locale: 'zh-CN' })
  assert.equal(tag.heading, '赛段荣誉')
  assert.match(tag.label, /优胜者$/)
  assert.match(tag.zone, /^积分赛(并列)?第 \d+ 名$/)
  const outsider = db.teams.find(item => !getTeamCycleHonors(db, item.team_id).length && db.weekly_competition.cycles[0].standings.some(row => row.team_id === item.team_id))
  const plain = getTeamSeasonPresentation({ db, season, team: outsider, locale: 'zh-CN' })
  assert.equal(plain.heading, '赛段排名')
  assert.equal(plain.code, 'CYCLE STANDINGS')
})

test('a player shares an honour only after playing for that team in that cycle', () => {
  const db = medalDb()
  const [winner, runnerUp] = getWeeklyCycleHonors(db)
  const final = db.matches.find(match => match.round === 'FINAL')
  assert.equal(getPlayerCycleHonors(db, [{ matchId: final.match_id, team: { id: winner.teamId } }])[0], winner)
  assert.equal(getPlayerCycleHonors(db, [{ matchId: final.match_id, team: { id: runnerUp.teamId } }])[0], runnerUp)
  assert.deepEqual(getPlayerCycleHonors(db, [{ matchId: 'another-event-match', team: { id: winner.teamId } }]), [])
  assert.deepEqual(getPlayerCycleHonors(db, []), [])
})

test('follow cards carry the honour first and keep points beside it', () => {
  const db = medalDb()
  const [winner] = getWeeklyCycleHonors(db)
  const team = db.teams.find(item => item.team_id.toLowerCase() === winner.teamId)
  const summaries = getFollowingTeamSummaries(db, season, [{ id: 'followed', team_id: team.team_id, team_short_name: team.team_short_name }], 'zh-CN', 'sample-cycle-1')
  const card = summaries.get('followed')
  assert.equal(card.honor, true)
  assert.match(card.label, /优胜者$/)
  assert.match(card.zone, /分 · /)
})

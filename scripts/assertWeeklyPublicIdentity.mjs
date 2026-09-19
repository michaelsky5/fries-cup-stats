import assert from 'node:assert/strict'
import test from 'node:test'
import { resolvePublicMatchIdentities } from '../src/lib/publicMatchIdentity.js'
import { getTeamLogoCandidates } from '../src/lib/teamLogoResolver.js'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { getScheduleStageLabel, getScheduleReturnLabel } from '../src/features/match-schedule/schedulePresentation.js'
import { getDossierJourneyStages } from '../src/features/team-dossier/teamDossierPresentation.js'
import { getTeamSeasonPresentation } from '../src/lib/teamSeasonPresentation.js'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'

const logo = `https://admin.fries-cup.com/api/media/team-logos/${'a'.repeat(24)}/${'b'.repeat(32)}.webp`
const fixture = () => ({
  teams: [{ team_id: 'FCW26-T-hash', team_logo: logo, score: 99, team_name: 'Registered name' }],
  players: [], matches: [{ match_id: 'public-match', raw_match_id: 'system-match',
    stage: 'OTHER', cycle_week_id: 'week-1', status: 'PENDING', format: 'RR5', maps: [],
    team_a: { id: 'FCW26-T-hash', short: 'TEAM', name: 'Match name', score: '' },
    team_b: { id: 'unrelated-team', short: 'TEAM', score: 0 } }]
})

test('published team logos reach every match consumer without copying scores or matching names', () => {
  const db = fixture()
  const before = structuredClone(db)
  const resolved = resolvePublicMatchIdentities(db)
  assert.equal(resolved.matches[0].team_a.team_logo, logo)
  assert.equal(resolved.matches[0].team_a.score, '')
  assert.equal(resolved.matches[0].team_a.name, 'Match name')
  assert.equal(resolved.matches[0].team_b.team_logo, undefined)
  assert.equal(resolved.matches[0].team_b.score, 0)
  assert.deepEqual(db, before, 'normalization must not rewrite the source snapshot')
  assert.equal(resolvePublicMatchIdentities(resolved), resolved, 'cached snapshots remain stable')
  const dossier = getMatchDossier(db, 'public-match')
  assert.equal(dossier.match.team_a.team_logo, logo)
  assert.equal(dossier.teamA.logoTeam.team_logo, logo, 'the original poster must retain uploaded logos too')
  assert.equal(dossier.scoreLabel, 'VS')
  assert.equal(dossier.roomPath, '/me/matches/system-match/room')
})

test('explicit match artwork wins; missing identities and logos keep their existing fallback', () => {
  const db = fixture()
  db.matches[0].team_a.logoUrl = 'https://assets.example/match.svg'
  assert.equal(getTeamLogoCandidates(resolvePublicMatchIdentities(db).matches[0].team_a, 'FCW26')[0], 'https://assets.example/match.svg')
  delete db.matches[0].team_a.logoUrl
  delete db.matches[0].team_a.id
  assert.equal(resolvePublicMatchIdentities(db).matches[0].team_a.team_logo, undefined)
  assert.equal(getTeamLogoCandidates(db.matches[0].team_b, 'FCW26').at(-1), '/logos/fc_logo.png')
})

test('only known immutable public uploads gain a same-origin image route, with origin fallback', () => {
  assert.deepEqual(getTeamLogoCandidates({ team_logo: logo }, 'FCW26').slice(0, 2), [logo.replace('https://admin.fries-cup.com/api/', '/api/platform/'), logo])
  for (const source of [logo.replace('admin.fries-cup.com', 'external.example'), logo + '?signature=private', 'https://admin.fries-cup.com/api/me/profile']) {
    assert.equal(getTeamLogoCandidates({ team_logo: source }, 'FCW26')[0], source)
  }
})

test('weekly presentation uses the published week identity while preserving real playoff and archive stages', () => {
  const db = fixture()
  const match = resolvePublicMatchIdentities(db).matches[0]
  assert.equal(match.stage, 'WEEKLY')
  assert.equal(match.raw_stage, 'OTHER')
  assert.equal(getScheduleStageLabel(match.stage), '周赛')
  assert.equal(getScheduleStageLabel(match.stage, 'en-US'), 'Weekly')
  assert.equal(getDossierJourneyStages([{ match }])[0].label, '周赛')
  assert.equal(getScheduleReturnLabel('/matches?season=FCW2026', 'zh-CN', { weekly: true }), '返回周赛赛程')
  db.matches[0].stage = 'PLAYOFFS'
  assert.equal(resolvePublicMatchIdentities(db).matches[0].stage, 'PLAYOFFS')
  db.matches[0].stage = 'OTHER'
  delete db.matches[0].cycle_week_id
  assert.equal(resolvePublicMatchIdentities(db).matches[0].stage, 'OTHER')
})

test('weekly team standing comes from the published cycle, never Swiss calculations or stray pilot ranks', () => {
  const db = buildWeeklyOverviewFixture()
  const team = db.teams[0]
  const present = () => getTeamSeasonPresentation({ db, team, season: {}, standing: { rank: 1, matches_played: 99 } })
  assert.equal(present().rank, 3)
  db.weekly_competition.cycles[1].standings[2].tied = true
  assert.equal(present().label, '并列第 3 名')
  db.weekly_competition.cycles[1].counts_toward_standings = false
  assert.equal(present().rank, null)
  assert.equal(present().label, '不计积分')
  db.weekly_competition.cycles[1].counts_toward_standings = true
  db.weekly_competition.cycles[1].standings = []
  assert.equal(present().rank, null)
  assert.equal(present().label, '积分待公布')
})

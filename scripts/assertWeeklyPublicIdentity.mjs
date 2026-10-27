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
  assert.equal(getTeamLogoCandidates(db.matches[0].team_b, 'FCW26').at(-1), '/logos/OW.png')
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
  assert.equal(present().label, '排名待公布')
})

test('schedule rows name the playoff round or special phase, never the prelim match number', async () => {
  const { getWeeklyRoundLabel } = await import('../src/lib/weeklyMatchIdentity.js')
  const playoff = { match_code: 'FCW26-C01-W06-PO-M03', weekly_context: { phase: 'PLAYOFFS', round_label: '季军赛', week_number: 6, cycle_sequence: 1 } }
  assert.equal(getWeeklyRoundLabel(playoff, 'zh-CN'), '季军赛')
  assert.equal(getWeeklyRoundLabel(playoff, 'en-US'), 'Third place')
  assert.equal(getWeeklyRoundLabel({ match_code: 'FCW26-C01-W06-PO-M04', weekly_context: { phase: 'PLAYOFFS', round_label: '决赛' } }, 'en-US'), 'Final')
  assert.equal(getWeeklyRoundLabel({ match_code: 'FCW26-C01-W05-QUAL-M01' }, 'zh-CN'), '晋级加赛')
  assert.equal(getWeeklyRoundLabel({ match_code: 'FCW26-C01-W02-REG-M03', weekly_context: { phase: 'REGULAR', match_number: 3 } }, 'zh-CN'), '')
  assert.equal(getWeeklyRoundLabel({ match_id: 'plain' }, 'zh-CN'), '')
})

// 票 2.80: every language leads with the cycle's name from one four-language table; the code is small print.
test('pages lead with the human cycle name in every language and explain formats in Chinese', async () => {
  const presentation = await import('../src/features/weekly-overview/weeklyPresentation.js')
  const cycle = { id: 'c1', sequence: 1, code: 'C01', name: '第一周期', season_id: 'FCW26' }
  assert.equal(presentation.weeklyCycleTitle(cycle, 'zh-CN'), '第一赛段')
  assert.equal(presentation.weeklyCycleTitle(cycle, 'zh-TW'), '第一賽段')
  assert.equal(presentation.weeklyCycleTitle({ ...cycle, sequence: 2, code: 'C02', name: '' }, 'zh-CN'), '第二赛段')
  assert.equal(presentation.weeklyCycleTitle(cycle, 'en-US'), 'Cycle 1')
  assert.equal(presentation.weeklyCycleTitle(cycle, 'ko-KR'), '사이클 1')
  // Name-only and code-only records (registration rows, season totals) resolve to the same name.
  assert.equal(presentation.weeklyCycleTitle({ name: '第二周期' }, 'en-US'), 'Cycle 2')
  assert.equal(presentation.weeklyCycleTitle({ code: 'C02', name: '第二周期' }, 'zh-TW'), '第二賽段')
  assert.equal(presentation.weeklyCycleTitle({ code: 'C01' }, 'ko-KR'), '사이클 1')
  assert.equal(presentation.weeklyCycleTitle({ sequence: 0, name: '试运行' }, 'en-US'), 'Pilot')
  assert.equal(presentation.weeklyCycleCode(cycle), 'FCW S1 C1')
  const final = { match_code: 'FCW26-C01-W06-PO-M04', weekly_context: { phase: 'PLAYOFFS', round_label: '决赛', week_number: 6, cycle_sequence: 1, cycle_name: '第一周期' } }
  // 票 2.49: 晋级加赛 belongs to the playoffs; neither carries a week number.
  assert.equal(presentation.weeklyMatchContextLabel(final, 'zh-CN'), '第一赛段 · 季后赛 · 决赛')
  assert.equal(presentation.weeklyMatchContextLabel(final, 'zh-TW'), '第一賽段 · 季後賽 · 決賽')
  assert.equal(presentation.weeklyMatchContextLabel(final, 'en-US'), 'Cycle 1 · Playoffs · Final')
  assert.equal(presentation.weeklyMatchContextLabel(final, 'ko-KR'), '사이클 1 · 플레이오프 · 결승')
  const qualifier = { match_code: 'FCW26-C01-W05-QUAL-M01', weekly_context: { phase: 'QUALIFIER', week_number: 5, week_label: '第 5 周', cycle_sequence: 1, cycle_name: '第一周期' } }
  assert.equal(presentation.weeklyMatchContextLabel(qualifier, 'zh-CN'), '第一赛段 · 季后赛 · 晋级加赛')
  const prelim = { match_code: 'FCW26-C01-W03-REG-M02', weekly_context: { phase: 'REGULAR', week_number: 3, cycle_sequence: 1, cycle_name: '第一周期' } }
  assert.equal(presentation.weeklyMatchContextLabel(prelim, 'zh-CN'), '第一赛段 · 第 3 周')
  assert.equal(presentation.weeklyWeekTitle({ week_number: 5, phase: 'QUALIFIER', label: '第 5 周' }, 'zh-CN'), '季后赛 · 晋级加赛')
  assert.equal(presentation.weeklyWeekTitle({ week_number: 6, phase: 'PLAYOFFS', label: '第一赛段季后赛' }, 'zh-CN'), '季后赛')
  assert.equal(presentation.weeklyWeekTitle({ week_number: 6, phase: 'PLAYOFFS' }, 'en-US'), 'Playoffs')
  assert.equal(presentation.weeklyWeekTitle({ week_number: 2, phase: 'REGULAR', label: '第 2 周' }, 'zh-CN'), '第 2 周')
  assert.equal(presentation.weeklyWeekHasNumber({ phase: 'REGULAR' }), true)
  assert.equal(presentation.weeklyWeekHasNumber({ phase: 'QUALIFIER' }), false)
  assert.equal(presentation.weeklyWeekHasNumber({ phase: 'PLAYOFFS' }), false)
  assert.equal(presentation.weeklyFormatLabel({ format: 'FT3' }, 'zh-CN'), 'FT3（先赢 3 图）')
  assert.equal(presentation.weeklyFormatLabel({ format: 'RR5' }, 'zh-CN'), 'RR5（五局积分制）')
  assert.equal(presentation.weeklyFormatLabel({ format: 'FT3' }, 'en-US'), 'FT3')
  assert.equal(presentation.showsInlineTimeZone('zh-CN'), false)
  assert.equal(presentation.showsInlineTimeZone('en-US'), true)
})

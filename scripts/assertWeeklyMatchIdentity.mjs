import assert from 'node:assert/strict'
import test from 'node:test'
import { getMatchDisplayCode, getWeeklyMatchIdentity, getWeeklyMatchIdentityLabel, getWeeklyPhaseLabel, getPublishedWeeklyContext } from '../src/lib/weeklyMatchIdentity.js'
import { resolvePublicMatchIdentities } from '../src/lib/publicMatchIdentity.js'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { buildWeeklyOverview } from '../src/features/weekly-overview/weeklyOverviewModel.js'
import { buildWeeklySchedule } from '../src/features/match-schedule/weeklyScheduleModel.js'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'

function fixture() {
  const db = buildWeeklyOverviewFixture()
  db.weekly_competition.cycles[1].weeks.forEach(week => { week.phase = 'REGULAR' })
  db.matches[0].match_code = 'FCW26-C01-W01-REG-M03'
  db.matches[1].match_code = 'FCW26-C01-W01-REG-M01'
  return db
}

test('main stage labels follow the approved names; qualifier remains an auxiliary stage', () => {
  assert.deepEqual(['REGULAR', 'PLAYOFFS', 'MAJOR'].map(phase => getWeeklyPhaseLabel(phase)), ['积分赛', '季后赛', '巅峰赛'])
  assert.equal(getWeeklyPhaseLabel('QUALIFIER'), '晋级加赛')
  assert.equal(getWeeklyPhaseLabel('OTHER'), '')
  assert.equal(getWeeklyPhaseLabel('REGULAR', 'en-US'), 'Prelims')
})

test('Chinese and English identity labels use persisted numbers and phase instead of format or live state', () => {
  const match = { match_code: 'FCW26-C02-W05-PO-M03', format: 'RR5', status: 'LIVE',
    weekly_context: { cycle_sequence: 9, week_number: 9, phase: 'REGULAR', round_label: '决赛' } }
  // 票 2.49: playoff and qualifier matches are named by stage, never by a week number.
  assert.equal(getWeeklyMatchIdentityLabel(match), 'FCW S1 C2 · 季后赛 · 决赛 · 第 03 场')
  assert.equal(getWeeklyMatchIdentityLabel(match, 'en-US'), 'FCW S1 C2 · Playoffs · Final · Match 03')
  const qualifier = { match_code: 'FCW26-C01-W05-QUAL-M01', weekly_context: { cycle_sequence: 1, week_number: 5, phase: 'QUALIFIER', week_label: '第 5 周' } }
  assert.equal(getWeeklyMatchIdentityLabel(qualifier), 'FCW S1 C1 · 季后赛 · 晋级加赛 · 第 01 场')
  assert.equal(getWeeklyMatchIdentityLabel(qualifier, 'en-US'), 'FCW S1 C1 · Playoffs · Tiebreak qualifier · Match 01')
  assert.match(getWeeklyMatchIdentityLabel(qualifier, 'ko-KR'), /^FCW S1 C1 · 플레이오프 · 진출권 결정전 · /)
  assert.equal(getWeeklyMatchIdentityLabel({ match_code: 'FCW26-C01-W06-PO-M02', weekly_context: { week_label: '第一赛段季后赛', phase: 'PLAYOFFS' } }), 'FCW S1 C1 · 季后赛 · 第 02 场', 'no round label: the stage is not repeated')
  assert.equal(getWeeklyMatchIdentity({ weeklyIdentity: { code: 'FCW26-C01-W04-QUAL-M02', phase: 'QUALIFIER', roundLabel: '第 2 轮' } }).match_number, 2)
  assert.equal(getWeeklyMatchIdentityLabel({ match_code: 'FCW26-C00-W01-REG-M01', weekly_context: { cycle_name: '试运行' } }), '试运行 · 第 1 周 · 积分赛 · 第 01 场')
})

test('legacy matches gain only published cycle/week context; ordinal numbers are never invented', () => {
  const db = fixture()
  const match = db.matches[2]
  const context = getPublishedWeeklyContext(match, db.weekly_competition)
  assert.equal(context.cycle_sequence, 1)
  assert.equal(context.week_number, 1)
  assert.equal(context.phase, 'REGULAR')
  assert.equal(context.match_number, undefined)
  assert.equal(getWeeklyMatchIdentityLabel({ ...match, weekly_context: context }), 'FCW S1 C1 · 第 1 周 · 积分赛')
  assert.equal(getPublishedWeeklyContext({ ...match, cycle_week_id: 'wrong-week' }, db.weekly_competition), null)
  assert.equal(getPublishedWeeklyContext({ ...match, cycle_id: 'wrong-cycle' }, db.weekly_competition), null)
  assert.equal(getWeeklyMatchIdentity({ match_id: 'FCW26-WEEKLY-6EFFE40D' }), null)
})

test('normalization is immutable and idempotent; schedule reordering and rescheduling keep codes', () => {
  const db = fixture()
  const before = structuredClone(db)
  const resolved = resolvePublicMatchIdentities(db)
  assert.equal(resolvePublicMatchIdentities(resolved), resolved)
  assert.deepEqual(db, before)
  const codes = new Map(buildWeeklySchedule(db, { weekId: 'all' }).entries.flatMap(entry => entry.matches).map(match => [match.id, getMatchDisplayCode(match)]))
  db.matches.reverse()
  db.matches.find(match => match.match_code?.endsWith('M03')).scheduled_at = '2027-01-01T00:00:00Z'
  for (const match of buildWeeklySchedule(db, { weekId: 'all' }).entries.flatMap(entry => entry.matches)) assert.equal(getMatchDisplayCode(match), codes.get(match.id))
})

test('readable code lookup and legacy lookup reach the same match and stored room route', () => {
  const db = fixture()
  const match = db.matches[0]
  for (const id of [match.match_id, match.raw_match_id, match.match_code]) {
    const dossier = getMatchDossier(db, id)
    assert.equal(dossier.displayCode, match.match_code)
    assert.equal(dossier.match.match_id, match.match_id)
    assert.equal(dossier.roomPath, `/me/matches/${match.raw_match_id}/room`)
  }
  const select = query => buildWeeklySchedule(db, { weekId: 'all', query }).entries.flatMap(entry => entry.matches)
  assert.deepEqual(select(match.match_code).map(item => item.id), [match.match_id])
  assert.deepEqual(select(match.raw_match_id).map(item => item.id), [match.match_id])
  assert.equal(select('积分赛').length, 12)
})

test('a copied legacy WEEKLY code remains searchable and opens the same match after numbering', () => {
  const db = fixture()
  const match = db.matches[0]
  const originalRawId = match.raw_match_id
  match.raw_match_id = 'FCW26-OTHER-6EFFE40D'
  for (const cycle of db.weekly_competition.cycles) for (const week of cycle.weeks) {
    week.match_ids = week.match_ids.map(id => id === originalRawId ? match.raw_match_id : id)
  }
  const legacyCode = 'FCW26-WEEKLY-6EFFE40D'
  assert.equal(getMatchDossier(db, legacyCode).match.match_id, match.match_id)
  const results = buildWeeklySchedule(db, { weekId: 'all', query: legacyCode.toLowerCase() }).entries.flatMap(entry => entry.matches)
  assert.deepEqual(results.map(item => item.id), [match.match_id])
  assert.equal(buildWeeklyOverview(db, { weekId: match.cycle_week_id, match: legacyCode }).focus.match_id, match.match_id)
  assert.equal(buildWeeklyOverview(db, { weekId: match.cycle_week_id, match: match.match_code }).focus.match_id, match.match_id)
})

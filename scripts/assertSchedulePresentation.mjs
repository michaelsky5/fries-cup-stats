import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { getMatchHubData } from '../src/lib/matchesSelectors.js'
import {
  getScheduleGroupLabel, getScheduleMapRecords, getScheduleReturnLabel,
  getScheduleRoundLabel, getScheduleStageLabel, getScheduleStatusLabel,
  getScheduleTimeLabel, isScheduleListSearch, resetScheduleSearch
} from '../src/features/match-schedule/schedulePresentation.js'

test('round names preserve the competition structure across languages', () => {
  const rounds = [
    ['SWISS', 'ROUND 6', '瑞士轮第 6 轮', 'Swiss round 6'],
    ['LCQ', 'PLAY-IN', '入围赛', 'Play-in'],
    ['LCQ', 'ROUND OF 16', '十六强赛', 'Round of 16'],
    ['LCQ', 'QUALIFICATION', '晋级赛', 'Qualification'],
    ['PLAYOFFS', 'UB QF', '胜者组四分之一决赛', 'Upper quarterfinals'],
    ['PLAYOFFS', 'UB SF', '胜者组半决赛', 'Upper semifinals'],
    ['PLAYOFFS', 'UB Final', '胜者组决赛', 'Upper final'],
    ['PLAYOFFS', 'LB R3', '败者组第 3 轮', 'Lower round 3'],
    ['PLAYOFFS', 'LB Final', '败者组决赛', 'Lower final'],
    ['PLAYOFFS', 'GRAND FINALS', '总决赛', 'Grand final'],
    ['PLAYOFFS', 'THIRD PLACE', '季军赛', 'Third-place match'],
    ['PLAYOFFS', '3RD PLACE', '季军赛', 'Third-place match'],
    ['GROUP', 'GROUP A / DAY1', 'A 组 · 第 1 比赛日', 'Group A · Day 1']
  ]
  for (const [stage, round, zh, en] of rounds) {
    assert.equal(getScheduleRoundLabel({ stage, round }), zh)
    assert.equal(getScheduleRoundLabel({ stage, round }, 'en-US'), en)
  }
})

test('unknown and generic rounds are not assigned a fabricated stage or championship', () => {
  assert.equal(getScheduleRoundLabel({ stage: 'LCQ', round: 'ROUND 2' }), '第 2 轮')
  assert.equal(getScheduleRoundLabel({ stage: 'SPECIAL', round: 'Community invitational' }), 'Community invitational')
  assert.equal(getScheduleStageLabel('SPECIAL'), 'SPECIAL')
  assert.equal(getScheduleRoundLabel({ stage: 'GROUP' }), '小组赛')
})

test('partial map results retain zero and missing values without inventing a score', () => {
  const maps = getScheduleMapRecords({ maps: [
    { map_name: '', map_type: 'UNKNOWN', score_a: '', score_b: '' },
    { map_name: 'Ilios', map_type: 'CONTROL', score_a: 0, score_b: 2 },
    { map_name: 'King\'s Row', map_type: 'HYBRID', score_a: null, score_b: 1 },
    { map_name: 'Circuit Royal', map_type: 'ESCORT', score_a: '', score_b: '' }
  ] }, 'en-US')
  assert.equal(maps.length, 3)
  assert.equal(maps[0].order, 2)
  assert.equal(maps[0].score, '0 : 2')
  assert.equal(maps[1].score, '— : 1')
  assert.equal(maps[2].hasScore, false)
  assert.deepEqual(getScheduleMapRecords({ maps: [] }), [])
})

test('all list entry parameters resolve to the list and clear together without losing event context', () => {
  const search = '?design=kpr5&lang=en&season=QGCS4&tab=following&following=1&team=NF&teamId=QGCS4-T01&query=NF&stage=GROUP&round=GROUP+A+%2F+DAY1&roundView=group-a&status=finished&format=FT3&focus=search'
  assert.equal(isScheduleListSearch(search), true)
  assert.equal(isScheduleListSearch('?roundView=GRAND+FINALS'), true)
  assert.equal(isScheduleListSearch('?design=kpr5&season=FCR2026'), false)
  assert.deepEqual(Object.fromEntries(resetScheduleSearch(search)), { design: 'kpr5', lang: 'en', season: 'QGCS4', view: 'list' })
})

test('detail return text distinguishes full schedule from highlights without claiming other pages', () => {
  assert.equal(getScheduleReturnLabel('/matches?view=list&team=NF'), '返回完整赛程')
  assert.equal(getScheduleReturnLabel('/matches?roundView=GRAND+FINALS', 'en-US'), 'Back to full schedule')
  assert.equal(getScheduleReturnLabel('/matches?season=QGCS4'), '返回赛事精选')
  assert.equal(getScheduleReturnLabel('/matches/one?map=2'), '')
  assert.equal(getScheduleReturnLabel('/teams/id/matches?view=list'), '')
})

test('synthetic schedule times stay pending while published exact times are shown', () => {
  const dateOnly = { scheduled_at: '2026-09-11T00:00:00Z', schedule_meta: { syntheticSortTime: true } }
  assert.match(getScheduleTimeLabel(dateOnly, 'en-US'), /09\/11 TBD/)
  assert.doesNotMatch(getScheduleTimeLabel(dateOnly), /08:00/)
  assert.match(getScheduleTimeLabel({ scheduled_at: '2026-09-11T12:30:00Z' }), /20:30/)
  assert.equal(getScheduleTimeLabel({}, 'en-US'), 'Schedule TBD')
  const group = { matches: [{ ...dateOnly, stage: 'GROUP', round: 'GROUP B / DAY2' }] }
  assert.match(getScheduleGroupLabel(group, 'en-US', false), /^Group B · Day 2 · 09\/11 TBD$/)
})

test('forfeit status and published final maps survive the presentation layer', async () => {
  const db = JSON.parse(await readFile(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const hub = getMatchHubData(db, 'FCR26', {})
  assert.equal(hub.summary.total, 136)
  assert.equal(hub.keyArchiveMatches[0].round, 'GRAND FINALS')
  assert.equal(getScheduleMapRecords(hub.keyArchiveMatches[0]).length, 4)
  for (const match of hub.matches) assert.doesNotMatch(getScheduleRoundLabel(match), /^(ROUND|UB |LB |GRAND |PLAY-IN|QUALIFICATION)/)
  assert.equal(getScheduleStatusLabel({ status: 'FORFEIT' }, 'en-US'), 'Forfeit')
})

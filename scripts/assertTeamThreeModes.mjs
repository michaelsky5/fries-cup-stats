import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  getPerformanceRows,
  buildTeamPerformance,
  performanceRecordKey
} from '../src/features/team-dossier/teamPerformance.js'
import { buildScoutingBrief } from '../src/features/team-dossier/teamScoutingBrief.js'
import { getDossierMapPool } from '../src/features/team-dossier/teamDossierPresentation.js'
import { calendarDate, buildSeasonCalendar } from '../src/features/team-dossier/teamSeasonCalendar.js'

const players = (side, values = {}) =>
  Array.from({ length: 5 }, (_, index) => ({
    player_id: `${side}${index}`,
    player_name: `${side}${index}`,
    side,
    role: index === 0 ? 'TANK' : index < 3 ? 'DPS' : 'SUP',
    heroes_played: index === 0 ? 'Mauga' : index < 3 ? 'Reaper' : 'Kiriko',
    damage: 100,
    healing: 0,
    mitigation: 0,
    eliminations: 4,
    deaths: 2,
    assists: 1,
    ...values
  }))
const map = (order, own = {}, opponent = {}, won = true) => ({
  map_name: 'Ilios',
  map_type: 'Control',
  map_order: order,
  match_time: '10:00',
  score_a: won ? 2 : 0,
  score_b: won ? 0 : 2,
  team_a_stats: players('A', own),
  team_b_stats: players('B', opponent)
})
const match = (id, maps, extra = {}) => ({
  match_id: id,
  scheduled_at: `2026-07-0${id.slice(-1)}T12:00:00Z`,
  status: 'COMPLETE',
  stage: 'SWISS',
  round: '1',
  team_a: { id: 'A', short: 'A', score: 2 },
  team_b: { id: 'B', short: 'B', score: 0 },
  maps,
  ...extra
})
const createReport = (source) => buildTeamPerformance(getPerformanceRows(source, 'A'))
const sources = (own = {}, opponent = {}) =>
  [1, 2, 3].map((id) =>
    match(
      `M${id}`,
      [1, 2, 3].map((order) => map(order, own, opponent))
    )
  )
const state = { isArchived: false, rank: null, heading: '赛季状态', label: '参赛队伍' }

test('combat strengths require cross-series evidence and preserve the underlying samples', () => {
  const report = createReport(sources({ eliminations: 8, deaths: 1 }))
  const brief = buildScoutingBrief(report)
  assert.equal(brief.sufficient, true)
  assert.equal(brief.comparableMaps, 9)
  assert.equal(brief.comparableSeries, 3)
  assert.equal(brief.findings[0].id, 'combat-balance')
  assert.equal(brief.findings[0].records.length, 9)
  assert.match(brief.findings[0].summary, /六成/)
})
test('higher damage, healing and mitigation alone do not become a claimed strength', () => {
  const brief = buildScoutingBrief(
    createReport(sources({ damage: 99999, healing: 99999, mitigation: 99999 }))
  )
  assert.equal(brief.hasStrength, false)
  assert.equal(brief.hasWatch, false)
})
test('large totals in one match and sparse or administrative data do not establish strengths', () => {
  const single = createReport([
    match(
      'M1',
      Array.from({ length: 20 }, (_, index) => map(index + 1, { eliminations: 8, deaths: 1 }))
    )
  ])
  assert.equal(buildScoutingBrief(single).sufficient, false)
  assert.equal(buildScoutingBrief(single).hasStrength, false)
  const admin = createReport(
    sources({ eliminations: 8, deaths: 1 }).map((item) => ({ ...item, is_forfeit: true }))
  )
  assert.equal(buildScoutingBrief(admin).findings.length, 0)
  assert.equal(buildScoutingBrief(createReport([])).findings.length, 0)
})
test('zero reference and incomplete paired metrics cannot create percentage-based conclusions', () => {
  assert.equal(buildScoutingBrief(createReport(sources({ deaths: 1 }, { deaths: 0 }))).hasWatch, false)
  const source = sources({ eliminations: 8, deaths: 1 })
  for (const fixture of source) for (const record of fixture.maps) record.team_b_stats[0].deaths = null
  assert.equal(buildScoutingBrief(createReport(source)).comparableMaps, 0)
  assert.equal(buildScoutingBrief(createReport(source)).hasStrength, false)
})
test('consistent elevated deaths produce a review priority, not a claim about its cause', () => {
  const brief = buildScoutingBrief(createReport(sources({ deaths: 4 })))
  const watch = brief.findings.find((item) => item.kind === 'watch')
  assert.equal(watch.id, 'death-pressure')
  assert.equal(watch.mode, 'paired')
  assert.match(watch.review, /再判断/)
})
test('lost-map observations use won and lost samples from multiple meetings and state the limitation', () => {
  const source = [1, 2, 3].map((id) =>
    match(`M${id}`, [
      map(1, { deaths: 1 }, { deaths: 1 }),
      map(2, { deaths: 1 }, { deaths: 1 }),
      map(3, { deaths: 3 }, { deaths: 3 }, false)
    ])
  )
  const brief = buildScoutingBrief(createReport(source))
  const watch = brief.findings.find((item) => item.kind === 'watch')
  assert.equal(watch.id, 'loss-context')
  assert.equal(watch.records.length, 9)
  assert.match(watch.summary, /3 份输图/)
  assert.match(watch.review, /不能直接解释/)
})
test('calendar groups real dates in order, deduplicates and keeps unknown dates unknown', () => {
  const rows = getPerformanceRows(
    [
      match('M2', [map(1)], { scheduled_at: '2026-08-01T12:00:00Z' }),
      match('M1', [map(1)], { scheduled_at: '2026-06-30T12:00:00Z' }),
      match('M3', [], { scheduled_at: null, status: 'PENDING' })
    ],
    'A'
  )
  const calendar = buildSeasonCalendar([...rows, rows[0]], state)
  assert.deepEqual(
    calendar.months.map((month) => month.key),
    ['2026-06', '2026-08', 'undated']
  )
  assert.equal(calendar.entries.length, 3)
  assert.equal(calendar.months[1].gap, 32)
  assert.equal(calendar.months[2].entries[0].date.date, null)
  assert.equal(calendarDate({ ...rows[0], timeLabel: '02-30 12:00' }).date, null)
})
test('cancelled, administrative and bye cards remain records without becoming played milestones', () => {
  const rows = getPerformanceRows(
    [
      match('M1', [], { status: 'CANCELLED' }),
      match('M2', [], { is_forfeit: true }),
      match('M3', [], { team_b: null, is_bye: true, status: 'BYE' })
    ],
    'A'
  )
  const calendar = buildSeasonCalendar(rows, state)
  assert.equal(calendar.entries.length, 3)
  assert.equal(calendar.chapters.length, 0)
  assert.ok(calendar.entries.every((entry) => entry.milestone === null))
})
test('the real AIP brief stays bounded, links only actual maps, and the calendar includes every fixture', () => {
  const db = JSON.parse(
    readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8')
  )
  const rows = getPerformanceRows(db.matches, 'FCR26-T026')
  const report = buildTeamPerformance(
    rows,
    db.players.filter((player) => player.team_id === 'FCR26-T026')
  )
  const brief = buildScoutingBrief(report, getDossierMapPool(rows))
  assert.equal(brief.comparableMaps, 32)
  assert.ok(brief.findings.length >= 2 && brief.findings.length <= 4)
  const keys = new Set(report.records.map(performanceRecordKey))
  for (const finding of brief.findings)
    assert.ok(finding.records.every((record) => keys.has(performanceRecordKey(record))))
  const calendar = buildSeasonCalendar(rows, { ...state, isArchived: true, rank: 1 })
  assert.equal(calendar.entries.length, rows.length)
  assert.equal(calendar.entries.filter((entry) => entry.date.date).at(-1).milestone.kind, 'champion')
  assert.equal(calendar.entries.filter((entry) => entry.date.date).at(-1).date.date, '2026-08-16')
})

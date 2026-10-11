import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildWeeklyReportPreview, listWeeklyReportPreviews, weeklyReportPath, formatReportTime } from '../src/features/weekly-report/weeklyReportPreview.js'

const source = JSON.parse(readFileSync(new URL('./fixtures/weekly-newspaper/published-FCW26.json', import.meta.url), 'utf8'))
const latest = buildWeeklyReportPreview(source)
const clone = () => structuredClone(source)

test('week-three sample uses public records and automatic previews without inventing publication', () => {
  assert.equal(latest.week.week_number, 3)
  assert.equal(latest.completed.length, 3)
  assert.equal(latest.maps.length, 15)
  assert.equal(latest.playerCount, 34)
  assert.deepEqual(latest.eligible, { TANK: 6, DPS: 12, SUP: 12 })
  for (const field of ['publication', 'issueStandings', 'updates']) assert.equal(latest[field], null)
  assert.equal(latest.awards.status, 'automatic-preview')
  assert.equal(latest.awards.reference.matches, 7)
})
test('requested unknown cycle or week never falls back to a different sample', () => {
  assert.equal(buildWeeklyReportPreview(source, { weekId: 'missing-week' }), null)
  assert.equal(buildWeeklyReportPreview(source, { cycleId: 'missing-cycle' }), null)
  assert.deepEqual(listWeeklyReportPreviews(source, 'missing-cycle'), [])
  assert.equal(buildWeeklyReportPreview({}), null)
})
test('archive and links retain exact cycle/week identity', () => {
  const samples = listWeeklyReportPreviews(source)
  assert.deepEqual(samples.map(report => [report.week.week_number, report.completed.length, report.maps.length]), [[3, 3, 15], [2, 5, 25], [1, 2, 10]])
  const first = samples[2]
  const url = new URL(weeklyReportPath(first), 'http://localhost')
  assert.equal(url.pathname, `/reports/${first.week.id}`)
  assert.equal(url.searchParams.get('cycle'), first.cycle.id)
  assert.equal(first.nextWeek, null)
  assert.equal(latest.nextWeek.week_number, 4)
})
test('duplicate aliases, maps and same-player hero rows do not inflate appearances', () => {
  const db = clone()
  const week = db.weekly_competition.cycles[0].weeks.find(week => week.id === latest.week.id)
  const match = db.matches.find(match => match.cycle_week_id === week.id)
  week.match_ids.push(match.match_id, match.raw_match_id)
  match.maps.push(structuredClone(match.maps[0]))
  match.maps[0].player_stats.push(structuredClone(match.maps[0].player_stats[0]))
  const report = buildWeeklyReportPreview(db)
  assert.equal(report.completed.length, latest.completed.length)
  assert.equal(report.maps.length, latest.maps.length)
  assert.equal(report.playerCount, latest.playerCount)
  assert.deepEqual(report.eligible, latest.eligible)
  assert.deepEqual(report.mapFrequency, latest.mapFrequency)
})
test('administrative maps and ruling matches never count as played-map samples', () => {
  const db = clone()
  const matches = db.matches.filter(match => match.cycle_week_id === latest.week.id)
  matches[0].maps[0].is_administrative = true
  assert.equal(buildWeeklyReportPreview(db).maps.length, 14)
  matches[0].is_forfeit = true
  const report = buildWeeklyReportPreview(db)
  assert.equal(report.maps.length, 10)
  assert.equal(report.completed.length, 3)
  assert.notEqual(report.closeMatch?.id, matches[0].match_id)
})
test('a result under review is listed as pending and excluded from factual statistics', () => {
  const db = clone()
  db.matches.find(match => match.cycle_week_id === latest.week.id).status = 'PENDING_REVIEW'
  const report = buildWeeklyReportPreview(db)
  assert.equal(report.completed.length, 2)
  assert.equal(report.pending.length, 1)
  assert.equal(report.maps.length, 10)
  assert.equal(report.awards.status, 'automatic-preview')
  assert.equal(report.awards.validMaps, 10)
})
test('a week does not borrow a match from a different cycle', () => {
  const db = clone()
  db.matches.find(match => match.cycle_week_id === latest.week.id).cycle_id = 'different-cycle'
  const report = buildWeeklyReportPreview(db)
  assert.equal(report.completed.length, 2)
  assert.equal(report.maps.length, 10)
})
test('source dates use UTC+8 and absent dates stay absent', () => {
  assert.match(formatReportTime('2026-10-08T15:59:00.000Z'), /2026\/10\/08 23:59 UTC\+8/)
  assert.equal(formatReportTime(null), '—')
  assert.equal(formatReportTime('not-a-date'), '—')
})

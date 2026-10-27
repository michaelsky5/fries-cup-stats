import test from 'node:test'
import assert from 'node:assert/strict'
import { initialSelection, reconcileSelection, scheduleModel, validateSnapshot, weeklyMapSlots, weeklyScore, mapResult, timeLabel, readTime } from '../src/shared/model.js'

function snapshot() {
  return {
    season: { id: 'FCW26' }, teams: [{ team_id: 'A', team_name: '404队', team_short_name: '404' }, { team_id: 'B', team_name: '对手', team_short_name: 'B' }],
    weekly_competition: { schema_version: 'friescup-weekly-public-v1', cycles: [
      { id: 'old', sequence: 1, status: 'CLOSED', weeks: [{ id: 'old-1', week_number: 1, status: 'CLOSED', match_ids: ['old-match'] }] },
      { id: 'current', sequence: 2, status: 'ACTIVE', weeks: [
        { id: 'w1', week_number: 1, status: 'PUBLISHED', match_ids: ['first'] },
        { id: 'w2', week_number: 2, status: 'PUBLISHED', match_ids: ['latest', 'foreign', 'bye'] },
        { id: 'draft', week_number: 3, status: 'DRAFT', match_ids: ['unpublished'] }
      ] }
    ] },
    matches: [
      { match_id: 'first', cycle_id: 'current', cycle_week_id: 'w1', status: 'COMPLETE', format: 'RR5', scheduled_at: '2026-09-20T12:00:00Z', team_a: { team_id: 'A', score: 3 }, team_b: { team_id: 'B', score: 0 } },
      { match_id: 'latest', raw_match_id: 'source-latest', cycle_id: 'current', cycle_week_id: 'w2', status: 'SCHEDULED', format: 'RR5', scheduled_at: '2026-09-27T12:30:00Z', team_a: { team_id: 'A', score: null }, team_b: { team_id: 'B', score: null } },
      { match_id: 'foreign', cycle_id: 'old', cycle_week_id: 'w2', status: 'COMPLETE', team_a: { team_id: 'A' }, team_b: { team_id: 'B' } },
      { match_id: 'bye', cycle_id: 'current', cycle_week_id: 'w2', status: 'COMPLETE', is_bye: true, team_a: { team_id: 'A' }, team_b: { team_id: 'B' } },
      { match_id: 'unpublished', cycle_id: 'current', cycle_week_id: 'draft', status: 'SCHEDULED', team_a: { team_id: 'A' }, team_b: { team_id: 'B' } },
      { match_id: 'old-match', cycle_id: 'old', cycle_week_id: 'old-1', status: 'COMPLETE', team_a: { team_id: 'A' }, team_b: { team_id: 'B' } }
    ]
  }
}
test('default selects latest public week; live week takes precedence', () => {
  const data = snapshot()
  assert.equal(initialSelection(data).weekId, 'w2')
  data.weekly_competition.cycles[1].weeks[0].status = 'IN_PROGRESS'
  assert.equal(initialSelection(data).weekId, 'w1')
})
test('route preserves explicitly requested public cycle and week', () => {
  assert.deepEqual(initialSelection(snapshot(), { cycle: 'old', week: 'old-1' }), { cycleId: 'old', weekId: 'old-1', query: '', teamId: '', status: 'all' })
})

test('refresh keeps valid filters and normalizes removed public cycle/week/team identifiers', () => {
  const raw = snapshot()
  const current = { ...initialSelection(raw), query: '404', teamId: 'A', status: 'upcoming' }
  assert.deepEqual(reconcileSelection(raw, current), current)
  assert.equal(reconcileSelection(raw, { ...current, weekId: 'all' }).weekId, 'all')
  const normalized = reconcileSelection(raw, { ...current, cycleId: 'gone', weekId: 'gone', teamId: 'gone', status: 'invalid' })
  assert.equal(normalized.cycleId, 'current')
  assert.equal(normalized.weekId, 'w2')
  assert.equal(normalized.teamId, '')
  assert.equal(normalized.status, 'all')
  assert.equal(normalized.query, '404')
})

test('read timestamp describes the last successful read in Beijing time', () => {
  assert.match(readTime(Date.parse('2026-09-30T16:03:00Z')), /10\/01.*00:03/)
  assert.equal(readTime(0), '')
  assert.equal(readTime(NaN), '')
})
test('all-weeks scope excludes draft, foreign-cycle and bye records', () => {
  const data = snapshot()
  const model = scheduleModel(data, initialSelection(data, { week: 'all' }))
  assert.equal(model.resultCount, 2)
  assert.deepEqual(model.entries.flatMap(entry => entry.matches.map(match => match.id)), ['first', 'latest'])
})
test('fullwidth team search and lifecycle filters use canonical Stats semantics', () => {
  const data = snapshot()
  const selection = { ...initialSelection(data, { week: 'all' }), query: '４０４', status: 'upcoming' }
  const model = scheduleModel(data, selection)
  assert.equal(model.counts.all, 2)
  assert.deepEqual(model.entries.flatMap(entry => entry.matches.map(match => match.id)), ['latest'])
  assert.equal(timeLabel(model.entries[0].matches[0]), '20:30')
})
test('RR5 keeps five slots after three wins and counts a draw without inventing a winner', () => {
  const match = { format: 'RR5', team_a: { id: 'A', short: '404', score: 3 }, team_b: { id: 'B', short: 'B', score: 0 }, maps: [1, 2, 3].map(order => ({ map_order: order, winner: 'A' })).concat({ map_order: 4, winner: 'draw' }) }
  const slots = weeklyMapSlots(match)
  assert.equal(slots.length, 5)
  assert.equal(mapResult(slots[3], match), '平局')
  assert.equal(mapResult(slots[4], match), '—')
  assert.equal(mapResult(slots[0], match), '404')
})
test('missing or invalid scores remain unknown; zero is a real score', () => {
  for (const value of [null, undefined, '', false, true, -1, 'invalid']) assert.equal(weeklyScore(value), '—')
  assert.equal(weeklyScore(0), '0')
})
test('wrong season or snapshot schema fails rather than showing unrelated data', () => {
  const data = snapshot()
  data.season.id = 'FCR26'
  assert.throws(() => validateSnapshot(data), /公开数据格式/)
  data.season.id = 'FCW26'; data.weekly_competition.schema_version = 'old-schema'
  assert.throws(() => scheduleModel(data, initialSelection(data)), /公开数据格式/)
})

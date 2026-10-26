import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

function runChild(source) {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8'
  })
  assert.equal(child.status, 0, child.stderr || child.stdout)
}

test('canonical Stats schedule renders without Intl and keeps Shanghai date boundaries', () => {
  runChild(`
    import assert from 'node:assert/strict'
    import { weeklyMatchDay } from '../../src/features/match-schedule/weeklyScheduleModel.js'
    import { formatMatchSchedule } from '../../src/lib/scheduleFormat.js'
    import { initialSelection, scheduleModel, timeLabel, dayLabel, readTime } from './src/shared/model.js'
    const matches = ['2026-09-26T15:30:00Z', '2026-09-26T16:30:00Z', '2026-12-31T16:30:00Z'].map((scheduled_at, i) => ({
      match_id: 'm' + i, cycle_id: 'c', cycle_week_id: 'w', scheduled_at, status: 'SCHEDULED', format: 'RR5',
      team_a: { team_id: 'A' }, team_b: { team_id: 'B' }
    }))
    const expected = matches.map(match => ({ day: weeklyMatchDay(match), label: formatMatchSchedule(match).label, time: timeLabel(match) }))
    const readTimestamp = Date.parse('2026-09-30T16:03:00Z')
    const expectedReadTime = readTime(readTimestamp)
    delete globalThis.Intl
    assert.throws(() => weeklyMatchDay(matches[0]), ReferenceError)
    await import('./src/runtimeCompatibility.js')
    const raw = { season: { id: 'FCW26' }, teams: [{team_id:'A'}, {team_id:'B'}], matches,
      weekly_competition: { schema_version: 'friescup-weekly-public-v1', cycles: [{ id:'c', sequence:1, status:'ACTIVE', weeks:[{id:'w', week_number:1, status:'PUBLISHED', match_ids:matches.map(m=>m.match_id)}] }] } }
    const model = scheduleModel(raw, initialSelection(raw))
    assert.equal(model.resultCount, 3)
    assert.deepEqual(matches.map(match => ({day: weeklyMatchDay(match), label: formatMatchSchedule(match).label, time: timeLabel(match)})), expected)
    assert.equal(weeklyMatchDay(matches[1]), '2026-09-27')
    assert.equal(weeklyMatchDay(matches[2]), '2027-01-01')
    assert.equal(dayLabel(weeklyMatchDay(matches[1])), '09/27 周日')
    assert.equal(readTime(readTimestamp), expectedReadTime)
  `)
})

test('compatibility entry preserves a working browser Intl formatter', () => {
  runChild(`
    import assert from 'node:assert/strict'
    const formatter = Intl.DateTimeFormat
    await import('./src/runtimeCompatibility.js')
    assert.equal(Intl.DateTimeFormat, formatter)
  `)
})

test('public player metrics format on a phone runtime without native Intl', () => {
  runChild(`
    import assert from 'node:assert/strict'
    delete globalThis.Intl
    await import('./src/runtimeCompatibility.js')
    const { metricText } = await import('./src/shared/centerModel.js')
    assert.equal(metricText(7866.667), '7,866.7')
    assert.equal(metricText('0'), '0')
    assert.equal(metricText(null), '—')
  `)
})

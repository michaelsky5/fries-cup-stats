import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roomClockRemaining, roomClockState, calibrateRoomClock, roomClockHint, roomMapSide } from '../src/features/weekly-competition/roomPhaseClock.js'
import { demoRoomClock, changeDemoClock } from '../src/features/room-guide/roomDemoClock.js'

test('room remaining time uses server interval, not the viewer clock or time zone', () => {
  const clock = { serverNow: '2026-09-27T12:00:00Z', deadlineAt: '2026-09-27T12:01:00Z' }
  assert.equal(roomClockRemaining(clock, 15000), 45)
  assert.equal(roomClockRemaining(clock, 75000), 0)
  assert.equal(roomClockRemaining({ remainingMs: 45300 }, 90000), 46)
})

test('a delayed response consumes transit time and render delay without using the device wall clock', () => {
  const clock = { serverNow: '2026-10-04T12:00:00Z', deadlineAt: '2026-10-04T21:00:06+09:00' }
  const calibrated = calibrateRoomClock(clock, 100, 4100, clock.serverNow)
  assert.equal(calibrated.transitEstimateMs, 2000)
  assert.equal(calibrated.receivedAtMonoMs, 4100)
  assert.equal(roomClockRemaining(calibrated), 4)
  assert.equal(roomClockRemaining(calibrated, 1500), 3)
  assert.equal(roomClockRemaining(calibrated, 4500), 0)
})

test('a room clock enters one public fifteen-second submission window before expiration', () => {
  const clock = { serverNow: '2026-10-04T12:00:00Z', deadlineAt: '2026-10-04T12:01:15Z', submissionGrace: { normalDeadlineAt: '2026-10-04T12:01:00Z', seconds: 15 } }
  assert.deepEqual(roomClockState(clock, 55000), { seconds: 5, inSubmissionGrace: false })
  assert.deepEqual(roomClockState(clock, 60000), { seconds: 15, inSubmissionGrace: true })
  assert.deepEqual(roomClockState(clock, 74999), { seconds: 1, inSubmissionGrace: true })
  assert.deepEqual(roomClockState(clock, 75000), { seconds: 0, inSubmissionGrace: false })
  assert.deepEqual(roomClockState({ ...clock, submissionGrace: null }, 60000), { seconds: 15, inSubmissionGrace: false })
})

test('opening countdown hints render before the current map is created', () => {
  const data = {
    match: { format: 'RR5' },
    map: null,
    phaseClock: { enabled: true, limits: { FIRST_MAP: 60, REST: 120 } }
  }
  for (const action of ['BEGIN', 'CONFIRM_FIRST_PICK', 'REPORT_1V1_RESULT', 'PLAY']) {
    assert.equal(roomClockHint(data, action)[1], 60)
  }
  assert.equal(roomClockHint(data, 'RECORD_MAP_RESULT'), null)
  assert.equal(roomClockHint({ ...data, map: { order: 1 } }, 'RECORD_MAP_RESULT')[1], 120)
  assert.equal(roomClockHint({ ...data, map: { order: 5 } }, 'RECORD_MAP_RESULT'), null)
})
test('attack/defense labels always describe opening side and exclude symmetric modes', () => {
  for (const type of ['Hybrid', 'Escort']) {
    assert.equal(roomMapSide({ type, attackFirstSide: 'B' }, 'B'), 'ATTACK')
    assert.equal(roomMapSide({ type, attackFirstSide: 'B' }, 'A'), 'DEFEND')
  }
  for (const type of ['Control', 'Push', 'Flashpoint', '', undefined]) assert.equal(roomMapSide({ type, attackFirstSide: 'A' }, 'A'), null)
  assert.equal(roomMapSide({ type: 'Escort' }, 'A'), null)
})
test('guide timer survives rerenders, pause and stage transitions without modifying actual rooms', () => {
  const now = Date.parse('2026-09-27T12:00:00Z'), first = demoRoomClock('lineup', null, now)
  assert.equal(demoRoomClock('lineup', first, now + 20000).deadlineAt, first.deadlineAt)
  const paused = changeDemoClock(first, { expectedRevision: first.revision, stageKey: first.stage.key, action: 'SET_ENABLED', enabled: false }, now + 20000)
  assert.equal(paused.remainingMs, 40000)
  const resumed = changeDemoClock(paused, { expectedRevision: paused.revision, stageKey: paused.stage.key, action: 'SET_ENABLED', enabled: true }, now + 90000)
  assert.equal(Date.parse(resumed.deadlineAt) - now, 130000)
  const ban = demoRoomClock('banning', resumed, now + 95000)
  assert.equal(ban.remainingMs, 75000)
  assert.equal(demoRoomClock('banning', ban, now + 160000).status, 'RUNNING')
  assert.equal(demoRoomClock('banning', ban, now + 170000).status, 'EXPIRED')
})

test('practice timeout waives the hero without inventing one, while a disabled clock does not', async () => {
  const { createRoomPractice, applyRoomPractice, buildRoomPractice } = await import('../src/features/room-guide/roomPractice.js')
  const { default: copy } = await import('../src/features/room-guide/roomGuideCopy.json', { with: { type: 'json' } })
  const state = createRoomPractice('representative', 'banning')
  state.phaseClock.deadlineAt = new Date(Date.now() - 1).toISOString()
  assert.throws(() => applyRoomPractice(state, '/opening', { action: 'BAN', teamId: 'preview-team-A', hero: 'Ana' }))
  const next = applyRoomPractice(state, 'timeout', {}, 'scene').state
  const room = buildRoomPractice(next, copy['zh-CN'])
  assert.equal(room.map.banAStatus, 'TIMED_OUT'); assert.equal(room.map.banA, '')
  assert.equal(room.opening.complete, true)
  state.phaseClock.enabled = false
  assert.throws(() => applyRoomPractice(state, 'timeout', {}, 'scene'))
})

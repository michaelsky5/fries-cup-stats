import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roomClockRemaining, roomClockState, calibrateRoomClock, roomClockHint, roomMapSide } from '../src/features/weekly-competition/roomPhaseClock.js'
import { demoRoomClock, changeDemoClock } from '../src/features/room-guide/roomDemoClock.js'
import { roomClockUrgency, roomStageDurations } from '../src/features/weekly-competition/roomClockPresentation.js'

test('clock alerts distinguish ten/five seconds, grace, stale and paused snapshots', () => {
  const clock = { enabled: true, status: 'RUNNING', stage: { kind: 'MAP' } }
  assert.equal(roomClockUrgency(clock, 11), 'normal')
  assert.equal(roomClockUrgency(clock, 10), 'warning')
  assert.equal(roomClockUrgency(clock, 5), 'critical')
  assert.equal(roomClockUrgency(clock, 0), 'expired')
  assert.equal(roomClockUrgency(clock, 15, { inSubmissionGrace: true }), 'grace')
  assert.equal(roomClockUrgency(clock, 5, { stale: true }), 'stale')
  for (const changed of [{ enabled: false }, { status: 'WAITING' }, { stage: null }]) {
    assert.equal(roomClockUrgency({ ...clock, ...changed }, 5), 'inactive')
  }
  assert.equal(roomClockUrgency(clock, null), 'inactive')
})

test('stage durations reflect server limits without inventing missing values', () => {
  const clock = { stage: { mapOrder: 1 }, limits: { FIRST_MAP: 95, MAP: 120, LINEUP: 45, BAN: 30 } }
  assert.deepEqual(roomStageDurations(clock).map(v => [v.kind, v.seconds]), [['MAP', 95], ['LINEUP', 45], ['BAN', 30]])
  assert.equal(roomStageDurations({ ...clock, stage: { mapOrder: 2 } })[0].seconds, 120)
  assert.deepEqual(roomStageDurations(null), [])
})

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

test('slow server work is not counted twice as network delay', () => {
  const clock = { serverNow: '2026-10-20T12:00:00Z', deadlineAt: '2026-10-20T12:01:00Z', serverProcessingMs: 6000 }
  const calibrated = calibrateRoomClock(clock, 100, 6300, '2026-10-20T12:00:01Z')
  assert.equal(calibrated.transitEstimateMs, 1100)
  assert.equal(roomClockRemaining(calibrated), 59)
  assert.equal(roomClockRemaining(calibrated, 1000), 58)
  assert.equal(calibrateRoomClock({ ...clock, serverProcessingMs: 10000 }, 0, 200, clock.serverNow).transitEstimateMs, 0)
  for (const invalid of [undefined, null, -1, '6000', NaN, Infinity]) {
    assert.equal(calibrateRoomClock({ ...clock, serverProcessingMs: invalid }, 0, 200, clock.serverNow).transitEstimateMs, 100)
  }
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

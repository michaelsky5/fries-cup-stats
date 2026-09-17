import assert from 'node:assert/strict'
import {
  DEFAULT_MATCH_ROOM_OPEN_MINUTES,
  getMatchRoomLifecycle,
  getMatchRoomOpenMinutes
} from '../src/features/match-room/matchRoomLifecycle.js'

const startsAt = '2026-07-12T20:00:00+08:00'
const match = { status: 'PENDING', scheduled_at: startsAt }

assert.equal(DEFAULT_MATCH_ROOM_OPEN_MINUTES, 15)
assert.equal(getMatchRoomOpenMinutes(match), 15)
assert.equal(getMatchRoomLifecycle(match, { now: new Date('2026-07-12T19:44:59+08:00').getTime() }).state, 'LOCKED')
assert.equal(getMatchRoomLifecycle(match, { now: new Date('2026-07-12T19:45:00+08:00').getTime() }).state, 'OPEN')
assert.equal(getMatchRoomOpenMinutes({ ...match, room_open_minutes_before: 30 }), 30)

const completed = getMatchRoomLifecycle({ ...match, status: 'COMPLETE' })
assert.equal(completed.state, 'READ_ONLY')
assert.equal(completed.canEnter, true)
assert.equal(completed.canOperate, false)
assert.equal(getMatchRoomLifecycle({ ...match, status: 'SUBMITTED' }).state, 'READ_ONLY')
assert.equal(getMatchRoomLifecycle({ ...match, status: 'LOCKED' }).state, 'READ_ONLY')

console.log('Match room lifecycle assertions passed.')

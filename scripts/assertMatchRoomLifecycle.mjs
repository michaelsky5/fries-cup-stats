import assert from 'node:assert/strict'
import {
  DEFAULT_MATCH_ROOM_OPEN_MINUTES,
  getMatchRoomLifecycle,
  getMatchRoomOpenMinutes
} from '../src/features/match-room/matchRoomLifecycle.js'

const startsAt = '2026-07-12T20:00:00+08:00'
const match = { status: 'PENDING', scheduled_at: startsAt }

assert.equal(DEFAULT_MATCH_ROOM_OPEN_MINUTES, 30)
assert.equal(getMatchRoomOpenMinutes(match), 30)
const beforeOpening = getMatchRoomLifecycle(match, { now: new Date('2026-07-12T19:29:59.999+08:00').getTime() })
assert.equal(beforeOpening.state, 'LOCKED')
assert.equal(beforeOpening.canEnter, false)
assert.equal(beforeOpening.remainingMs, 1)
const atOpening = getMatchRoomLifecycle(match, { now: new Date('2026-07-12T19:30:00+08:00').getTime() })
assert.equal(atOpening.state, 'OPEN')
assert.equal(atOpening.canEnter, true)
assert.equal(atOpening.canOperate, true)
assert.equal(getMatchRoomOpenMinutes({ ...match, room_open_minutes_before: 60 }), 60)

const completed = getMatchRoomLifecycle({ ...match, status: 'COMPLETE' })
assert.equal(completed.state, 'READ_ONLY')
assert.equal(completed.canEnter, true)
assert.equal(completed.canOperate, false)
assert.equal(getMatchRoomLifecycle({ ...match, status: 'SUBMITTED' }).state, 'READ_ONLY')
assert.equal(getMatchRoomLifecycle({ ...match, status: 'LOCKED' }).state, 'READ_ONLY')

console.log('Match room lifecycle assertions passed.')

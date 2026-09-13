import assert from 'node:assert/strict'
import {
  getMatchRoomReadyState,
  setMatchRoomSideReady
} from '../src/features/match-room/matchRoomReadiness.js'

assert.deepEqual(getMatchRoomReadyState(), { A: false, B: false, count: 0, bothReady: false })
assert.deepEqual(getMatchRoomReadyState({ state: { ready: { A: true } } }), { A: true, B: false, count: 1, bothReady: false })
assert.deepEqual(setMatchRoomSideReady({ ready: { A: true, B: false } }, 'B', true), { A: true, B: true })
assert.equal(getMatchRoomReadyState({ ready: { A: true, B: true } }).bothReady, true)
assert.deepEqual(setMatchRoomSideReady({ ready: { A: true, B: false } }, 'unknown', true), { A: true, B: false })

console.log('Match room readiness assertions passed.')

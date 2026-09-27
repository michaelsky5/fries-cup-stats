import assert from 'node:assert/strict'
import test from 'node:test'
import { canSubmitRoomLineup, roomLineupSubmitted } from '../src/features/weekly-competition/roomLineups.js'
import { buildWeeklyRoomPreview } from '../src/features/room-guide/roomDemoFixture.js'
import { createRoomPractice, buildRoomPractice, applyRoomPractice } from '../src/features/room-guide/roomPractice.js'
import copy from '../src/features/room-guide/roomGuideCopy.json' with { type: 'json' }

test('both teams may submit sealed lineups, and a hidden submitted side remains locked', () => {
  const room = buildWeeklyRoomPreview('lineup')
  assert.equal(canSubmitRoomLineup(room.map, 'A'), true)
  assert.equal(canSubmitRoomLineup(room.map, 'B'), true)
  room.map.lineupLocks.B = true
  assert.equal(roomLineupSubmitted(room.map, 'B'), true)
  assert.equal(canSubmitRoomLineup(room.map, 'B'), false)
  assert.equal(canSubmitRoomLineup(room.map, 'A'), true)
  room.map.lineupLocks.A = true
  assert.equal(canSubmitRoomLineup(room.map, 'A'), false)
})

test('a frontend served before the backend upgrade still follows the old API turn', () => {
  const map = { chooserSide: 'B', lineupTurn: 'B', lineupLocks: {}, lineupA: [], lineupB: [] }
  assert.equal(canSubmitRoomLineup(map, 'A'), false)
  assert.equal(canSubmitRoomLineup(map, 'B'), true)
})

test('practice force start mirrors referee-only, confirmed and reasoned override', () => {
  let state = createRoomPractice('referee', 'ready')
  state.checkIns['preview-team-A-p0'] = false
  assert.equal(buildRoomPractice(state, copy['zh-CN']).startControl.canForceStart, true)
  const body = { action: 'FORCE_START', actualStartConfirmed: true, note: '游戏内已核对到场' }
  assert.throws(() => applyRoomPractice(state, '/commands', { ...body, note: '' }))
  assert.throws(() => applyRoomPractice(state, '/commands', { ...body, actualStartConfirmed: false }))
  assert.throws(() => applyRoomPractice({ ...state, role: 'representative' }, '/commands', body))
  assert.throws(() => applyRoomPractice({ ...state, scene: 'lineup' }, '/commands', body))
  state = applyRoomPractice(state, '/commands', body).state
  assert.equal(state.scene, 'live')
  assert.equal(state.checkIns['preview-team-A-p0'], false)
})

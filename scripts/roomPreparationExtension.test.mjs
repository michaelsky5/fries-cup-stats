import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canExtendRoomPreparation, preparationExtensionDeadline } from '../src/features/weekly-competition/roomPreparationExtension.js'
import { getRoomPanel, getRoomPanelNavigation } from '../src/features/weekly-competition/roomPanelNavigation.js'

const room = { access: { staff: true, administrator: false, canWrite: true }, phase: 'PREPARING', match: { status: 'PENDING' }, map: { status: 'READY' }, timing: { serverNow: '2026-10-04T12:55:00Z', preparationDueAt: '2026-10-04T12:25:00Z' } }

test('assigned referee preparation control does not require administrator privileges', () => {
  assert.equal(canExtendRoomPreparation(room), true)
  assert.equal(canExtendRoomPreparation({ ...room, access: { ...room.access, administrator: true } }), true)
  assert.equal(canExtendRoomPreparation({ ...room, map: null }), true)
  assert.equal(canExtendRoomPreparation({ ...room, access: { staff: false, canWrite: true, representativeTeams: ['A'] } }), false)
  assert.equal(canExtendRoomPreparation({ ...room, access: { staff: false, production: true, canWrite: true } }), false)
})

test('read-only, completed, simulated and public-fault rooms have no preparation write control', () => {
  for (const change of [{ access: { staff: true, canWrite: false } }, { archived: true }, { simulation: true }, { result: {} }, { phase: 'LIVE' }, { match: { status: 'COMPLETE' } }, { map: { status: 'LIVE' } }, { map: { status: 'COMPLETE' } }, { timing: { ...room.timing, publicFault: { active: true } } }]) {
    assert.equal(canExtendRoomPreparation({ ...room, ...change }), false)
  }
})

test('expired extension preview grants the requested time from server now', () => {
  assert.equal(preparationExtensionDeadline(room, 600), '2026-10-04T13:05:00.000Z')
  assert.equal(preparationExtensionDeadline(room, 300), '2026-10-04T13:00:00.000Z')
  assert.equal(preparationExtensionDeadline({ ...room, timing: { ...room.timing, serverNow: '2026-10-04T12:05:00Z' } }, 600), '2026-10-04T12:35:00.000Z')
  assert.equal(preparationExtensionDeadline({ ...room, timing: {} }, 600), null)
})

test('preparation modal replaces the current room panel and preserves return navigation', () => {
  const location = { pathname: '/me/matches/m1/room', search: '?lang=zh&season=FCW2026', hash: '', key: 'room-base', state: { returnTo: '/me?section=matches' } }
  const records = getRoomPanelNavigation(location, 'm1', 'records')
  const preparation = getRoomPanelNavigation({ ...location, state: records.options.state }, 'm1', 'preparation')
  assert.equal(preparation.options.replace, true)
  assert.equal(getRoomPanel(preparation.options.state, 'm1').key, 'preparation')
  assert.equal(preparation.options.state.returnTo, location.state.returnTo)
  assert.deepEqual(getRoomPanelNavigation({ ...location, state: preparation.options.state }, 'm1', ''), { to: -1 })
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roomPenaltySnapshot, observeRoomPenalties } from '../src/features/weekly-competition/roomPenaltyNotice.js'
import { getRoomPanelNavigation } from '../src/features/weekly-competition/roomPanelNavigation.js'
const fixture = () => ({ match: { id: 'm1', teamA: { id: 'a' }, teamB: { id: 'b' } }, actor: { id: 'u1' }, access: { teamIds: ['a'], representativeTeams: ['a'] }, phaseClock: { timeoutPenalties: [] }, map: { order: 1, name: 'Lijiang Tower' } })
const penalty = (patch = {}) => ({ side: 'A', kind: 'MAP', mapOrder: 1, count: 1, at: '2026-10-21T00:00:00Z', outcome: 'WARNING', ...patch })
const observe = (previous, data) => observeRoomPenalties(previous, roomPenaltySnapshot(data))

test('initial history, actor changes and match changes establish a silent baseline', () => {
  const data = fixture(); data.phaseClock.timeoutPenalties = [penalty()]
  let seen = observe(null, data); assert.equal(seen.added.length, 0)
  data.actor.id = 'u2'; data.phaseClock.timeoutPenalties.push(penalty({ count: 2, outcome: 'BAN_FORFEIT' }))
  seen = observe(seen, data); assert.equal(seen.added.length, 0)
  data.match.id = 'm2'; assert.equal(observe(seen, data).added.length, 0)
})
test('only new persisted outcomes for an own-team representative notify once', () => {
  const data = fixture(); let seen = observe(null, data)
  data.phaseClock.timeoutPenalties = [penalty({ side: 'B' }), penalty()]
  seen = observe(seen, data); assert.deepEqual(seen.added.map(e => e.side), ['A'])
  seen = observe(seen, data); assert.equal(seen.added.length, 0)
  data.phaseClock.timeoutPenalties = []; seen = observe(seen, data)
  data.phaseClock.timeoutPenalties = [penalty()]; assert.equal(observe(seen, data).added.length, 0)
})
test('observers and staff without their own representative assignment receive no popup', () => {
  for (const access of [{ teamIds: ['a'], representativeTeams: [] }, { staff: true, teamIds: [], representativeTeams: ['a', 'b'] }]) {
    const data = { ...fixture(), access }; const seen = observe(null, data)
    data.phaseClock.timeoutPenalties = [penalty()]
    assert.equal(observe(seen, data).added.length, 0)
  }
})
test('gaining representative permission does not replay a preceding penalty', () => {
  const data = fixture(); data.access.representativeTeams = []; let seen = observe(null, data)
  data.phaseClock.timeoutPenalties = [penalty()]; seen = observe(seen, data)
  data.access.representativeTeams = ['a']; assert.equal(observe(seen, data).added.length, 0)
})
test('countdown, expiry and grace alone never produce a penalty notification', () => {
  const data = fixture(); const seen = observe(null, data)
  for (const remainingMs of [10000, 5000, 0]) {
    Object.assign(data.phaseClock, { enabled: true, status: 'EXPIRED', remainingMs, submissionGrace: { active: true } })
    assert.equal(observe(seen, data).added.length, 0)
  }
})
test('lineup and ban-order penalties are distinct confirmed events', () => {
  const data = fixture(); const seen = observe(null, data)
  data.phaseClock.timeoutPenalties = [penalty({ kind: 'LINEUP' }), penalty({ kind: 'BAN_ORDER', count: 2, outcome: 'BAN_FORFEIT' })]
  assert.deepEqual(observe(seen, data).added.map(e => e.kind), ['LINEUP', 'BAN_ORDER'])
})
test('confirmed ban timeout notifies once and map penalties do not create a duplicate ban notice', () => {
  const data = fixture(); let seen = observe(null, data)
  data.opening = { mapOrder: 1, setup: { banAStatus: 'TIMED_OUT', banATimeoutReason: 'DEADLINE' } }
  seen = observe(seen, data); assert.deepEqual(seen.added.map(e => e.kind), ['BAN'])
  data.map.lineupContext = 'corrected'; assert.equal(observe(seen, data).added.length, 0)
  data.opening.setup.banATimeoutReason = 'MAP_SELECTION'; data.phaseClock.timeoutPenalties = [penalty({ count: 2, outcome: 'BAN_FORFEIT' })]
  assert.deepEqual(observe(seen, data).added.map(e => e.kind), ['MAP'])
})
test('archiving a room clears notification scope; old servers retain map outcome support', () => {
  const data = fixture(); delete data.phaseClock.timeoutPenalties; const seen = observe(null, data)
  data.phaseClock.mapTimeouts = { latest: penalty({ count: 3, outcome: 'RANDOM_MAP', mapName: 'Rialto' }) }
  const next = observe(seen, data); assert.equal(next.added[0].mapName, 'Rialto')
  data.archived = true; const archived = observe(next, data); assert.equal(archived.reset, true); assert.equal(archived.added.length, 0)
})
test('penalty to rules shares one history entry; Back dismisses without leaving the match', () => {
  const room = { pathname: '/me/matches/m1/room', search: '?lang=en', hash: '', key: 'room-base' }
  const opened = getRoomPanelNavigation(room, 'm1', 'timeout')
  assert.equal(opened.options.replace, false)
  const rules = getRoomPanelNavigation({ ...room, state: opened.options.state }, 'm1', 'records')
  assert.equal(rules.options.replace, true)
  assert.deepEqual(getRoomPanelNavigation({ ...room, state: rules.options.state }, 'm1', ''), { to: -1 })
})

test('an already dismissed Forward notification clears in place without another history step', () => {
  const room = { pathname: '/me/matches/m1/room', search: '?lang=en', hash: '#map', key: 'room-base', state: { returnTo: '/me' } }
  const opened = getRoomPanelNavigation(room, 'm1', 'timeout')
  const cleared = getRoomPanelNavigation({ ...room, state: opened.options.state }, 'm1', '', { replace: true })
  assert.deepEqual(cleared, { to: { pathname: room.pathname, search: room.search, hash: room.hash }, options: { replace: true, state: room.state } })
  assert.equal(getRoomPanelNavigation({ ...room, state: cleared.options.state }, 'm1', '', { replace: true }), null)
})

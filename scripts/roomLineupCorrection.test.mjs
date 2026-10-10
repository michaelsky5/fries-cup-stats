import test from 'node:test'
import assert from 'node:assert/strict'
import { getRoomLineupCorrection } from '../src/features/weekly-competition/roomLineupCorrection.js'
import { getRoomPanel, getRoomPanelNavigation } from '../src/features/weekly-competition/roomPanelNavigation.js'

const room = (view, access = {}) => ({
  phase: 'PREPARING', opening: { complete: false },
  match: { teamA: { id: 'a' }, teamB: { id: 'b' } },
  access: { representativeTeams: ['a'], ...access },
  captainAgreements: { lineup: { withdrawTeams: [], ...view } }
})

test('correction actions appear beside the authorized team, including sealed withdrawals', () => {
  const request = room({ canRequest: true })
  assert.deepEqual(getRoomLineupCorrection(request, 'a'), { pending: false, canOperate: true })
  assert.equal(getRoomLineupCorrection(request, 'b'), null)
  for (const role of [{ representativeTeams: [] }, { representativeTeams: [], production: true }]) {
    assert.equal(getRoomLineupCorrection(room({ canRequest: true }, role), 'a'), null)
  }
  const sealed = room({ withdrawTeams: ['a'] })
  assert.deepEqual(getRoomLineupCorrection(sealed, 'a'), { pending: false, canOperate: true })
  assert.equal(getRoomLineupCorrection(sealed, 'b'), null)
  const referee = room({ withdrawTeams: ['a', 'b'] }, { representativeTeams: [], staff: true })
  for (const teamId of ['a', 'b']) assert.equal(getRoomLineupCorrection(referee, teamId).canOperate, true)
})

test('pending correction is visible to readers without granting them response rights', () => {
  const pending = { valid: true, status: 'PENDING', proposerSide: 'B', canRespond: true }
  assert.deepEqual(getRoomLineupCorrection(room(pending), 'a'), { pending: true, canOperate: true })
  assert.deepEqual(getRoomLineupCorrection(room(pending, { representativeTeams: [] }), 'b'), { pending: true, canOperate: false })
  assert.equal(getRoomLineupCorrection(room(pending, { representativeTeams: [] }), 'a'), null)
  const cancel = room({ ...pending, canRespond: false, canCancel: true, proposerSide: 'A' })
  assert.equal(getRoomLineupCorrection(cancel, 'a').canOperate, true)
})

test('expired corrections and later phases do not retain an entry or change room timing', () => {
  const data = room({ canRequest: true })
  data.timing = { preparationDueAt: '2026-10-10T12:10:00Z' }
  const before = structuredClone(data)
  getRoomLineupCorrection(data, 'a')
  assert.deepEqual(data, before)
  for (const phase of ['LIVE', 'PAUSED', 'REVIEW', 'ARCHIVED']) assert.equal(getRoomLineupCorrection({ ...data, phase }, 'a'), null)
  assert.equal(getRoomLineupCorrection({ ...data, opening: { complete: true } }, 'a'), null)
  assert.equal(getRoomLineupCorrection(room({ valid: false, status: 'PENDING', proposerSide: 'A' }), 'a'), null)
  assert.equal(getRoomLineupCorrection({ ...data, captainAgreements: null }, 'a'), null)
})

test('the correction dialog preserves room context and shares the roster history entry', () => {
  const location = { pathname: '/me/matches/m1/room', search: '?lang=zh&competition=FCW26', hash: '', key: 'room-base', state: { returnTo: '/me?section=matches' } }
  const roster = getRoomPanelNavigation(location, 'm1', 'teams')
  const correction = getRoomPanelNavigation({ ...location, state: roster.options.state }, 'm1', 'lineup-correction')
  assert.deepEqual(correction.to, { pathname: location.pathname, search: location.search, hash: '' })
  assert.equal(correction.options.replace, true)
  assert.equal(correction.options.state.returnTo, location.state.returnTo)
  assert.equal(getRoomPanel(correction.options.state, 'm1').key, 'lineup-correction')
  assert.equal(getRoomPanel(correction.options.state, 'm2'), null)
  assert.deepEqual(getRoomPanelNavigation({ ...location, state: correction.options.state }, 'm1', ''), { to: -1 })
})

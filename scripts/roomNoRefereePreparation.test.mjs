import assert from 'node:assert/strict'
import test from 'node:test'
import { canRecordPreparationIncident } from '../src/features/weekly-competition/roomNoRefereePreparation.js'
import { getRoomPanel, getRoomPanelNavigation } from '../src/features/weekly-competition/roomPanelNavigation.js'

const room = { canReportPreparationTimeout: true, access: { canWrite: true, operatorMode: 'TEAM_CAPTAINS', representativeTeams: ['A'] }, match: { status: 'PENDING' }, map: { order: 1 }, timing: { preparationOverdue: true, preparationIncidents: [] } }

test('only a current no-referee representative can report an expired preparation', () => {
  assert.equal(canRecordPreparationIncident(room), true)
  for (const change of [{ canReportPreparationTimeout: false }, { training: {} }, { access: { ...room.access, canWrite: false } }, { access: { ...room.access, operatorMode: 'REFEREE' } }, { access: { ...room.access, representativeTeams: [] } }, { timing: { preparationOverdue: false } }, { timing: { preparationOverdue: true, publicFault: { active: true } } }, { match: { status: 'COMPLETE' } }]) assert.equal(canRecordPreparationIncident({ ...room, ...change }), false)
})

test('a report closes only the reporting teams same-map form, preserving other teams and later maps', () => {
  const timing = { ...room.timing, preparationIncidents: [{ mapOrder: 1, teamId: 'A' }] }
  assert.equal(canRecordPreparationIncident({ ...room, timing }), false)
  assert.equal(canRecordPreparationIncident({ ...room, timing, access: { ...room.access, representativeTeams: ['B'] } }), true)
  assert.equal(canRecordPreparationIncident({ ...room, timing, map: { order: 2 } }), true)
})

test('evidence form uses normal panel navigation without losing the room return path', () => {
  const location = { pathname: '/me/matches/m1/room', key: 'base', state: { returnTo: '/me?section=matches' } }
  const panel = getRoomPanelNavigation(location, 'm1', 'preparation-incident')
  assert.equal(getRoomPanel(panel.options.state, 'm1').key, 'preparation-incident')
  assert.equal(panel.options.state.returnTo, location.state.returnTo)
  assert.deepEqual(getRoomPanelNavigation({ ...location, state: panel.options.state }, 'm1', ''), { to: -1 })
})

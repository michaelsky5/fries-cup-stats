import test from 'node:test'
import assert from 'node:assert/strict'
import { showPersonalLobbyEntry } from '../src/features/team-lobby/lobbyEntryModel.js'

const viewer = { id: 'fixture-player', role: 'VIEWER' }
test('new and confirmed unteamed accounts get a personal lobby entry', () => {
  assert.equal(showPersonalLobbyEntry({ user: viewer, competitions: [] }), true)
  assert.equal(showPersonalLobbyEntry({ user: viewer, competitions: [{ teams: [] }] }), true)
})
test('a team in any account competition keeps team affairs primary', () => {
  assert.equal(showPersonalLobbyEntry({ user: viewer, competitions: [{ teams: [] }, { teams: [{ id: 'fixture-team' }] }] }), false)
})
test('unknown, loading and failed membership reads do not imply no team', () => {
  for (const patch of [{}, { competitions: null }, { competitions: [{}] }, { competitions: [], loading: true }, { competitions: [], error: 'offline' }]) {
    assert.equal(showPersonalLobbyEntry({ user: viewer, ...patch }), false)
  }
  assert.equal(showPersonalLobbyEntry({ competitions: [] }), false)
})
test('administrator mode does not get the player invitation', () => {
  assert.equal(showPersonalLobbyEntry({ user: { role: 'ADMIN' }, competitions: [] }), false)
  assert.equal(showPersonalLobbyEntry({ user: { role: 'ADMIN', accountMode: 'PLAYER' }, competitions: [] }), true)
})

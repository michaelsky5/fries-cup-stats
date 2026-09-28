import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWeeklyRoomPreview } from '../src/features/room-guide/roomDemoFixture.js'
import { roomDecisionSnapshot, changedRoomDecisions } from '../src/features/weekly-competition/roomDecisionEvents.js'

test('sealed lineup never enters shared notifications even when own players are present', () => {
  const data = buildWeeklyRoomPreview('banorder')
  data.map.lineupsRevealed = false
  data.map.lineupB = []
  const snapshot = roomDecisionSnapshot(data)
  assert.equal(snapshot.lineups, null)
  assert.deepEqual(snapshot.events.map(event => event.kind), ['MAP'])
  const sealed = buildWeeklyRoomPreview('banorder')
  sealed.map.lineupsRevealed = false
  delete sealed.map.lineupMode
  assert.equal(roomDecisionSnapshot(sealed).lineups, null)
})

test('initial load and repeated polling do not announce previous decisions', () => {
  const data = buildWeeklyRoomPreview('banning')
  const first = roomDecisionSnapshot(data)
  assert.deepEqual(changedRoomDecisions(null, first), [])
  data.phaseClock.serverNow = '2030-01-01T00:00:00.000Z'
  data.map.lineupA.reverse()
  data.map.lineupA[0].name = 'Renamed player'
  assert.deepEqual(changedRoomDecisions(first, roomDecisionSnapshot(data)), [])
  data.actor.id = 'another-actor'
  assert.deepEqual(changedRoomDecisions(first, roomDecisionSnapshot(data)), [])
})

test('map, public lineup, ban order and each ban announce exactly the changed results', () => {
  const data = buildWeeklyRoomPreview('choosing'), initial = roomDecisionSnapshot(data)
  const lineup = buildWeeklyRoomPreview('lineup'), picked = roomDecisionSnapshot(lineup)
  assert.deepEqual(changedRoomDecisions(initial, picked).map(event => event.kind), ['MAP'])
  const publicLineups = roomDecisionSnapshot(buildWeeklyRoomPreview('banorder'))
  assert.deepEqual(changedRoomDecisions(picked, publicLineups).map(event => event.kind), ['LINEUPS'])
  const ban = buildWeeklyRoomPreview('banning'), ordered = roomDecisionSnapshot(ban)
  assert.deepEqual(changedRoomDecisions(publicLineups, ordered).map(event => event.kind), ['BAN_ORDER'])
  ban.opening.setup.banA = 'Ana'
  const firstBan = roomDecisionSnapshot(ban)
  assert.deepEqual(changedRoomDecisions(ordered, firstBan).map(event => event.kind), ['BAN_A'])
  ban.opening.setup.banB = 'Ashe'
  assert.deepEqual(changedRoomDecisions(firstBan, roomDecisionSnapshot(ban)).map(event => event.kind), ['BAN_B'])
})

test('revealed substitutions and role changes compare with last public map, not planned roster', () => {
  const data = buildWeeklyRoomPreview('banorder'), previous = structuredClone(data.map)
  data.map.order = 2; data.map.lineupContext = 'second-map'; data.opening.mapOrder = 2
  const substitute = data.rosters[0].members[6]
  data.map.lineupA[1] = { ...substitute, playerId: substitute.id, role: 'DPS' }
  data.map.lineupB[0].role = 'SUP'; data.map.lineupB[3].role = 'TANK'
  data.maps = [previous, data.map]
  const result = roomDecisionSnapshot(data)
  assert.deepEqual(result.lineups.A.changes.added.map(player => player.playerId), [substitute.id])
  assert.deepEqual(result.lineups.A.changes.removed.map(player => player.playerId), [previous.lineupA[1].playerId])
  assert.equal(result.lineups.B.changes.roles.length, 2)
  assert.deepEqual(result.lineups.B.players.map(player => player.role), ['DPS', 'DPS', 'TANK', 'SUP', 'SUP'])
  data.map.lineupsRevealed = false
  assert.equal(roomDecisionSnapshot(data).lineups, null)
})

test('corrections clear revoked bans and permit a fresh notification when reconfirmed', () => {
  const data = buildWeeklyRoomPreview('ready'), first = roomDecisionSnapshot(data)
  data.opening.setup.banA = null
  const cleared = roomDecisionSnapshot(data)
  assert.equal(cleared.map.banA, null)
  assert.deepEqual(changedRoomDecisions(first, cleared), [])
  data.opening.setup.banA = 'Ana'
  assert.deepEqual(changedRoomDecisions(cleared, roomDecisionSnapshot(data)).map(event => event.kind), ['BAN_A'])
})

test('next-map selection and final results cannot display the old map as new decisions', () => {
  const data = buildWeeklyRoomPreview('review')
  data.opening.mapOrder = 2
  assert.equal(roomDecisionSnapshot(data).map, null)
  assert.deepEqual(roomDecisionSnapshot(buildWeeklyRoomPreview('result')).events, [])
})

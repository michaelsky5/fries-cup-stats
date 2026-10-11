import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWeeklyRoomPreview } from '../src/features/room-guide/roomDemoFixture.js'
import { getRoomLineupHighlights } from '../src/features/weekly-competition/roomLineupHighlights.js'

const event = (mapOrder, side, changes, createdAt = '2026-10-10T12:00:00Z') => ({ id: `${mapOrder}:${side}:${createdAt}`, kind: 'LINEUP_CHANGE', mapOrder, side, added: [], removed: [], roles: [], createdAt, ...changes })

test('the first public lineup does not mark planned roster differences as substitutions', () => {
  const data = buildWeeklyRoomPreview('banorder')
  data.map.lineupA[1] = { ...data.rosters[0].members[6], playerId: data.rosters[0].members[6].id, role: 'DPS' }
  assert.deepEqual(getRoomLineupHighlights(data), { A: {}, B: {} })
})

test('public map changes distinguish incoming, outgoing and role changes on each team', () => {
  const data = buildWeeklyRoomPreview('banorder'), previous = structuredClone(data.map)
  data.map.order = 2; data.opening.mapOrder = 2
  const incoming = data.rosters[0].members[6]
  data.map.lineupA[1] = { ...incoming, playerId: incoming.id, role: 'DPS' }
  data.map.lineupB[0].role = 'SUP'; data.map.lineupB[3].role = 'TANK'
  data.maps = [previous, data.map]
  const highlights = getRoomLineupHighlights(data)
  assert.deepEqual(highlights.A[incoming.id], { kind: 'IN' })
  assert.deepEqual(highlights.A[previous.lineupA[1].playerId], { kind: 'OUT' })
  assert.deepEqual(highlights.B[data.map.lineupB[0].playerId], { kind: 'ROLE', previousRole: 'TANK', role: 'SUP' })
  assert.equal(Object.keys(highlights.A).length, 2)
  assert.equal(Object.keys(highlights.B).length, 2)
})

test('saved corrections within one map remain visible after reload', () => {
  const data = buildWeeklyRoomPreview('banorder'), old = data.map.lineupA[1]
  const incoming = { ...data.rosters[0].members[6], playerId: data.rosters[0].members[6].id, role: 'DPS' }
  data.map.lineupA[1] = incoming
  data.operationHistory = [event(1, 'A', { added: [incoming], removed: [old] })]
  assert.deepEqual(getRoomLineupHighlights(JSON.parse(JSON.stringify(data))).A, { [incoming.playerId]: { kind: 'IN' }, [old.playerId]: { kind: 'OUT' } })
})

test('sealed reconfirmation and next-map selection never expose personnel highlights', () => {
  const data = buildWeeklyRoomPreview('banorder'), player = data.map.lineupA[1]
  data.operationHistory = [event(1, 'A', { added: [player] })]
  data.map.lineupsRevealed = false
  assert.deepEqual(getRoomLineupHighlights(data), { A: {}, B: {} })
  data.map.lineupsRevealed = true; data.opening.mapOrder = 2
  assert.deepEqual(getRoomLineupHighlights(data), { A: {}, B: {} })
})

test('historical corrections from another map do not highlight the current unchanged lineup', () => {
  const data = buildWeeklyRoomPreview('banorder'), previous = structuredClone(data.map)
  data.map.order = 2; data.opening.mapOrder = 2; data.maps = [previous, data.map]
  data.operationHistory = [event(1, 'A', { added: [data.map.lineupA[1]] })]
  assert.deepEqual(getRoomLineupHighlights(data), { A: {}, B: {} })
})

test('a player moved out and back in is labelled from the latest confirmed state', () => {
  const data = buildWeeklyRoomPreview('banorder'), starter = data.map.lineupA[1]
  const substitute = { ...data.rosters[0].members[6], playerId: data.rosters[0].members[6].id, role: 'DPS' }
  data.operationHistory = [event(1, 'A', { added: [starter], removed: [substitute] }, '2026-10-10T12:01:00Z'), event(1, 'A', { added: [substitute], removed: [starter] })]
  assert.deepEqual(getRoomLineupHighlights(data).A, { [starter.playerId]: { kind: 'IN' }, [substitute.playerId]: { kind: 'OUT' } })
})

test('role annotations use the latest applicable role and reject missing previous roles', () => {
  const data = buildWeeklyRoomPreview('banorder'), player = data.map.lineupA[1]
  data.operationHistory = [event(1, 'A', { roles: [{ ...player, previousRole: 'SUP' }] }, '2026-10-10T12:01:00Z'), event(1, 'A', { roles: [{ ...player, role: 'SUP', previousRole: 'DPS' }] })]
  assert.deepEqual(getRoomLineupHighlights(data).A[player.playerId], { kind: 'ROLE', previousRole: 'SUP', role: 'DPS' })
  data.operationHistory = [event(1, 'A', { roles: [{ ...player }] })]
  assert.deepEqual(getRoomLineupHighlights(data), { A: {}, B: {} })
})

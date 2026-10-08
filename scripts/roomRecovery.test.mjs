import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWeeklyRoomPreview } from '../src/features/room-guide/roomDemoFixture.js'
import { normalizeRoomResponse, roomDiagnostic } from '../src/features/weekly-competition/roomResponse.js'
import { createRoomSync } from '../src/features/weekly-competition/roomSync.js'
import { roomDecisionSnapshot } from '../src/features/weekly-competition/roomDecisionEvents.js'
import { validRoomLineup } from '../src/features/weekly-competition/roomLineups.js'
import { publicRoomLineupChanges, roomPersonnelEvents, roomImportantEvents } from '../src/features/weekly-competition/roomPersonnelEvents.js'

const flush = () => new Promise(resolve => setImmediate(resolve))
test('an opening room with no current map is a valid snapshot', () => {
  const data = buildWeeklyRoomPreview('opening')
  data.map = null; data.maps = []
  assert.equal(normalizeRoomResponse(data, data.match.id).map, null)
  assert.equal(roomDecisionSnapshot(data).map, null)
})
test('partial snapshots and null lineup players fail safely before rendering', () => {
  for (const update of [data => { data.access = null }, data => { data.rosters = null }, data => { data.map.lineupA = [null] }, data => { data.opening.access = null }, data => { data.maps.push(null) }]) {
    const data = buildWeeklyRoomPreview('ready'); update(data)
    assert.throws(() => normalizeRoomResponse(data, data.match.id), error => error.data.error === 'ROOM_RESPONSE_INCOMPLETE')
  }
  assert.equal(validRoomLineup([null, null, null, null, null]), false)
})
test('an incomplete poll preserves the last room, pauses writes and allows a successful read recovery', async () => {
  const data = buildWeeklyRoomPreview('ready'); data.access.canWrite = true
  let broken = false, writes = 0
  const sync = createRoomSync({ matchId: data.match.id, read: async () => normalizeRoomResponse(broken ? { ...data, rosters: null } : data, data.match.id), setTimer: () => 1, clearTimer: () => {} })
  sync.start(); await flush()
  const previous = sync.getSnapshot().data
  broken = true; await sync.refresh()
  assert.equal(sync.getSnapshot().data, previous)
  assert.equal(sync.getSnapshot().connection.errorCode, 'ROOM_RESPONSE_INCOMPLETE')
  await sync.mutate(async () => { writes++ })
  assert.equal(writes, 0)
  broken = false; assert.equal(await sync.refresh({ force: true }), true)
  assert.equal(sync.getSnapshot().error, '')
  assert.equal(sync.getSnapshot().connection.errorCode, null)
  assert.equal(writes, 0)
  sync.stop()
})
test('public personnel history excludes sealed lineups and unrelated private messages', () => {
  const data = buildWeeklyRoomPreview('ready')
  const next = structuredClone(data.map); next.order = 2
  next.lineupA[1] = { playerId: data.rosters[0].members[6].id, role: 'DPS' }
  data.maps.push(next)
  const changes = publicRoomLineupChanges(data)
  assert.equal(changes.length, 1)
  assert.equal(changes[0].mapOrder, 2)
  assert.equal(changes[0].added[0].name, data.rosters[0].members[6].name)
  assert.equal(changes[0].removed[0].playerId, data.map.lineupA[1].playerId)
  next.lineupsRevealed = false
  assert.deepEqual(publicRoomLineupChanges(data), [])
  data.personnelChanges = [{ id: 'rep', kind: 'REPRESENTATIVE_ASSIGNED', body: 'A → B' }, { id: 'chat', kind: 'CHAT', body: 'Private' }]
  assert.deepEqual(roomPersonnelEvents(data).map(event => event.id), ['rep'])
})
test('diagnostics include a match and reason without serializing account or room data', () => {
  const text = roomDiagnostic({ matchId: 'LOCAL-ROOM', connection: { status: 'retrying', errorCode: 'ROOM_RESPONSE_INCOMPLETE', token: 'secret' }, user: { email: 'private@example.com' } })
  assert.match(text, /LOCAL-ROOM/); assert.match(text, /ROOM_RESPONSE_INCOMPLETE/)
  assert.doesNotMatch(text, /secret|private@example/)
})
test('important-action feed never includes sealed lineup identities, even in map records', () => {
  const data = buildWeeklyRoomPreview('ready')
  data.map.lineupsRevealed = false; data.map.lineupMode = 'SIMULTANEOUS'
  data.map.lineupA = data.map.lineupA.map((player, index) => ({ ...player, playerId: 'private-sealed-' + index }))
  const events = roomImportantEvents(data)
  assert(events.some(event => event.kind === 'MAP'))
  assert(!events.some(event => ['LINEUPS', 'LINEUP_CHANGE'].includes(event.kind)))
  assert.doesNotMatch(JSON.stringify(events), /private-sealed/)
})
test('important-action feed reconciles corrected bans and scores instead of replaying revoked decisions', () => {
  const data = buildWeeklyRoomPreview('ready'); data.opening = null
  const oldBan = data.map.banA
  assert(roomImportantEvents(data).some(event => event.hero === oldBan))
  data.map.banA = ''; data.map.banAStatus = 'PENDING'
  assert(!roomImportantEvents(data).some(event => event.hero === oldBan))
  data.map.status = 'COMPLETE'; data.map.scoreA = 3; data.map.scoreB = 1
  const result = roomImportantEvents(data).find(event => event.kind === 'RESULT')
  assert.deepEqual([result.scoreA, result.scoreB], [3, 1])
  data.map.scoreA = 2
  const corrected = roomImportantEvents(data).filter(event => event.kind === 'RESULT')
  assert.equal(corrected.length, 1); assert.equal(corrected[0].scoreA, 2)
  assert.notEqual(corrected[0].id, result.id)
})

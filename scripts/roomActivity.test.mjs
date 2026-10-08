import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWeeklyRoomPreview } from '../src/features/room-guide/roomDemoFixture.js'
import { roomImportantEvents } from '../src/features/weekly-competition/roomPersonnelEvents.js'
import { observeRoomActivity } from '../src/features/weekly-competition/roomActivityPlayback.js'
import { normalizeRoomResponse } from '../src/features/weekly-competition/roomResponse.js'

test('saved same-map replacements and starts survive completion, reset and a fresh response', () => {
  const data = buildWeeklyRoomPreview('ready'), old = data.map.lineupA[1], replacement = data.rosters[0].members[6]
  data.opening = null
  data.operationHistory = [{ id: 'same-map-change', kind: 'LINEUP_CHANGE', mapOrder: 1, side: 'A', added: [{ playerId: replacement.id, name: replacement.name, role: 'DPS' }], removed: [old], roles: [], createdAt: '2026-10-08T10:00:00Z' },
    { id: 'public-lineups', kind: 'LINEUPS', mapOrder: 1, createdAt: '2026-10-08T10:00:00Z' },
    { id: 'start', kind: 'LIVE', mapOrder: 1, createdAt: '2026-10-08T10:01:00Z' }]
  data.map.status = 'LIVE'
  let events = roomImportantEvents(normalizeRoomResponse(data, data.match.id))
  assert.equal(events.filter(event => event.kind === 'LIVE').length, 1)
  assert.equal(events.filter(event => event.kind === 'LINEUPS').length, 1)
  data.map.status = 'COMPLETE'; data.map.scoreA = 2; data.map.scoreB = 0
  events = roomImportantEvents(normalizeRoomResponse(JSON.parse(JSON.stringify(data)), data.match.id))
  assert(events.some(event => event.id === 'same-map-change'))
  assert(events.some(event => event.id === 'start'))
  assert(events.some(event => event.kind === 'RESULT'))
  data.map.lineupsRevealed = false; data.map.lineupA = []; data.map.lineupB = []
  events = roomImportantEvents(data)
  assert(events.some(event => event.id === 'same-map-change'), 'previously public changes remain history during a new sealed confirmation')
});

test('old maps with a saved start timestamp retain the start without fabricating starts for unplayed maps', () => {
  const data = buildWeeklyRoomPreview('ready'); data.opening = null
  data.map.status = 'COMPLETE'; data.map.startedAt = '2026-10-08T10:01:00Z'
  assert.equal(roomImportantEvents(data).filter(event => event.kind === 'LIVE').length, 1)
  delete data.map.startedAt
  assert.equal(roomImportantEvents(data).filter(event => event.kind === 'LIVE').length, 0)
});

test('the same cross-map substitution is not duplicated by current-state and saved history', () => {
  const data = buildWeeklyRoomPreview('ready'), next = structuredClone(data.map)
  next.order = 2; next.lineupA[1] = { playerId: data.rosters[0].members[6].id, role: 'DPS' }
  data.maps.push(next)
  const fallback = roomImportantEvents(data).find(event => event.kind === 'LINEUP_CHANGE')
  data.operationHistory = [{ ...fallback, id: 'saved-change' }]
  assert.deepEqual(roomImportantEvents(data).filter(event => event.kind === 'LINEUP_CHANGE').map(event => event.id), ['saved-change'])
});

test('invalid or unrelated operation payloads do not reach the feed', () => {
  const data = buildWeeklyRoomPreview('ready')
  data.operationHistory = [null, { id: 'private-chat', kind: 'CHAT', mapOrder: 1, body: 'private' }, { id: 'broken', kind: 'LINEUP_CHANGE', mapOrder: 1, side: 'A', added: [null], removed: [], roles: [] }]
  assert(!roomImportantEvents(data).some(event => ['private-chat', 'broken'].includes(event.id)))
});

for (const reason of ['paused', 'hovered', 'focused', 'history-open']) {
  test(`incoming operations queue while ${reason}, then the latest entry plays once after release`, () => {
    const scope = 'match:actor'
    let next = observeRoomActivity(null, { scope, ids: ['old'], held: false })
    assert.equal(next.activeId, 'old')
    next = observeRoomActivity(next.state, { scope, ids: ['new', 'old'], held: true })
    assert.equal(next.activeId, null)
    assert.equal(next.announcedId, 'new')
    next = observeRoomActivity(next.state, { scope, ids: ['newer', 'new', 'old'], held: true })
    assert.equal(next.activeId, null)
    next = observeRoomActivity(next.state, { scope, ids: ['newer', 'new', 'old'], held: false })
    assert.equal(next.activeId, 'newer')
    assert.equal(next.announcedId, null)
    next = observeRoomActivity(next.state, { scope, ids: ['newer', 'new', 'old'], held: false })
    assert.equal(next.activeId, null, 'polling must not replay the queued entry')
  })
}

test('queued corrections disappear when revoked and pending operations cannot cross accounts or rooms', () => {
  let next = observeRoomActivity(null, { scope: 'match:actor', ids: ['old'], held: false })
  next = observeRoomActivity(next.state, { scope: 'match:actor', ids: ['new', 'old'], held: true })
  next = observeRoomActivity(next.state, { scope: 'match:actor', ids: ['old'], held: false })
  assert.equal(next.activeId, null)
  next = observeRoomActivity(next.state, { scope: 'other:actor', ids: ['other'], held: false })
  assert.equal(next.activeId, 'other')
  assert.equal(next.announcedId, '')
  assert.equal(next.state.pendingId, null)
})

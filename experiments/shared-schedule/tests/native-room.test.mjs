import test from 'node:test'
import assert from 'node:assert/strict'
import { roomMutation, nativeRoomClock, roomUrl, validNativeMatchId, observeRoomPenalties, roomPenaltySnapshot } from '../src/account/nativeRoomModel.js'

const fixture = () => ({ match: { id: 'test-room', revision: 7, teamA: { id: 'team-a' }, teamB: { id: 'team-b' } }, actor: { id: 'captain-a' },
  access: { teamIds: ['team-a'], representativeTeams: ['team-a'] }, revision: 2, draftRevision: 4,
  opening: { revision: 3 }, map: { order: 1 }, receivedAt: 1000,
  phaseClock: { enabled: true, status: 'RUNNING', serverNow: '2026-10-28T06:00:00.000Z', deadlineAt: '2026-10-28T06:00:20.000Z',
    submissionGrace: { normalDeadlineAt: '2026-10-28T06:00:05.000Z' }, stage: { key: '1:MAP:A', kind: 'MAP' }, revision: 9 } })

test('the native timer retains the canonical normal deadline and submission grace', () => {
  const room = fixture()
  assert.equal(nativeRoomClock(room, 1000).text, '00:05')
  const grace = nativeRoomClock(room, 7000)
  assert.equal(grace.inSubmissionGrace, true); assert.equal(grace.seconds, 14)
  assert.equal(nativeRoomClock(room, 22000).seconds, 0)
})

test('room commands carry the captured revision and their original context without web authentication', () => {
  const room = fixture()
  const mutation = roomMutation(room, 'commands', { action: 'SET_LINEUP', lineupContext: 'bound-context' })
  assert.equal(mutation.expectedRevision, 2); assert.equal(mutation.draftRevision, 4); assert.equal(mutation.matchRevision, 7)
  assert.equal(mutation.lineupContext, 'bound-context'); assert.match(mutation.clientKey, /^[a-f0-9-]{36}$/)
  const opening = roomMutation(room, 'opening', { action: 'PLAY', roundId: 'round-one' })
  assert.equal(opening.expectedRevision, 3); assert(!('matchRevision' in opening))
  const clock = roomMutation(room, 'clock', { action: 'SKIP_REST' })
  assert.equal(clock.expectedRevision, 9); assert.equal(clock.stageKey, '1:MAP:A')
})

test('private room navigation permits only a match identifier and never carries a credential', () => {
  assert(validNativeMatchId('FCW26-WEEKLY-ONE')); assert(!validNativeMatchId('../admin'))
  assert.equal(roomUrl('FCW26-WEEKLY-ONE', 'FCW26'), '/account/pages/room/index?season=FCW26&match=FCW26-WEEKLY-ONE')
  assert(!roomUrl('../admin', 'FCW26').includes('match='))
})

test('a native penalty popup observes only new penalties belonging to this representative', () => {
  const room = fixture(); room.phaseClock.timeoutPenalties = [{ kind: 'MAP', outcome: 'WARNING', side: 'A', mapOrder: 1, count: 1, at: 'one' }]
  let observation = observeRoomPenalties(null, roomPenaltySnapshot(room)); assert.equal(observation.added.length, 0)
  room.phaseClock.timeoutPenalties.push({ kind: 'MAP', outcome: 'BAN_FORFEIT', side: 'B', mapOrder: 1, count: 2, at: 'two' })
  observation = observeRoomPenalties(observation, roomPenaltySnapshot(room)); assert.equal(observation.added.length, 0)
  room.phaseClock.timeoutPenalties.push({ kind: 'MAP', outcome: 'BAN_FORFEIT', side: 'A', mapOrder: 1, count: 2, at: 'three' })
  observation = observeRoomPenalties(observation, roomPenaltySnapshot(room)); assert.equal(observation.added.length, 1)
  assert.equal(observeRoomPenalties(observation, roomPenaltySnapshot(room)).added.length, 0)
})

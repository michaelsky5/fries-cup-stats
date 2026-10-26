import test from 'node:test'
import assert from 'node:assert/strict'
import { getWatchLink, WATCH_LIVE_LEAD_MS } from '../src/lib/watchLink.js'
import { BROADCAST_REPLAY_ARCHIVE_URL } from '../src/lib/broadcastSelectors.js'

const start = Date.parse('2026-10-31T12:00:00.000Z')
const room = 'https://live.bilibili.com/6479984'
const match = (patch = {}) => ({ match_id: 'FIXTURE-1', status: 'SCHEDULED', scheduled_at: '2026-10-31T12:00:00.000Z', broadcast: { is_broadcast: true, stream_url: room }, ...patch })

test('the live room opens an hour before the start and stays during play', () => {
  assert.equal(getWatchLink(match(), 'upcoming', start - WATCH_LIVE_LEAD_MS - 60000), null)
  assert.deepEqual(getWatchLink(match(), 'upcoming', start - WATCH_LIVE_LEAD_MS), { kind: 'live', url: room })
  assert.deepEqual(getWatchLink(match({ status: 'LIVE' }), 'live', start + 3600000), { kind: 'live', url: room })
})

test('a played broadcast match links its replay, else the B站 space', () => {
  assert.deepEqual(getWatchLink(match({ status: 'COMPLETE' }), 'complete', start), { kind: 'replay', url: BROADCAST_REPLAY_ARCHIVE_URL })
  assert.deepEqual(getWatchLink(match({ status: 'COMPLETE', broadcast: { is_broadcast: true, stream_url: room, replay_url: 'https://www.bilibili.com/video/BV1fixture' } }), 'complete', start),
    { kind: 'replay', url: 'https://www.bilibili.com/video/BV1fixture' })
  assert.deepEqual(getWatchLink(match({ status: 'RESULT_REVIEW' }), 'review', start), { kind: 'replay', url: BROADCAST_REPLAY_ARCHIVE_URL })
})

test('no broadcast, no room, or a changed match offers nothing', () => {
  assert.equal(getWatchLink(match({ broadcast: null }), 'live', start), null)
  // System marks referee-only assignments as broadcasts with an empty room: not streamed, no replay either
  const refereeOnly = { is_broadcast: true, stream_url: '', crew: [{ role: 'REFEREE', name: 'Ref' }] }
  assert.equal(getWatchLink(match({ broadcast: refereeOnly }), 'live', start), null)
  assert.equal(getWatchLink(match({ status: 'COMPLETE', broadcast: refereeOnly }), 'complete', start), null)
  assert.equal(getWatchLink(match({ broadcast: { is_broadcast: false, stream_url: room } }), 'live', start), null)
  assert.equal(getWatchLink(match({ broadcast: { is_broadcast: true, stream_url: 'not a url' } }), 'live', start), null)
  for (const state of ['postponed', 'cancelled', 'unknown']) assert.equal(getWatchLink(match(), state, start), null)
  assert.equal(getWatchLink(match({ scheduled_at: null }), 'upcoming', start), null)
})

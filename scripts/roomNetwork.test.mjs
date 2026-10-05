import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoomSync, roomRetryDelay } from '../src/features/weekly-competition/roomSync.js'
import { roomClockState } from '../src/features/weekly-competition/roomPhaseClock.js'
import { PlatformApiError, platformRequest, retryAfterMillis } from '../src/features/auth/platformApi.js'
import { roomLineupDraftKey, readRoomLineupDraft, saveRoomLineupDraft, clearRoomLineupDraft } from '../src/features/weekly-competition/roomLineupDraft.js'

const room = (revision = 0) => ({ match: { id: 'LOCAL-NETWORK-ROOM' }, actor: { id: 'local-actor' }, access: { canWrite: true }, messages: [], revision })
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function harness(read) {
  let time = 100000, id = 0
  const timers = new Map(), calls = []
  const store = createRoomSync({ matchId: room().match.id, read: (...args) => { calls.push(args); return read(...args) }, now: () => time, random: () => .5, setTimer: (fn, delay) => { timers.set(++id, { fn, at: time + delay }); return id }, clearTimer: id => timers.delete(id) })
  return { store, calls, timers, async start(options) { store.start(options); await flush() }, async advance(ms) {
    const target = time + ms
    for (let count = 0; count < 100; count++) {
      const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
      if (!due) break
      const [key, timer] = due; time = timer.at; timers.delete(key); timer.fn(); await flush()
    }
    time = target; await flush()
  } }
}

test('a short outage preserves the last room and recovers automatically with increasing delay', async () => {
  let failure = false, revision = 0
  const h = harness(async () => { if (failure) throw new TypeError('Failed to fetch'); return room(revision) })
  await h.start(); const previous = h.store.getSnapshot().data
  failure = true; await h.advance(3000)
  assert.equal(h.store.getSnapshot().data, previous)
  assert.equal(h.store.getSnapshot().connection.status, 'retrying')
  assert.equal(h.store.getSnapshot().connection.nextRetryAt, 104500)
  await h.advance(1500)
  assert.equal(h.store.getSnapshot().connection.nextRetryAt, 107500)
  failure = false; revision = 1; await h.advance(3000)
  assert.equal(h.store.getSnapshot().data.revision, 1)
  assert.equal(h.store.getSnapshot().error, '')
  assert.equal(h.store.getSnapshot().connection.status, 'connected')
  assert.equal(h.store.getSnapshot().connection.attempts, 0)
  h.store.stop(); assert.equal(h.timers.size, 0)
})

test('Retry-After is respected even by manual refresh and focus/online events', async () => {
  let fail = true
  const h = harness(async () => { if (fail) throw new PlatformApiError('Busy', { status: 429, retryAfterMs: 60000 }); return room() })
  await h.start(); fail = false
  for (let index = 0; index < 5; index++) { await h.store.refresh({ force: true }); h.store.wake() }
  assert.equal(h.calls.length, 1)
  await h.advance(59999); assert.equal(h.calls.length, 1)
  await h.advance(1); assert.equal(h.calls.length, 2)
  assert.equal(h.store.getSnapshot().connection.status, 'connected')
  h.store.stop()
})

test('a delayed snapshot anchors the clock at receipt without mutating the server response', async () => {
  let mono = 1000
  const original = { ...room(), syncedAt: '2026-10-04T12:00:00Z', phaseClock: {
    serverNow: '2026-10-04T12:00:00Z', deadlineAt: '2026-10-04T12:01:15Z',
    submissionGrace: { normalDeadlineAt: '2026-10-04T12:01:00Z' }
  } }
  const store = createRoomSync({ matchId: room().match.id, monotonicNow: () => mono,
    read: async () => { mono += 4000; return original }, setTimer: () => 1, clearTimer: () => {} })
  store.start(); await flush()
  const clock = store.getSnapshot().data.phaseClock
  assert.equal(clock.receivedAtMonoMs, 5000)
  assert.equal(clock.transitEstimateMs, 2000)
  assert.equal(original.phaseClock.receivedAtMonoMs, undefined)
  assert.deepEqual(roomClockState(clock), { seconds: 58, inSubmissionGrace: false })
  assert.deepEqual(roomClockState(clock, 58000), { seconds: 15, inSubmissionGrace: true })
  store.stop()
})

test('hidden rooms stop scheduled polling, and returning to the foreground synchronizes once', async () => {
  const h = harness(async () => room())
  await h.start(); h.store.setVisible(false)
  await h.advance(60000); h.store.wake(); assert.equal(h.calls.length, 1)
  h.store.setVisible(true); h.store.wake(); await flush()
  assert.equal(h.calls.length, 2)
  h.store.stop()
})

test('a throttled write also respects Retry-After without replaying the command', async () => {
  let writes = 0
  const h = harness(async () => room())
  await h.start()
  await h.store.mutate(async () => { writes++; throw new PlatformApiError('Busy', { status: 429, retryAfterMs: 60000 }) })
  assert.equal(h.calls.length, 1)
  await h.store.mutate(async () => { writes++ })
  await h.advance(59999); assert.equal(h.calls.length, 1)
  await h.advance(1); assert.equal(h.calls.length, 2); assert.equal(writes, 1)
  assert.equal(h.store.getSnapshot().error, '')
  h.store.stop()
})

test('offline pauses reads and online wakes the room without a reload', async () => {
  const h = harness(async () => room())
  await h.start(); h.store.setOnline(false)
  const retained = h.store.getSnapshot().data
  await h.advance(60000); assert.equal(h.calls.length, 1)
  assert.equal(h.store.getSnapshot().connection.status, 'offline')
  assert.equal(h.store.getSnapshot().data, retained)
  h.store.setOnline(true); await flush()
  assert.equal(h.calls.length, 2)
  assert.equal(h.store.getSnapshot().error, '')
  h.store.stop()
})

test('manual resync can recover even if the browser offline hint was inaccurate', async () => {
  const h = harness(async () => room())
  await h.start({ online: false }); assert.equal(h.calls.length, 0)
  assert.equal(await h.store.refresh({ force: true }), true)
  assert.equal(h.store.getSnapshot().connection.status, 'connected')
  h.store.stop()
})

test('access revocation clears private cached state and does not continually retry', async () => {
  let denied = false
  const h = harness(async () => { if (denied) throw new PlatformApiError('No permission', { status: 403 }); return room() })
  await h.start(); denied = true; await h.advance(3000)
  assert.equal(h.store.getSnapshot().data, null)
  assert.equal(h.store.getSnapshot().connection.status, 'blocked')
  await h.advance(120000); h.store.wake(); assert.equal(h.calls.length, 2)
  h.store.stop()
})

test('an old read cannot overwrite a write reconciliation, even if transport ignores abort', async () => {
  const old = deferred(); let count = 0, revision = 0
  const h = harness(async () => { if (++count === 2) return old.promise; return room(revision) })
  await h.start()
  const reading = h.store.refresh({ force: true })
  await h.store.mutate(async () => { revision = 1; return { saved: true } }, 'Saved')
  assert.equal(h.calls[1][1].signal.aborted, true)
  old.resolve(room(0)); assert.equal(await reading, false)
  assert.equal(h.store.getSnapshot().data.revision, 1)
  assert.equal(h.store.getSnapshot().notice, 'Saved')
  assert.equal(h.store.getSnapshot().noticeKind, 'success')
  h.store.stop()
})

test('a lost write response reconciles with the server and never replays the operation', async () => {
  let revision = 0, writes = 0
  const h = harness(async () => room(revision))
  await h.start()
  const result = await h.store.mutate(async () => { writes++; revision = 1; throw new TypeError('Response lost') })
  assert.equal(result, null); assert.equal(writes, 1)
  assert.equal(h.store.getSnapshot().data.revision, 1)
  assert.match(h.store.getSnapshot().notice, /不会自动重发/)
  assert.equal(h.store.getSnapshot().noticeKind, 'warning')
  await h.advance(15000); assert.equal(writes, 1)
  h.store.stop()
})

test('a write plus reconnection failure blocks further writes until fresh state arrives', async () => {
  let down = false, writes = 0
  const h = harness(async () => { if (down) throw new TypeError('Offline'); return room(2) })
  await h.start()
  await h.store.mutate(async () => { writes++; down = true; throw new TypeError('Lost') })
  await h.store.mutate(async () => { writes++ })
  assert.equal(writes, 1); assert.ok(h.store.getSnapshot().error)
  down = false; await h.advance(1500)
  assert.equal(h.store.getSnapshot().error, '')
  assert.match(h.store.getSnapshot().notice, /请核对刚才的提交/)
  h.store.stop()
})

test('an acknowledged save is distinguished from a failed read that follows it', async () => {
  let fail = false
  const h = harness(async () => { if (fail) throw new TypeError('Down'); return room() })
  await h.start()
  const result = await h.store.mutate(async () => { fail = true; return { saved: true } }, 'Confirmed')
  assert.deepEqual(result, { saved: true }); assert.match(h.store.getSnapshot().notice, /^已保存/)
  fail = false; await h.advance(1500)
  assert.equal(h.store.getSnapshot().notice, 'Confirmed')
  h.store.stop()
})

test('double clicks share one read, and pending writes cannot be double submitted', async () => {
  let slow = false
  const pendingRead = deferred(), pendingWrite = deferred()
  const h = harness(async () => slow ? pendingRead.promise : room())
  await h.start(); slow = true
  const one = h.store.refresh({ force: true }), two = h.store.refresh({ force: true })
  assert.equal(h.calls.length, 2)
  pendingRead.resolve(room()); assert.equal(await one, true); assert.equal(await two, true)
  slow = false; let writes = 0
  const write = h.store.mutate(async () => { writes++; return pendingWrite.promise })
  await h.store.mutate(async () => { writes++ })
  assert.equal(writes, 1)
  pendingWrite.resolve({ saved: true }); await write
  assert.equal(h.store.getSnapshot().busy, false)
  h.store.stop()
})

test('unmount aborts an in-flight read and ignores its late reply', async () => {
  const pending = deferred(), h = harness(() => pending.promise)
  await h.start(); h.store.stop()
  assert.equal(h.calls[0][1].signal.aborted, true)
  pending.resolve(room()); await flush()
  assert.equal(h.store.getSnapshot().data, null); assert.equal(h.timers.size, 0)
})

test('a response for the wrong match or a changed actor cannot replace the current room', async () => {
  let value = room()
  const h = harness(async () => value)
  await h.start(); const retained = h.store.getSnapshot().data
  value = { ...room(), match: { id: 'another-match' } }; await h.store.refresh({ force: true })
  assert.equal(h.store.getSnapshot().data, retained)
  value = { ...room(), actor: { id: 'another-account' } }; await h.store.refresh({ force: true })
  assert.equal(h.store.getSnapshot().data, null); assert.equal(h.store.getSnapshot().connection.status, 'blocked')
  h.store.stop()
})

test('retry delays have jitter and a bound, and Retry-After seconds/date survive API errors', async () => {
  assert.ok(roomRetryDelay(3, () => 0) < roomRetryDelay(3, () => 1))
  assert.equal(roomRetryDelay(100, () => 1), 30000)
  assert.equal(retryAfterMillis('60'), 60000)
  assert.equal(retryAfterMillis('Mon, 28 Sep 2026 04:00:10 GMT', Date.parse('2026-09-28T04:00:00Z')), 10000)
  assert.equal(retryAfterMillis('nonsense'), undefined)
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Busy' }), { status: 503, headers: { 'content-type': 'application/json', 'retry-after': '12' } })
    await assert.rejects(platformRequest('/weekly-live-rooms/local'), error => error.status === 503 && error.retryAfterMs === 12000)
  } finally { globalThis.fetch = original }
})

test('lineup choices survive reload only for the same actor, match, map context and team', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  const data = { ...room(), map: { order: 1, lineupContext: 'map-one-context' } }, key = roomLineupDraftKey(data, 'A')
  const members = [{ id: 'one' }, { id: 'two' }], choices = [{ playerId: 'one', role: 'SUP' }]
  assert.equal(saveRoomLineupDraft(key, choices, storage), true)
  assert.deepEqual(readRoomLineupDraft(key, members, storage), choices)
  assert.equal(readRoomLineupDraft(roomLineupDraftKey(data, 'B'), members, storage), null)
  assert.equal(readRoomLineupDraft(roomLineupDraftKey({ ...data, actor: { id: 'other' } }, 'A'), members, storage), null)
  assert.equal(readRoomLineupDraft(key, [{ id: 'changed' }], storage), null)
  assert.equal(saveRoomLineupDraft(key, choices, { setItem() { throw Error('Quota') } }), false)
  clearRoomLineupDraft(key, storage); assert.equal(readRoomLineupDraft(key, members, storage), null)
})

test('blocked browser storage does not break lineup entry', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  try {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('Storage blocked') } })
    assert.equal(readRoomLineupDraft('key', []), null)
    assert.equal(saveRoomLineupDraft('key', []), false)
    assert.doesNotThrow(() => clearRoomLineupDraft('key'))
  } finally { if (original) Object.defineProperty(globalThis, 'sessionStorage', original); else delete globalThis.sessionStorage }
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { startVisiblePolling } from '../src/lib/visiblePolling.js'

function browser(t, task, options = {}) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 })
  const target = Object.assign(new EventTarget(), {
    document: Object.assign(new EventTarget(), { visibilityState: 'visible' }),
    navigator: { onLine: true }
  })
  const polling = startVisiblePolling(task, { intervalMs: 10_000, target, ...options })
  t.after(() => polling.stop())
  const tick = async ms => { t.mock.timers.tick(ms); await new Promise(resolve => setImmediate(resolve)) }
  const fire = type => (type === 'visibilitychange' ? target.document : target).dispatchEvent(new Event(type))
  return { target, polling, tick, fire }
}

test('hidden and offline pages pause; focus/visibility/reconnect bursts coalesce', async t => {
  let calls = 0
  const b = browser(t, async () => { calls += 1 })
  await b.tick(0)
  assert.equal(calls, 1)
  b.fire('focus'); b.fire('visibilitychange'); b.fire('online')
  await b.tick(1000)
  assert.equal(calls, 1, 'a just-completed read is not duplicated by the same focus burst')
  b.target.document.visibilityState = 'hidden'; b.fire('visibilitychange')
  await b.tick(120_000)
  assert.equal(calls, 1)
  b.target.navigator.onLine = false
  b.target.document.visibilityState = 'visible'; b.fire('visibilitychange')
  await b.tick(120_000)
  assert.equal(calls, 1)
  b.target.navigator.onLine = true; b.fire('online'); b.fire('focus')
  await b.tick(0)
  assert.equal(calls, 2)
})

test('slow reads never overlap and data-change events queue only one following read', async t => {
  let finish, calls = 0
  const b = browser(t, () => { calls += 1; return new Promise(resolve => { finish = resolve }) })
  await b.tick(0)
  b.polling.refresh({ changed: true }); b.polling.refresh({ changed: true }); b.fire('focus')
  await b.tick(60_000)
  assert.equal(calls, 1)
  finish()
  await b.tick(0)
  await b.tick(0)
  assert.equal(calls, 2)
  finish()
  await b.tick(0)
  await b.tick(0)
  assert.equal(calls, 2)
})

test('429 retry-after and exponential failure backoff survive focus and reconnect', async t => {
  let calls = 0, failure = Object.assign(new Error('limited'), { retryAfterMs: 45_000 })
  const b = browser(t, async () => { calls += 1; if (failure) throw failure })
  await b.tick(0)
  b.fire('focus'); b.fire('online'); b.polling.refresh({ changed: true })
  await b.tick(44_999)
  assert.equal(calls, 1)
  failure = new Error('offline')
  await b.tick(1)
  assert.equal(calls, 2)
  b.fire('focus')
  await b.tick(19_999)
  assert.equal(calls, 2)
  failure = null
  await b.tick(1)
  assert.equal(calls, 3)
  await b.tick(10_000)
  assert.equal(calls, 4, 'success resets the failure delay')
})

test('stopping aborts the active read and removes every event listener', async t => {
  let calls = 0, signal, finish
  const b = browser(t, options => { calls += 1; signal = options.signal; return new Promise(resolve => { finish = resolve }) })
  await b.tick(0)
  b.polling.stop()
  assert.equal(signal.aborted, true)
  finish()
  b.fire('online'); b.fire('focus'); b.fire('visibilitychange')
  await b.tick(1_000_000)
  assert.equal(calls, 1)
})

test('an initial delay and dynamic cadence preserve fresh snapshot refresh policy', async t => {
  let calls = 0, intervalMs = 15_000
  const b = browser(t, async () => { calls += 1 }, { intervalMs: () => intervalMs, initialDelayMs: 60_000 })
  await b.tick(59_999)
  assert.equal(calls, 0)
  await b.tick(1)
  assert.equal(calls, 1)
  intervalMs = 60_000
  await b.tick(15_000)
  assert.equal(calls, 2)
  await b.tick(59_999)
  assert.equal(calls, 2)
  await b.tick(1)
  assert.equal(calls, 3)
})

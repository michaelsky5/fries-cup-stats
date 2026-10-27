import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicScheduleReader, formatRequestDiagnostic, requestWithDeadline } from '../src/shared/publicScheduleReader.js'

const data = { season: { id: 'FCW26' }, matches: [], teams: [], weekly_competition: { schema_version: 'friescup-weekly-public-v1', cycles: [] } }
const response = { statusCode: 200, data }

test('native success callback completes even when the SDK Promise never settles', async () => {
  const result = await requestWithDeadline(options => {
    queueMicrotask(() => options.success(response))
    return new Promise(() => {})
  }, { url: '/public' }, 100)
  assert.equal(result, response)
})

test('a never-completing request times out, aborts, ignores late data, and can retry', async () => {
  let first, aborted = 0, calls = 0
  const read = createPublicScheduleReader({ url: '/public', now: () => 1000, timeoutMs: 30, request: options => {
    if (++calls === 1) { first = options; return { abort() { aborted += 1; options.fail({ errMsg: 'request:fail abort' }) } } }
    return Promise.resolve(response)
  } })
  await assert.rejects(read(), { code: 'PUBLIC_TIMEOUT' })
  assert.equal(aborted, 1)
  first.success(response)
  assert.deepEqual(await read(), { data, stale: false, fetchedAt: 1000 })
  assert.equal(calls, 2)
})

test('timed-out refresh retains a marked public cache rather than remaining in loading', async () => {
  let calls = 0
  let time = 1000
  const read = createPublicScheduleReader({ url: '/public', now: () => time, timeoutMs: 30, request: () => ++calls === 1 ? Promise.resolve(response) : new Promise(() => {}) })
  assert.deepEqual(await read(), { data, stale: false, fetchedAt: 1000 })
  time = 80000
  assert.deepEqual(await read(true), { data, stale: true, fetchedAt: 1000 })
})

test('native domain rejection and server failure produce actionable errors', async () => {
  await assert.rejects(requestWithDeadline(options => options.fail({ errMsg: 'request:fail url not in domain list' }), { url: '/public' }), { code: 'PUBLIC_DOMAIN' })
  const read = createPublicScheduleReader({ url: '/public', request: () => Promise.resolve({ statusCode: 503 }) })
  await assert.rejects(read(), { code: 'PUBLIC_HTTP' })
})

test('a body-transfer timeout is distinguishable from no response without storing headers', async () => {
  await assert.rejects(requestWithDeadline(() => ({
    onHeadersReceived(callback) { callback({ header: { 'Set-Cookie': 'never retain me' } }) },
    abort() {}
  }), { url: '/public' }, 30), error => {
    assert.equal(error.code, 'PUBLIC_TIMEOUT')
    assert.equal(error.diagnostic.phase, 'deadline')
    assert.equal(error.diagnostic.headersReceived, true)
    assert.match(formatRequestDiagnostic(error.diagnostic), /已收到响应/)
    assert.doesNotMatch(JSON.stringify(error.diagnostic), /Cookie|retain|header"/)
    return true
  })
})

test('native failure detail retains the connection error but removes URLs and line breaks', async () => {
  await assert.rejects(requestWithDeadline(options => options.fail({ errMsg: 'request:fail ssl handshake\nhttps://example.invalid/private?token=secret' }), { url: '/public' }), error => {
    assert.equal(error.code, 'PUBLIC_REQUEST')
    assert.equal(error.diagnostic.phase, 'native-fail')
    assert.equal(error.diagnostic.headersReceived, false)
    assert.match(formatRequestDiagnostic(error.diagnostic), /ssl handshake/)
    assert.doesNotMatch(formatRequestDiagnostic(error.diagnostic), /private|token|secret|\n/)
    return true
  })
})

test('concurrent reads share one native request and a subsequent refresh can start again', async () => {
  let options, calls = 0, time = 1000
  const read = createPublicScheduleReader({ url: '/public', now: () => time, request: value => { calls += 1; options = value; return { abort() {} } } })
  const first = read(), second = read(), refresh = read(true)
  assert.equal(calls, 1)
  options.success(response)
  assert.deepEqual(await Promise.all([first, second, refresh]), Array(3).fill({ data, stale: false, fetchedAt: 1000 }))
  time = 2000
  assert.equal((await read()).fetchedAt, 1000)
  const next = read(true)
  assert.equal(calls, 2)
  options.success(response)
  assert.equal((await next).fetchedAt, 2000)
})

test('a failed initial shared request releases its in-flight state for retry', async () => {
  let options, calls = 0
  const read = createPublicScheduleReader({ url: '/public', request: value => { calls += 1; options = value } })
  const first = read(), second = read()
  options.fail({ errMsg: 'request:fail network' })
  const results = await Promise.allSettled([first, second])
  assert.ok(results.every(result => result.status === 'rejected' && result.reason.code === 'PUBLIC_REQUEST'))
  const retry = read(true)
  options.success(response)
  await retry
  assert.equal(calls, 2)
})

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

test('public reads negotiate gzip and revalidate an unchanged snapshot without downloading its body', async () => {
  const headers = []
  let time = 1000
  const read = createPublicScheduleReader({ url: '/public', now: () => time, request: options => {
    headers.push(options.header)
    return Promise.resolve(headers.length === 1 ? { ...response, header: { ETag: 'W/"published-42"' } } : { statusCode: 304 })
  } })
  await read()
  time = 40000
  assert.deepEqual(await read(), { data, stale: false, fetchedAt: time })
  assert.equal(headers[0]['Accept-Encoding'], 'gzip')
  assert.equal(headers[0]['If-None-Match'], undefined)
  assert.equal(headers[1]['If-None-Match'], 'W/"published-42"')
  assert.equal(headers[1].Cookie, undefined)
  assert.equal(headers[1].Authorization, undefined)
})

test('a restarted app shows a validated device cache while its network refresh is pending', async () => {
  let saved, options
  const storage = { read: async () => saved, write: async value => { saved = value } }
  await createPublicScheduleReader({ url: '/public', now: () => 1000, storage, request: () => Promise.resolve({ ...response, header: { etag: '"v1"' } }) })()
  await Promise.resolve()
  const read = createPublicScheduleReader({ url: '/public', now: () => 80000, storage, request: value => { options = value } })
  const pending = read()
  assert.deepEqual(await read.cached(), { data, stale: true, fetchedAt: 1000 })
  assert.equal(options.header['If-None-Match'], '"v1"')
  options.success({ statusCode: 304 })
  assert.deepEqual(await pending, { data, stale: false, fetchedAt: 80000 })
})

test('cached data is isolated by exact public URL and invalid metadata never becomes a request header', async () => {
  let headers
  const read = createPublicScheduleReader({ url: '/public', now: () => 80000, storage: {
    read: () => ({ version: 1, url: '/another-event', data, fetchedAt: 1000, etag: '"wrong"' })
  }, request: options => { headers = options.header; return Promise.resolve(response) } })
  assert.equal(await read.cached(), null)
  await read()
  assert.equal(headers['If-None-Match'], undefined)
  const injected = createPublicScheduleReader({ url: '/public', now: () => 80000, storage: {
    read: () => ({ version: 1, url: '/public', data, fetchedAt: 1000, etag: '"v1"\r\nCookie: forbidden' })
  }, request: options => { headers = options.header; return Promise.resolve(response) } })
  await injected()
  assert.equal(headers['If-None-Match'], undefined)
})

test('a device-cache failure never blocks a successful HTTPS read, and a malformed 304 fails closed', async () => {
  const read = createPublicScheduleReader({ url: '/public', storage: { read() { throw new Error('no storage') }, write() { throw new Error('no space') } }, request: () => Promise.resolve(response) })
  assert.equal((await read()).data, data)
  const empty = createPublicScheduleReader({ url: '/public', request: () => Promise.resolve({ statusCode: 304 }) })
  await assert.rejects(empty(), { code: 'PUBLIC_HTTP' })
})

test('a rejected public edge route falls back immediately and cancels a losing read', async () => {
  const calls=[]
  const read=createPublicScheduleReader({url:'/edge',fallbackUrls:['/origin'],request:options=>{
    calls.push(options)
    if(options.url==='/edge')queueMicrotask(()=>options.fail({errMsg:'url not in domain list'}))
    else queueMicrotask(()=>options.success(response))
    return {abort(){}}
  }})
  assert.equal((await read()).data,data)
  assert.deepEqual(calls.map(call=>call.url),['/edge','/origin'])
  for(const call of calls)assert.deepEqual(Object.keys(call.header).sort(),['Accept','Accept-Encoding'])
})

test('a slow public response uses one bounded alternate and discards late data', async () => {
  let first, aborted=0
  const read=createPublicScheduleReader({url:'/edge',fallbackUrls:['/origin'],timeoutMs:60,request:options=>{
    if(options.url==='/edge') {first=options;return {abort(){aborted++;options.fail({errMsg:'abort'})}}}
    queueMicrotask(()=>options.success(response))
    return {abort(){}}
  }})
  const result=await read()
  assert.equal(result.data,data)
  assert.equal(aborted,1)
  first.success({statusCode:200,data:{invalid:true}})
  assert.equal((await read()).data,data)
})

test('alternate public reads share a deadline and never accept a malformed first response', async () => {
  const started=Date.now(), calls=[]
  const read=createPublicScheduleReader({url:'/edge',fallbackUrls:['/origin'],timeoutMs:40,request:options=>{
    calls.push(options)
    return {abort(){}}
  }})
  await assert.rejects(read(),{code:'PUBLIC_TIMEOUT'})
  assert.equal(calls.length,2)
  assert.ok(calls[1].timeout<calls[0].timeout)
  assert.ok(Date.now()-started<140,'The alternate must not double the deadline')
  const recover=createPublicScheduleReader({url:'/edge',fallbackUrls:['/origin'],request:options=>{
    queueMicrotask(()=>options.success(options.url==='/edge'?{statusCode:200,data:{private:'not a public snapshot'}}:response))
    return {}
  }})
  assert.equal((await recover()).data,data)
})

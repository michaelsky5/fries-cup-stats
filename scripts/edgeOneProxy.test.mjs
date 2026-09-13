import test from 'node:test'
import assert from 'node:assert/strict'
import { proxyRequest } from '../edge-functions/api/[[path]].js'

const origin = 'https://hub-preview.fries-cup.com'
const snapshot = '/api/admin-public/seasons/QGCS4/publish/latest/data'
const request = (path, options) => new Request(origin + path, options)
const json = (data, init = {}) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } })
const mustNotFetch = () => { throw new Error('Unexpected upstream request') }

test('public snapshots use production with query intact, without credentials or spoofed forwarding headers', async () => {
  let call
  const result = await proxyRequest(request(snapshot + '?v=30', { headers: { cookie: 'session=secret', authorization: 'Bearer secret', origin, 'x-forwarded-for': '1.2.3.4' } }), {
    fetchImpl: async (url, options) => { call = { url, options }; return json({ version: 30 }, { headers: { 'Cache-Control': 'public, max-age=120' } }) }
  })
  assert.equal(call.url, 'https://admin.fries-cup.com/api/public/seasons/QGCS4/publish/latest/data?v=30')
  for (const header of ['cookie', 'authorization', 'origin', 'x-forwarded-for']) assert.equal(call.options.headers.get(header), null)
  assert.equal(result.status, 200)
  assert.equal(result.headers.get('cache-control'), 'public, max-age=120')
  assert.deepEqual(await result.json(), { version: 30 })
})

test('account writes use staging, preserving method, bytes, Origin and Cookie', async () => {
  let call
  const body = JSON.stringify({ favorites: { favoriteTeamIds: ['T01'] } })
  const result = await proxyRequest(request('/api/platform/me/favorites/QGCS4', {
    method: 'PUT', body, headers: { origin, 'content-type': 'application/json', cookie: '__Host-fries_session=test', 'sec-fetch-site': 'same-origin', 'x-forwarded-for': '1.2.3.4' }
  }), { fetchImpl: async (url, options) => { call = { url, options }; return json({ saved: true }, { headers: { 'cache-control': 'public, max-age=999' } }) } })
  assert.equal(call.url, 'https://test-admin.fries-cup.com/api/me/favorites/QGCS4')
  assert.equal(call.options.method, 'PUT')
  assert.equal(new TextDecoder().decode(call.options.body), body)
  assert.equal(call.options.headers.get('cookie'), '__Host-fries_session=test')
  assert.equal(call.options.headers.get('origin'), origin)
  assert.equal(call.options.headers.get('sec-fetch-site'), 'same-origin')
  assert.equal(call.options.headers.get('x-forwarded-for'), null)
  assert.equal(call.options.redirect, 'manual')
  assert.equal(result.headers.get('cache-control'), 'private, no-store')
})

test('preserves separate secure session cookies and upstream failure status', async () => {
  const headers = new Headers({ 'content-type': 'application/json' })
  const cookies = ['__Host-fries_session=one; Path=/; HttpOnly; Secure; SameSite=Strict', 'preference=two; Expires=Wed, 09 Jun 2027 10:18:14 GMT; Path=/; Secure']
  cookies.forEach(value => headers.append('set-cookie', value))
  const result = await proxyRequest(request('/api/platform/auth/login', { method: 'POST', body: '{}', headers: { origin } }), {
    fetchImpl: async () => new Response('{}', { status: 401, headers })
  })
  assert.equal(result.status, 401)
  assert.deepEqual(result.headers.getSetCookie(), cookies)
  assert.equal(result.headers.get('cache-control'), 'private, no-store')
})

test('rejects writes with missing, sibling, foreign, null or cross-site origins', async () => {
  for (const headers of [{}, { origin: 'https://fries-cup.com' }, { origin: 'https://evil.example' }, { origin: 'null' }, { origin, 'sec-fetch-site': 'cross-site' }]) {
    const result = await proxyRequest(request('/api/platform/auth/login', { method: 'POST', headers, body: '{}' }), { fetchImpl: mustNotFetch })
    assert.equal(result.status, 403)
  }
})

test('rejects public writes, unknown APIs, encoded traversal and arbitrary upstream targets', async () => {
  const paths = ['/api/unknown', '/api/admin-public/me', '/api/platform/%252e%252e/admin', '/api/platform/%2f%2fevil.example', '/api/platform/%5cadmin', '/api/platform/%00', '/api/platform/%ZZ', '/api/platform/../health']
  for (const path of paths) assert.equal((await proxyRequest(request(path), { fetchImpl: mustNotFetch })).status, 404, path)
  assert.equal((await proxyRequest(request(snapshot, { method: 'POST', headers: { origin } }), { fetchImpl: mustNotFetch })).status, 405)
})

test('rejects oversized bodies even without a Content-Length header', async () => {
  for (const headers of [{ origin }, { origin, 'content-length': '1048577' }]) {
    const result = await proxyRequest(request('/api/platform/me/saves/test/default', { method: 'PUT', body: new Uint8Array(1048577), headers }), { fetchImpl: mustNotFetch })
    assert.equal(result.status, 413)
  }
})

test('never follows upstream redirects and translates HTML and connectivity failures into JSON', async () => {
  for (const upstream of [new Response(null, { status: 307, headers: { location: 'https://evil.example' } }), new Response('<html>Oops</html>', { headers: { 'content-type': 'text/html' } })]) {
    const result = await proxyRequest(request('/api/platform/auth/me'), { fetchImpl: async () => upstream })
    assert.equal(result.status, 502)
    assert.match(result.headers.get('content-type'), /application\/json/)
  }
  for (const [error, status] of [[new Error('connection refused'), 502], [new Error('read timeout'), 504], [new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }), 504]]) {
    const result = await proxyRequest(request('/api/platform/auth/me'), { fetchImpl: async () => { throw error } })
    assert.equal(result.status, status)
  }
})

test('supports HEAD, OPTIONS and empty 204 responses', async () => {
  for (const method of ['HEAD', 'OPTIONS']) {
    const result = await proxyRequest(request('/api/platform/auth/me', { method }), { fetchImpl: async () => new Response(null, { status: 204 }) })
    assert.equal(result.status, 204)
    assert.equal(await result.text(), '')
  }
})

test('caches only successful credential-free public JSON and returns cache hits', async () => {
  const saved = new Map()
  let fetchCount = 0
  const cache = { match: async key => saved.get(key.url)?.clone(), put: async (key, value) => { saved.set(key.url, value) } }
  const options = { cache, fetchImpl: async () => { fetchCount++; return json({ version: 30 }, { headers: { 'cache-control': 'public, max-age=120', vary: 'Origin, Accept-Encoding' } }) } }
  await proxyRequest(request(snapshot), options)
  const hit = await proxyRequest(new Request('https://another-preview.fries-cup.com' + snapshot, { headers: { origin: 'https://another-preview.fries-cup.com', 'accept-encoding': 'br' } }), options)
  assert.equal(fetchCount, 1)
  assert.equal(hit.headers.get('x-fries-public-cache'), 'HIT')
  assert.equal(hit.headers.get('vary'), null)
  assert.deepEqual(await hit.json(), { version: 30 })
  for (const response of [json({}, { status: 500 }), json({}, { headers: { 'cache-control': 'private, no-store' } }), json({}, { headers: { 'cache-control': 'public, max-age=120', 'set-cookie': 'session=x' } })]) {
    await proxyRequest(request(snapshot), { cache: { match: async () => undefined, put: mustNotFetch }, fetchImpl: async () => response })
  }
  await proxyRequest(request('/api/platform/auth/me'), { cache: { match: mustNotFetch, put: mustNotFetch }, fetchImpl: async () => json({}) })
})

test('node cache expiry does not hide published data', async () => {
  const result = await proxyRequest(request(snapshot), {
    cache: { match: async () => { throw new Error('504') }, put: async () => {} },
    fetchImpl: async () => json({ version: 30 }, { headers: { 'cache-control': 'public, max-age=120' } })
  })
  assert.equal(result.status, 200)
})

test('lost write responses remain uncertain and are never replayed', async () => {
  let writes = 0
  const response = await proxyRequest(request('/api/platform/me/profile', {
    method: 'PATCH', headers: { origin }, body: '{"bio":"saved before disconnect"}'
  }), { fetchImpl: async () => { writes++; throw new Error('read timeout') } })
  assert.equal(writes, 1)
  assert.equal(response.status, 504)
  assert.equal((await response.json()).outcomeUnknown, true)
  const rejected = await proxyRequest(request('/api/platform/me/profile', {
    method: 'PATCH', body: '{}'
  }), { fetchImpl: mustNotFetch })
  assert.equal((await rejected.json()).outcomeUnknown, undefined)
})

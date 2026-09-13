import test from 'node:test'
import assert from 'node:assert/strict'
import { proxyRequest } from '../edge-functions/api/[[path]].js'
const origin = 'https://hub-preview.fries-cup.com'
const avatar = `/api/platform/media/avatars/${'a'.repeat(24)}/${'b'.repeat(32)}-96.webp`
const request = (path, options) => new Request(origin + path, options)
test('avatar caching omits credentials and caches only immutable WebP bytes', async () => {
  let cached, fetches = 0
  const cache = { match: async () => cached?.clone(), put: async (_key, value) => { cached = value.clone() } }
  const fetchImpl = async (url, { headers }) => {
    fetches++
    assert.equal(url, `https://test-admin.fries-cup.com${avatar.replace('/platform/', '/')}`)
    for (const key of ['cookie', 'authorization', 'origin', 'referer']) assert.equal(headers.get(key), null)
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } })
  }
  const options = { fetchImpl, cache }
  const first = await proxyRequest(request(avatar, { headers: { cookie: 'secret', authorization: 'Bearer secret', origin } }), options)
  assert.equal(first.status, 200); assert.match(first.headers.get('cache-control'), /immutable/)
  const second = await proxyRequest(request(avatar), options)
  assert.equal(second.headers.get('x-fries-public-cache'), 'HIT'); assert.equal(fetches, 1)
  assert.deepEqual([...new Uint8Array(await second.arrayBuffer())], [1, 2, 3])
})
test('profile upload allows a bounded base64 body while unrelated writes retain their 1 MiB limit', async () => {
  const body = JSON.stringify({ avatar: { type: 'upload', image: 'a'.repeat(2.8 * 1024 * 1024) } })
  let called = false
  const options = { fetchImpl: async (_url, init) => { called = true; assert.equal(init.body.byteLength, body.length); return new Response('{}', { headers: { 'Content-Type': 'application/json' } }) } }
  assert.equal((await proxyRequest(request('/api/platform/me/profile', { method: 'PATCH', headers: { origin }, body }), options)).status, 200)
  assert(called)
  assert.equal((await proxyRequest(request('/api/platform/me/profile', { method: 'PATCH', headers: { origin }, body: 'a'.repeat(3 * 1024 * 1024 + 1) }), options)).status, 413)
  assert.equal((await proxyRequest(request('/api/platform/me/password', { method: 'PATCH', headers: { origin }, body }), options)).status, 413)
})
test('avatar endpoints are read-only and private errors never enter the cache', async () => {
  let puts = 0
  const options = { cache: { match: async () => null, put: async () => { puts++ } }, fetchImpl: async () => new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } }) }
  assert.equal((await proxyRequest(request(avatar, { method: 'DELETE', headers: { origin } }), options)).status, 405)
  const result = await proxyRequest(request(avatar), options)
  assert.equal(result.status, 404); assert.match(result.headers.get('cache-control'), /no-store/); assert.equal(puts, 0)
})

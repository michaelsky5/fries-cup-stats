import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { createPlatformHandler, createProductionFetch } from '../api/platform.js'

test('production transport adapts binary bodies and independent cookies without losing the response', async () => {
  const body = new Uint8Array([1, 2, 3]).buffer
  const fetchImpl = createProductionFetch({ log: () => {}, transport: async (_url, options) => {
    assert.ok(Buffer.isBuffer(options.body))
    assert.deepEqual([...options.body], [1, 2, 3])
    return { status: 200, headers: new Headers([
      ['Set-Cookie', '__Host-fries_session=example; Secure; HttpOnly; Path=/'],
      ['Set-Cookie', 'fries_session=; Max-Age=0; Path=/']
    ]), arrayBuffer: async () => Buffer.from([4, 5, 6]) }
  } })
  const response = await fetchImpl('https://admin.fries-cup.com/api/me/profile', { method: 'PATCH', body })
  assert.equal(response.headers.getSetCookie().length, 2)
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [4, 5, 6])
})

test('production HTTP adapter preserves session, upload, cache and failure boundaries', async t => {
  const calls = []
  let reply = () => new Response('{}', { headers: { 'Content-Type': 'application/json' } })
  const handler = createPlatformHandler({ fetchImpl: async (url, options) => { calls.push({ url, options }); return reply() } })
  const server = createServer(handler).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  const host = `127.0.0.1:${port}`
  const base = `http://${host}/api/platform?platformPath=`
  const origin = `https://${host}`
  const send = (path, init = {}) => fetch(base + path, init)
  try {
    await t.test('same-origin login reaches production and preserves independent cookies', async () => {
      reply = () => new Response('{}', { headers: [['Content-Type', 'application/json'], ['Set-Cookie','__Host-fries_session=test; Secure; Path=/; HttpOnly'], ['Set-Cookie','fries_session=; Max-Age=0; Path=/']] })
      const response = await send('auth/login', { method: 'POST', headers: { origin, 'Content-Type':'application/json' }, body:'{}' })
      assert.equal(response.status, 200)
      assert.equal(calls.at(-1).url, 'https://admin.fries-cup.com/api/auth/login')
      assert.equal(response.headers.getSetCookie().length, 2)
      assert.match(response.headers.get('cache-control'), /private.*no-store/)
    })
    await t.test('a cross-site write is rejected before dispatch', async () => {
      const count = calls.length
      assert.equal((await send('auth/login', {method:'POST',headers:{origin:'https://untrusted.example'},body:'{}'})).status,403)
      assert.equal(calls.length,count)
    })
    await t.test('large profile uploads work and ordinary writes stay bounded', async () => {
      reply = () => new Response('{}', { headers: {'Content-Type':'application/json'} })
      const body = 'a'.repeat(2.8 * 1024 * 1024)
      assert.equal((await send('me/profile',{method:'PATCH',headers:{origin},body})).status,200)
      assert.equal(calls.at(-1).options.body.byteLength,body.length)
      assert.equal((await send('me/password',{method:'PATCH',headers:{origin},body})).status,413)
      assert.equal((await send('me/profile',{method:'PATCH',headers:{origin},body:'a'.repeat(3*1024*1024+1)})).status,413)
    })
    await t.test('a binary avatar is cacheable without credentials or cookies', async () => {
      reply = () => new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=31536000, immutable'}})
      const response = await send(`media/avatars/${'a'.repeat(24)}/${'b'.repeat(32)}-96.webp`,{headers:{cookie:'private=test',authorization:'Bearer private'}})
      assert.equal(response.status,200)
      assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3])
      assert.match(response.headers.get('cache-control'),/public.*immutable/)
      assert.equal(response.headers.has('vercel-cdn-cache-control'),false)
      assert.equal(calls.at(-1).options.headers.has('cookie'),false)
      assert.equal(calls.at(-1).options.headers.has('authorization'),false)
    })
    await t.test('match operations use the private production path', async () => {
      reply = () => new Response('{}',{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=60'}})
      const response = await send('me/weekly/matches/TEST/room')
      assert.equal(response.status,200)
      assert.match(response.headers.get('cache-control'),/no-store/)
      assert.equal(calls.at(-1).url,'https://admin.fries-cup.com/api/me/weekly/matches/TEST/room')
    })
    await t.test('duplicate and nested paths cannot choose another upstream', async () => {
      const count = calls.length
      for(const path of ['auth/login&platformPath=me/profile','..%2fauth/login','auth%252flogin','https:%2f%2fevil.example']) assert.equal((await send(path)).status,400)
      assert.equal(calls.length,count)
    })
    await t.test('failed submitted writes are not replayed or reported successful', async () => {
      const count = calls.length
      reply = () => { throw new Error('connection reset') }
      const response = await send('me/profile',{method:'PATCH',headers:{origin},body:'{}'})
      assert.equal(response.status,502)
      assert.equal((await response.json()).outcomeUnknown,true)
      assert.equal(calls.length,count+1)
    })
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})

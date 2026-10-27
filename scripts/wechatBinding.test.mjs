import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchWechatBinding, unlinkWechatAccount } from '../src/features/account-security/accountSecurityApi.js'
import { proxyRequest } from '../edge-functions/api/[[path]].js'

test('web binding uses the existing Cookie transport and keeps the password out of the URL', async () => {
  const previous = globalThis.fetch, calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options })
    return options.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ linked: true, linkedAt: '2026-10-27T00:00:00Z', openId: 'never-expose' })
  }
  try {
    assert.deepEqual(await fetchWechatBinding(), { linked: true, linkedAt: '2026-10-27T00:00:00Z' })
    await unlinkWechatAccount('synthetic-current-password')
    assert.equal(calls[1].url, '/api/platform/account/wechat-binding')
    assert.equal(calls[1].credentials, 'include')
    assert.equal(calls[1].cache, 'no-store')
    assert.equal(calls[1].body, JSON.stringify({ password: 'synthetic-current-password' }))
    assert(!calls[1].headers.Authorization)
  } finally { globalThis.fetch = previous }
})

test('binding proxy preserves browser Origin and Cookie and never enters the public cache', async () => {
  const origin = 'https://stats.example.test'
  let upstream = 0
  const cache = { match: () => assert.fail('Private link must not read public cache'), put: () => assert.fail('Private link must not write public cache') }
  for (const method of ['GET', 'DELETE']) {
    const response = await proxyRequest(new Request(origin + '/api/platform/account/wechat-binding', {
      method, headers: { origin, cookie: 'fc_session=synthetic', 'Content-Type': 'application/json' },
      ...(method === 'DELETE' ? { body: JSON.stringify({ password: 'synthetic' }) } : {})
    }), { cache, fetchImpl: async (url, options) => {
      upstream++
      assert.equal(url, 'https://admin.fries-cup.com/api/account/wechat-binding')
      assert.equal(options.headers.get('cookie'), 'fc_session=synthetic')
      assert.equal(options.headers.get('origin'), origin)
      return Response.json({ linked: true }, { headers: { 'Cache-Control': 'public, max-age=500' } })
    } })
    assert.equal(response.status, 200)
    assert.match(response.headers.get('cache-control'), /private.*no-store/)
  }
  assert.equal(upstream, 2)
})

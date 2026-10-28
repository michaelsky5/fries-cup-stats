import test from 'node:test'
import assert from 'node:assert/strict'
import { getPublicLogoSources, getTeamLogoCandidates } from '../src/lib/teamLogoResolver.js'
import { proxyRequest } from '../edge-functions/api/[[path]].js'

const tail = '1'.repeat(24) + '/' + '2'.repeat(32)
const source = 'https://admin.fries-cup.com/api/media/team-logos/' + tail + '.webp'

test('small public uploads try a fixed thumbnail then the exact original without changing source data', () => {
  const team = { id: 'test-team', short: 'FCS', logo: source }, before = structuredClone(team)
  for (const size of [96, 192]) {
    const candidates = getTeamLogoCandidates(team, 'FCW26', { size })
    assert.equal(candidates[0], '/api/platform/media/team-logos/' + tail + '-' + size + '.webp')
    assert.equal(candidates[1], '/api/platform/media/team-logos/' + tail + '.webp')
    assert.ok(candidates.includes(source))
  }
  assert.deepEqual(team, before)
  assert.deepEqual(getPublicLogoSources(source, { size: 512 }), getPublicLogoSources(source))
  for (const size of [0, 4096, '96?private=1']) assert.deepEqual(getPublicLogoSources(source, { size }), getPublicLogoSources(source))
  assert.deepEqual(getPublicLogoSources('/logos/legacy.png', { size: 96 }), ['/logos/legacy.png'])
})

test('fixed thumbnail variants use the same cookie-free public media proxy as original logos', async () => {
  for (const size of [96, 192]) {
    const pathname = '/api/platform/media/team-logos/' + tail + '-' + size + '.webp'
    let call
    const result = await proxyRequest(new Request('https://stats.fries-cup.com' + pathname, { headers: { cookie: 'synthetic-cookie', authorization: 'Bearer synthetic' } }), {
      fetchImpl: async (url, options) => { call = { url, options }; return new Response(new Uint8Array([1,2,3]), { headers: { 'Content-Type':'image/webp', 'Cache-Control':'public, max-age=31536000, immutable' } }) }
    })
    assert.equal(result.status, 200)
    assert.equal(call.url, pathname.replace('/api/platform/', 'https://admin.fries-cup.com/api/'))
    assert.equal(call.options.headers.get('cookie'), null)
    assert.equal(call.options.headers.get('authorization'), null)
    assert.equal(result.headers.get('content-type'), 'image/webp')
  }
})

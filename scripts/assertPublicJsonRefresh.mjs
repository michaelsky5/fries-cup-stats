import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import test from 'node:test'
import { requestPublicJson } from '../src/lib/publicJsonRequest.js'
import { clearDbCache, getDb, getDbSource, refreshDb } from '../src/lib/db.js'
import { getSeasonById } from '../src/config/seasons.js'

const errorCode = 'DATA_LOAD_FAILED'
const payloadResponse = (data, etag) => Response.json(data, { headers: etag ? { etag } : {} })

test('real HTTP revalidation transfers no body for unchanged data and receives same-date edits', async t => {
  let revision = 1
  let bodies = 0
  const received = []
  const server = createServer((req, res) => {
    received.push(req.headers['if-none-match'])
    res.setHeader('ETag', `W/"data-${revision}"`)
    // Reproduce the deployed endpoint's exact-tag comparison behind gzip.
    if (req.headers['if-none-match'] === `"data-${revision}"`) {
      res.writeHead(304).end()
    } else {
      bodies += 1
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ revision, updated_at: '2026-08-16T15:06:51.985Z' }))
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); server.close() })
  const origin = `http://127.0.0.1:${server.address().port}`
  const url = `${origin}/data`
  const first = await requestPublicJson(url, errorCode, { origin })
  const cached = { ...first, sourceUrl: url }
  const unchanged = await requestPublicJson(url, errorCode, { origin, cached })
  assert.strictEqual(unchanged.data, first.data)
  assert.equal(bodies, 1)
  assert.deepEqual(received, [undefined, '"data-1"'])
  revision = 2
  const changed = await requestPublicJson(url, errorCode, { origin, cached })
  assert.equal(changed.data.revision, 2)
  assert.equal(changed.data.updated_at, first.data.updated_at)
  assert.equal(bodies, 2)
})

test('validators require the exact cached source and never add cross-origin request headers', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return payloadResponse({ teams: [] }, 'W/"data-2"')
  })
  const origin = 'https://stats.example.test'
  const cached = { data: { teams: [] }, sourceUrl: '/api/season-a', etag: 'W/"data-1"' }
  await requestPublicJson('/api/season-a', errorCode, { origin, cached })
  await requestPublicJson('/api/season-b', errorCode, { origin, cached })
  const external = 'https://admin.example.test/api/data'
  await requestPublicJson(external, errorCode, { origin, cached: { ...cached, sourceUrl: external } })
  await requestPublicJson('/api/season-a', errorCode, { origin, cached: { ...cached, etag: '' } })
  assert.equal(calls[0].options.headers['If-None-Match'], '"data-1"')
  assert.equal(calls[0].options.cache, 'no-store')
  for (const { options } of calls.slice(1)) {
    assert.equal(options.headers, undefined)
    assert.equal(options.cache, 'no-cache')
  }
})

test('an unexpected 304 or malformed validator cannot become a successful empty snapshot', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 304 }))
  for (const etag of ['', '*', 'W/"a", "b"', '"a"\r\nX-Test: injected']) {
    await assert.rejects(requestPublicJson('/api/orphan', errorCode, {
      cached: { data: { teams: [] }, sourceUrl: '/api/orphan', etag }
    }), /304_WITHOUT_SNAPSHOT/)
  }
})

test('simultaneous reads share one pending download and failed requests can retry', async t => {
  let rejectRequest
  const fetchMock = t.mock.method(globalThis, 'fetch', () => new Promise((_, reject) => { rejectRequest = reject }))
  const first = requestPublicJson('/api/shared', errorCode)
  const duplicate = requestPublicJson('/api/shared', errorCode)
  assert.strictEqual(first, duplicate)
  assert.equal(fetchMock.mock.callCount(), 1)
  rejectRequest(new Error('OFFLINE'))
  assert.deepEqual((await Promise.allSettled([first, duplicate])).map(result => result.status), ['rejected', 'rejected'])
  fetchMock.mock.mockImplementation(async () => payloadResponse({ recovered: true }))
  assert.equal((await requestPublicJson('/api/shared', errorCode)).data.recovered, true)
  assert.equal(fetchMock.mock.callCount(), 2)
})

test('the timeout also covers downloading the body and releases the pending request', async t => {
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => ({
    ok: true,
    json: () => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
  }))
  await assert.rejects(requestPublicJson('/api/slow-body', errorCode, { timeoutMs: 25 }), /REQUEST_TIMEOUT/)
  globalThis.fetch = async () => payloadResponse({ recovered: true })
  assert.equal((await requestPublicJson('/api/slow-body', errorCode, { timeoutMs: 25 })).data.recovered, true)
})

test('validated season refresh preserves identity, updates validators, and keeps failures visible', async t => {
  const fixture = JSON.parse(await readFile(new URL('../public/data/qgcs4_review_public.json', import.meta.url), 'utf8'))
  const season = getSeasonById('QGCS4')
  const calls = []
  let response = 'first'
  clearDbCache()
  t.after(() => clearDbCache())
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    if (response === 'offline') throw new Error('OFFLINE')
    if (response === 'invalid') return payloadResponse({ invalid: true }, '"invalid"')
    if (response === 'unchanged') return new Response(null, { status: 304 })
    return payloadResponse({ ...structuredClone(fixture), updated_at: '2026-08-31T00:00:00Z' }, `W/"${response}"`)
  })
  const first = await getDb('QGCS4')
  assert.equal(getDbSource(first).etag, 'W/"first"')
  response = 'unchanged'
  assert.strictEqual(await refreshDb('QGCS4'), first)
  assert.equal(calls.at(-1).options.headers['If-None-Match'], '"first"')
  response = 'new-validator-same-content'
  assert.strictEqual(await refreshDb('QGCS4'), first)
  assert.equal(getDbSource(first).etag, 'W/"new-validator-same-content"')
  for (const failure of ['invalid', 'offline']) {
    response = failure
    calls.length = 0
    await assert.rejects(refreshDb('QGCS4'), /DATA_LOAD_FAILED/)
    assert.equal(calls.some(call => call.url === season.localDataUrl), false)
    assert.strictEqual(await getDb('QGCS4'), first)
    assert.equal(getDbSource(first).etag, 'W/"new-validator-same-content"')
  }
})

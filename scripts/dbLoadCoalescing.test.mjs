import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { clearDbCache, getDb, refreshDb, getDbSource, getReviewReport } from '../src/lib/db.js'
import { invalidatePublicJsonRequests, requestPublicJson } from '../src/lib/publicJsonRequest.js'

const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const fixture = revision => ({ teams: [{ team_id: 'T1' }], players: [], player_totals: [], matches: [], revision, updated_at: `2026-10-${20 + revision}T00:00:00Z` })
const json = value => Response.json(value, { headers: { etag: `"${value.revision}"` } })

function storage(t, stored = null, holdRead = false) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const reads = [], writes = []
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: { open() {
    const open = { result: { close() {}, transaction() {
      const transaction = { objectStore() { return {
        get() {
          const request = { result: stored }
          const complete = () => transaction.oncomplete?.()
          reads.push(complete)
          if (!holdRead) queueMicrotask(complete)
          return request
        },
        put(value) {
          writes.push(value)
          queueMicrotask(() => transaction.oncomplete?.())
          return {}
        }
      } } }
      return transaction
    } } }
    queueMicrotask(() => open.onsuccess?.())
    return open
  } } })
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'indexedDB', descriptor); else delete globalThis.indexedDB })
  return { reads, writes }
}

test.beforeEach(() => clearDbCache())
test.afterEach(async () => { await tick(); clearDbCache() })

test('50 simultaneous season readers share hydration, object identity and one disk write', async t => {
  const disk = storage(t)
  const calls = []
  t.mock.method(globalThis, 'fetch', async url => {
    calls.push(url)
    return json(url.endsWith('/team-logos') ? { seasonId: 'FCW26', logos: [{ teamId: 'T1', logoUrl: '/logo.png' }] } : fixture(1))
  })
  const values = await Promise.all(Array.from({ length: 50 }, () => getDb('FCW26')))
  await tick()
  assert.ok(values.every(value => value === values[0]))
  assert.equal(values[0].teams[0].team_logo, '/logo.png')
  assert.equal(calls.length, 2)
  assert.equal(disk.reads.length, 1)
  assert.equal(disk.writes.length, 1)
  assert.strictEqual(await getDb('FCW26'), values[0])

  calls.length = 0
  const refreshed = await Promise.all(Array.from({ length: 50 }, () => refreshDb('FCW26')))
  assert.ok(refreshed.every(value => value === values[0]))
  assert.equal(calls.length, 2)
  await tick()
  assert.equal(disk.writes.length, 1, 'an unchanged publication does not rewrite IndexedDB')
})

test('a slow disk read cannot replace a newer network refresh', async t => {
  const disk = storage(t, { data: fixture(0), sourceUrl: '/api/admin-public/seasons/FCW26/publish/latest/data' }, true)
  t.mock.method(globalThis, 'fetch', async url => json(url.endsWith('/team-logos') ? { logos: [] } : fixture(2)))
  const loading = getDb('FCW26')
  await tick()
  const refreshed = await refreshDb('FCW26')
  disk.reads[0]()
  assert.strictEqual(await loading, refreshed)
  assert.strictEqual(await getDb('FCW26'), refreshed)
  assert.equal(refreshed.revision, 2)
})

test('clearing during download neither reuses nor reinstalls the invalidated task', async t => {
  storage(t)
  const firstResponse = deferred(), secondResponse = deferred()
  let downloads = 0
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('/team-logos')) return json({ logos: [] })
    downloads += 1
    return (downloads === 1 ? firstResponse : secondResponse).promise
  })
  const first = getDb('FCW26')
  await tick()
  clearDbCache('FCW26')
  const second = getDb('FCW26')
  await tick()
  assert.equal(downloads, 2)
  firstResponse.resolve(json(fixture(0)))
  await first
  const third = getDb('FCW26')
  await tick()
  assert.equal(downloads, 2, 'old cleanup cannot evict the second pending load')
  secondResponse.resolve(json(fixture(2)))
  assert.strictEqual(await second, await third)
  assert.equal((await getDb('FCW26')).revision, 2)
})

test('rejected refresh is shared, preserves the cached snapshot, and can retry', async t => {
  storage(t)
  let offline = false, downloads = 0
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('/team-logos')) return json({ logos: [] })
    downloads += 1
    if (offline) throw new Error('OFFLINE')
    return json(fixture(downloads > 1 ? 2 : 1))
  })
  const original = await getDb('FCW26')
  offline = true
  const failed = await Promise.allSettled(Array.from({ length: 20 }, () => refreshDb('FCW26')))
  assert.ok(failed.every(result => result.status === 'rejected'))
  assert.equal(downloads, 3, 'one failed request per published source, not per reader')
  assert.strictEqual(await getDb('FCW26'), original)
  offline = false
  assert.equal((await refreshDb('FCW26')).revision, 2)
})

test('published and archive cache keys remain separate; report loads also share work', async t => {
  storage(t)
  const archive = JSON.parse(await readFile(new URL('../public/data/qgcs4_review_public.json', import.meta.url)))
  let reportDownloads = 0
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('/report')) { reportDownloads += 1; return json({ report: true }) }
    return json({ ...structuredClone(archive), revision: url.startsWith('/data/') ? 'archive' : 'published' })
  })
  const [published, local] = await Promise.all([getDb('QGCS4'), getDb('QGCS4', { preferLocalData: true })])
  assert.equal(published.revision, 'published')
  assert.equal(local.revision, 'archive')
  assert.equal(getDbSource(local).kind, 'local-preview')
  assert.strictEqual(await getDb('QGCS4'), published)
  const reports = await Promise.all(Array.from({ length: 20 }, () => getReviewReport('QGCS4')))
  assert.ok(reports.every(report => report === reports[0]))
  assert.equal(reportDownloads, 1)
})

test('raw request invalidation keeps new pending requests when old consumers finish', async t => {
  const firstResponse = deferred(), secondResponse = deferred()
  let downloads = 0
  t.mock.method(globalThis, 'fetch', () => (++downloads === 1 ? firstResponse : secondResponse).promise)
  const first = requestPublicJson('/invalidate', 'FAILED')
  invalidatePublicJsonRequests(['/invalidate'])
  const second = requestPublicJson('/invalidate', 'FAILED')
  firstResponse.resolve(json(fixture(0)))
  await first
  assert.strictEqual(requestPublicJson('/invalidate', 'FAILED'), second)
  assert.equal(downloads, 2)
  secondResponse.resolve(json(fixture(2)))
  assert.equal((await second).data.revision, 2)
})

test('rate limits retain retry metadata and do not retry through a second API hostname', async t => {
  storage(t)
  const calls = []
  t.mock.method(globalThis, 'fetch', async url => { calls.push(url); return Response.json({}, { status: 429, headers: { 'Retry-After': '45' } }) })
  await assert.rejects(refreshDb('FCW26'), error => error.status === 429 && error.retryAfterMs === 45_000)
  assert.deepEqual(calls, ['/api/admin-public/seasons/FCW26/publish/latest/data'])
})

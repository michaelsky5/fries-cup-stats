import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { packageProductionRelease, verifyProductionRelease } from './lib/productionRelease.mjs'
import onRequest from '../edge-functions/api/[[path]].js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const request = method => ({ request: new Request('https://stats.example.test/api/release', { method }) })
test('an unstamped function cannot claim a production release identity', async () => {
  const response = onRequest(request('GET'))
  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, 'RELEASE_IDENTITY_UNAVAILABLE')
  assert.match(response.headers.get('cache-control'), /no-store/)
})
test('one package binds static assets, configuration and the actual function; changes are rejected', async () => {
  const base = path.join(root, 'artifacts'); mkdirSync(base, { recursive: true })
  const out = mkdtempSync(path.join(base, 'release-test-'))
  try {
    writeFileSync(path.join(out, 'index.html'), '<main>release fixture</main>')
    mkdirSync(path.join(out, 'assets')); writeFileSync(path.join(out, 'assets/app.js'), 'export default 1')
    const identity = packageProductionRelease(root, out, 'a'.repeat(40), '2026-10-21T00:00:00.000Z')
    const proxyPath = path.join(out, 'edge-functions/api/[[path]].js')
    const source = readFileSync(proxyPath, 'utf8')
    const handler = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default
    const response = handler(request('GET'))
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), identity)
    assert.equal(response.headers.get('cdn-cache-control'), 'no-store')
    assert.equal(await handler(request('HEAD')).text(), '')
    assert.equal(handler(request('POST')).status, 405)
    assert.deepEqual(verifyProductionRelease(out), identity)
    writeFileSync(path.join(out, 'assets/app.js'), 'export default 2')
    assert.throws(() => verifyProductionRelease(out), /Static release content changed/)
    writeFileSync(path.join(out, 'assets/app.js'), 'export default 1')
    writeFileSync(proxyPath, source.replace('https://admin.fries-cup.com', 'https://unexpected.example.test'))
    assert.throws(() => verifyProductionRelease(out), /Proxy source changed/)
    writeFileSync(proxyPath, source)
    writeFileSync(path.join(out, 'edgeone.json'), '{}')
    assert.throws(() => verifyProductionRelease(out), /Edge configuration changed/)
  } finally {
    assert.ok(out.startsWith(base + path.sep + 'release-test-')); rmSync(out, { recursive: true })
  }
})

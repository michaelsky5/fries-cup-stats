import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { packageProductionRelease, stageGitDeploymentFunction, verifyProductionRelease } from './lib/productionRelease.mjs'
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

test('Git deployment stages the matching root function and refuses a different checkout or changed source', async () => {
  const base = path.join(root, 'artifacts'); mkdirSync(base, { recursive: true })
  const fixture = mkdtempSync(path.join(base, 'git-release-test-'))
  try {
    cpSync(path.join(root, 'edge-functions'), path.join(fixture, 'edge-functions'), { recursive: true })
    cpSync(path.join(root, 'edgeone.json'), path.join(fixture, 'edgeone.json'))
    const out = path.join(fixture, 'dist'); mkdirSync(out)
    writeFileSync(path.join(out, 'index.html'), '<main>Git deployment fixture</main>')
    const commit = 'b'.repeat(40), identity = packageProductionRelease(fixture, out, commit)
    const target = path.join(fixture, 'edge-functions/api/[[path]].js'), original = readFileSync(target)
    assert.throws(() => stageGitDeploymentFunction(fixture, out, 'c'.repeat(40)), /does not match/)
    assert.deepEqual(readFileSync(target), original, 'A wrong commit must not modify the function')
    writeFileSync(target, Buffer.concat([original, Buffer.from('\n// changed')]))
    assert.throws(() => stageGitDeploymentFunction(fixture, out, commit), /Root function differs/)
    writeFileSync(target, original)
    assert.deepEqual(stageGitDeploymentFunction(fixture, out, commit), identity)
    const handler = (await import('data:text/javascript;base64,' + readFileSync(target).toString('base64'))).default
    assert.deepEqual(await handler(request('GET')).json(), identity)
    assert.deepEqual(verifyProductionRelease(out), identity, 'Staging does not alter the retained package')
    assert.throws(() => stageGitDeploymentFunction(fixture, out, commit), /Root function differs/, 'Do not build twice on an already generated source file')
  } finally {
    assert.ok(fixture.startsWith(base + path.sep + 'git-release-test-')); rmSync(fixture, { recursive: true })
  }
})

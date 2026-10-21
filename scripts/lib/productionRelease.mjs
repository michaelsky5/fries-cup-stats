import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cpSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const releaseMarker = 'const RELEASE_IDENTITY = null // stamped by the production release builder'
const hash = value => createHash('sha256').update(value).digest('hex')
const names = { manifest: 'release-version.json', proxy: 'edge-functions/api/[[path]].js', config: 'edgeone.json' }

function staticFiles(root, directory = root) {
  return readdirSync(directory).sort().flatMap(name => {
    const file = path.join(directory, name), stat = lstatSync(file)
    const relative = path.relative(root, file).replaceAll('\\', '/')
    assert.ok(!stat.isSymbolicLink(), `Release must not contain symlinks: ${relative}`)
    if (relative === names.manifest || relative === names.config || relative === 'edge-functions') return []
    assert.ok(!/(^|\/)(?:\.env(?:\.|$)|\.git(?:\/|$)|\.npmrc$|src(?:\/|$)|node_modules(?:\/|$))|\.map$/i.test(relative), `Private release file: ${relative}`)
    if (stat.isDirectory()) return staticFiles(root, file)
    assert.ok(stat.isFile() && stat.size <= 25 * 1024 * 1024, `Invalid release file: ${relative}`)
    return [[relative, hash(readFileSync(file))]]
  })
}

export function packageProductionRelease(root, out, sourceCommit, builtAt = new Date().toISOString()) {
  assert.match(sourceCommit, /^[a-f0-9]{40}$/)
  assert.ok(readFileSync(path.join(out, 'index.html')).length)
  cpSync(path.join(root, names.config), path.join(out, names.config))
  cpSync(path.join(root, 'edge-functions'), path.join(out, 'edge-functions'), { recursive: true })
  const proxyPath = path.join(out, names.proxy), source = readFileSync(proxyPath, 'utf8')
  assert.equal(source.split(releaseMarker).length, 2, 'Review the EdgeOne release marker before packaging')
  // Keep the release identity in the existing entry; a second function entry
  // must not accidentally shadow the catch-all account/public proxy.
  const files = staticFiles(out)
  assert.ok(files.length > 0 && files.length < 19997, 'Unexpected static asset count')
  const identity = {
    schemaVersion: 1, environment: 'production', sourceCommit, builtAt,
    staticFileCount: files.length, staticTreeSha256: hash(JSON.stringify(files)),
    proxySourceSha256: hash(source), edgeConfigSha256: hash(readFileSync(path.join(out, names.config)))
  }
  writeFileSync(proxyPath, source.replace(releaseMarker, `const RELEASE_IDENTITY = ${JSON.stringify(identity)} // stamped by the production release builder`))
  writeFileSync(path.join(out, names.manifest), JSON.stringify(identity, null, 2) + '\n')
  return verifyProductionRelease(out)
}

export function verifyProductionRelease(out) {
  const identity = JSON.parse(readFileSync(path.join(out, names.manifest), 'utf8'))
  assert.equal(identity.schemaVersion, 1); assert.equal(identity.environment, 'production')
  assert.match(identity.sourceCommit, /^[a-f0-9]{40}$/)
  const files = staticFiles(out)
  assert.equal(files.length, identity.staticFileCount)
  assert.equal(hash(JSON.stringify(files)), identity.staticTreeSha256, 'Static release content changed')
  assert.equal(hash(readFileSync(path.join(out, names.config))), identity.edgeConfigSha256, 'Edge configuration changed')
  const source = readFileSync(path.join(out, names.proxy), 'utf8')
  const stamped = `const RELEASE_IDENTITY = ${JSON.stringify(identity)} // stamped by the production release builder`
  assert.equal(source.split(stamped).length, 2, 'Frontend and function identities differ')
  assert.equal(hash(source.replace(stamped, releaseMarker)), identity.proxySourceSha256, 'Proxy source changed')
  assert.deepEqual(readdirSync(path.join(out, 'edge-functions')), ['api'])
  assert.deepEqual(readdirSync(path.join(out, 'edge-functions/api')), ['[[path]].js'])
  return identity
}

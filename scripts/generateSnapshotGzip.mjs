import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { rolldown } from 'rolldown'

// Regeneration only: no package install or runtime dependency. Keep the deployed
// catch-all self-contained so its source digest covers the actual gzip codec.
const version = '0.8.3'
const integrity = 'sha512-tbZNuJrLwGUp3zshBtdy4W+ORxZuIh8a5ilyIEQDC5rY1f3U20JMry0Ll3WBzU58EZKsEuJFXhb5gwv8CsPvgA=='
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const response = await fetch(`https://registry.npmjs.org/fflate/-/fflate-${version}.tgz`, { redirect: 'error' })
assert.equal(response.status, 200)
const archive = Buffer.from(await response.arrayBuffer())
assert.ok(archive.length < 2 * 1024 * 1024)
assert.equal('sha512-' + createHash('sha512').update(archive).digest('base64'), integrity)
const tar = gunzipSync(archive, { maxOutputLength: 4 * 1024 * 1024 })
const wanted = new Map([['package/esm/browser.js', null], ['package/LICENSE', null]])
for (let offset = 0; offset + 512 <= tar.length;) {
  const header = tar.subarray(offset, offset + 512)
  const name = header.subarray(0, 100).toString().replace(/\0.*$/, '')
  if (!name) break
  const size = Number.parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, '').trim(), 8) || 0
  assert.ok(size >= 0 && offset + 512 + size <= tar.length)
  if (wanted.has(name)) {
    assert.ok(header[156] === 0 || header[156] === 48, 'Only read regular source files')
    assert.equal(wanted.get(name), null)
    wanted.set(name, tar.subarray(offset + 512, offset + 512 + size))
  }
  offset += 512 + Math.ceil(size / 512) * 512
}
assert.ok([...wanted.values()].every(Boolean))
const staging = path.join(root, '.codex-tmp', `snapshot-codec-${version}`)
mkdirSync(staging, { recursive: true })
const browserPath = path.join(staging, 'browser.mjs')
if (existsSync(browserPath)) assert.deepEqual(readFileSync(browserPath), wanted.get('package/esm/browser.js'))
else writeFileSync(browserPath, wanted.get('package/esm/browser.js'), { flag: 'wx' })
const entry = path.join(staging, 'entry.mjs')
writeFileSync(entry, "export { Gzip } from './browser.mjs'\n")
const bundle = await rolldown({ input: entry, treeshake: true, platform: 'browser' })
let code
try {
  const result = await bundle.generate({ format: 'iife', name: 'FriesSnapshotGzip', exports: 'named', minify: true })
  assert.equal(result.output.length, 1)
  code = result.output[0].code.trim()
} finally { await bundle.close() }
assert.ok(code.length < 80000 && !/\bimport\s|new Worker|sourceMappingURL|\.codex-tmp|Z:\\/.test(code))
const license = wanted.get('package/LICENSE').toString('utf8').trim()
assert.match(license, /MIT License/)
assert.ok(!license.includes('*/'))
const begin = '// BEGIN GENERATED PUBLIC GZIP CODEC'
const end = '// END GENERATED PUBLIC GZIP CODEC'
const block = `${begin}\n/*! fflate ${version}, gzip-only browser bundle.\n * Regenerate: node scripts/generateSnapshotGzip.mjs\n * Source integrity: ${integrity}\n * ${license.split('\n').join('\n * ')}\n */\n/* eslint-disable no-redeclare, no-sparse-arrays, no-empty -- Pinned generated third-party codec only. */\n${code}\n/* eslint-enable no-redeclare, no-sparse-arrays, no-empty */\n${end}`
const target = path.join(root, 'edge-functions/api/[[path]].js')
const source = readFileSync(target, 'utf8').replaceAll('\r\n', '\n')
const generated = source.includes(begin)
  ? source.slice(0, source.indexOf(begin)) + block + source.slice(source.indexOf(end) + end.length)
  : source.replace('\nfunction acceptsGzip', '\n' + block + '\n\nfunction acceptsGzip')
assert.ok(generated.includes(block))
if (process.argv.includes('--check')) assert.equal(source, generated, 'Regenerate the pinned gzip codec')
else writeFileSync(target, generated)
console.log(JSON.stringify({ version, integrity, bundleBytes: Buffer.byteLength(code), selfContained: true }))

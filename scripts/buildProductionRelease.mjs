import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { packageProductionRelease } from './lib/productionRelease.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.resolve(root, process.argv[2] || 'dist')
assert.ok(out.startsWith(root + path.sep), 'Build inside the isolated checkout')
assert.ok(!existsSync(out), 'Choose a fresh output directory; preserve the previous package')
assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), '', 'Commit the candidate before building a release')
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
for (const key of Object.keys(process.env)) if (key.startsWith('VITE_')) delete process.env[key]
process.env.VITE_PLATFORM_API_BASE_URL = '/api/platform'
await build({ root, configFile: false, envDir: false, plugins: [react()], build: { outDir: out, manifest: true } })
console.log(JSON.stringify({ scope: 'Local package only; no upload or deployment', ...packageProductionRelease(root, out, sha) }))

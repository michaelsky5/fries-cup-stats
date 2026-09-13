import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'dist')
if (fs.existsSync(out)) throw new Error('Keep the previous package intact; dist must not exist.')
if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) {
  throw new Error('Commit the isolated candidate before building.')
}
for (const key of Object.keys(process.env)) if (key.startsWith('VITE_')) delete process.env[key]
process.env.VITE_PLATFORM_API_BASE_URL = '/api/platform'
await build({ root, configFile: false, envDir: false, plugins: [react()], build: { outDir: out } })
fs.copyFileSync(path.join(root, 'edgeone.json'), path.join(out, 'edgeone.json'))
fs.cpSync(path.join(root, 'edge-functions'), path.join(out, 'edge-functions'), { recursive: true })
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
const indexPath = path.join(out, 'index.html')
const notice = '<aside aria-label="账号测试环境" style="padding:7px 16px;background:#f0ca43;color:#171915;text-align:center;font:600 12px/1.5 sans-serif">账号测试环境 · 非正式赛事数据</aside>'
fs.writeFileSync(indexPath, fs.readFileSync(indexPath, 'utf8')
  .replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">\n<meta name="referrer" content="no-referrer">')
  .replace('<body>', '<body>' + notice))
const version = {
  environment: 'account-staging', builtAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  accounts: 'staging', accountOrigin: 'https://test-admin.fries-cup.com',
  originalAccountCandidate: 'df4f0d279795b02c743551146442339f8ff3b49a',
  publicData: 'published-snapshots', officialOrigin: 'https://stats.fries-cup.com'
}
for (const name of ['account-preview-version.json', 'migration-version.json']) {
  fs.writeFileSync(path.join(out, name), JSON.stringify(version, null, 2) + '\n')
}
let count = 0, bytes = 0
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) { inspect(absolute); continue }
    if (!entry.isFile()) throw new Error('Unexpected asset type.')
    const relative = path.relative(out, absolute).replaceAll('\\', '/')
    if (/(^|\/)\.(env|git|npmrc)|\.map$|(^|\/)(src|node_modules)\//i.test(relative)) throw new Error(`Private artifact: ${relative}`)
    const size = fs.statSync(absolute).size
    if (size > 25 * 1024 * 1024) throw new Error(`Oversized asset: ${relative}`)
    count++; bytes += size
  }
}
inspect(out)
if (count > 20000) throw new Error('Too many assets.')
console.log(JSON.stringify({ version, count, bytes, indexSha256: crypto.createHash('sha256').update(fs.readFileSync(indexPath)).digest('hex') }))

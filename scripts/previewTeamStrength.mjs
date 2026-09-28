import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../artifacts/internal-team-strength-20260926')
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run analyze:team-strength first')
const allowed = new Set(['index.html', 'report.json', 'predictions.json', 'ratings.json', 'identity-candidates.json', 'README.md'])
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname
  const file = pathname === '/' ? 'index.html' : pathname.slice(1)
  if (!['GET', 'HEAD'].includes(request.method) || !allowed.has(file)) { response.writeHead(404); response.end(); return }
  const bytes = fs.readFileSync(path.join(root, file))
  response.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' })
  response.end(request.method === 'HEAD' ? undefined : bytes)
})
server.listen(3066, '127.0.0.1', () => console.log('Internal team-strength report: http://127.0.0.1:3066'))

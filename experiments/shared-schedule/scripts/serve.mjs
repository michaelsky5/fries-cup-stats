import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/h5')
const api = '/api/public/seasons/FCW26/publish/latest/data'
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' }
export function createPreviewServer(readPublic = route => fetch('https://admin.fries-cup.com' + route, { signal: AbortSignal.timeout(20000) }), { root = defaultRoot } = {}) {
  return http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:3027')
    if (/^\/api\/public\/seasons\/(FCW26|FCR26|FCA26|QGCS4)\/publish\/latest\/data$/.test(url.pathname) && request.method === 'GET') {
      const upstream = await readPublic(url.pathname)
      const body = await upstream.text()
      response.writeHead(upstream.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      response.end(body)
      return
    }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end('Not found'); return }
    const content = await fs.promises.readFile(file)
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(content)
  } catch (_) {
    if (response.headersSent) { response.destroy(); return }
    response.writeHead(502, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ error: 'Public API unavailable' }))
  }
  })
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createPreviewServer().listen(3027, '127.0.0.1', () => console.log('Shared schedule H5: http://127.0.0.1:3027'))
}

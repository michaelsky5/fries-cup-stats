import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'
import { buildWeeklyPlayoffFixture } from './lib/weeklyPlayoffFixture.mjs'

const port = Number(process.env.WEEKLY_PLAYOFF_PREVIEW_PORT || 3061)
const argument = name => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null }
const snapshot = argument('--snapshot') ? JSON.parse(await readFile(argument('--snapshot'), 'utf8')) : null
const posterPath = argument('--poster')
const server = await createServer({
  cacheDir: 'artifacts/weekly-playoffs/vite-cache',
  define: { 'import.meta.env.VITE_WEEKLY_PREVIEW': JSON.stringify('1'), 'import.meta.env.VITE_PLATFORM_API_BASE_URL': JSON.stringify('/api/platform') },
  server: { host: '127.0.0.5', port, strictPort: true },
  plugins: [{ name: 'weekly-playoffs-preview', configureServer(vite) {
    vite.middlewares.use((req, res, next) => {
      const path = new URL(req.url, 'http://localhost').pathname
      if (path === '/__weekly-bracket-poster' && posterPath) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store')
        return readFile(posterPath, 'utf8').then(html => res.end(html), () => { res.statusCode = 500; res.end('Poster unavailable') })
      }
      if (path !== '/__weekly-overview/data.json' && !path.startsWith('/api/')) return next()
      res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store')
      if (req.method !== 'GET') { res.statusCode = 403; return res.end(JSON.stringify({ error: 'WEEKLY_PLAYOFF_PREVIEW_READ_ONLY' })) }
      if (path === '/__weekly-overview/data.json') {
        const state = new URL(req.headers.referer || '/', 'http://localhost').searchParams.get('sampleState') || 'complete'
        return res.end(JSON.stringify(state === 'published' && snapshot ? snapshot : buildWeeklyPlayoffFixture(state)))
      }
      if (path.endsWith('/auth/me')) return res.end(JSON.stringify({ user: null }))
      if (path.endsWith('/auth/config')) return res.end(JSON.stringify({ selfRegistrationEnabled: false, emailVerificationEnabled: false }))
      res.statusCode = 404; res.end(JSON.stringify({ error: 'WEEKLY_PLAYOFF_PREVIEW_ONLY' }))
    })
  } }]
})
await server.listen()
console.log(`Weekly playoff preview: http://127.0.0.5:${port}/advance?season=FCW2026&lang=zh&sampleState=complete#weekly-playoffs`)

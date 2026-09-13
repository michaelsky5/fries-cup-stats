import { createServer } from 'vite'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'

const port = Number(process.env.WEEKLY_PREVIEW_PORT || 3049)
const server = await createServer({
  cacheDir: 'node_modules/.vite-weekly-overview',
  define: {
    'import.meta.env.VITE_WEEKLY_PREVIEW': JSON.stringify('1'),
    'import.meta.env.VITE_PLATFORM_API_BASE_URL': JSON.stringify('/api/platform')
  },
  // A separate loopback origin keeps sample follows and season preferences local.
  server: { host: '127.0.0.4', port, strictPort: true },
  plugins: [{ name: 'weekly-overview-preview', configureServer(vite) {
    vite.middlewares.use((req, res, next) => {
      const path = new URL(req.url, 'http://localhost').pathname
      if (path !== '/__weekly-overview/data.json' && !path.startsWith('/api/')) return next()
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      if (req.method !== 'GET') {
        res.statusCode = 403
        return res.end(JSON.stringify({ error: 'WEEKLY_DESIGN_PREVIEW_READ_ONLY' }))
      }
      if (path === '/__weekly-overview/data.json') return res.end(JSON.stringify(buildWeeklyOverviewFixture()))
      if (path.endsWith('/auth/me')) return res.end(JSON.stringify({ user: null }))
      if (path.endsWith('/auth/config')) return res.end(JSON.stringify({ selfRegistrationEnabled: false, emailVerificationEnabled: false }))
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'WEEKLY_DESIGN_PREVIEW_ONLY' }))
    })
  } }]
})
await server.listen()
console.log(`Weekly design preview: http://127.0.0.4:${port}/?design=kpr5&lang=zh&season=FCW2026`)

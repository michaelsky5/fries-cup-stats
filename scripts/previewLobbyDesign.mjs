// Actual app routes with a loopback-only synthetic API. An explicit local
// backend may supply read-only lobby data; remote API origins are rejected.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { lobbyDesignCards } from './lobbyDesignFixtures.mjs'
import { filterLobbyCards, drawLobbyCards } from '../src/features/team-lobby/lobbyBrowseModel.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const port = Number(process.env.LOBBY_DESIGN_PORT || 3039)
const mailDemo = process.env.LOBBY_DESIGN_EMAIL_DEMO === 'true'
const localBackend = process.env.LOBBY_DESIGN_API_ORIGIN ? new URL(process.env.LOBBY_DESIGN_API_ORIGIN) : null
if (localBackend && (localBackend.protocol !== 'http:' || localBackend.hostname !== '127.0.0.1' || !localBackend.port
  || localBackend.username || localBackend.password || localBackend.pathname !== '/' || localBackend.search || localBackend.hash)) throw new Error('Only an explicit loopback test API is allowed')
const demoUser = { id: 'local-mail-demo', authVersion: 1, role: 'VIEWER', status: 'ACTIVE', displayName: '本地邮件预览', email: 'local-preview@example.invalid', emailVerifiedAt: new Date().toISOString() }
let demoPreference = { revision: 0, emailEnabled: false, requestEmail: true, resultEmail: true, qqViewedEmail: false }
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local preview port')
const vite = await createServer({
  root,
  configFile: false,
  envDir: false,
  define: { 'import.meta.env.VITE_PLATFORM_API_BASE_URL': JSON.stringify('/api/platform') },
  server: { host: '127.0.0.1', port, strictPort: true, hmr: false },
  plugins: [react(), {
    name: 'lobby-design-preview',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://127.0.0.1')
        if (!url.pathname.startsWith('/api/')) return next()
        const send = (body, status = 200) => {
          res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify(body))
        }
        const path = url.pathname.replace(/^\/api\/platform/, '')
        if (mailDemo && path === '/lobby/me/email-preferences') {
          if (req.method === 'PATCH') {
            try {
              let raw = ''
              for await (const chunk of req) { raw += chunk; if (raw.length > 2048) return send({ error: 'INVALID_INPUT' }, 400) }
              const body = JSON.parse(raw)
              if (body.revision !== demoPreference.revision) return send({ error: 'LOBBY_EMAIL_CHANGED' }, 409)
              const fields = ['emailEnabled', 'requestEmail', 'resultEmail', 'qqViewedEmail']
              if (!fields.every(key => typeof body[key] === 'boolean')) return send({ error: 'INVALID_INPUT' }, 400)
              demoPreference = { ...Object.fromEntries(fields.map(key => [key, body[key]])), revision: demoPreference.revision + 1 }
            } catch { return send({ error: 'INVALID_INPUT' }, 400) }
          } else if (req.method !== 'GET') return send({ error: 'LOCAL_DESIGN_PREVIEW' }, 403)
          return send({ userId: demoUser.id, available: true, emailVerified: true, preference: demoPreference })
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') return send({ error: 'LOCAL_DESIGN_PREVIEW', message: '本地设计预览不提交账号或联系操作。' }, 403)
        if (localBackend && (path === '/lobby/config' || path === '/lobby/cards' || path.startsWith('/lobby/cards/'))) {
          try {
            const response = await fetch(new URL('/api' + path + url.search, localBackend), { redirect: 'error', signal: AbortSignal.timeout(10000) })
            res.writeHead(response.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
            return res.end(await response.text())
          } catch { return send({ error: 'LOCAL_LOBBY_API_UNAVAILABLE' }, 503) }
        }
        if (path === '/auth/config') return send({ selfRegistrationEnabled: true, emailVerificationEnabled: true })
        if (path === '/auth/me') return send({ user: mailDemo ? demoUser : null })
        if (mailDemo && path.startsWith('/me/')) return send({ user: demoUser, profile: null, identities: [], competitions: [], competitionSeasons: [], capabilities: null, requests: [] })
        if (path === '/lobby/config') return send({ mode: 'WRITE', contactEnabled: true })
        if (path === '/lobby/cards' || path === '/lobby/cards/explore') {
          const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
          const pageSize = Math.max(1, Math.min(50, Number(url.searchParams.get('pageSize')) || 20))
          const role = url.searchParams.get('role')
          const cards = filterLobbyCards(lobbyDesignCards.filter(card => card.kind === (url.searchParams.get('kind') || 'TEAM')),
            { role, query: url.searchParams.get('q'), level: url.searchParams.get('level'), availability: url.searchParams.get('time'),
              qqMode: url.searchParams.get('qq'), recent: url.searchParams.get('recent'), teamState: url.searchParams.get('teamState'), sort: url.searchParams.get('sort') })
          if (path.endsWith('/explore')) {
            const keep = (url.searchParams.get('keep') || '').split(','), exclude = (url.searchParams.get('exclude') || '').split(',')
            const retained = keep.map(id => cards.find(card => card.publicId === id)).filter(Boolean)
            const fresh = drawLobbyCards(cards.filter(card => !keep.includes(card.publicId)), exclude.map(publicId => ({ publicId })))
            return send({ cards: [...retained, ...fresh].slice(0, 3), total: cards.length, page: 1, pageSize: 3 })
          }
          return send({ cards: cards.slice((page - 1) * pageSize, page * pageSize), total: cards.length, pageSize, page })
        }
        if (path.startsWith('/lobby/cards/')) {
          const card = lobbyDesignCards.find(item => item.publicId === path.split('/').at(-1))
          return card ? send({ card }) : send({ error: 'NOT_FOUND' }, 404)
        }
        if (path === '/lobby/me') return send({ cards: [], formations: [], teams: [], organizations: [], notices: [], canWrite: mailDemo, config: { contactEnabled: true } })
        // Shared public header bootstrap, still local and synthetic.
        return send({ seasons: [], events: [], items: [], data: [], total: 0 })
      })
    },
    transformIndexHtml(html) {
      return html.replace('<body>', `<body><div style="padding:5px 16px;background:#f4c320;color:#181a17;text-align:center;font:12px/1.6 'Microsoft YaHei',sans-serif">${mailDemo ? '本地邮件设置预览 · 模拟账号 · 保存仅在本机内存生效 · 不发送邮件' : '本地设计预览 · 示例数据 · 不连接正式账号与联系操作'}</div>`)
    },
  }],
})
await vite.listen()
console.log(`Lobby design preview: http://127.0.0.1:${port}/lobby`)
console.log(mailDemo ? 'Loopback only. Synthetic account. Only in-memory preference changes; no email delivery.' : 'Loopback only. Synthetic cards. All API writes are rejected locally.')
const stop = async () => { await vite.close(); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

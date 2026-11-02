// Read-only local preview. Every API request is handled here; nothing is proxied.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { createAccountReviewFixture } from './lib/accountReviewFixtureServer.mjs'
import { buildWeeklyOverviewFixture } from './lib/weeklyOverviewFixture.mjs'
import { lobbyDesignCards } from './lobbyDesignFixtures.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const port = Number(process.env.PARTICIPATION_PREVIEW_PORT || 3060)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local preview port')
const scenarios = { guest: 'guest', captain: 'preparing', player: 'player', unlinked: 'viewer', readonly: 'guest', closed: 'guest', unavailable: 'guest', retry: 'guest' }
let retryReads = 0
const fixtures = new Map(Object.entries(scenarios).map(([name, scenario]) => [name, createAccountReviewFixture(scenario)]))
const publicData = buildWeeklyOverviewFixture()
publicData.weekly_competition.registration = { cycle_id: 'sample-cycle-1', cycle_name: '第一周期 · 本机示例', week_number: 4, opens_at: new Date(Date.now() - 3600000).toISOString(), closes_at: new Date(Date.now() + 86400000).toISOString() }
publicData.updated_at = new Date().toISOString()
const controls = [['guest', '访客'], ['captain', '队长'], ['player', '选手'], ['unlinked', '未入队'], ['readonly', '大厅只读'], ['closed', '大厅关闭'], ['unavailable', '状态失败'], ['retry', '首读失败后重试']]
const banner = `<aside style="padding:7px 16px;background:#f4c320;color:#181a17;font:12px/1.7 sans-serif;display:flex;flex-wrap:wrap;gap:4px 20px;align-items:center"><strong>本地参赛中心预览 · 示例数据 · 不提交报名、不发送邮件</strong><nav aria-label="本机示例状态" style="display:flex;flex-wrap:wrap;gap:12px">${controls.map(([name, label]) => `<a href="/play?season=FCW2026&preview=${name}" style="color:inherit;text-underline-offset:3px">${label}</a>`).join('')}</nav></aside>`
const client = `<script>
(() => {
  const key = 'fries-cup:participation-preview';
  const allowed = ${JSON.stringify(Object.keys(scenarios))};
  const requested = new URL(location.href).searchParams.get('preview');
  const previous = sessionStorage.getItem(key);
  const scenario = allowed.includes(requested) ? requested : allowed.includes(previous) ? previous : 'guest';
  sessionStorage.setItem(key, scenario);
  const originalFetch = window.fetch;
  window.fetch = (input, init = {}) => {
    const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
    if (target.origin !== location.origin || !target.pathname.startsWith('/api/')) return originalFetch(input, init);
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('x-participation-preview', scenario);
    return originalFetch(input, { ...init, headers });
  };
})();
</script>`

const vite = await createServer({
  root, configFile: false, envDir: false,
  cacheDir: '.codex-tmp/participation-center-preview',
  define: {
    'import.meta.env.VITE_PLATFORM_API_BASE_URL': JSON.stringify('/api/platform'),
    'import.meta.env.VITE_WEEKLY_PREVIEW': JSON.stringify('1'),
    'import.meta.env.VITE_PREFER_LOCAL_DATA': JSON.stringify('1')
  },
  server: { host: '127.0.0.1', port, strictPort: true, hmr: false },
  plugins: [react(), {
    name: 'participation-center-readonly-preview',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://127.0.0.1')
        const send = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
        if (url.pathname === '/__weekly-overview/data.json') return send(publicData)
        if (!url.pathname.startsWith('/api/')) return next()
        if (!['GET', 'HEAD'].includes(req.method)) return send({ error: 'LOCAL_PREVIEW_READ_ONLY', message: '本机预览不提交账号、报名或联系操作。' }, 403)
        const preview = Object.hasOwn(scenarios, req.headers['x-participation-preview']) ? req.headers['x-participation-preview'] : 'guest'
        const path = url.pathname.replace(/^\/api\/platform/, '')
        if (url.pathname.startsWith('/api/admin-public/')) return send(publicData)
        if (path === '/auth/config') return send({ selfRegistrationEnabled: true, emailVerificationEnabled: true })
        // React StrictMode may start and cancel the initial read twice.
        if (path === '/lobby/config') {
          const retryBlocked = process.env.PARTICIPATION_RETRY_READY_PATH ? !existsSync(process.env.PARTICIPATION_RETRY_READY_PATH) : retryReads++ < 2
          return preview === 'unavailable' || (preview === 'retry' && retryBlocked) ? send({ error: 'LOCAL_PREVIEW_UNAVAILABLE' }, 503) : send({ mode: preview === 'closed' ? 'OFF' : preview === 'readonly' ? 'READ_ONLY' : 'WRITE', contactEnabled: true })
        }
        if (path === '/lobby/cards') {
          const page = Math.max(1, Number(url.searchParams.get('page')) || 1), pageSize = Math.max(1, Math.min(50, Number(url.searchParams.get('pageSize')) || 20))
          const cards = lobbyDesignCards.filter(card => card.kind === (url.searchParams.get('kind') || 'TEAM') && (!url.searchParams.get('role') || card.roles.includes(url.searchParams.get('role'))))
          return send({ cards: cards.slice((page - 1) * pageSize, page * pageSize), total: cards.length, pageSize, page })
        }
        if (path.startsWith('/lobby/cards/')) {
          const card = lobbyDesignCards.find(item => item.publicId === path.split('/').at(-1))
          return card ? send({ card }) : send({ error: 'NOT_FOUND' }, 404)
        }
        if (path === '/lobby/me') return send({ cards: [], formations: [], teams: [], organizations: [], notices: [], canWrite: false, config: { contactEnabled: true } })
        if (scenarios[preview] === 'guest' && path === '/auth/me') return send({ user: null })
        if (path === '/me/identities') {
          const types = preview === 'unlinked' ? [] : preview === 'player' ? ['PLAYER'] : ['MANAGER', 'PLAYER']
          const identities = types.map((type, index) => ({ id: `preview-${type}`, type, status: 'ACTIVE', isVerified: true, isPrimary: index === 0 }))
          return send({ userId: 'design-preview-user', identities, primaryIdentity: identities[0] || null, competitionSeasons: types.length ? [{ id: 'FCW26', name: '薯条杯周赛 · 本机示例', status: 'ACTIVE', competitionKind: 'WEEKLY', teams: [{ id: 'preview-team-banana', name: 'Team Banana', shortName: 'BANANA', roles: types }] }] : [], capabilities: { canUseCloudFavorites: true } })
        }
        if (path.endsWith('/registration/ownership-transfers')) return send({ userId: 'design-preview-user', canWrite: false, teams: [], transfers: [] })
        if (path === '/me/staff-memberships') return send({ participations: [], staff: null, forms: [], partners: [] })
        req.url = req.url.replace(/^\/api\/platform/, '/api')
        try { await fixtures.get(preview).handle(req, res) }
        catch (error) { console.error(error); if (!res.headersSent) send({ error: 'LOCAL_PREVIEW_READ_FAILED' }, 500); else res.end() }
      })
    },
    transformIndexHtml: html => html.replace('<head>', `<head>${client}`).replace('<body>', `<body>${banner}`)
  }]
})
await vite.listen()
console.log(`Participation center preview: http://127.0.0.1:${port}/play?season=FCW2026&preview=guest`)
console.log('Loopback only. Fictional accounts and event data. All API writes rejected. No proxy, database or email.')
const stop = async () => { await vite.close(); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

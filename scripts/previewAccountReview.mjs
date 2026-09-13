// Local-only review of current application routes with independent synthetic sessions.
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { createAccountReviewFixture } from './lib/accountReviewFixtureServer.mjs'
import { ACCOUNT_REVIEW_PAGES } from '../src/pages/dev/accountReviewCatalog.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const sessions = new Map()
const send = (response, data, status = 200) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(data)) }
const client = `<script>
(() => {
  const url = new URL(location.href);
  const key = 'fries-cup:account-review-session';
  const session = url.searchParams.get('reviewSession') || sessionStorage.getItem(key);
  if (!session) return;
  sessionStorage.setItem(key, session);
  const page = url.searchParams.get('reviewPage') || sessionStorage.getItem(key + ':page') || 'overview';
  sessionStorage.setItem(key + ':page', page);
  const originalFetch = window.fetch;
  window.fetch = (input, init = {}) => {
    const target = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (target.origin !== location.origin || !target.pathname.startsWith('/api/platform/')) return originalFetch(input, init);
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('x-account-review-session', session);
    return originalFetch(input, { ...init, headers });
  };
  window.addEventListener('DOMContentLoaded', () => {
    if (url.pathname === '/dev/account-review' && !url.searchParams.has('surface')) return;
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;bottom:0;right:0;z-index:1900;background:#191c18;color:#f0eee6;padding:6px 12px;font:12px/1.5 sans-serif;border-top:2px solid #edc744';
    const link = document.createElement('a');
    link.href = '/dev/account-review?page=' + encodeURIComponent(page); link.target = '_top'; link.textContent = '全部页面 ↗'; link.style.cssText = 'color:#edc744;margin-right:12px';
    bar.append(link, document.createTextNode('本机样例'));
    document.body.append(bar);
  });
})();
</script>`

const vite = await createServer({
  root,
  define: { 'import.meta.env.VITE_PLATFORM_API_BASE_URL': JSON.stringify('/api/platform'), 'import.meta.env.VITE_PREFER_LOCAL_DATA': JSON.stringify('1') },
  cacheDir: '.codex-tmp/account-review-vite-cache',
  server: { host: '127.0.0.3', port: 3047, strictPort: true, watch: { ignored: ['**/.codex-tmp/**', '**/artifacts/**', '**/tmp/**'] } },
  plugins: [{
    name: 'account-route-review',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://127.0.0.3:3047')
        if (url.pathname === '/__account-review/status') return send(res, { contract: 'ACCOUNT_DESIGN_REVIEW_V1', pages: ACCOUNT_REVIEW_PAGES.length })
        if (url.pathname.startsWith('/__account-review/open/')) {
          const page = ACCOUNT_REVIEW_PAGES.find(item => item.id === url.pathname.split('/').at(-1))
          const session = url.searchParams.get('session')
          if (!page || !/^[a-zA-Z0-9-]{8,150}$/.test(session || '')) return send(res, { error: 'INVALID_REVIEW_PAGE' }, 400)
          if (sessions.size >= 128) sessions.delete(sessions.keys().next().value)
          sessions.set(session, createAccountReviewFixture(page.scenario))
          const target = new URL(page.href, url.origin)
          target.searchParams.set('reviewSession', session)
          target.searchParams.set('reviewPage', page.id)
          if (url.searchParams.get('lang') === 'en') target.searchParams.set('lang', 'en')
          res.writeHead(303, { Location: target.pathname + target.search + target.hash, 'Cache-Control': 'no-store' }); res.end(); return
        }
        // All account reads and writes stay in the fixture handler, never in a proxy.
        if (url.pathname === '/api/platform' || url.pathname.startsWith('/api/platform/')) {
          const fixture = sessions.get(req.headers['x-account-review-session'])
          if (!fixture) {
            if (url.pathname.endsWith('/auth/config')) return send(res, { selfRegistrationEnabled: false, emailVerificationEnabled: true })
            return send(res, { error: 'REVIEW_SESSION_REQUIRED' }, 401)
          }
          req.url = req.url.replace(/^\/api\/platform/, '/api')
          fixture.handle(req, res).catch(error => { console.error(error); if (!res.headersSent) send(res, { error: 'REVIEW_FIXTURE_ERROR' }, 500); else res.end() })
          return
        }
        next()
      })
    },
    transformIndexHtml: html => html.replace('<head>', `<head>${client}`)
  }]
})
await vite.listen()
console.log(`Account page review: http://127.0.0.3:3047/dev/account-review (${ACCOUNT_REVIEW_PAGES.length} pages and states)`)
console.log('Synthetic sessions only. No real account, email or tournament writes.')
const stop = async () => { await vite.close(); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

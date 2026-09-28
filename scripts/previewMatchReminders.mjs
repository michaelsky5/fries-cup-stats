// Real local System API only, without account fixtures or a production fallback.
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const api = new URL(process.env.REMINDER_REHEARSAL_API || 'http://127.0.0.4:55449')
if (api.protocol !== 'http:' || api.hostname !== '127.0.0.4' || api.port !== '55449' || api.username || api.password) throw new Error('Use the dedicated loopback reminder rehearsal API')
const response = await fetch(new URL('/api/health', api))
if (!response.ok) throw new Error('Start the System rehearsal first')
const proxy = (prefix, targetPrefix) => ({ target: api.origin, changeOrigin: true, rewrite: value => value.replace(prefix, targetPrefix) })
const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  define: { 'import.meta.env.VITE_PLATFORM_API_BASE_URL': JSON.stringify('/api/platform'), 'import.meta.env.VITE_PREFER_LOCAL_DATA': JSON.stringify('1') },
  cacheDir: '.codex-tmp/reminder-rehearsal-vite',
  server: { host: '127.0.0.4', port: 3038, strictPort: true, proxy: {
    '/api/platform': proxy(/^\/api\/platform/, '/api'),
    '/api/admin-public': proxy(/^\/api\/admin-public/, '/api/public')
  } }
})
await server.listen()
console.log('Real API rehearsal: http://127.0.0.4:3038/account?lang=zh#reminders')
console.log('All account API requests use the disposable local System database. Mail stays in its local sink.')
const stop = async () => { await server.close(); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

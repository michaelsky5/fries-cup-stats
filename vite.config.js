import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const adminPublicProxyTarget = env.VITE_ADMIN_PUBLIC_PROXY_TARGET || 'https://admin.fries-cup.com'
  const platformProxyTarget = env.VITE_PLATFORM_API_PROXY_TARGET || 'https://admin.fries-cup.com'

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 3026,
      strictPort: true,
      proxy: {
        '/api/admin-public': {
          target: adminPublicProxyTarget,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/admin-public/, '/api/public')
        },
        '/api/platform': {
          target: platformProxyTarget,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/platform/, '/api')
        }
      }
    }
  }
})

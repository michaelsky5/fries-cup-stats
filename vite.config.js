import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/admin-public': {
        target: 'https://admin.fries-cup.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/admin-public/, '/api/public')
      }
    }
  }
})

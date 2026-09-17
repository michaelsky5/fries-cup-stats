import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { build } from 'vite'
import react from '@vitejs/plugin-react'

// Releases cannot inherit developer preview flags or ignored local env files.
for (const key of Object.keys(process.env)) if (key.startsWith('VITE_')) delete process.env[key]
process.env.VITE_PLATFORM_API_BASE_URL = '/api/platform'
await build({ configFile: false, envDir: false, plugins: [react()], build: { outDir: 'dist' } })
const sourceCommit = process.env.VERCEL_GIT_COMMIT_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
writeFileSync('dist/account-release-version.json', JSON.stringify({ sourceCommit, environment: 'production', accountOrigin: 'https://admin.fries-cup.com', builtAt: new Date().toISOString() }) + '\n')

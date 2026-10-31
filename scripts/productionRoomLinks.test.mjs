import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { configureProductionBrowserEnv, PRODUCTION_SYSTEM_APP_URL } from './lib/productionBrowserEnv.mjs'
import { checkProductionRoomLinks } from './lib/checkProductionRoomLinks.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

test('production restores the real System entry while removing inherited preview flags', () => {
  const env = { KEEP: 'yes', VITE_PARTNER_TRIAL: '1', VITE_SYSTEM_APP_URL: 'https://preview.example.test', VITE_PLATFORM_API_BASE_URL: 'https://preview.example.test/api' }
  configureProductionBrowserEnv(env)
  assert.deepEqual(env, { KEEP: 'yes', VITE_PLATFORM_API_BASE_URL: '/api/platform', VITE_SYSTEM_APP_URL: PRODUCTION_SYSTEM_APP_URL })
})

test('built browser report/review/broadcast links work, and missing or wrong production config stops release', async () => {
  const original = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('VITE_')))
  try {
    configureProductionBrowserEnv()
    assert.equal((await checkProductionRoomLinks(root)).reportAndReview, true)
    delete process.env.VITE_SYSTEM_APP_URL
    await assert.rejects(checkProductionRoomLinks(root), /Production battle report\/review entry/)
    process.env.VITE_SYSTEM_APP_URL = 'https://preview.example.test'
    await assert.rejects(checkProductionRoomLinks(root), /Production battle report\/review entry/)
  } finally {
    for (const key of Object.keys(process.env)) if (key.startsWith('VITE_')) delete process.env[key]
    Object.assign(process.env, original)
  }
})

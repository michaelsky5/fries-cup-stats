export const PRODUCTION_SYSTEM_APP_URL = 'https://admin.fries-cup.com'

export function configureProductionBrowserEnv(env = process.env) {
  for (const key of Object.keys(env)) if (key.startsWith('VITE_')) delete env[key]
  env.VITE_PLATFORM_API_BASE_URL = '/api/platform'
  env.VITE_SYSTEM_APP_URL = PRODUCTION_SYSTEM_APP_URL
}

import { getPlatformApiUrl } from '../auth/platformApi.js'

export function accountAvatarSource(value, thumbnail = false) {
  const url = String(value || '')
  if (/^\/api\/media\/avatars\/[a-f0-9]{24}\/[a-f0-9]{32}-(256|96)\.webp$/.test(url)) {
    return getPlatformApiUrl(url.replace('/api/', '/').replace(/-(256|96)\.webp$/, thumbnail ? '-96.webp' : '-256.webp'))
  }
  if (/^\/heroes\/(tank|damage|support)\/[a-z0-9_]+\.png$/.test(url)) return url
  if (/^data:image\/(png|webp);base64,/.test(url)) return url
  try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? url : '' } catch { return '' }
}

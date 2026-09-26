export function roomBroadcastUrl(path, base = import.meta.env?.VITE_SYSTEM_APP_URL) {
  if (!base || !/^\/api\/weekly-broadcast\/[A-Za-z0-9_-]+$/.test(path || '')) return ''
  try {
    const origin = new URL(base), url = new URL(path, origin)
    return ['https:', 'http:'].includes(origin.protocol) && !origin.username && !origin.password && url.origin === origin.origin ? url.href : ''
  } catch { return '' }
}

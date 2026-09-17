export function systemPageUrl(path, base = import.meta.env?.VITE_SYSTEM_APP_URL) {
  if (!base || !/^\/(submit|match-workbench)\//.test(path || '')) return ''
  try {
    const origin = new URL(base), url = new URL(path, origin)
    return ['http:', 'https:'].includes(origin.protocol) && !origin.username && !origin.password && url.origin === origin.origin ? url.href : ''
  } catch { return '' }
}

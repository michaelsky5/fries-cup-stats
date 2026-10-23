export function retryAfterMillis(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const text = value.trim()
  const delay = /^\d+$/.test(text) ? Number(text) * 1000 : Date.parse(text) - now
  return Number.isFinite(delay) ? Math.min(2147483647, Math.max(0, delay)) : undefined
}

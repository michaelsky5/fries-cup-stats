const SCENE = /^[A-Za-z0-9_-]{16,32}$/
export function readWebLoginScene(value) {
  try { const id = decodeURIComponent(String(value || '')); return SCENE.test(id) ? id : '' } catch { return '' }
}
export function normalizeWebLoginReview(value, now = Date.now()) {
  const states = ['SCANNED','BINDING','CONFIRMED','DENIED','EXPIRED']
  if (!states.includes(value?.status)) throw new Error('无法核对登录请求，请在电脑上刷新二维码。')
  const createdAt = Date.parse(value.createdAt), expiresAt = Date.parse(value.expiresAt), serverNow = Date.parse(value.serverNow)
  if (![createdAt,expiresAt,serverNow].every(Number.isFinite) || expiresAt - createdAt !== 120000) throw new Error('登录请求时间无效，请重新扫码。')
  const text = (field, fallback) => typeof value[field] === 'string' && value[field].length > 0 && value[field].length <= 80 ? value[field] : fallback
  return { status: value.status, browser: text('browser','未知浏览器'), system: text('system','未知系统'), region: text('region','地区暂不可用'),
    createdAt, expiresAt, deadline: now + Math.max(0, Math.min(120000, expiresAt - serverNow)) }
}

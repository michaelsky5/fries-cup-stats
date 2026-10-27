import { getPlatformApiUrl, platformRequest } from './platformApi.js'

// 小程序扫码登录（网页端）。System 负责票据、小程序码和会话；这里只建票、轮询和展示状态。
// 票据和本浏览器绑定（System 设置的 HttpOnly Cookie），确认后由同一次轮询响应写入网页登录 Cookie。
export const WECHAT_QR_STATUSES = Object.freeze(['PENDING', 'SCANNED', 'BINDING', 'CONFIRMED', 'DENIED', 'EXPIRED'])
export const WECHAT_QR_DEFAULT_POLL_MS = 2000

const TICKET_ID = /^[A-Za-z0-9_-]{16,32}$/

function assertTicketId(ticketId) {
  if (!TICKET_ID.test(String(ticketId || ''))) throw new Error('扫码登录票据无效，请刷新二维码。')
  return ticketId
}

// 只认可 System 的小程序 URL Link，其他地址一律不当作可打开的链接。
function safeAppLink(value) {
  try {
    const url = new URL(String(value || ''))
    return url.protocol === 'https:' && ['wxaurl.cn', 'www.wxaurl.cn'].includes(url.hostname) ? url.href : ''
  } catch {
    return ''
  }
}

export function normalizeWechatQrTicket(data, now = Date.now()) {
  const ticketId = assertTicketId(data?.ticketId)
  const expiresAt = Date.parse(data?.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) throw new Error('扫码登录票据已过期，请刷新二维码。')
  const pollAfterMs = Number.isInteger(data?.pollAfterMs) && data.pollAfterMs >= 1000 && data.pollAfterMs <= 10000 ? data.pollAfterMs : WECHAT_QR_DEFAULT_POLL_MS
  return { ticketId, expiresAt, pollAfterMs, codeUrl: getPlatformApiUrl(`/auth/wechat-qr/${encodeURIComponent(ticketId)}/code`), appLink: safeAppLink(data?.appLink) }
}

export function normalizeWechatQrStatus(data) {
  const status = WECHAT_QR_STATUSES.includes(data?.status) ? data.status : null
  if (!status) throw new Error('扫码登录状态无法识别，请刷新二维码。')
  return { status, user: status === 'CONFIRMED' && data?.user?.id ? data.user : null }
}

export async function createWechatQrTicket(options = {}) {
  const data = await platformRequest('/auth/wechat-qr', { method: 'POST', body: {}, ...options })
  return normalizeWechatQrTicket(data)
}

export async function readWechatQrTicket(ticketId, options = {}) {
  const data = await platformRequest(`/auth/wechat-qr/${encodeURIComponent(assertTicketId(ticketId))}`, options)
  return normalizeWechatQrStatus(data)
}

// 关闭对话框时尽力作废票据；失败不影响页面，票据也会自行过期。
export async function cancelWechatQrTicket(ticketId) {
  try {
    await platformRequest(`/auth/wechat-qr/${encodeURIComponent(assertTicketId(ticketId))}`, { method: 'DELETE', timeoutMs: 5000 })
  } catch {
    // Expiry covers a lost cancel.
  }
}

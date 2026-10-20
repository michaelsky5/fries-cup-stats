import { lobbyText as t } from './lobbyCopy.js'
import { getActiveLocale } from '../../lib/locales.js'
export const LOBBY_ROLES = [{ value: 'TANK', label: '重装' }, { value: 'DPS', label: '输出' }, { value: 'SUP', label: '支援' }]
export const roleLabel = role => t(LOBBY_ROLES.find(item => item.value === role)?.label || role)
export const statusLabel = state => ({ ACTIVE: t("展示中"), CLOSED: t("已关闭"), EXPIRED: t("已到期"), HIDDEN: t("管理员隐藏"), PENDING: t("待核对"), RETURNED: t("退回修改"), APPROVED: t("核对通过"), REJECTED: t("未通过"), WITHDRAWN: t("已撤回") })[state] || state
export const lobbyDate = value => new Intl.DateTimeFormat(getActiveLocale(), { timeZone: 'Asia/Singapore', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) + ' (UTC+8)'
export function safeLobbyReturn(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || Array.from(value).some(character => character.charCodeAt(0) <= 32)) return '/lobby'
  const url = new URL(value, 'https://lobby.invalid')
  if (url.origin !== 'https://lobby.invalid' || !/^\/lobby(?:\/|$)/.test(url.pathname)) return '/lobby'
  const query = new URLSearchParams()
  for (const key of ['type', 'role', 'page', 'tab', 'contactPage', 'lang']) if (url.searchParams.has(key)) query.set(key, url.searchParams.get(key))
  const requestId = url.searchParams.get('requestId')
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId || '')) query.set('requestId', requestId)
  return url.pathname + (query.size ? `?${query}` : '')
}
export function leavesLobbyPage(current, next) {
  const withoutLanguage = location => {
    const query = new URLSearchParams(location.search)
    query.delete('lang'); query.sort()
    return location.pathname + '?' + query + (location.hash || '')
  }
  return withoutLanguage(current) !== withoutLanguage(next)
}
export function accountFailure(error) {
  const messages = { USER_EXISTS: t("这个邮箱已注册，请登录或找回原账号。"), USERNAME_EXISTS: t("用户名已被使用，请换一个。"), INVALID_USERNAME: t("用户名需为 2—24 位字母、数字、下划线、短横线或点。"), INVALID_CREDENTIALS: t("邮箱或密码不正确。"), REGISTRATION_DISABLED: t("普通注册暂未开放，已有账号仍可登录。"), RATE_LIMITED: t("操作较频繁，请按提示稍后重试。") }
  if (error.data?.outcomeUnknown || error.name === 'TypeError') return t("暂时无法确认处理结果。请先查看账号或本人记录，再决定是否重试。")
  return messages[error.data?.error] || error.message || t("请求未完成，请稍后重试。")
}

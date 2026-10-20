export const LOBBY_ROLES = [{ value: 'TANK', label: '重装' }, { value: 'DPS', label: '输出' }, { value: 'SUP', label: '支援' }]
export const roleLabel = role => LOBBY_ROLES.find(item => item.value === role)?.label || role
export const statusLabel = state => ({ ACTIVE: '展示中', CLOSED: '已关闭', EXPIRED: '已到期', HIDDEN: '管理员隐藏', PENDING: '待核对', RETURNED: '退回修改', APPROVED: '核对通过', REJECTED: '未通过', WITHDRAWN: '已撤回' })[state] || state
export const lobbyDate = value => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Singapore', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) + ' (UTC+8)'
export function safeLobbyReturn(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || Array.from(value).some(character => character.charCodeAt(0) <= 32)) return '/lobby'
  const url = new URL(value, 'https://lobby.invalid')
  if (url.origin !== 'https://lobby.invalid' || !/^\/lobby(?:\/|$)/.test(url.pathname)) return '/lobby'
  const query = new URLSearchParams()
  for (const key of ['type', 'role', 'page', 'tab']) if (url.searchParams.has(key)) query.set(key, url.searchParams.get(key))
  return url.pathname + (query.size ? `?${query}` : '')
}
export function accountFailure(error) {
  const messages = { USER_EXISTS: '这个邮箱已注册，请登录或找回原账号。', USERNAME_EXISTS: '用户名已被使用，请换一个。', INVALID_USERNAME: '用户名需为 2—24 位字母、数字、下划线、短横线或点。', INVALID_CREDENTIALS: '邮箱或密码不正确。', REGISTRATION_DISABLED: '普通注册暂未开放，已有账号仍可登录。', RATE_LIMITED: '操作较频繁，请按提示稍后重试。' }
  if (error.data?.outcomeUnknown || error.name === 'TypeError') return '暂时无法确认处理结果。请先查看账号或本人记录，再决定是否重试。'
  return messages[error.data?.error] || error.message || '请求未完成，请稍后重试。'
}

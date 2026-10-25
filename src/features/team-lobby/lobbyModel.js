import { lobbyText as t } from './lobbyCopy.js'
import { getActiveLocale } from '../../lib/locales.js'
import { passwordPolicyHint } from '../auth/passwordPolicy.js'
export const LOBBY_ROLES = [{ value: 'TANK', label: '重装' }, { value: 'DPS', label: '输出' }, { value: 'SUP', label: '支援' }]
export const roleLabel = role => t(LOBBY_ROLES.find(item => item.value === role)?.label || role)
export const statusLabel = state => ({ ACTIVE: t("展示中"), CLOSED: t("已关闭"), EXPIRED: t("已到期"), HIDDEN: t("管理员隐藏"), PENDING: t("待核对"), RETURNED: t("退回修改"), APPROVED: t("核对通过"), REJECTED: t("未通过"), WITHDRAWN: t("已撤回") })[state] || state
export const lobbyDate = value => new Intl.DateTimeFormat(getActiveLocale(), { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) + ' (UTC+8)'
export const needsLabel = needs => (needs || []).map(item => t('{0} {1} 人', [roleLabel(item.role), item.count])).join(' · ')

// Stored card keys stay bio, level and heroes so existing cards still render.
// Only the wording depends on the post: a team states what it needs from new
// players, while a player describes themself and the team they want.
export function lobbyCardCopy(kind, locale = getActiveLocale()) {
  const team = kind === 'TEAM', say = source => t(source, [], locale)
  return {
    availability: say("可赛／训练时间（北京时间）"),
    bio: say(team ? "队伍介绍与招募要求" : "自我介绍与期望"),
    bioHint: say(team ? "写清队伍现状，以及对新队员的要求（段位、位置、能否开麦、出勤）。请勿填写 QQ、微信、邮箱或群号；对方可通过“申请联系”找到你。" : "介绍你的打法和沟通习惯，以及希望加入什么样的队伍。请勿填写 QQ、微信、邮箱或群号。"),
    bioPlaceholder: say(team ? "队伍现状：例如 4 人固定，常打周赛\n希望你：例如 钻石以上，能开麦，周三、周五晚有空\n我们提供：例如 固定训练与复盘" : "打法与沟通：例如 主玩支援，能开麦\n希望加入：例如 每周固定训练两次的队伍"),
    level: say(team ? "段位要求（可选）" : "段位（可选）"),
    levelPlaceholder: say(team ? "例如：钻石 1 以上；主坦大师优先" : "例如：重装 大师 3，支援 钻石 1"),
    heroes: say(team ? "希望会玩的英雄（可选）" : "常用英雄（可选）"),
    heroesPlaceholder: say(team ? "例如：主坦 温斯顿、D.Va；副辅 雾子" : "例如：安娜、雾子、巴蒂斯特"),
    levelLabel: say(team ? "段位要求" : "段位"),
    // A team's requirement is not a claim about anyone's verified rank.
    levelNote: team ? '' : say("（非官方认证）"),
    heroesLabel: say(team ? "希望会玩的英雄" : "常用英雄")
  }
}
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
  const quotaCode = error.data?.error || error.data?.code
  if (quotaCode === 'PASSWORD_POLICY') return passwordPolicyHint(getActiveLocale())
  if (['REGISTRATION_CAPACITY_REACHED', 'EMAIL_QUOTA_RESERVED'].includes(quotaCode)) {
    const message = quotaCode === 'REGISTRATION_CAPACITY_REACHED'
      ? t("本批注册名额已用完，已有账号仍可登录。")
      : t("邮件额度暂时不足，请稍后重试。")
    const seconds = Number(error.data?.retryAfter)
    return Number.isFinite(seconds) && seconds > 0 && seconds <= 32 * 86400
      ? message + ' ' + t("可于 {0} 后重试。", [lobbyDate(Date.now() + seconds * 1000)]) : message
  }
  const messages = { USER_EXISTS: t("这个邮箱已注册，请登录或找回原账号。"), USERNAME_EXISTS: t("用户名已被使用，请换一个。"), INVALID_USERNAME: t("用户名需为 2—24 位字母、数字、下划线、短横线或点。"), INVALID_CREDENTIALS: t("邮箱或密码不正确。"), REGISTRATION_DISABLED: t("普通注册暂未开放，已有账号仍可登录。"), RATE_LIMITED: t("操作较频繁，请按提示稍后重试。") }
  if (error.data?.outcomeUnknown || error.name === 'TypeError') return t("暂时无法确认处理结果。请先查看账号或本人记录，再决定是否重试。")
  return messages[error.data?.error] || error.message || t("请求未完成，请稍后重试。")
}

export function lobbyReadFailure(error) {
  if (error?.data?.error === 'LOBBY_OFF') return t("组队大厅暂未开放")
  // Initial discovery must not expose upstream routing or infrastructure errors.
  // A failed read also must not imply that an account write may have occurred.
  return t("组队大厅暂时无法读取，请稍后重试。已有记录会保留。")
}

export function canPublishLobby(config, error) {
  return config?.mode === 'WRITE' && !error
}

export function lobbyRegistrationMessage(config) {
  if (config?.selfRegistrationEnabled === true) return t("新人可以自行注册，无需先入队或报名。")
  if (config?.selfRegistrationEnabled === false) return t("普通注册暂未开放，已有账号仍可登录。")
  return null
}

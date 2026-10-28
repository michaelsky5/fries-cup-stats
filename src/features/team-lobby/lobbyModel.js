import { lobbyText as t, hasLobbyCopy } from './lobbyCopy.js'
import { getActiveLocale, normalizeLocale } from '../../lib/locales.js'
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
// Server codes shown in our own words. Keys are copy sources in lobbyCopy.js.
export const ERROR_COPY = {
  USER_EXISTS: "这个邮箱已注册，请登录或找回原账号。", USERNAME_EXISTS: "用户名已被使用，请换一个。",
  INVALID_USERNAME: "用户名需为 2—24 位字母、数字、下划线、短横线或点。", INVALID_CREDENTIALS: "邮箱或密码不正确。",
  REGISTRATION_DISABLED: "普通注册暂未开放，已有账号仍可登录。",
  LOBBY_OFF: "组队大厅暂未开放", LOBBY_READ_ONLY: "大厅当前只读，可以浏览需求和管理已有联系。", LOBBY_CONTACT_OFF: "联系功能当前不可操作，已有记录仍保留。",
  EMAIL_VERIFICATION_REQUIRED: "请先验证本人邮箱。", ACCOUNT_CHANGED: "账号状态已变化，请重新登录。", UNAUTHORIZED: "登录状态已失效，请重新登录。",
  LOBBY_FORBIDDEN: "当前账号没有此操作权限。", LOBBY_CONFLICT: "记录或有效名额已变化，请刷新本人记录后核对，不要重复创建。",
  LOBBY_UNAVAILABLE: "暂时无法完成处理，请先查看本人记录后再重试。",
  CARD_UNAVAILABLE: "这张卡片已下线或暂不可用。", CARD_CHANGED: "卡片已变化，请刷新本人记录后核对。", CARD_HIDDEN: "管理员隐藏的卡片不能自行恢复。",
  NOT_FOUND: "没有找到这条记录，请刷新后核对。", OPERATION_CONFLICT: "这次提交已失效，请刷新后重新操作。", APPLICATION_CHANGED: "申请状态已变化，请刷新后核对。",
  FORMATION_LIMIT: "你已有一份有效筹建申请或招募，请先处理已有需求。", FORMATION_APPROVAL_REQUIRED: "筹建申请尚未通过核对。",
  TEAM_AUTHORITY_CHANGED: "队伍负责人已变化。", TEAM_AUTHORITY_REQUIRED: "只有当前队伍负责人可以代表队伍操作。",
  PRIVATE_CONTACT_IN_PUBLIC_TEXT: "队伍名称包含私人联系方式，请先修正队伍资料。",
  CONTACT_SELF: "不能向本人发送联系请求。", CONTACT_UNAVAILABLE: "对方当前不能使用大厅联系。", CONTACT_ACTION_FORBIDDEN: "当前身份或状态不能执行此操作。",
  CONSENT_REQUIRED: "愿意联系时需填写并授权本人的本次 QQ。", CONTACT_CHANGED: "联系状态或授权已变化，请重新读取本人记录。",
  CONTACT_NOT_AUTHORIZED: "双方尚未授权，或本次联系已结束。",
  RATE_LIMIT_CAPACITY: "服务繁忙，请稍后重试。", AUTH_RATE_LIMIT_UNAVAILABLE: "服务繁忙，请稍后重试。", REQUEST_TIMEOUT: "读取超时，请检查网络后重试。"
}
export const FIELD_COPY = { title: "公开显示名称", name: "筹建队名", availability: "可赛／训练时间（北京时间）", goal: "组队目标", bio: "介绍", level: "段位", heroes: "英雄",
  message: "简短留言", qq: "本次联系 QQ", roles: "岗位", needs: "所需岗位与人数", email: "邮箱", username: "用户名", password: "密码" }
function invalidInput(data) {
  const issue = Array.isArray(data?.issues) ? data.issues[0] : null
  const field = FIELD_COPY[issue?.path?.[0]]
  if (!field) return t("提交的内容未通过检查，请修改后重试。")
  if (issue.code === 'too_small' && issue.origin === 'string') return t("请填写「{0}」，不能只输入空格。", [t(field)])
  if (issue.code === 'too_big' && issue.origin === 'string') return t("「{0}」超出长度上限，请删减后重试。", [t(field)])
  return t("请检查「{0}」后重试。", [t(field)])
}

export function accountFailure(error) {
  // A non-JSON body (an HTML gateway page, for example) is never shown.
  const data = error?.data && typeof error.data === 'object' ? error.data : null
  const code = data?.error || data?.code, message = typeof data?.message === 'string' ? data.message : ''
  if (code === 'PASSWORD_POLICY') return passwordPolicyHint(getActiveLocale())
  if (['REGISTRATION_CAPACITY_REACHED', 'EMAIL_QUOTA_RESERVED'].includes(code)) {
    const notice = code === 'REGISTRATION_CAPACITY_REACHED'
      ? t("本批注册名额已用完，已有账号仍可登录。")
      : t("邮件额度暂时不足，请稍后重试。")
    const seconds = Number(data?.retryAfter)
    return Number.isFinite(seconds) && seconds > 0 && seconds <= 32 * 86400
      ? notice + ' ' + t("可于 {0} 后重试。", [lobbyDate(Date.now() + seconds * 1000)]) : notice
  }
  if (data?.outcomeUnknown || error?.name === 'TypeError') return t("暂时无法确认处理结果。请先查看账号或本人记录，再决定是否重试。")
  if (code === 'RATE_LIMITED') {
    const minutes = Math.ceil(Number(error?.retryAfterMs) / 60000)
    return minutes > 0 && minutes <= 24 * 60 ? t("操作较频繁，请约 {0} 分钟后重试。", [minutes]) : t("操作较频繁，请稍后重试。")
  }
  // The restriction reason is written by staff and is shown as written.
  if (code === 'LOBBY_RESTRICTED') return message && message !== '大厅操作暂受限制。' ? t("大厅操作暂受限制：{0}", [message]) : t("大厅操作暂受限制。")
  if (message && hasLobbyCopy(message)) return t(message)
  if (code === 'INVALID_INPUT') return invalidInput(data)
  if (ERROR_COPY[code]) return t(ERROR_COPY[code])
  if (error?.status === 401) return t(ERROR_COPY.UNAUTHORIZED)
  // Local validation errors already carry translated copy and no response.
  if (!error?.status && !data && error?.message) return error.message
  if (message && /[一-鿿]/.test(message) && normalizeLocale(getActiveLocale()) === 'zh-CN') return message
  return t("请求未完成，请稍后重试。")
}

export function lobbyReadFailure(error) {
  const code = error?.data?.error
  if (code === 'LOBBY_OFF') return t("组队大厅暂未开放")
  if (code === 'CARD_UNAVAILABLE') return t(ERROR_COPY.CARD_UNAVAILABLE)
  if (code === 'NOT_FOUND') return t(ERROR_COPY.NOT_FOUND)
  if (error?.status === 401 || code === 'ACCOUNT_CHANGED') return t(ERROR_COPY.UNAUTHORIZED)
  // Initial discovery must not expose upstream routing or infrastructure errors.
  // A failed read also must not imply that an account write may have occurred.
  return t("组队大厅暂时无法读取，请稍后重试。已有记录会保留。")
}
export const retryableRead = error => !['LOBBY_OFF', 'CARD_UNAVAILABLE', 'NOT_FOUND'].includes(error?.data?.error)
// Only an uncertain outcome sends people to their records before retrying.
export const uncertainWrite = error => Boolean(error?.data?.outcomeUnknown) || error?.name === 'TypeError'
  || ['LOBBY_CONFLICT', 'CONTACT_CHANGED', 'OPERATION_CONFLICT'].includes(error?.data?.error)

export function canPublishLobby(config, error) {
  return config?.mode === 'WRITE' && !error
}

export function lobbyRegistrationMessage(config) {
  if (config?.selfRegistrationEnabled === true) return t("新人可以自行注册，无需先入队或报名。")
  if (config?.selfRegistrationEnabled === false) return t("普通注册暂未开放，已有账号仍可登录。")
  return null
}

export const contactStatus = value => ({ PENDING: t("待回应"), CONNECTED: t("联系中"), DECLINED: t("暂不联系"), WITHDRAWN: t("已撤回"), ENDED: t("已结束"), EXPIRED: t("已到期") })[value] || value
// Expiry and declines read differently for the person who let a request lapse
// or declined it (received) and for the person who sent it.
export const contactReason = (value, received = false) => ({ AUTHORITY_CHANGED: t("账号、负责人或大厅权限已变化，请重新申请联系。"), CARD_UNAVAILABLE: t("原需求已关闭、到期或被隐藏。"),
  QQ_SETTINGS_CHANGED: t('QQ 设置已变化，请重新发起查看请求。'),
  REQUEST_EXPIRED: received ? t("你没有在有效期内回应，请求已到期。") : t("对方未在有效期内回应。"), CONSENT_REVOKED: t("一方已撤销本次 QQ 授权。"), ENDED_BY_PARTY: t("一方已结束联系。"),
  DECLINED: received ? t("你已选择暂不联系。") : t("对方暂不联系。"), WITHDRAWN: t("发起人已撤回。") })[value] || ''
// A person and a team share one open contact, so sending can return an existing
// one: the other side's request waiting for this person, or an earlier own one.
export function contactResultKind(result, sentMessage = '') {
  if (result?.status === 'CONNECTED') return 'CONNECTED'
  if (result?.received) return 'AWAITING_YOU'
  if (typeof result?.message === 'string' && result.message !== String(sentMessage).trim()) return 'EXISTING'
  return 'SENT'
}

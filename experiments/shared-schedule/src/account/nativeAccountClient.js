const MAX_SESSION_MS = 12 * 60 * 60 * 1000
const SAFE_READ = new Set(['/me', '/participation', '/weekly/workspace'])
const SAFE_WRITE = /^\/weekly\/(?:weeks\/[A-Za-z0-9_-]{1,128}\/participation|participations\/[A-Za-z0-9_-]{1,128}\/roster)$/
const fault = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra })
const stale = () => fault('STALE_REQUEST', '账号状态已变化，请重新读取。')

// This transport intentionally has no URL/header diagnostics. A native failure
// may include credentials or an upstream response in its original error object.
function withDeadline(invoke, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    let task, settled = false
    const finish = (fn, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn(value)
    }
    const fail = () => finish(reject, fault('CONNECTION_UNAVAILABLE', '暂时无法连接，请检查网络后重试。', { outcomeUnknown: options.method && options.method !== 'GET' }))
    const timer = setTimeout(() => {
      finish(reject, fault('REQUEST_TIMEOUT', '连接超时，请先核对当前状态后再重试。', { outcomeUnknown: options.method && options.method !== 'GET' }))
      try { task?.abort?.() } catch { /* The deadline has already settled. */ }
    }, timeoutMs)
    try {
      task = invoke({ ...options, timeout: timeoutMs, success: value => finish(resolve, value), fail })
      if (typeof task?.then === 'function') task.then(value => finish(resolve, value), fail)
    } catch { fail() }
  })
}

function publicUser(user) {
  if (!user || typeof user.id !== 'string' || !user.id || typeof user.displayName !== 'string'
    || user.emailVerified !== true || !['PLAYER', 'ADMIN', 'VIEWER', 'OPERATOR', 'GUEST', 'REFEREE', 'TEAM'].includes(user.effectiveMode)) return null
  return { id: user.id, displayName: user.displayName, emailVerified: true, effectiveMode: user.effectiveMode }
}

export function createNativeAccountClient({ request, login, storage, origin = 'https://admin.fries-cup.com', now = () => Date.now(), timeoutMs = 15000 }) {
  const endpoint = String(origin).replace(/\/+$/, '') + '/api/mini/v1'
  if (!/^https:\/\/[^/?#]+\/api\/mini\/v1$/.test(endpoint) && !/^http:\/\/127\.0\.0\.1:\d+\/api\/mini\/v1$/.test(endpoint)) throw new Error('Invalid native API origin')
  const storageKey = 'fc:wechat-session:v1:' + endpoint
  const listeners = new Set(), privateCache = new Map()
  let epoch = 0, session = null, ticket = null, pendingLogin = null
  let state = { status: 'SIGNED_OUT', user: null }
  const publish = () => listeners.forEach(listener => listener({ ...state }))
  const save = value => { try { value ? storage.set(storageKey, value) : storage.remove(storageKey) } catch { /* Login remains usable in memory. */ } }
  function clear() {
    epoch += 1
    session = null
    ticket = null
    privateCache.clear()
    save(null)
    state = { status: 'SIGNED_OUT', user: null }
    publish()
  }
  function validSession(value) {
    const expires = Date.parse(value?.session?.expiresAt), user = publicUser(value?.user)
    return user && typeof value.accessToken === 'string' && /^[A-Za-z0-9_.-]{20,8192}$/.test(value.accessToken)
      && expires > now() && expires <= now() + MAX_SESSION_MS + 5000
      ? { accessToken: value.accessToken, session: { id: value.session.id, expiresAt: value.session.expiresAt }, user } : null
  }
  try {
    session = validSession(storage.get(storageKey))
    if (session) state = { status: 'RESTORING', user: null }
    else save(null)
  } catch { save(null) }
  async function send(path, { method = 'GET', body, token } = {}) {
    const response = await withDeadline(request, {
      url: endpoint + path, method, dataType: 'json',
      header: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body === undefined ? {} : { data: body })
    }, timeoutMs)
    const status = Number(response?.statusCode), data = response?.data
    if (!(status >= 200 && status < 300)) {
      const code = typeof data?.error === 'string' ? data.error : 'SERVICE_UNAVAILABLE'
      const messages = {
        FEATURE_UNAVAILABLE: '微信登录内测尚未开启，请稍后再来。',
        WECHAT_CODE_INVALID: '微信凭证已失效，请重新微信登录。',
        INVALID_CREDENTIALS: '账号或密码不正确，请核对原账号。',
        EMAIL_VERIFICATION_REQUIRED: '请先在网页账号中完成邮箱验证，再重新微信登录。',
        PASSWORD_CHANGE_REQUIRED: '请先在网页账号中升级密码，再重新微信登录。',
        ACCOUNT_WECHAT_CONFLICT: '此账号已关联其他微信，请先在网页账号设置中解绑。',
        WECHAT_BINDING_CONFLICT: '此微信已关联其他账号，请核对原账号。',
        BINDING_TICKET_INVALID: '绑定凭证已失效，请重新微信登录。',
        ACCOUNT_CREDENTIALS_CHANGED: '账号凭据已变化，请重新开始绑定。'
      }
      const retryAfter = Number(response?.header?.['retry-after'] || response?.header?.['Retry-After'])
      const weeklyMessages = {
        WEEKLY_REVISION_CONFLICT: '资料已更新，本次操作未保存，请刷新核对。',
        WEEKLY_WRITE_CONFLICT: '资料正在变化，请刷新后重新核对。',
        WEEKLY_TEAM_ACCESS_FORBIDDEN: '你没有此队伍的管理权限，请核对当前身份。',
        ACCOUNT_FEATURE_READ_ONLY: '当前参赛入口为只读。',
        WEEKLY_CONFIRMATION_CLOSED: '本周确认窗口已关闭。',
        WEEKLY_ROSTER_LOCKED: '名单已锁定，如需调整请联系赛管。',
        WEEKLY_ROSTER_LOCK_FORBIDDEN: '正式名单由赛管或系统审核锁定。',
        WEEKLY_ROSTER_NOT_CONFIRMED: '请先确认本周参赛。',
        WEEKLY_PARTICIPATION_NOT_CONFIRMED: '请先确认本周参赛。',
        WEEKLY_ROSTER_COUNT_INVALID: '名单人数不符合当前要求。',
        WEEKLY_ROSTER_CONTINUITY_REQUIRED: '名单未满足继承要求，请核对保留选手。',
        WEEKLY_ROSTER_CORE_REQUIRED: '名单未满足已锁定核心选手要求。',
        WEEKLY_ROSTER_HISTORY_MISSING: '历史正式名单缺失，请联系赛管核对。',
        INVALID_AVAILABILITY: '可比赛时段已变化，请刷新后重新选择。'
      }
      throw fault(code, status === 401 && token ? '登录已失效，请重新微信登录。'
        : status === 429 ? '操作较频繁，请稍后重试。' : messages[code] || '服务暂不可用，请稍后重试。',
      { status, outcomeUnknown: method !== 'GET' && status >= 500,
        ...(weeklyMessages[code] ? { message: weeklyMessages[code] } : {}),
        retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 900) * 1000 : 0 })
    }
    if (status !== 204 && (!data || typeof data !== 'object' || Array.isArray(data))) throw fault('INVALID_RESPONSE', '服务响应不完整，请重新读取。')
    return data
  }
  function install(value, expected) {
    if (expected !== epoch) throw stale()
    const next = validSession(value)
    if (!next) throw fault('INVALID_RESPONSE', '登录响应不完整，请重新微信登录。')
    session = next
    ticket = null
    privateCache.clear()
    save(next)
    state = { status: 'AUTHENTICATED', user: next.user }
    publish()
    return state
  }
  async function guarded(path, options = {}) {
    if (!session || Date.parse(session.session.expiresAt) <= now()) { clear(); throw fault('UNAUTHORIZED', '登录已失效，请重新微信登录。', { status: 401 }) }
    const expected = epoch, token = session.accessToken
    try {
      const value = await send(path, { ...options, token })
      if (expected !== epoch || token !== session?.accessToken) throw stale()
      return value
    } catch (error) {
      if (expected !== epoch || token !== session?.accessToken) throw stale()
      if (error.status === 401) clear()
      throw error
    }
  }
  return {
    snapshot: () => ({ ...state }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    capabilities: () => send('/capabilities'),
    async webLogin(action, ticketId) {
      if (!['scan','confirm','deny'].includes(action) || !/^[A-Za-z0-9_-]{16,32}$/.test(ticketId || '')) throw fault('INVALID_ROUTE', '登录二维码无效，请在电脑上刷新后重试。');
      const expected = epoch;
      const route = `/web-login/${ticketId}/${action}`;
      const value = session ? await guarded(route, { method: 'POST', body: {} })
        : action !== 'confirm' && ticket && Date.parse(ticket.expiresAt) > now()
          ? await send(route, { method: 'POST', body: { bindingTicket: ticket.value } })
          : (() => { throw fault('UNAUTHORIZED', '请先微信登录并关联薯条杯账号。'); })();
      if (expected !== epoch) throw stale();
      return value;
    },
    async restore() {
      if (!session) return state
      const expected = epoch
      const value = await guarded('/me')
      if (expected !== epoch) throw stale()
      const next = { ...session, session: value.session, user: value.user }
      if (session.user.id !== value.user?.id || session.user.effectiveMode !== value.user?.effectiveMode) { epoch += 1; privateCache.clear() }
      return install(next, epoch)
    },
    beginLogin() {
      if (pendingLogin) return pendingLogin
      clear()
      const expected = epoch
      state = { status: 'CONNECTING', user: null }
      publish()
      const operation = (async () => {
        const proof = await withDeadline(login, {}, timeoutMs)
        if (expected !== epoch) throw stale()
        if (typeof proof?.code !== 'string' || !proof.code) throw fault('WECHAT_LOGIN_FAILED', '微信登录未完成，请重新尝试。')
        const value = await send('/auth/wechat/login', { method: 'POST', body: { code: proof.code } })
        if (expected !== epoch) throw stale()
        if (value.status === 'AUTHENTICATED') return install(value, expected)
        if (value.status !== 'BINDING_REQUIRED' || typeof value.bindingTicket !== 'string'
          || Date.parse(value.expiresAt) <= now() || Date.parse(value.expiresAt) > now() + 305000) throw fault('INVALID_RESPONSE', '登录响应不完整，请重新微信登录。')
        ticket = { value: value.bindingTicket, expiresAt: value.expiresAt }
        state = { status: 'BINDING_REQUIRED', user: null }
        publish()
        return state
      })().catch(error => {
        if (expected === epoch) { state = { status: 'SIGNED_OUT', user: null }; publish() }
        throw error
      })
      pendingLogin = operation
      operation.finally(() => { if (pendingLogin === operation) pendingLogin = null }).catch(() => {})
      return operation
    },
    async bind(email, password) {
      if (!ticket || Date.parse(ticket.expiresAt) <= now()) { clear(); throw fault('BINDING_TICKET_INVALID', '绑定凭证已失效，请重新微信登录。') }
      const expected = epoch
      try {
        const value = await send('/auth/wechat/bind', { method: 'POST', body: { bindingTicket: ticket.value, email: String(email).trim(), password } })
        return install(value, expected)
      } catch (error) {
        if (expected !== epoch) throw stale()
        if (['BINDING_TICKET_INVALID', 'ACCOUNT_CREDENTIALS_CHANGED'].includes(error.code)) clear()
        throw error
      }
    },
    async read(path, { season = '', force = false } = {}) {
      const route = path.split('?')[0]
      if (!SAFE_READ.has(route) || /[\\#]/.test(path) || path.includes('..')) throw fault('INVALID_ROUTE', '此入口暂不可用。')
      if (!session || Date.parse(session.session.expiresAt) <= now()) { clear(); throw fault('UNAUTHORIZED', '登录已失效，请重新微信登录。', { status: 401 }) }
      const key = [endpoint, session.user.id, session.user.effectiveMode, season, path].join('|')
      const cached = privateCache.get(key)
      if (!force && state.status === 'AUTHENTICATED' && cached && now() - cached.at < 30000) return cached.value
      const value = await guarded(path)
      privateCache.set(key, { at: now(), value })
      return value
    },
    async write(path, body) {
      if (!SAFE_WRITE.test(path)) throw fault('INVALID_ROUTE', '此提交入口暂不可用。')
      privateCache.clear()
      const result = await guarded(path, { method: 'PUT', body })
      privateCache.clear()
      return result
    },
    discardBinding() { if (ticket || state.status === 'CONNECTING') clear() },
    async logout() {
      const token = session?.accessToken
      clear()
      if (token) await send('/auth/logout', { method: 'POST', token })
    }
  }
}

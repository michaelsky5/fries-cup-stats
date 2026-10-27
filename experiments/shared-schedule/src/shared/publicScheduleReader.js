import { validateSnapshot } from './model.js'

function readError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function requestError(failure) {
  const reason = String(failure?.errMsg || failure?.message || '')
  if (/timeout/i.test(reason)) return readError('PUBLIC_TIMEOUT', '连接赛事数据超时，请点击重新读取。')
  if (/domain.*list|url not in domain/i.test(reason)) return readError('PUBLIC_DOMAIN', '微信尚未允许连接赛事数据服务，请检查服务器域名设置。')
  return readError('PUBLIC_REQUEST', '暂时无法连接赛事数据，请点击重新读取。')
}

// Only expose this fixed public request's failure text and timing. Never retain
// response headers, payloads, cookies, profiles, or device identifiers.
function publicFailureReason(failure) {
  return String(failure?.errMsg || failure?.message || '')
    .replace(/https?:\/\/\S+/gi, '[公开接口]')
    .replace(/[\r\n\t]+/g, ' ').slice(0, 160)
}

export function formatRequestDiagnostic(diagnostic) {
  if (!diagnostic) return ''
  const elapsed = `${(diagnostic.elapsedMs / 1000).toFixed(1)} 秒`
  const stage = diagnostic.headersReceived ? '已收到响应，尚未完成读取' : '尚未收到响应'
  return `${elapsed} · ${stage}${diagnostic.nativeReason ? ` · ${diagnostic.nativeReason}` : ''}`
}

// Listen to native callbacks as well as the SDK Promise. The independent
// deadline also ends loading if the SDK never completes its Promise/callback.
export function requestWithDeadline(request, options, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    let task, settled = false, headersReceived = false
    const startedAt = Date.now()
    function finish(callback, value) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      callback(value)
    }
    function failWith(error, phase, reason = '') {
      error.diagnostic = { phase, elapsedMs: Date.now() - startedAt, headersReceived, nativeReason: reason }
      finish(reject, error)
    }
    const success = response => finish(resolve, response)
    const fail = failure => failWith(requestError(failure), 'native-fail', publicFailureReason(failure))
    const timer = setTimeout(() => {
      failWith(readError('PUBLIC_TIMEOUT', '连接赛事数据超时，请点击重新读取。'), 'deadline')
      try { task?.abort?.() } catch (_) { /* Loading has already ended. */ }
    }, timeoutMs)
    try {
      task = request({ ...options, timeout: timeoutMs, success, fail })
      if (typeof task?.then === 'function') task.then(success, fail)
      // Header presence separates connecting from an interrupted body transfer.
      try { task?.onHeadersReceived?.(() => { headersReceived = true }) } catch (_) { /* Optional diagnostic. */ }
    } catch (failure) { fail(failure) }
  })
}

export function createPublicScheduleReader({ request, url, validate = validateSnapshot, timeoutMs = 20000, now = () => Date.now() }) {
  const cache = { data: null, fetchedAt: 0 }
  let inFlight = null
  const result = stale => ({ data: cache.data, stale, fetchedAt: cache.fetchedAt })
  async function fetchSnapshot() {
    try {
      const response = await requestWithDeadline(request, { url, method: 'GET', dataType: 'json' }, timeoutMs)
      if (response.statusCode !== 200) throw readError('PUBLIC_HTTP', '赛事数据服务暂时不可用，请稍后重试。')
      try { cache.data = validate(response.data) }
      catch (_) { throw readError('PUBLIC_FORMAT', '赛事数据暂时无法处理，请重新读取。') }
      cache.fetchedAt = now()
      return result(false)
    } catch (failure) {
      if (cache.data) return result(true)
      throw failure
    }
  }
  return async function readPublicSchedule(force = false) {
    if (!force && cache.data && now() - cache.fetchedAt < 30000) return result(false)
    if (!inFlight) inFlight = fetchSnapshot().finally(() => { inFlight = null })
    return inFlight
  }
}

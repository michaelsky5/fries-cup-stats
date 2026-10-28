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
  let cancel = () => {}
  const pending = new Promise((resolve, reject) => {
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
    cancel = () => {
      if (settled) return
      failWith(readError('PUBLIC_CANCELLED', '公开读取已结束。'), 'cancelled')
      try { task?.abort?.() } catch (_) { /* The completed read owns no transport. */ }
    }
    try {
      task = request({ ...options, timeout: timeoutMs, success, fail })
      if (typeof task?.then === 'function') task.then(success, fail)
      // Header presence separates connecting from an interrupted body transfer.
      try { task?.onHeadersReceived?.(() => { headersReceived = true }) } catch (_) { /* Optional diagnostic. */ }
    } catch (failure) { fail(failure) }
  })
  pending.cancel = () => cancel()
  return pending
}

function responseEtag(header) {
  const value = Object.entries(header || {}).find(([name]) => name.toLowerCase() === 'etag')?.[1]
  return typeof value === 'string' && /^(?:W\/)?"[\x21\x23-\x7e]{1,240}"$/.test(value) ? value : ''
}

export function createPublicScheduleReader({ request, url, fallbackUrls = [], validate = validateSnapshot, timeoutMs = 20000, now = () => Date.now(), storage }) {
  const cache = { data: null, fetchedAt: 0, etag: '' }
  let inFlight = null
  let restored = null
  const result = stale => ({ data: cache.data, stale, fetchedAt: cache.fetchedAt })
  function restore() {
    if (!restored) restored = (async () => {
      if (!storage) return
      let timer
      try {
        // A missing/slow device cache must never hold up the network request.
        const saved = await Promise.race([Promise.resolve().then(() => storage.read()), new Promise(resolve => { timer = setTimeout(() => resolve(null), 350) })])
        if (saved?.version !== 1 || saved.url !== url || !Number.isFinite(saved.fetchedAt) || saved.fetchedAt <= 0 || saved.fetchedAt > now() + 60000) return
        cache.data = validate(saved.data)
        cache.fetchedAt = saved.fetchedAt
        cache.etag = responseEtag({ etag: saved.etag })
      } catch (_) { /* Optional public cache: invalid/old data falls through to HTTPS. */ }
      finally { clearTimeout(timer) }
    })()
    return restored
  }
  function persist() {
    if (!storage) return
    const saved = { version: 1, url, data: cache.data, etag: cache.etag, fetchedAt: cache.fetchedAt }
    // Cache I/O is optional and cannot turn a successful public read into failure.
    Promise.resolve().then(() => storage.write(saved)).catch(() => {})
  }
  function readResponse(header) {
    const sources = [...new Set([url, ...fallbackUrls])].slice(0, 2)
    return new Promise((resolve, reject) => {
      const startedAt = Date.now(), tasks = [], failures = []
      let completed = false, fallbackTimer, secondaryStarted = false
      function finish(callback, value) {
        if (completed) return
        completed = true
        clearTimeout(fallbackTimer)
        tasks.forEach(task => task.cancel())
        callback(value)
      }
      function start(index) {
        if (completed || !sources[index] || (index === 1 && secondaryStarted)) return
        if (index === 1) secondaryStarted = true
        const remaining = Math.max(1, timeoutMs - (Date.now() - startedAt))
        const pending = requestWithDeadline(request, { url: sources[index], method: 'GET', dataType: 'json', header }, remaining)
        tasks.push(pending)
        pending.then(response => {
          let data
          if (response.statusCode === 304 && cache.data && cache.etag) data = cache.data
          else {
            if (response.statusCode !== 200) throw readError('PUBLIC_HTTP', '赛事数据服务暂时不可用，请稍后重试。')
            try { data = validate(response.data) }
            catch (_) { throw readError('PUBLIC_FORMAT', '赛事数据暂时无法处理，请重新读取。') }
          }
          finish(resolve, { response, data })
        }).catch(failure => {
          if (completed) return
          failures[index] = failure
          if (index === 0 && sources[1]) start(1)
          if (failures.filter(Boolean).length === sources.length) finish(reject, failures[0])
        })
      }
      // Both are fixed anonymous GETs of the same published representation.
      // A slow edge read can use the origin without extending the total budget.
      start(0)
      if (sources[1]) fallbackTimer = setTimeout(() => start(1), Math.min(1500, timeoutMs / 3))
    })
  }
  async function fetchSnapshot() {
    try {
      const header = { Accept: 'application/json', 'Accept-Encoding': 'gzip', ...(cache.etag ? { 'If-None-Match': cache.etag } : {}) }
      const { response, data } = await readResponse(header)
      if (response.statusCode === 304 && cache.data && cache.etag) {
        cache.fetchedAt = now()
        return result(false)
      }
      cache.data = data
      cache.etag = responseEtag(response.header)
      cache.fetchedAt = now()
      persist()
      return result(false)
    } catch (failure) {
      if (cache.data) return result(true)
      throw failure
    }
  }
  async function readPublicSchedule(force = false) {
    if (storage) await restore()
    if (!force && cache.data && now() - cache.fetchedAt < 30000) return result(false)
    if (!inFlight) inFlight = fetchSnapshot().finally(() => { inFlight = null })
    return inFlight
  }
  readPublicSchedule.cached = async () => { await restore(); return cache.data ? result(true) : null }
  return readPublicSchedule
}

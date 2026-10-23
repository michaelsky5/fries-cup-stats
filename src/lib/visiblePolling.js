// Read-only background work. Callers keep ownership of UI state and explicit
// writes; this scheduler never retries a mutation or hides a read failure.
export function startVisiblePolling(task, {
  intervalMs,
  initialDelayMs = 0,
  minRefreshMs = 1000,
  maxErrorDelayMs = 300_000,
  target = globalThis
} = {}) {
  const controller = new AbortController()
  let stopped = false, pending = false, changedWhilePending = false
  let failures = 0, lastStarted = null, nextAt = Date.now() + initialDelayMs, timer
  const interval = () => Math.max(1000, Number(typeof intervalMs === 'function' ? intervalMs() : intervalMs) || 60_000)
  const available = () => target.document?.visibilityState !== 'hidden' && target.navigator?.onLine !== false
  const clear = () => { clearTimeout(timer); timer = undefined }
  const schedule = () => {
    clear()
    if (stopped || pending || !available()) return
    timer = setTimeout(execute, Math.min(2147483647, Math.max(0, nextAt - Date.now())))
  }
  async function execute() {
    clear()
    if (stopped || pending || !available()) return
    if (Date.now() < nextAt) { schedule(); return }
    pending = true
    lastStarted = Date.now()
    try {
      await task({ signal: controller.signal })
      failures = 0
      nextAt = Date.now() + interval()
    } catch (error) {
      failures += 1
      const backoff = Math.min(maxErrorDelayMs, interval() * 2 ** Math.min(failures - 1, 16))
      const retryAfter = Number.isFinite(error?.retryAfterMs) ? Math.max(0, error.retryAfterMs) : 0
      nextAt = Date.now() + Math.max(backoff, retryAfter)
    } finally {
      pending = false
      if (changedWhilePending && !failures) nextAt = Math.max(Date.now(), lastStarted + minRefreshMs)
      changedWhilePending = false
      schedule()
    }
  }
  const refresh = ({ changed = false } = {}) => {
    if (stopped) return
    if (!available()) { clear(); return }
    if (pending) { changedWhilePending ||= changed; return }
    // Focus, reconnect and change events may expedite a healthy poll, but
    // cannot bypass a server's Retry-After or a failure's backoff deadline.
    if (!failures) {
      if (!changed && lastStarted !== null && Date.now() < lastStarted + minRefreshMs) { schedule(); return }
      nextAt = Math.max(Date.now(), lastStarted === null ? 0 : lastStarted + minRefreshMs)
    }
    schedule()
  }
  target.addEventListener?.('focus', refresh)
  target.addEventListener?.('online', refresh)
  target.addEventListener?.('offline', refresh)
  target.document?.addEventListener('visibilitychange', refresh)
  schedule()
  return {
    refresh,
    stop() {
      stopped = true
      clear()
      controller.abort()
      target.removeEventListener?.('focus', refresh)
      target.removeEventListener?.('online', refresh)
      target.removeEventListener?.('offline', refresh)
      target.document?.removeEventListener('visibilitychange', refresh)
    }
  }
}

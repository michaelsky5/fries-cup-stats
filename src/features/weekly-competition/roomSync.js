import { roomReadFailure } from './liveRoomApi.js'

export const ROOM_POLL_MS = 3000
export const ROOM_MAX_RETRY_MS = 30000
const denied = status => [401, 403, 404].includes(status)
const terminal = status => status >= 400 && status < 500 && ![408, 409, 429].includes(status)

export function roomRetryDelay(attempt, random = Math.random) {
  const base = Math.min(ROOM_MAX_RETRY_MS, 1500 * 2 ** Math.min(5, Math.max(0, attempt - 1)))
  return Math.min(ROOM_MAX_RETRY_MS, Math.round(base * (.8 + .4 * random())))
}

// One owned reader per mounted room. Writes are never replayed by this store.
// Injected time/transport make disconnects and read/write races testable.
export function createRoomSync({ matchId, read, now = Date.now, random = Math.random, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let state = { data: null, error: '', busy: false, notice: '', connection: { status: 'connecting', attempts: 0, syncing: false, lastSuccessAt: null, nextRetryAt: null, retryAfterUntil: 0, recoveredAt: null } }
  const listeners = new Set()
  let running = false, visible = true, online = true, timer = null, request = null, sequence = 0, lifecycle = 0, writeIssue = null
  const publish = (patch = {}, connection = {}) => {
    state = { ...state, ...patch, connection: { ...state.connection, ...connection } }
    listeners.forEach(listener => listener())
  }
  const clearScheduled = () => { if (timer !== null) clearTimer(timer); timer = null }
  const cancelRead = () => { sequence++; request?.controller.abort(); request = null }

  function schedule() {
    clearScheduled()
    if (!running || !visible || !online || state.busy || request || state.connection.status === 'blocked') return
    const failed = Boolean(state.error)
    const delay = Math.max(failed ? roomRetryDelay(state.connection.attempts, random) : Math.round(ROOM_POLL_MS * (.9 + .2 * random())), state.connection.retryAfterUntil - now())
    if (failed) publish({}, { nextRetryAt: now() + delay })
    timer = setTimer(() => { timer = null; void readNow() }, delay)
  }

  async function readNow({ force = false, afterWrite = false } = {}) {
    if (!running || state.busy && !afterWrite || !online && !force) return false
    if (request) return request.promise
    if (state.connection.retryAfterUntil > now()) { schedule(); return false }
    clearScheduled()
    const current = { token: ++sequence, controller: new AbortController(), promise: null }
    request = current
    publish({}, { syncing: true, nextRetryAt: null })
    current.promise = (async () => {
      try {
        const next = await read(matchId, { signal: current.controller.signal })
        if (!running || current.token !== sequence) return false
        if (next?.match?.id !== matchId || !next?.actor?.id || !Array.isArray(next.messages)) throw new Error('比赛房响应不完整，请重新同步。')
        if (state.data && next.actor.id !== state.data.actor.id) throw Object.assign(new Error('账号已变化，请重新进入比赛房。'), { status: 401 })
        const recovered = Boolean(state.error)
        let notice = state.notice
        if (writeIssue) notice = writeIssue.kind === 'saved' ? writeIssue.success || '已保存并同步最新状态。' : '连接已恢复，已同步服务器进度。请核对刚才的提交，再决定是否重试。'
        writeIssue = null; online = true
        publish({ data: next, error: '', notice }, { status: 'connected', attempts: 0, lastSuccessAt: now(), nextRetryAt: null, retryAfterUntil: 0, recoveredAt: recovered ? now() : state.connection.recoveredAt })
        return true
      } catch (failure) {
        if (!running || current.token !== sequence) return false
        const result = roomReadFailure(failure, state.data)
        const hold = Number.isFinite(failure.retryAfterMs) ? Math.max(0, failure.retryAfterMs) : 0
        publish({ data: result.data, error: result.error, ...(denied(failure.status) ? { notice: '' } : {}) }, {
          status: terminal(failure.status) ? 'blocked' : online ? 'retrying' : 'offline', attempts: state.connection.attempts + 1,
          retryAfterUntil: hold ? now() + hold : 0, recoveredAt: null,
        })
        return false
      } finally {
        if (current.token === sequence) { request = null; publish({}, { syncing: false }); schedule() }
      }
    })()
    return current.promise
  }

  async function mutate(work, success = '') {
    if (!running || state.busy || state.error || !state.data?.access?.canWrite) return null
    const run = lifecycle
    clearScheduled(); cancelRead()
    publish({ busy: true, notice: '' }, { syncing: false, nextRetryAt: null })
    try {
      const result = await work()
      if (!running || run !== lifecycle) return null
      const synced = await readNow({ afterWrite: true })
      if (!running || run !== lifecycle) return null
      if (!synced) writeIssue = { kind: 'saved', success }
      publish({ notice: synced ? success : '已保存；正在恢复同步，核对最新状态后可继续操作。' })
      return result
    } catch (failure) {
      if (!running || run !== lifecycle) return null
      const known = failure?.status && failure.status < 500 && ![408].includes(failure.status)
      if (denied(failure?.status)) {
        cancelRead()
        publish({ data: null, error: roomReadFailure(failure).error, notice: '' }, { status: 'blocked', syncing: false, nextRetryAt: null })
      } else {
        if (failure.retryAfterMs > 0) {
          publish({ error: roomReadFailure(failure, state.data).error }, { status: 'retrying', attempts: state.connection.attempts + 1, retryAfterUntil: now() + failure.retryAfterMs })
        }
        const synced = await readNow({ afterWrite: true })
        if (!running || run !== lifecycle) return null
        if (!known && !synced) writeIssue = { kind: 'unknown' }
        publish({ notice: known ? failure.message : synced ? '提交结果尚未确认，已同步服务器进度。请核对后再重试，操作不会自动重发。' : '提交结果尚未确认，正在自动重连。请保留当前页面，恢复后核对；操作不会自动重发。' })
      }
      return null
    } finally {
      if (running && run === lifecycle) { publish({ busy: false }); schedule() }
    }
  }

  function wake() {
    if (!running || !visible || !online || state.busy || state.connection.status === 'blocked') return
    if (!state.error && state.connection.lastSuccessAt !== null && now() - state.connection.lastSuccessAt < 1000) return
    void readNow()
  }
  return {
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => state,
    refresh: options => readNow(options), mutate,
    clearNotice: () => publish({ notice: '' }),
    start(options = {}) {
      if (running) return
      running = true; lifecycle++; visible = options.visible !== false; online = options.online !== false
      publish({ busy: false })
      if (online) void readNow()
      else publish({ error: '网络连接已中断，正在等待恢复。' }, { status: 'offline', syncing: false, nextRetryAt: null })
    },
    stop() { running = false; lifecycle++; clearScheduled(); cancelRead() },
    setVisible(value) { visible = value; if (!visible) { clearScheduled(); publish({}, { nextRetryAt: null }) } else wake() },
    setOnline(value) {
      const restored = !online && value; online = value
      if (!value) { clearScheduled(); cancelRead(); publish({ error: '网络连接已中断，正在等待恢复。' }, { status: 'offline', syncing: false, nextRetryAt: null, recoveredAt: null }) }
      else if (restored) wake()
    },
    wake,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLiveRoom, roomReadFailure } from './liveRoomApi.js'

export default function useWeeklyLiveRoom(matchId) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const alive = useRef(false), controller = useRef(null), sequence = useRef(0), writeLock = useRef(false), reading = useRef(false)
  const refresh = useCallback(async ({ force = false } = {}) => {
    if (reading.current && !controller.current?.signal.aborted && !force) return false
    const request = ++sequence.current
    reading.current = true
    controller.current?.abort()
    controller.current = new AbortController()
    try {
      const next = await fetchLiveRoom(matchId, { signal: controller.current.signal })
      if (!alive.current || request !== sequence.current) return false
      if (next?.match?.id !== matchId || !next?.actor?.id || !Array.isArray(next.messages)) throw new Error('比赛房响应不完整，请重新同步。')
      setData(next); setError(''); return true
    } catch (failure) {
      if (!alive.current || request !== sequence.current) return false
      setData(previous => roomReadFailure(failure, previous).data)
      setError(roomReadFailure(failure).error); return false
    } finally { if (request === sequence.current) reading.current = false }
  }, [matchId])
  useEffect(() => {
    alive.current = true; refresh()
    const update = () => { if (!writeLock.current && document.visibilityState === 'visible') refresh() }
    const timer = setInterval(update, 3000)
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', update)
    return () => { alive.current = false; controller.current?.abort(); clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update) }
  }, [refresh])
  async function mutate(work, success) {
    if (writeLock.current || error || !data?.access.canWrite) return null
    writeLock.current = true; setBusy(true); setNotice('')
    try {
      const result = await work()
      if (!alive.current) return null
      const synced = await refresh({ force: true })
      if (alive.current) setNotice(synced ? success : '已保存；最新状态暂未同步，请重新同步后继续。')
      return result
    } catch (failure) {
      if (!alive.current) return null
      await refresh({ force: true })
      if (alive.current) setNotice(failure?.status && failure.status < 500 ? failure.message : '提交结果尚未确认。内容已保留，请同步核对；重试消息会沿用原提交编号。')
      return null
    } finally { writeLock.current = false; if (alive.current) setBusy(false) }
  }
  return { data, error, busy, notice, refresh, mutate, clearNotice: () => setNotice('') }
}

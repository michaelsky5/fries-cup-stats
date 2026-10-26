import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { fetchLiveRoom } from './liveRoomApi.js'
import { createRoomSync } from './roomSync.js'

export default function useWeeklyLiveRoom(matchId, read = fetchLiveRoom, { backgroundPollMs = 0 } = {}) {
  const sync = useMemo(() => createRoomSync({ matchId, read }), [matchId, read])
  const snapshot = useSyncExternalStore(sync.subscribe, sync.getSnapshot)
  // 票 2.64: with alerts on, a hidden room keeps reading at a slower pace instead of stopping.
  useEffect(() => { sync.setBackground(backgroundPollMs) }, [sync, backgroundPollMs])
  useEffect(() => {
    sync.start({ online: navigator.onLine, visible: document.visibilityState === 'visible' })
    const visibility = () => sync.setVisible(document.visibilityState === 'visible')
    const online = () => sync.setOnline(true), offline = () => sync.setOnline(false)
    window.addEventListener('focus', sync.wake)
    window.addEventListener('online', online); window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      sync.stop(); window.removeEventListener('focus', sync.wake)
      window.removeEventListener('online', online); window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [sync])
  return { ...snapshot, refresh: sync.refresh, mutate: sync.mutate, clearNotice: sync.clearNotice }
}

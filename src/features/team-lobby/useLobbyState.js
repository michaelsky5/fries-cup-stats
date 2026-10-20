import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { getMyLobby } from './lobbyApi.js'

export function useLobbyMine() {
  const { user } = useAuth()
  const [data, setData] = useState(null), [error, setError] = useState(null), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setData(null); setError(null)
    if (!user?.id) return undefined
    const controller = new AbortController()
    getMyLobby({ signal: controller.signal }).then(value => { if (!controller.signal.aborted) setData(value) })
      .catch(failure => { if (!controller.signal.aborted) setError(failure) })
    return () => controller.abort()
  }, [user?.id, attempt])
  const refresh = useCallback(() => setAttempt(value => value + 1), [])
  return { data, error, refresh }
}

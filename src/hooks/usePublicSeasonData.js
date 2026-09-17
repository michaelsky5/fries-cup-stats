import { useEffect, useState } from 'react'
import { getDb, getDbSource, isLocalDbFallback, refreshDb } from '../lib/db.js'

const initialState = (seasonId, reviewArchive = false) => ({ seasonId, reviewArchive, db: null, error: '', isLoading: true, isRefreshing: false, refreshError: false })

export function usePublicSeasonData(seasonId, { reviewArchive = false } = {}) {
  const [state, setState] = useState(() => initialState(seasonId, reviewArchive))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    let requestInFlight = false
    let loaded = false
    let lastAttempt = 0
    let fallback = false
    let localPreview = false
    setState(current => current.seasonId === seasonId && current.reviewArchive === reviewArchive && current.db
      ? { ...current, isRefreshing: !reviewArchive }
      : initialState(seasonId, reviewArchive))

    const refresh = async () => {
      if (!alive || requestInFlight || !loaded || localPreview || reviewArchive) return
      requestInFlight = true
      lastAttempt = Date.now()
      setState(current => ({ ...current, isRefreshing: true }))
      try {
        const data = await refreshDb(seasonId)
        if (!alive) return
        fallback = isLocalDbFallback(data)
        setState({ seasonId, reviewArchive, db: data, error: '', isLoading: false, isRefreshing: false, refreshError: false })
      } catch {
        if (alive) setState(current => ({ ...current, isRefreshing: false, refreshError: true }))
      } finally { requestInFlight = false }
    }

    // Match the story page's archive and cache key. Live routes keep their
    // published-data policy, including refresh and fallback notices.
    getDb(seasonId, { preferLocalData: reviewArchive })
      .then(data => {
        if (!alive) return
        loaded = true
        lastAttempt = Date.now()
        fallback = isLocalDbFallback(data)
        localPreview = getDbSource(data).kind === 'local-preview'
        setState(current => ({ seasonId, reviewArchive, db: data, error: '', isLoading: false, isRefreshing: false,
          refreshError: !reviewArchive && getDbSource(data).fromCache && current.seasonId === seasonId && current.reviewArchive === reviewArchive ? current.refreshError : false }))
        if (!reviewArchive && (fallback || getDbSource(data).fromCache)) void refresh()
      })
      .catch(() => {
        if (alive) setState({ ...initialState(seasonId, reviewArchive), isLoading: false, error: 'DATA_LOAD_FAILED' })
      })

    if (reviewArchive) return () => { alive = false }

    const refreshVisible = () => {
      if (document.visibilityState !== 'hidden' && Date.now() - lastAttempt >= 15_000) void refresh()
    }
    const interval = setInterval(() => {
      const delay = fallback ? 15_000 : 60_000
      if (Date.now() - lastAttempt >= delay) refreshVisible()
    }, 15_000)
    window.addEventListener('focus', refreshVisible)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      alive = false
      clearInterval(interval)
      window.removeEventListener('focus', refreshVisible)
      document.removeEventListener('visibilitychange', refreshVisible)
    }
  }, [seasonId, attempt, reviewArchive])

  const visibleState = state.seasonId === seasonId && state.reviewArchive === reviewArchive
    ? state
    : initialState(seasonId, reviewArchive)
  const source = getDbSource(visibleState.db)
  return {
    ...visibleState,
    isUsingFallback: isLocalDbFallback(visibleState.db),
    dataSource: reviewArchive && source.kind === 'local-preview' ? { ...source, kind: 'review-archive' } : source,
    retry: () => setAttempt(value => value + 1)
  }
}

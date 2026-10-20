import { useEffect, useState } from 'react'
import { getDb, getDbSource, isLocalDbFallback, refreshDb } from '../lib/db.js'
import { startVisiblePolling } from '../lib/visiblePolling.js'

const initialState = (seasonId, reviewArchive = false) => ({ seasonId, reviewArchive, db: null, error: '', isLoading: true, isRefreshing: false, refreshError: false })

export function usePublicSeasonData(seasonId, { reviewArchive = false } = {}) {
  const [state, setState] = useState(() => initialState(seasonId, reviewArchive))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    let polling
    let fallback = false
    let localPreview = false
    setState(current => current.seasonId === seasonId && current.reviewArchive === reviewArchive && current.db
      ? { ...current, isRefreshing: !reviewArchive }
      : initialState(seasonId, reviewArchive))

    const refresh = async () => {
      if (!alive || localPreview || reviewArchive) return
      setState(current => ({ ...current, isRefreshing: true }))
      try {
        const data = await refreshDb(seasonId)
        if (!alive) return
        fallback = isLocalDbFallback(data)
        setState({ seasonId, reviewArchive, db: data, error: '', isLoading: false, isRefreshing: false, refreshError: false })
      } catch (error) {
        if (alive) setState(current => ({ ...current, isRefreshing: false, refreshError: true }))
        throw error
      }
    }

    // Match the story page's archive and cache key. Live routes keep their
    // published-data policy, including refresh and fallback notices.
    getDb(seasonId, { preferLocalData: reviewArchive })
      .then(data => {
        if (!alive) return
        fallback = isLocalDbFallback(data)
        localPreview = getDbSource(data).kind === 'local-preview'
        setState(current => ({ seasonId, reviewArchive, db: data, error: '', isLoading: false, isRefreshing: false,
          refreshError: !reviewArchive && getDbSource(data).fromCache && current.seasonId === seasonId && current.reviewArchive === reviewArchive ? current.refreshError : false }))
        if (!reviewArchive && !localPreview) polling = startVisiblePolling(refresh, {
          intervalMs: () => fallback ? 15_000 : 60_000,
          initialDelayMs: fallback || getDbSource(data).fromCache ? 0 : 60_000,
          minRefreshMs: 15_000
        })
      })
      .catch(() => {
        if (alive) setState({ ...initialState(seasonId, reviewArchive), isLoading: false, error: 'DATA_LOAD_FAILED' })
      })

    return () => {
      alive = false
      polling?.stop()
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

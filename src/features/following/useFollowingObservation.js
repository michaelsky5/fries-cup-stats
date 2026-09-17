import { useEffect, useMemo, useState } from 'react'
import { createFollowingObservation, followingObservationKey, getFollowingChanges, isFollowingObservation, reconcileFollowingSubjects } from './followingObservationModel.js'

export default function useFollowingObservation(feed, { seasonId, accountId = 'guest', db }) {
  const cycleId = feed.weekly ? feed.weekly.cycle?.id || 'unpublished' : undefined
  const key = followingObservationKey(seasonId, accountId, cycleId)
  const [saved, setSaved] = useState(null)
  const [storageError, setStorageError] = useState(false)
  const current = useMemo(() => createFollowingObservation(feed, { seasonId, accountId, db }), [feed, seasonId, accountId, db])
  const baseline = saved?.key === key ? saved.value : null
  useEffect(() => {
    const read = () => {
      try {
        const value = JSON.parse(window.localStorage.getItem(key) || 'null')
        setSaved({ key, value: isFollowingObservation(value, { seasonId, accountId, cycleId }) ? value : null })
        setStorageError(false)
      } catch { setSaved({ key, value: null }); setStorageError(true) }
    }
    read()
    const onStorage = event => { if (event.key === key) read() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, seasonId, accountId, cycleId])
  useEffect(() => {
    if (saved?.key !== key || !feed.loaded || !seasonId || (!baseline && !feed.hasFavorites)) return
    const value = baseline ? reconcileFollowingSubjects(baseline, current) : current
    if (value === baseline) return
    try { window.localStorage.setItem(key, JSON.stringify(value)); setStorageError(false) }
    catch { setStorageError(true) }
    setSaved({ key, value })
  }, [baseline, current, feed.loaded, feed.hasFavorites, key, saved?.key, seasonId])
  const changes = getFollowingChanges(baseline, current)
  const acknowledge = () => {
    if (!feed.loaded || changes.olderSnapshot) return
    try { window.localStorage.setItem(key, JSON.stringify(current)); setStorageError(false) }
    catch { setStorageError(true) }
    setSaved({ key, value: current })
  }
  return { ...changes, acknowledge, storageError, seenAt: baseline?.seenAt }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { fetchUserFavorites, saveUserFavorites } from '../auth/userDataApi.js'
import { FAVORITE_LIMITS, FAVORITES_STORAGE_KEY } from './favoritesConstants.js'
import { mergeSeasonFavorites, readSeasonFavorites, writeSeasonFavorites } from './favoritesStorage.js'
import {
  favoriteIncludes,
  getPlayerFavoriteId,
  getPlayerIdentityKey,
  getPlayerIdentityValues,
  getTeamFavoriteId,
  getTeamIdentityKey,
  getTeamIdentityValues,
  sanitizeFavoritesForSeason
} from './favoritesSelectors.js'
import { normalizeSeasonId } from './normalizeSeasonId.js'

function normalize(value) {
  return String(value ?? '').trim()
}

function resolveTeamId(teamOrId, db) {
  const rawId = typeof teamOrId === 'object' ? getTeamFavoriteId(teamOrId) : getTeamIdentityKey(teamOrId)
  return sanitizeFavoritesForSeason({ favoriteTeamIds: [rawId] }, db).favoriteTeamIds[0] || normalize(rawId)
}

function resolvePlayerId(playerOrId, db) {
  const rawId = typeof playerOrId === 'object' ? getPlayerFavoriteId(playerOrId) : getPlayerIdentityKey(playerOrId)
  return sanitizeFavoritesForSeason({ favoritePlayerIds: [rawId] }, db).favoritePlayerIds[0] || normalize(rawId)
}

export default function useFavorites(seasonId, db) {
  const storageKey = normalizeSeasonId(seasonId)
  const { isAuthenticated, user, accountCapabilities } = useAuth()
  const cloudSyncAllowed = isAuthenticated && accountCapabilities?.canUseCloudFavorites === true
  const userId = user?.id || ''
  const [favorites, setFavoritesState] = useState(() => readSeasonFavorites(storageKey, db))
  const [syncStatus, setSyncStatus] = useState('local')
  const [syncError, setSyncError] = useState('')
  const favoritesRef = useRef(favorites)
  const cloudSaveTimerRef = useRef(null)

  useEffect(() => {
    favoritesRef.current = favorites
  }, [favorites])

  useEffect(() => () => {
    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current)
    }
  }, [cloudSyncAllowed, storageKey, userId])

  useEffect(() => {
    const nextFavorites = readSeasonFavorites(storageKey, db)
    favoritesRef.current = nextFavorites
    setFavoritesState(nextFavorites)
  }, [storageKey, db])

  const queueCloudSave = useCallback((nextFavorites) => {
    if (!cloudSyncAllowed || !userId || !storageKey) {
      setSyncStatus('local')
      setSyncError('')
      return
    }

    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current)
    }

    setSyncStatus('saving')
    setSyncError('')
    cloudSaveTimerRef.current = window.setTimeout(() => {
      saveUserFavorites(storageKey, nextFavorites)
        .then(() => {
          setSyncStatus('ready')
          setSyncError('')
        })
        .catch(error => {
          setSyncStatus('error')
          setSyncError(error?.message || 'SYNC_FAILED')
        })
    }, 450)
  }, [cloudSyncAllowed, storageKey, userId])

  useEffect(() => {
    if (!cloudSyncAllowed || !userId || !storageKey) {
      setSyncStatus('local')
      setSyncError('')
      return undefined
    }

    let cancelled = false
    setSyncStatus('loading')
    setSyncError('')

    const localFavorites = readSeasonFavorites(storageKey, db)
    const cloudFavoritesPromise = fetchUserFavorites(storageKey).catch(error => {
      if (error?.status === 404) return null
      throw error
    })

    cloudFavoritesPromise
      .then(cloudFavorites => {
        if (cancelled) return null

        const merged = mergeSeasonFavorites(localFavorites, cloudFavorites, db)
        const sanitized = writeSeasonFavorites(storageKey, merged, db)
        favoritesRef.current = sanitized
        setFavoritesState(sanitized)

        return saveUserFavorites(storageKey, sanitized)
      })
      .then(() => {
        if (cancelled) return
        setSyncStatus('ready')
        setSyncError('')
      })
      .catch(error => {
        if (cancelled) return
        setSyncStatus('error')
        setSyncError(error?.message || 'SYNC_FAILED')
      })

    return () => {
      cancelled = true
    }
  }, [db, cloudSyncAllowed, storageKey, userId])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleStorage = event => {
      if (event.key !== FAVORITES_STORAGE_KEY) return
      setFavoritesState(readSeasonFavorites(storageKey, db))
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [storageKey, db])

  const persistFavorites = useCallback((updater) => {
    const base = sanitizeFavoritesForSeason(favoritesRef.current, db)
    const next = typeof updater === 'function' ? updater(base) : updater
    const sanitized = writeSeasonFavorites(storageKey, next, db)

    favoritesRef.current = sanitized
    setFavoritesState(sanitized)
    queueCloudSave(sanitized)
  }, [storageKey, db, queueCloudSave])

  const saveFavorites = useCallback((nextFavorites) => {
    const sanitized = writeSeasonFavorites(storageKey, nextFavorites, db, { requirePersistence: true })
    favoritesRef.current = sanitized
    setFavoritesState(sanitized)
    queueCloudSave(sanitized)
    return sanitized
  }, [storageKey, db, queueCloudSave])

  const toggleTeamFavorite = useCallback((teamOrId) => {
    const teamId = resolveTeamId(teamOrId, db)
    if (!teamId) return

    persistFavorites(current => {
      const exists = current.favoriteTeamIds.includes(teamId)
      let favoriteTeamIds = exists
        ? current.favoriteTeamIds.filter(id => id !== teamId)
        : [...current.favoriteTeamIds, teamId]

      if (!exists && favoriteTeamIds.length > FAVORITE_LIMITS.teams) {
        favoriteTeamIds = current.favoriteTeamIds
      }

      let primaryTeamId = current.primaryTeamId
      if (!exists && !primaryTeamId && favoriteTeamIds.includes(teamId)) {
        primaryTeamId = teamId
      }
      if (exists && primaryTeamId === teamId) {
        primaryTeamId = favoriteTeamIds[0] || null
      }

      return {
        ...current,
        primaryTeamId,
        favoriteTeamIds
      }
    })
  }, [db, persistFavorites])

  const setPrimaryTeamFavorite = useCallback((teamOrId) => {
    const teamId = resolveTeamId(teamOrId, db)
    if (!teamId) return

    persistFavorites(current => {
      const exists = current.favoriteTeamIds.includes(teamId)
      if (!exists && current.favoriteTeamIds.length >= FAVORITE_LIMITS.teams) return current

      return {
        ...current,
        primaryTeamId: teamId,
        favoriteTeamIds: [
          teamId,
          ...current.favoriteTeamIds.filter(id => id !== teamId)
        ]
      }
    })
  }, [db, persistFavorites])

  const togglePlayerFavorite = useCallback((playerOrId) => {
    const playerId = resolvePlayerId(playerOrId, db)
    if (!playerId) return

    persistFavorites(current => {
      const exists = current.favoritePlayerIds.includes(playerId)
      let favoritePlayerIds = exists
        ? current.favoritePlayerIds.filter(id => id !== playerId)
        : [...current.favoritePlayerIds, playerId]

      if (!exists && favoritePlayerIds.length > FAVORITE_LIMITS.players) {
        favoritePlayerIds = current.favoritePlayerIds
      }

      return {
        ...current,
        favoritePlayerIds
      }
    })
  }, [db, persistFavorites])

  const isFavoriteTeam = useCallback((teamOrId) => {
    if (typeof teamOrId === 'object') {
      return favoriteIncludes(favorites.favoriteTeamIds, teamOrId, getTeamIdentityValues)
    }

    const teamId = resolveTeamId(teamOrId, db)
    return favorites.favoriteTeamIds.includes(teamId)
  }, [db, favorites.favoriteTeamIds])

  const isPrimaryFavoriteTeam = useCallback((teamOrId) => {
    const teamId = typeof teamOrId === 'object' ? getTeamFavoriteId(teamOrId) : resolveTeamId(teamOrId, db)
    return Boolean(teamId && favorites.primaryTeamId === teamId)
  }, [db, favorites.primaryTeamId])

  const isFavoritePlayer = useCallback((playerOrId) => {
    if (typeof playerOrId === 'object') {
      return favoriteIncludes(favorites.favoritePlayerIds, playerOrId, getPlayerIdentityValues)
    }

    const playerId = resolvePlayerId(playerOrId, db)
    return favorites.favoritePlayerIds.includes(playerId)
  }, [db, favorites.favoritePlayerIds])

  return useMemo(() => ({
    favorites,
    favoriteLimits: FAVORITE_LIMITS,
    syncError,
    syncStatus,
    saveFavorites,
    toggleTeamFavorite,
    setPrimaryTeamFavorite,
    togglePlayerFavorite,
    isFavoriteTeam,
    isPrimaryFavoriteTeam,
    isFavoritePlayer
  }), [
    favorites,
    isFavoritePlayer,
    isFavoriteTeam,
    isPrimaryFavoriteTeam,
    saveFavorites,
    setPrimaryTeamFavorite,
    syncError,
    syncStatus,
    togglePlayerFavorite,
    toggleTeamFavorite
  ])
}

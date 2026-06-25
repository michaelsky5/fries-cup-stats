import { useCallback, useEffect, useMemo, useState } from 'react'
import { FAVORITE_LIMITS, FAVORITES_STORAGE_KEY } from './favoritesConstants.js'
import { readSeasonFavorites, writeSeasonFavorites } from './favoritesStorage.js'
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
  const [favorites, setFavoritesState] = useState(() => readSeasonFavorites(storageKey, db))

  useEffect(() => {
    setFavoritesState(readSeasonFavorites(storageKey, db))
  }, [storageKey, db])

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
    setFavoritesState(current => {
      const base = sanitizeFavoritesForSeason(current, db)
      const next = typeof updater === 'function' ? updater(base) : updater
      return writeSeasonFavorites(storageKey, next, db)
    })
  }, [storageKey, db])

  const saveFavorites = useCallback((nextFavorites) => {
    const sanitized = writeSeasonFavorites(storageKey, nextFavorites, db)
    setFavoritesState(sanitized)
    return sanitized
  }, [storageKey, db])

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
    togglePlayerFavorite,
    toggleTeamFavorite
  ])
}

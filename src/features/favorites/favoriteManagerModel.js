import { sanitizeFavoritesForSeason } from './favoritesSelectors.js'
import { mergeSeasonFavorites } from './favoritesStorage.js'

export function primaryFirst(favorites) {
  return { ...favorites, favoriteTeamIds: favorites.primaryTeamId
    ? [favorites.primaryTeamId, ...favorites.favoriteTeamIds.filter(id => id !== favorites.primaryTeamId)]
    : [...favorites.favoriteTeamIds] }
}

export function sameFavorites(first, second) {
  return first.primaryTeamId === second.primaryTeamId
    && JSON.stringify(first.favoriteTeamIds) === JSON.stringify(second.favoriteTeamIds)
    && JSON.stringify(first.favoritePlayerIds) === JSON.stringify(second.favoritePlayerIds)
}

export function getFavoriteDraftStatus(base, draft, latest) {
  return { dirty: !sameFavorites(base, draft), externalChange: !sameFavorites(base, latest) }
}

export function prepareFavoriteImport(draft, imported, db) {
  const replace = primaryFirst(sanitizeFavoritesForSeason(imported, db))
  const merge = mergeSeasonFavorites(draft, replace, db)
  const expectedTeams = new Set([...draft.favoriteTeamIds, ...replace.favoriteTeamIds]).size
  const expectedPlayers = new Set([...draft.favoritePlayerIds, ...replace.favoritePlayerIds]).size
  return { replace, merge, mergeOmitted: expectedTeams + expectedPlayers - merge.favoriteTeamIds.length - merge.favoritePlayerIds.length }
}

export function moveFavoriteDraftItem(items, fromIndex, toIndex, minIndex = 0) {
  const next = [...items]
  if (fromIndex < minIndex || fromIndex >= next.length || toIndex < minIndex || toIndex >= next.length) return next
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

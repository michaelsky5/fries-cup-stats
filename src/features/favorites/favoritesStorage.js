import { EMPTY_FAVORITES, FAVORITES_STORAGE_KEY } from './favoritesConstants.js'
import { sanitizeFavoritesForSeason } from './favoritesSelectors.js'
import { getSeasonStorageAliases, normalizeSeasonId } from './normalizeSeasonId.js'

export const FAVORITES_EXPORT_SCHEMA = 'fries-cup-stats:favorites'
export const FAVORITES_EXPORT_VERSION = 1

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function readRawStore() {
  if (!canUseStorage()) return {}

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeRawStore(store) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(store || {}))
  } catch {
    // localStorage can be unavailable in private contexts; the in-memory hook state still works.
  }
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function hasFavoriteContent(entry) {
  if (!entry || typeof entry !== 'object') return false
  return Boolean(
    entry.primaryTeamId ||
    (Array.isArray(entry.favoriteTeamIds) && entry.favoriteTeamIds.length) ||
    (Array.isArray(entry.favoritePlayerIds) && entry.favoritePlayerIds.length)
  )
}

export function readFavoritesStore() {
  return readRawStore()
}

export function writeFavoritesStore(store) {
  writeRawStore(store)
}

export function readSeasonFavorites(seasonId, db) {
  const key = normalizeSeasonId(seasonId)
  if (!key) return EMPTY_FAVORITES

  const store = readRawStore()
  const aliases = getSeasonStorageAliases(key)
  const aliasEntries = aliases.map(alias => store[alias]).filter(Boolean)
  const rawEntry = aliasEntries.find(hasFavoriteContent) || aliasEntries[0]
  const storageEntry = sanitizeFavoritesForSeason(rawEntry, null)

  const nextStore = { ...store, [key]: storageEntry }
  aliases.filter(alias => alias !== key).forEach(alias => {
    delete nextStore[alias]
  })

  if (!sameJson(store, nextStore)) {
    writeRawStore(nextStore)
  }

  return sanitizeFavoritesForSeason(storageEntry, db)
}

export function writeSeasonFavorites(seasonId, favorites, db) {
  const key = normalizeSeasonId(seasonId)
  if (!key) return sanitizeFavoritesForSeason(favorites, db)

  const store = readRawStore()
  const sanitized = sanitizeFavoritesForSeason(favorites, db)
  const nextStore = { ...store, [key]: sanitized }
  getSeasonStorageAliases(key).filter(alias => alias !== key).forEach(alias => {
    delete nextStore[alias]
  })

  writeRawStore(nextStore)

  return sanitized
}

function createImportError(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

function parseImportPayload(input) {
  if (typeof input !== 'string') return input

  try {
    return JSON.parse(input)
  } catch {
    throw createImportError('备份文件无法解析', 'INVALID_JSON')
  }
}

function getSeasonEntryFromPayload(payload, key) {
  if (!payload || typeof payload !== 'object') {
    throw createImportError('备份文件格式不正确', 'INVALID_PAYLOAD')
  }

  if (payload.schema === FAVORITES_EXPORT_SCHEMA) {
    const payloadSeasonId = normalizeSeasonId(payload.seasonId)
    if (payloadSeasonId && payloadSeasonId !== key) {
      throw createImportError(`这是 ${payloadSeasonId} 的关注备份`, 'SEASON_MISMATCH')
    }
    return payload.favorites
  }

  if (payload.favorites && typeof payload.favorites === 'object') {
    return payload.favorites
  }

  const aliases = getSeasonStorageAliases(key)
  const seasonEntry = aliases.map(alias => payload[alias]).find(Boolean)
  if (seasonEntry) return seasonEntry

  return payload
}

export function createSeasonFavoritesExport(seasonId, favorites, db) {
  const key = normalizeSeasonId(seasonId)
  const sanitized = sanitizeFavoritesForSeason(favorites, db)

  return {
    schema: FAVORITES_EXPORT_SCHEMA,
    version: FAVORITES_EXPORT_VERSION,
    seasonId: key,
    exportedAt: new Date().toISOString(),
    favorites: sanitized
  }
}

export function parseSeasonFavoritesImport(input, seasonId, db) {
  const key = normalizeSeasonId(seasonId)
  if (!key) {
    throw createImportError('当前赛事无法识别', 'UNKNOWN_SEASON')
  }

  const payload = parseImportPayload(input)
  const entry = getSeasonEntryFromPayload(payload, key)
  const sanitized = sanitizeFavoritesForSeason(entry, db)

  return sanitized
}

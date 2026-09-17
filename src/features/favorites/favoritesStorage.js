import { EMPTY_FAVORITES, FAVORITES_STORAGE_KEY } from './favoritesConstants.js'
import { sanitizeFavoritesForSeason } from './favoritesSelectors.js'
import { getSeasonStorageAliases, normalizeSeasonId } from './normalizeSeasonId.js'

export const FAVORITES_EXPORT_SCHEMA = 'fries-cup-stats:favorites'
export const FAVORITES_EXPORT_VERSION = 1

function canUseStorage() {
  try { return typeof window !== 'undefined' && Boolean(window.localStorage) } catch { return false }
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
  if (!canUseStorage()) return false

  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(store || {}))
    return true
  } catch {
    // localStorage can be unavailable in private contexts; the in-memory hook state still works.
    return false
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

function uniqueValues(values) {
  return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)))
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

export function writeSeasonFavorites(seasonId, favorites, db, { requirePersistence = false } = {}) {
  const key = normalizeSeasonId(seasonId)
  if (!key) {
    if (requirePersistence) throw new Error('Following could not be saved without an event.')
    return sanitizeFavoritesForSeason(favorites, db)
  }

  const store = readRawStore()
  const sanitized = sanitizeFavoritesForSeason(favorites, db)
  const nextStore = { ...store, [key]: sanitized }
  getSeasonStorageAliases(key).filter(alias => alias !== key).forEach(alias => {
    delete nextStore[alias]
  })

  const persisted = writeRawStore(nextStore)
  if (requirePersistence && !persisted) throw new Error('Following could not be saved in this browser.')

  return sanitized
}

export function mergeSeasonFavorites(localFavorites, cloudFavorites, db) {
  const local = sanitizeFavoritesForSeason(localFavorites, db)
  const cloud = sanitizeFavoritesForSeason(cloudFavorites, db)
  const primaryTeamId = local.primaryTeamId || cloud.primaryTeamId || null
  const favoriteTeamIds = uniqueValues([
    primaryTeamId,
    ...local.favoriteTeamIds,
    ...cloud.favoriteTeamIds
  ])
  const favoritePlayerIds = uniqueValues([
    ...local.favoritePlayerIds,
    ...cloud.favoritePlayerIds
  ])

  return sanitizeFavoritesForSeason({
    primaryTeamId,
    favoriteTeamIds,
    favoritePlayerIds
  }, db)
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
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createImportError('备份文件格式不正确', 'INVALID_PAYLOAD')
  }

  if ('schema' in payload && payload.schema !== FAVORITES_EXPORT_SCHEMA) {
    throw createImportError('不是关注备份文件', 'INVALID_SCHEMA')
  }
  if ('version' in payload && payload.version !== FAVORITES_EXPORT_VERSION) {
    throw createImportError('暂不支持这个备份版本', 'UNSUPPORTED_VERSION')
  }
  const payloadSeasonId = normalizeSeasonId(payload.seasonId)
  if (payloadSeasonId && payloadSeasonId !== key) {
    throw createImportError(`这是 ${payloadSeasonId} 的关注备份`, 'SEASON_MISMATCH')
  }
  if (payload.schema === FAVORITES_EXPORT_SCHEMA && (!payloadSeasonId || payload.version !== FAVORITES_EXPORT_VERSION)) {
    throw createImportError('备份缺少赛事或版本信息', 'INVALID_PAYLOAD')
  }
  if (payload.schema === FAVORITES_EXPORT_SCHEMA && !Object.hasOwn(payload, 'favorites')) {
    throw createImportError('备份缺少关注记录', 'INVALID_PAYLOAD')
  }

  if ('favorites' in payload) {
    return validateImportEntry(payload.favorites)
  }

  const aliases = getSeasonStorageAliases(key)
  const seasonKey = aliases.find(alias => Object.hasOwn(payload, alias))
  if (seasonKey) return validateImportEntry(payload[seasonKey])

  return validateImportEntry(payload)
}

function validateImportEntry(entry) {
  const arrayKeys = ['favoriteTeamIds', 'teamIds', 'teams', 'favoritePlayerIds', 'playerIds', 'players']
  const primaryKeys = ['primaryTeamId', 'primaryTeam', 'mainTeamId']
  const validId = value => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)
    || ![...arrayKeys, ...primaryKeys].some(key => Object.hasOwn(entry, key))
    || arrayKeys.some(key => key in entry && (!Array.isArray(entry[key]) || entry[key].some(value => !validId(value))))
    || primaryKeys.some(key => key in entry && entry[key] !== null && !validId(entry[key]))) {
    throw createImportError('备份文件格式不正确', 'INVALID_PAYLOAD')
  }
  return entry
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
  return inspectSeasonFavoritesImport(input, seasonId, db).favorites
}

export function inspectSeasonFavoritesImport(input, seasonId, db) {
  const key = normalizeSeasonId(seasonId)
  if (!key) {
    throw createImportError('当前赛事无法识别', 'UNKNOWN_SEASON')
  }

  const payload = parseImportPayload(input)
  const entry = getSeasonEntryFromPayload(payload, key)
  const sanitized = sanitizeFavoritesForSeason(entry, db)

  const teamIds = entry.favoriteTeamIds || entry.teamIds || entry.teams || []
  const playerIds = entry.favoritePlayerIds || entry.playerIds || entry.players || []
  const sourceTeams = uniqueValues([entry.primaryTeamId || entry.primaryTeam || entry.mainTeamId, ...teamIds])
  const sourcePlayers = uniqueValues(playerIds)
  return {
    favorites: sanitized,
    omitted: Math.max(0, sourceTeams.length - sanitized.favoriteTeamIds.length)
      + Math.max(0, sourcePlayers.length - sanitized.favoritePlayerIds.length)
  }
}

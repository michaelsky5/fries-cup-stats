import { getSeasonById, getStoredSeasonId } from '../config/seasons.js'
import { resolvePublishedAdvanceTeams } from './advanceSelectors.js'
import { readPublicSnapshot, savePublicSnapshot } from './publicSnapshotCache.js'
import { requestPublicJson } from './publicJsonRequest.js'

const dbCache = new Map()
const reportCache = new Map()
const dbSourceBySnapshot = new WeakMap()

const REVIEW_STAFF_FIELD_KEYS = [
  'admin',
  'admins',
  'admin_a',
  'admin_b',
  'referee',
  'referees',
  'judge',
  'judges',
  'director',
  'directors',
  'operator',
  'operators',
  'producer',
  'producers',
  'observer',
  'observers',
  'caster',
  'casters',
  'caster_a',
  'caster_b',
  'commentator',
  'commentators',
  'host',
  'hosts'
]

function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function uniqueUrls(urls) {
  return Array.from(new Set(urls.filter(Boolean)))
}

function getEnvUrl(seasonId, kind) {
  const upperKind = kind === 'report' ? 'REPORT' : 'DATA'
  return import.meta.env?.[`VITE_PUBLIC_${seasonId}_${upperKind}_URL`] ||
    import.meta.env?.[`VITE_PUBLIC_${upperKind}_URL`] ||
    ''
}

function getDbUrls(season) {
  const remoteUrls = [
    getEnvUrl(season.id, 'data'),
    season.proxyDataUrl,
    season.dataUrl
  ]
  const localUrls = [season.localDataUrl]

  return uniqueUrls(season?.preferLocalData
    ? [...localUrls, ...remoteUrls]
    : [...remoteUrls, ...localUrls])
}

function getReportUrls(season) {
  return uniqueUrls([
    getEnvUrl(season.id, 'report'),
    season.proxyReportUrl,
    season.reportUrl,
    season.localReportUrl
  ])
}

async function fetchJson(url, errorCode) {
  return (await requestPublicJson(url, errorCode)).data
}

function attachSeasonMeta(data, season) {
  return {
    ...data,
    meta: {
      ...(data?.meta || {}),
      season_id: data?.meta?.season_id || season.id,
      season_code: data?.meta?.season_code || season.publicCode,
      season_name: data?.meta?.season_name || season.name.zh,
      season_name_en: data?.meta?.season_name_en || season.name.en,
      series_code: data?.meta?.series_code || season.seriesCode,
      review_enabled: season.reviewEnabled
    }
  }
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function hasMeaningfulValue(value) {
  if (value === undefined || value === null) return false
  if (Array.isArray(value)) return value.some(hasMeaningfulValue)
  if (isObject(value)) return Object.values(value).some(hasMeaningfulValue)
  return String(value).trim() !== ''
}

function rootHasReviewStaffPayload(root) {
  if (!isObject(root)) return false
  return REVIEW_STAFF_FIELD_KEYS.some(key => hasMeaningfulValue(root[key]))
}

function getReviewStaffRoots(match) {
  return [
    match,
    match?.broadcast,
    match?.broadcast?.staff,
    match?.broadcast?.officials,
    match?.staff,
    match?.officials
  ].filter(Boolean)
}

function matchHasReviewStaffPayload(match) {
  return getReviewStaffRoots(match).some(rootHasReviewStaffPayload)
}

function hasReviewStaffPayload(data) {
  return safeArr(data?.matches).some(matchHasReviewStaffPayload)
}

function getMatchIdentity(match) {
  return String(
    match?.match_id ||
    match?.matchId ||
    match?.id ||
    match?.match_code ||
    match?.matchCode ||
    ''
  ).trim()
}

function mergeRootIfMissingStaff(targetRoot, sourceRoot) {
  if (!isObject(sourceRoot)) return targetRoot
  if (rootHasReviewStaffPayload(targetRoot)) return targetRoot

  return {
    ...sourceRoot,
    ...(isObject(targetRoot) ? targetRoot : {})
  }
}

function mergeReviewMatchStaffPayload(targetData, sourceData) {
  if (hasReviewStaffPayload(targetData) || !hasReviewStaffPayload(sourceData)) {
    return targetData
  }

  const sourceById = new Map()
  safeArr(sourceData?.matches).forEach(match => {
    const id = getMatchIdentity(match)
    if (id) sourceById.set(id, match)
  })

  let mergedCount = 0
  const matches = safeArr(targetData?.matches).map(match => {
    const sourceMatch = sourceById.get(getMatchIdentity(match))
    if (!sourceMatch || !matchHasReviewStaffPayload(sourceMatch)) return match

    const merged = {
      ...match,
      broadcast: mergeRootIfMissingStaff(match?.broadcast, sourceMatch.broadcast),
      staff: mergeRootIfMissingStaff(match?.staff, sourceMatch.staff),
      officials: mergeRootIfMissingStaff(match?.officials, sourceMatch.officials)
    }

    if (matchHasReviewStaffPayload(merged)) {
      mergedCount += 1
    }

    return merged
  })

  if (!mergedCount) return targetData

  return {
    ...targetData,
    matches,
    meta: {
      ...(targetData?.meta || {}),
      review_staff_payload_source: 'localDataUrl'
    }
  }
}

async function hydrateReviewStaffPayload(data, season) {
  if (!season?.reviewEnabled || !season.localDataUrl || hasReviewStaffPayload(data)) {
    return data
  }

  try {
    const localData = validatePublicDb(await fetchJson(season.localDataUrl, 'LOCAL_REVIEW_DATA_LOAD_FAILED'), season)
    return mergeReviewMatchStaffPayload(data, localData)
  } catch (error) {
    console.warn('Unable to load local review staff payload:', error)
    return data
  }
}

function validatePublicDb(data, season) {
  if (!Array.isArray(data?.teams) || !Array.isArray(data?.players) || !Array.isArray(data?.matches)) {
    throw new Error('DB_PAYLOAD_INVALID')
  }

  if (!Array.isArray(data?.player_totals)) {
    throw new Error('DB_PLAYER_TOTALS_MISSING')
  }

  if (season.reviewEnabled) {
    const hasReviewPayload = data?.meta?.review_ready &&
      Array.isArray(data?.team_reviews) &&
      data.team_reviews.length > 0

    if (!hasReviewPayload) {
      throw new Error('DB_REVIEW_PAYLOAD_MISSING')
    }
  }

  return resolvePublishedAdvanceTeams(attachSeasonMeta(data, season), season)
}

async function fetchFirstAvailableWithSource(urls, errorCode, validate = data => data, cached) {
  const errors = []

  for (const url of urls) {
    try {
      const response = await requestPublicJson(url, errorCode, { cached })
      return {
        data: validate(response.data),
        sourceUrl: url,
        etag: response.etag
      }
    } catch (error) {
      errors.push(`${url} (${error?.message || 'failed'})`)
    }
  }

  throw new Error(`${errorCode}: ${errors.join(' | ')}`)
}

async function fetchFirstAvailable(urls, errorCode, validate = data => data) {
  const result = await fetchFirstAvailableWithSource(urls, errorCode, validate)
  return result.data
}

function markDbSource(data, sourceUrl, season, fromCache = false, etag = '') {
  if (data && typeof data === 'object') {
    dbSourceBySnapshot.set(data, {
      kind: sourceUrl === season.localDataUrl
        ? (season.preferLocalData ? 'local-preview' : 'local-fallback')
        : 'published',
      sourceUrl,
      fromCache,
      etag
    })
  }
  return data
}

async function fetchDb(season, { allowFallback = true, cached } = {}) {
  const urls = getDbUrls(season).filter(url => allowFallback || season.preferLocalData || url !== season.localDataUrl)
  const { data, sourceUrl, etag } = await fetchFirstAvailableWithSource(
    urls,
    'DATA_LOAD_FAILED',
    payload => validatePublicDb(payload, season),
    cached && { data: cached, ...getDbSource(cached) }
  )

  const snapshot = markDbSource(await hydrateReviewStaffPayload(data, season), sourceUrl, season, false, etag)
  return snapshot
}

function getSnapshotTimestamp(data) {
  const value = data?.updated_at || data?.updatedAt || data?.meta?.updated_at || data?.meta?.ranking_as_of
  const timestamp = Date.parse(value || '')
  return Number.isFinite(timestamp) ? timestamp : null
}

export function selectNewestDbSnapshot(current, candidate) {
  if (!current) return candidate
  if (!candidate) return current
  if (current === candidate) return current
  if (isLocalDbFallback(current) && getDbSource(candidate).kind === 'published') return candidate

  const currentTimestamp = getSnapshotTimestamp(current)
  const candidateTimestamp = getSnapshotTimestamp(candidate)
  if (currentTimestamp !== null && (candidateTimestamp === null || candidateTimestamp < currentTimestamp)) {
    return current
  }
  // Preserve memoized selectors and in-progress screens when the publication
  // is unchanged, without hiding edits to snapshots that have no timestamp.
  if (currentTimestamp === candidateTimestamp && JSON.stringify(current) === JSON.stringify(candidate)) {
    if (dbSourceBySnapshot.has(candidate)) dbSourceBySnapshot.set(current, getDbSource(candidate))
    return current
  }

  return candidate
}

export function isLocalDbFallback(data) {
  return dbSourceBySnapshot.get(data)?.kind === 'local-fallback'
}

export function getDbSource(data) {
  return dbSourceBySnapshot.get(data) || {}
}

export async function getDb(seasonId, options = {}) {
  const season = getSeasonById(seasonId || getStoredSeasonId())
  const preferLocalData = options?.preferLocalData === true || season.preferLocalData
  const cacheKey = preferLocalData ? `${season.id}:local-first` : season.id
  const sourceSeason = preferLocalData && !season.preferLocalData
    ? { ...season, preferLocalData: true }
    : season
  if (dbCache.has(cacheKey)) {
    const cached = dbCache.get(cacheKey)
    dbSourceBySnapshot.set(cached, { ...getDbSource(cached), fromCache: true })
    return cached
  }

  if (!preferLocalData) {
    const stored = await readPublicSnapshot(season.id)
    if (stored?.data && stored.sourceUrl && stored.sourceUrl !== season.localDataUrl) {
      try {
        const cached = markDbSource(validatePublicDb(stored.data, season), stored.sourceUrl, season, true, stored.etag)
        dbCache.set(cacheKey, cached)
        return cached
      } catch { /* Old or incomplete cache entries fall through to the API. */ }
    }
  }

  const data = await fetchDb(sourceSeason)
  dbCache.set(cacheKey, data)
  if (getDbSource(data).kind === 'published') void savePublicSnapshot(season.id, data, getDbSource(data).sourceUrl, getDbSource(data).etag)
  return data
}

export async function refreshDb(seasonId, options = {}) {
  const season = getSeasonById(seasonId || getStoredSeasonId())
  const preferLocalData = options?.preferLocalData === true || season.preferLocalData
  const cacheKey = preferLocalData ? `${season.id}:local-first` : season.id
  const sourceSeason = preferLocalData && !season.preferLocalData
    ? { ...season, preferLocalData: true }
    : season
  // A failed refresh must remain a failure, even if a bundled file is readable.
  // The caller keeps its existing snapshot and offers retry.
  const fetchedData = await fetchDb(sourceSeason, { allowFallback: false, cached: dbCache.get(cacheKey) })
  const data = selectNewestDbSnapshot(dbCache.get(cacheKey), fetchedData)
  dbCache.set(cacheKey, data)
  if (getDbSource(data).kind === 'published') void savePublicSnapshot(season.id, data, getDbSource(data).sourceUrl, getDbSource(data).etag)
  return data
}

export async function getReviewReport(seasonId) {
  const season = getSeasonById(seasonId || getStoredSeasonId())
  if (reportCache.has(season.id)) return reportCache.get(season.id)

  const report = await fetchFirstAvailable(getReportUrls(season), 'REPORT_LOAD_FAILED')
  reportCache.set(season.id, report)
  return report
}

export function clearDbCache(seasonId) {
  if (!seasonId) {
    dbCache.clear()
    reportCache.clear()
    return
  }

  const season = getSeasonById(seasonId)
  dbCache.delete(season.id)
  dbCache.delete(`${season.id}:local-first`)
  reportCache.delete(season.id)
}

import { getSeasonById, getStoredSeasonId } from '../config/seasons.js'

const dbCache = new Map()
const reportCache = new Map()
const dbSourceBySnapshot = new WeakMap()

const REQUEST_TIMEOUT_MS = 25000
const METADATA_REQUEST_TIMEOUT_MS = 6000
const SNAPSHOT_DB_NAME = 'fries-cup-stats-public-snapshots'
const SNAPSHOT_DB_VERSION = 1
const SNAPSHOT_STORE_NAME = 'season-snapshots'
let snapshotDbPromise = null
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

function openSnapshotDb() {
  if (!globalThis.indexedDB) return Promise.resolve(null)
  if (snapshotDbPromise) return snapshotDbPromise

  snapshotDbPromise = new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(SNAPSHOT_DB_NAME, SNAPSHOT_DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SNAPSHOT_STORE_NAME)) {
        database.createObjectStore(SNAPSHOT_STORE_NAME, { keyPath: 'seasonId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch(error => {
    snapshotDbPromise = null
    throw error
  })

  return snapshotDbPromise
}

async function readSnapshotRecord(seasonId) {
  const database = await openSnapshotDb()
  if (!database) return null

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SNAPSHOT_STORE_NAME, 'readonly')
    const request = transaction.objectStore(SNAPSHOT_STORE_NAME).get(seasonId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

async function writeSnapshotRecord(record) {
  const database = await openSnapshotDb()
  if (!database) return

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(SNAPSHOT_STORE_NAME, 'readwrite')
    transaction.objectStore(SNAPSHOT_STORE_NAME).put(record)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

async function deleteSnapshotRecord(seasonId) {
  const database = await openSnapshotDb()
  if (!database) return

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(SNAPSHOT_STORE_NAME, 'readwrite')
    transaction.objectStore(SNAPSHOT_STORE_NAME).delete(seasonId)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

async function clearSnapshotRecords() {
  const database = await openSnapshotDb()
  if (!database) return

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(SNAPSHOT_STORE_NAME, 'readwrite')
    transaction.objectStore(SNAPSHOT_STORE_NAME).clear()
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function getEnvUrl(seasonId, kind) {
  const upperKind = kind === 'report' ? 'REPORT' : 'DATA'
  return import.meta.env[`VITE_PUBLIC_${seasonId}_${upperKind}_URL`] ||
    import.meta.env[`VITE_PUBLIC_${upperKind}_URL`] ||
    ''
}

function getDbUrls(season, { bootstrap = false } = {}) {
  const configuredRemoteUrls = season?.preferDirectData
    ? [season.dataUrl, season.proxyDataUrl]
    : [season.proxyDataUrl, season.dataUrl]
  const remoteUrls = [
    getEnvUrl(season.id, 'data'),
    ...configuredRemoteUrls
  ]
  const localUrls = [season.localDataUrl]

  return uniqueUrls((season?.preferLocalData || (bootstrap && season?.bootstrapLocalData))
    ? [...localUrls, ...remoteUrls]
    : [...remoteUrls, ...localUrls])
}

function toPublishMetadataUrl(url) {
  return String(url || '').replace(/\/data(?:\?.*)?$/, '')
}

function toVersionedDataUrl(url, version) {
  const text = String(url || '')
  if (!text || !version) return ''
  return text.replace(/\/publish\/latest\/data(?:\?.*)?$/, `/publish/${version}/data`)
}

function getPublishMetadataUrls(season) {
  return uniqueUrls([
    season.metadataUrl,
    toPublishMetadataUrl(season.dataUrl),
    toPublishMetadataUrl(getEnvUrl(season.id, 'data')),
    season.proxyMetadataUrl,
    toPublishMetadataUrl(season.proxyDataUrl)
  ])
}

function getVersionedDbUrls(season, version) {
  const configuredRemoteUrls = [
    getEnvUrl(season.id, 'data'),
    season.proxyDataUrl,
    season.dataUrl
  ]

  return uniqueUrls(configuredRemoteUrls.map(url => toVersionedDataUrl(url, version)))
}

function getReportUrls(season) {
  return uniqueUrls([
    getEnvUrl(season.id, 'report'),
    season.proxyReportUrl,
    season.reportUrl,
    season.localReportUrl
  ])
}

async function fetchJson(url, errorCode, options = {}) {
  const controller = new AbortController()
  const parentSignal = options.signal
  const handleParentAbort = () => controller.abort(parentSignal?.reason)
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    options.timeoutMs || REQUEST_TIMEOUT_MS
  )

  if (parentSignal?.aborted) controller.abort(parentSignal.reason)
  else parentSignal?.addEventListener('abort', handleParentAbort, { once: true })

  try {
    const res = await fetch(url, {
      cache: options.cache || 'no-cache',
      signal: controller.signal
    })
    if (!res.ok) throw new Error(`${errorCode}: ${res.status}`)
    return await res.json()
  } finally {
    globalThis.clearTimeout(timeout)
    parentSignal?.removeEventListener('abort', handleParentAbort)
  }
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

  return attachSeasonMeta(data, season)
}

async function fetchFirstAvailableWithSource(urls, errorCode, validate = data => data, fetchOptions = {}) {
  const errors = []

  for (const url of urls) {
    try {
      return {
        data: validate(await fetchJson(url, errorCode, fetchOptions)),
        sourceUrl: url
      }
    } catch (error) {
      errors.push(`${url} (${error?.message || 'failed'})`)
    }
  }

  throw new Error(`${errorCode}: ${errors.join(' | ')}`)
}

async function fetchFastestAvailableWithSource(urls, errorCode, validate = data => data, fetchOptions = {}) {
  const controller = new AbortController()
  const errors = []

  try {
    return await Promise.any(urls.map(async url => {
      try {
        return {
          data: validate(await fetchJson(url, errorCode, {
            ...fetchOptions,
            signal: controller.signal
          })),
          sourceUrl: url
        }
      } catch (error) {
        errors.push(`${url}: ${error.message}`)
        throw error
      }
    }))
  } catch {
    throw new Error(`${errorCode}: ${errors.join(' | ')}`)
  } finally {
    controller.abort()
  }
}

async function fetchFirstAvailable(urls, errorCode, validate = data => data, fetchOptions = {}) {
  const result = await fetchFirstAvailableWithSource(urls, errorCode, validate, fetchOptions)
  return result.data
}

function normalizeSnapshotVersion(value) {
  const version = Number(value)
  return Number.isFinite(version) && version > 0 ? version : null
}

function markDbSource(data, sourceUrl, season, snapshot = {}) {
  if (data && typeof data === 'object') {
    dbSourceBySnapshot.set(data, {
      kind: snapshot.kind || (sourceUrl === season.localDataUrl ? 'local-fallback' : 'published'),
      sourceUrl,
      version: normalizeSnapshotVersion(snapshot.version),
      checksum: String(snapshot.checksum || '')
    })
  }
  return data
}

async function fetchDbFromUrls(season, urls, snapshot = {}, fetchOptions = {}) {
  const { strategy, ...requestOptions } = fetchOptions
  const fetchAvailable = strategy === 'fastest'
    ? fetchFastestAvailableWithSource
    : fetchFirstAvailableWithSource
  const { data, sourceUrl } = await fetchAvailable(
    urls,
    'DATA_LOAD_FAILED',
    payload => validatePublicDb(payload, season),
    requestOptions
  )

  return markDbSource(await hydrateReviewStaffPayload(data, season), sourceUrl, season, snapshot)
}

async function fetchDb(season, options = {}) {
  return fetchDbFromUrls(season, getDbUrls(season, options))
}

function validatePublishMetadata(payload) {
  const published = payload?.publishVersion || payload
  const version = normalizeSnapshotVersion(published?.version)
  if (!version || String(published?.status || 'PUBLISHED').toUpperCase() !== 'PUBLISHED') {
    throw new Error('PUBLISH_METADATA_INVALID')
  }

  return {
    version,
    checksum: String(published?.checksum || published?.contract?.checksum || ''),
    publishedAt: String(published?.publishedAt || published?.createdAt || '')
  }
}

async function fetchLatestPublishMetadata(season) {
  const { data, sourceUrl } = await fetchFirstAvailableWithSource(
    getPublishMetadataUrls(season),
    'PUBLISH_METADATA_LOAD_FAILED',
    validatePublishMetadata,
    { timeoutMs: METADATA_REQUEST_TIMEOUT_MS }
  )

  return { ...data, sourceUrl }
}

async function readPersistedDb(season) {
  try {
    const record = await readSnapshotRecord(season.id)
    if (!record?.data) return null
    const data = validatePublicDb(record.data, season)
    return markDbSource(data, record.sourceUrl || 'indexeddb', season, {
      kind: 'persistent-cache',
      version: record.version,
      checksum: record.checksum
    })
  } catch (error) {
    console.warn('Unable to read cached public snapshot:', error)
    return null
  }
}

async function persistDb(data, season) {
  const snapshot = dbSourceBySnapshot.get(data)
  if (!season.persistPublishedData || !snapshot?.version || snapshot.kind === 'local-fallback') return

  try {
    await writeSnapshotRecord({
      seasonId: season.id,
      version: snapshot.version,
      checksum: snapshot.checksum,
      sourceUrl: snapshot.sourceUrl,
      savedAt: new Date().toISOString(),
      data
    })
  } catch (error) {
    console.warn('Unable to cache public snapshot:', error)
  }
}

async function fetchPublishedDb(season, metadata) {
  const urls = getVersionedDbUrls(season, metadata.version)
  const data = await fetchDbFromUrls(season, urls, metadata, {
    cache: 'force-cache',
    strategy: 'fastest'
  })
  await persistDb(data, season)
  return data
}

function getSnapshotTimestamp(data) {
  const value = data?.updated_at || data?.updatedAt || data?.meta?.updated_at
  const timestamp = Date.parse(value || '')
  return Number.isFinite(timestamp) ? timestamp : null
}

export function selectNewestDbSnapshot(current, candidate) {
  if (!current) return candidate
  if (!candidate) return current

  const currentVersion = dbSourceBySnapshot.get(current)?.version
  const candidateVersion = dbSourceBySnapshot.get(candidate)?.version
  if (currentVersion !== null && currentVersion !== undefined) {
    if (candidateVersion === null || candidateVersion === undefined || candidateVersion < currentVersion) {
      return current
    }
    if (candidateVersion > currentVersion) return candidate
  }

  const currentTimestamp = getSnapshotTimestamp(current)
  const candidateTimestamp = getSnapshotTimestamp(candidate)
  if (currentTimestamp !== null && (candidateTimestamp === null || candidateTimestamp < currentTimestamp)) {
    return current
  }

  return candidate
}

export function isLocalDbFallback(data) {
  return dbSourceBySnapshot.get(data)?.kind === 'local-fallback'
}

export function getDbSnapshotVersion(data) {
  return dbSourceBySnapshot.get(data)?.version || null
}

export async function getDb(seasonId) {
  const season = getSeasonById(seasonId || getStoredSeasonId())
  if (dbCache.has(season.id)) return dbCache.get(season.id)

  if (season.persistPublishedData) {
    const persisted = await readPersistedDb(season)
    if (persisted) {
      dbCache.set(season.id, persisted)
      return persisted
    }

    return refreshDb(season.id)
  }

  const data = await fetchDb(season, { bootstrap: true })
  dbCache.set(season.id, data)
  return data
}

export async function refreshDb(seasonId) {
  const season = getSeasonById(seasonId || getStoredSeasonId())

  if (season.persistPublishedData) {
    const current = dbCache.get(season.id)

    try {
      const metadata = await fetchLatestPublishMetadata(season)
      if (current && getDbSnapshotVersion(current) === metadata.version) return current

      try {
        const fetchedData = await fetchPublishedDb(season, metadata)
        const data = selectNewestDbSnapshot(current, fetchedData)
        dbCache.set(season.id, data)
        return data
      } catch (error) {
        if (current) return current
        if (!season.localDataUrl) throw error
        const fallback = await fetchDbFromUrls(season, [season.localDataUrl])
        dbCache.set(season.id, fallback)
        return fallback
      }
    } catch (error) {
      if (current) return current
      if (!season.localDataUrl) throw error
      const fallback = await fetchDbFromUrls(season, [season.localDataUrl])
      dbCache.set(season.id, fallback)
      return fallback
    }
  }

  const fetchedData = await fetchDb(season)
  const data = selectNewestDbSnapshot(dbCache.get(season.id), fetchedData)
  dbCache.set(season.id, data)
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
    void clearSnapshotRecords().catch(error => {
      console.warn('Unable to clear cached public snapshots:', error)
    })
    return
  }

  const season = getSeasonById(seasonId)
  dbCache.delete(season.id)
  reportCache.delete(season.id)
  void deleteSnapshotRecord(season.id).catch(error => {
    console.warn('Unable to clear cached public snapshot:', error)
  })
}

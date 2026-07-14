import { getSeasonById, getStoredSeasonId } from '../config/seasons.js'

const dbCache = new Map()
const reportCache = new Map()

const REQUEST_TIMEOUT_MS = 12000

function uniqueUrls(urls) {
  return Array.from(new Set(urls.filter(Boolean)))
}

function getEnvUrl(seasonId, kind) {
  const upperKind = kind === 'report' ? 'REPORT' : 'DATA'
  return import.meta.env[`VITE_PUBLIC_${seasonId}_${upperKind}_URL`] ||
    import.meta.env[`VITE_PUBLIC_${upperKind}_URL`] ||
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
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    })
    if (!res.ok) throw new Error(`${errorCode}: ${res.status}`)
    return res.json()
  } finally {
    globalThis.clearTimeout(timeout)
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

async function fetchFirstAvailable(urls, errorCode, validate = data => data) {
  const errors = []

  for (const url of urls) {
    try {
      return validate(await fetchJson(url, errorCode))
    } catch (error) {
      errors.push(`${url} (${error?.message || 'failed'})`)
    }
  }

  throw new Error(`${errorCode}: ${errors.join(' | ')}`)
}

async function fetchDb(season) {
  return fetchFirstAvailable(
    getDbUrls(season),
    'DATA_LOAD_FAILED',
    payload => validatePublicDb(payload, season)
  )
}

export async function getDb(seasonId) {
  const season = getSeasonById(seasonId || getStoredSeasonId())
  if (dbCache.has(season.id)) return dbCache.get(season.id)

  const data = await fetchDb(season)
  dbCache.set(season.id, data)
  return data
}

export async function refreshDb(seasonId) {
  const season = getSeasonById(seasonId || getStoredSeasonId())
  const data = await fetchDb(season)
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
    return
  }

  const season = getSeasonById(seasonId)
  dbCache.delete(season.id)
  reportCache.delete(season.id)
}

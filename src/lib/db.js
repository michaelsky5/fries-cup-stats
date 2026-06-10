let dbCache = null
let reportCache = null

const LOCAL_DB_URL = '/data/friescup_db_review_ready.json'
const LOCAL_REPORT_URL = '/data/friescup_db_review_ready_report.json'
const PUBLISHED_DB_URL = 'https://admin.fries-cup.com/api/public/seasons/FCA26/publish/latest/data'
const PUBLISHED_REPORT_URL = 'https://admin.fries-cup.com/api/public/seasons/FCA26/publish/latest/report'
const REQUEST_TIMEOUT_MS = 4500

function uniqueUrls(urls) {
  return Array.from(new Set(urls.filter(Boolean)))
}

const DB_URLS = uniqueUrls([
  import.meta.env.VITE_PUBLIC_DATA_URL,
  import.meta.env.PROD ? PUBLISHED_DB_URL : '',
  LOCAL_DB_URL
])

const REPORT_URLS = uniqueUrls([
  import.meta.env.VITE_PUBLIC_REPORT_URL,
  import.meta.env.PROD ? PUBLISHED_REPORT_URL : '',
  LOCAL_REPORT_URL
])

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

function validatePublicDb(data) {
  if (!Array.isArray(data?.teams) || !Array.isArray(data?.players) || !Array.isArray(data?.matches)) {
    throw new Error('DB_PAYLOAD_INVALID')
  }

  if (!Array.isArray(data?.player_totals)) {
    throw new Error('DB_PLAYER_TOTALS_MISSING')
  }

  if (!data?.meta?.review_ready || !Array.isArray(data?.team_reviews) || data.team_reviews.length === 0) {
    throw new Error('DB_REVIEW_PAYLOAD_MISSING')
  }

  return data
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

export async function getDb() {
  if (dbCache) return dbCache
  dbCache = await fetchFirstAvailable(DB_URLS, 'DB_LOAD_FAILED', validatePublicDb)
  return dbCache
}

export async function getReviewReport() {
  if (reportCache) return reportCache
  reportCache = await fetchFirstAvailable(REPORT_URLS, 'REPORT_LOAD_FAILED')
  return reportCache
}

export function clearDbCache() {
  dbCache = null
  reportCache = null
}

let dbCache = null
let reportCache = null

const DB_URL = '/data/friescup_db_review_ready.json'
const REPORT_URL = '/data/friescup_db_review_ready_report.json'

async function fetchJson(url, errorCode) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${errorCode}: ${res.status}`)
  return res.json()
}

export async function getDb() {
  if (dbCache) return dbCache
  dbCache = await fetchJson(DB_URL, 'DB_LOAD_FAILED')
  return dbCache
}

export async function getReviewReport() {
  if (reportCache) return reportCache
  reportCache = await fetchJson(REPORT_URL, 'REPORT_LOAD_FAILED')
  return reportCache
}

export function clearDbCache() {
  dbCache = null
  reportCache = null
}
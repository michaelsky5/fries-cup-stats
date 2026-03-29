let dbCache = null

export async function getDb() {
  if (dbCache) return dbCache
  const res = await fetch('/data/friescup_db.json', { cache: 'no-store' })
  if (!res.ok) throw new Error(`DB_LOAD_FAILED: ${res.status}`)
  dbCache = await res.json()
  return dbCache
}

export function clearDbCache() {
  dbCache = null
}
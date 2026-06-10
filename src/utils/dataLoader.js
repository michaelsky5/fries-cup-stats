import { getDb } from '../lib/db.js'

export const loadAllData = async () => {
  try {
    const db = await getDb()
    console.log('[DB LOADED] FriesCup public data:', db)
    return db
  } catch (error) {
    console.error('[DB_LOAD_FAILED] Unable to load FriesCup public data:', error)
    return null
  }
}

import { getDb } from '../lib/db.js'

export const loadAllData = async () => {
  try {
    const db = await getDb()
    return db
  } catch (error) {
    console.error('Unable to load FriesCup public data:', error)
    return null
  }
}

const DATABASE = 'fries-cup-stats-public'
const STORE = 'snapshots'

// Public snapshots can exceed localStorage limits. Storage failures must never
// prevent reading the published API or the bundled fallback.
function transact(seasonId, value) {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    let database
    let settled = false
    const finish = result => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      database?.close()
      resolve(result)
    }
    const timer = setTimeout(() => finish(null), 1200)
    try {
      const open = indexedDB.open(DATABASE, 1)
      open.onupgradeneeded = () => open.result.createObjectStore(STORE)
      open.onerror = () => finish(null)
      open.onblocked = () => finish(null)
      open.onsuccess = () => {
        database = open.result
        if (settled) { database.close(); return }
        try {
          const transaction = database.transaction(STORE, value ? 'readwrite' : 'readonly')
          const request = value
            ? transaction.objectStore(STORE).put(value, seasonId)
            : transaction.objectStore(STORE).get(seasonId)
          transaction.oncomplete = () => finish(value || request.result || null)
          transaction.onerror = () => finish(null)
          transaction.onabort = () => finish(null)
        } catch { finish(null) }
      }
    } catch { finish(null) }
  })
}

export const readPublicSnapshot = seasonId => transact(seasonId)
export const savePublicSnapshot = (seasonId, data, sourceUrl, etag = '') => transact(seasonId, { data, sourceUrl, etag })

const SCOUTING_ARTIFACT_BASE = '/data/scouting/fcr26'
const PLAYER_ID_PATTERN = /^FCR26-P\d{4}$/
const requestCache = new Map()
const resolvedCache = new Map()

function loadJson(path) {
  if (requestCache.has(path)) return requestCache.get(path)

  const request = fetch(path, {
    cache: import.meta.env.DEV ? 'no-store' : 'force-cache'
  }).then(response => {
    if (!response.ok) throw new Error(`SCOUTING_ARTIFACT_LOAD_FAILED: ${response.status}`)
    return response.json()
  }).then(data => {
    resolvedCache.set(path, data)
    return data
  }).catch(error => {
    requestCache.delete(path)
    throw error
  })

  requestCache.set(path, request)
  return request
}

export function loadScoutingIndex() {
  return loadJson(`${SCOUTING_ARTIFACT_BASE}/index.json`)
}

export function getCachedScoutingIndex() {
  return resolvedCache.get(`${SCOUTING_ARTIFACT_BASE}/index.json`) || null
}

export function loadScoutingPlayer(playerId) {
  if (!PLAYER_ID_PATTERN.test(playerId || '')) {
    return Promise.reject(new Error('SCOUTING_PLAYER_ID_INVALID'))
  }
  return loadJson(`${SCOUTING_ARTIFACT_BASE}/players/${encodeURIComponent(playerId)}.json`)
}

export function getCachedScoutingPlayer(playerId) {
  if (!PLAYER_ID_PATTERN.test(playerId || '')) return null
  return resolvedCache.get(`${SCOUTING_ARTIFACT_BASE}/players/${encodeURIComponent(playerId)}.json`) || null
}

export function preloadScoutingPlayer(playerId) {
  loadScoutingPlayer(playerId).catch(() => {})
}

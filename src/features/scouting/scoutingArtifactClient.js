import { SCOUTING_REPORT_VERSION } from './scoutingArtifactModel.js'

const SCOUTING_ARTIFACT_BASE = '/data/scouting/fcr26'
const SCOUTING_ARTIFACT_REVISION = encodeURIComponent(SCOUTING_REPORT_VERSION)
const PLAYER_ID_PATTERN = /^FCR26-P\d{4}$/
const requestCache = new Map()
const resolvedCache = new Map()

function artifactPath(relativePath) {
  return `${SCOUTING_ARTIFACT_BASE}/${relativePath}?v=${SCOUTING_ARTIFACT_REVISION}`
}

const SCOUTING_INDEX_PATH = artifactPath('index.json')

function scoutingPlayerPath(playerId) {
  return artifactPath(`players/${encodeURIComponent(playerId)}.json`)
}

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
  return loadJson(SCOUTING_INDEX_PATH)
}

export function getCachedScoutingIndex() {
  return resolvedCache.get(SCOUTING_INDEX_PATH) || null
}

export function loadScoutingPlayer(playerId) {
  if (!PLAYER_ID_PATTERN.test(playerId || '')) {
    return Promise.reject(new Error('SCOUTING_PLAYER_ID_INVALID'))
  }
  return loadJson(scoutingPlayerPath(playerId))
}

export function getCachedScoutingPlayer(playerId) {
  if (!PLAYER_ID_PATTERN.test(playerId || '')) return null
  return resolvedCache.get(scoutingPlayerPath(playerId)) || null
}

export function preloadScoutingPlayer(playerId) {
  loadScoutingPlayer(playerId).catch(() => {})
}

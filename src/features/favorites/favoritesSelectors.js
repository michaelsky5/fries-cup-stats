import { EMPTY_FAVORITES, MAX_FAVORITE_PLAYERS, MAX_FAVORITE_TEAMS } from './favoritesConstants.js'

const safeArr = value => Array.isArray(value) ? value : []

function normalize(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalize(value).toLowerCase()
}

function uniqueLimited(values, limit) {
  const seen = new Set()
  const result = []

  safeArr(values).forEach(value => {
    const id = normalize(value)
    const key = normalizeKey(id)
    if (!id || seen.has(key) || result.length >= limit) return
    seen.add(key)
    result.push(id)
  })

  return result
}

export function getTeamFavoriteId(team) {
  return normalize(team?.team_short_name || team?.short || team?.team_id || team?.id || team?.team_name || team?.name)
}

export function getTeamRouteId(team) {
  return normalize(team?.team_id || team?.id || getTeamFavoriteId(team))
}

export function getPlayerFavoriteId(player) {
  return normalize(player?.player_id || player?.id || player?.display_name || player?.nickname || player?.player_name)
}

export function getTeamShortName(team) {
  return normalize(team?.team_short_name || team?.short || team?.team_id || team?.id || team?.team_name || team?.name || 'TBD')
}

export function getTeamFullName(team) {
  return normalize(team?.team_name || team?.name || getTeamShortName(team))
}

export function getPlayerDisplayName(player) {
  return normalize(player?.display_name || player?.nickname || player?.player_name || player?.player_id || 'Unknown')
}

export function getPlayerBattleTag(player) {
  const tag = normalize(
    player?.battle_tag ||
    player?.battleTag ||
    player?.battletag ||
    player?.player_name ||
    player?.player_id
  )
  return tag && tag !== getPlayerDisplayName(player) ? tag : ''
}

export function getTeamIdentityValues(team) {
  return [
    team?.team_id,
    team?.id,
    team?.team_short_name,
    team?.short,
    team?.team_name,
    team?.name
  ].map(normalize).filter(Boolean)
}

export function getPlayerIdentityValues(player) {
  return [
    player?.player_id,
    player?.id,
    player?.battle_tag,
    player?.battleTag,
    player?.battletag,
    player?.display_name,
    player?.nickname,
    player?.player_name
  ].map(normalize).filter(Boolean)
}

export function identityMatches(value, candidates) {
  const key = normalizeKey(value)
  if (!key) return false
  return safeArr(candidates).some(candidate => normalizeKey(candidate) === key)
}

export function getTeamIdentityKey(teamOrId) {
  if (!teamOrId || typeof teamOrId !== 'object') return normalize(teamOrId)
  return getTeamFavoriteId(teamOrId)
}

export function getPlayerIdentityKey(playerOrId) {
  if (!playerOrId || typeof playerOrId !== 'object') return normalize(playerOrId)
  return getPlayerFavoriteId(playerOrId)
}

function buildResolver(items, getCanonicalId, getIdentities) {
  const byIdentity = new Map()
  const ambiguousKeys = new Set()

  safeArr(items).forEach(item => {
    const canonicalId = getCanonicalId(item)
    if (!canonicalId) return

    getIdentities(item).forEach(identity => {
      const key = normalizeKey(identity)
      if (!key || ambiguousKeys.has(key)) return

      const existingId = byIdentity.get(key)
      if (!existingId) {
        byIdentity.set(key, canonicalId)
        return
      }

      if (normalizeKey(existingId) !== normalizeKey(canonicalId)) {
        byIdentity.delete(key)
        ambiguousKeys.add(key)
      }
    })
  })

  return value => {
    const key = normalizeKey(value)
    if (!key || ambiguousKeys.has(key)) return ''
    return byIdentity.get(key) || ''
  }
}

function normalizeFavoritesShape(favorites) {
  const source = favorites && typeof favorites === 'object' ? favorites : {}
  const favoriteTeamIds = safeArr(source.favoriteTeamIds ?? source.teamIds ?? source.teams)
  const favoritePlayerIds = safeArr(source.favoritePlayerIds ?? source.playerIds ?? source.players)

  return {
    primaryTeamId: source.primaryTeamId ?? source.primaryTeam ?? source.mainTeamId ?? null,
    favoriteTeamIds,
    favoritePlayerIds
  }
}

export function sanitizeFavoritesForSeason(favorites, db) {
  const source = normalizeFavoritesShape(favorites)
  const resolveTeamId = buildResolver(safeArr(db?.teams), getTeamFavoriteId, getTeamIdentityValues)
  const resolvePlayerId = buildResolver(safeArr(db?.players), getPlayerFavoriteId, getPlayerIdentityValues)

  const hasTeamDirectory = safeArr(db?.teams).length > 0
  const hasPlayerDirectory = safeArr(db?.players).length > 0

  const favoriteTeamIds = uniqueLimited(source.favoriteTeamIds, MAX_FAVORITE_TEAMS)
    .map(id => hasTeamDirectory ? resolveTeamId(id) : normalize(id))
    .filter(Boolean)

  const favoritePlayerIds = uniqueLimited(source.favoritePlayerIds, MAX_FAVORITE_PLAYERS)
    .map(id => hasPlayerDirectory ? resolvePlayerId(id) : normalize(id))
    .filter(Boolean)

  const teamIds = uniqueLimited(favoriteTeamIds, MAX_FAVORITE_TEAMS)
  const playerIds = uniqueLimited(favoritePlayerIds, MAX_FAVORITE_PLAYERS)

  const requestedPrimary = hasTeamDirectory ? resolveTeamId(source.primaryTeamId) : normalize(source.primaryTeamId)
  const primaryTeamId = teamIds.includes(requestedPrimary)
    ? requestedPrimary
    : teamIds[0] || null

  return {
    ...EMPTY_FAVORITES,
    primaryTeamId,
    favoriteTeamIds: teamIds,
    favoritePlayerIds: playerIds
  }
}

export function favoriteIncludes(favoriteIds, itemOrId, getIdentities = value => [value]) {
  const favoriteKeys = new Set(safeArr(favoriteIds).map(normalizeKey).filter(Boolean))
  if (!itemOrId || favoriteKeys.size === 0) return false

  if (typeof itemOrId === 'object') {
    return getIdentities(itemOrId).some(identity => favoriteKeys.has(normalizeKey(identity)))
  }

  return favoriteKeys.has(normalizeKey(itemOrId))
}

export function moveFavoriteItem(ids, fromIndex, toIndex, fixedFirst = false) {
  const list = [...safeArr(ids)]
  const minIndex = fixedFirst ? 1 : 0
  const from = Math.max(minIndex, Number(fromIndex))
  const to = Math.max(minIndex, Number(toIndex))

  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return list
  if (from < minIndex || from >= list.length || to < minIndex || to >= list.length) return list

  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
  return list
}

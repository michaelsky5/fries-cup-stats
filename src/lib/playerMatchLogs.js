import { getOwHeroCanonicalKey } from './heroes.js'

const text = value => String(value ?? '').trim()
const field = (row, names) => names.map(name => row?.[name]).find(value => text(value) !== '')
const list = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const metrics = [
  ['elims', 'eliminations', 'total_elim', 'elim'], ['assists', 'asts', 'total_ast', 'ast'],
  ['deaths', 'dths', 'total_dth', 'dth'], ['damage', 'total_dmg', 'dmg'],
  ['healing', 'heal', 'total_heal'], ['blocked', 'block', 'mitigation', 'total_block']
]

// Imported IDs describe provenance once a canonical match ID is available.
// Keep distinct statistics, teams and map/hero segments, and do not deduplicate
// records whose match or map identity is unavailable.
export function getMatchLogDedupKey(log, player = {}) {
  const matchId = text(field(log, ['matchId', 'match_id', 'matchID']))
  const rawMatchId = text(field(log, ['rawMatchId', 'raw_match_id', 'rawMatchID']))
  const mapOrder = text(field(log, ['mapOrder', 'map_order', 'gameNumber']))
  const mapName = text(field(log, ['mapName', 'map_name']))
  if (!(matchId || rawMatchId) || !((mapOrder && mapOrder !== '0') || mapName)) return null
  const hero = field(log, ['hero', 'heroes_played', 'heroName'])
  const minutes = Number(field(log, ['playtimeMinutes', 'raw_time_mins', 'timeMins']) ?? 0)
  const totals = metrics.map(names => Number(field(log?.totals, names) ?? field(log, names) ?? 0))
  if (![minutes, ...totals].every(Number.isFinite)) return null
  return JSON.stringify([
    player.player_id || player.id || player.playerId || '',
    matchId ? 'canonical' : 'raw', matchId || rawMatchId,
    // A raw-only identifier need not be unique across imported sources/stages.
    matchId ? '' : log?.source, matchId ? '' : log?.stage,
    mapOrder, mapName, field(log, ['mapType', 'map_type']),
    field(log, ['teamId', 'team_id']), getOwHeroCanonicalKey(hero) || hero,
    field(log, ['role', 'officialRole']) || player.role,
    field(log, ['rowTime', 'row_time', 'time']), minutes, ...totals
  ].map(value => text(value).toLowerCase()))
}

export function selectPlayerMatchLogs(player) {
  const matchLogs = list(player?.match_logs)
  const liveLogs = list(player?.live_match_logs)
  if (matchLogs.length) return { source: 'match_logs', logs: matchLogs, skippedLiveLogs: liveLogs.length }
  if (liveLogs.length) return { source: 'live_match_logs', logs: liveLogs, skippedLiveLogs: 0 }
  return { source: 'none', logs: [], skippedLiveLogs: 0 }
}

export function getPlayerMatchLogs(player) {
  const selected = selectPlayerMatchLogs(player)
  const seen = new Set()
  const duplicateLogs = []
  const logs = selected.logs.filter(log => {
    const key = getMatchLogDedupKey(log, player)
    if (key == null) return true
    if (seen.has(key)) { duplicateLogs.push(log); return false }
    seen.add(key)
    return true
  })
  return { ...selected, logs, duplicateLogs }
}

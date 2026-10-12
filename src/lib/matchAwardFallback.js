import { ROLE_ORDER, scoreLeaderboardEntriesLegacy, compareLeaderboardEntries } from './leaderboardScoring.js'
import { normalizeLeaderboardRole } from './leaderboardSelectors.js'

const presentNumber = value => ['number', 'string'].includes(typeof value) && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
const totals = row => [row.eliminations, row.assists, row.deaths, row.damage, row.healing, row.mitigation ?? row.blocked]
const playerId = row => String(row.player_id || '').trim()
function hasMapDuration(value) {
  const parts = String(value || '').trim().split(':')
  return [2, 3].includes(parts.length) && parts.every(part => /^\d+$/.test(part))
    && parts.slice(1).every(part => Number(part) < 60) && parts.some(part => Number(part) > 0)
}

// This is an award-only comparison of this series. It never supplies a missing
// v1.5 rating, borrows a different patch, or looks at later matches.
export function buildMatchAwardFallback(entries, maps, minimumMaps) {
  if (!maps.length || !entries.length) return null
  for (const map of maps) {
    if (map.is_administrative || map.rating_eligible === false || !hasMapDuration(map.match_time)) return null
    const sides = [map.team_a_stats, map.team_b_stats]
    if (!sides.every(rows => Array.isArray(rows) && rows.length)) return null
    const identities = new Set()
    for (const rows of sides) {
      if (new Set(rows.map(playerId)).size < 5) return null
      for (const role of ROLE_ORDER) {
        const count = new Set(rows.filter(row => normalizeLeaderboardRole(row.role) === role).map(playerId)).size
        if (count < (role === 'TANK' ? 1 : 2)) return null
      }
      for (const row of rows) {
        const id = playerId(row)
        if (!id || !ROLE_ORDER.includes(normalizeLeaderboardRole(row.role)) || !totals(row).every(presentNumber)) return null
      }
      const sideIds = new Set(rows.map(playerId))
      if ([...sideIds].some(id => identities.has(id))) return null
      sideIds.forEach(id => identities.add(id))
    }
  }
  if (entries.some(entry => !Number.isFinite(entry.roleTimeMins) || entry.roleTimeMins <= 0)) return null
  // Reuse the existing per-10, same-role comparison and hero-profile weights.
  // All candidates use one method; the comparison score stays inside the award.
  const compared = scoreLeaderboardEntriesLegacy(entries, 0)
    .filter(entry => entry.maps_played >= minimumMaps && Number.isFinite(entry.roleScore))
    .sort(compareLeaderboardEntries)
  return compared.length ? { method: 'MATCH_RELATIVE', version: 'match-relative-v1', entries: compared } : null
}

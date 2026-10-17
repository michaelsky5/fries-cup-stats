import { getLeaderboardRows, normalizeLeaderboardRole } from '../../lib/leaderboardSelectors.js'
import { getPlayerMatchLogs } from '../../lib/playerMatchLogs.js'
import { getOwHeroCanonicalKey, getOwHeroCanonicalName } from '../../lib/heroes.js'
import { weeklyMatchState } from '../weekly-overview/weeklyOverviewModel.js'
import { getTeamDisplayIdentity, getTeamDisplayName } from '../../lib/teamDisplayIdentity.js'

const text = value => String(value ?? '').trim()
const key = value => text(value).toLowerCase()
const list = value => Array.isArray(value) ? value : []
const sampleNumber = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0
const playerId = player => text(player?.identity?.playerId || player?.player_id)
const metricIds = { TANK: ['block', 'elim'], DPS: ['dmg', 'elim'], SUPPORT: ['heal', 'ast'] }
const teamIds = team => [team?.id, team?.team_id, team?.short, team?.team_short_name, team?.name, team?.team_name].map(key).filter(Boolean)

export function getPlayerTeamDisplayIdentity(player) {
  return getTeamDisplayIdentity(player?.teamShortName, player?.teamFullName)
}

export function getPlayerRosterPeers(player, candidates, limit = 3) {
  const ownId = key(playerId(player))
  const teamId = key(player?.teamRouteId || player?.team_id)
  if (!ownId || !teamId || /^[?？—-]+$/.test(teamId)) return []
  const seen = new Set([ownId])
  const roleOrder = { TANK: 0, DPS: 1, SUPPORT: 2 }
  return list(candidates).filter(candidate => {
    const id = key(playerId(candidate))
    if (!id || seen.has(id) || key(candidate?.teamRouteId || candidate?.team_id) !== teamId || !text(candidate?.identity?.primary)) return false
    seen.add(id)
    return true
  }).sort((a, b) =>
    (roleOrder[normalizeLeaderboardRole(a.registrationRole)] ?? 3) - (roleOrder[normalizeLeaderboardRole(b.registrationRole)] ?? 3) ||
    text(a.identity.primary).localeCompare(text(b.identity.primary), 'zh-Hans-CN', { numeric: true }) ||
    playerId(a).localeCompare(playerId(b))
  ).slice(0, Math.max(0, Math.floor(Number(limit) || 0)))
}

export function buildPlayerPreviewLookup(db, season) {
  const entries = new Map(getLeaderboardRows(db, season).map(entry => [`${key(entry.player_id)}:${entry.role}`, entry]))
  const players = new Map(list(db?.players).map(player => [key(playerId(player)), player]))
  list(db?.player_totals).forEach(total => {
    const id = key(playerId(total))
    if (id) players.set(id, { ...players.get(id), ...total })
  })
  const teams = new Map()
  list(db?.teams).forEach(team => teamIds(team).forEach(id => teams.set(id, team)))
  const matches = new Map()
  list(db?.matches).forEach(match => {
    for (const alias of [match.match_id, match.raw_match_id, match.id]) {
      if (text(alias)) matches.set(key(alias), match)
    }
  })
  return { entries, matches, teams, players }
}

function getSeasonAppearance(source, lookup) {
  const selected = getPlayerMatchLogs(source)
  const summary = { maps: sampleNumber(source?.maps_played), minutes: sampleNumber(source?.raw_time_mins) }
  const duplicatedPlaytime = selected.duplicateLogs.some(log => sampleNumber(log.playtimeMinutes ?? log.raw_time_mins ?? log.timeMins) > 0)
  // Published totals may cover more maps than the available detailed logs.
  // Only repair them from logs when duplicate imported segments are present.
  if ((summary.maps || summary.minutes) && !duplicatedPlaytime) return summary
  const maps = new Set()
  let minutes = 0
  selected.logs.forEach(log => {
    const time = sampleNumber(log.playtimeMinutes ?? log.raw_time_mins ?? log.timeMins)
    if (!time) return
    minutes += time
    const alias = log.matchId || log.match_id || log.rawMatchId || log.raw_match_id
    const match = lookup.matches.get(key(alias))
    const matchId = key(match?.match_id || match?.id || alias)
    const map = text(log.mapOrder || log.map_order || log.gameNumber || log.mapName || log.map_name)
    // Hero changes and multiple roles on the same map still count as one map.
    if (matchId && map) maps.add(`${matchId}:${map}`)
  })
  return minutes ? { maps: maps.size, minutes } : summary
}

function getPreviewHeroes(source) {
  const seen = new Set()
  const heroMinutes = new Map()
  getPlayerMatchLogs(source).logs.forEach(log => {
    const hero = getOwHeroCanonicalName(log.hero || log.heroName || log.heroes_played)
    const minutes = sampleNumber(log.playtimeMinutes ?? log.raw_time_mins ?? log.timeMins)
    if (hero && minutes) heroMinutes.set(hero, (heroMinutes.get(hero) || 0) + minutes)
  })
  const playedHeroes = [...heroMinutes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([hero]) => hero)
  return [source?.most_played_hero, ...list(source?.top_3_heroes), ...playedHeroes, ...list(source?.heroNames)]
    .filter(hero => {
      const id = getOwHeroCanonicalKey(hero)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    }).map(getOwHeroCanonicalName).slice(0, 3)
}

function getLatestAppearance(player, lookup, role) {
  const candidates = new Map()
  getPlayerMatchLogs(player).logs.forEach(log => {
    const minutes = Number(log.playtimeMinutes ?? log.raw_time_mins ?? log.timeMins)
    if (!Number.isFinite(minutes) || minutes <= 0) return
    if (role && normalizeLeaderboardRole(log.role || log.officialRole) !== role) return
    const match = [log.matchId, log.match_id, log.rawMatchId, log.raw_match_id]
      .map(alias => lookup.matches.get(key(alias))).find(Boolean)
    const matchId = text(match?.match_id || match?.id)
    if (!matchId || candidates.has(matchId)) return
    // The recorded team takes precedence after a player transfers teams.
    const recordedTeam = text(log.teamId || log.team_id)
    const ownIds = recordedTeam ? [key(recordedTeam)] : [player.team_id, player.teamShortName, player.teamFullName].map(key).filter(Boolean)
    const side = ownIds.some(id => teamIds(match.team_a).includes(id)) ? 'A'
      : ownIds.some(id => teamIds(match.team_b).includes(id)) ? 'B' : ''
    if (!side) return
    const own = side === 'A' ? match.team_a : match.team_b
    const opponent = side === 'A' ? match.team_b : match.team_a
    const state = weeklyMatchState(match)
    const scores = [own?.score, opponent?.score].map(value => text(value) === '' ? null : Number(value))
    const scoreConfirmed = ['complete', 'ruling'].includes(state) && scores.every(value => value !== null && Number.isFinite(value) && value >= 0)
    const scheduledAt = match.scheduled_at || match.scheduledAt || match.match_date || log.scheduledAt || log.date || ''
    const timestamp = Date.parse(scheduledAt)
    candidates.set(matchId, {
      matchId,
      opponent: getTeamDisplayName(opponent),
      timestamp: Number.isFinite(timestamp) ? timestamp : 0,
      state,
      score: scoreConfirmed ? scores.join(' : ') : '',
      result: scoreConfirmed ? scores[0] > scores[1] ? 'win' : scores[0] < scores[1] ? 'loss' : 'draw' : ''
    })
  })
  return [...candidates.values()].sort((a, b) => b.timestamp - a.timestamp || a.matchId.localeCompare(b.matchId))[0] || null
}

export function getPlayerPreview(player, lookup, selectedRole = 'ALL') {
  if (!player || !lookup) return null
  const requestedRole = normalizeLeaderboardRole(selectedRole)
  const role = requestedRole || normalizeLeaderboardRole(player.performanceRole)
  const entry = lookup.entries.get(`${key(playerId(player))}:${role}`)
  const original = lookup.players?.get(key(playerId(player))) || player
  const hasRoleEntries = Object.keys(metricIds).some(role => lookup.entries.has(`${key(playerId(player))}:${role}`))
  // Published appearance summaries can exist before detailed statistics arrive.
  // Retain that summary only in its own role; it cannot supply per-10 metrics.
  const summary = !hasRoleEntries && role === normalizeLeaderboardRole(player.performanceRole) && player.hasStats ? player : null
  const roleMinutes = sampleNumber(entry ? entry.roleTimeMins ?? entry.raw_time_mins : summary?.roleTimeMins ?? summary?.raw_time_mins)
  const roleMaps = sampleNumber(entry ? entry.roleMapsPlayed ?? entry.maps_played : summary?.maps_played)
  const seasonSource = sampleNumber(original.raw_time_mins) || sampleNumber(original.maps_played) || getPlayerMatchLogs(original).logs.length ? original : player
  const appearance = requestedRole ? { minutes: roleMinutes, maps: roleMaps } : getSeasonAppearance(seasonSource, lookup)
  return {
    team: lookup.teams?.get(key(player.teamRouteId || player.team_id)) || null,
    role,
    ...appearance,
    scopeRole: requestedRole,
    hasRecords: appearance.minutes > 0 || appearance.maps > 0,
    hasRoleRecords: roleMinutes > 0 || roleMaps > 0,
    heroes: getPreviewHeroes(requestedRole ? entry || summary : seasonSource),
    metrics: (metricIds[role] || []).map(id => {
      const raw = entry?.metrics?.per10?.[id]
      const value = roleMinutes > 0 && raw !== null && raw !== undefined && Number.isFinite(Number(raw)) && Number(raw) >= 0 ? Number(raw) : null
      return { id, value }
    }),
    recent: getLatestAppearance(player, lookup, requestedRole)
  }
}

export function formatPlayerPreviewMetric(value, metricId, locale = 'zh-CN') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat(locale, { maximumFractionDigits: ['block', 'dmg', 'heal'].includes(metricId) ? 0 : 1 }).format(Number(value))
}

export function formatPlayerPreviewDate(timestamp, locale = 'zh-CN') {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat(locale, { month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(timestamp))
}

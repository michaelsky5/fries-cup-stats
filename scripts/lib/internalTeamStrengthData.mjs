import { buildSeasonTeamTimeline } from '../../src/lib/seasonOpponentStrength.js'
import { getOwHeroCanonicalName } from '../../src/lib/heroes.js'
import { resolveHeroSubrole } from '../../src/lib/heroSubroleSelectors.js'

export const text = value => String(value ?? '').trim()
export const key = value => text(value).toLowerCase()
export const values = value => Array.isArray(value) ? value : Object.values(value || {})
export const mean = list => list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null
export const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
export const rounded = (value, digits = 4) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null
export const groupBy = (list, getKey) => {
  const groups = new Map()
  for (const row of list) {
    const id = getKey(row)
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(row)
  }
  return groups
}
const finite = value => value == null || text(value) === '' || typeof value === 'boolean' || !Number.isFinite(Number(value)) ? null : Number(value)
const roleOf = role => ({ TANK: 'TANK', DPS: 'DAMAGE', DAMAGE: 'DAMAGE', SUP: 'SUPPORT', SUPPORT: 'SUPPORT' })[text(role).toUpperCase()] || null
const metrics = ['eliminations', 'assists', 'deaths', 'damage', 'healing', 'mitigation']

export function durationMinutes(value) {
  const parts = text(value).split(':')
  if (parts.length < 2 || parts.length > 3 || !parts.every(part => /^\d{1,3}$/.test(part))) return null
  const numbers = parts.map(Number)
  if (numbers.slice(1).some(number => number >= 60)) return null
  const seconds = numbers.reduce((sum, number) => sum * 60 + number, 0)
  return seconds > 0 && seconds <= 2 * 3600 ? seconds / 60 : null
}

function normalizeRow(row, teamId, minutes) {
  const playerId = key(row.player_id || row.playerId)
  const explicitTeam = key(row.team_id || row.teamId)
  const hero = getOwHeroCanonicalName(text(row.heroes_played || row.hero))
  const resolved = resolveHeroSubrole(hero, { role: row.role })
  const recordedRole = roleOf(row.role)
  const heroRole = roleOf(resolved.officialRole)
  const role = recordedRole || heroRole
  if (!playerId || explicitTeam !== teamId || !role || (recordedRole && heroRole && recordedRole !== heroRole)) return null
  const rowMinutes = text(row.time) ? durationMinutes(row.time) : minutes
  // Partial participation cannot be silently treated as a complete map lineup.
  if (text(row.time) && (!rowMinutes || !minutes || Math.abs(rowMinutes - minutes) > 1 / 60)) return null
  const totals = Object.fromEntries(metrics.map(metric => [metric, finite(row[metric])]))
  const hasMetrics = metrics.every(metric => totals[metric] != null && totals[metric] >= 0) && metrics.some(metric => totals[metric] > 0)
  return { playerId, teamId, role, hero, inferredRole: !recordedRole,
    metrics: hasMetrics && minutes ? Object.fromEntries(metrics.map(metric => [metric, Math.log1p(totals[metric] / minutes * 10)])) : null,
    totals, minutes }
}

function mapRows(map, side, teamId) {
  const own = values(map[`team_${side}_stats`])
  const combined = values(map.player_stats).filter(row => key(row.team_id || row.teamId) === teamId)
  if (own.length && combined.length) {
    const fingerprint = rows => JSON.stringify(rows.map(row => [key(row.player_id || row.playerId), key(row.team_id || row.teamId), roleOf(row.role), text(row.heroes_played || row.hero), text(row.time), ...metrics.map(metric => finite(row[metric]))]).sort((a, b) => a[0].localeCompare(b[0])))
    if (fingerprint(own) !== fingerprint(combined)) return { reason: 'conflicting_stat_copies' }
  }
  return { rows: own.length ? own : combined }
}

function normalizeMap(map, match, duplicateOrders) {
  const order = Number(map.map_order)
  if (!Number.isInteger(order) || order <= 0 || duplicateOrders.has(order)) return { reason: 'ambiguous_map_order' }
  if (map.is_administrative || map.is_forfeit || map.forfeited_by || map.rating_eligible === false || (map.result_mode && key(map.result_mode) !== 'normal')) return { reason: 'administrative_map' }
  const minutes = durationMinutes(map.match_time || map.time)
  const a = mapRows(map, 'a', match.teamA)
  const b = mapRows(map, 'b', match.teamB)
  if (a.reason || b.reason) return { reason: a.reason || b.reason }
  if (a.rows.length !== 5 || b.rows.length !== 5) return { reason: 'incomplete_lineup' }
  const rows = [...a.rows.map(row => normalizeRow(row, match.teamA, minutes)), ...b.rows.map(row => normalizeRow(row, match.teamB, minutes))]
  if (rows.some(row => !row)) return { reason: 'invalid_identity_role_or_time' }
  if (new Set(rows.map(row => row.playerId)).size !== 10) return { reason: 'duplicate_player' }
  for (const team of [match.teamA, match.teamB]) {
    const roles = rows.filter(row => row.teamId === team).map(row => row.role)
    if (roles.filter(role => role === 'TANK').length !== 1 || roles.filter(role => role === 'DAMAGE').length !== 2 || roles.filter(role => role === 'SUPPORT').length !== 2) return { reason: 'invalid_role_composition' }
  }
  // All-zero columns can be absent observations in older exports. Never learn
  // a zero-healing baseline from those maps or treat absence as poor play.
  const missingColumns = metrics.filter(metric => rows.every(row => row.totals[metric] === 0))
  for (const row of rows) if (row.metrics) for (const metric of missingColumns) delete row.metrics[metric]
  return { map: { order, name: text(map.map_name), type: text(map.map_type), minutes, rows,
    performanceEligible: Boolean(minutes && rows.every(row => row.metrics && row.hero)), missingColumns } }
}

export function rosterFromMaps(maps, teamId) {
  if (!maps.length) return null
  const weights = {}
  for (const map of maps) for (const row of map.rows.filter(row => row.teamId === teamId)) {
    const id = `${row.playerId}:${row.role}`
    weights[id] = (weights[id] || 0) + 1 / maps.length
  }
  return weights
}

function connectedComponents(teams, matches) {
  const neighbors = new Map(teams.map(team => [team.id, new Set()]))
  for (const match of matches) {
    neighbors.get(match.teamA).add(match.teamB)
    neighbors.get(match.teamB).add(match.teamA)
  }
  const components = []
  const seen = new Set()
  for (const team of teams) {
    if (seen.has(team.id)) continue
    const members = [], queue = [team.id]
    while (queue.length) {
      const id = queue.pop()
      if (seen.has(id)) continue
      seen.add(id); members.push(id)
      queue.push(...neighbors.get(id))
    }
    components.push(members.sort())
  }
  return components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]))
}

export function prepareTeamStrengthData(db, seasonId) {
  const timeline = buildSeasonTeamTimeline(db)
  const players = values(db.players)
  const teams = values(db.teams).map(team => ({ id: key(team.team_id || team.id), name: text(team.team_name || team.name), short: text(team.team_short_name || team.short),
    // Raw declarations are descriptive only: no final roster/declared rank enters prediction.
    declarations: Object.fromEntries([...groupBy(players.filter(p => key(p.team_id) === key(team.team_id || team.id)), p => text(p.rank) || '未填写')].map(([rank, rows]) => [rank, rows.length])) }))
  if (teams.some(team => !team.id) || new Set(teams.map(team => team.id)).size !== teams.length) throw new Error(`Ambiguous team registry: ${seasonId}`)
  const teamIds = new Set(teams.map(team => team.id))
  const excludedMatches = [], mapIssues = [], matches = []
  for (const source of values(db.matches)) {
    const id = key(source.match_id || source.id || source.raw_match_id)
    const context = timeline.canonical.get(id)
    if (!context?.eligible || !teamIds.has(context.teamA) || !teamIds.has(context.teamB)) {
      excludedMatches.push({ matchId: text(source.match_id || source.id), reason: !context ? 'ambiguous_match_id' : key(source.result_mode || 'NORMAL') !== 'normal' ? key(source.result_mode) : 'invalid_result_date_or_team' })
      continue
    }
    const match = { id, matchId: context.matchId, seasonId, date: context.date, teamA: context.teamA, teamB: context.teamB, result: context.result,
      format: text(source.format), scoreA: Number(source.team_a.score), scoreB: Number(source.team_b.score), maps: [], listedMaps: values(source.maps).length }
    const duplicateOrders = new Set([...groupBy(values(source.maps), map => Number(map.map_order))].filter(([, maps]) => maps.length > 1).map(([order]) => order))
    for (const map of values(source.maps)) {
      const normalized = normalizeMap(map, match, duplicateOrders)
      if (normalized.reason) mapIssues.push({ matchId: match.matchId, order: map.map_order, reason: normalized.reason })
      else {
        match.maps.push(normalized.map)
        if (!normalized.map.performanceEligible) mapIssues.push({ matchId: match.matchId, order: map.map_order, reason: 'missing_performance_data' })
        if (normalized.map.missingColumns.length) mapIssues.push({ matchId: match.matchId, order: map.map_order, reason: 'all_zero_columns', columns: normalized.map.missingColumns })
      }
    }
    match.maps.sort((a, b) => a.order - b.order)
    match.rosterCoverage = match.listedMaps ? match.maps.length / match.listedMaps : 0
    match.rosters = Object.fromEntries([match.teamA, match.teamB].map(team => [team, rosterFromMaps(match.maps, team)]))
    matches.push(match)
  }
  matches.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  teams.sort((a, b) => a.id.localeCompare(b.id))
  return { seasonId, teams, matches, components: connectedComponents(teams, matches),
    identities: players.map(p => ({ playerId: key(p.player_id || p.id), tag: key(p.player_name || p.battletag), hasDeclaration: Boolean(text(p.rank)) })),
    audit: { registeredTeams: teams.length, registeredPlayers: players.length, totalMatches: values(db.matches).length,
      eligibleSeries: matches.length, draws: matches.filter(match => match.result === 0.5).length,
      listedMaps: matches.reduce((sum, match) => sum + match.listedMaps, 0), verifiedLineupMaps: matches.reduce((sum, match) => sum + match.maps.length, 0),
      performanceMaps: matches.flatMap(match => match.maps).filter(map => map.performanceEligible).length,
      inferredRoleRows: matches.flatMap(match => match.maps).flatMap(map => map.rows).filter(row => row.inferredRole).length,
      missingDeclarations: players.filter(p => !text(p.rank)).length, excludedMatches, mapIssues } }
}

export function auditCrossSeasonIdentities(datasets) {
  const records = datasets.flatMap(data => data.identities.filter(person => /^.+#\d+$/.test(person.tag)).map(person => ({ ...person, seasonId: data.seasonId })))
  const candidates = [], ambiguous = []
  for (const [tag, people] of groupBy(records, person => person.tag)) {
    const seasons = new Set(people.map(person => person.seasonId))
    if (seasons.size < 2) continue
    const entry = { tag, players: people.map(({ seasonId, playerId }) => ({ seasonId, playerId })) }
    if (seasons.size !== people.length) ambiguous.push(entry)
    else candidates.push(entry)
  }
  return { automaticRatingTransfers: 0, status: 'REVIEW_REQUIRED', candidates: candidates.sort((a, b) => a.tag.localeCompare(b.tag)), ambiguous,
    explanation: 'Exact full BattleTag matches are identity-review candidates, not verified identities or evidence of identical team strength. Seasons remain separate rating pools.' }
}

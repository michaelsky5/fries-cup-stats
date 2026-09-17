import { getTeamFullName, getTeamLabel, isByeMatch } from '../../lib/matchesSelectors.js'

export const normalizeTeamQuery = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
const validId = value => value && !['tbd', 'unknown', 'bye', '-'].includes(normalizeTeamQuery(value))

export function getScheduleSearchTeams(matches = []) {
  const teams = new Map()
  for (const match of matches) {
    if (isByeMatch(match)) continue
    for (const team of [match.team_a, match.team_b]) {
      const id = String(team?.team_id || team?.id || '').trim()
      if (!validId(id)) continue
      const entry = teams.get(id) || { id, short: getTeamLabel(team), full: getTeamFullName(team), team, matchIds: new Set() }
      const matchId = match.match_id || match.id
      if (matchId) entry.matchIds.add(String(matchId))
      teams.set(id, entry)
    }
  }
  return [...teams.values()].map(({ matchIds, ...entry }) => ({ ...entry, matchCount: matchIds.size }))
}

export function getScheduleTeamCandidates(teams, query, limit = 6) {
  const q = normalizeTeamQuery(query)
  if (!q) return []
  const rank = team => {
    const short = normalizeTeamQuery(team.short)
    const full = normalizeTeamQuery(team.full)
    return short === q ? 0 : full === q ? 1 : short.startsWith(q) ? 2 : full.startsWith(q) ? 3 : short.includes(q) || full.includes(q) ? 4 : 99
  }
  return teams.map(team => ({ team, rank: rank(team) })).filter(item => item.rank < 99)
    .sort((a, b) => a.rank - b.rank || b.team.matchCount - a.team.matchCount || a.team.short.localeCompare(b.team.short) || a.team.id.localeCompare(b.team.id))
    .slice(0, limit).map(item => item.team)
}

export function getExactScheduleTeam(teams, query) {
  const q = normalizeTeamQuery(query)
  if (!q) return null
  const exact = teams.filter(team => [team.short, team.full].some(value => normalizeTeamQuery(value) === q))
  return exact.length === 1 ? exact[0] : null
}

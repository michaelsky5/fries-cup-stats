import { buildWeeklyOverview, weeklyScore } from '../weekly-overview/weeklyOverviewModel.js'

const idOf = team => String(team?.id || team?.team_id || '')
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase()

export function weeklyPublishedRank(value) {
  const rank = weeklyScore(value)
  return Number(rank) > 0 ? rank : '—'
}

export function weeklyTeamMatch(match, teamId) {
  const side = [match.team_a, match.team_b].findIndex(team => normalize(idOf(team)) === normalize(teamId))
  if (side < 0) return null
  const own = side === 0 ? match.team_a : match.team_b
  const opponent = side === 0 ? match.team_b : match.team_a
  const scoreVisible = ['live', 'complete', 'review', 'ruling'].includes(match.state)
  return { match, own, opponent, score: scoreVisible ? `${weeklyScore(own?.score)} : ${weeklyScore(opponent?.score)}` : 'VS' }
}

export function buildWeeklyAdvance(db, { cycleId, weekId, teamId, query = '', followedOnly = false, followedTeamIds = [] } = {}) {
  const overview = buildWeeklyOverview(db, { cycleId, weekId })
  const { cycle, standings, weekEntries, isPilot } = overview
  // Keep the published ordering and points. Match records cannot fill in either.
  const published = isPilot ? [] : standings
  const rows = published.map(standing => ({ id: String(standing.team_id), team: standing.team, standing }))
  const seen = new Set(rows.map(row => normalize(row.id)))
  for (const { matches } of weekEntries) {
    for (const match of matches) {
      for (const team of [match.team_a, match.team_b]) {
        const id = idOf(team)
        if (!id || seen.has(normalize(id))) continue
        seen.add(normalize(id))
        rows.push({ id, team, standing: null })
      }
    }
  }
  const followed = new Set(followedTeamIds.map(normalize))
  const search = normalize(query)
  const visibleRows = rows.filter(row => {
    const names = [row.team?.short, row.team?.name, row.team?.team_short_name, row.team?.team_name, row.standing?.team_name, row.standing?.team_short_name]
    return (!search || names.some(name => normalize(name).includes(search))) && (!followedOnly || followed.has(normalize(row.id)))
  })
  const selected = visibleRows.find(row => normalize(row.id) === normalize(teamId))
    || visibleRows.find(row => followed.has(normalize(row.id))) || visibleRows[0] || null
  const journey = selected ? weekEntries.map(({ week, matches }) => ({
    week, fixtures: matches.map(match => weeklyTeamMatch(match, selected.id)).filter(Boolean)
  })) : []
  return { ...overview, rows: visibleRows, selected, journey, totalTeams: rows.length,
    publishedCount: published.length, hasStandings: published.length > 0,
    hasFilters: !!search || followedOnly,
    activeStage: !isPilot && cycle?.status === 'ACTIVE' ? 'points' : !isPilot && cycle?.status === 'PLAYOFFS' ? 'playoffs' : null }
}

export function resetWeeklyAdvanceSearch(search) {
  const next = new URLSearchParams(search)
  next.delete('query')
  next.delete('followed')
  return next
}

import { buildWeeklyElimination } from '../weekly-advance/weeklyEliminationModel.js'

const list = value => Array.isArray(value) ? value : []
const idOf = team => String(team?.id || team?.team_id || '')
const teamFact = team => team ? Object.fromEntries(['id', 'team_id', 'name', 'short', 'team_name', 'team_short_name', 'logo', 'logo_url', 'seed'].filter(key => team[key] !== undefined).map(key => [key, team[key]])) : null

// Freeze the public bracket with this issue. No label guessing, live winner,
// standings-derived medal, or later week's result may change an earlier issue.
export function buildPlayoffNewspaperFacts(db, overview, sourceAt) {
  const { cycle, week } = overview
  if (week?.phase !== 'PLAYOFFS') return null
  const result = { schema: 'friescup-playoff-paper-v1', cycleId: cycle.id, weekId: week.id, sourceAt,
    finalFormat: null, rounds: [], placements: [], bracketAvailable: false }
  if (cycle.elimination?.bracket_type !== 'SINGLE_ELIMINATION' || overview.isPilot) return result
  const scoped = { ...overview, weekEntries: overview.weekEntries.map(entry => ({ ...entry,
    matches: Number(entry.week.week_number) <= Number(week.week_number) ? entry.matches
      : entry.matches.filter(match => match.state === 'upcoming') })) }
  const bracket = buildWeeklyElimination(db, scoped)
  if (!bracket) return result
  const groups = [['SEMIFINAL', bracket.semifinals, 2], ['FINAL', bracket.finals, 1], ['THIRD_PLACE', bracket.thirdPlaces, 1]]
  const itemsByKind = new Map()
  for (const [kind, rounds, maximum] of groups) {
    const items = rounds.flatMap(round => round.items.map(item => ({ ...item, weekId: round.week_id })))
    if (items.length > maximum || new Set(items.map(item => item.id)).size !== items.length) continue
    itemsByKind.set(kind, items)
    result.rounds.push({ kind, items: items.map(item => {
      const confirmed = ['complete', 'ruling'].includes(item.state)
      return { id: item.id, weekId: item.weekId, kind, a: teamFact(item.a), b: teamFact(item.b),
        state: item.state, format: item.match?.format || null,
        scheduledAt: item.match?.scheduled_at || null,
        scores: confirmed ? [item.scoreA, item.scoreB] : null,
        winnerId: confirmed ? idOf(item.winner) || null : null }
    }) })
  }
  result.bracketAvailable = result.rounds.some(round => round.items.length)
  result.finalFormat = bracket.finalFormat
  const semis = itemsByKind.get('SEMIFINAL') || []
  const entrants = semis.flatMap(item => [idOf(item.a), idOf(item.b)])
  if (semis.length !== 2 || entrants.some(id => !id) || new Set(entrants).size !== 4 || semis.some(item => !item.winner)) return result
  const loser = item => [item.a, item.b].find(team => idOf(team) !== idOf(item.winner))
  for (const [kind, teams, rank] of [['FINAL', semis.map(item => item.winner), 1], ['THIRD_PLACE', semis.map(loser), 3]]) {
    const [item] = itemsByKind.get(kind) || []
    if (!item?.winner || item.type !== 'MATCH' || [idOf(item.a), idOf(item.b)].sort().join('|') !== teams.map(idOf).sort().join('|')) continue
    result.placements.push({ rank, team: teamFact(item.winner), matchId: item.id },
      { rank: rank + 1, team: teamFact(loser(item)), matchId: item.id })
  }
  return result
}

export function playoffLeadId(playoff, completed) {
  const ids = new Set(list(completed).map(match => match.id))
  return playoff?.rounds.find(round => round.kind === 'FINAL')?.items.find(item => item.winnerId && ids.has(item.id))?.id || null
}

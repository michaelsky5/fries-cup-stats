const idOf = team => String(team?.id || team?.team_id || '')
const participants = item => [idOf(item?.a), idOf(item?.b)]
const loser = item => item?.winner ? [item.a, item.b].find(team => idOf(team) !== idOf(item.winner)) : null
const sameTeams = (item, teams) => participants(item).sort().join('|') === teams.map(idOf).sort().join('|')

// Only the published medal matches decide placements. Points and seeds cannot
// turn into a finishing position; pending or inconsistent brackets stay pending.
export function buildWeeklyFinalPlacements({ semifinals = [], finals = [], thirdPlaces = [] } = {}) {
  const semis = semifinals.flatMap(round => round.items)
  const title = finals.flatMap(round => round.items)
  const third = thirdPlaces.flatMap(round => round.items)
  if (semis.length !== 2 || title.length !== 1 || third.length !== 1) return []
  const all = [...semis, ...title, ...third]
  if (all.some(item => item.type !== 'MATCH' || !item.winner || !participants(item).includes(idOf(item.winner)))) return []
  const entrants = semis.flatMap(participants)
  if (new Set(entrants).size !== 4 || entrants.some(id => !id)) return []
  if (!sameTeams(title[0], semis.map(item => item.winner)) || !sameTeams(third[0], semis.map(loser))) return []
  return [title[0].winner, loser(title[0]), third[0].winner, loser(third[0])]
    .map((team, index) => ({ rank: index + 1, team, match: index < 2 ? title[0].match : third[0].match }))
}

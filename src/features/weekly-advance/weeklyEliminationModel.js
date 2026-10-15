import { getMatchLookupIds } from '../../lib/weeklyMatchIdentity.js'
import { weeklyMatchState, weeklyScore } from '../weekly-overview/weeklyOverviewModel.js'

const list = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const idOf = team => text(team?.id || team?.team_id)
const normalize = value => text(value).normalize('NFKC').toLowerCase()

export function confirmedWeeklyWinner(match) {
  if (!['COMPLETE', 'COMPLETED', 'FINISHED', 'LOCKED', 'FORFEIT', 'ADMIN_COMPLETED'].includes(text(match?.status).toUpperCase())) return null
  const target = Number(text(match.format).match(/^FT([234])$/i)?.[1])
  if (!target || !text(match.winner)) return null
  const teams = [match.team_a, match.team_b]
  const candidates = teams.filter(team => [idOf(team), team?.name, team?.short, team?.team_name, team?.team_short_name]
    .some(value => value && normalize(value) === normalize(match.winner)))
  if (candidates.length !== 1) return null
  const winner = candidates[0], loser = teams.find(team => team !== winner)
  const won = weeklyScore(winner?.score), lost = weeklyScore(loser?.score)
  return Number(won) === target && lost !== '—' && Number.isInteger(Number(lost)) && Number(lost) < target ? winner : null
}

// Use only published bracket items and public match records. A standings rank
// or a live score never creates an entrant, a finalist or a champion.
export function buildWeeklyElimination(db, overview) {
  const { cycle, weekEntries = [], standings = [], isPilot } = overview
  if (!cycle || isPilot) return null
  const teamById = new Map(list(db?.teams).map(team => [idOf(team), team]))
  standings.forEach(row => teamById.set(text(row.team_id), row.team || row))
  const weeks = new Map(weekEntries.map(entry => [entry.week.id, entry]))
  const matches = new Map()
  weekEntries.forEach(entry => entry.matches.forEach(match => getMatchLookupIds(match).forEach(id => matches.set(id, { match, week: entry.week }))))
  const team = id => id ? { ...teamById.get(text(id)), id: text(id) } : null
  const metadata = cycle.elimination?.bracket_type === 'SINGLE_ELIMINATION' ? cycle.elimination : null
  const seedIds = cycle.playoff_seeds_current === true
    ? metadata ? list(metadata.seed_team_ids) : standings.filter(row => Number.isInteger(row.playoff_seed) && row.playoff_seed > 0)
      .sort((a, b) => a.playoff_seed - b.playoff_seed).map(row => row.team_id) : []
  const seeds = [...new Set(seedIds.map(text))].filter(Boolean).slice(0, 4).map((id, index) => ({ id, seed: index + 1, team: team(id) }))
  const seedById = new Map(seeds.map(seed => [seed.id, seed.seed]))
  const fixture = (item, round) => {
    const bound = item.match_id ? matches.get(text(item.match_id)) : null
    if (item.type === 'MATCH' && (!bound || bound.week.id !== round.week_id
      || idOf(bound.match.team_a) !== text(item.team_a_id) || idOf(bound.match.team_b) !== text(item.team_b_id))) return null
    if (item.type !== 'MATCH' && item.type !== 'BYE') return null
    const a = team(item.team_a_id), b = team(item.team_b_id)
    if (!a || item.type === 'BYE' && (b || item.match_id)) return null
    const match = bound?.match || null
    const state = match ? weeklyMatchState(match) : 'bye'
    const showScore = match && ['live', 'complete', 'review', 'ruling'].includes(state)
    return { id: match?.id || `${round.id}-bye-${item.order}`, order: item.order, type: item.type, match,
      a: { ...a, seed: seedById.get(a.id) || null }, b: b ? { ...b, seed: seedById.get(b.id) || null } : null,
      state, scoreA: showScore ? weeklyScore(match.team_a.score) : null, scoreB: showScore ? weeklyScore(match.team_b.score) : null,
      winner: match ? confirmedWeeklyWinner(match) : a }
  }
  const rounds = []
  for (const round of list(metadata?.rounds)) {
    const entry = weeks.get(round.week_id)
    if (!entry || entry.week.phase !== round.phase
      || !(round.phase === 'QUALIFIER' && round.kind === 'QUALIFIER' || round.phase === 'PLAYOFFS' && ['SEMIFINAL', 'THIRD_PLACE', 'FINAL'].includes(round.kind))) continue
    const items = list(round.items).map(item => fixture(item, round)).filter(Boolean).sort((a, b) => a.order - b.order)
    if (items.length) rounds.push({ ...round, week: entry.week, items })
  }
  // Older published snapshots remain browsable until the new backend snapshot
  // is published. They cannot supply a bye or an unpublished final pairing.
  if (!metadata) for (const { week, matches: publicMatches } of weekEntries) {
    if (!['PLAYOFFS', 'QUALIFIER'].includes(week.phase)) continue
    for (const match of publicMatches) {
      const roundLabel = text(match.weekly_context?.round_label || match.round)
      const kind = week.phase === 'QUALIFIER' ? 'QUALIFIER'
        : /季军|季軍|THIRD[_ -]?PLACE|3RD/i.test(roundLabel) ? 'THIRD_PLACE'
          : ['GRAND_FINAL', 'GRAND FINALS'].includes(text(match.stage).toUpperCase()) || /^(决赛|总决赛|final|grand final)$/i.test(roundLabel) ? 'FINAL' : 'SEMIFINAL'
      let round = rounds.find(item => item.week_id === week.id && item.kind === kind)
      if (!round) { round = { id: `${week.id}-${kind}`, week_id: week.id, phase: week.phase, kind, round_number: null, week, items: [] }; rounds.push(round) }
      const item = fixture({ type: 'MATCH', order: round.items.length + 1, match_id: match.id, team_a_id: idOf(match.team_a), team_b_id: idOf(match.team_b) }, round)
      if (item) round.items.push(item)
    }
  }
  rounds.sort((a, b) => Number(a.week.week_number) - Number(b.week.week_number) || (a.round_number || 0) - (b.round_number || 0))
  const qualifiers = rounds.filter(round => round.kind === 'QUALIFIER')
  const semifinals = rounds.filter(round => round.kind === 'SEMIFINAL')
  const finals = rounds.filter(round => round.kind === 'FINAL')
  const thirdPlaces = rounds.filter(round => round.kind === 'THIRD_PLACE')
  const finalItems = finals.flatMap(round => round.items)
  const champion = finalItems.length === 1 && finalItems[0].type === 'MATCH' ? finalItems[0].winner : null
  const qualificationResolved = qualifiers.some(round => round.qualification_current !== false && list(round.outcome_team_ids).length > 0)
  return { seeds, seedsCurrent: cycle.playoff_seeds_current === true, qualifiers, semifinals, finals, thirdPlaces, champion, teamById,
    finalFormat: ['FT3', 'FT4'].includes(metadata?.final_format) ? metadata.final_format : null,
    hasBracket: rounds.length > 0,
    finalists: semifinals.flatMap(round => round.items).map(item => item.winner ? team(idOf(item.winner)) : null),
    qualificationResolved,
    qualificationRequired: !qualificationResolved && standings.some(row => row.qualification_status === 'QUALIFIER_REQUIRED'),
    seedDrawRequired: standings.some(row => row.qualification_status === 'SEED_DRAW_REQUIRED') }
}

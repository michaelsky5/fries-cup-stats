import { buildWeeklyOverviewFixture } from './weeklyOverviewFixture.mjs'

// Fictional published states for isolated previews and regression checks only.
export function buildWeeklyPlayoffFixture(state = 'complete') {
  const db = buildWeeklyOverviewFixture()
  const cycle = db.weekly_competition.cycles.find(item => item.id === 'sample-cycle-1')
  cycle.status = state === 'complete' ? 'CLOSED' : 'PLAYOFFS'
  cycle.playoff_seeds_current = !['pending-seeds', 'qualifiers', 'stale-seeds'].includes(state)
  cycle.standings.forEach((row, index) => Object.assign(row, {
    map_diff: 9 - index, effective_participations: 2, actual_participations: 2, metrics_complete: true,
    qualification_status: index < 4 ? 'QUALIFIED' : 'RESERVE', playoff_seed: cycle.playoff_seeds_current && index < 4 ? index + 1 : null
  }))
  const entrants = cycle.standings.slice(0, 4).map(row => row.team_id)
  const ref = (id, score = '') => {
    const team = db.teams.find(item => item.team_id === id)
    return { id, name: team.team_name, short: team.team_short_name, team_logo: team.team_logo, score }
  }
  const weekId = 'sample-cycle-1-playoffs'
  const match = (id, order, a, b, round, score, status = 'COMPLETE', format = 'FT3', inWeek = weekId) => ({
    match_id: id, raw_match_id: `raw-${id}`, cycle_id: cycle.id, cycle_week_id: inWeek,
    match_code: `FCW26-C01-W05-${format === 'FT2' ? 'QUAL' : 'PO'}-M${String(order).padStart(2, '0')}`,
    stage: round === 'FINAL' ? 'GRAND_FINAL' : format === 'FT2' ? 'OTHER' : 'PLAYOFFS', round,
    status, format, scheduled_at: `2026-10-17T${String(10 + order).padStart(2, '0')}:00:00Z`,
    team_a: ref(a, score?.[0]), team_b: ref(b, score?.[1]),
    winner: score ? a : null, is_forfeit: false, maps: []
  })
  const item = (order, a, b, id) => ({ order, type: b ? 'MATCH' : 'BYE', team_a_id: a, team_b_id: b || null, match_id: id ? `raw-${id}` : null })
  const sf1 = match('PLAYOFF-FIXTURE-SF1', 1, entrants[0], entrants[3], 'SEMIFINAL', [3, 1])
  const sf2 = match('PLAYOFF-FIXTURE-SF2', 2, entrants[1], entrants[2], 'SEMIFINAL', [3, 2])
  const final = match('PLAYOFF-FIXTURE-FINAL', 3, entrants[0], entrants[1], 'FINAL', [3, 1])
  cycle.weeks.push({ id: weekId, week_number: 5, label: '季后赛', phase: 'PLAYOFFS', status: 'PUBLISHED', match_ids: [] })
  const round = { id: 'published-semis', week_id: weekId, phase: 'PLAYOFFS', kind: 'SEMIFINAL', round_number: 1,
    items: [item(1, entrants[0], entrants[3], sf1.match_id), item(2, entrants[1], entrants[2], sf2.match_id)] }
  cycle.elimination = { bracket_type: 'SINGLE_ELIMINATION', final_format: 'FT3', seed_team_ids: cycle.playoff_seeds_current ? entrants : [], rounds: [round] }
  if (state === 'pending-seeds') { cycle.elimination.rounds = []; cycle.standings[1].qualification_status = 'SEED_DRAW_REQUIRED'; return db }
  if (state === 'three-team') { round.items[0] = item(1, entrants[0], null, null); cycle.elimination.seed_team_ids = entrants.slice(0, 3); db.matches.push(sf2); cycle.weeks.at(-1).match_ids.push(sf2.raw_match_id) }
  else { db.matches.push(sf1, sf2); cycle.weeks.at(-1).match_ids.push(sf1.raw_match_id, sf2.raw_match_id) }
  if (state === 'semifinals') for (const fixture of [sf1, sf2]) { fixture.status = 'PENDING'; fixture.winner = null }
  if (state === 'pending-results') for (const fixture of [sf1, sf2]) fixture.status = 'RESULT_REVIEW'
  if (['third-place', 'medal-complete', 'third-place-legacy'].includes(state)) {
    const third = match('PLAYOFF-FIXTURE-THIRD', 4, entrants[2], entrants[3], 'THIRD_PLACE', [3, 1])
    third.scheduled_at = '2026-10-18T11:30:00Z'
    db.matches.push(third)
    cycle.weeks.at(-1).match_ids.push(third.raw_match_id)
    cycle.elimination.rounds.push({ id: 'published-third-place', week_id: weekId, phase: 'PLAYOFFS', kind: 'THIRD_PLACE', round_number: 2,
      source_match_ids: [sf1.raw_match_id, sf2.raw_match_id], items: [item(1, entrants[2], entrants[3], third.match_id)] })
  }
  if (['final-live', 'complete', 'stale-seeds', 'legacy', 'medal-complete'].includes(state)) {
    if (state === 'final-live') final.status = 'LIVE'
    db.matches.push(final)
    cycle.weeks.at(-1).match_ids.push(final.raw_match_id)
    cycle.elimination.rounds.push({ id: 'published-final', week_id: weekId, phase: 'PLAYOFFS', kind: 'FINAL', round_number: 2,
      source_match_ids: [sf1.raw_match_id, sf2.raw_match_id], items: [item(1, entrants[0], entrants[1], final.match_id)] })
  }
  if (state === 'qualifiers') {
    cycle.weeks.pop()
    db.matches = db.matches.filter(fixture => fixture.cycle_week_id !== weekId)
    const qWeek = 'sample-cycle-1-qualifier', tied = cycle.standings.slice(2, 5).map(row => row.team_id)
    tied.forEach(id => { cycle.standings.find(row => row.team_id === id).qualification_status = 'QUALIFIER_REQUIRED' })
    const q1 = match('QUALIFIER-FIXTURE-R1', 1, tied[0], tied[1], 'QUALIFIER', [2, 0], 'COMPLETE', 'FT2', qWeek)
    const q2 = match('QUALIFIER-FIXTURE-R2', 2, tied[2], tied[1], 'QUALIFIER', [2, 1], 'COMPLETE', 'FT2', qWeek)
    db.matches.push(q1, q2)
    cycle.weeks.push({ id: qWeek, week_number: 5, label: '晋级加赛', phase: 'QUALIFIER', status: 'PUBLISHED', match_ids: [q1.raw_match_id, q2.raw_match_id] })
    cycle.elimination.rounds = [
      { id: 'q1', week_id: qWeek, phase: 'QUALIFIER', kind: 'QUALIFIER', round_number: 1, slots: 2, items: [item(1, tied[0], tied[1], q1.match_id), item(2, tied[2], null, null)] },
      { id: 'q2', week_id: qWeek, phase: 'QUALIFIER', kind: 'QUALIFIER', round_number: 2, slots: 1, source_match_ids: [q1.raw_match_id],
        qualified_team_ids: [tied[0]], outcome_team_ids: [tied[0], tied[2]], items: [item(1, tied[2], tied[1], q2.match_id)] }
    ]
  }
  if (['legacy', 'third-place-legacy'].includes(state)) delete cycle.elimination
  return db
}

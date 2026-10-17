import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildWeeklyPlayoffFixture } from './lib/weeklyPlayoffFixture.mjs'
import { buildWeeklyAdvance } from '../src/features/weekly-advance/weeklyAdvanceModel.js'
import { confirmedWeeklyWinner } from '../src/features/weekly-advance/weeklyEliminationModel.js'
import { buildWeeklyBracketPresentation } from '../src/features/weekly-advance/weeklyBracketPresentation.js'
import { buildWeeklyRouteModel } from '../src/features/weekly-advance/weeklyRouteModel.js'
import { C1_PLAYOFF_SCHEDULE } from '../src/features/weekly-advance/weeklyApprovedSchedules.js'
import { routeScheduleNotice, routeText, routeTime } from '../src/features/weekly-advance/weeklyRoutePresentation.js'

const model = state => buildWeeklyAdvance(buildWeeklyPlayoffFixture(state)).elimination

function c1RouteFixture() {
  const ids = [...C1_PLAYOFF_SCHEDULE.seedTeamIds, ...C1_PLAYOFF_SCHEDULE.qualifierTeamIds]
  const teams = ids.map((id, index) => ({ id, short: ['404', 'BBB', 'MH', 'SPS', 'TS'][index] }))
  const match = { id: C1_PLAYOFF_SCHEDULE.qualifierMatchId, scheduled_at: '2026-10-16T13:00:00.000Z', format: 'FT2', status: 'PENDING' }
  const qualifier = { id: match.id, type: 'MATCH', match, state: 'pending', a: teams[3], b: teams[4], scoreA: null, scoreB: null, winner: null }
  return { teams, model: { seeds: [], seedsCurrent: false, qualifiers: [{ id: 'q1', qualification_current: true, outcome_team_ids: [], items: [qualifier] }], semifinals: [], finals: [], thirdPlaces: [], champion: null, teamById: new Map(teams.map(team => [team.id, team])), finalists: [], qualificationRequired: true, finalFormat: 'FT3' }, options: { cycle: { id: C1_PLAYOFF_SCHEDULE.cycleId }, seasonId: 'FCW2026' } }
}

test('C1 approved schedule explains four conditional matches without manufacturing official seeds or results', () => {
  const fixture = c1RouteFixture(), before = structuredClone(fixture.model)
  const route = buildWeeklyRouteModel(fixture.model, { ...fixture.options, selectedTeamId: fixture.teams[0].id })
  assert.equal(route.approvedPlan, true)
  assert.deepEqual(route.route.map(node => node.kind), ['SEMIFINAL', 'FINAL', 'THIRD_PLACE'])
  assert.deepEqual(route.route.map(node => node.scheduledAt), ['2026-10-17T12:00:00.000Z', '2026-10-18T13:00:00.000Z', '2026-10-18T11:30:00.000Z'])
  assert.equal(route.hasFork, true)
  assert.equal(route.entrants.length, 5)
  assert.equal(route.nodes.filter(node => node.match).length, 1)
  assert.equal(route.nodes.filter(node => node.planned).length, 4)
  assert.equal(route.champion, null)
  assert.equal(route.officialSeed, null)
  assert.deepEqual(fixture.model, before)
})

test('qualifier participants see qualification before their semifinal, and only reviewed qualification removes the loser route', () => {
  const fixture = c1RouteFixture()
  const selected = fixture.teams[4].id
  const read = () => buildWeeklyRouteModel(fixture.model, { ...fixture.options, selectedTeamId: selected })
  assert.deepEqual(read().route.map(node => node.kind), ['QUALIFIER', 'SEMIFINAL', 'FINAL', 'THIRD_PLACE'])
  const round = fixture.model.qualifiers[0]
  round.items[0].winner = fixture.teams[3]
  round.qualification_current = false
  round.outcome_team_ids = [fixture.teams[3].id]
  assert.equal(read().route.length, 4, 'An outcome pending review cannot eliminate a candidate.')
  round.qualification_current = true
  round.outcome_team_ids = [fixture.teams[0].id]
  assert.equal(read().route.length, 4, 'An outcome naming a different entrant is not a qualifier result.')
  round.outcome_team_ids = [fixture.teams[3].id]
  assert.deepEqual(read().route.map(node => node.kind), ['QUALIFIER'])
  assert.equal(read().hasFork, false)
})

test('publishing C1 seeds removes the qualifier-review notice while medal matches remain conditional', () => {
  const fixture = c1RouteFixture()
  const read = () => buildWeeklyRouteModel(fixture.model, fixture.options)
  assert.equal(routeScheduleNotice(read(), 'zh').note, routeText('planNote', 'zh'))
  fixture.model.seedsCurrent = true
  fixture.model.seeds = fixture.teams.slice(0, 4).map((team, index) => ({ id: team.id, team, seed: index + 1 }))
  fixture.model.qualifiers[0].outcome_team_ids = [fixture.teams[3].id]
  fixture.model.semifinals = [{ items: [[0, 3], [1, 2]].map(([a, b], index) => ({
    id: `sf${index + 1}`, type: 'MATCH', a: fixture.teams[a], b: fixture.teams[b], winner: null,
    state: 'pending', scoreA: null, scoreB: null,
    match: { id: `sf${index + 1}`, format: 'FT3', scheduled_at: C1_PLAYOFF_SCHEDULE.semifinals[index].scheduledAt }
  })) }]
  const route = read()
  assert.equal(route.hasPlannedFixtures, true, 'Medal match schedules still need their semifinal results.')
  assert.equal(route.nodes.filter(node => node.kind === 'SEMIFINAL').every(node => node.match), true)
  for (const locale of ['zh', 'zh-TW', 'en', 'ko']) {
    const notice = routeScheduleNotice(route, locale)
    assert.equal(notice.title, routeText('official', locale))
    assert.equal(notice.note, routeText('officialPlanNote', locale))
    assert.notEqual(notice.note, routeText('planNote', locale))
  }
  fixture.model.seedsCurrent = false
  assert.equal(routeScheduleNotice(read(), 'zh').note, routeText('planNote', 'zh'), 'Stale seeds must not retain the published-seed notice.')
})

test('published semifinal times and winners override C1 arrangements and split final from third-place participants', () => {
  const fixture = c1RouteFixture()
  fixture.model.qualifiers[0].outcome_team_ids = [fixture.teams[3].id]
  const semifinal = (id, a, b, winner, time) => ({ id, type: 'MATCH', a, b, winner, state: 'complete', scoreA: 3, scoreB: 1, match: { id, format: 'FT3', scheduled_at: time } })
  fixture.model.semifinals = [{ items: [semifinal('sf1', fixture.teams[0], fixture.teams[3], fixture.teams[0], '2026-10-17T12:30:00.000Z'), semifinal('sf2', fixture.teams[1], fixture.teams[2], fixture.teams[1], '2026-10-17T14:00:00.000Z')] }]
  const winner = buildWeeklyRouteModel(fixture.model, { ...fixture.options, selectedTeamId: fixture.teams[0].id })
  assert.deepEqual(winner.route.map(node => node.kind), ['SEMIFINAL', 'FINAL'])
  assert.equal(winner.route[0].scheduledAt, '2026-10-17T12:30:00.000Z')
  const loser = buildWeeklyRouteModel(fixture.model, { ...fixture.options, selectedTeamId: fixture.teams[2].id })
  assert.deepEqual(loser.route.map(node => node.kind), ['SEMIFINAL', 'THIRD_PLACE'])
  assert.equal(loser.route[0].estimated, false, 'A published time supersedes an estimated time.')
  assert.equal(loser.hasFork, false)
  assert.equal(loser.champion, null)
})

test('C1 arrangements require the exact cycle, event, participant identities and published qualifier', () => {
  const fixture = c1RouteFixture()
  for (const patch of [{ cycle: { id: 'other-cycle' } }, { seasonId: 'FCR2026' }]) {
    const route = buildWeeklyRouteModel(fixture.model, { ...fixture.options, ...patch })
    assert.equal(route.approvedPlan, false)
    assert.equal(route.nodes.some(node => node.kind === 'THIRD_PLACE'), false)
    assert.equal(route.nodes.some(node => node.planned), false)
  }
  fixture.model.teamById.delete(fixture.teams[2].id)
  assert.equal(buildWeeklyRouteModel(fixture.model, fixture.options).approvedPlan, false)
})

test('generic two-team published seeds retain a direct final without invented semifinal or third-place', () => {
  const fixture = c1RouteFixture()
  fixture.model.qualifiers = []
  fixture.model.seedsCurrent = true
  fixture.model.seeds = fixture.teams.slice(0, 2).map((team, index) => ({ id: team.id, team, seed: index + 1 }))
  const route = buildWeeklyRouteModel(fixture.model, fixture.options)
  assert.deepEqual(route.nodes.map(node => node.kind), ['FINAL'])
  assert.equal(route.officialSeed, 1)
  assert.equal(route.hasPlannedFixtures, false)
})

test('unpublished bracket explains seed positions without claiming entrants or matches', () => {
  const source = model('pending-seeds'), before = structuredClone(source)
  const result = buildWeeklyBracketPresentation(source)
  assert.equal(result.semifinals.length, 2)
  assert.deepEqual(result.semifinals.map(item => item.sources.map(slot => slot.number)), [[1, 4], [2, 3]])
  assert(result.semifinals.every(item => item.type === 'PLACEHOLDER' && !item.match && !item.a && !item.b))
  assert.equal(result.hasPublishedMatches, false)
  assert.deepEqual(result.thirdPlaces, [], 'No third-place event is invented before its announcement.')
  assert.deepEqual(source, before)
});

test('published match links and reviewed winners survive presentation adaptation', () => {
  const source = model('final-pending'), result = buildWeeklyBracketPresentation(source)
  assert.equal(result.semifinals[0], source.semifinals[0].items[0])
  assert.equal(result.finals[0].type, 'PLACEHOLDER')
  assert.equal(result.finals[0].a.id, source.finalists[0].id)
  assert.equal(result.finals[0].b.id, source.finalists[1].id)
  assert.equal(result.finals[0].match, null)
  const reviewed = buildWeeklyBracketPresentation(model('pending-results'))
  assert.equal(reviewed.finals[0].a, null)
  assert.equal(reviewed.finals[0].b, null)
});

test('direct finals omit fictional semifinals, and stale seeds cannot fill placeholders', () => {
  const source = model('pending-seeds')
  source.seeds = [{ seed: 1, team: { id: 'a' } }, { seed: 2, team: { id: 'b' } }]
  let result = buildWeeklyBracketPresentation(source)
  assert.equal(result.semifinals.length, 2)
  assert.equal(result.semifinals[0].a, null)
  source.seedsCurrent = true
  result = buildWeeklyBracketPresentation(source)
  assert.equal(result.directFinal, true)
  assert.deepEqual(result.semifinals, [])
  assert.equal(result.finals[0].a.id, 'a')
  assert.equal(result.finals[0].a.seed, 1)
  assert.equal(result.finals[0].b.id, 'b')
});

test('standings alone never create entrants, a pairing or a champion', () => {
  const result = model('pending-seeds')
  assert.deepEqual(result.seeds, [])
  assert.deepEqual(result.semifinals, [])
  assert.equal(result.champion, null)
  assert.equal(result.seedDrawRequired, true)
});

test('published seeded semifinals resolve raw IDs to linked public matches', () => {
  const result = model('semifinals')
  assert.deepEqual(result.seeds.map(row => row.seed), [1, 2, 3, 4])
  assert.deepEqual(result.semifinals[0].items.map(item => [item.a.seed, item.b.seed]), [[1, 4], [2, 3]])
  assert.equal(result.semifinals[0].items[0].match.id, 'PLAYOFF-FIXTURE-SF1')
  assert.equal(result.semifinals[0].items[0].scoreA, null)
  assert.deepEqual(result.finalists, [null, null])
});

test('completed semifinals expose reviewed winners but do not invent a final match', () => {
  const result = model('final-pending')
  assert.ok(result.finalists.every(Boolean))
  assert.deepEqual(result.finals, [])
  assert.equal(result.champion, null)
});

test('live or result-review victories never advance a team or declare a champion', () => {
  assert.equal(model('final-live').champion, null)
  assert.deepEqual(model('pending-results').finalists, [null, null])
});

test('third-place participants and results stay separate from the final and champion', () => {
  const third = model('third-place')
  assert.equal(third.thirdPlaces.length, 1)
  assert.equal(third.semifinals[0].items.length, 2)
  assert.deepEqual(third.thirdPlaces[0].items.map(item => [item.a.seed, item.b.seed]), [[3, 4]])
  assert.equal(third.thirdPlaces[0].items[0].match.format, 'FT3')
  assert.equal(third.champion, null, 'A completed third-place match cannot declare the cycle champion.')
  const complete = model('medal-complete')
  assert.equal(complete.finals.length, 1)
  assert.notEqual(complete.champion.id, complete.thirdPlaces[0].items[0].winner.id)
  const legacy = model('third-place-legacy')
  assert.equal(legacy.thirdPlaces.length, 1)
  assert.equal(legacy.semifinals[0].items.length, 2, 'A legacy third-place match is never another semifinal.')
  assert.equal(legacy.champion, null)
});

test('a champion requires one completed published final, an explicit winner and a valid FT score', () => {
  const db = buildWeeklyPlayoffFixture()
  const final = db.matches.at(-1)
  assert.equal(buildWeeklyAdvance(db).elimination.champion.id, final.team_a.id)
  final.winner = null
  assert.equal(buildWeeklyAdvance(db).elimination.champion, null)
  final.winner = final.team_a.name
  final.team_a.score = 2
  assert.equal(buildWeeklyAdvance(db).elimination.champion, null)
  final.team_a.score = 3
  final.team_b.score = 3
  assert.equal(buildWeeklyAdvance(db).elimination.champion, null)
});

test('name winners and FT4 are supported; unknown or contradictory winner evidence is rejected', () => {
  const final = buildWeeklyPlayoffFixture().matches.at(-1)
  final.format = 'FT4'; final.team_a.score = 4; final.winner = final.team_a.name
  assert.equal(confirmedWeeklyWinner(final).id, final.team_a.id)
  final.winner = final.team_b.short
  assert.equal(confirmedWeeklyWinner(final), null)
  final.winner = final.team_a.id; final.team_b.score = 1.5
  assert.equal(confirmedWeeklyWinner(final), null)
});

test('three entrants retain a real published bye without a fictional match', () => {
  const result = model('three-team')
  assert.equal(result.seeds.length, 3)
  const bye = result.semifinals[0].items[0]
  assert.equal(bye.type, 'BYE'); assert.equal(bye.match, null)
  assert.equal(result.finalists[0].id, bye.a.id)
  assert.equal(result.champion, null)
  const route = buildWeeklyRouteModel(result, { cycle: { id: 'sample-cycle-1' }, seasonId: 'FCW2026', selectedTeamId: bye.a.id })
  const byeNode = route.nodes.find(node => node.type === 'BYE')
  assert.equal(byeNode.b, null)
  assert.equal(byeNode.format, 'BYE')
  assert.equal(byeNode.scheduledAt, null)
  assert.deepEqual(byeNode.candidateIds, [bye.a.id])
  assert.equal(routeTime(byeNode, 'zh-CN'), '直接晋级，无需比赛')
});

test('route dates preserve date-only official schedules and current final formats', () => {
  const fixture = c1RouteFixture()
  fixture.model.finalFormat = 'FT4'
  const route = buildWeeklyRouteModel(fixture.model, fixture.options)
  assert.equal(route.nodes.find(node => node.kind === 'FINAL').format, 'FT4')
  const dateOnly = { match: { scheduled_at: '2026-10-16' }, scheduledAt: '2026-10-16', plannedTime: false }
  assert.equal(routeTime(dateOnly, 'zh-CN').includes('08:00'), false)
  assert.equal(routeTime({ scheduledAt: '2026-10-17T12:00:00.000Z' }, 'zh-CN').includes('20:00'), true)
  assert.equal(routeTime({ scheduledAt: null }, 'en-US'), 'Time to be announced')
})

test('qualifier rounds and published outcomes remain separate from playoff seeds and points', () => {
  const db = buildWeeklyPlayoffFixture('qualifiers'), points = structuredClone(db.weekly_competition.cycles[1].standings)
  const result = buildWeeklyAdvance(db).elimination
  assert.equal(result.qualifiers.length, 2)
  assert.equal(result.qualifiers[0].items[1].type, 'BYE')
  assert.equal(result.qualifiers[1].outcome_team_ids.length, 2)
  assert.equal(result.qualificationResolved, true)
  assert.equal(result.qualificationRequired, false)
  assert.deepEqual(result.seeds, [])
  assert.deepEqual(db.weekly_competition.cycles[1].standings, points)
});

test('published elimination rounds identify the active stage even before the cycle label changes', () => {
  const db = buildWeeklyPlayoffFixture('semifinals')
  db.weekly_competition.cycles[1].status = 'ACTIVE'
  assert.equal(buildWeeklyAdvance(db).activeStage, 'playoffs')
});

test('hidden, foreign-week and mismatched match references cannot enter the bracket', () => {
  const db = buildWeeklyPlayoffFixture()
  const cycle = db.weekly_competition.cycles[1]
  const round = cycle.elimination.rounds[0]
  round.items.push({ ...round.items[0], order: 3, match_id: 'raw-FCW26-W1-M1' })
  round.items.push({ ...round.items[0], order: 4, team_a_id: 'other-team' })
  cycle.weeks.at(-1).match_ids = cycle.weeks.at(-1).match_ids.filter(id => !id.includes('SF2'))
  const result = buildWeeklyAdvance(db).elimination
  assert.equal(result.semifinals[0].items.length, 1)
  cycle.weeks.at(-1).status = 'DRAFT'
  assert.equal(buildWeeklyAdvance(db).elimination.hasBracket, false)
});

test('stale seeds are not reused as current entrants; published match history remains visible', () => {
  const result = model('stale-seeds')
  assert.deepEqual(result.seeds, [])
  assert.equal(result.hasBracket, true)
  assert.equal(result.seedsCurrent, false)
});

test('older snapshots show their actual public matches and explicitly published seeds', () => {
  const result = model('legacy')
  assert.equal(result.seeds.length, 4)
  assert.equal(result.semifinals.length, 1)
  assert.equal(result.finals.length, 1)
  assert.ok(result.champion)
});

test('search and followed filters do not hide opponents or change the full bracket', () => {
  const db = buildWeeklyPlayoffFixture()
  const result = buildWeeklyAdvance(db, { query: 'no-match', followedOnly: true })
  assert.deepEqual(result.rows, [])
  assert.equal(result.elimination.semifinals[0].items.length, 2)
});

test('locked final results still display the score and champion; pilot records have no bracket', () => {
  const db = buildWeeklyPlayoffFixture()
  db.matches.at(-1).status = 'LOCKED'
  const result = buildWeeklyAdvance(db).elimination
  assert.equal(result.finals[0].items[0].state, 'complete')
  assert.equal(result.finals[0].items[0].scoreA, '3')
  assert.ok(result.champion)
  assert.equal(buildWeeklyAdvance(db, { cycleId: 'sample-pilot' }).elimination, null)
});

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildWeeklyPlayoffFixture } from './lib/weeklyPlayoffFixture.mjs'
import { buildWeeklyAdvance } from '../src/features/weekly-advance/weeklyAdvanceModel.js'
import { confirmedWeeklyWinner } from '../src/features/weekly-advance/weeklyEliminationModel.js'

const model = state => buildWeeklyAdvance(buildWeeklyPlayoffFixture(state)).elimination

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
});

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

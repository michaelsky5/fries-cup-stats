import assert from 'node:assert/strict'
import test from 'node:test'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { getMatchReviewMvp, getMatchReviewPlayers, getMatchReviewMvpUnavailableReason } from '../src/lib/matchReviewSelectors.js'

const roles = ['TANK', 'DPS', 'DPS', 'SUPPORT', 'SUPPORT']
const heroes = ['Reinhardt', 'Cassidy', 'Tracer', 'Ana', 'Kiriko']
function fixture() {
  const maps = Array.from({ length: 5 }, (_, index) => {
    const rows = side => roles.map((role, slot) => ({ player_id: `${side}-${slot}`, player_name: `${side}-${slot}`,
      role, heroes_played: heroes[slot], eliminations: side === 'B' && slot === 1 ? 40 : 10,
      assists: side === 'B' && slot === 1 ? 20 : 5, deaths: side === 'B' && slot === 1 ? 1 : 8,
      damage: side === 'B' && slot === 1 ? 15000 : 5000,
      healing: role === 'SUPPORT' ? 10000 : 0, mitigation: role === 'TANK' ? 15000 : 0 }))
    return { map_order: index + 1, map_name: 'Nepal', map_type: 'CONTROL', match_time: '10:00',
      winner: 'B', score_a: 0, score_b: 2, team_a_stats: rows('A'), team_b_stats: rows('B') }
  })
  const match = { match_id: 'FCW26-TEST-M01', season_id: 'FCW26', status: 'COMPLETE',
    scheduled_at: '2026-10-10T12:00:00Z', team_a: { id: 'A', name: 'A', score: 0 },
    team_b: { id: 'B', name: 'B', score: 5 }, maps }
  const players = [...maps[0].team_a_stats, ...maps[0].team_b_stats].map(row => ({ player_id: row.player_id,
    player_name: row.player_name, team_id: row.player_id[0], match_logs: maps.map(map => ({
      matchId: match.match_id, mapOrder: map.map_order, teamId: row.player_id[0], role: row.role,
      hero: row.heroes_played, playtimeMinutes: 10,
      totals: { elims: row.eliminations, assists: row.assists, deaths: row.deaths, damage: row.damage,
        healing: row.healing, blocked: row.mitigation }
    })) }))
  return { meta: { season_id: 'FCW26' }, matches: [match], players }
}
const dossier = db => getMatchDossier(db, 'FCW26-TEST-M01')

test('a complete cold-start match has an MVP without a fabricated v1.5 score', () => {
  const model = dossier(fixture())
  assert.equal(model.rating.supported, false)
  assert.equal(model.topRatedPlayer, null)
  assert.equal(model.matchAwardFallback.method, 'MATCH_RELATIVE')
  const mvp = getMatchReviewMvp(model)
  assert.equal(mvp.playerId, 'B-1')
  assert.equal(mvp.awardMethod, 'MATCH_RELATIVE')
  assert.equal(mvp.rating, null)
  assert.equal(mvp.awardEntry.matchAwardMinimumMaps, 3)
  assert.equal(getMatchReviewMvpUnavailableReason(model), null)
  assert.ok(getMatchReviewPlayers(model).every(player => player.rating === null))
  assert.ok(model.mapRecords.every(map => !map.rating.supported))
})

test('other matches, same-day additions and future results cannot change a cold-start award', () => {
  const db = fixture()
  const before = dossier(db).matchAwardFallback
  for (const day of ['2026-10-10', '2026-10-11', '2026-10-30']) {
    const other = structuredClone(db.matches[0])
    other.match_id = 'FCW26-OTHER-' + day
    other.scheduled_at = day + 'T12:00:00Z'
    db.matches.push(other)
    for (const player of db.players) player.match_logs.push(...player.match_logs.slice(0, 5).map(log => ({
      ...log, matchId: other.match_id, totals: { ...log.totals, damage: 999999 }
    })))
    assert.deepEqual(dossier(structuredClone(db)).matchAwardFallback, before)
  }
})

test('a losing-team player can win and public row order does not select the award', () => {
  const db = fixture()
  db.matches[0].team_a.score = 5
  db.matches[0].team_b.score = 0
  for (const map of db.matches[0].maps) {
    map.winner = 'A'
    map.team_a_stats.reverse()
    map.team_b_stats.reverse()
  }
  assert.equal(getMatchReviewMvp(dossier(db)).playerId, 'B-1')
})

test('substitutes below the existing appearance gate remain ineligible', () => {
  const db = fixture()
  db.matches[0].maps[0].team_b_stats[1] = { ...db.matches[0].maps[0].team_b_stats[1],
    player_id: 'SUB', player_name: 'SUB', eliminations: 9999, damage: 999999, deaths: 0 }
  const model = dossier(db)
  assert.ok(!model.matchAwardFallback.entries.some(entry => entry.player_id === 'SUB'))
  assert.notEqual(getMatchReviewMvp(model).playerId, 'SUB')
})

test('incomplete, administrative, invalid and untimed records cannot invent an award', () => {
  for (const mutate of [
    db => { delete db.matches[0].maps[0].team_a_stats[0].damage },
    db => { db.matches[0].maps[0].team_a_stats[0].damage = -1 },
    db => { db.matches[0].maps[0].team_a_stats[0].damage = false },
    db => { db.matches[0].maps[0].team_b_stats.pop() },
    db => { db.matches[0].maps[0].is_administrative = true },
    db => { db.matches[0].maps[0].rating_eligible = false },
    db => { db.matches[0].maps[0].team_b_stats[0].player_id = 'A-0' },
    db => { db.matches[0].maps[0].match_time = '' },
    db => { db.matches[0].maps[0].match_time = '10:99' },
    db => { db.players = []; db.matches[0].maps.forEach(map => { map.match_time = '' }) }
  ]) {
    const db = fixture()
    mutate(db)
    const model = dossier(db)
    assert.equal(model.matchAwardFallback, null)
    assert.equal(getMatchReviewMvp(model), null)
  }
})

test('unfinished matches and forfeits retain their result-state restrictions', () => {
  for (const fields of [{ status: 'LIVE' }, { status: 'PENDING' }, { is_forfeit: true }, { result_mode: 'FORFEIT' }]) {
    const db = fixture()
    Object.assign(db.matches[0], fields)
    assert.equal(dossier(db).matchAwardFallback, null)
    assert.equal(getMatchReviewMvp(dossier(db)), null)
  }
})

test('existing reference-based MVPs retain their exact selected entry and score', () => {
  const db = fixture()
  const prior = structuredClone(db.matches[0])
  prior.match_id = 'FCW26-PRIOR'
  prior.scheduled_at = '2026-10-09T12:00:00Z'
  db.matches.unshift(prior)
  db.players.forEach(player => player.match_logs.push(...player.match_logs.slice(0, 5).map(log => ({ ...log, matchId: prior.match_id }))))
  const model = dossier(db)
  assert.equal(model.rating.supported, true)
  assert.equal(model.matchAwardFallback, null)
  const mvp = getMatchReviewMvp(model)
  assert.equal(mvp.ratingEntry, model.topRatedPlayer)
  assert.ok(Number.isFinite(mvp.rating))
  assert.equal(mvp.awardMethod, undefined)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { centerModel, filterDirectory, rankedPlayers, teamProfile, metricText, routeView } from '../src/shared/centerModel.js'

const data = () => ({
  season: { id: 'FCW26' },
  teams: [{ team_id: 'A', team_name: '404队', team_short_name: '404', player_ids: ['P'] }, { team_id: 'B', team_name: 'BBB', team_short_name: 'B', player_ids: ['Q'] }],
  players: [{ player_id: 'P', display_name: '甲', player_name: 'Tag#1', team_id: 'A', role: 'DPS' }, { player_id: 'Q', display_name: '乙', team_id: 'B', role: 'SUPPORT' }, { player_id: 'Z', display_name: '没有统计', team_id: 'A' }],
  player_totals: [{ player_id: 'P', maps_played: 5, avg_elim: '0', avg_dmg: '12.3' }, { player_id: 'Q', maps_played: 5, avg_elim: '5', avg_dmg: null }],
  weekly_competition: { schema_version: 'friescup-weekly-public-v1', cycles: [{ id: 'C', status: 'ACTIVE', standings: [
    { team_id: 'B', display_rank: 1, tied: true, points: 19, played: 1 }, { team_id: 'A', display_rank: 1, tied: true, points: 19, played: 2 }
  ], weeks: [{ id: 'W1', status: 'PUBLISHED', week_number: 1, match_ids: ['M1'] }, { id: 'W2', status: 'PUBLISHED', week_number: 2, match_ids: ['M2'], rosters: [{ team_id: 'A', player_ids: ['Z'] }] }, { id: 'DRAFT', status: 'DRAFT', match_ids: ['PRIVATE'] }] }] },
  matches: [{ match_id: 'M1', cycle_id: 'C', cycle_week_id: 'W1', format: 'RR5', team_a: { team_id: 'A' }, team_b: { team_id: 'B' } }, { match_id: 'M2', cycle_id: 'C', cycle_week_id: 'W2', format: 'RR5', team_a: { team_id: 'A' }, team_b: { team_id: 'B' } }, { match_id: 'PRIVATE', cycle_id: 'C', cycle_week_id: 'DRAFT', team_a: { team_id: 'A' } }]
})
const selection = { cycleId: 'C', weekId: 'W2' }
test('MVP retains published tie ranks, points and ordering across week selection', () => {
  const raw = data()
  const model = centerModel(raw, selection, { teams: [], players: [] })
  assert.deepEqual(model.standings.map(row => [row.team_id, row.display_rank, row.points, row.tied]), [['B', 1, 19, true], ['A', 1, 19, true]])
  assert.deepEqual(centerModel(raw, { ...selection, weekId: 'W1' }).standings, model.standings)
  assert.equal(centerModel(raw, { ...selection, weekId: 'all' }).week.id, 'W2')
})
test('player following finds their public team fixtures and excludes unpublished matches', () => {
  const model = centerModel(data(), selection, { teams: [], players: ['P', 'missing'] })
  assert.deepEqual(model.followedMatches.map(match => match.id), ['M1', 'M2'])
  assert.equal(model.followedPlayers.length, 1)
  assert.equal(model.unavailableFollows, 1)
})
test('team profiles separate current directory from selected week locked players', () => {
  const model = centerModel(data(), selection)
  const profile = teamProfile(model, 'A')
  assert.deepEqual(profile.members.map(player => player.player_id), ['P'])
  assert.deepEqual(profile.lockedMembers.map(player => player.player_id), ['Z'])
  assert.equal(teamProfile(model, 'unknown'), null)
})
test('missing statistics are excluded from sorting; published zero is retained', () => {
  const model = centerModel(data(), selection)
  assert.deepEqual(rankedPlayers(model.players, 'avg_elim').map(player => player.player_id), ['Q', 'P'])
  assert.deepEqual(rankedPlayers(model.players, 'avg_dmg').map(player => player.player_id), ['P'])
  assert.equal(metricText(null), '—')
  assert.equal(metricText(false), '—')
  assert.equal(metricText('0'), '0')
})
test('directory supports NFKC team search, public BattleTags, and role filters', () => {
  const model = centerModel(data(), selection)
  assert.equal(filterDirectory(model, { query: '４０４' })[0].team_id, 'A')
  assert.equal(filterDirectory(model, { kind: 'players', query: 'tag＃1', role: 'DPS' })[0].player_id, 'P')
  assert.equal(filterDirectory(model, { kind: 'players', role: 'SUPPORT', teamId: 'A' }).length, 0)
})
test('direct detail routes choose a real section and unknown views fall back to overview', () => {
  assert.equal(routeView({ id: 'M', view: 'overview' }), 'matches')
  assert.equal(routeView({ player: 'P' }), 'roster')
  assert.equal(routeView({ view: 'admin' }), 'overview')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPlayerPreviewLookup, getPlayerPreview, getPlayerRosterPeers, getPlayerTeamDisplayIdentity, formatPlayerPreviewDate, formatPlayerPreviewMetric } from '../src/features/player-index/playerPreviewModel.js'

function fixture() {
  const match = (id, date, a, b, status = 'COMPLETE') => ({
    match_id: id, raw_match_id: `RAW-${id}`, scheduled_at: date, status,
    team_a: { id: 'A', short: 'A', score: a }, team_b: { id: 'B', short: 'B', score: b }
  })
  const player = {
    player_id: 'P', team_id: 'A', role: 'SUP', performanceRole: 'SUP',
    player_name: 'Player#1234', nickname: 'Player',
    match_logs: [
      { matchId: 'OLDER', teamId: 'A', role: 'SUP', hero: 'Kiriko', mapOrder: 1, playtimeMinutes: 20, totals: { healing: 40000, assists: 30, elims: 8 } },
      { rawMatchId: 'RAW-LATEST', teamId: 'A', role: 'DPS', hero: 'Cassidy', mapOrder: 1, playtimeMinutes: 10, totals: { damage: 12000, elims: 25 } }
    ]
  }
  const db = { players: [player], matches: [match('OLDER', '2026-10-03T12:00:00Z', '1', '4'), match('LATEST', '2026-10-04T12:00:00Z', '3', '2')] }
  return { player, db }
}

test('per-10 role metrics use only that role’s time and totals, while the default latest appearance covers all roles', () => {
  const { player, db } = fixture()
  const lookup = buildPlayerPreviewLookup(db, { id: 'FCW26' })
  const preview = getPlayerPreview(player, lookup)
  assert.equal(preview.role, 'SUPPORT')
  assert.equal(preview.minutes, 30)
  assert.equal(preview.maps, 2)
  assert.equal(preview.scopeRole, '')
  assert.deepEqual(preview.metrics, [{ id: 'heal', value: 20000 }, { id: 'ast', value: 15 }])
  assert.equal(preview.recent.matchId, 'LATEST')
  assert.equal(preview.recent.score, '3 : 2')
  assert.equal(preview.recent.result, 'win')
  const support = getPlayerPreview(player, lookup, 'SUPPORT')
  assert.equal(support.recent.matchId, 'OLDER')
  assert.equal(support.minutes, 20)
  assert.equal(support.maps, 1)
  assert.equal(support.scopeRole, 'SUPPORT')
  assert.deepEqual(getPlayerPreview(player, lookup, 'DPS').metrics, [{ id: 'dmg', value: 12000 }, { id: 'elim', value: 25 }])
})

test('the recent match is an actual appearance, not the current team’s latest fixture', () => {
  const { player, db } = fixture()
  db.matches.push({ ...db.matches[1], match_id: 'TEAM-ONLY', raw_match_id: 'RAW-TEAM-ONLY', scheduled_at: '2026-10-09T12:00:00Z' })
  assert.equal(getPlayerPreview(player, buildPlayerPreviewLookup(db)).recent.matchId, 'LATEST')
})

test('recorded team determines opponent and score orientation after a transfer', () => {
  const { player, db } = fixture()
  player.team_id = 'B'
  player.match_logs[1].teamId = 'A'
  db.matches[1].team_b = { id: 'B', short: '?', name: 'Ateam', score: '2' }
  const recent = getPlayerPreview(player, buildPlayerPreviewLookup(db)).recent
  assert.equal(recent.opponent, 'ATEAM')
  assert.equal(recent.score, '3 : 2')
  assert.equal(recent.result, 'win')
})

test('score and outcome reverse when the player appeared for the right team', () => {
  const { player, db } = fixture()
  player.match_logs[1].teamId = 'B'
  const recent = getPlayerPreview(player, buildPlayerPreviewLookup(db)).recent
  assert.equal(recent.opponent, 'A')
  assert.equal(recent.score, '2 : 3')
  assert.equal(recent.result, 'loss')
})

test('logs absent from this published snapshot cannot produce a stale match link', () => {
  const { player, db } = fixture()
  db.matches = []
  assert.equal(getPlayerPreview(player, buildPlayerPreviewLookup(db)).recent, null)
})

test('unknown team identity, missing time and zero-time logs cannot claim an appearance', () => {
  const { player, db } = fixture()
  player.match_logs[1].teamId = 'UNKNOWN'
  delete player.match_logs[0].playtimeMinutes
  assert.equal(getPlayerPreview(player, buildPlayerPreviewLookup(db)).recent, null)
  player.match_logs[0].playtimeMinutes = 0
  assert.equal(getPlayerPreview(player, buildPlayerPreviewLookup(db)).recent, null)
})

test('review and live scores cannot be labeled as a final win or loss', () => {
  for (const status of ['RESULT_REVIEW', 'IN_PROGRESS', 'PENDING']) {
    const { player, db } = fixture()
    db.matches[1].status = status
    const recent = getPlayerPreview(player, buildPlayerPreviewLookup(db)).recent
    assert.equal(recent.score, '')
    assert.equal(recent.result, '')
  }
})

test('missing scores are not displayed as a zero-zero result', () => {
  const { player, db } = fixture()
  db.matches[1].team_a.score = null
  const recent = getPlayerPreview(player, buildPlayerPreviewLookup(db)).recent
  assert.equal(recent.score, '')
  assert.equal(recent.result, '')
})

test('no-data players retain their role and show missing values, not fabricated zero averages', () => {
  const { player, db } = fixture()
  player.match_logs = []
  const preview = getPlayerPreview(player, buildPlayerPreviewLookup(db))
  assert.equal(preview.hasRecords, false)
  assert.equal(preview.minutes, 0)
  assert.equal(preview.maps, 0)
  assert.deepEqual(preview.metrics, [{ id: 'heal', value: null }, { id: 'ast', value: null }])
  assert.equal(preview.recent, null)
})

test('a sparse published appearance summary remains visible, without inventing metrics or borrowing it for a different role', () => {
  const { player, db } = fixture()
  player.match_logs = []
  const lookup = buildPlayerPreviewLookup(db)
  const summary = { ...player, hasStats: true, maps_played: 3, raw_time_mins: 17.2 }
  const preview = getPlayerPreview(summary, lookup)
  assert.equal(preview.hasRecords, true)
  assert.equal(preview.maps, 3)
  assert.equal(preview.minutes, 17.2)
  assert.equal(preview.metrics[0].value, null)
  assert.equal(preview.recent, null)
  assert.equal(getPlayerPreview(summary, lookup, 'TANK').hasRecords, false)
})

test('tank preview shows mitigation and eliminations; genuine zero remains zero', () => {
  const { player, db } = fixture()
  player.performanceRole = 'TANK'
  player.match_logs = [{ ...player.match_logs[0], role: 'TANK', hero: 'Reinhardt', playtimeMinutes: 10, totals: { blocked: 15000, elims: 0 } }]
  const preview = getPlayerPreview(player, buildPlayerPreviewLookup(db))
  assert.deepEqual(preview.metrics, [{ id: 'block', value: 15000 }, { id: 'elim', value: 0 }])
  assert.equal(formatPlayerPreviewMetric(preview.metrics[1].value, 'elim'), '0')
})

test('duplicate map logs do not change per-10 metrics or latest appearance', () => {
  const { player, db } = fixture()
  player.match_logs.push({ ...player.match_logs[0] })
  const preview = getPlayerPreview(player, buildPlayerPreviewLookup(db))
  assert.equal(preview.metrics[0].value, 20000)
  assert.equal(preview.minutes, 30)
  assert.equal(preview.maps, 2)
  assert.equal(preview.recent.matchId, 'LATEST')
})

test('a role change within one map adds playtime without counting the map twice in the season total', () => {
  const { player, db } = fixture()
  player.match_logs[1].rawMatchId = 'RAW-OLDER'
  const lookup = buildPlayerPreviewLookup(db)
  const preview = getPlayerPreview(player, lookup)
  assert.equal(preview.minutes, 30)
  assert.equal(preview.maps, 1)
  assert.equal(getPlayerPreview(player, lookup, 'SUPPORT').maps, 1)
  assert.equal(getPlayerPreview(player, lookup, 'DPS').maps, 1)
  assert.deepEqual(preview.heroes, ['Kiriko', 'Cassidy'])
})

test('season totals and heroes remain complete when detailed logs cover only part of the published summary', () => {
  const { player, db } = fixture()
  db.player_totals = [{ player_id: 'P', maps_played: 7, raw_time_mins: 120, most_played_hero: 'Winston', top_3_heroes: ['Winston', 'Kiriko', 'Cassidy'] }]
  const lookup = buildPlayerPreviewLookup(db)
  const preview = getPlayerPreview(player, lookup)
  assert.equal(preview.minutes, 120)
  assert.equal(preview.maps, 7)
  assert.deepEqual(preview.heroes, ['Winston', 'Kiriko', 'Cassidy'])
  assert.equal(getPlayerPreview(player, lookup, 'SUPPORT').minutes, 20)
})

test('duplicate imported segments repair season totals as well as role metrics', () => {
  const { player, db } = fixture()
  player.match_logs.push({ ...player.match_logs[0] })
  db.player_totals = [{ player_id: 'P', maps_played: 3, raw_time_mins: 50 }]
  const preview = getPlayerPreview(player, buildPlayerPreviewLookup(db))
  assert.equal(preview.minutes, 30)
  assert.equal(preview.maps, 2)
  assert.equal(preview.metrics[0].value, 20000)
})

test('duplicate zero-time placeholders do not replace a complete published season summary with partial logs', () => {
  const { player, db } = fixture()
  const placeholder = { ...player.match_logs[0], playtimeMinutes: 0, totals: {} }
  player.match_logs.push(placeholder, { ...placeholder })
  db.player_totals = [{ player_id: 'P', maps_played: 7, raw_time_mins: 120 }]
  const preview = getPlayerPreview(player, buildPlayerPreviewLookup(db))
  assert.equal(preview.minutes, 120)
  assert.equal(preview.maps, 7)
})

test('compact numeric precision and dates respect the published UTC+8 match day', () => {
  assert.equal(formatPlayerPreviewMetric(null, 'heal'), '—')
  assert.equal(formatPlayerPreviewMetric(7523.719, 'heal', 'zh-CN'), '7,524')
  assert.equal(formatPlayerPreviewMetric(14.251, 'ast', 'en-US'), '14.3')
  assert.equal(formatPlayerPreviewDate(Date.parse('2026-10-03T18:00:00Z'), 'en-US'), '10/04')
})

test('roster peers use canonical team membership rather than a shared team label', () => {
  const selected = { player_id: 'P', teamRouteId: 'TEAM-A', teamShortName: 'Same' }
  const peer = (id, team, role = 'DPS') => ({ player_id: id, team_id: team, teamShortName: 'Same', registrationRole: role, identity: { primary: id } })
  const roster = [peer('Other-team', 'TEAM-B'), peer('Support', 'TEAM-A', 'SUP'), peer('Tank', 'team-a', 'TANK'), peer('Damage', 'TEAM-A')]
  assert.deepEqual(getPlayerRosterPeers(selected, roster).map(player => player.player_id), ['Tank', 'Damage', 'Support'])
  assert.equal(roster[0].player_id, 'Other-team')
})

test('roster previews exclude self and duplicate IDs, but retain different players with the same name', () => {
  const selected = { identity: { playerId: 'SELF', primary: 'Same name' }, teamRouteId: 'A' }
  const peer = id => ({ identity: { playerId: id, primary: 'Same name' }, teamRouteId: 'A', registrationRole: 'DPS' })
  const roster = [peer('SELF'), peer('P1'), peer('p1'), peer('P2'), peer('P3'), peer('P4')]
  assert.deepEqual(getPlayerRosterPeers(selected, roster).map(player => player.identity.playerId), ['P1', 'P2', 'P3'])
  assert.equal(getPlayerRosterPeers(selected, roster, 8).length, 4)
})

test('unknown membership and incomplete player identities cannot create unrelated roster or archive links', () => {
  const selected = { player_id: 'P', teamRouteId: '?' }
  assert.deepEqual(getPlayerRosterPeers(selected, [{ player_id: 'Q', teamRouteId: '?', identity: { primary: 'Other' } }]), [])
  selected.teamRouteId = 'A'
  assert.deepEqual(getPlayerRosterPeers(selected, [
    { teamRouteId: 'A', identity: { primary: 'Missing ID' } },
    { player_id: 'Q', teamRouteId: 'A', identity: { primary: '' } },
    { player_id: 'R', teamRouteId: 'B', identity: { primary: 'Wrong team' } }
  ]), [])
  assert.deepEqual(getPlayerRosterPeers(selected, null), [])
})

test('the Ateam public name changes presentation without changing registration or route identity', () => {
  const player = { teamShortName: '?', teamFullName: 'Ateam', teamRouteId: 'TEAM-A' }
  assert.deepEqual(getPlayerTeamDisplayIdentity(player), { primary: 'ATEAM', secondary: '' })
  assert.equal(player.teamRouteId, 'TEAM-A')
  assert.equal(player.teamShortName, '?')
  assert.deepEqual(getPlayerTeamDisplayIdentity({ teamShortName: 'CSM', teamFullName: 'Clean soy milk' }), { primary: 'CSM', secondary: 'Clean soy milk' })
  assert.deepEqual(getPlayerTeamDisplayIdentity({ teamShortName: ' AST ', teamFullName: 'ast' }), { primary: 'AST', secondary: '' })
  assert.deepEqual(getPlayerTeamDisplayIdentity({ teamShortName: '？', teamFullName: '—' }), { primary: '？', secondary: '' })
  assert.deepEqual(getPlayerTeamDisplayIdentity({ teamShortName: '', teamFullName: 'Ateam' }), { primary: 'ATEAM', secondary: '' })
  assert.deepEqual(getPlayerTeamDisplayIdentity({ teamShortName: '?', teamFullName: 'Another Team' }), { primary: '?', secondary: 'Another Team' })
  assert.deepEqual(getPlayerTeamDisplayIdentity({}), { primary: '—', secondary: '' })
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildRosterOverview, getOverviewTeamRoster, searchRosterOverview } from '../src/features/roster-overview/rosterOverviewModel.js'
import { getSeasonById, withSeason } from '../src/config/seasons.js'
import { filterPlayers, getPlayerDirectory } from '../src/lib/rosterSelectors.js'

const season = getSeasonById('FCR2026')
const fixture = () => ({
  teams: [
    { team_id: 'A', team_short_name: 'ALPHA', player_ids: ['P1', 'P2', 'P3', 'P4'], staff: { managers: [{ name: 'Shared', battleTag: 'Shared#1234' }], coaches: [{ name: 'Shared', battleTag: 'Shared#1234' }] } },
    { team_id: 'B', team_short_name: 'BETA', team_coach: { name: 'Shared', battleTag: 'Shared#1234' } }
  ],
  players: [
    { player_id: 'P1', nickname: 'One', battle_tag: 'One#1234', team_id: 'A', role: 'TANK' },
    { player_id: 'P2', nickname: 'Two', team_id: 'A', role: 'DPS' },
    { player_id: 'P3', nickname: 'Three', team_id: 'A', role: 'SUP' },
    { player_id: 'P4', nickname: 'Four', team_id: 'A', role: 'SUPPORT' }
  ],
  matches: [
    { match_id: 'M1', team_a: { id: 'A', short: 'ALPHA' }, team_b: { id: 'B', short: 'BETA' }, broadcast: { admin: 'Shared', referee: 'Shared', caster: 'Voice', host: 'Voice' } },
    { match_id: 'M2', team_a: { id: 'B', short: 'BETA' }, team_b: { id: 'A', short: 'ALPHA' }, broadcast: { admin: 'Shared', caster: 'Shared' } }
  ]
})

test('explicit player IDs are authoritative despite renamed teams and reused names', () => {
  const db = { players: [
    { player_id: 'P1', team_id: 'OLD', team_short_name: 'RENAMED' },
    { player_id: 'P2', team_id: 'OTHER', team_short_name: 'SAME' },
    { player_id: 'P3', team_id: 'A', team_short_name: 'SAME' }
  ] }
  assert.deepEqual(getOverviewTeamRoster(db, { team_id: 'A', team_short_name: 'SAME', player_ids: [' p1 ', 'P1', 'MISSING'] }).map(player => player.player_id), ['P1'])
  assert.deepEqual(getOverviewTeamRoster(db, { team_id: 'A', team_short_name: 'SAME' }).map(player => player.player_id), ['P3'])
})

test('legacy names resolve only when at least one side lacks a published team ID', () => {
  const db = { players: [{ player_id: 'P1', team_short_name: 'alpha' }, { player_id: 'P2', team_id: 'B', team_short_name: 'ALPHA' }] }
  assert.deepEqual(getOverviewTeamRoster(db, { team_id: 'A', team_short_name: 'ALPHA' }).map(player => player.player_id), ['P1'])
  assert.equal(getOverviewTeamRoster(db, { shortName: 'ALPHA' }).length, 2)
  assert.deepEqual(getOverviewTeamRoster(db, {}), [])
  assert.deepEqual(getOverviewTeamRoster(db, null), [])
})

test('support aliases count once and a combined staff role is one team record', () => {
  const model = buildRosterOverview(fixture(), season)
  assert.equal(model.totalPlayers, 4)
  assert.deepEqual(model.roles.map(item => [item.role, item.count]), [['TANK', 1], ['DPS', 1], ['SUP', 2], ['FLEX', 0]])
  assert.equal(model.teamStaffCount, 2)
  assert.equal(model.staffCounts.managers, 1)
  assert.equal(model.staffCounts.coaches, 2)
  assert.equal(model.teams[0].staffRecords.length, 1)
  assert.deepEqual(model.teams[0].staffRecords[0].roles, ['manager', 'coach'])
})

test('match credits deduplicate source aliases within a role but keep different roles separate', () => {
  const model = buildRosterOverview(fixture(), season)
  assert.equal(model.eventStaffCount, 3)
  assert.equal(model.credits.admin[0].match_count, 2)
  assert.equal(model.credits.caster.find(row => row.staff_name === 'Voice').match_count, 1)
  assert.equal(model.credits.caster.find(row => row.staff_name === 'Shared').match_count, 1)
  assert.deepEqual(model.credits.admin[0].matchLinks, [
    { id: 'M1', teamA: 'ALPHA', teamB: 'BETA' }, { id: 'M2', teamA: 'BETA', teamB: 'ALPHA' }
  ])
})

test('unpublished player records retain roster size without inventing artwork or archive routes', () => {
  const model = buildRosterOverview({ teams: [
    { team_id: 'A', player_ids: ['P1', 'MISSING', 'MISSING'] },
    { team_id: 'B', team_short_name: 'BETA' }
  ], players: [
    { player_id: 'P1', nickname: 'No match record', role: 'TANK' },
    { nickname: 'No published ID', team_id: 'B', role: 'SUP' }
  ] }, season)
  const team = model.teams.find(team => team.routeId === 'A')
  assert.equal(team.rosterSize, 2)
  assert.equal(team.members.length, 1)
  assert.equal(team.heroMember, null)
  assert.equal(model.teams.find(team => team.routeId === 'B').members[0].href, '')
  assert.equal(model.groups.find(group => group.id === 'players').entries.length, 1)
  assert.deepEqual(model.credits.admin, [])
})

test('the default hero follows recorded play time while roster order and missing records stay truthful', () => {
  const db = fixture()
  Object.assign(db.players[0], { raw_time_mins: 120, maps_played: 12, most_played_hero: 'Sigma' })
  Object.assign(db.players[1], { raw_time_mins: 220, maps_played: 18, most_played_hero: 'Mei' })
  Object.assign(db.players[2], { raw_time_mins: '310.5', maps_played: 21, most_played_hero: 'Kiriko' })
  Object.assign(db.players[3], { most_played_hero: 'Ana' })
  const team = buildRosterOverview(db, season).teams.find(team => team.routeId === 'A')
  assert.equal(team.members[0].role, 'TANK')
  assert.equal(team.heroMember.identity.playerId, 'P3')
  assert.equal(team.heroMember.playedMinutes, 310.5)
  assert.equal(team.members.find(member => member.identity.playerId === 'P4').hero, '')
  assert.equal(team.members.find(member => member.identity.playerId === 'P4').playedMinutes, null)
})

test('hero defaults use recorded maps when time is absent and resolve ties consistently', () => {
  const db = fixture()
  Object.assign(db.players[0], { maps_played: 3, most_played_hero: 'Sigma' })
  Object.assign(db.players[1], { maps_played: 12, most_played_hero: 'Mei' })
  Object.assign(db.players[2], { maps_played: 12, most_played_hero: 'Kiriko' })
  const team = buildRosterOverview(db, season).teams.find(team => team.routeId === 'A')
  assert.equal(team.heroMember.identity.playerId, 'P3')
  assert.equal(team.heroMember.playedMinutes, null)
  assert.equal(team.heroMember.mapsPlayed, 12)
  assert.equal(buildRosterOverview({ ...db, players: [...db.players].reverse() }, season).teams.find(team => team.routeId === 'A').heroMember.identity.playerId, 'P3')
})

test('search resolves BattleTags and cross-role records to focused, season-preserving destinations', () => {
  const model = buildRosterOverview(fixture(), season)
  assert.equal(searchRosterOverview(model, 'Ｏｎｅ＃１２３４')[0].items[0].href, '/players/P1')
  const results = searchRosterOverview(model, 'Shared')
  assert.deepEqual(results.map(group => [group.id, group.total]), [['teamStaff', 2], ['eventStaff', 2]])
  for (const group of results) for (const item of group.items) {
    const target = new URL(withSeason(item.href, 'QGCS4', '?design=kpr5&lang=en'), 'http://localhost')
    assert.ok(target.pathname.startsWith('/staff/'))
    assert.equal(target.searchParams.get('group'), group.id === 'teamStaff' ? 'team' : 'event')
    assert.equal(decodeURIComponent(target.pathname.split('/').at(-1)), item.id.startsWith('admin:') || item.id.startsWith('caster:') ? 'event:' + item.id : item.id)
    assert.equal(target.searchParams.get('season'), 'QGCS4')
    assert.equal(target.searchParams.get('lang'), 'en')
    assert.equal(target.searchParams.get('design'), 'kpr5')
  }
})

test('view-all search links keep the matching destination query rather than producing an empty directory', () => {
  const db = fixture()
  const model = buildRosterOverview(db, season)
  const result = searchRosterOverview(model, ' ＡＬＰＨＡ ').find(group => group.id === 'players')
  assert.equal(result.total, 4)
  assert.equal(result.items.length, 3)
  const target = new URL(result.href, 'http://localhost')
  assert.equal(filterPlayers(getPlayerDirectory(db, {}, { season }), { q: target.searchParams.get('q') }).length, result.total)
  assert.deepEqual(searchRosterOverview(model, 'ALPHA One'), [])
  assert.deepEqual(searchRosterOverview(model, 'not-a-name'), [])
  assert.deepEqual(searchRosterOverview(model, '  '), [])
})

test('FCR26 preserves the actual six-player AIP roster, two staff records and sourced hero', () => {
  const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const model = buildRosterOverview(db, season)
  const team = model.teams.find(team => team.routeId === 'FCR26-T026')
  assert.deepEqual([model.teams.length, model.totalPlayers, model.teamStaffCount, model.eventStaffCount], [38, 259, 62, 31])
  assert.equal(team.members.length, 6)
  assert.equal(team.rosterSize, 6)
  assert.deepEqual(team.staffRecords.map(staff => staff.name).sort(), ['Dani2ois', '缚虎君'])
  assert.ok(team.heroMember)
  assert.ok(team.members.includes(team.heroMember))
  assert.equal(model.teams.find(team => team.shortName === 'ECNU').heroMember.identity.primary, '3e')
  assert.equal(model.roles.reduce((sum, item) => sum + item.count, 0), 259)
  assert.equal(model.rosterSizes.reduce((sum, item) => sum + item.count, 0), 38)
  assert.equal(model.rosterSizeBasis, 'opening')
  assert.deepEqual(model.rosterSizes, [{ size: 5, count: 3 }, { size: 6, count: 8 }, { size: 7, count: 27 }])
  for (const [shortName, archived, joins, exits] of [['TNS', 8, 1, 1], ['BR', 9, 2, 2], ['XCFN.W', 9, 2, 2], ['ECNU', 9, 2, 2]]) {
    const changed = model.teams.find(team => team.shortName === shortName)
    assert.deepEqual([changed.openingRosterSize, changed.rosterSize, changed.playoffJoins, changed.playoffExits], [7, archived, joins, exits])
    assert.equal(changed.members.length, archived, 'Keep departed players in the season archive')
    assert.equal(changed.members.filter(member => member.rosterChange === 'playoff_join').length, joins)
    assert.equal(changed.members.filter(member => member.rosterChange === 'playoff_exit').length, exits)
  }
  const publishedMatches = new Set(db.matches.map(match => match.match_id))
  assert.ok([...model.credits.admin, ...model.credits.caster].flatMap(staff => staff.matchLinks).every(match => publishedMatches.has(match.id)))
})

test('missing joining stages or missing published members cannot establish an opening roster size', () => {
  const db = fixture()
  const incomplete = buildRosterOverview(db, season)
  assert.equal(incomplete.rosterSizeBasis, 'season')
  assert.equal(incomplete.teams[0].openingRosterSize, null)
  assert.equal(incomplete.teams[0].rosterSize, 4)
  const missing = buildRosterOverview({ teams: [{ team_id: 'A', player_ids: ['P1', 'P2'] }], players: [
    { player_id: 'P1', team_id: 'A', join_stage: 'SEASON', role: 'TANK' }
  ] }, season)
  assert.equal(missing.rosterSizeBasis, 'season')
  assert.equal(missing.teams[0].openingRosterSize, null)
  assert.deepEqual(missing.rosterSizes, [{ size: 2, count: 1 }])
})

test('recorded opening counts are not clamped to the event rule and archive totals remain intact', () => {
  const players = Array.from({ length: 8 }, (_, i) => ({ player_id: 'P' + i, team_id: 'A', role: 'DPS', join_stage: 'SEASON' }))
  players.push({ player_id: 'NEW', team_id: 'A', role: 'DPS', join_stage: 'PLAYOFFS' })
  players[0].exit_stage = 'PLAYOFFS'
  const model = buildRosterOverview({ teams: [{ team_id: 'A', player_ids: players.map(player => player.player_id) }], players }, season)
  assert.equal(model.rosterSizeBasis, 'opening')
  assert.deepEqual(model.rosterSizes, [{ size: 8, count: 1 }])
  assert.equal(model.teams[0].members.length, 9)
  assert.deepEqual([model.teams[0].playoffJoins, model.teams[0].playoffExits], [1, 1])
})

test('an empty season has zero totals and no synthetic roster or credits', () => {
  const model = buildRosterOverview({}, season)
  assert.deepEqual([model.teams.length, model.totalPlayers, model.teamStaffCount, model.eventStaffCount], [0, 0, 0, 0])
  assert.deepEqual(model.rosterSizes, [])
  assert.equal(model.roles.reduce((sum, item) => sum + item.count, 0), 0)
  assert.deepEqual(searchRosterOverview(model, 'AIP'), [])
})

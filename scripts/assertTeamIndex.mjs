import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildTeamIndexPreview, matchesIndexTeam } from '../src/features/team-index/teamIndexModel.js'
import { getSeasonById } from '../src/config/seasons.js'
import { getTeamDirectory } from '../src/lib/rosterSelectors.js'
import { getPlayerRosterChange } from '../src/lib/rosterStage.js'
import { buildRosterOverview } from '../src/features/roster-overview/rosterOverviewModel.js'

test('published team IDs prevent a reused name or route alias from borrowing another team record', () => {
  assert.equal(matchesIndexTeam({ team_id: 'A', shortName: 'SAME', routeId: 'B' }, { id: 'B', short: 'SAME' }), false)
  assert.equal(matchesIndexTeam({ team_id: ' A ' }, { id: 'a', short: 'Renamed' }), true)
})

test('legacy name routes remain usable when a side has no published ID, while blank teams never match', () => {
  assert.equal(matchesIndexTeam({ routeId: 'ABC', shortName: 'ABC' }, { id: 'T1', short: 'abc' }), true)
  assert.equal(matchesIndexTeam({ team_id: 'T1', shortName: 'ABC' }, { short: 'abc' }), true)
  assert.equal(matchesIndexTeam({}, {}), false)
  assert.equal(matchesIndexTeam(null, { id: 'T1' }), false)
})

test('schedule entries retain pending matches and byes without inventing a final rank or starting roster', () => {
  const team = { team_id: 'T1', team_short_name: 'ABC', player_ids: ['P1', 'P2'] }
  const db = { teams: [team], players: [
    { player_id: 'P1', nickname: 'Registered', role: 'SUPPORT' },
    { player_id: 'P2', nickname: 'Reserve', role: 'DPS' }
  ], matches: [
    { match_id: 'BYE', stage: 'SWISS', status: 'COMPLETE', team_a: { id: 'T1' }, team_b: { id: 'BYE' }, maps: [] },
    { match_id: 'NEXT', stage: 'PLAYOFFS', status: 'PENDING', team_a: { id: 'T2' }, team_b: { id: 'T1' }, maps: [] },
    { match_id: 'OTHER', stage: 'SWISS', team_a: { id: 'OTHER', short: 'ABC' }, team_b: { id: 'T2' }, maps: [] }
  ] }
  const preview = buildTeamIndexPreview(db, getSeasonById('FCR2026'), team)
  assert.equal(preview.scheduleCount, 2)
  assert.deepEqual(preview.stages.map(stage => [stage.value, stage.count]), [['SWISS', 1], ['PLAYOFFS', 1]])
  assert.deepEqual(preview.roster.map(player => [player.identity.primary, player.role]), [['Registered', 'SUP'], ['Reserve', 'DPS']])
  assert.equal(preview.standing.rank ?? null, null)
  assert.equal(preview.standing.isArchived, false)
  assert.equal(preview.standing.label, '待生成')
})

test('unpublished schedules and unselected teams stay empty', () => {
  assert.equal(buildTeamIndexPreview({}, {}, null), null)
  const preview = buildTeamIndexPreview({}, getSeasonById('FCR2026'), { team_id: 'NO_RECORD' }, 'en-US')
  assert.equal(preview.scheduleCount, 0)
  assert.deepEqual(preview.roster, [])
  assert.deepEqual(preview.stages, [])
  assert.equal(preview.standing.label, 'Unpublished')
})

test('the public FCR26 AIP snapshot yields six registered names and twelve schedule entries', () => {
  const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const team = getTeamDirectory(db).find(team => team.team_id === 'FCR26-T026')
  const preview = buildTeamIndexPreview(db, getSeasonById('FCR2026'), team)
  assert.equal(preview.roster.length, 6)
  assert.equal(preview.scheduleCount, 12)
  assert.deepEqual(preview.stages.map(stage => [stage.value, stage.count]), [['SWISS', 6], ['PLAYOFFS', 6]])
  assert.equal(preview.standing.label, '冠军')
})

test('ECNU keeps all nine season records and the same playoff changes in both entry points', () => {
  const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const season = getSeasonById('FCR2026')
  const team = getTeamDirectory(db).find(team => team.team_id === 'FCR26-T035')
  const preview = buildTeamIndexPreview(db, season, team)
  const overview = buildRosterOverview(db, season).teams.find(row => row.team_id === team.team_id)
  const changes = Object.fromEntries(preview.roster.map(player => [player.identity.playerId, player.rosterChange]))
  assert.equal(preview.roster.length, 9)
  assert.equal(changes['FCR26-P0263'], 'playoff_join')
  assert.equal(changes['FCR26-P0264'], 'playoff_join')
  assert.equal(changes['FCR26-P0247'], 'playoff_exit')
  assert.equal(changes['FCR26-P0251'], 'playoff_exit')
  assert.equal(Object.values(changes).filter(Boolean).length, 4)
  assert.deepEqual(changes, Object.fromEntries(overview.members.map(member => [member.identity.playerId, member.rosterChange])))
})

test('stage notes use published change fields and leave unknown membership unlabelled', () => {
  assert.equal(getPlayerRosterChange({ join_stage: ' PLAYOFFS ' }), 'playoff_join')
  assert.equal(getPlayerRosterChange({ roster_status: 'playoff_introduction' }), 'playoff_join')
  assert.equal(getPlayerRosterChange({ roster_status: 'PLAYOFF_WITHDRAWAL' }), 'playoff_exit')
  assert.equal(getPlayerRosterChange({ join_stage: 'PLAYOFFS', exit_stage: 'PLAYOFFS' }), 'playoff_exit')
  assert.equal(getPlayerRosterChange({ status: 'EXITED' }), '')
  assert.equal(getPlayerRosterChange({}), '')
})

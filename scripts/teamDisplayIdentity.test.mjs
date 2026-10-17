import assert from 'node:assert/strict'
import test from 'node:test'
import { getTeamDisplayIdentity, getTeamDisplayName } from '../src/lib/teamDisplayIdentity.js'
import { getTeamDirectory, getTeamRouteId, getPlayerDirectory } from '../src/lib/rosterSelectors.js'
import { getTeamLabel, getMatchDisplayTeams } from '../src/lib/matchesSelectors.js'
import { formatTeamName } from '../src/lib/homeSelectors.js'
import { weeklyTeamShort } from '../src/features/weekly-overview/weeklyPresentation.js'
import { getTeamLogoCandidates } from '../src/lib/teamLogoResolver.js'
import { createDefaultTeamLogo } from '../src/lib/defaultTeamLogo.js'

test('ATEAM is a presentation choice while the registered symbol, membership and routes stay intact', () => {
  const team = { team_id: 'FCW26-T-45bcd508-d79', team_short_name: '?', team_name: 'Ateam', player_ids: ['P1'] }
  const db = { teams: [team], players: [{ player_id: 'P1', player_name: 'Player#1234', nickname: 'Player', team_id: team.team_id, role: 'DPS' }], matches: [] }
  const before = structuredClone(db)
  const directory = getTeamDirectory(db)[0]
  assert.equal(directory.shortName, 'ATEAM')
  assert.equal(directory.team_short_name, '?')
  assert.equal(directory.routeId, team.team_id)
  assert.equal(getTeamRouteId(directory), getTeamRouteId(team))
  assert.deepEqual(directory.player_ids, ['P1'])
  const player = getPlayerDirectory(db)[0]
  assert.equal(player.teamShortName, '?', 'lookup metadata remains registered')
  assert.equal(player.teamRouteId, team.team_id)
  assert.deepEqual(getTeamDisplayIdentity(player.teamShortName, player.teamFullName), { primary: 'ATEAM', secondary: '' })
  assert.deepEqual(db, before)
})

test('overview, match, directory and logo shapes share the same public name without changing scores', () => {
  const raw = { id: 'T1', short: '?', name: 'Ateam', score: 2 }
  const before = structuredClone(raw)
  assert.equal(getTeamDisplayName(raw), 'ATEAM')
  assert.equal(getTeamDisplayName({ short: '?', full: 'Ateam' }), 'ATEAM')
  assert.equal(getTeamLabel(raw), 'ATEAM')
  assert.equal(formatTeamName(raw), 'ATEAM')
  assert.equal(weeklyTeamShort(raw), 'ATEAM')
  assert.equal(getMatchDisplayTeams({ team_a: raw }).teamA.short, 'ATEAM')
  assert.equal(getTeamLogoCandidates({ short: '?', full: 'Ateam' }, 'FCW26')[0], createDefaultTeamLogo('ATEAM'))
  assert.deepEqual(raw, before)
})

test('other teams keep their actual names, including registered question marks', () => {
  assert.deepEqual(getTeamDisplayIdentity('?', 'Another Team'), { primary: '?', secondary: 'Another Team' })
  assert.deepEqual(getTeamDisplayIdentity('？', '蒙粤队'), { primary: '？', secondary: '蒙粤队' })
  assert.deepEqual(getTeamDisplayIdentity('NOVA', 'Ateam'), { primary: 'NOVA', secondary: 'Ateam' })
  assert.deepEqual(getTeamDisplayIdentity('', ''), { primary: '—', secondary: '' })
})

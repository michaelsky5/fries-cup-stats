import test from 'node:test'
import assert from 'node:assert/strict'
import { centerShare, centerUrl } from '../src/shared/centerRoutes.js'
import { initialSelection, scheduleModel } from '../src/shared/model.js'

const raw = {
  season: { id: 'FCW26' }, teams: [{ team_id: 'A', team_name: '404', team_short_name: '404' }, { team_id: 'B', team_name: 'BBB', team_short_name: 'BBB' }],
  players: [{ player_id: 'P', display_name: '突突', team_id: 'A' }],
  weekly_competition: { schema_version: 'friescup-weekly-public-v1', cycles: [{ id: 'C', status: 'ACTIVE', weeks: [{ id: 'W1', status: 'PUBLISHED', week_number: 1, match_ids: ['M1'] }, { id: 'W2', status: 'PUBLISHED', week_number: 2, match_ids: ['M2'] }, { id: 'DRAFT', status: 'DRAFT', match_ids: ['private'] }] }] },
  matches: [{ match_id: 'M1', cycle_id: 'C', cycle_week_id: 'W1', raw_match_id: 'source-M1', team_a: { team_id: 'A' }, team_b: { team_id: 'B' } }, { match_id: 'M2', cycle_id: 'C', cycle_week_id: 'W2', team_a: { team_id: 'A' }, team_b: { team_id: 'B' } }, { match_id: 'private', cycle_id: 'C', cycle_week_id: 'DRAFT', team_a: { team_id: 'A' }, team_b: { team_id: 'B' } }]
}
const options = path => Object.fromEntries(new URLSearchParams(path.split('?')[1] || ''))

test('shared match paths reopen the correct public week and canonical match identifier', () => {
  const share = centerShare(raw, 'matches', { id: 'source-M1' }, { cycleId: 'C', weekId: 'all' })
  const params = options(share.path)
  assert.equal(params.id, 'M1')
  assert.equal(params.week, 'W1')
  assert.match(share.title, /404 vs BBB/)
  const model = scheduleModel(raw, initialSelection(raw, params))
  assert.equal(model.entries[0].matches[0].id, params.id)
})

test('team and player shares contain public IDs; missing or unpublished IDs fall back to a public list', () => {
  assert.equal(options(centerShare(raw, 'roster', { player: 'P' }, { cycleId: 'C' }).path).player, 'P')
  assert.equal(options(centerShare(raw, 'roster', { team: 'A' }, { cycleId: 'C' }).path).team, 'A')
  assert.equal(options(centerShare(raw, 'matches', { id: 'private' }, { cycleId: 'C' }).path).id, undefined)
  assert.equal(options(centerShare(raw, 'roster', { player: 'gone' }, { cycleId: 'C' }).path).view, 'roster')
})

test('sharing local following opens public overview without personal state or arbitrary parameters', () => {
  const share = centerShare(raw, 'space', { token: 'secret', following: ['P'], query: 'my search' }, { cycleId: 'C', weekId: 'W2', query: 'another search' })
  assert.equal(options(share.path).view, 'overview')
  assert.doesNotMatch(share.path, /secret|following|search|token/)
  assert.doesNotMatch(centerUrl({ view: 'overview', token: 'secret', query: 'private' }), /secret|private|token|query/)
})

test('public detail shares retain valid analysis sections and roles without accepting private fields', () => {
  const player = options(centerShare(raw, 'roster', { player: 'P', section: 'analysis', role: 'DPS', token: 'private' }).path)
  assert.equal(player.section, 'analysis')
  assert.equal(player.role, 'DPS')
  assert.equal(player.token, undefined)
  const journey=options(centerShare(raw,'roster',{player:'P',dossierView:'journey',filters:'q=local&token=private'}).path)
  assert.equal(journey.dossierView,'journey');assert.equal(journey.filters,undefined)
  const team = options(centerShare(raw, 'roster', { team: 'A', section: 'analysis', topic: 'maps' }).path)
  assert.equal(team.topic, 'maps')
  const invalid = options(centerShare(raw, 'roster', { player: 'P', section: 'account', role: 'ADMIN' }).path)
  assert.equal(invalid.section, undefined)
  assert.equal(invalid.role, undefined)
})

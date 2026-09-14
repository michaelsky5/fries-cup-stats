import assert from 'node:assert/strict'
import test from 'node:test'
import { applyHeroSelections, createAutomaticHeroSelections, getHeroEditorRows, getTeamShareRoster } from '../src/features/team-share/teamShareHeroSelection.js'

const player = (id, hasAppearance = true) => ({ id, name: id, hasAppearance, heroCandidates: [{ key: 'sigma', name: 'Sigma' }, { key: 'dva', name: 'D.Va' }] })

test('a nine-player season keeps every name while limiting only the illustrated group', () => {
  const model = { rosterPlayers: Array.from({ length: 9 }, (_, i) => player(`P${i}`)) }
  const original = JSON.stringify(model)
  const roster = getTeamShareRoster(model)
  assert.equal(roster.registered.length, 9)
  assert.equal(roster.appeared.length, 9)
  assert.equal(roster.featured.length, 7)
  assert.deepEqual(roster.additional.map(row => row.id), ['P7', 'P8'])
  assert.deepEqual([...roster.featured, ...roster.additional, ...roster.unplayed].map(row => row.id).sort(), model.rosterPlayers.map(row => row.id).sort())
  assert.equal(getHeroEditorRows(model).length, 7)
  assert.equal(applyHeroSelections(model, createAutomaticHeroSelections(model)).rosterPlayers.length, 9)
  assert.equal(JSON.stringify(model), original)
})

test('unplayed registrations remain visible and do not displace recorded appearances', () => {
  const model = { rosterPlayers: [player('unplayed', false), ...Array.from({ length: 8 }, (_, i) => player(`P${i}`))] }
  const roster = getTeamShareRoster(model)
  assert.equal(roster.appeared.length, 8)
  assert.deepEqual(roster.featured.map(row => row.id), Array.from({ length: 7 }, (_, i) => `P${i}`))
  assert.deepEqual(roster.additional.map(row => row.id), ['P7'])
  assert.deepEqual(roster.unplayed.map(row => row.id), ['unplayed'])
  assert.equal(getHeroEditorRows(model).some(row => row.playerKey === 'unplayed'), false)
})

test('a registration-only team has no illustrated appearances or synthetic hero choices', () => {
  const model = { rosterPlayers: Array.from({ length: 9 }, (_, i) => player(`P${i}`, false)) }
  assert.equal(getTeamShareRoster(model).unplayed.length, 9)
  assert.equal(getTeamShareRoster(model).featured.length, 0)
  assert.deepEqual(createAutomaticHeroSelections(model), {})
  assert.deepEqual(getHeroEditorRows(model), [])
  assert.equal(getTeamShareRoster(null).registered.length, 0)
  assert.equal(getTeamShareRoster({ corePlayers: [player('legacy')] }).featured.length, 1)
})

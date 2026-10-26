import assert from 'node:assert/strict'
import { test } from 'node:test'
import { searchSite } from '../src/features/site-search/siteSearchModel.js'

const group = (id, names) => ({ id, href: `/${id}`, entries: names.map(name => ({ id: `${id}:${name}`, name, detail: '', fields: [name, id === 'players' ? '404' : ''], href: `/${id}/${name}` })) })
const model = { groups: [group('teams', ['404', 'SPS']), group('players', ['云海', '麦秸']), group('teamStaff', ['stellar']), group('eventStaff', ['云海'])] }

test('票 2.21: players lead, then teams and staff', () => {
  assert.deepEqual(searchSite(model, '云海').map(item => item.id), ['players', 'eventStaff'])
})

test('an exact name puts its group first, so Enter opens that record', () => {
  const groups = searchSite(model, '404')
  assert.deepEqual(groups.map(item => item.id), ['teams', 'players'])
  assert.equal(groups[0].items[0].href, '/teams/404')
})

test('an empty query or a missing snapshot gives nothing', () => {
  assert.deepEqual(searchSite(model, '   '), [])
  assert.deepEqual(searchSite(null, 'SPS'), [])
})

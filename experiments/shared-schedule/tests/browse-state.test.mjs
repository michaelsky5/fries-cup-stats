import test from 'node:test'
import assert from 'node:assert/strict'
import { createBrowseState, updateBrowseState, pageForCount } from '../src/shared/browseState.js'

test('directory and data browsing are independent and survive tab round trips', () => {
  let state = createBrowseState()
  state = updateBrowseState(state, 'roster', { kind: 'players', query: '404', role: 'DPS', teamId: 'A' })
  state = updateBrowseState(state, 'roster', { page: 2 })
  const directory = { ...state.roster }
  state = updateBrowseState(state, 'database', { tab: 'players', query: 'BBB', metric: 'avg_dmg' })
  state = updateBrowseState(state, 'database', { page: 1 })
  assert.deepEqual(state.roster, directory)
  assert.equal(state.database.metric, 'avg_dmg')
  assert.equal(state.database.page, 1)
  const refreshed = updateBrowseState(state, 'database', { tab: 'points' })
  assert.deepEqual(refreshed.roster, directory)
  assert.equal(refreshed.database.page, 1)
})

test('changing a filter returns to page one and an updated dataset clamps invalid pages', () => {
  let state = updateBrowseState(createBrowseState(), 'roster', { page: 4 })
  state = updateBrowseState(state, 'roster', { query: '突突' })
  assert.equal(state.roster.page, 0)
  assert.equal(pageForCount(4, 21), 1)
  assert.equal(pageForCount(4, 0), 0)
  assert.equal(pageForCount(-1, 83), 0)
  assert.equal(pageForCount(NaN, 83), 0)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyFollowing, FOLLOWING_KEY, readFollowing, toggleFollowing } from '../src/shared/followingStore.js'

test('following persists both teams and players, restores after reopening, and toggles off', () => {
  const values = new Map(), storage = { get: key => values.get(key), set: (key, value) => values.set(key, structuredClone(value)) }
  const first = toggleFollowing(storage, emptyFollowing(), 'teams', 'A')
  toggleFollowing(storage, first.data, 'players', 'P')
  const restored = readFollowing(storage)
  assert.deepEqual(restored.data, { version: 1, season: 'FCW26', teams: ['A'], players: ['P'] })
  assert.equal(restored.error, '')
  assert.deepEqual(toggleFollowing(storage, restored.data, 'teams', 'A').data.teams, [])
  assert.ok(values.has(FOLLOWING_KEY))
})
test('storage failures retain prior state and report that the change was not saved', () => {
  const current = { ...emptyFollowing(), teams: ['A'] }
  const result = toggleFollowing({ set() { throw new Error('quota') } }, current, 'teams', 'A')
  assert.strictEqual(result.data, current)
  assert.match(result.error, /未保存/)
})
test('corrupt and foreign-season storage cannot become FCW26 following', () => {
  for (const value of ['{broken', { version: 1, season: 'FCR26', teams: ['private'], players: [] }]) {
    const result = readFollowing({ get: () => value })
    assert.deepEqual(result.data, emptyFollowing())
    assert.match(result.error, /无法读取/)
  }
})
test('duplicate and malformed IDs in a valid record are normalized', () => {
  assert.deepEqual(readFollowing({ get: () => ({ ...emptyFollowing(), teams: ['A', 'A', null, 1, ''], players: ['P', 'P'] }) }).data.teams, ['A'])
})

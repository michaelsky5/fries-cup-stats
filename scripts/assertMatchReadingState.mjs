import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getCompactMapSelection, getMatchAnalysisSearch, getMatchMapDataSearch, getMatchStatsViewSearch } from '../src/components/matches/detail/matchReadingState.js'

test('phone navigation keeps the chosen map and its real neighbours, including gaps', () => {
  const maps = [{ order: 1 }, { order: 3 }, { order: 5 }]
  assert.deepEqual(getCompactMapSelection(maps, '3'), { map: maps[1], previous: maps[0], next: maps[2] })
  assert.deepEqual(getCompactMapSelection(maps, '5'), { map: maps[2], previous: maps[1], next: undefined })
  for (const requested of [null, '', 'missing', 2]) {
    assert.deepEqual(getCompactMapSelection(maps, requested), { map: maps[0], previous: undefined, next: maps[1] })
  }
  assert.deepEqual(getCompactMapSelection([], 3), { map: undefined, previous: undefined, next: undefined })
})

test('phone statistics view round-trips without losing map, filters or return context', () => {
  const search = new URLSearchParams('season=FCA2026&lang=en&map=3&collapsed=1&analysis=1&pquery=player&compareA=a')
  const full = getMatchStatsViewSearch(search, true)
  assert.equal(full.get('mapStats'), 'full')
  for (const [key, value] of search) assert.equal(full.get(key), value)
  assert.equal(getMatchStatsViewSearch(full, false).toString(), search.toString())
  assert.equal(search.has('mapStats'), false)
  assert.equal(getMatchAnalysisSearch(full, { findPlayer: true }).get('mapStats'), 'full')
})

test('opening player data preserves event, chosen map, disclosure and player filters', () => {
  const search = new URLSearchParams('season=FCR2026&lang=zh&design=kpr5&map=5&collapsed=1,3&pquery=3e&prole=SUPPORT&pside=A&analysis=0')
  const next = getMatchAnalysisSearch(search)
  assert.equal(next.get('analysis'), '1')
  for (const key of ['season', 'lang', 'design', 'map', 'collapsed', 'pquery', 'prole', 'pside']) assert.equal(next.get(key), search.get(key))
  assert.equal(search.get('analysis'), '0')
})

test('find player exits a comparison-only view without discarding the chosen pair', () => {
  const next = getMatchAnalysisSearch('analysis=1&pview=compare&compareA=a-support&compareB=b-support&map=2&collapsed=1', { findPlayer: true })
  assert.equal(next.get('pview'), 'summary')
  assert.equal(next.get('compareA'), 'a-support')
  assert.equal(next.get('compareB'), 'b-support')
  assert.equal(next.get('map'), '2')
  assert.equal(next.get('collapsed'), '1')
})

test('legacy comparison links reveal the search field, while existing readable views stay selected', () => {
  assert.equal(getMatchAnalysisSearch('compareA=a', { findPlayer: true }).get('pview'), 'summary')
  assert.equal(getMatchAnalysisSearch('compareB=b', { findPlayer: true }).get('pview'), 'summary')
  for (const view of ['maps', 'summary']) assert.equal(getMatchAnalysisSearch(`pview=${view}&compareA=a`, { findPlayer: true }).get('pview'), view)
  assert.equal(getMatchAnalysisSearch('pview=compare').get('pview'), 'compare')
})

test('collapse all only addresses supplied statistics maps and keeps the reading context', () => {
  const search = new URLSearchParams('season=QGCS4&lang=en&design=kpr5&map=5&collapsed=3&analysis=1&pquery=NF')
  const next = getMatchMapDataSearch(search, [1, 3, 5], false)
  assert.deepEqual(new Set(next.get('collapsed').split(',')), new Set(['1', '3', '5']))
  for (const key of ['season', 'lang', 'design', 'map', 'analysis', 'pquery']) assert.equal(next.get(key), search.get(key))
  assert.equal(search.get('collapsed'), '3')
})

test('expand all leaves unrelated disclosure state intact and removes an empty parameter', () => {
  assert.equal(getMatchMapDataSearch('collapsed=1,3,5&map=3', [1, 3], true).get('collapsed'), '5')
  const next = getMatchMapDataSearch('collapsed=1,3&map=3', [1, 3], true)
  assert.equal(next.has('collapsed'), false)
  assert.equal(next.get('map'), '3')
})

test('empty and invalid map targets cannot create fabricated map selections', () => {
  const next = getMatchMapDataSearch('map=2', [0, -1, '', 'unknown', 2.5], false)
  assert.equal(next.has('collapsed'), false)
  assert.equal(next.get('map'), '2')
  assert.equal(getMatchMapDataSearch('collapsed=2', [], false).get('collapsed'), '2')
  assert.equal(getMatchMapDataSearch('collapsed=2', [2, 2], false).get('collapsed'), '2')
})

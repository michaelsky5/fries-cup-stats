import test from 'node:test'
import assert from 'node:assert/strict'
import { roomSettlementProposal } from '../src/features/weekly-competition/roomSettlement.js'
import { roomSeriesMaps } from '../src/features/weekly-competition/roomSeriesMaps.js'
import { roomMapResultLabel } from '../src/features/weekly-competition/roomMapResults.js'
const room = (patch = {}) => ({ match: { format: 'RR5' }, result: { official: true, countsTowardStandings: true, maps: Array(5).fill({}), scoreA: 3, scoreB: 2, ...patch } })
test('reviewed RR5 includes five participation points for both teams', () => {
  assert.deepEqual(roomSettlementProposal(room()), { pointsA: 8, pointsB: 7, reason: 'RR5 五图参赛分 5 + 小局胜场分：8 / 7。' })
  assert.equal(roomSettlementProposal(room({ scoreA: 2, scoreB: 2 })).pointsB, 7)
})

test('four real map wins and a fifth-map forfeit propose 10:4 without inventing player data', () => {
  const maps = [...Array.from({ length: 4 }, (_, i) => ({ order: i + 1, scoreA: 2, scoreB: 0 })),
    { order: 5, scoreA: null, scoreB: null, isAdministrative: true, administrativeReason: 'MAP_FORFEIT', forfeitedBySide: 'B' }]
  const value = room({ scoreA: 5, scoreB: 0, maps }), before = structuredClone(maps)
  assert.deepEqual(roomSettlementProposal(value), { pointsA: 10, pointsB: 4, reason: 'RR5 实赛保留参赛分与胜场分，弃权图不给弃权方参赛分：10 / 4。' })
  assert.deepEqual(maps, before)
  assert.equal(roomSettlementProposal(room({ scoreA: 5, scoreB: 0, maps: [...maps.slice(0, 4), { ...maps[4], forfeitedBySide: '' }] })), null)
})
test('non-counting cycles and approved forfeits retain their own points', () => {
  assert.equal(roomSettlementProposal(room({ countsTowardStandings: false })).pointsA, 0)
  assert.equal(roomSettlementProposal(room({ forfeit: { pointsA: 0, pointsB: 6 }, maps: [] })).pointsB, 6)
})
test('reviewed weekly FT rooms use the match zero-point flag and preserve map-forfeit labels without fabricated scores', () => {
  const map = { order: 3, name: 'Dorado', scoreA: null, scoreB: null, isAdministrative: true, administrativeReason: 'MAP_FORFEIT', forfeitedBySide: 'A' }
  const data = { match: { format: 'FT3', teamA: { shortName: 'A Team' } }, maps: [], result: { official: true, countsTowardStandings: false, maps: [map], scoreA: 1, scoreB: 3 } }
  assert.deepEqual([roomSettlementProposal(data).pointsA, roomSettlementProposal(data).pointsB], [0, 0])
  assert.equal(roomMapResultLabel(roomSeriesMaps(data)[0], data.match, 'zh-CN'), 'A Team · 单图弃权')
  assert.equal(roomSeriesMaps(data)[0].scoreA, null)
  assert.equal(roomSettlementProposal({ ...data, result: { ...data.result, official: false } }), null)
})
test('working scores, incomplete or unsupported series are not prefilled', () => {
  assert.equal(roomSettlementProposal(room({ official: false })), null)
  assert.equal(roomSettlementProposal(room({ maps: [{}] })), null)
  assert.equal(roomSettlementProposal(room({ scoreA: 4, scoreB: 2 })), null)
  assert.equal(roomSettlementProposal({ ...room(), match: { format: 'FT3' } }), null)
})

test('reviewed reports replace incomplete live history in the series rail without changing either record', () => {
  const live = [{ order: 1, name: 'Old map', status: 'LIVE', banA: 'old-ban' }]
  const reviewed = Array.from({ length: 5 }, (_, index) => ({ order: index + 1, name: `Map ${index + 1}`, scoreA: 1, scoreB: 1 }))
  const data = { maps: live, result: { official: true, maps: reviewed } }
  const before = structuredClone(data)
  const display = roomSeriesMaps(data)
  assert.equal(display.length, 5)
  assert.ok(display.every(map => map.status === 'COMPLETE' && map.scoreA === 1 && map.scoreB === 1))
  assert.equal(display[0].banA, undefined)
  assert.deepEqual(data, before)
  assert.deepEqual(roomSeriesMaps({ maps: live, result: { official: true, maps: [] } }), [])
  assert.equal(roomSeriesMaps({ maps: live, result: { official: false, maps: reviewed } }), live)
})

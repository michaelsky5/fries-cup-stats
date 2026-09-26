import test from 'node:test'
import assert from 'node:assert/strict'
import { roomSettlementProposal } from '../src/features/weekly-competition/roomSettlement.js'
const room = (patch = {}) => ({ match: { format: 'RR5' }, result: { official: true, countsTowardStandings: true, maps: Array(5).fill({}), scoreA: 3, scoreB: 2, ...patch } })
test('reviewed RR5 includes five participation points for both teams', () => {
  assert.deepEqual(roomSettlementProposal(room()), { pointsA: 8, pointsB: 7, reason: 'RR5 五图参赛分 5 + 小局胜场分：8 / 7。' })
  assert.equal(roomSettlementProposal(room({ scoreA: 2, scoreB: 2 })).pointsB, 7)
})
test('non-counting cycles and approved forfeits retain their own points', () => {
  assert.equal(roomSettlementProposal(room({ countsTowardStandings: false })).pointsA, 0)
  assert.equal(roomSettlementProposal(room({ forfeit: { pointsA: 0, pointsB: 6 }, maps: [] })).pointsB, 6)
})
test('working scores, incomplete or unsupported series are not prefilled', () => {
  assert.equal(roomSettlementProposal(room({ official: false })), null)
  assert.equal(roomSettlementProposal(room({ maps: [{}] })), null)
  assert.equal(roomSettlementProposal(room({ scoreA: 4, scoreB: 2 })), null)
  assert.equal(roomSettlementProposal({ ...room(), match: { format: 'FT3' } }), null)
})

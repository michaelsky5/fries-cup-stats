import assert from 'node:assert/strict'
import { buildFixedDoubleEliminationPlayoff } from '../src/lib/playoffBracket.js'

function team(id, short, name, score = '') {
  return { id, short, name, score }
}

function match(number, teamA, teamB, { status = 'PENDING', winner = '' } = {}) {
  return {
    match_id: `FCR26-PLAYOFFS-R1-M${String(number).padStart(2, '0')}`,
    stage: 'PLAYOFFS',
    status,
    winner,
    team_a: teamA,
    team_b: teamB
  }
}

const tns = team('FCR26-T006', 'TNS', 'Team New Star')
const xcfn = team('FCR26-T028', 'XCFN.W', 'XCFN-White')
const ecnu = team('FCR26-T035', 'ECNU', '重生之我在瓦西大读研究生')
const br = team('FCR26-T017', 'BR', 'Boomrich')
const aip = team('FCR26-T026', 'AIP', 'Apes In Pajamas')
const mask = team('FCR26-T010', 'MASK', 'TEAM MASK')
const not = team('FCR26-T036', 'NOT', 'no this')
const reg = team('FCR26-T012', 'REG', 'Revival Gaming')
const loserOfM8 = team('TBD', 'L-M8', 'M8 败者')

const baseMatches = [
  match(5, { ...tns, score: '3' }, { ...xcfn, score: '0' }, { status: 'COMPLETE', winner: 'Team New Star' }),
  match(6, { ...ecnu, score: '3' }, { ...br, score: '0' }, { status: 'COMPLETE', winner: ecnu.name }),
  match(7, { ...aip, score: '2' }, { ...mask, score: '3' }, { status: 'COMPLETE', winner: 'TEAM MASK' }),
  match(8, not, reg),
  match(9, loserOfM8, tns),
  match(10, aip, ecnu)
]

const pendingLayout = buildFixedDoubleEliminationPlayoff({ matches: baseMatches })
const pendingM9 = pendingLayout.matches.find(row => row.number === 9)
const pendingM10 = pendingLayout.matches.find(row => row.number === 10)

assert.deepEqual(pendingM9.slots.map(slot => slot.team.short), ['TNS', 'L-M8'])
assert.deepEqual(pendingM10.slots.map(slot => slot.team.short), ['ECNU', 'AIP'])

const completedMatches = baseMatches.map(row => {
  if (row.match_id.endsWith('M08')) {
    return match(8, { ...not, score: '3' }, { ...reg, score: '2' }, { status: 'COMPLETE', winner: 'no this' })
  }
  if (row.match_id.endsWith('M09')) {
    return match(9, { ...reg, score: '3' }, { ...tns, score: '1' }, { status: 'COMPLETE', winner: 'Revival Gaming' })
  }
  return row
})

const completedLayout = buildFixedDoubleEliminationPlayoff({ matches: completedMatches })
const completedM9 = completedLayout.matches.find(row => row.number === 9)

assert.deepEqual(completedM9.slots.map(slot => slot.team.short), ['TNS', 'REG'])
assert.deepEqual([completedM9.scoreA, completedM9.scoreB], ['1', '3'])
assert.equal(completedM9.winner.short, 'REG')

console.log('Playoff bracket slot alignment assertions passed.')

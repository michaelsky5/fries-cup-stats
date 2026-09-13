import assert from 'node:assert/strict'
import { getFinalRanking } from '../src/lib/advanceSelectors.js'
import { buildFixedDoubleEliminationPlayoff } from '../src/lib/playoffBracket.js'
import { buildSwissSignalFlow } from '../src/lib/swissSignalFlow.js'

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

const archivedTeams = [
  { team_id: 'A', team_short_name: 'A', final_rank: '', current_rank: 2 },
  { team_id: 'B', team_short_name: 'B', final_rank: '', current_rank: 1 }
]

assert.deepEqual(getFinalRanking({ teams: archivedTeams }), [])
assert.deepEqual(
  getFinalRanking({ teams: archivedTeams }, { seasonFinished: true }).map(row => [row.team_short_name, row.final_rank, row.final_rank_source]),
  [['B', 1, 'current_rank'], ['A', 2, 'current_rank']]
)
assert.deepEqual(
  getFinalRanking({ teams: archivedTeams.map(teamRow => ({ ...teamRow, final_rank: teamRow.current_rank })) }, { seasonFinished: true })
    .map(row => [row.team_short_name, row.final_rank]),
  [['B', 1], ['A', 2]]
)
assert.deepEqual(
  getFinalRanking({ teams: archivedTeams.map(teamRow => ({ ...teamRow, current_rank: 1 })) }, { seasonFinished: true }),
  []
)

const swissFlow = buildSwissSignalFlow(
  [team('A', 'A', 'Team A'), team('B', 'B', 'Team B')],
  [
    { match_id: 'SWISS-R1-M1', round: 'ROUND 1', status: 'COMPLETE', team_a: { team_id: 'A', score: 2 }, team_b: { team_id: 'B', score: 0 } },
    { match_id: 'SWISS-R2-BYE', round: 'ROUND 2', status: 'COMPLETE', team_a: { team_id: 'A', score: 2 }, team_b: { team_id: 'BYE', team_short_name: 'BYE', score: 0 } }
  ],
  2
)

assert.deepEqual(
  swissFlow.rounds.map(round => [round.matches, round.records, round.byeRecords]),
  [[1, 1, 0], [0, 1, 1]]
)
assert.equal(swissFlow.stepsByTeam.get('A').length, 2)
assert.equal(swissFlow.stepsByTeam.get('A').at(-1).opponent.team_short_name, 'BYE')

console.log('Playoff bracket, archived final-ranking, and Swiss BYE assertions passed.')

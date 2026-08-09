import assert from 'node:assert/strict'
import {
  getMatchRoundScopeKey,
  getRoundKey,
  isMatchInRoundScope
} from '../src/lib/matchRoundScope.js'

const swissRoundOne = {
  match_id: 'FCR26-SWISS-R1-M01',
  stage: 'SWISS',
  round: 'ROUND 1'
}
const swissRoundOnePadded = {
  match_id: 'FCR26-SWISS-R1-M02',
  stage: 'SWISS',
  round: 'ROUND 01'
}
const lowerBracketRoundOne = {
  match_id: 'FCR26-PLAYOFFS-R1-M05',
  stage: 'PLAYOFFS',
  round: 'LB R1'
}
const upperBracketRoundOne = {
  match_id: 'FCR26-PLAYOFFS-R1-M01',
  stage: 'PLAYOFFS',
  round: 'UB R1'
}
const playoffGenericRoundOne = {
  match_id: 'FCR26-PLAYOFFS-R1-M09',
  stage: 'PLAYOFFS',
  round: 'ROUND 1'
}

assert.equal(getRoundKey('ROUND 01'), getRoundKey('R1'))
assert.equal(getMatchRoundScopeKey(swissRoundOne), getMatchRoundScopeKey(swissRoundOnePadded))
assert.notEqual(getMatchRoundScopeKey(swissRoundOne), getMatchRoundScopeKey(lowerBracketRoundOne))
assert.notEqual(getMatchRoundScopeKey(lowerBracketRoundOne), getMatchRoundScopeKey(upperBracketRoundOne))
assert.notEqual(getMatchRoundScopeKey(swissRoundOne), getMatchRoundScopeKey(playoffGenericRoundOne))

const matches = [
  swissRoundOne,
  swissRoundOnePadded,
  lowerBracketRoundOne,
  upperBracketRoundOne,
  playoffGenericRoundOne
]
const selected = matches.filter(match => isMatchInRoundScope(match, lowerBracketRoundOne))

assert.deepEqual(selected.map(match => match.match_id), ['FCR26-PLAYOFFS-R1-M05'])

console.log('Match round scope assertions passed.')

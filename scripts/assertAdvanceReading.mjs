import assert from 'node:assert/strict'
import { test } from 'node:test'
import { playoffRouteOutcome, publishedPlayoffWinnerId, resolveAdvanceTeam, updateAdvanceReadingSearch } from '../src/components/advance/advanceReadingState.js'

test('selection changes preserve event, phase, locale and unrelated return context', () => {
  const original = new URLSearchParams('season=FCR2026&lang=en&phase=playoffs&teamId=AIP&design=original')
  const next = updateAdvanceReadingSearch(original, { teamId: 'ECNU', division: 3 })
  assert.equal(next.get('season'), 'FCR2026')
  assert.equal(next.get('phase'), 'playoffs')
  assert.equal(next.get('lang'), 'en')
  assert.equal(next.get('design'), 'original')
  assert.equal(next.get('teamId'), 'ECNU')
  assert.equal(next.get('division'), '3')
  assert.equal(original.get('teamId'), 'AIP')
})

test('Swiss field and outcome filters clear explicitly without losing the team field state', () => {
  const next = updateAdvanceReadingSearch('season=FCA2026&teamId=A&zone=direct', { teamId: 'all', zone: null })
  assert.equal(next.get('teamId'), 'all')
  assert.equal(next.has('zone'), false)
  assert.equal(next.get('season'), 'FCA2026')
})

test('an unknown or cross-event team falls back only to an actual participant', () => {
  assert.equal(resolveAdvanceTeam('NF', ['NF', 'BNN'], 'BNN'), 'NF')
  assert.equal(resolveAdvanceTeam('AIP', ['NF', 'BNN'], 'NF'), 'NF')
  assert.equal(resolveAdvanceTeam('AIP', ['NF', 'BNN'], 'AIP'), 'NF')
  assert.equal(resolveAdvanceTeam('AIP', [], 'AIP'), '')
})

test('loss, elimination and title outcomes follow the actual double-elimination round', () => {
  assert.equal(playoffRouteOutcome({ lost: true, round: 'upperSemifinal' }), 'drop')
  assert.equal(playoffRouteOutcome({ lost: true, round: 'lowerRound2' }), 'out')
  assert.equal(playoffRouteOutcome({ lost: true, round: 'grandFinal' }), 'runner-up')
  assert.equal(playoffRouteOutcome({ won: true, round: 'grandFinal' }), 'champion')
  assert.equal(playoffRouteOutcome({ won: true, round: 'upperFinal' }), 'win')
  assert.equal(playoffRouteOutcome({ status: 'live', round: 'grandFinal' }), 'live')
  assert.equal(playoffRouteOutcome({ round: 'grandFinal' }), 'pending')
  assert.equal(playoffRouteOutcome({ lost: true }), 'loss')
})

test('both bracket adapters use published winners, without turning a live lead into a win', () => {
  assert.equal(publishedPlayoffWinnerId({ status: 'completed', winnerId: 'NF' }), 'NF')
  assert.equal(publishedPlayoffWinnerId({ status: 'completed', winner: { team_id: 'AIP' } }), 'AIP')
  assert.equal(publishedPlayoffWinnerId({ status: 'active', winnerId: 'NF', scoreA: 3, scoreB: 0 }), '')
  assert.equal(publishedPlayoffWinnerId({ status: 'completed', scoreA: 3, scoreB: 0 }), '')
})

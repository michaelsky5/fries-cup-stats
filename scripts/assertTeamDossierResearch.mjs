import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getDossierMatch, getDossierMapPool } from '../src/features/team-dossier/teamDossierPresentation.js'
import { getTeamResearch, getMapOpponents, getTeamOpponents, getTeamRematch, getSeriesSequence, getMemberConnections } from '../src/features/team-dossier/teamDossierResearch.js'

const map = (values = {}) => ({ map_name: 'Ilios', map_type: 'Control', score_a: 2, score_b: 0, ...values })
const row = (id, values = {}, side = 'team_a', opponent = { id: 'B', short: 'B' }) => getDossierMatch({ side, opponent, opponentLabel: opponent?.short || 'TBA', match: { match_id: id, stage: 'SWISS', status: 'COMPLETE', team_a: { id: 'A', score: 1 }, team_b: { id: 'B', score: 0 }, maps: [map()], ...values } })

test('a sequence reconciles each map with the series and identifies an opening-map loss', () => {
  const result = getSeriesSequence(row('M1', { team_a: { score: 2 }, team_b: { score: 1 }, maps: [map({ score_a: 0, score_b: 2 }), map(), map()] }))
  assert.equal(result.complete, true)
  assert.equal(result.openingLossWin, true)
  assert.equal(result.oneMapMargin, true)
  assert.deepEqual(result.sequence.map(item => item.runningScore), ['0 : 1', '1 : 1', '2 : 1'])
  assert.equal(result.sweep, false)
})

test('missing and administrative maps cannot manufacture a complete match pattern', () => {
  for (const values of [
    { team_a: { score: 2 } },
    { is_forfeit: true },
    { maps: [map(), map({ map_name: '', score_a: null })] },
    { maps: [map({ is_administrative: true })] },
    { status: 'SCHEDULED' }
  ]) {
    const result = getSeriesSequence(row('M1', values))
    assert.equal(result.complete, false)
    assert.equal(result.sweep, false)
    assert.equal(result.openingLossWin, false)
  }
})

test('draws remain in the sequence and do not become a clean sweep', () => {
  const result = getSeriesSequence(row('M1', { maps: [map({ score_a: 1, score_b: 1 }), map()] }))
  assert.equal(result.complete, true)
  assert.equal(result.sweep, false)
  assert.deepEqual(result.sequence.map(item => item.runningScore), ['0 : 0', '1 : 0'])
})

test('opponent aggregation excludes byes, administrative results and unknown identities', () => {
  const rows = [row('M1'), row('M2', { is_forfeit: true }), row('M3', { team_b: { id: 'BYE', score: 0 } }), row('M4', {}, 'team_a', null)]
  const research = getTeamResearch(rows)
  assert.equal(research.opponents.length, 1)
  assert.equal(research.opponents[0].rows.length, 1)
  assert.equal(research.unknownOpponents, 1)
  assert.equal(research.played.length, 2)
  assert.equal(getTeamRematch(research.opponents), null)
})

test('an unknown loss prevents attributing all map losses to one known opponent', () => {
  const loss = { team_a: { score: 0 }, team_b: { score: 1 }, maps: [map({ score_a: 0, score_b: 2 })] }
  const maps = getDossierMapPool([row('M1', loss), row('M2', loss, 'team_a', null)])
  assert.equal(getMapOpponents(maps[0]).concentratedLoss, null)
  assert.equal(getMapOpponents(maps[0]).unknownLosses, 1)
})

test('repeat-map records and ties are preserved when comparing two meetings', () => {
  const before = row('M1', { team_a: { score: 1 }, team_b: { score: 1 }, maps: [map(), map({ score_a: 0, score_b: 2 })] })
  const after = row('M2', { team_a: { score: 2 }, maps: [map(), map()] })
  const result = getTeamRematch(getTeamOpponents([before, after]))
  assert.equal(result.changed, false)
  assert.equal(result.maps.length, 1)
  assert.equal(result.maps[0].before.length, 2)
  assert.equal(result.maps[0].after.length, 2)
})

test('shared teammates intersect exact map identities, not just a match or team name', () => {
  const records = [{ match: { match_id: 'M1' }, mapIndex: 0 }, { match: { match_id: 'M1' }, mapIndex: 1 }]
  const member = { playerId: 'A', records: [records[0]] }
  const result = getMemberConnections(member, [member, { playerId: 'B', records: [records[1]] }, { playerId: 'C', records }])
  assert.deepEqual(result, [{ playerId: 'C', maps: 1 }])
})

test('FCR26 AIP research reconciles published series, opponent context and the MASK rematch', () => {
  const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const rows = db.matches.filter(match => [match.team_a?.id, match.team_b?.id].includes('FCR26-T026'))
    .sort((a, b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''))
    .map(match => {
      const side = match.team_a.id === 'FCR26-T026' ? 'team_a' : 'team_b'
      const opponent = match[side === 'team_a' ? 'team_b' : 'team_a']
      return getDossierMatch({ match, side, opponent, opponentLabel: opponent?.short || '' })
    })
  const research = getTeamResearch(rows)
  assert.equal(research.played.length, 10)
  assert.equal(research.summary.wins, 9)
  assert.equal(research.summary.losses, 1)
  assert.equal(research.records.length, 32)
  assert.equal(research.opponents.length, 8)
  const colosseo = research.mapPool.find(item => item.name === 'Colosseo')
  const circuit = research.mapPool.find(item => item.name === 'Circuit Royal')
  assert.equal(getMapOpponents(colosseo).concentratedLoss.label, 'MASK')
  assert.equal(colosseo.losses, 2)
  assert.equal(getMapOpponents(circuit).concentratedLoss.label, 'MASK')
  assert.equal(research.rematch.opponent.label, 'MASK')
  assert.equal(research.rematch.before.scoreLabel, '2 : 3')
  assert.equal(research.rematch.after.scoreLabel, '3 : 2')
  const royalPair = research.rematch.maps.find(item => item.name === 'Circuit Royal')
  assert.equal(royalPair.before[0].mapScore, '0 : 1')
  assert.equal(royalPair.after[0].mapScore, '5 : 4')
})

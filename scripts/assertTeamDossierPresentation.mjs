import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDossierSummary, getDossierMatch, getDossierJourneyStages, getDossierMapPool } from '../src/features/team-dossier/teamDossierPresentation.js'

const fixture = (overrides = {}, side = 'team_a') => getDossierMatch({ side, match: {
  match_id: 'M1', status: 'COMPLETE', stage: 'SWISS', round: 'Round 1',
  team_a: { id: 'A', short: 'A', score: 2 }, team_b: { id: 'B', short: 'B', score: 0 },
  maps: [{ map_name: 'Ilios', map_type: 'Control', score_a: 0, score_b: 2, map_order: 1 }], ...overrides
} })

test('published zero is a real score, and the dossier always uses the selected team perspective', () => {
  const row = fixture({}, 'team_b')
  assert.equal(row.tone, 'loss')
  assert.equal(row.scoreLabel, '0 : 2')
  assert.equal(getDossierMapPool([row])[0].wins, 1)
  assert.equal(getDossierMapPool([row])[0].records[0].mapScore, '2 : 0')
})
test('completed matches with missing scores remain unknown and do not lower the win rate', () => {
  const missing = fixture({ team_a: { id: 'A', score: null } })
  const summary = buildDossierSummary([fixture(), missing])
  assert.equal(missing.tone, 'unknown')
  assert.equal(missing.scoreLabel, '—')
  assert.equal(summary.completed, 2)
  assert.equal(summary.decided, 1)
  assert.equal(summary.winRate, 1)
})
test('byes and cancelled matches stay in the journey but are excluded from played-series statistics', () => {
  const bye = fixture({ team_b: { id: 'BYE', short: 'BYE', score: 0 } })
  const cancelled = fixture({ status: 'CANCELLED', is_forfeit: true })
  const rows = [fixture(), bye, cancelled]
  const summary = buildDossierSummary(rows)
  assert.equal(summary.completed, 1)
  assert.equal(summary.wins, 1)
  assert.equal(summary.byes, 1)
  assert.equal(getDossierMapPool(rows)[0].maps, 1)
  assert.equal(getDossierJourneyStages(rows)[0].rows.length, 3)
})
test('administrative series count as published results but never manufacture played-map evidence', () => {
  const row = fixture({ is_forfeit: true })
  assert.equal(buildDossierSummary([row]).wins, 1)
  assert.equal(row.administrative, true)
  assert.deepEqual(getDossierMapPool([row]), [])
})
test('map evidence ignores unknown names, missing scores and administrative maps', () => {
  const row = fixture({ maps: [
    { map_name: 'Ilios', map_type: 'Control', score_a: 0, score_b: 0 },
    { map_name: 'Oasis', map_type: 'Control', score_a: '', score_b: 0 },
    { map_name: 'Unknown', map_type: 'UNKNOWN', score_a: 1, score_b: 0 },
    { map_name: 'Lijiang Tower', map_type: 'Control', score_a: 2, score_b: 0, is_administrative: true }
  ] })
  const maps = getDossierMapPool([row])
  assert.equal(maps.length, 1)
  assert.equal(maps[0].draws, 1)
  assert.equal(maps[0].winRate, 0)
})
test('live, postponed and empty seasons retain their real state without inventing results', () => {
  const live = fixture({ status: 'LIVE', team_a: { score: 1 }, team_b: { score: 1 } })
  assert.equal(live.tone, 'live')
  assert.equal(live.scoreLabel, '1 : 1')
  assert.equal(fixture({ status: 'POSTPONED' }).note, '延期')
  assert.equal(buildDossierSummary([live]).winRate, null)
  assert.equal(buildDossierSummary([]).winRate, null)
  assert.deepEqual(getDossierMapPool([live]), [])
})
test('draws and losses end a streak while a bye does not turn into an extra win', () => {
  const draw = fixture({ team_a: { score: 1 }, team_b: { score: 1 } })
  const bye = fixture({ team_b: { short: 'BYE' } })
  const summary = buildDossierSummary([fixture(), bye, fixture(), draw, fixture()])
  assert.equal(summary.longestStreak, 2)
  assert.equal(summary.draws, 1)
  assert.equal(summary.winRate, .75)
})
test('stage grouping retains encounter order and both language labels', () => {
  const rows = [fixture(), fixture({ match_id: 'FINAL', stage: 'PLAYOFFS', round: 'Grand Final' })]
  assert.deepEqual(getDossierJourneyStages(rows).map(stage => stage.label), ['瑞士轮', '季后赛'])
  assert.deepEqual(getDossierJourneyStages(rows, 'en-US').map(stage => stage.label), ['Swiss stage', 'Playoffs'])
  assert.equal(rows[1].roundLabel, '总决赛')
  assert.equal(fixture({ round: 'UB SF' }).roundLabel, '胜者组半决赛')
  assert.equal(fixture({ round: 'LB R3' }).roundLabel, '败者组第 3 轮')
})
test('map aliases form one record instead of splitting the same map', () => {
  const row = fixture({ maps: [
    { map_name: 'Ilios', map_type: 'Control', score_a: 2, score_b: 0 },
    { map_name: '伊利奥斯', map_type: 'Control', score_a: 1, score_b: 2 }
  ] })
  const maps = getDossierMapPool([row])
  assert.equal(maps.length, 1)
  assert.equal(maps[0].maps, 2)
  assert.equal(maps[0].winRate, .5)
})

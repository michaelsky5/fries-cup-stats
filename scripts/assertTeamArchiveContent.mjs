import assert from 'node:assert/strict'
import test from 'node:test'
import { getDossierMatch } from '../src/features/team-dossier/teamDossierPresentation.js'
import { getArchiveMapRecords, getArchiveMembers, getArchiveJourneyHref, getArchiveStageHref, getArchiveMatchReading, getArchiveStageAnalysis, getArchiveDistribution, getArchiveMetricAvailability } from '../src/features/team-dossier/teamArchiveContent.js'

const map = (overrides = {}) => ({ map_name: 'Ilios', map_type: 'Control', score_a: 2, score_b: 0, ...overrides })
const row = (overrides = {}, side = 'team_a') => getDossierMatch({ side, opponent: { id: side === 'team_a' ? 'B' : 'A' }, opponentLabel: side === 'team_a' ? 'B' : 'A', match: {
  match_id: 'M1', stage: 'SWISS', round: 'Round 1', status: 'COMPLETE', team_a: { id: 'A', score: 1 }, team_b: { id: 'B', score: 0 }, maps: [map()], ...overrides
} })
const roster = [{ player_id: 'P1', nickname: 'Same name' }, { player_id: 'P2', nickname: 'Same name' }, { player_id: 'P3', nickname: 'Unused' }]

test('appearances use exact player identities, deduplicate a map and never borrow an opponent appearance', () => {
  const rows = [row({ maps: [map({ team_a_stats: [{ player_id: 'P1' }, { player_id: 'P1' }, { player_name: 'Same name' }], team_b_stats: [{ player_id: 'P2' }] }), map({ map_name: 'Oasis', team_a_stats: [{ player_id: 'P1' }] })] })]
  const members = getArchiveMembers(roster, rows)
  assert.equal(members[0].maps, 2)
  assert.equal(members[0].series, 1)
  assert.equal(members[1].maps, 0)
  assert.equal(members[2].latest, null)
})

test('combined player stats are filtered to the selected team side', () => {
  const members = getArchiveMembers(roster, [row({ maps: [map({ player_stats: [{ player_id: 'P1', side: 'A' }, { player_id: 'P2', side: 'B' }] })] }, 'team_b')])
  assert.equal(members[0].maps, 0)
  assert.equal(members[1].maps, 1)
  assert.equal(members[1].latest.mapScore, '0 : 2')
  assert.equal(members[1].latest.mapOutcome, 'loss')
})

test('byes, administrative results, invalid maps and unknown identities never manufacture appearances', () => {
  const maps = [map({ team_a_stats: [{ player_id: 'P1' }] })]
  const rows = [row({ maps, is_administrative: true }), row({ match_id: 'BYE', maps, team_b: { id: 'BYE', score: 0 } }), row({ match_id: 'M2', maps: [map({ score_a: null, team_a_stats: [{ player_id: 'P1' }] })] }), row({ match_id: 'M3', maps: [map({ team_a_stats: [{ player_name: 'Same name' }] })] })]
  assert.deepEqual(getArchiveMembers(roster, rows).map(member => member.maps), [0, 0, 0])
})

test('map and member trails stay in fixture order after map aggregation groups aliases', () => {
  const stats = { team_a_stats: [{ player_id: 'P1' }] }
  const rows = [row({ maps: [map({ ...stats, map_name: 'Oasis' }), map(stats)] }), row({ match_id: 'M2', stage: 'PLAYOFFS', maps: [map({ ...stats, map_name: '伊利奥斯' })] })]
  assert.deepEqual(getArchiveMapRecords(rows).map(record => `${record.match.match_id}-${record.mapIndex}`), ['M1-0', 'M1-1', 'M2-0'])
  const member = getArchiveMembers(roster, rows)[0]
  assert.equal(member.first.mapCanonicalName, 'Oasis')
  assert.equal(member.latest.match.match_id, 'M2')
  assert.deepEqual(member.stages.map(stage => [stage.key, stage.maps]), [['SWISS', 2], ['PLAYOFFS', 1]])
})

test('member-to-journey links preserve team context and target the exact match scene', () => {
  const url = new URL(getArchiveJourneyHref('/teams/A/journey?season=S&design=kpr5&lang=en&teamMap=Ilios', 'M / 2', 'P1'), 'http://localhost')
  assert.equal(url.searchParams.get('chapter'), 'season-route')
  assert.equal(url.searchParams.get('teamMatch'), 'M / 2')
  assert.equal(url.searchParams.get('member'), 'P1')
  assert.equal(url.searchParams.get('teamMap'), 'Ilios')
  assert.equal(url.searchParams.get('season'), 'S')
})

test('stage evidence clears a stale result filter and opens the full relevant ledger', () => {
  const url = new URL(getArchiveStageHref('/teams/A/journey?season=S&result=loss&teamMatch=OLD&member=P1', 'PLAYOFFS'), 'http://localhost')
  assert.equal(url.searchParams.get('chapter'), 'journey')
  assert.equal(url.searchParams.get('teamStage'), 'PLAYOFFS')
  assert.equal(url.searchParams.get('journey'), 'all')
  assert.equal(url.searchParams.has('result'), false)
  assert.equal(url.searchParams.has('teamMatch'), false)
  assert.equal(url.searchParams.get('member'), 'P1')
})

test('match reading only describes an opening-map recovery when the full score is supported', () => {
  const maps = [map({ score_a: 0, score_b: 2 }), map({ map_name: 'Oasis' }), map({ map_name: 'Nepal' })]
  const match = row({ maps, team_a: { score: 2 }, team_b: { score: 1 } })
  assert.match(getArchiveMatchReading(match, [match]), /先丢 1 图/)
  const incomplete = row({ maps: maps.slice(0, 2), team_a: { score: 2 }, team_b: { score: 1 } })
  assert.doesNotMatch(getArchiveMatchReading(incomplete, [incomplete]), /先丢|连下/)
  const admin = row({ is_forfeit: true })
  assert.equal(getArchiveMatchReading(admin, [admin]), '判罚 / 弃权结果')
})

test('rematch copy connects the same known opponent and only earlier played results', () => {
  const first = row({ team_a: { score: 0 }, team_b: { score: 1 } })
  const second = row({ match_id: 'M2' })
  assert.match(getArchiveMatchReading(second, [first, second]), /再次交手 B：上一次 0 : 1，这一次 1 : 0/)
  assert.doesNotMatch(getArchiveMatchReading(first, [first, second]), /再次交手/)
  const unknown = { ...second, opponent: null, opponentLabel: '' }
  assert.doesNotMatch(getArchiveMatchReading(unknown, [{ ...first, opponent: null, opponentLabel: '' }, unknown]), /再次交手/)
})

test('stage comparisons count maps, include draws in the denominator, and exclude administrative maps', () => {
  const rows = [row({ maps: [map(), map({ score_a: 0 }), map({ is_administrative: true })] }), row({ match_id: 'M2', stage: 'PLAYOFFS', maps: [map({ score_a: 0, score_b: 1 })] }), row({ match_id: 'M3', stage: 'PLAYOFFS', is_forfeit: true })]
  const stages = getArchiveStageAnalysis(rows)
  assert.deepEqual(stages.map(stage => [stage.label, stage.maps, stage.wins, stage.draws, stage.winRate]), [['瑞士轮', 2, 1, 1, .5], ['季后赛', 1, 0, 0, 0]])
  assert.equal(stages[0].opponentCount, 1)
  assert.equal(getArchiveStageAnalysis(rows, 'en-US')[0].label, 'Swiss stage')
  assert.deepEqual(getArchiveStageAnalysis([]), [])
})

test('distributions calculate the median from real samples, retaining zero and excluding missing values', () => {
  const profiles = [0, 8, 2, 4, null, undefined, NaN].map((value, id) => ({ id, name: `T${id}`, values: { damage: value } }))
  const distribution = getArchiveDistribution(profiles, 'damage')
  assert.deepEqual(distribution.samples.map(sample => sample.value), [0, 2, 4, 8])
  assert.equal(distribution.median, 3)
  assert.equal(distribution.max, 8)
  assert.equal(getArchiveDistribution(profiles.slice(0, 3), 'damage').median, 2)
  assert.equal(getArchiveDistribution([], 'damage').median, null)
  assert.equal(getArchiveDistribution([{ id: 'missing' }], 'damage').samples.length, 0)
})

test('missing metrics on any active member are distinct from an explicitly published zero', () => {
  const metrics = [{ id: 'damage', totalKeys: ['total_dmg'], avgKeys: ['avg_dmg'] }]
  assert.equal(getArchiveMetricAvailability([{ total_dmg: 0 }, { avg_dmg: 15 }], metrics).damage, true)
  assert.equal(getArchiveMetricAvailability([{ total_dmg: 0 }, { avg_dmg: '' }], metrics).damage, false)
  assert.equal(getArchiveMetricAvailability([{ total_dmg: null }], metrics).damage, false)
  assert.equal(getArchiveMetricAvailability([], metrics).damage, false)
  const profiles = [{ id: 'zero', values: { damage: 0 }, available: { damage: true } }, { id: 'incomplete', values: { damage: 100 }, available: { damage: false } }]
  assert.deepEqual(getArchiveDistribution(profiles, 'damage').samples.map(sample => sample.id), ['zero'])
})

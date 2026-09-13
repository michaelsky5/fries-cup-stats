import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  getPerformanceRows,
  buildTeamPerformance,
  getPerformanceField,
  performanceMinutes,
  memberMatchup
} from '../src/features/team-dossier/teamPerformance.js'

const players = (side, values = {}) =>
  Array.from({ length: 5 }, (_, index) => ({
    player_id: `${side}${index}`,
    player_name: `${side}${index}`,
    side: side === 'A' ? 'A' : 'B',
    role: index === 0 ? 'TANK' : index < 3 ? 'DPS' : 'SUP',
    heroes_played: index === 0 ? 'Mauga' : index < 3 ? 'Reaper' : 'Kiriko',
    damage: 100,
    healing: 0,
    mitigation: 0,
    eliminations: 4,
    assists: 2,
    deaths: 1,
    ...values
  }))
const map = (values = {}) => ({
  map_name: 'Ilios',
  map_type: 'Control',
  map_order: 1,
  score_a: 2,
  score_b: 0,
  match_time: '10:00',
  team_a_stats: players('A'),
  team_b_stats: players('B', { damage: 200 }),
  ...values
})
const match = (id, values = {}) => ({
  match_id: id,
  status: 'COMPLETE',
  scheduled_at: '2026-08-01T12:00:00Z',
  stage: 'SWISS',
  team_a: { id: 'A', short: 'A', score: 1 },
  team_b: { id: 'B', short: 'B', score: 0 },
  maps: [map()],
  ...values
})
const report = (matches, id = 'A', roster = []) =>
  buildTeamPerformance(getPerformanceRows(matches, id), roster)

test('team rates are time-weighted totals, with mirrored sides and zero values preserved', () => {
  const source = [
    match('M1'),
    match('M2', { maps: [map({ match_time: '20:00', team_a_stats: players('A', { damage: 200 }) })] })
  ]
  const a = report(source)
  const b = report(source, 'B')
  assert.equal(a.metrics.damage.value, 500)
  assert.equal(a.metrics.healing.value, 0)
  assert.equal(a.paired.damage.own.count, 2)
  assert.equal(a.paired.damage.opponent.value, b.paired.damage.own.value)
  assert.equal(b.summary.losses, 2)
  assert.equal(a.records.length, 2)
})

test('missing metric excludes only that metric; paired denominators use matching maps', () => {
  const missing = players('B')
  missing[0].damage = null
  const result = report([match('M1'), match('M2', { maps: [map({ team_b_stats: missing })] })])
  assert.equal(result.metrics.damage.count, 2)
  assert.equal(result.paired.damage.own.count, 1)
  assert.equal(result.paired.damage.opponent.count, 1)
  assert.equal(result.paired.healing.own.count, 2)
  assert.equal(result.metrics.healing.value, 0)
})

test('partial and repeated identities do not fabricate a five-player total', () => {
  const repeated = players('A')
  repeated[4].player_id = repeated[3].player_id
  for (const team_a_stats of [players('A').slice(0, 4), repeated]) {
    const result = report([match('M1', { maps: [map({ team_a_stats })] })])
    assert.equal(result.metrics.damage.value, null)
    assert.equal(result.paired.damage.own.count, 0)
    assert.equal(result.cohorts.length, 0)
  }
})

test('canonical side arrays are not double-counted through the combined player list', () => {
  const result = report([match('M1', { maps: [map({ player_stats: [...players('A'), ...players('B')] })] })])
  assert.equal(result.metrics.damage.value, 500)
  assert.equal(result.members.length, 5)
  const fallback = report([
    match('M2', {
      maps: [map({ team_a_stats: [], team_b_stats: [], player_stats: [...players('A'), ...players('B')] })]
    })
  ])
  assert.equal(fallback.metrics.damage.value, 500)
})

test('administrative maps, cancelled matches and missing duration stay out of rate evidence', () => {
  const result = report([
    match('A1', { is_forfeit: true }),
    match('A2', { maps: [map({ is_administrative: true })] }),
    match('C', { status: 'CANCELLED' }),
    match('T', { maps: [map({ match_time: '' })] })
  ])
  assert.equal(result.records.length, 1)
  assert.equal(result.metrics.damage.value, null)
  assert.equal(result.administrative, 1)
  assert.equal(performanceMinutes(''), null)
  assert.equal(performanceMinutes('10:99'), null)
  assert.equal(performanceMinutes('1:02:30'), 62.5)
})

test('registered players without appearances stay visible with unknown performance, not zero', () => {
  const result = report([match('M1')], 'A', [{ player_id: 'A9', nickname: 'Unused', role: 'SUP' }])
  const member = result.members.find((item) => item.id === 'A9')
  assert.equal(member.maps, 0)
  assert.equal(member.metrics.damage.value, null)
  assert.equal(result.members.length, 6)
})

test('an explicit zero or invalid player duration cannot borrow the whole map duration', () => {
  for (const time of ['0:00', 'unknown']) {
    const team_a_stats = players('A')
    team_a_stats[0].time = time
    const result = report([match('M1', { maps: [map({ team_a_stats })] })])
    assert.equal(result.metrics.damage.value, null)
    assert.equal(result.members.find((member) => member.id === 'A0').metrics.damage.value, null)
  }
})

test('a partial opposing roster cannot represent the full same-role opponent sample', () => {
  const result = report([match('M1', { maps: [map({ team_b_stats: players('B').slice(0, 2) })] })])
  assert.equal(
    memberMatchup(
      result.members.find((member) => member.id === 'A1'),
      'damage'
    ).count,
    0
  )
})

test('same-role opponent rates are per-player and use only matched maps', () => {
  const result = report([match('M1')])
  const comparison = memberMatchup(
    result.members.find((member) => member.id === 'A1'),
    'damage'
  )
  assert.equal(comparison.own, 100)
  assert.equal(comparison.opponent, 200)
  assert.equal(comparison.count, 1)
  assert.equal(
    memberMatchup(
      result.members.find((member) => member.id === 'A1'),
      'healing'
    ).opponent,
    0
  )
})

test('stage-specific field baselines exclude other stages and retain genuine zero samples', () => {
  const source = [
    match('M1'),
    match('M2', { stage: 'PLAYOFFS', maps: [map({ team_a_stats: players('A', { damage: 1000 }) })] })
  ]
  const field = getPerformanceField(source, 'SWISS')
  assert.equal(field.damage.median, 750)
  assert.equal(field.damage.samples.length, 2)
  assert.equal(field.healing.median, 0)
  assert.equal(field.healing.samples.length, 2)
})

test('hero, lineup and ban counts preserve identity and publication coverage from either side', () => {
  const source = [match('M1', { maps: [map({ team_a_ban: 'Kiriko', team_b_ban: 'Mauga' })] }), match('M2')]
  const a = report(source)
  const b = report(source, 'B')
  assert.equal(a.heroes.find((hero) => hero.hero === 'Reaper').maps, 2)
  assert.equal(a.lineups[0].records.length, 2)
  assert.equal(a.bans.ownCoverage, 1)
  assert.equal(a.bans.opponent[0].hero, 'Mauga')
  assert.equal(b.bans.opponent[0].hero, 'Kiriko')
})

test('drawn maps are excluded from win/loss splits and retained in overall rates', () => {
  const result = report([match('M1', { maps: [map({ score_a: 1, score_b: 1 })] })])
  assert.equal(result.metrics.damage.count, 1)
  assert.equal(result.wins.damage.count, 0)
  assert.equal(result.losses.damage.count, 0)
  assert.equal(result.wins.damage.value, null)
})

test('real AIP source reconciles series, six metrics, appearances, bans and stage scopes', () => {
  const db = JSON.parse(
    readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8')
  )
  const rows = getPerformanceRows(db.matches, 'FCR26-T026')
  const roster = db.players.filter((player) => player.team_id === 'FCR26-T026')
  const result = buildTeamPerformance(rows, roster)
  assert.equal(result.summary.wins, 9)
  assert.equal(result.summary.losses, 1)
  assert.equal(result.records.length, 32)
  assert.equal(result.mapWins, 25)
  assert.equal(result.mapLosses, 7)
  assert.equal(Math.round(result.metrics.damage.value), 37886)
  assert.equal(result.metrics.damage.count, 32)
  assert.equal(result.bans.ownCoverage, 21)
  assert.equal(result.bans.opponentCoverage, 21)
  assert.equal(result.members.find((member) => member.id === 'FCR26-P0004').metrics.damage.value, null)
  assert.equal(result.cohorts[0].records.length, 32)
  assert.equal(result.opponents.find((opponent) => opponent.name === 'MASK').paired.damage.own.count, 10)
  const swiss = buildTeamPerformance(
    rows.filter((row) => row.match.stage === 'SWISS'),
    roster
  )
  assert.equal(swiss.records.length, 11)
  assert.equal(swiss.bans.ownCoverage, 0)
  assert.equal(swiss.summary.wins, 5)
})

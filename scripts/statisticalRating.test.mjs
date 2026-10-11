import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveHeroSubrole } from '../src/lib/heroSubroleSelectors.js'
import { buildStatisticalRatingBaselines, scoreStatisticalRatingRow, makeStatisticalDistribution,
  continuousStatisticalMidrank } from '../src/lib/statisticalRatingModel.js'
import { prepareStatisticalRatingData, getEra, heroVersion } from '../src/lib/statisticalRatingEvidence.js'
import { usesStatisticalRating, buildStatisticalRatingSummary } from '../src/lib/statisticalRatingAdapter.js'
import { calculateMapPlayerScoreV1, attachRatingModelScoreToLeaderboardRows } from '../src/lib/scoringEngineAdapter.js'
import { scoreLeaderboardEntries } from '../src/lib/leaderboardScoring.js'
import { getStatisticalRatingNotes } from '../src/lib/statisticalRatingPresentation.js'
import { STAT_KEYS } from '../src/config/statisticalRatingConfig.js'

function row(id, day = '2026-10-12', changes = {}) {
  const value = { rowId: id, seasonId: 'FCW26', matchId: id, mapOrder: '1', playerId: id, teamId: 'A',
    hero: 'Ana', resolution: resolveHeroSubrole('Ana', { role: 'SUPPORT' }), day, patch: '',
    playtimeMinutes: 10, per10: { elims: 12, assists: 22, deaths: 3, damage: 2500, healing: 7500, blocked: 0 },
    metricStates: Object.fromEntries(STAT_KEYS.map(stat => [stat, 'OBSERVED'])), verified: false, ...changes }
  value.era = getEra(day, value.patch)
  value.heroVersion = heroVersion(value)
  return value
}
const references = () => Array.from({ length: 20 }, (_, index) => row('R' + index, index < 10 ? '2026-10-08' : '2026-10-09',
  { matchId: 'M' + Math.floor(index / 4) }))
const score = (target, rows = references()) => scoreStatisticalRatingRow(target, buildStatisticalRatingBaselines(rows, { beforeDay: target.day }))

test('ties center on their true weighted mass and interpolate between every anchor', () => {
  const constant = makeStatisticalDistribution([{ value: 10, weight: 1 }, { value: 10, weight: 3 }])
  assert.equal(continuousStatisticalMidrank(10, constant), 50)
  assert.equal(continuousStatisticalMidrank(5, constant), 25)
  const mixed = makeStatisticalDistribution([{ value: 10, weight: 1 }, { value: 20, weight: 1 }])
  assert.equal(continuousStatisticalMidrank(10, mixed), 25)
  assert.equal(continuousStatisticalMidrank(15, mixed), 50)
  assert.equal(continuousStatisticalMidrank(20, mixed), 75)
})

test('a long series and a short series each contribute one unit of reference mass', () => {
  const records = Array.from({ length: 4 }, (_, index) => row('L' + index, '2026-10-08', { matchId: 'LONG', playtimeMinutes: 20 }))
  records.push(row('S', '2026-10-09', { matchId: 'SHORT', playtimeMinutes: 5, per10: { ...row('x').per10, healing: 9000 } }))
  const baseline = buildStatisticalRatingBaselines(records, { beforeDay: '2026-10-12' })
  const reference = Object.values(baseline.byHero)[0].metrics.healing
  assert.equal(reference.distribution.total, 2)
  assert.deepEqual(reference.distribution.values.map(point => point.weight), [1, 1])
})

test('same-day, future, transition-day and old-version data cannot leak into a target', () => {
  const target = row('TARGET')
  const before = score(target)
  const additions = [row('SAME'), row('FUTURE', '2026-10-13'), row('TRANSITION', '2026-10-06')]
  assert.equal(score(target, [...references(), ...additions]).rawScore, before.rawScore)
  assert.equal(score(target, [row('OLD', '2026-10-05')]).rawScore, null)
  assert.equal(score(target, []).rawScore, null)
  assert.throws(() => score(target, [row('PRIOR', '2026-10-09', { matchId: target.matchId })]), /whole-match leakage/)
})

test('missing observations remain unavailable; explicit inapplicability redistributes weights', () => {
  const target = row('TARGET')
  target.per10.healing = null
  target.metricStates.healing = 'MISSING'
  assert.equal(score(target).rawScore, null)
  target.metricStates.healing = 'NOT_APPLICABLE'
  const result = score(target)
  assert.equal(result.weights.healing, 0)
  assert.ok(Number.isFinite(result.rawScore))
  assert.ok(Math.abs(Object.values(result.weights).reduce((sum, weight) => sum + weight, 0) - 100) < 1e-8)
})

test('single-stat improvements cannot reduce the score; fixed-rate identity and result changes preserve it', () => {
  const target = row('TARGET', '2026-10-12', { per10: { elims: 11, assists: 20, deaths: 3.5, damage: 2400, healing: 7300, blocked: 0 } })
  const before = score(target)
  for (const stat of STAT_KEYS) {
    const improved = structuredClone(target)
    improved.per10[stat] = stat === 'deaths' ? improved.per10[stat] * 0.99 : improved.per10[stat] * 1.01 + 0.01
    assert.ok(score(improved).rawScore >= before.rawScore, stat)
  }
  assert.equal(score({ ...target, playerId: 'OTHER', teamId: 'B', result: 'LOSS', mode: 'ESCORT', playtimeMinutes: 20 }).rawScore, before.rawScore)
})

test('support duty flags preserve performance, and short segments are flagged without a penalty', () => {
  const target = row('LOW', '2026-10-12', { per10: { elims: 12, assists: 0, deaths: 10, damage: 2500, healing: 0, blocked: 0 } })
  const normal = score(target)
  assert.ok(normal.flags.includes('SUPPORT_MINIMUM_REVIEW'))
  assert.equal(normal.rawScore, normal.rawScoreBeforeReview)
  const short = score({ ...target, playtimeMinutes: 0.999 })
  assert.equal(short.rawScore, normal.rawScore)
  assert.ok(short.flags.includes('SHORT_TARGET_REVIEW'))
  const records = [...references(), row('SHORT_REF', '2026-10-09', { playtimeMinutes: 0.999 }), row('EXACT_REF', '2026-10-09', { playtimeMinutes: 1 })]
  assert.equal(buildStatisticalRatingBaselines(records, { beforeDay: target.day }).training.records, 21)
})

test('each active metric source needs its own match count; a five-match union is insufficient', () => {
  const records = references()
  for (const reference of records.filter(reference => reference.matchId !== 'M0')) {
    reference.metricStates.healing = 'MISSING'
    reference.per10.healing = null
  }
  const result = score(row('TARGET'), records)
  assert.equal(result.referenceUse.stage, 'EARLY_REFERENCE')
  assert.equal(result.referenceUse.minimumObservedActiveSourceMatches, 1)
  assert.equal(result.referenceUse.probability, null)
})

function fixture() {
  const players = new Map()
  const matches = []
  const add = (id, date, participants) => {
    const stats = participants.map((playerId, index) => ({ player_id: playerId, role: 'SUPPORT', heroes_played: 'Ana',
      eliminations: 12 + index, assists: 22, deaths: 3, damage: 2500, healing: 7500, mitigation: 0 }))
    matches.push({ match_id: id, status: 'COMPLETE', scheduled_at: date + 'T10:00:00.000Z',
      team_a: { id: 'A' }, team_b: { id: 'B' }, maps: [{ map_order: 1, map_name: 'Test', winner: 'A',
        match_time: '10:00', team_a_stats: stats, team_b_stats: [] }] })
    for (const stat of stats) {
      if (!players.has(stat.player_id)) players.set(stat.player_id, { player_id: stat.player_id, team_id: 'A', match_logs: [] })
      players.get(stat.player_id).match_logs.push({ matchId: id, mapOrder: 1, hero: 'Ana', role: 'SUPPORT', teamId: 'A',
        playtimeMinutes: 10, totals: { elims: stat.eliminations, assists: 22, deaths: 3, damage: 2500, healing: 7500, blocked: 0 } })
    }
  }
  for (let index = 0; index < 5; index++) add('REF' + index, '2026-10-0' + (7 + index % 3), Array.from({ length: 4 }, (_, player) => 'P' + index + player))
  add('TARGET', '2026-10-12', ['TARGET_PLAYER'])
  return { meta: { season_id: 'FCW26' }, matches, players: [...players.values()] }
}
const entry = () => ({ player_id: 'TARGET_PLAYER', role: 'SUPPORT', roleTimeMins: 10, roleMapsPlayed: 1,
  roleScore: 99, most_played_hero: 'Ana', metrics: { per10: {}, total: {} } })

test('runtime normalization excludes ineligible matches, map mismatches and ambiguous hero labels', () => {
  const db = fixture()
  assert.equal(prepareStatisticalRatingData(db, 'FCW26').rows.length, 21)
  const mismatch = structuredClone(db)
  mismatch.matches.at(-1).maps[0].team_a_stats[0].healing = 123
  assert.equal(prepareStatisticalRatingData(mismatch, 'FCW26').rows.length, 20)
  const ambiguous = structuredClone(db)
  ambiguous.players.at(-1).match_logs.push({ ...ambiguous.players.at(-1).match_logs[0], hero: 'Juno' })
  assert.equal(prepareStatisticalRatingData(ambiguous, 'FCW26').rows.length, 20)
  db.matches.at(-1).is_forfeit = true
  assert.equal(prepareStatisticalRatingData(db, 'FCW26').rows.length, 20)
})

test('FCW26 routes all entry points through the model, with no map outcome bonus or old-score fallback', () => {
  assert.equal(usesStatisticalRating({ seasonId: 'FCW2026' }), true)
  assert.equal(usesStatisticalRating({ seasonId: 'FCR26' }), false)
  const db = fixture()
  const args = { entry: entry(), db, currentMatchIds: ['TARGET'], currentMapOrders: [1] }
  const winning = calculateMapPlayerScoreV1({ ...args, winnerTeamKeys: ['A'] })
  const losing = calculateMapPlayerScoreV1({ ...args, winnerTeamKeys: ['B'] })
  assert.equal(winning.rawScore, losing.rawScore)
  assert.equal(winning.mapRating, losing.mapRating)
  assert.equal(winning.mapResultAdjustment, 0)
  const unavailable = attachRatingModelScoreToLeaderboardRows({ entries: [entry()], seasonId: 'FCW26', scoreContext: 'map' })[0]
  assert.equal(unavailable.scoringEngine, 'rating_v1_5')
  assert.equal(unavailable.rawScore, null)
  assert.equal(unavailable.mapRating, null)
  assert.equal(unavailable.roleScore, null)
  assert.equal(unavailable.legacyScore, 99)
})

test('unavailable season records produce neither an OVR nor a rank and partial averages disclose coverage', () => {
  const db = fixture()
  const unrated = scoreLeaderboardEntries([entry()], 30, { seasonId: 'FCW26' })[0]
  assert.equal(unrated.seasonOvr, null)
  assert.equal(unrated.provisionalSeasonOvr, null)
  assert.equal(unrated.seasonRatingStatus, 'UNRATED')
  const partial = buildStatisticalRatingSummary({ ...entry(), roleTimeMins: 20 }, { db })
  assert.equal(partial.statisticalRating.coverage, 0.5)
  assert.ok(partial.statisticalRating.flags.includes('PARTIAL_SCORING_COVERAGE_REVIEW'))
  assert.ok(getStatisticalRatingNotes({ statisticalRating: partial.statisticalRating }).some(note => note.includes('50%')))
})

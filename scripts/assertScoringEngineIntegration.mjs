import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SCORING_ENGINE_CONFIG } from '../src/config/scoringEngineConfig.js'
import { getHeroSubroleConfig, resolveHeroSubrole } from '../src/lib/heroSubroleSelectors.js'
import {
  getSeasonOvrConfidenceCap,
  scoreLeaderboardEntries,
  scoreLeaderboardEntriesLegacy
} from '../src/lib/leaderboardScoring.js'
import { buildRatingBaselinesFromDb, buildRatingBaselinesFromPlayerLogs } from '../src/lib/ratingBaselines.js'
import { getMatchRatingSummary } from '../src/lib/matchRatingAdapter.js'
import { getLeaderboardEntries, sortLeaderboardEntries } from '../src/lib/leaderboardSelectors.js'
import {
  attachRatingModelScoreToLeaderboardRows,
  attachRatingModelScoreToMapRows,
  attachRatingModelScoreToPlayerDetail,
  calculateLeaderboardScoreV1,
  calculateMapPlayerScoreV1,
  calculateMatchPlayerScoreV1,
  calculateSeasonPlayerScoreV1,
  compareLegacyAndRatingV1,
  getActiveScoringEngine,
  getLegacyScore
} from '../src/lib/scoringEngineAdapter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

function readJsonIfExists(relativePath) {
  const filePath = path.join(ROOT_DIR, relativePath)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function assertInRange(value, min, max, label) {
  const number = Number(value)
  assert.ok(Number.isFinite(number), `${label} must be finite`)
  assert.ok(number >= min, `${label} must be >= ${min}`)
  assert.ok(number <= max, `${label} must be <= ${max}`)
}

function assertOldScoreFields(row, label) {
  assert.notEqual(row.rating, undefined, `${label}.rating must remain defined`)
  assert.notEqual(row.score, undefined, `${label}.score must remain defined`)
  assert.notEqual(row.impactScore, undefined, `${label}.impactScore must remain defined`)
}

function assertRatingV1Fields(row, label) {
  assert.equal(row.scoringEngine, 'rating_v1', `${label} must use rating_v1`)
  assert.ok(row.ratingModelVersion, `${label} must include ratingModelVersion`)
  assert.ok(row.scoringProfile, `${label} must include scoringProfile`)
  assert.ok(row.subrole, `${label} must include subrole`)
  assert.ok(row.sampleStatus, `${label} must include sampleStatus`)
  assertInRange(row.rawScore, 0, 100, `${label}.rawScore`)
  assertInRange(row.mapRating, 5.5, 9.8, `${label}.mapRating`)
  assertOldScoreFields(row, label)
}

function assertSeasonOvrFields(row, label) {
  assertInRange(row.seasonScore, 0, 100, `${label}.seasonScore`)
  assertInRange(row.seasonScoreConfidence, 0, 1, `${label}.seasonScoreConfidence`)
  assertInRange(row.seasonOvr, 60, 99, `${label}.seasonOvr`)
  assertInRange(row.seasonRolePercentile, 0, 100, `${label}.seasonRolePercentile`)
}

function assertHeroResolution(heroName, expectedSubrole, expectedProfile, label = heroName) {
  const resolved = resolveHeroSubrole(heroName)
  assert.equal(resolved.resolvedSubrole, expectedSubrole, `${label} subrole`)
  assert.equal(resolved.scoringProfile, expectedProfile, `${label} scoringProfile`)
  return resolved
}

function createSyntheticDb() {
  const heroes = ['Sierra', 'Symmetra', 'Kiriko', 'L\u00facio', 'Doomfist']
  return {
    players: heroes.map((hero, index) => ({
      player_id: `ASSERT_PLAYER_${index + 1}`,
      team_id: index % 2 === 0 ? 'A' : 'B',
      match_logs: Array.from({ length: 6 }, (_, mapIndex) => ({
        matchId: `ASSERT_MATCH_${mapIndex + 1}`,
        mapOrder: mapIndex + 1,
        hero,
        role: hero === 'Kiriko' || hero === 'L\u00facio' ? 'SUPPORT' : hero === 'Doomfist' ? 'TANK' : 'DPS',
        playtimeMinutes: 10,
        totals: {
          elims: 10 + index + mapIndex,
          assists: 6 + index,
          deaths: 2 + (mapIndex % 3),
          damage: 4500 + (index * 500) + (mapIndex * 120),
          healing: hero === 'Kiriko' || hero === 'L\u00facio' ? 6500 + (mapIndex * 150) : 0,
          blocked: hero === 'Symmetra' ? 1500 + (mapIndex * 100) : hero === 'Doomfist' ? 400 : 0
        }
      }))
    }))
  }
}

function createSampleEntry() {
  return {
    entryKey: 'ASSERT_SIERRA:DPS',
    player_id: 'ASSERT_SIERRA',
    player_name: 'Assert Sierra',
    display_name: 'Assert Sierra',
    team_id: 'ASSERT',
    team_name: 'Assert Team',
    team_short_name: 'AST',
    role: 'DPS',
    maps_played: 1,
    roleMapsPlayed: 1,
    raw_time_mins: 10,
    roleTimeMins: 10,
    most_played_hero: 'Sierra',
    top_3_heroes: ['Sierra'],
    metrics: {
      total: {
        elim: 24,
        ast: 8,
        dth: 4,
        dmg: 9200,
        heal: 0,
        block: 0
      },
      per10: {
        elim: 24,
        ast: 8,
        dth: 4,
        dmg: 9200,
        heal: 0,
        block: 0
      },
      perMap: {
        elim: 24,
        ast: 8,
        dth: 4,
        dmg: 9200,
        heal: 0,
        block: 0
      }
    }
  }
}

function assertRuntimeDoesNotReadFcaReports() {
  const runtimeFiles = [
    'src/lib/ratingBaselines.js',
    'src/lib/scoringEngineAdapter.js',
    'src/lib/leaderboardScoring.js',
    'src/lib/leaderboardSelectors.js',
    'src/lib/matchRatingAdapter.js'
  ]
  const forbidden = /reports[\\/].*fca-|fca-hero-baselines|fca-profile-baselines|fca-subrole-baselines/i

  runtimeFiles.forEach(relativePath => {
    const source = fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8')
    assert.doesNotMatch(source, forbidden, `${relativePath} must not read FCA report baselines at runtime`)
  })
}

function assertMatchDetailUsesRatingV1MapRating() {
  const source = fs.readFileSync(path.join(ROOT_DIR, 'src/components/matches/detail/DualTeamStatsTable.jsx'), 'utf8')
  assert.match(
    source,
    /Number\(entry\?\.mapRating\)/,
    'map detail player rating should prefer Rating Model v1 mapRating before fallback remapping'
  )
  assert.match(
    source,
    /getDisplayedMatchRating\(entry, rawPts, participantScores\)/,
    'map detail player rating should route display score through the mapRating-aware helper'
  )
}

assert.equal(getActiveScoringEngine(), 'rating_v1')
assert.equal(SCORING_ENGINE_CONFIG.activeEngine, 'rating_v1')
assert.equal(SCORING_ENGINE_CONFIG.allowLegacyFallback, true)
assert.equal(getLegacyScore({ entry: { roleScore: 77 } }), 77)
assert.equal(getSeasonOvrConfidenceCap(0.65), 89)
assert.equal(getSeasonOvrConfidenceCap(0.75), 92)
assert.equal(getSeasonOvrConfidenceCap(0.85), 94)
assert.equal(getSeasonOvrConfidenceCap(0.9), 97)
assert.equal(getSeasonOvrConfidenceCap(0.95), 99)

const db = readJsonIfExists('public/data/friescup_db_review_ready.json') || createSyntheticDb()
const baselines = buildRatingBaselinesFromDb(db, { seasonId: 'FCA2026' })
const fullLeaderboard = getLeaderboardEntries(db, { id: 'FCA2026', rankingMinTimeMins: 30 })
const rankedLeaderboard = fullLeaderboard
  .filter(entry => entry.eligible)
  .sort((a, b) => a.overallRank - b.overallRank)
const displayedScoreSort = sortLeaderboardEntries(fullLeaderboard, 'score', 'desc')

rankedLeaderboard.slice(1).forEach((entry, index) => {
  assert.ok(
    Number(rankedLeaderboard[index].seasonOvr) >= Number(entry.seasonOvr),
    'final overall rank must be monotonic by displayed season OVR'
  )
})
assert.deepEqual(
  displayedScoreSort.filter(entry => entry.eligible).map(entry => entry.entryKey),
  rankedLeaderboard.map(entry => entry.entryKey),
  'score-column sorting must match final OVR rank order'
)
const sampleEntry = createSampleEntry()
const legacyEntry = scoreLeaderboardEntriesLegacy([sampleEntry], 0)[0]

const leaderboardRow = scoreLeaderboardEntries([sampleEntry], 0, { baselines })[0]
assertRatingV1Fields(leaderboardRow, 'scoreLeaderboardEntries')
assertSeasonOvrFields(leaderboardRow, 'scoreLeaderboardEntries')

const attachedLeaderboardRow = attachRatingModelScoreToLeaderboardRows({ entries: [legacyEntry], baselines })[0]
assertRatingV1Fields(attachedLeaderboardRow, 'attachRatingModelScoreToLeaderboardRows')

const attachedMapRow = attachRatingModelScoreToMapRows({ entries: [legacyEntry], baselines })[0]
assertRatingV1Fields(attachedMapRow, 'attachRatingModelScoreToMapRows')
assert.equal(attachedMapRow.rating, attachedMapRow.mapRating)
assert.equal(attachedMapRow.score, attachedMapRow.mapRating)

const syntheticDb = createSyntheticDb()
const syntheticBaselines = buildRatingBaselinesFromDb(syntheticDb, { seasonId: 'ASSERT' })
assert.equal(
  buildRatingBaselinesFromPlayerLogs(syntheticDb.players, { seasonId: 'ASSERT' }),
  buildRatingBaselinesFromPlayerLogs(syntheticDb.players, { seasonId: 'ASSERT' }),
  'rating baselines should be reused for the same season player dataset'
)
const poorCurrentMapEntry = {
  ...createSampleEntry(),
  entryKey: 'ASSERT_PLAYER_1:DPS',
  player_id: 'ASSERT_PLAYER_1',
  team_id: 'WINNER',
  team_name: 'Winner Team',
  team_short_name: 'WIN',
  metrics: {
    total: { elim: 0, ast: 0, dth: 10, dmg: 0, heal: 0, block: 0 },
    per10: { elim: 0, ast: 0, dth: 10, dmg: 0, heal: 0, block: 0 },
    perMap: { elim: 0, ast: 0, dth: 10, dmg: 0, heal: 0, block: 0 }
  }
}
const historicalSeasonRow = attachRatingModelScoreToLeaderboardRows({
  entries: [poorCurrentMapEntry],
  players: syntheticDb.players,
  baselines: syntheticBaselines,
  scoreContext: 'season'
})[0]
const currentMapRow = attachRatingModelScoreToMapRows({
  entries: [poorCurrentMapEntry],
  players: syntheticDb.players,
  baselines: syntheticBaselines
})[0]
const currentMatchRow = scoreLeaderboardEntries([poorCurrentMapEntry], 0, {
  players: syntheticDb.players,
  baselines: syntheticBaselines,
  scoreContext: 'match'
})[0]

assert.ok(historicalSeasonRow.ratingModelSourceLogs > 0, 'season rating should use season history logs')
assert.equal(historicalSeasonRow.ratingModelSourceScope, 'season_logs')
assert.equal(currentMapRow.ratingModelSourceLogs, 0, 'map rating must not reuse season history logs')
assert.equal(currentMapRow.ratingModelSourceScope, 'current_map')
assert.equal(currentMatchRow.ratingModelSourceLogs, 0, 'match rating must not reuse season history logs')
assert.equal(currentMatchRow.ratingModelSourceScope, 'current_match')
assert.ok(currentMapRow.rawScore < historicalSeasonRow.rawScore, 'poor current-map stats must score below strong season history')

const winningMapRow = attachRatingModelScoreToMapRows({
  entries: [poorCurrentMapEntry],
  players: syntheticDb.players,
  baselines: syntheticBaselines,
  winnerTeamKeys: ['WINNER', 'WIN'],
  mapWinDominance: 1
})[0]
const losingMapRow = attachRatingModelScoreToMapRows({
  entries: [{ ...poorCurrentMapEntry, team_id: 'LOSER', team_name: 'Loser Team', team_short_name: 'LOS' }],
  players: syntheticDb.players,
  baselines: syntheticBaselines,
  winnerTeamKeys: ['WINNER', 'WIN'],
  mapWinDominance: 1
})[0]

assert.equal(winningMapRow.mapResult, 'WIN')
assert.equal(winningMapRow.mapResultAdjustment, 0.25)
assert.equal(losingMapRow.mapResult, 'LOSS')
assert.equal(losingMapRow.mapResultAdjustment, 0)
assert.ok(winningMapRow.mapRating > losingMapRow.mapRating, 'winning-side bonus should raise the displayed map rating')

const mapSummary = getMatchRatingSummary({
  match_id: 'ASSERT_MATCH',
  team_a: { id: 'A', name: 'Alpha', short: 'ALP' },
  team_b: { id: 'B', name: 'Beta', short: 'BET' }
}, [{
  map_order: 1,
  map_name: 'Antarctic Peninsula',
  match_time: '10:00',
  winner: 'A',
  score_a: 2,
  score_b: 0,
  team_a_stats: [{
    player_id: 'ASSERT_PLAYER_1',
    player_name: 'Assert Winner',
    team_id: 'A',
    team_name: 'Alpha',
    role: 'DPS',
    heroes_played: 'Sierra',
    eliminations: 24,
    assists: 8,
    deaths: 1,
    damage: 9200,
    healing: 0,
    mitigation: 0
  }],
  team_b_stats: [{
    player_id: 'ASSERT_PLAYER_2',
    player_name: 'Assert Loser',
    team_id: 'B',
    team_name: 'Beta',
    role: 'DPS',
    heroes_played: 'Symmetra',
    eliminations: 2,
    assists: 1,
    deaths: 8,
    damage: 1800,
    healing: 0,
    mitigation: 0
  }]
}], syntheticDb.players)
const summaryWinner = mapSummary.entries.find(entry => entry.team_id === 'A')
const summaryLoser = mapSummary.entries.find(entry => entry.team_id === 'B')

assert.equal(summaryWinner.ratingModelSourceScope, 'current_map')
assert.equal(summaryWinner.mapResult, 'WIN')
assert.equal(summaryWinner.mapResultAdjustment, 0.25)
assert.equal(summaryLoser.ratingModelSourceScope, 'current_map')
assert.equal(summaryLoser.mapResult, 'LOSS')
assert.ok(summaryWinner.mapRating > summaryLoser.mapRating)

const multiHeroPlayers = [
  ...syntheticDb.players,
  {
    player_id: 'ASSERT_MULTI_HERO',
    display_name: 'Assert Multi Hero',
    team_id: 'B',
    match_logs: [
      {
        matchId: 'ASSERT_MULTI_MATCH',
        mapOrder: 2,
        hero: 'Mizuki',
        role: 'SUP',
        playtimeMinutes: 4.1,
        totals: { elims: 2, assists: 0, deaths: 3, damage: 1797, healing: 3868, blocked: 1006 }
      },
      {
        matchId: 'ASSERT_MULTI_MATCH',
        mapOrder: 2,
        hero: 'Kiriko',
        role: 'SUP',
        playtimeMinutes: 4.1,
        totals: { elims: 1, assists: 2, deaths: 3, damage: 1576, healing: 3157, blocked: 0 }
      }
    ]
  }
]
const multiHeroSummary = getMatchRatingSummary({
  match_id: 'ASSERT_MULTI_MATCH',
  team_a: { id: 'A', name: 'Alpha', short: 'ALP' },
  team_b: { id: 'B', name: 'Beta', short: 'BET' }
}, [{
  map_order: 2,
  map_name: 'New Queen Street',
  match_time: '4:06',
  winner: 'A',
  score_a: 1,
  score_b: 0,
  team_a_stats: [],
  team_b_stats: [
    {
      player_id: 'ASSERT_MULTI_HERO',
      player_name: 'Assert Multi Hero',
      team_id: 'B',
      team_name: 'Beta',
      role: 'SUP',
      heroes_played: 'Mizuki',
      eliminations: 2,
      assists: 0,
      deaths: 3,
      damage: 1797,
      healing: 3868,
      mitigation: 1006
    },
    {
      player_id: 'ASSERT_MULTI_HERO',
      player_name: 'Assert Multi Hero',
      team_id: 'B',
      team_name: 'Beta',
      role: 'SUP',
      heroes_played: 'Kiriko',
      eliminations: 1,
      assists: 2,
      deaths: 3,
      damage: 1576,
      healing: 3157,
      mitigation: 0
    }
  ]
}], multiHeroPlayers)
const multiHeroEntry = multiHeroSummary.entries.find(entry => entry.player_id === 'ASSERT_MULTI_HERO')

assert.ok(Math.abs(multiHeroEntry.roleTimeMins - 4.1) < 0.001, 'multi-hero map time must be capped at official map duration')
assert.equal(multiHeroEntry.metrics.total.heal, 7025)
assert.equal(multiHeroEntry.most_played_hero, '')
assert.equal(multiHeroEntry.ratingHeroProfileAmbiguous, true)

const playerDetailRow = attachRatingModelScoreToPlayerDetail({ entry: legacyEntry, baselines })
assertRatingV1Fields(playerDetailRow, 'attachRatingModelScoreToPlayerDetail')

const seasonScore = calculateSeasonPlayerScoreV1({ entry: legacyEntry, baselines })
assertInRange(seasonScore.rawScore, 0, 100, 'calculateSeasonPlayerScoreV1.rawScore')
assertInRange(seasonScore.seasonScore, 0, 100, 'calculateSeasonPlayerScoreV1.seasonScore')
assertInRange(seasonScore.seasonScoreConfidence, 0, 1, 'calculateSeasonPlayerScoreV1.seasonScoreConfidence')
assertInRange(seasonScore.mapRating, 5.5, 9.8, 'calculateSeasonPlayerScoreV1.mapRating')

const leaderboardScore = calculateLeaderboardScoreV1({ entry: legacyEntry, baselines })
assertInRange(leaderboardScore, 0, 100, 'calculateLeaderboardScoreV1')

const matchScore = calculateMatchPlayerScoreV1({ entry: legacyEntry, baselines })
assertInRange(matchScore.rawScore, 0, 100, 'calculateMatchPlayerScoreV1.rawScore')
assertInRange(matchScore.rating, 5.5, 9.8, 'calculateMatchPlayerScoreV1.rating')

const mapScore = calculateMapPlayerScoreV1({ entry: legacyEntry, baselines })
assertInRange(mapScore.score, 5.5, 9.8, 'calculateMapPlayerScoreV1.score')
assertInRange(mapScore.impactScore, 0, 100, 'calculateMapPlayerScoreV1.impactScore')

const comparison = compareLegacyAndRatingV1({ entry: legacyEntry, baselines })
assert.notEqual(comparison.legacyScore, undefined)
assertInRange(comparison.ratingV1Score, 0, 100, 'compareLegacyAndRatingV1.ratingV1Score')
assertInRange(comparison.ratingV1MapRating, 5.5, 9.8, 'compareLegacyAndRatingV1.ratingV1MapRating')

const originalWarn = console.warn
console.warn = () => {}
try {
  const fallbackRow = attachRatingModelScoreToLeaderboardRows({
    entries: [{
      entryKey: 'ASSERT_FALLBACK',
      player_id: 'ASSERT_FALLBACK',
      role: '',
      roleScore: 66,
      metrics: { per10: {} }
    }],
    baselines
  })[0]
  assert.equal(fallbackRow.scoringEngine, 'legacy_fallback')
  assert.equal(fallbackRow.roleScore, 66)
  assert.equal(fallbackRow.legacyScore, 66)
  assertOldScoreFields(fallbackRow, 'legacy fallback')
} finally {
  console.warn = originalWarn
}

assert.equal(getHeroSubroleConfig('Sierra').scoringProfile, 'poke_hitscan')
assertHeroResolution('Sierra', 'HITSCAN', 'poke_hitscan')
assertHeroResolution('\u897f\u62c9', 'HITSCAN', 'poke_hitscan', '西拉')

const shion = assertHeroResolution('Shion', 'FLEX_DPS', 'projectile_flex')
assert.ok(shion.secondarySubroles.includes('HITSCAN'))
const shionSystemAlias = assertHeroResolution('Shino', 'FLEX_DPS', 'projectile_flex')
assert.ok(shionSystemAlias.secondarySubroles.includes('HITSCAN'))
const shionAlias = assertHeroResolution('\u6b7b\u6028', 'FLEX_DPS', 'projectile_flex', '死怨')
assert.ok(shionAlias.secondarySubroles.includes('HITSCAN'))

assertHeroResolution('Symmetra', 'FLEX_DPS', 'barrier_utility_flex')
assertHeroResolution('L\u00facio', 'MAIN_SUPPORT', 'tempo_main_support')
assertHeroResolution('Kiriko', 'FLEX_SUPPORT', 'utility_flex_support')

assertRuntimeDoesNotReadFcaReports()
assertMatchDetailUsesRatingV1MapRating()

console.log(JSON.stringify({
  activeEngine: getActiveScoringEngine(),
  runtimeBaselineLogs: baselines.logs.length,
  leaderboardRawScore: leaderboardRow.rawScore,
  leaderboardSeasonScore: leaderboardRow.seasonScore,
  leaderboardSeasonOvr: leaderboardRow.seasonOvr,
  mapRating: attachedMapRow.mapRating,
  sampleStatus: leaderboardRow.sampleStatus,
  fallbackAvailable: SCORING_ENGINE_CONFIG.allowLegacyFallback
}, null, 2))

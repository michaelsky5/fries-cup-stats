import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { getSeasonById } from '../src/config/seasons.js'
import { getLeaderboardEntries, getLeaderboardSummary, getEntrySeasonOvr, sortLeaderboardEntries } from '../src/lib/leaderboardSelectors.js'
import { scoreLeaderboardEntries, getSeasonOvrValue } from '../src/lib/leaderboardScoring.js'
import { buildRatingBaselinesFromDb } from '../src/lib/ratingBaselines.js'
import { getSeasonSample, getSeasonSampleRequirements, getSeasonRatingValue, formatSeasonRatingValue, SEASON_RATING_VERSION } from '../src/lib/seasonRatingPolicy.js'

const fixture = JSON.parse(fs.readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const season = getSeasonById('FCR26')
const entries = getLeaderboardEntries(fixture, season)
const qualified = { roleMapsPlayed: 6, roleTimeMins: 60, roleMatchesPlayed: 3, seasonScore: 70 }

test('formal eligibility requires all three role-specific thresholds, including exact boundaries', () => {
  assert.equal(getSeasonSample(qualified).status, 'FORMAL')
  for (const entry of [
    { ...qualified, roleMapsPlayed: 5 },
    { ...qualified, roleTimeMins: 59.999 },
    { ...qualified, roleMatchesPlayed: 2 }
  ]) assert.equal(getSeasonSample(entry).status, 'PROVISIONAL')
  assert.equal(getSeasonSample({ ...qualified, seasonScore: null }).status, 'UNRATED')
  assert.equal(getSeasonSample({ ...qualified, seasonScore: 0 }).status, 'FORMAL')
  assert.equal(getSeasonSample(qualified, 90).status, 'UNRATED')
  assert.equal(getSeasonSampleRequirements(90).formal.minutes, 90)
  assert.equal(getSeasonSampleRequirements(0).formal.minutes, 60)
})

test('the provisional floor is enforced and missing match counts never qualify', () => {
  const minimum = { ...qualified, roleMapsPlayed: 2, roleTimeMins: 30, roleMatchesPlayed: 1 }
  assert.equal(getSeasonSample(minimum).status, 'PROVISIONAL')
  for (const change of [{ roleMapsPlayed: 1 }, { roleTimeMins: 29.99 }, { roleMatchesPlayed: 0 }]) {
    assert.equal(getSeasonSample({ ...minimum, ...change }).status, 'UNRATED')
  }
  for (const missing of [null, undefined, '', ' ', NaN, Infinity, -1]) {
    const sample = getSeasonSample({ ...qualified, roleMatchesPlayed: missing })
    assert.equal(sample.status, 'PROVISIONAL')
    assert.ok(sample.missing.includes('matches'))
  }
})

function scoreLogs(logs) {
  const db = { players: [{ player_id: 'SAMPLE', match_logs: logs }] }
  const baselines = buildRatingBaselinesFromDb(db, { seasonId: 'TEST' })
  const entry = { ...qualified, player_id: 'SAMPLE', entryKey: 'SAMPLE:DPS', role: 'DPS', most_played_hero: 'Tracer', metrics: { per10: {} } }
  return scoreLeaderboardEntries([entry], 30, { baselines })[0]
}
function makeLog(matchId, mapOrder, hero = 'Tracer', rawMatchId) {
  return { matchId, rawMatchId, mapOrder, hero, role: hero === 'Kiriko' ? 'SUP' : 'DPS', playtimeMinutes: 10,
    totals: { elims: 15, assists: 8, deaths: 4, damage: 6000, healing: 0, blocked: 0 } }
}

test('hero rows and map rows do not inflate matches, aliases deduplicate, and roles stay separate', () => {
  const logs = [makeLog('M1', 1), makeLog('M1', 1, 'Genji'), makeLog('M1', 2), makeLog('M2', 1), makeLog('M3', 1), makeLog('M4', 1, 'Kiriko')]
  assert.equal(scoreLogs(logs).roleMatchesPlayed, 3)
  assert.equal(scoreLogs(logs.map(log => ({ ...log, matchId: 'SAME' }))).roleMatchesPlayed, 1)
  const aliasLogs = [makeLog('CANONICAL', 1, 'Tracer', 'RAW'), makeLog('', 2, 'Tracer', 'RAW')]
  assert.equal(scoreLogs(aliasLogs).roleMatchesPlayed, 1)
  assert.equal(scoreLogs(aliasLogs.toReversed()).roleMatchesPlayed, 1)
  const missing = scoreLogs([makeLog('M1', 1), makeLog('', 2)])
  assert.equal(missing.roleMatchesPlayed, null)
  assert.equal(missing.seasonRatingStatus, 'PROVISIONAL')
  assert.equal(missing.seasonOvr, null)
})

test('sample weight reacts to distinct matches without changing raw performance', () => {
  const oneMatch = scoreLogs(Array.from({ length: 6 }, (_, i) => makeLog('ONE', i + 1)))
  const threeMatches = scoreLogs(Array.from({ length: 6 }, (_, i) => makeLog(`M${Math.floor(i / 2)}`, i + 1)))
  assert.equal(oneMatch.rawScore, threeMatches.rawScore)
  assert.ok(oneMatch.seasonScoreConfidence < threeMatches.seasonScoreConfidence)
  assert.equal(oneMatch.seasonRatingStatus, 'PROVISIONAL')
  assert.equal(threeMatches.seasonRatingStatus, 'FORMAL')
})

test('published entries separate provisional display from official rank and OVR', () => {
  const summary = getLeaderboardSummary(entries, 30, fixture)
  assert.equal(summary.totalEntries, summary.qualifiedEntries + summary.provisionalEntries + summary.unratedEntries)
  assert.ok(summary.qualifiedEntries > 0 && summary.provisionalEntries > 0 && summary.unratedEntries > 0)
  for (const entry of entries) {
    assert.equal(entry.seasonRatingVersion, SEASON_RATING_VERSION)
    assert.equal(entry.ratingModelVersion, 'v1.2')
    assert.equal(entry.ratingBaselineFreezeId, 'FCR26_SWISS_FINAL_RATING_V1_2')
    if (entry.eligible) {
      assert.ok(entry.roleMapsPlayed >= 6 && entry.roleTimeMins >= 60 && entry.roleMatchesPlayed >= 3)
      assert.equal(entry.seasonOvrBeforeOpponent, getSeasonOvrValue(entry.seasonScore, entry.seasonRolePercentile, entry.seasonScoreConfidence))
      assert.equal(entry.seasonOvr, entry.seasonOvrBeforeOpponent + entry.seasonOpponentAdjustment)
    } else {
      assert.equal(entry.roleRank, null)
      assert.equal(entry.overallRank, null)
      assert.equal(entry.seasonRolePercentile, null)
      assert.equal(getEntrySeasonOvr(entry), null)
      if (entry.seasonRatingStatus === 'PROVISIONAL') assert.ok(getSeasonRatingValue(entry) >= 60 && getSeasonRatingValue(entry) <= 89)
      else assert.equal(formatSeasonRatingValue(entry), '—')
    }
  }
  const formalSorted = sortLeaderboardEntries(entries, 'score', 'desc').filter(entry => entry.eligible)
  assert.deepEqual(formalSorted.map(entry => entry.overallRank), Array.from({ length: formalSorted.length }, (_, i) => i + 1))
})

test('all published metric contributions reconstruct raw score and the sample adjustment', () => {
  for (const entry of entries.filter(row => row.ratingEvidence)) {
    const { metrics, ruleAdjustment, baselineMix } = entry.ratingEvidence
    assert.ok(Math.abs(metrics.reduce((sum, metric) => sum + metric.weight, 0) - 100) < 0.01, entry.entryKey)
    assert.ok(Math.abs(metrics.reduce((sum, metric) => sum + metric.contribution, 0) + ruleAdjustment - entry.rawScore) < 0.01, entry.entryKey)
    assert.ok(Math.abs(50 + metrics.reduce((sum, metric) => sum + metric.delta, 0) + ruleAdjustment - entry.rawScore) < 0.01, entry.entryKey)
    assert.ok(Math.abs(50 + (entry.rawScore - 50) * entry.seasonScoreConfidence - entry.seasonScore) < 0.002, entry.entryKey)
    assert.ok(Math.abs(Object.values(baselineMix).reduce((sum, weight) => sum + weight, 0) - 1) < 0.001)
  }
})

test('missing and explicitly unrated values never become a numeric rating', () => {
  for (const missing of [null, undefined, '', ' ', NaN, Infinity]) {
    assert.equal(formatSeasonRatingValue({ seasonOvr: missing }), '—')
    assert.equal(formatSeasonRatingValue({ seasonRatingStatus: 'PROVISIONAL', provisionalSeasonOvr: missing }), '—')
  }
  assert.equal(formatSeasonRatingValue({ seasonRatingStatus: 'UNRATED', seasonOvr: 90 }), '—')
  assert.equal(formatSeasonRatingValue({ seasonRatingStatus: 'PROVISIONAL', seasonOvr: 99, provisionalSeasonOvr: 89 }), '89')
})

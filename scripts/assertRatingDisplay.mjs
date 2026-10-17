import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { getSeasonById } from '../src/config/seasons.js'
import {
  formatEntrySeasonOvr,
  getEntrySeasonOvr,
  getEntrySeasonScore,
  getEntrySeasonScoreMeta,
  getLeaderboardEntries
} from '../src/lib/leaderboardSelectors.js'
import { getPlayerDossier } from '../src/lib/playerDetailSelectors.js'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { getMatchReviewMvp, getMatchReviewPlayers, getReviewMapRating } from '../src/lib/matchReviewSelectors.js'
import { mapRawScoreToMapRating } from '../src/lib/ratingModel.js'
import {
  formatMapPlayerMatchRating,
  getMapPlayerMatchRating,
  getMatchPlayerRating
} from '../src/lib/matchRatingDisplay.js'

test('missing OVR, score and percentile stay unavailable instead of becoming zero', () => {
  for (const value of [null, undefined, '', '  ', NaN, Infinity, 'invalid']) {
    assert.equal(getEntrySeasonOvr({ seasonOvr: value }), null)
    assert.equal(formatEntrySeasonOvr({ seasonOvr: value }), '—')
    assert.equal(formatEntrySeasonOvr({ seasonOvr: value }, 'UNRATED'), 'UNRATED')
    assert.equal(getEntrySeasonScore({ seasonScore: value }), null)
    assert.equal(getEntrySeasonScoreMeta({ seasonRolePercentile: value, seasonScoreConfidence: value }), '')
  }
  assert.equal(getEntrySeasonScoreMeta({ seasonRolePercentile: null, seasonScoreConfidence: 0.4 }), '样本观察')
  assert.equal(getEntrySeasonScoreMeta({ seasonRolePercentile: null, seasonScoreConfidence: 0.4 }, 'en-US'), 'PROVISIONAL')
})

test('valid ratings and a genuine zero percentile retain their meaning', () => {
  assert.equal(formatEntrySeasonOvr({ seasonOvr: 98 }), '98')
  assert.equal(formatEntrySeasonOvr({ seasonOvr: '78' }), '78')
  assert.equal(getEntrySeasonScore({ seasonScore: 0 }), 0)
  assert.equal(getEntrySeasonScoreMeta({ seasonRolePercentile: 0, seasonScoreConfidence: 1 }), '前 100% / 稳定样本')
  assert.equal(getEntrySeasonScoreMeta({ seasonRolePercentile: 100, seasonScoreConfidence: 1 }, 'en-US'), 'TOP 1% / STABLE')
})

test('match display uses the model curve, including legacy fallback and one-map win bonuses', () => {
  assert.equal(getMatchPlayerRating({ roleScore: 50 }), 7.0)
  assert.equal(getMatchPlayerRating({ roleScore: 70 }), 7.6)
  assert.equal(getMatchPlayerRating({ roleScore: 95 }), 9.0)
  assert.equal(getMatchPlayerRating({ rawScore: 0 }), 5.5)
  assert.equal(getMatchPlayerRating({ rawScore: 100 }), 9.8)
  assert.equal(getMatchPlayerRating({ rawScore: 50, roleScore: 72, mapRating: 7.2 }), 7.2)
})

test('the v1.5 display scale applies equally to map and match views while preserving archived scales', () => {
  for (const [rawScore, expected] of [[0, 5.5], [25, 6.4], [50, 7], [70, 7.9], [85, 8.6], [95, 9.2], [99, 9.6], [100, 9.8]]) {
    for (const role of ['TANK', 'DPS', 'SUPPORT']) for (const result of ['WIN', 'LOSS']) {
      const entry = { ratingModelVersion: 'v1.5.0', rawScore, role,
        mapResult: result, mapRating: mapRawScoreToMapRating(rawScore) }
      assert.equal(getMatchPlayerRating(entry), expected)
      assert.equal(getReviewMapRating(entry, [20, 50, 80]), expected)
    }
  }
  for (const ratingModelVersion of ['v1.2', 'v1.4', 'v1.5.1', undefined]) {
    const entry = { ratingModelVersion, rawScore: 70, mapRating: 7.6 }
    assert.equal(getMatchPlayerRating(entry), 7.6)
    assert.equal(getReviewMapRating(entry), 7.6)
  }
})

test('the v1.5 display preserves missingness, bounds, monotonicity and the entire lower half', () => {
  for (const rawScore of [null, undefined, '', '  ', NaN, Infinity, 'invalid']) {
    const entry = { ratingModelVersion: 'v1.5.0', rawScore, roleScore: 99, mapRating: 9.5 }
    assert.equal(getMatchPlayerRating(entry), null)
    assert.equal(getReviewMapRating(entry, [20, 50, 80]), null)
  }
  let previous = -Infinity
  for (let step = 0; step <= 100000; step++) {
    const rawScore = step / 1000
    const rating = getMatchPlayerRating({ ratingModelVersion: 'v1.5.0', rawScore })
    assert.ok(rating >= previous && rating >= 5.5 && rating <= 9.8)
    if (rawScore <= 50) assert.equal(rating, mapRawScoreToMapRating(rawScore))
    previous = rating
  }
})

test('missing match ratings do not produce a minimum or zero rating', () => {
  for (const value of [null, undefined, '', '  ', NaN, Infinity, 'invalid']) {
    assert.equal(getMatchPlayerRating({ mapRating: value, rawScore: value, roleScore: value }), null)
    assert.equal(formatMapPlayerMatchRating(value, '—'), '—')
  }
  assert.equal(getMatchPlayerRating(), null)
  assert.equal(getMapPlayerMatchRating(null, [50, 60]), null)
  assert.equal(getMapPlayerMatchRating(50, [50, null, undefined]), null)
})

const fixture = JSON.parse(fs.readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const season = getSeasonById('FCR26')

test('unqualified published entries display as unrated in the leaderboard and player dossier', () => {
  const entries = getLeaderboardEntries(fixture, season)
  const unrated = entries.filter(entry => !entry.eligible)
  assert.ok(unrated.length > 0)
  for (const entry of unrated) {
    assert.equal(formatEntrySeasonOvr(entry), '—', entry.entryKey)
    assert.doesNotMatch(getEntrySeasonScoreMeta(entry), /前 \d+%|TOP \d+%/)
  }
  const entry = unrated.find(item => item.roleTimeMins > 0)
  const player = getPlayerDossier(fixture, entry.player_id, entry.role, season)
  assert.equal(player.selectedRoleData.summary.seasonOvr, null)
  assert.equal(player.selectedRoleData.summary.scoreLabel, '—')
  assert.equal(player.selectedRoleData.summary.rank, null)
  assert.equal(player.selectedRoleData.summary.eligible, false)
})

test('the observed three-map MVP uses the shared scale while retaining each map rating', () => {
  const match = getMatchDossier(fixture, 'FCR26-SWISS-R1-M01')
  const players = getMatchReviewPlayers(match)
  const mvp = getMatchReviewMvp(match, players)
  assert.equal(mvp.playerId, match.topRatedPlayer.player_id)
  assert.equal(mvp.rating, 7.5)
  assert.ok(Math.abs(mvp.ratingEntry.rawScore - 67.034) < 0.001)
  assert.deepEqual(match.mapRecords.map(map => getMatchReviewPlayers(match, map.order).find(player => player.key === mvp.key)?.rating), [7.2, 8.4, 7.5])
  assert.equal(getMatchPlayerRating(match.topRatedPlayer), mvp.rating)
  assert.ok(players.every(player => player.rating == null || (player.rating >= 5.5 && player.rating <= 9.8)))
})

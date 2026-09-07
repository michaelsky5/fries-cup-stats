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
  const mvp = match.topRatedPlayer
  assert.equal(getMatchPlayerRating(mvp), 7.5)
  assert.ok(Math.abs(mvp.rawScore - 67.034) < 0.001)
  assert.deepEqual(match.mapRecords.map(map => getMatchPlayerRating(map.rating.entries.find(player => player.player_id === mvp.player_id))), [7.2, 8.4, 7.5])
  assert.ok(match.rating.entries.every(player => {
    const rating = getMatchPlayerRating(player)
    return rating == null || (rating >= 5.5 && rating <= 9.8)
  }))
})

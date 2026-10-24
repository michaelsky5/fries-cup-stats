import assert from 'node:assert/strict'

import { DEFAULT_SEASON_ID, getLatestReviewSeasonId, getReviewSeasonRedirect, resolveSeasonFromSearch } from '../src/config/seasons.js'

const timeline = []
let fallbackSeasonId = 'FCR26'
let search = '?season=FCR2026&lang=zh'

timeline.push(resolveSeasonFromSearch(search, fallbackSeasonId))

// The click handler may persist the next selection before React Router commits
// the new URL. A valid URL remains authoritative during that brief interval.
fallbackSeasonId = 'QGCS4'
timeline.push(resolveSeasonFromSearch(search, fallbackSeasonId))

search = '?season=QGCS4&lang=zh'
timeline.push(resolveSeasonFromSearch(search, fallbackSeasonId))
timeline.push(resolveSeasonFromSearch(search, 'FCR26'))

assert.deepEqual(timeline, ['FCR26', 'FCR26', 'QGCS4', 'QGCS4'])
assert.equal(resolveSeasonFromSearch('?season=unknown', 'QGCS4'), DEFAULT_SEASON_ID)
assert.equal(resolveSeasonFromSearch('?lang=zh', 'QGCS4'), 'QGCS4')

// 票 2.14: a bare review link opens the newest season with an open review; named seasons stay.
const site = 'https://stats.fries-cup.com'
assert.equal(getLatestReviewSeasonId(), 'FCR26')
assert.equal(getReviewSeasonRedirect(new URL(`${site}/review`), 'FCW26'), '/review?season=FCR2026')
assert.equal(getReviewSeasonRedirect(new URL(`${site}/review/story/tournament?scene=3&lang=zh`), 'FCW26'), '/review/story/tournament?scene=3&lang=zh&season=FCR2026')
assert.equal(getReviewSeasonRedirect(new URL(`${site}/review?season=FCW2026`), 'FCW26'), null)
assert.equal(getReviewSeasonRedirect(new URL(`${site}/review`), 'FCR26'), null)

console.log('Season switching remains URL-driven without state feedback.')

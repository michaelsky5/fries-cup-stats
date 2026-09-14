import assert from 'node:assert/strict'

import { DEFAULT_SEASON_ID, resolveSeasonFromSearch } from '../src/config/seasons.js'

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

console.log('Season switching remains URL-driven without state feedback.')

import assert from 'node:assert/strict'
import { createSeasonFavoritesExport, inspectSeasonFavoritesImport, parseSeasonFavoritesImport, readSeasonFavorites, writeSeasonFavorites } from '../src/features/favorites/favoritesStorage.js'
import { sanitizeFavoritesForSeason } from '../src/features/favorites/favoritesSelectors.js'
import { getFavoriteDraftStatus, moveFavoriteDraftItem, prepareFavoriteImport } from '../src/features/favorites/favoriteManagerModel.js'
import { FAVORITES_STORAGE_KEY } from '../src/features/favorites/favoritesConstants.js'

const db = { teams: 'ABCDEFG'.split('').map(id => ({ team_id: 'team-' + id, team_short_name: id })), players: Array.from({ length: 15 }, (_, index) => ({ player_id: 'p' + index })) }
const base = sanitizeFavoritesForSeason({ primaryTeamId: 'A', favoriteTeamIds: ['A', 'B'], favoritePlayerIds: ['p0'] }, db)
const draft = { ...base, favoriteTeamIds: ['A', 'B', 'C'] }
const latest = { ...base, favoritePlayerIds: ['p0', 'p1'] }
const originals = structuredClone([base, draft, latest])
assert.deepEqual(getFavoriteDraftStatus(base, draft, latest), { dirty: true, externalChange: true }, 'external updates require a decision while retaining the draft')
assert.deepEqual(getFavoriteDraftStatus(latest, draft, latest), { dirty: true, externalChange: false }, 'keeping a draft explicitly acknowledges the external update')
assert.deepEqual(getFavoriteDraftStatus(latest, latest, latest), { dirty: false, externalChange: false }, 'using the latest following clears the conflict')
assert.deepEqual([base, draft, latest], originals)
assert.equal(getFavoriteDraftStatus(base, { ...base, favoriteTeamIds: ['B', 'A'] }, base).dirty, true)
assert.equal(getFavoriteDraftStatus(base, { ...base, primaryTeamId: 'B' }, base).dirty, true)
assert.deepEqual(moveFavoriteDraftItem(['A', 'B', 'C'], 1, 2, 1), ['A', 'C', 'B'])
assert.deepEqual(moveFavoriteDraftItem(['A', 'B', 'C'], 2, 3, 1), ['A', 'B', 'C'], 'last row cannot move out of bounds')
assert.deepEqual(moveFavoriteDraftItem(['A', 'B', 'C'], 1, 0, 1), ['A', 'B', 'C'], 'primary position cannot be displaced by reordering')

const exported = createSeasonFavoritesExport('FCR2026', base, db)
assert.deepEqual(parseSeasonFavoritesImport(JSON.stringify(exported), 'FCR2026', db), base)
assert.deepEqual(parseSeasonFavoritesImport({ FCR2026: base }, 'FCR2026', db), base, 'legacy per-season stores remain supported')
assert.deepEqual(parseSeasonFavoritesImport({ teamIds: ['team-A'], playerIds: ['p0'] }, 'FCR2026', db), { primaryTeamId: 'A', favoriteTeamIds: ['A'], favoritePlayerIds: ['p0'] })
for (const payload of [{}, [], null, { favorites: {} }, { favoriteTeamIds: 'A' }, { favoritePlayerIds: [null] }, { favoriteTeamIds: [{ id: 'A' }] }]) {
  assert.throws(() => parseSeasonFavoritesImport(payload, 'FCR2026', db), { code: 'INVALID_PAYLOAD' }, 'invalid imports must not become empty following')
}
assert.throws(() => parseSeasonFavoritesImport('{', 'FCR2026', db), { code: 'INVALID_JSON' })
assert.throws(() => parseSeasonFavoritesImport({ ...exported, schema: 'other-app' }, 'FCR2026', db), { code: 'INVALID_SCHEMA' })
assert.throws(() => parseSeasonFavoritesImport({ ...exported, version: 2 }, 'FCR2026', db), { code: 'UNSUPPORTED_VERSION' })
assert.throws(() => parseSeasonFavoritesImport({ ...exported, seasonId: '' }, 'FCR2026', db), { code: 'INVALID_PAYLOAD' })
for (const payload of [{ ...exported, seasonId: 'QGCS4' }, { seasonId: 'QGCS4', favorites: base }]) {
  assert.throws(() => parseSeasonFavoritesImport(payload, 'FCR2026', db), { code: 'SEASON_MISMATCH' })
}
const empty = { primaryTeamId: null, favoriteTeamIds: [], favoritePlayerIds: [] }
assert.deepEqual(parseSeasonFavoritesImport(empty, 'FCR2026', db), empty, 'an explicitly empty backup is valid')
const inspected = inspectSeasonFavoritesImport({ favoriteTeamIds: ['A', 'unknown'], favoritePlayerIds: ['p0', 'unknown-player'] }, 'FCR2026', db)
assert.equal(inspected.omitted, 2)
assert.deepEqual(inspected.favorites, { primaryTeamId: 'A', favoriteTeamIds: ['A'], favoritePlayerIds: ['p0'] })
const imported = sanitizeFavoritesForSeason({ primaryTeamId: 'G', favoriteTeamIds: ['G', 'F', 'E', 'D'], favoritePlayerIds: db.players.map(player => player.player_id) }, db)
const plan = prepareFavoriteImport(draft, imported, db)
assert.deepEqual(plan.merge.favoriteTeamIds, ['A', 'B', 'C', 'G', 'F'])
assert.equal(plan.merge.primaryTeamId, 'A')
assert.equal(plan.merge.favoritePlayerIds.length, 12)
assert.equal(plan.mergeOmitted, 2)
assert.deepEqual(plan.replace, imported)
assert.deepEqual(prepareFavoriteImport(base, { ...base, primaryTeamId: 'B' }, db).replace.favoriteTeamIds, ['B', 'A'], 'imported primary teams are placed first before reordering')
assert.deepEqual(draft, originals[1], 'previewing either mode leaves the draft untouched')

const store = new Map()
globalThis.window = { localStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) } }
writeSeasonFavorites('QGCS4', empty, db, { requirePersistence: true })
writeSeasonFavorites('FCR2026', base, db, { requirePersistence: true })
assert.deepEqual(readSeasonFavorites('FCR2026', db), base)
assert.ok(Object.hasOwn(JSON.parse(store.get(FAVORITES_STORAGE_KEY)), 'QGCS4'), 'saving never replaces another event')
assert.throws(() => writeSeasonFavorites('', draft, db, { requirePersistence: true }), /without an event/)
const saved = store.get(FAVORITES_STORAGE_KEY)
window.localStorage.setItem = () => { throw new Error('QuotaExceededError') }
assert.throws(() => writeSeasonFavorites('FCR2026', draft, db, { requirePersistence: true }), /could not be saved/)
assert.equal(store.get(FAVORITES_STORAGE_KEY), saved, 'a failed save leaves previously persisted following untouched')
Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError') } })
assert.throws(() => writeSeasonFavorites('FCR2026', draft, db, { requirePersistence: true }), /could not be saved/)
delete globalThis.window
console.log('Following manager checks passed: draft conflicts, ordering, strict/legacy imports, preview limits, event isolation and storage failure.')

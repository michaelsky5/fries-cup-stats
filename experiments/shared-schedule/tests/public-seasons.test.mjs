import test from 'node:test'
import assert from 'node:assert/strict'
import { SEASONS, getSeasonById } from '../src/shared/publicSeasons.js'
import { validatePublicSnapshot } from '../src/shared/publicSnapshot.js'
import { createPublicSeasonReader } from '../src/shared/publicSeasonReader.js'
import { emptyFollowing, toggleFollowing, readFollowing, FOLLOWING_KEY } from '../src/shared/followingStore.js'
import { centerShare } from '../src/shared/centerRoutes.js'
import { centerEntryUrl, decodePublicOptions } from '../src/shared/centerPaths.js'
import { createCenterNavigation } from '../src/shared/centerNavigation.js'

const snapshot = id => ({ season: { id }, meta: {}, teams: [], players: [], matches: [], player_totals: [] })
test('generated public catalog includes four actual events and no private trials', () => {
  assert.deepEqual(SEASONS.map(item => item.id), ['FCW26', 'FCR26', 'QGCS4', 'FCA26'])
  assert.equal(getSeasonById('FCA2026').id, 'FCA26')
  assert.ok(SEASONS.every(item => !item.partnerTrial && !item.proxyDataUrl && !item.preferLocalData))
  assert.throws(() => validatePublicSnapshot(snapshot('FCR26'), getSeasonById('FCA26')), /不匹配/)
})
test('concurrent requests and failed refreshes are isolated by event', async () => {
  const calls = []
  const read = createPublicSeasonReader({ request: options => { calls.push(options); return { abort() {} } }, timeoutMs: 100 })
  const regular = read(false, 'FCR26'), academy = read(false, 'FCA26'), sameRegular = read(false, 'FCR2026')
  assert.equal(calls.length, 2)
  calls[1].success({ statusCode: 200, data: snapshot('FCA26') })
  calls[0].success({ statusCode: 200, data: snapshot('FCR26') })
  assert.equal((await academy).data.meta.season_id, 'FCA26')
  assert.equal((await regular).data.meta.season_id, 'FCR26')
  assert.equal((await sameRegular).data, (await regular).data)
  const refresh = read(true, 'FCA26')
  calls[2].fail({ errMsg: 'timeout' })
  assert.equal((await refresh).data.meta.season_id, 'FCA26')
  assert.equal((await refresh).stale, true)
  await assert.rejects(read(false, 'TRIAL_SECRET'), /未知/)
  assert.equal(calls.length, 3)
})
test('wrong-event responses cannot populate a new event cache', async () => {
  const read = createPublicSeasonReader({ request: options => { options.success({ statusCode: 200, data: snapshot('FCR26') }); return {} } })
  await assert.rejects(read(false, 'FCA26'), error => error.code === 'PUBLIC_FORMAT')
})
test('following keeps the original weekly key and separates equal IDs across events', () => {
  const values = new Map(), storage = { get: key => values.get(key), set: (key, value) => values.set(key, value) }
  toggleFollowing(storage, emptyFollowing(), 'teams', 'same-team')
  toggleFollowing(storage, emptyFollowing('FCR26'), 'players', 'same-player')
  assert.ok(values.has(FOLLOWING_KEY))
  assert.deepEqual(readFollowing(storage, 'FCR26').data.teams, [])
  assert.deepEqual(readFollowing(storage, 'FCR26').data.players, ['same-player'])
  assert.deepEqual(readFollowing(storage, 'FCA26').data.players, [])
  assert.deepEqual(readFollowing(storage).data.teams, ['same-team'])
})
test('archive sharing includes the event and excludes local/private route state', () => {
  const raw = { ...snapshot('FCR26'), players: [{ player_id: 'P1', display_name: '公开选手' }] }
  const share = centerShare(raw, 'roster', { player: 'P1', following: 'private', query: 'secret', token: 'secret' }, { seasonId: 'FCR26' })
  const query = new URLSearchParams(share.path.split('?')[1])
  assert.equal(query.get('season'), 'FCR26')
  assert.equal(query.get('player'), 'P1')
  assert.equal(query.has('query'), false)
  assert.equal(query.has('token'), false)
  assert.equal(new URLSearchParams(centerShare(raw, 'space').path.split('?')[1]).get('view'), 'overview')
  assert.equal(centerEntryUrl({ season: 'FCA26', token: 'secret' }), '/archive/pages/index?season=FCA26')
})
test('archive details never pop into a root of another event', async () => {
  const pages = [{ route: 'center/pages/index', options: { season: 'FCA26' } }, { route: 'center/pages/index', options: { season: 'FCR26', player: 'P1' } }]
  let launched = ''
  const nav = createCenterNavigation({ getPages: () => pages, navigateBack: () => { throw new Error('Wrong event') }, reLaunch: ({ url }) => { launched = url } })
  await nav.switchTo('database', { seasonId: 'FCR26' })
  assert.match(launched, /season=FCR26&view=database/)
  assert.equal(nav.takeVisit(), null)
})
test('native queries decode exactly once and ignore private fields', () => {
  const options = { season: 'FCR26', map: 'Circuit Royal', staff: 'event:caster:名字%20#123', token: 'secret' }
  const encoded = Object.fromEntries(new URLSearchParams(centerEntryUrl(options).split('?')[1]).entries())
  // WeChat onLoad supplies the escaped values, unlike URLSearchParams.
  const nativeQuery = Object.fromEntries(Object.entries(encoded).map(([key, value]) => [key, encodeURIComponent(value)]))
  assert.deepEqual(decodePublicOptions({ ...nativeQuery, token: 'secret' }), { season: 'FCR26', map: 'Circuit Royal', staff: 'event:caster:名字%20#123' })
  assert.equal(decodePublicOptions({ staff: 'literal%E' }).staff, 'literal%E')
})

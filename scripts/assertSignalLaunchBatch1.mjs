import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { getSeasonById, withSeason } from '../src/config/seasons.js'
import { buildReviewEntryPath, buildReviewPath } from '../src/lib/reviewNavigation.js'
import { getReturnState, readReturnState } from '../src/lib/navigationState.js'
import { getMatchFormatLabel } from '../src/lib/matchFormat.js'
import { translateLegacyValue } from '../src/lib/legacyTranslationState.js'
import { getPublicDataStatus, getSeasonLifecycleGroup } from '../src/lib/publicDataStatus.js'
import { clearDbCache, getDb, getDbSource, isLocalDbFallback, refreshDb, selectNewestDbSnapshot } from '../src/lib/db.js'
import { readPublicSnapshot, savePublicSnapshot } from '../src/lib/publicSnapshotCache.js'
import { getGlobalSummary } from '../src/lib/selectors.js'
import { getMatchArchiveStages } from '../src/lib/matchArchiveStages.js'

const query = path => new URL(path, 'https://stats.example.test').searchParams

test('archive stage navigation reflects each event instead of showing empty Swiss and LCQ routes', () => {
  const stages = getMatchArchiveStages([...Array.from({ length: 36 }, () => ({ stage: 'GROUP' })), ...Array.from({ length: 8 }, () => ({ stage: 'PLAYOFFS' }))])
  assert.deepEqual(stages.map(({ value, count }) => ({ value, count })), [{ value: 'GROUP', count: 36 }, { value: 'PLAYOFFS', count: 8 }])
  assert.equal(getMatchArchiveStages([{ stage: 'SPECIAL' }])[0].value, 'SPECIAL')
})

test('portal navigation clears filters while explicit list return restores them', () => {
  const search = '?season=FCR2026&design=kpr5&lang=en&view=list&tab=finished&stage=PLAYOFFS'
  const hub = query(withSeason('/matches', 'FCR26', search))
  assert.deepEqual(Object.fromEntries(hub), { design: 'kpr5', lang: 'en', season: 'FCR2026' })
  const location = { pathname: '/matches', search, hash: '#round-4' }
  const saved = readReturnState(getReturnState(location), { allowedPrefixes: ['/matches'] })
  assert.equal(saved.returnTo, `/matches${search}#round-4`)
  const returned = withSeason(saved.returnTo, 'FCR26', '?design=kpr5')
  assert.equal(query(returned).get('stage'), 'PLAYOFFS')
  assert.equal(query(returned).get('view'), 'list')
  assert.ok(returned.endsWith('#round-4'))
  const target = query(withSeason('/matches?view=list&tab=all&lang=zh', 'QGCS4', search))
  assert.equal(target.get('season'), 'QGCS4')
  assert.equal(target.get('lang'), 'zh')
  assert.equal(target.get('stage'), null)
  for (const path of ['https://fries-cup.com/', '//fries-cup.com/', '#section', 'mailto:hello@example.test']) {
    assert.equal(withSeason(path, 'QGCS4', search), path)
  }
})

test('review and game destinations retain design, event and requested language', () => {
  const search = '?design=kpr5&season=FCR2026&view=list&scene=3'
  for (const path of [buildReviewEntryPath('QGCS4', 'en-US', search), buildReviewPath('/review/story/tournament', 'QGCS4', 'en-US', search)]) {
    assert.equal(query(path).get('design'), 'kpr5')
    assert.equal(query(path).get('season'), 'QGCS4')
    assert.equal(query(path).get('lang'), 'en')
    assert.equal(query(path).get('view'), null)
    assert.equal(query(path).get('scene'), null)
  }
  for (const path of ['/career', '/shop', '/fantasy/battle', '/champion']) {
    assert.equal(query(withSeason(path, 'QGCS4', search)).get('design'), 'kpr5')
    assert.equal(query(withSeason(path, 'QGCS4', search)).get('season'), 'QGCS4')
  }
})

test('published first-to and best-of formats agree across raw and bracket matches', () => {
  assert.equal(getMatchFormatLabel({ format: 'FT4', firstTo: 3 }), 'FT4')
  assert.equal(getMatchFormatLabel({ raw: { format: 'FT4' } }), 'FT4')
  assert.equal(getMatchFormatLabel({ raw: { first_to: 3 } }), 'FT3')
  assert.equal(getMatchFormatLabel({ bestOf: 5 }), 'BO5')
  assert.equal(getMatchFormatLabel({}), '—')
  assert.equal(getMatchFormatLabel({ firstTo: -1 }), '—')
})

test('legacy translations respect asynchronously replaced text and locale changes', () => {
  const placeholder = translateLegacyValue('冠军席位等待归属', null, 'zh-CN')
  const loaded = translateLegacyValue('NovaFury', placeholder, 'zh-CN')
  assert.equal(loaded.rendered, 'NovaFury')
  assert.equal(translateLegacyValue('NovaFury', loaded, 'en-US').rendered, 'NovaFury')
  const original = translateLegacyValue('返回选手列表', null, 'en-US')
  assert.notEqual(original.rendered, original.source)
  assert.equal(translateLegacyValue(original.rendered, original, 'zh-CN').rendered, '返回选手列表')
  const updated = translateLegacyValue('返回比赛详情', original, 'en-US')
  assert.equal(updated.source, '返回比赛详情')
})

test('lifecycle and source states are independent of review availability', () => {
  assert.equal(getSeasonLifecycleGroup({ reviewEnabled: false }, { totalMatches: 44, isFinished: true }), 'ARCHIVE')
  assert.equal(getSeasonLifecycleGroup({ reviewEnabled: true }, { totalMatches: 10, isFinished: false }), 'CURRENT')
  assert.equal(getSeasonLifecycleGroup(getSeasonById('QGCS4')), 'ARCHIVE')
  assert.equal(getPublicDataStatus({ isUsingFallback: true }).key, 'fallback')
  assert.equal(getPublicDataStatus({ refreshError: true }).key, 'error')
  assert.equal(getPublicDataStatus({ isRefreshing: true }).key, 'refreshing')
  assert.equal(getPublicDataStatus({ dataSource: { kind: 'local-preview' } }).key, 'local')
  assert.equal(getPublicDataStatus({}).key, 'ready')
  assert.ok(getPublicDataStatus({ refreshError: true }).notice)
  assert.equal(getPublicDataStatus({}).notice, '')
  assert.equal(getGlobalSummary({ meta: { ranking_as_of: '2026-08-29T00:00:00Z' } }).updatedAt, '2026-08-29T00:00:00Z')
})

test('unavailable optional browser storage does not prevent data loading', async () => {
  assert.equal(await readPublicSnapshot('QGCS4'), null)
  assert.equal(await savePublicSnapshot('QGCS4', {}, '/public/data'), null)
})

test('network fallback, refresh failure, recovery and explicit preview stay distinguishable', async () => {
  const fixture = JSON.parse(await readFile(new URL('../public/data/qgcs4_review_public.json', import.meta.url), 'utf8'))
  const season = getSeasonById('QGCS4')
  const previousFetch = globalThis.fetch
  const calls = []
  let offline = false
  let stamp = '2026-08-28T00:00:00Z'
  globalThis.fetch = async url => {
    calls.push(url)
    if (offline && url !== season.localDataUrl) throw new Error('NETWORK_UNAVAILABLE')
    return { ok: true, json: async () => ({ ...structuredClone(fixture), updated_at: url === season.localDataUrl ? '2026-09-01T00:00:00Z' : stamp }) }
  }
  try {
    clearDbCache()
    const first = await getDb('QGCS4')
    assert.equal(calls[0], season.proxyDataUrl)
    assert.equal(calls.includes(season.localDataUrl), false)
    assert.equal(getDbSource(first).kind, 'published')
    assert.equal(isLocalDbFallback(first), false)
    assert.strictEqual(await refreshDb('QGCS4'), first, 'unchanged publications keep their object identity')
    const changedWithoutTimestamp = { teams: ['new'] }
    assert.strictEqual(selectNewestDbSnapshot({ teams: ['old'] }, changedWithoutTimestamp), changedWithoutTimestamp)
    offline = true
    calls.length = 0
    await assert.rejects(refreshDb('QGCS4'), /DATA_LOAD_FAILED/)
    assert.equal(calls.includes(season.localDataUrl), false)
    assert.strictEqual(await getDb('QGCS4'), first)
    offline = false
    stamp = '2026-08-27T00:00:00Z'
    assert.strictEqual(await refreshDb('QGCS4'), first)
    stamp = '2026-08-29T00:00:00Z'
    const fresh = await refreshDb('QGCS4')
    assert.equal(fresh.updated_at, stamp)

    clearDbCache()
    offline = true
    const fallback = await getDb('QGCS4')
    assert.equal(isLocalDbFallback(fallback), true)
    offline = false
    const recovered = await refreshDb('QGCS4')
    assert.equal(isLocalDbFallback(recovered), false)
    assert.equal(recovered.updated_at, stamp, 'an authoritative publication replaces a bundled fallback even with an older timestamp')
    const preview = await getDb('QGCS4', { preferLocalData: true })
    assert.equal(getDbSource(preview).kind, 'local-preview')
    assert.strictEqual(await getDb('QGCS4'), recovered)
  } finally {
    globalThis.fetch = previousFetch
    clearDbCache()
  }
})

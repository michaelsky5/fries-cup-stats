import assert from 'node:assert/strict'
import test from 'node:test'
import { getPublicDataStatus, getSeasonStatusKey } from '../src/lib/publicDataStatus.js'
import { SEASONS, getSeasonById, getSeasonEventGroups } from '../src/config/seasons.js'
import { getSeasonStatus } from '../src/lib/homeSelectors.js'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'

test('a failed first load never claims an update or previously available records', async () => {
  await ensureUiLocale('zh-TW')
  for (const [locale, label] of [['zh-CN', '加载失败'], ['zh-TW', '載入失敗'], ['en-US', 'Load failed'], ['ko-KR', '데이터 로드 실패']]) {
    const failed = getPublicDataStatus({ error: 'DATA_LOAD_FAILED', db: null }, locale)
    assert.equal(failed.key, 'error')
    assert.equal(failed.label, label)
    assert.equal(failed.notice, '')
    assert.ok(failed.retryLabel)
    assert.equal(getPublicDataStatus({ error: 'DATA_LOAD_FAILED', isLoading: true }, locale).key, 'loading')
    assert.equal(getPublicDataStatus({ error: '', dataSource: { kind: 'published' } }, locale).key, 'ready')
  }
})

test('official and partner events remain separate regardless of selection or lifecycle', () => {
  const before = SEASONS.map(season => season.id)
  assert.deepEqual(getSeasonEventGroups().map(group => [group.kind, group.seasons.map(season => season.id)]), [
    ['OFFICIAL', ['FCW26', 'FCR26', 'FCA26']],
    ['PARTNER', ['QGCS4']]
  ])
  assert.deepEqual(SEASONS.map(season => season.id), before)
  assert.equal(new Set(before).size, before.length, 'each event has one canonical ID')
  assert.equal(getSeasonStatusKey(getSeasonById('FCW26'), getSeasonStatus(null, getSeasonById('FCW26'))), 'pending')
  assert.deepEqual(getSeasonEventGroups([getSeasonById('QGCS4')]).map(group => group.kind), ['PARTNER'])
})

test('an archived event does not become schedule-pending while its snapshot loads', () => {
  for (const season of SEASONS.filter(item => item.lifecycle === 'ARCHIVED')) {
    assert.equal(getSeasonStatusKey(season, getSeasonStatus(null, season)), 'archive')
  }
  assert.equal(getSeasonStatusKey({ lifecycle: 'ACTIVE' }, { totalMatches: 0 }), 'pending')
  assert.equal(getSeasonStatusKey({ lifecycle: 'ACTIVE' }, { totalMatches: 3 }), 'scheduled')
  assert.equal(getSeasonStatusKey({ lifecycle: 'ARCHIVED' }, { totalMatches: 3, liveMatches: 1 }), 'live')
  assert.equal(getSeasonStatusKey({ lifecycle: 'ACTIVE' }, { totalMatches: 3, isFinished: true }), 'archive')
})

test('retrying cached data replaces a stale failure label while retaining a useful notice', () => {
  const failed = { refreshError: true, dataSource: { kind: 'cache' } }
  for (const locale of ['zh-CN', 'en-US', 'ko-KR']) {
    const error = getPublicDataStatus(failed, locale)
    const retry = getPublicDataStatus({ ...failed, isRefreshing: true }, locale)
    assert.equal(error.key, 'error')
    assert.equal(retry.key, 'refreshing')
    assert.equal(retry.label, retry.refreshingLabel)
    assert.notEqual(retry.notice, error.notice)
    assert.ok(retry.notice.length > 0)
    assert.equal(getPublicDataStatus({ dataSource: failed.dataSource }, locale).notice, '')
  }
})

test('fallback provenance survives a retry and local previews retain their source label', () => {
  const fallback = getPublicDataStatus({ isUsingFallback: true })
  const retry = getPublicDataStatus({ isUsingFallback: true, refreshError: true, isRefreshing: true })
  assert.equal(retry.key, 'fallback')
  assert.equal(retry.notice, fallback.notice)
  assert.equal(getPublicDataStatus({ isRefreshing: true, dataSource: { kind: 'local-preview' } }).key, 'local')
})

test('initial loading takes precedence over background-refresh flags', () => {
  assert.equal(getPublicDataStatus({ isLoading: true, isRefreshing: true, refreshError: true }).key, 'loading')
  assert.equal(getPublicDataStatus({ isLoading: true, isUsingFallback: true }).key, 'loading')
})

test('review archives have a public archive label without hiding load failures or changing live provenance', () => {
  for (const locale of ['zh-CN', 'en-US', 'ko-KR']) {
    const dataSource = { kind: 'review-archive' }
    const archive = getPublicDataStatus({ dataSource }, locale)
    assert.equal(archive.key, 'archive')
    assert.ok(archive.label.length > 0)
    assert.equal(archive.notice, '')
    assert.notEqual(archive.label, getPublicDataStatus({ dataSource: { kind: 'local-preview' } }, locale).label)
    assert.equal(getPublicDataStatus({ dataSource, isLoading: true }, locale).key, 'loading')
    assert.equal(getPublicDataStatus({ dataSource, refreshError: true }, locale).key, 'error')
    assert.equal(getPublicDataStatus({ dataSource, isUsingFallback: true }, locale).key, 'fallback')
    assert.equal(getPublicDataStatus({ dataSource: { kind: 'published' }, isRefreshing: true }, locale).key, 'refreshing')
  }
})

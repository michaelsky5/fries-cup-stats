import assert from 'node:assert/strict'
import test from 'node:test'
import { getPublicDataStatus } from '../src/lib/publicDataStatus.js'

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

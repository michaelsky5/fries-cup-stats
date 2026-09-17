import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_PUBLIC_DESIGN, getDesignPreview, shouldShowDesignPreview, withDesignPreview } from '../src/features/fd-design/designPreview.js'
import { getNavigationSearch } from '../src/components/layout/publicNavigation.js'
import { withSeason } from '../src/config/seasons.js'
import { buildReviewEntryPath } from '../src/lib/reviewNavigation.js'
import { getDataCenterPageLabel } from '../src/lib/pageTitle.js'

const params = path => new URL(path, 'https://stats.example.test').searchParams

test('ordinary and unrecognized URLs use the public default, while old design links remain explicit', () => {
  assert.equal(DEFAULT_PUBLIC_DESIGN, 'kpr5')
  for (const search of ['', '?season=FCR2026', '?design=', '?design=unknown']) {
    assert.equal(getDesignPreview(search), 'kpr5')
  }
  for (const design of ['fd', 'kpr', 'kpr3', 'kpr4', 'kpr5', 'original']) {
    assert.equal(getDesignPreview(`?design=${design}`), design)
    assert.equal(getDesignPreview(`?design=${design}`, 'original'), design)
  }
  assert.equal(getDesignPreview('?season=FCR2026', 'original'), 'original')
})

test('public navigation, season changes and review entries work without preview parameters', () => {
  const search = getNavigationSearch('?season=FCR2026&lang=en&role=SUPPORT', 'kpr5')
  for (const target of [withSeason('/players', 'FCR26', search), withSeason('/matches?view=list', 'QGCS4', search), buildReviewEntryPath('FCR26', 'en-US', search)]) {
    assert.equal(params(target).has('design'), false)
    assert.equal(params(target).get('lang'), 'en')
    assert.ok(params(target).get('season'))
  }
  const originalSearch = getNavigationSearch('?design=original&lang=zh', 'original')
  assert.equal(params(withSeason('/leaderboard', 'FCR26', originalSearch)).get('design'), 'original')
  assert.equal(new URLSearchParams(getNavigationSearch('?design=kpr5', 'kpr5')).get('design'), 'kpr5')
})

test('the comparison toolbar is opt-in in development and cannot be enabled in production', () => {
  for (const search of ['', '?design=kpr5', '?design=original', '?designPreview=0']) {
    assert.equal(shouldShowDesignPreview(search, true), false)
  }
  assert.equal(shouldShowDesignPreview('?design=kpr5&designPreview=1', true), true)
  assert.equal(shouldShowDesignPreview('?design=original&designPreview=1', false), false)
  assert.equal(shouldShowDesignPreview('?designPreview=1', false), false)
})

test('version comparison preserves filters, locale, season, hash and external links', () => {
  const target = withDesignPreview('/leaderboard?lang=en&season=FCR2026&role=SUPPORT&designPreview=1#rankings', 'original')
  assert.equal(params(target).get('role'), 'SUPPORT')
  assert.equal(params(target).get('lang'), 'en')
  assert.equal(params(target).get('season'), 'FCR2026')
  assert.equal(params(target).get('designPreview'), '1')
  assert.equal(params(target).get('design'), 'original')
  assert.ok(target.endsWith('#rankings'))
  for (const path of ['https://fries-cup.com/', '//fries-cup.com/', '#rankings', 'mailto:staff@example.test']) {
    assert.equal(withDesignPreview(path, 'original'), path)
  }
})

test('staff titles follow the default design and retain original-view wording', () => {
  assert.equal(getDataCenterPageLabel('/staff'), '赛事职员')
  assert.equal(getDataCenterPageLabel('/staff', '?group=team'), '战队职员')
  assert.equal(getDataCenterPageLabel('/staff', '?design=original&group=team'), '赛事人员')
})

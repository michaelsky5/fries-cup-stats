import assert from 'node:assert/strict'

import { resolveTrackedLegacyTranslation } from '../src/lib/legacyI18n.js'

const initialChinese = resolveTrackedLegacyTranslation({
  current: '待更新',
  locale: 'zh-CN'
})
assert.deepEqual(initialChinese, {
  source: '待更新',
  rendered: '待更新',
  value: '待更新'
})

const liveMetricUpdate = resolveTrackedLegacyTranslation({
  current: 'DMG',
  source: initialChinese.source,
  rendered: initialChinese.rendered,
  locale: 'zh-CN'
})
assert.deepEqual(liveMetricUpdate, {
  source: 'DMG',
  rendered: 'DMG',
  value: 'DMG'
})

const initialEnglish = resolveTrackedLegacyTranslation({
  current: '待更新',
  locale: 'en-US'
})
assert.deepEqual(initialEnglish, {
  source: '待更新',
  rendered: 'Pending Update',
  value: 'Pending Update'
})

const backToChinese = resolveTrackedLegacyTranslation({
  current: initialEnglish.value,
  source: initialEnglish.source,
  rendered: initialEnglish.rendered,
  locale: 'zh-CN'
})
assert.equal(backToChinese.source, '待更新')
assert.equal(backToChinese.value, '待更新')

const componentLocaleUpdate = resolveTrackedLegacyTranslation({
  current: 'Pending Update',
  source: '待更新',
  rendered: '待更新',
  locale: 'en-US'
})
assert.equal(componentLocaleUpdate.source, '待更新')
assert.equal(componentLocaleUpdate.value, 'Pending Update')

const newChineseSource = resolveTrackedLegacyTranslation({
  current: '尚未出场',
  source: initialEnglish.source,
  rendered: initialEnglish.rendered,
  locale: 'en-US'
})
assert.equal(newChineseSource.source, '尚未出场')
assert.equal(newChineseSource.value, 'Not Yet Played')

assert.equal(resolveTrackedLegacyTranslation({ current: 'DMG', locale: 'zh-CN' }), null)

console.log('Legacy DOM translation state assertions passed.')

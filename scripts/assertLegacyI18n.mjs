import assert from 'node:assert/strict'
import { translateLegacyValue } from '../src/lib/legacyTranslationState.js'

const chinese = translateLegacyValue('待更新', null, 'zh-CN')
assert.deepEqual(chinese, { source: '待更新', rendered: '待更新' })
const english = translateLegacyValue(chinese.rendered, chinese, 'en-US')
assert.deepEqual(english, { source: '待更新', rendered: 'Pending Update' })
assert.deepEqual(translateLegacyValue(english.rendered, english, 'zh-CN'), chinese)
assert.deepEqual(translateLegacyValue('DMG', chinese, 'zh-CN'), { source: 'DMG', rendered: 'DMG' })
assert.deepEqual(translateLegacyValue('尚未出场', english, 'en-US'), { source: '尚未出场', rendered: 'Not Yet Played' })
// React-owned replacements become the new source, including translated labels and real names.
assert.deepEqual(translateLegacyValue('Pending Update', chinese, 'en-US'), { source: 'Pending Update', rendered: 'Pending Update' })
assert.deepEqual(translateLegacyValue('示例选手#1234', english, 'zh-CN'), { source: '示例选手#1234', rendered: '示例选手#1234' })
console.log('Legacy translation uses the shared state adapter and preserves React updates.')

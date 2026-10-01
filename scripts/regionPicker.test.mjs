import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { REGION_GROUPS, getLocalizedOption, getRegionGroupValueForCode, getRegionOption } from '../src/features/auth/regionOptions.js'
import { findRegionOptions, registrationCountryValue, resolveRegionCode } from '../src/features/auth/regionPickerModel.js'

const expectedCodes = JSON.parse(fs.readFileSync(new URL('./fixtures/iso3166-country-codes.json', import.meta.url), 'utf8'))

test('directory covers all ISO countries and territories once, retaining XK separately', () => {
  const codes = REGION_GROUPS.flatMap(group => group.options.map(option => option.value))
  assert.equal(new Set(codes).size, codes.length)
  assert.deepEqual(codes.filter(code => !['XK', 'OTHER'].includes(code)).sort(), expectedCodes.codes)
  assert.equal(expectedCodes.codes.length, 249)
  assert.equal(codes.length, 251)
  for (const group of REGION_GROUPS) for (const option of group.options) {
    for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ko-KR']) assert.ok(getLocalizedOption(option, locale))
    assert.equal(getRegionGroupValueForCode(option.value), group.value)
  }
  assert.equal(getRegionOption(''), null, 'blank must not silently display China')
  assert.equal(getRegionOption('ZZ').value, 'ZZ', 'unknown profile codes remain visible')
})

test('browsing starts with East/Southeast Asia and territories follow geography', () => {
  assert.equal(REGION_GROUPS[0].value, 'ASIA_EAST_SE')
  assert.ok(findRegionOptions({ groupValue: 'ASIA_EAST_SE' }).some(option => option.value === 'SG'))
  for (const [code, group] of [['GU', 'OCEANIA'], ['PR', 'AMERICAS'], ['GL', 'AMERICAS'], ['RE', 'AFRICA'], ['AX', 'EUROPE'], ['AQ', 'ANTARCTIC']]) assert.equal(getRegionGroupValueForCode(code), group)
})

test('search spans continents, matches codes exactly and ignores case/diacritics', () => {
  for (const query of ['Singapore', '新加坡', 'SG', ' sg ', '싱가포르']) assert.deepEqual(findRegionOptions({ query, groupValue: 'EUROPE' }).map(option => option.value), ['SG'])
  assert.deepEqual(findRegionOptions({ query: 'us' }).map(option => option.value), ['US'])
  assert.deepEqual(findRegionOptions({ query: 'UK' }).map(option => option.value), ['GB'])
  assert.deepEqual(findRegionOptions({ query: '中国' }).map(option => option.value), ['CN', 'HK', 'MO', 'TW'])
  assert.deepEqual(findRegionOptions({ query: 'reunion' }).map(option => option.value), ['RE'])
  assert.ok(findRegionOptions({ query: 'Puerto Rico' }).some(option => option.value === 'PR'))
  assert.deepEqual(findRegionOptions({ query: 'not-a-country-name' }), [])
})

test('legacy text maps to codes without losing unlisted registration details', () => {
  for (const value of ['中国', '中國', 'China', '中国大陆', 'CN', 'cn']) assert.equal(resolveRegionCode(value), 'CN')
  for (const value of ['Singapore', '新加坡', 'SG']) assert.equal(resolveRegionCode(value), 'SG')
  assert.equal(resolveRegionCode(''), '')
  assert.equal(resolveRegionCode('未列出示例地区'), 'OTHER')
  assert.equal(resolveRegionCode('__proto__'), 'OTHER')
  assert.equal(registrationCountryValue('OTHER', '  未列出示例地区  '), '未列出示例地区')
  assert.equal(registrationCountryValue('CN'), '中国大陆')
  assert.equal(registrationCountryValue('SG'), '新加坡')
  assert.equal(registrationCountryValue('PR'), '波多黎各')
  assert.equal(registrationCountryValue('Singapore'), 'Singapore')
  assert.equal(registrationCountryValue('ZZ'), 'ZZ')
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LOCALES, LOCALE_STORAGE_KEY, LEGACY_REVIEW_LOCALE_STORAGE_KEY, normalizeLocale, getLocaleParam, withLocale, getStoredLocale, setStoredLocale, getActiveLocale } from '../src/lib/locales.js'
import { ensureUiLocale, getUiCatalog, ensureTraditionalReview } from '../src/lib/localeCatalog.js'
import { translateUiText } from '../src/lib/uiText.js'
import { createPublicTextTranslator } from '../src/lib/publicText.js'
import { translateLegacyValue } from '../src/lib/legacyTranslationState.js'
import { localizeTraditionalReview } from '../src/lib/traditionalText.js'
import { getPosterLocaleContext } from '../src/lib/posterLocaleContext.js'
import { OW_HEROES, OW_MAPS, formatOwHeroName, formatOwMapName, formatOwMapMode, getOwHero, getOwMap, getOwHeroAssetKey, getOwMapImageName } from '../src/lib/heroes.js'
import { getPublicDataStatus } from '../src/lib/publicDataStatus.js'
import { formatMatchSchedule } from '../src/lib/scheduleFormat.js'
import { buildReviewSceneUrl, buildReviewEntryPath } from '../src/lib/reviewNavigation.js'
import { getNavigationSearch } from '../src/components/layout/publicNavigation.js'
import { buildCinemaReviewScenes } from '../src/lib/reviewCinema.js'
import { getPosterPayload } from '../src/lib/reviewPoster.js'
import { REVIEW_SOURCE_SCENE } from '../src/lib/reviewSource.js'
import { getReviewIdentities } from '../src/lib/reviewLocale.js'

assert.deepEqual(LOCALES.map(item => item.id), ['zh-CN', 'zh-TW', 'ko-KR', 'en-US'])
for (const value of ['zh-TW', 'ZH_tw', 'zh-Hant', 'zh-Hant-TW', 'zh-HK']) assert.equal(normalizeLocale(value), 'zh-TW')
assert.equal(normalizeLocale('invalid', 'also-invalid'), 'zh-CN')
assert.equal(normalizeLocale('ko'), 'ko-KR')
assert.equal(normalizeLocale('en-GB'), 'en-US')

const stored = new Map()
const originalWindow = globalThis.window
try {
  globalThis.window = { location: { search: '?lang=ko&season=FCR26' }, localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) } }
  stored.set(LEGACY_REVIEW_LOCALE_STORAGE_KEY, 'zh-TW')
  assert.equal(getStoredLocale(), 'zh-TW')
  assert.equal(getActiveLocale(), 'ko-KR', 'A shared link must take priority over saved preferences')
  setStoredLocale('en')
  assert.equal(stored.get(LOCALE_STORAGE_KEY), 'en-US')
  assert.equal(stored.get(LEGACY_REVIEW_LOCALE_STORAGE_KEY), 'en-US')
  globalThis.window.localStorage = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
  assert.doesNotThrow(() => setStoredLocale('zh-TW'))
  assert.equal(getActiveLocale(), 'ko-KR')
  assert.equal(getStoredLocale('zh-TW'), 'zh-TW')
} finally {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
}

assert.equal(getUiCatalog('zh-CN'), undefined, 'Simplified Chinese needs no extra dictionary')
await Promise.all(LOCALES.map(item => ensureUiLocale(item.id)))
await Promise.all([ensureUiLocale('ko'), ensureUiLocale('zh-TW'), ensureUiLocale('en')])
assert.equal(translateUiText('赛管', 'zh-TW'), '賽管')
assert.equal(translateUiText('我是赛管', 'zh-TW'), '我是賽管')
assert.ok(translateUiText('{0} 人 · 等待周赛管理员锁定。', 'zh-TW', [3]).includes('周賽管理員'))
const catalog = JSON.parse(readFileSync(new URL('../src/locales/ui.json', import.meta.url), 'utf8'))
const placeholders = value => [...value.matchAll(/\{\d+\}/g)].map(match => match[0]).sort()
let checkedMessages = 0
for (const [source, translations] of Object.entries(catalog)) {
  for (const [locale, value] of Object.entries(translations)) {
    assert.deepEqual(placeholders(value), placeholders(source), `${locale}: changed data placeholders in ${source}`)
    assert.equal(getUiCatalog(locale)[source], value, `${locale}: generated dictionary is stale`)
    checkedMessages++
  }
}

for (const { id: locale } of LOCALES) {
  const navigation = new URLSearchParams(getNavigationSearch('season=FCR26&team=爱将', 'original', locale))
  assert.equal(navigation.get('lang'), getLocaleParam(locale), 'Navigation must include a saved language even when entry URL omitted it')
  assert.equal(navigation.get('team'), '爱将')
  assert.equal(navigation.get('design'), 'original')
  const link = new URL(withLocale('/matches?season=QGCS4&stage=GROUP&team=爱将#round-2', locale), 'https://test.invalid')
  assert.equal(link.searchParams.get('lang'), getLocaleParam(locale))
  assert.equal(link.searchParams.get('team'), '爱将')
  assert.equal(link.searchParams.get('stage'), 'GROUP')
  assert.equal(link.hash, '#round-2')
  const reviewLink = new URL(buildReviewEntryPath('FCR26', locale, '', { query: '石头', identity: 'player' }), 'https://test.invalid')
  assert.equal(reviewLink.searchParams.get('lang'), getLocaleParam(locale))
  assert.equal(reviewLink.searchParams.get('q'), '石头')
  const scene = new URL(buildReviewSceneUrl(`${reviewLink.origin}${reviewLink.pathname}${reviewLink.search}&scene=1`, 2))
  assert.equal(scene.searchParams.get('lang'), getLocaleParam(locale))
  assert.equal(scene.searchParams.get('scene'), '3')
  for (const value of [null, undefined, 0, '0', 'NF', '爱将#12345', 'https://test.invalid/档案']) assert.equal(translateUiText(value, locale), value)
  const params = ['重装#12345', '0:1', '3:1']
  const result = translateUiText('{0} 从 {1} 落后追至 {2}，拿下系列赛。', locale, params)
  for (const param of params) assert.ok(result.includes(param), `${locale}: interpolated identity or score changed`)
  const translatePublic = createPublicTextTranslator({ players: [{ name: '重装' }, { name: '石头' }], teams: [{ name: '爱将' }] })
  for (const name of ['重装', '石头', '爱将']) assert.equal(translatePublic(name, locale), name)
  assert.equal(translatePublic('选手', locale), translateUiText('选手', locale))
  for (const hero of OW_HEROES) {
    const name = formatOwHeroName(hero.id, locale)
    assert.equal(getOwHero(name)?.id, hero.id)
    assert.equal(getOwHeroAssetKey(name), getOwHeroAssetKey(hero.id))
  }
  for (const map of OW_MAPS) {
    const name = formatOwMapName(map.id, locale)
    assert.equal(getOwMap(name)?.id, map.id)
    assert.equal(getOwMapImageName(name), getOwMapImageName(map.id))
  }
  assert.equal(formatMatchSchedule({}, { locale }).hasSchedule, false)
  assert.equal(formatMatchSchedule({}, { locale }).compact, 'TBD')
  assert.equal(getPublicDataStatus({ refreshError: Error('offline') }, locale).key, 'error')
}

assert.equal(formatOwHeroName('mercy', 'zh-TW'), '慈悲')
assert.equal(formatOwHeroName('tracer', 'zh-TW'), '閃光')
assert.equal(formatOwMapName('eichenwalde', 'zh-TW'), '愛西瓦德')
assert.equal(formatOwMapName('midtown', 'zh-TW'), '中城區')
assert.equal(formatOwMapName('aatlis', 'zh-TW'), '埃特利斯')
assert.equal(formatOwMapMode('flashpoint', 'zh-TW'), '閃擊點')
assert.equal(formatOwMapMode('clash', 'zh-TW'), '交鋒')

let legacy = translateLegacyValue('选手', null, 'ko-KR', translateUiText)
legacy = translateLegacyValue(legacy.rendered, legacy, 'zh-TW', translateUiText)
legacy = translateLegacyValue(legacy.rendered, legacy, 'zh-CN', translateUiText)
assert.equal(legacy.rendered, '选手')
const translateLoadedPlayer = createPublicTextTranslator({ players: [{ name: '石头' }] })
assert.equal(translateLegacyValue('石头', legacy, 'en-US', translateLoadedPlayer).rendered, '石头', 'Newly loaded data must replace a translated placeholder')

const record = { id: 'player-1', title: '石头 的赛季回顾', playerName: '石头', teamName: '爱将', body: '石头 为爱将出场 0 场比赛。', image: '/assets/石头.png', heroName: '天使', mapName: '艾兴瓦尔德', playerCards: [{ title: '小鸟', value: 0 }] }
await ensureTraditionalReview()
assert.equal(getReviewIdentities('zh-TW').find(item => item.id === 'admin').title, '我是賽管')
const namedStaff = localizeTraditionalReview({ staffName: '賽務', body: '賽務 的赛管记录' })
assert.equal(namedStaff.staffName, '賽務', 'Role copy changes must not rename a public identity')
assert.ok(namedStaff.body.includes('賽務') && namedStaff.body.includes('賽管'))
const traditional = localizeTraditionalReview(record)
assert.equal(traditional.playerName, '石头')
assert.equal(traditional.teamName, '爱将')
assert.equal(traditional.playerCards[0].title, '小鸟')
assert.equal(traditional.playerCards[0].value, 0)
assert.equal(traditional.image, record.image)
assert.equal(traditional.heroName, '慈悲')
assert.equal(traditional.mapName, '愛西瓦德')
assert.ok(traditional.title.includes('石头') && traditional.title.includes('回顧'))
assert.ok(traditional.body.includes('石头') && traditional.body.includes('爱将') && traditional.body.includes('0'))
assert.equal(record.title, '石头 的赛季回顾', 'Localization must not mutate the source')
const sourceCover = { kind: 'cover', cardKind: 'tournament', title: '赛事回顾', viewerId: '' }
const namedCover = { ...sourceCover, title: '賽事回顧', viewerId: '石头#12345', [REVIEW_SOURCE_SCENE]: sourceCover }
assert.equal(getPosterPayload([namedCover]).scenes[0].viewerId, '石头#12345', 'The viewer name entered after localization must reach the poster')
const cinema = buildCinemaReviewScenes([sourceCover, {kind:'narrative', title:'公开预选赛'}, {kind:'narrative',title:'季後淘汰賽',[REVIEW_SOURCE_SCENE]:{kind:'narrative',title:'季后淘汰赛'}}], {isRegular:true,locale:'zh-TW'})
assert.deepEqual(cinema.filter(scene=>scene.kind==='act').map(scene=>scene.title), ['公開預選賽','季後淘汰賽'])
assert.ok(localizeTraditionalReview({ title: '最常被记录的地图\n皇家赛道', body: '这是一段关于常规赛的记忆。' }).title.includes('皇家賽道'))

const painted = []
const measured = []
const native = { font: '20px sans-serif', fillText(value) { assert.equal(this, native); painted.push(value) }, measureText(value) { assert.equal(this, native); measured.push(value); return { width: value.length } } }
const context = getPosterLocaleContext({ getContext: () => native }, { locale: 'zh-TW', playerName: '石头' })
context.font = '700 24px sans-serif'
context.measureText('石头 的赛季回顾')
context.fillText('石头 的赛季回顾', 0, 0)
assert.deepEqual(measured, painted, 'Canvas layout and painting must use identical translated text')
assert.equal(painted[0], '石头 的賽季回顧')
assert.ok(native.font.includes('Microsoft JhengHei'))
assert.equal(getPosterLocaleContext({ getContext: () => native }, { locale: 'zh-CN' }), native)

console.log(JSON.stringify({ locales: LOCALES.length, checkedMessages, heroRoundTrips: OW_HEROES.length * LOCALES.length, mapRoundTrips: OW_MAPS.length * LOCALES.length, status: 'passed' }, null, 2))

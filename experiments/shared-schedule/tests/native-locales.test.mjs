import test from 'node:test'
import assert from 'node:assert/strict'
import { LOCALES, configureLocaleStorage, activateLocale, setStoredLocale, getActiveLocale, getStoredLocale, subscribeLocale } from '../src/shared/nativeLocales.js'
import { getUiCatalog, convertTraditionalCopy } from '../src/generated/localeCatalog.js'
import { centerUrl } from '../src/shared/centerRoutes.js'

test('native language preference supports the four canonical locales and notifies mounted pages', () => {
  const stored = new Map()
  configureLocaleStorage({get:key=>stored.get(key),set:(key,value)=>stored.set(key,value)})
  const changes = [], unsubscribe = subscribeLocale(()=>changes.push(getActiveLocale()))
  for (const {id} of LOCALES) { assert.equal(setStoredLocale(id),true); assert.equal(getStoredLocale(),id) }
  assert.deepEqual(changes,LOCALES.map(item=>item.id))
  unsubscribe(); activateLocale('zh-CN')
})
test('blocked language storage keeps the active choice and a public deep link', () => {
  configureLocaleStorage({get:()=>'',set:()=>{throw new Error('quota')}})
  assert.equal(setStoredLocale('ko'),false)
  assert.equal(getActiveLocale(),'ko-KR')
  assert.match(centerUrl({view:'maps',season:'FCR26'}),/lang=ko/)
  activateLocale('zh-CN')
})
test('native UI additions are translated in all three catalogs and shared Stats labels remain canonical', () => {
  for (const locale of ['en-US','ko-KR','zh-TW']) {
    const copy = getUiCatalog(locale)
    assert.ok(copy['公开赛事记录'])
    assert.ok(copy['同职责对照'])
    assert.ok(copy['经典经理'])
    assert.notEqual(copy['公开赛事记录'],'公开赛事记录')
  }
  assert.equal(convertTraditionalCopy('队伍比赛记录'),'隊伍比賽記錄')
})

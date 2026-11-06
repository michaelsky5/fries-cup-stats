import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getNativeRoomSettings, serializeNativeRoomSettings } from '../src/features/weekly-competition/nativeRoomSettings.js'
import { buildWeeklyRoomPreview } from '../src/features/room-guide/roomDemoFixture.js'
import catalog from '../src/features/weekly-competition/nativeRoomCatalog.json' with { type: 'json' }
import { OW_HEROES, OW_MAPS } from '../src/lib/heroes.js'

const ready = () => buildWeeklyRoomPreview('ready')

test('serializer reproduces the exact F configuration accepted by the game', async () => {
  const fixture = await readFile(new URL('./fixtures/native-room-f-verified.txt', import.meta.url), 'utf8')
  const actual = serializeNativeRoomSettings({ mapName: 'Ilios', mapType: 'Control', bannedHeroes: ['Ana', 'Reinhardt'] })
  assert.equal(actual.text, fixture.replace(/\r\n/g, '\n').trimEnd())
  assert.equal(actual.inGameVerified, true)
})

test('positive map lists use native tokens and enable exactly the selected map', () => {
  const samples = [
    ['Nepal', 'Control', '尼泊尔'], ["King's Row", 'Hybrid', '国王大道'],
    ['Route 66', 'Escort', '66号公路'], ['Runasapi', 'Push', '鲁纳塞彼'],
    ['Aatlis', 'Flashpoint', '阿特利斯']
  ]
  for (const [mapName, mapType, native] of samples) {
    const { text } = serializeNativeRoomSettings({ mapName, mapType, bannedHeroes: ['D.Va', 'Baptiste'] })
    const entries = text.split('\n').filter(line => /^\t{4}(?![{}])/.test(line))
    assert.equal(entries.length, 3)
    assert.ok(entries.some(line => line.startsWith('\t\t\t\t' + native + ' ')))
    assert.match(text, /职责限制: 1重装，2输出，2支援/)
    assert.match(text, /阵亡镜头: 关闭/)
    assert.doesNotMatch(text, /启用英雄|阵亡镜头: 禁用|规则\s*\(/)
  }
})

test('catalog covers every map and hero in the current room directory', () => {
  assert.deepEqual(Object.keys(catalog.maps).sort(), OW_MAPS.map(map => map.id).sort())
  assert.deepEqual(Object.keys(catalog.heroes).sort(), OW_HEROES.map(hero => hero.id).sort())
  for (const map of OW_MAPS) {
    assert.ok(catalog.maps[map.id].name)
    if (catalog.maps[map.id].importBlocked && !catalog.maps[map.id].manualMapSelection) {
      assert.throws(() => serializeNativeRoomSettings({ mapName: map.en, mapType: map.mode }), /地图配置尚未通过游戏导入/)
    } else assert.ok(serializeNativeRoomSettings({ mapName: map.en, mapType: map.mode }).text)
  }
  for (const hero of OW_HEROES) {
    assert.ok(catalog.heroes[hero.id].name)
    assert.ok(serializeNativeRoomSettings({ mapName: 'Nepal', mapType: 'Control', bannedHeroes: [hero.en] }).text)
  }
})

test('new native export uses 格里姆火山 without the UI prefix and preserves the exact ID', () => {
  const data = ready()
  Object.assign(data.map, { name: 'Watchpoint: Grímsvötn', type: 'Escort', banA: 'Doctrine', banB: 'Reinhardt' })
  data.opening.setup = { ...data.map }
  const result = getNativeRoomSettings(data)
  assert.equal(result.ready, true)
  assert.ok(result.text.includes('格里姆火山 972777519512103322'))
  assert.doesNotMatch(result.text, /监测站：格里姆火山/)
  assert.match(result.text, /血律/)
  assert.match(result.text, /莱因哈特/)
  assert.equal(result.inGameVerified, true)
  assert.equal(catalog.maps['watchpoint-grimsvotn'].nativeExportConfirmed, true)
  assert.equal(catalog.heroes.doctrine.nativeExportConfirmed, true)
})

test('Busan uses the current client export instead of the rejected reference variants', () => {
  const result = serializeNativeRoomSettings({ mapName: 'Busan', mapType: 'Control', bannedHeroes: ['Lúcio', 'Jetpack Cat'] })
  assert.ok(result.text.includes('釜山 972777519512100008'))
  assert.doesNotMatch(result.text, /釜山 972777519512068153/)
  assert.equal(catalog.maps.busan.nativeExportConfirmed, true)
  assert.equal(catalog.maps.busan.importBlocked, false)
})

test('current-client batches replace the rejected map suffixes exactly', () => {
  const exported = [
    ['Antarctic Peninsula', 'Control', '南极半岛 972777519512068154'],
    ['Paraíso', 'Hybrid', '帕拉伊苏 972777519512095571'],
    ['Watchpoint: Gibraltar', 'Escort', '监测站：直布罗陀 972777519512068154 972777519512068292'],
    ['Eichenwalde', 'Hybrid', '艾兴瓦尔德 972777519512094292']
  ]
  for (const [mapName, mapType, entry] of exported) {
    const result = serializeNativeRoomSettings({ mapName, mapType })
    assert.equal(result.text.split('\n').find(line => line.startsWith('\t\t\t\t')), '\t\t\t\t' + entry)
    assert.equal(result.inGameVerified, false)
    assert.equal(catalog.maps[result.map.id].nativeExportConfirmed, true)
  }
})

test('Clash preserves the native exclude-other-map selection from both batches', () => {
  for (const [id, otherName] of [['hanaoka', '阿努比斯王座'], ['throne-of-anubis', '花冈']]) {
    const map = OW_MAPS.find(item => item.id === id)
    const { text } = serializeNativeRoomSettings({ mapName: map.en, mapType: map.mode })
    const block = text.match(/\t\t攻防阵线\n\t\t\{([\s\S]*?)\n\t\t\}/)?.[1]
    assert.ok(block)
    assert.ok(block.includes('\t\t\t禁用地图\n\t\t\t{\n\t\t\t\t' + otherName + '\n\t\t\t}'))
    assert.doesNotMatch(block, /启用地图|972777/)
    const remaining = OW_MAPS.filter(item => item.mode === 'clash' && catalog.maps[item.id].name !== otherName)
    assert.deepEqual(remaining.map(item => item.id), [id])
    assert.doesNotMatch(text, /\t{4}(?:花冈|阿努比斯王座) \d/)
  }
})

test('the rejected Samoa name-only comparison is withdrawn', () => {
  assert.deepEqual(catalog.maps.samoa.variants, ['972777519512068154'])
  assert.equal(catalog.maps.samoa.variantImportPolicy, undefined)
  assert.equal(catalog.maps.samoa.nameOnlyImportResult, 'REJECTED_USER_REPORTED')
  const { text } = serializeNativeRoomSettings({ mapName: 'Samoa', mapType: 'Control', bannedHeroes: ['Lúcio', 'Jetpack Cat'] })
  assert.doesNotMatch(text, /\t{4}萨摩亚(?: \d+)*\n/)
})

test('Samoa excludes the seasonal map as well as the other six pool maps', () => {
  const data = ready()
  Object.assign(data.map, { name: 'Samoa', type: 'Control', banA: 'Lúcio', banB: 'Jetpack Cat' })
  const result = getNativeRoomSettings(data)
  assert.equal(result.ready, true)
  assert.equal(result.map.id, 'samoa')
  assert.equal(result.inGameVerified, true)
  const block = result.text.match(/\t\t占领要点\n\t\t\{([\s\S]*?)\n\t\t\}/)?.[1]
  assert.ok(block)
  assert.match(block, /禁用地图/)
  assert.doesNotMatch(block, /启用地图|972777/)
  const excluded = block.split('\n').filter(line => line.startsWith('\t\t\t\t')).map(line => line.trim())
  const controlMaps = [
    ...OW_MAPS.filter(map => map.mode === 'control').map(map => ({ id: map.id, name: catalog.maps[map.id].name })),
    ...Object.entries(catalog.nonPoolMaps).filter(([, map]) => map.mode === 'control').map(([id, map]) => ({ id, name: map.name }))
  ]
  assert.deepEqual(excluded.sort(), controlMaps.filter(map => map.id !== 'samoa').map(map => map.name).sort())
  assert.ok(excluded.includes('春节漓江塔'))
  assert.equal(excluded.length, 7)
  assert.deepEqual(controlMaps.filter(map => !excluded.includes(map.name)).map(map => map.id), ['samoa'])
  assert.match(result.text, /卢西奥\n\t{4}飞天猫/)
  assert.equal(catalog.maps.samoa.inGameVerified, true)
  assert.equal(catalog.maps.samoa.lastImportResult, 'PASSED_USER_REPORTED')
})

test('accepted manual-map fallback retains all match settings without the broken map entry', () => {
  for (const [name, id, variants] of [
    ['Esperança', 'esperanca', ['972777519512068153', '972777519512068154']],
    ['Colosseo', 'colosseo', ['972777519512068153', '972777519512068154', '972777519512068292']]
  ]) {
    const data = ready()
    Object.assign(data.map, { name, type: 'Push', banA: 'Lúcio', banB: 'Jetpack Cat' })
    const result = getNativeRoomSettings(data)
    assert.equal(result.ready, true)
    assert.equal(result.mapSelection, 'MANUAL')
    assert.equal(result.map.id, id)
    assert.ok(result.key)
    assert.deepEqual(catalog.maps[id].variants, variants)
    assert.equal(catalog.maps[id].excludedMaps, undefined)
    assert.equal(catalog.maps[id].excludedMapVariants, undefined)
    const push = result.text.match(/\t\t机动推进\n\t\t\{([\s\S]*?)\n\t\t\}/)?.[1]
    assert.ok(push)
    assert.match(push, /竞技比赛规则: 开启/)
    assert.doesNotMatch(push, /启用地图|禁用地图/)
    assert.doesNotMatch(result.text, /斗兽场|埃斯佩兰萨|972777/)
    assert.equal((result.text.match(/启用地图\n\t\t\t\{\n\t\t\t\}/g) || []).length, 5)
    assert.match(result.text, /数据中心设置: 中国杭州/)
    assert.match(result.text, /玩家断线时暂停游戏: 是/)
    assert.match(result.text, /观战者人数上限: 12/)
    assert.match(result.text, /游戏模式开始: 手动/)
    assert.match(result.text, /职责限制: 1重装，2输出，2支援/)
    assert.match(result.text, /阵亡镜头: 关闭/)
    assert.match(result.text, /卢西奥\n\t{4}飞天猫/)
  }
})

test('manual target changes invalidate the copied receipt even when settings text is identical', () => {
  const data = ready()
  Object.assign(data.map, { name: 'Colosseo', type: 'Push', banA: 'Lúcio', banB: 'Jetpack Cat' })
  const colosseo = getNativeRoomSettings(data)
  data.map.name = 'Esperança'
  const esperanca = getNativeRoomSettings(data)
  assert.equal(colosseo.text, esperanca.text)
  assert.notEqual(colosseo.key, esperanca.key)
  assert.equal(colosseo.map.id, 'colosseo')
  assert.equal(esperanca.map.id, 'esperanca')
  assert.equal(getNativeRoomSettings(data, { stale: true }).text, '')
  data.opening.complete = false
  assert.equal(getNativeRoomSettings(data).ready, false)
})

test('client maps outside the BP pool are excluded without becoming selectable BP maps', () => {
  assert.equal(catalog.nonPoolMaps['lijiang-tower-lunar-new-year'].name, '春节漓江塔')
  assert.equal(OW_MAPS.some(map => map.id === 'lijiang-tower-lunar-new-year'), false)
  assert.throws(() => serializeNativeRoomSettings({ mapName: '春节漓江塔', mapType: 'Control' }), /地图原生字段待核对/)
})

test('map variants stay exact decimal strings without JavaScript integer rounding', () => {
  const { text } = serializeNativeRoomSettings({ mapName: 'Ilios', mapType: 'Control' })
  assert.ok(text.includes('伊利奥斯 972777519512068292 972777519512068153 972777519512068154'))
  for (const map of Object.values(catalog.maps)) for (const id of map.variants) {
    assert.equal(typeof id, 'string')
    assert.match(id, /^\d+$/)
  }
})

test('incomplete, stale, ended and mismatched-map room states never offer text', () => {
  const incomplete = ready(); incomplete.opening.complete = false
  const wrongMap = ready(); wrongMap.opening.mapOrder = 2
  const ended = ready(); ended.phase = 'REVIEW'; ended.map.status = 'COMPLETE'
  for (const data of [incomplete, wrongMap, ended, buildWeeklyRoomPreview('result')]) {
    assert.equal(getNativeRoomSettings(data).ready, false)
    assert.equal(getNativeRoomSettings(data).text, '')
  }
  assert.equal(getNativeRoomSettings(ready(), { stale: true }).reason, 'STALE')
})

test('only current-map bans are serialized; earlier maps and lineups are irrelevant', () => {
  const data = ready()
  data.maps.unshift({ order: 0, banA: 'Reinhardt', banB: 'Mercy' })
  data.map.banA = 'Baptiste'; data.map.banB = 'D.Va'
  const snapshot = structuredClone(data)
  const result = getNativeRoomSettings(data)
  assert.equal(result.ready, true)
  assert.match(result.text, /巴蒂斯特/)
  assert.match(result.text, /D\.Va/)
  assert.doesNotMatch(result.text, /莱因哈特|天使|安娜|示例选手/)
  assert.deepEqual(data, snapshot)
  data.map.banA = 'Ana'; data.map.banB = 'Reinhardt'
  const next = getNativeRoomSettings(data)
  assert.notEqual(next.key, result.key)
  assert.doesNotMatch(next.text, /巴蒂斯特|D\.Va/)
})

test('timeouts and passes are complete; empty unresolved bans are blocked', () => {
  const data = ready()
  data.map.banA = ''; data.map.banAStatus = 'TIMED_OUT'
  let result = getNativeRoomSettings(data)
  assert.equal(result.ready, true)
  assert.equal(result.heroes.length, 1)
  data.map.banB = ''; data.map.banBStatus = 'PASSED'
  result = getNativeRoomSettings(data)
  assert.equal(result.ready, true)
  assert.doesNotMatch(result.text, /禁用英雄|启用英雄/)
  delete data.map.banBStatus
  assert.equal(getNativeRoomSettings(data).ready, false)
  data.map.banA = 'Ana'
  assert.equal(getNativeRoomSettings(data).reason, 'INCONSISTENT')
})

test('missing tokens, type mismatches, duplicates and injected values are blocked', () => {
  const data = ready()
  data.map.banA = 'Unknown Future Hero'
  assert.deepEqual(getNativeRoomSettings(data).names, ['Unknown Future Hero'])
  data.map.banA = 'Ana'; data.map.banB = 'Ana'
  assert.equal(getNativeRoomSettings(data).reason, 'INCONSISTENT')
  data.map.banB = 'Reinhardt'; data.map.type = 'Escort'
  assert.equal(getNativeRoomSettings(data).reason, 'INCONSISTENT')
  assert.throws(() => serializeNativeRoomSettings({ mapName: 'Nepal\n}\n规则', mapType: 'Control' }))
})

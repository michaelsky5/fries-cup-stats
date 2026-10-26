import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { OW_HEROES, getOwHero, getOwMap, formatOwHeroName, formatOwMapName } from '../src/lib/heroes.js'
import { getHeroImage, getHeroRenderImage, getMapImage } from '../src/lib/reviewAssets.js'
import { heroCn, mapCn } from '../src/lib/reviewI18n.js'

test('every room hero resolves by ID and localized names to an existing PNG portrait', async () => {
  for (const hero of OW_HEROES) {
    const source = getHeroImage(hero.id)
    for (const name of [hero.zh, hero.en, ...(hero.aliases || [])]) assert.equal(getHeroImage(name), source, `${hero.id}: ${name}`)
    const image = await readFile(new URL(`../public${source}`, import.meta.url))
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', source)
  }
})

test('current Doctrine and Sombra use support assets while recorded damage Sombra remains readable', () => {
  assert.equal(getHeroImage('血律'), '/heroes/support/doctrine.png')
  assert.equal(getHeroImage('Doctrine', 'SUP'), '/heroes/support/doctrine.png')
  assert.equal(getHeroImage('黑影'), '/heroes/support/sombra.png')
  assert.equal(getHeroImage('Sombra', 'SUP'), '/heroes/support/sombra.png')
  assert.equal(getHeroImage('Sombra', 'DPS'), '/heroes/damage/sombra.png')
  assert.equal(getHeroRenderImage('血律'), '/review/hero-renders/support/doctrine.png')
  assert.equal(getHeroRenderImage('黑影'), '/review/hero-renders/support/sombra.png')
})

test('official simplified hero names keep historic input aliases, portraits and regional names', () => {
  for (const [id, official, previous, traditional] of [['anran', '安燃', '安然', '安燃'], ['freja', '弗蕾娅', '芙蕾雅', '弗蕾亞']]) {
    for (const input of [id, official, previous, traditional]) {
      assert.equal(getOwHero(input)?.id, id, input)
      assert.equal(formatOwHeroName(input, 'zh-CN'), official)
      assert.equal(heroCn(input), official)
      assert.equal(getHeroImage(input), getHeroImage(id))
      assert.equal(getHeroRenderImage(input), getHeroRenderImage(id))
    }
    assert.equal(formatOwHeroName(id, 'zh-TW'), traditional)
  }
})

test('official map names and old spellings resolve to the same immutable map ids and assets', () => {
  for (const input of ['Runasapi', '鲁纳塞彼', '鲁纳萨彼', '鲁纳萨皮', '盧納薩庇']) {
    assert.equal(getOwMap(input)?.id, 'runasapi')
    assert.equal(formatOwMapName(input, 'zh-CN'), '鲁纳塞彼')
    assert.equal(mapCn(input), '鲁纳塞彼')
    assert.equal(getMapImage('Push', input), getMapImage('Push', 'Runasapi'))
  }
  for (const input of ['aatlis', 'Aatlis', 'Atlis', '阿特利斯']) {
    const map = getOwMap(input)
    assert.equal(map?.id, 'aatlis')
    assert.equal(map.assetKey, 'atlis')
    assert.equal(formatOwMapName(input, 'en-US'), 'Aatlis')
    assert.equal(getMapImage('Flashpoint', input), '/maps/Flashpoint/Aatlis.jpg')
  }
  assert.equal(formatOwMapName('runasapi', 'zh-TW'), '盧納薩庇')
})

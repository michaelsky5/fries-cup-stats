import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { OW_HEROES } from '../src/lib/heroes.js'
import { getHeroImage, getHeroRenderImage } from '../src/lib/reviewAssets.js'

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

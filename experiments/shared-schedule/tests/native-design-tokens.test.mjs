import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { rootCustomProperties, resolveDesignToken } from '../scripts/native-design-tokens.mjs'

test('the native palette retains imported shared colours and resolves raster aliases', () => {
  const shared = readFileSync(new URL('../../../src/styles/fries-cup-tokens.css', import.meta.url), 'utf8')
  const roots = Object.fromEntries(rootCustomProperties(shared, ':root {--fc-data-paper:var(--fc-color-paper);--preview:var(--fc-data-paper)}'))
  assert.equal(resolveDesignToken('--preview', roots), roots['--fc-color-paper'])
  assert.match(resolveDesignToken('--preview', roots), /^#[\da-f]{6}$/i)
  assert.ok(roots['--fc-color-focus'])
})

test('missing or circular alias chains fail the native build instead of emitting transparent assets', () => {
  assert.throws(() => resolveDesignToken('--paper', {'--paper':'var(--missing)'}), /Missing design token/)
  assert.throws(() => resolveDesignToken('--paper', {'--paper':'var(--paper)'}), /Circular design token/)
})

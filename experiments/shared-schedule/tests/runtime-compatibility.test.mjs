import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('app compatibility entry initializes the canonical schedule without modern array methods', () => {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict'
    import { initialSelection, scheduleModel } from './src/shared/model.js'
    const raw = { season: { id: 'FCW26' }, teams: [], matches: [], weekly_competition: { schema_version: 'friescup-weekly-public-v1', cycles: [{ id: 'c', sequence: 1, status: 'ACTIVE', weeks: [{ id: 'w1', week_number: 1, status: 'PUBLISHED', match_ids: [] }, { id: 'w2', week_number: 2, status: 'PUBLISHED', match_ids: [] }] }] } }
    Array.prototype.at = undefined
    Array.prototype.flatMap = undefined
    String.prototype.padStart = undefined
    assert.throws(() => initialSelection(raw), TypeError)
    await import('./src/runtimeCompatibility.js')
    const selection = initialSelection(raw)
    assert.equal(selection.weekId, 'w2')
    assert.equal(scheduleModel(raw, selection).resultCount, 0)
    assert.equal('5'.padStart(2, '0'), '05')
    console.log('legacy initialization passed')
  `], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' })
  assert.equal(child.status, 0, child.stderr)
  assert.match(child.stdout, /legacy initialization passed/)
})

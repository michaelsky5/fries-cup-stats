import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getBanComparison } from '../src/features/team-dossier/teamBanComparison.js'
import { buildTeamPerformance, getPerformanceRows } from '../src/features/team-dossier/teamPerformance.js'

test('ban comparison keeps each side and its evidence separate for the same hero', () => {
  const ownRecord = { match: 'own' }
  const otherRecord = { match: 'other' }
  const bans = {
    ownCoverage: 1, opponentCoverage: 1,
    own: [{ key: 'kiriko', hero: 'Kiriko', label: 'Kiriko', maps: 1, records: [ownRecord] }],
    opponent: [{ key: 'kiriko', hero: 'Kiriko', label: 'Kiriko', maps: 1, records: [otherRecord] }]
  }
  const before = JSON.stringify(bans)
  const [row] = getBanComparison(bans)
  assert.equal(row.own.maps, 1)
  assert.equal(row.opponent.maps, 1)
  assert.deepEqual(row.own.records, [ownRecord])
  assert.deepEqual(row.opponent.records, [otherRecord])
  assert.equal(JSON.stringify(bans), before)
})

test('absence in a published sample is zero; an unrecorded side remains unknown', () => {
  const bans = {
    ownCoverage: 0, opponentCoverage: 1, own: [],
    opponent: [{ key: 'ana', hero: 'Ana', label: 'Ana', maps: 1, records: [{}] }]
  }
  assert.equal(getBanComparison(bans)[0].own.maps, null)
  assert.deepEqual(getBanComparison(bans)[0].own.records, [])
  const published = { ...bans, ownCoverage: 1, own: [{ key: 'kiriko', hero: 'Kiriko', label: 'Kiriko', maps: 1, records: [{}] }] }
  assert.equal(getBanComparison(published).find(row => row.key === 'ana').own.maps, 0)
  assert.equal(getBanComparison(published).find(row => row.key === 'kiriko').opponent.maps, 0)
  assert.deepEqual(getBanComparison({ ownCoverage: 0, opponentCoverage: 0, own: [], opponent: [] }), [])
})

test('real AIP bans reconcile both counts and exact maps while sorting independently', () => {
  const db = JSON.parse(readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const report = buildTeamPerformance(getPerformanceRows(db.matches, 'FCR26-T026'))
  const rows = getBanComparison(report.bans)
  const mizuki = rows.find(row => row.key === 'mizuki')
  assert.equal(mizuki.opponent.maps, 4)
  assert.equal(mizuki.own.maps, 1)
  assert.equal(rows[0].key, 'mizuki')
  assert.equal(getBanComparison(report.bans, 'own')[0].key, 'ramattra')
  for (const side of ['own', 'opponent']) {
    assert.equal(rows.reduce((sum, row) => sum + row[side].maps, 0), report.bans[`${side}Coverage`])
    for (const original of report.bans[side]) {
      const row = rows.find(item => item.key === original.key)
      assert.equal(row[side].maps, original.maps)
      assert.deepEqual(row[side].records, original.records)
    }
  }
  const swiss = buildTeamPerformance(getPerformanceRows(db.matches, 'FCR26-T026').filter(row => row.match.stage === 'SWISS'))
  assert.deepEqual(getBanComparison(swiss.bans), [])
})

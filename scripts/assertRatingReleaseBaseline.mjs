import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { getLeaderboardEntries } from '../src/lib/leaderboardSelectors.js'
import { getSeasonById } from '../src/config/seasons.js'

export const hash = value => createHash('sha256').update(value).digest('hex')
const fields = ['entryKey', 'roleMapsPlayed', 'roleMatchesPlayed', 'roleTimeMins',
  'total_elim', 'total_ast', 'total_dth', 'total_dmg', 'total_heal', 'total_block',
  'eligible', 'seasonRatingStatus', 'seasonOvr', 'provisionalSeasonOvr', 'rawScore', 'seasonScore',
  'seasonScoreConfidence', 'seasonRolePercentile', 'roleRank', 'overallRank',
  'seasonOvrBeforeOpponent', 'seasonOpponentAdjustment', 'ratingModelVersion', 'seasonRatingVersion']
export function ratingView(rows) {
  return rows.map(row => Object.fromEntries(fields.map(field => [field,
    typeof row[field] === 'number' ? Number(row[field].toFixed(9)) : row[field] ?? null
  ]))).sort((a, b) => a.entryKey < b.entryKey ? -1 : a.entryKey > b.entryKey ? 1 : 0)
}
export function sampleCounts(rows) {
  return Object.fromEntries(['FORMAL', 'PROVISIONAL', 'UNRATED'].map(status => [status, rows.filter(row => row.seasonRatingStatus === status).length]))
}

export function verifyAcademyMapTotals(db, rows) {
  const expected = new Map()
  const metrics = { total_elim: 'eliminations', total_ast: 'assists', total_dth: 'deaths', total_dmg: 'damage', total_heal: 'healing', total_block: 'mitigation' }
  let mapRows = 0
  for (const match of db.matches) for (const map of match.maps || []) {
    for (const row of [...(map.team_a_stats || []), ...(map.team_b_stats || [])]) {
      const time = String(row.time || map.match_time || '')
      assert.match(time, /^\d+:[0-5]\d$/)
      const [minutes, seconds] = time.split(':').map(Number)
      const duration = minutes + seconds / 60
      if (duration <= 0) continue
      const role = row.role === 'SUP' ? 'SUPPORT' : row.role
      const key = `${row.player_id}:${role}`
      const stats = expected.get(key) || { minutes: 0, maps: new Set(), ...Object.fromEntries(Object.keys(metrics).map(name => [name, 0])) }
      stats.minutes += duration
      stats.maps.add(`${match.match_id}:${map.map_order}`)
      for (const [target, name] of Object.entries(metrics)) stats[target] += Number(row[name] || 0)
      expected.set(key, stats)
      mapRows += 1
    }
  }
  const actual = new Map(rows.map(row => [row.entryKey, row]))
  for (const [key, stats] of expected) {
    const row = actual.get(key)
    assert.ok(row, `${key} is present`)
    assert.ok(Math.abs(row.roleTimeMins - stats.minutes) < 1e-8, `${key} minutes agree with map rows`)
    assert.equal(row.roleMapsPlayed, stats.maps.size, `${key} maps`)
    for (const name of Object.keys(metrics)) assert.equal(row[name], stats[name], `${key} ${name}`)
  }
  assert.equal(mapRows, 3010)
  assert.equal(expected.size, 194)
}

if (process.argv.includes('--fca')) {
  const arg = name => process.argv[process.argv.indexOf(name) + 1]
  const baseline = JSON.parse(fs.readFileSync(new URL('../docs/rating-v1.4-baseline-20260907.json', import.meta.url), 'utf8'))
  for (const [id, option] of [['FCA26', '--fca'], ['QGCS4', '--qgcs4'], ['FCR26', '--fcr']]) {
    assert.ok(process.argv.includes(option), `Missing ${option} snapshot file`)
    const bytes = fs.readFileSync(arg(option))
    assert.equal(hash(bytes), baseline.seasons[id].inputSha256, `${id} pinned input checksum`)
    const db = JSON.parse(bytes), rows = getLeaderboardEntries(db, getSeasonById(id))
    assert.equal(hash(JSON.stringify(ratingView(rows))), baseline.seasons[id].ratingSha256, `${id} rating output changed`)
    assert.deepEqual(sampleCounts(rows), baseline.seasons[id].sampleCounts)
    if (id === 'FCA26') verifyAcademyMapTotals(db, rows)
    console.log(`${id}: baseline passed (${rows.length} player-role entries)`)
  }
  if (process.argv.includes('--repaired-fca')) {
    const db = JSON.parse(fs.readFileSync(arg('--repaired-fca'), 'utf8'))
    const rows = getLeaderboardEntries(db, getSeasonById('FCA26'))
    verifyAcademyMapTotals(db, rows)
    assert.equal(hash(JSON.stringify(ratingView(rows))), baseline.seasons.FCA26.ratingSha256, 'Repaired archive rating matches the cleaned V5 baseline')
    console.log('Repaired FCA archive: all 194 role totals and ratings agree with the pinned baseline')
  }
}

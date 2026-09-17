import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { buildMapAtlas, findAtlasMap, filterAtlasMaps, formatMapDuration } from '../src/features/map-atlas/mapAtlasModel.js'

const side = (id, short) => ({ id, short, name: `${short} team` })
const heroes = ['Sigma', 'Sojourn', 'Genji', 'Kiriko', 'Lúcio']
const stats = heroes.map((hero, i) => ({ player_id: `P${i}`, player_name: `Player${i}#123`, heroes_played: hero, damage: 100 + i }))
const map = (overrides = {}) => ({ map_name: 'Circuit Royal', map_type: 'Escort', map_order: 1, match_time: '10:00', score_a: 3, score_b: 1, winner: 'A', team_a_stats: stats, team_b_stats: stats, ...overrides })
const match = (maps, overrides = {}) => ({ match_id: 'M1', status: 'COMPLETE', team_a: side('A', 'AA'), team_b: side('B', 'BB'), scheduled_at: '2026-08-01T12:00:00Z', maps, ...overrides })

test('repeated maps and administrative outcomes keep distinct map orders and sample denominators', () => {
  const db = { matches: [match([
    map(), map({ map_order: 2, match_time: '20:00' }),
    map({ map_order: 3, is_administrative: true, match_time: '00:00', team_a_stats: [], team_b_stats: [] })
  ])] }
  const before = JSON.stringify(db)
  const atlas = buildMapAtlas(db)
  const report = findAtlasMap(atlas, '皇家赛道')
  assert.equal(report.count, 3)
  assert.equal(report.administrativeCount, 1)
  assert.equal(report.avgDuration, 900)
  assert.equal(report.heroSamples, 4)
  assert.equal(report.lineupSamples, 4)
  assert.equal(report.compositions[0].count, 4)
  assert.equal(report.teams.find(team => team.id === 'A').wins, 3)
  assert.deepEqual(report.records.map(record => record.order), [3, 2, 1])
  assert.equal(new Set(report.records.map(record => record.id)).size, 3)
  assert.equal(JSON.stringify(db), before, 'presentation model must not mutate the published snapshot')
})

test('hero aliases and repeated rows count once per team-side, with only covered sides in the denominator', () => {
  const repeated = [...stats, { ...stats[4], heroes_played: 'Lucio' }]
  const atlas = buildMapAtlas({ matches: [match([map({ team_a_stats: repeated, team_b_stats: [] })])] })
  const report = atlas.maps[0]
  assert.equal(report.heroSamples, 1)
  assert.equal(report.heroStats.find(hero => hero.key === 'lucio').count, 1)
  assert.ok(report.heroStats.every(hero => hero.rate <= 1))
  assert.equal(report.lineupSamples, 1)
})

test('team exploration uses stable identities and includes administrative records', () => {
  const report = buildMapAtlas({ matches: [
    match([map()], { match_id: 'A-PLAYED', team_a: side('A', 'SAME') }),
    match([map({ is_administrative: true, team_a_stats: [], team_b_stats: [] })], { match_id: 'A-RULING', team_a: side('A', 'RENAMED') }),
    match([map()], { match_id: 'OTHER-TEAM', team_a: side('C', 'SAME') })
  ] }).maps[0]
  assert.deepEqual(report.records.filter(record => record.teamKeys.has('A')).map(record => record.matchId).sort(), ['A-PLAYED', 'A-RULING'])
  assert.equal(report.records.filter(record => record.teamKeys.has('C')).length, 1)
  report.teams.forEach(team => assert.equal(report.records.filter(record => record.teamKeys.has(team.key)).length, team.plays))
})

test('unknown outcomes do not become losses; draws and score-only wins remain distinct', () => {
  const report = buildMapAtlas({ matches: [match([
    map({ map_order: 1, winner: '', score_a: '', score_b: '', match_time: '', team_a_stats: [], team_b_stats: [] }),
    map({ map_order: 2, winner: '', score_a: 1, score_b: 1, match_time: '8:00' }),
    map({ map_order: 3, winner: '', score_a: 2, score_b: 0, match_time: '' })
  ])] }).maps[0]
  const team = report.teams.find(row => row.id === 'A')
  assert.deepEqual([team.wins, team.losses, team.draws, team.unknown], [1, 0, 1, 1])
  assert.equal(team.winRate, .5)
  assert.equal(report.avgDuration, 480)
  assert.equal(report.durationSamples, 1)
})

test('unpublished series and unnamed placeholders do not dilute the map distribution', () => {
  const atlas = buildMapAtlas({ matches: [match([map(), map({ map_name: '', map_type: 'UNKNOWN' })]), match([map()], { match_id: 'PENDING', status: 'PENDING' })] })
  assert.equal(atlas.totalRecords, 1)
  assert.equal(atlas.maps[0].share, 1)
  assert.equal(findAtlasMap(atlas, 'not-a-map'), null)
  assert.deepEqual(buildMapAtlas(null), { maps: [], modes: [], totalRecords: 0 })
  assert.equal(formatMapDuration(null), '—')
  assert.equal(formatMapDuration(779.8), '13:00')
})

test('the same record counts share a rank and bilingual map search normalizes punctuation', () => {
  const atlas = buildMapAtlas({ matches: [match([map(), map({ map_name: 'Dorado', map_order: 2 }), map({ map_name: 'King’s Row', map_type: 'Hybrid', map_order: 3 })])] })
  assert.ok(atlas.maps.every(item => item.rank === 1))
  assert.equal(findAtlasMap(atlas, 'Dorado').modeRank, 1)
  assert.equal(filterAtlasMaps(atlas.maps, { search: "King's Row" })[0]?.name, "King's Row")
  assert.equal(filterAtlasMaps(atlas.maps, { search: "King's Row" })[0]?.routeName, 'King’s Row', 'links preserve the published name for original-design compatibility')
  assert.equal(filterAtlasMaps(atlas.maps, { search: '皇家' })[0]?.name, 'Circuit Royal')
  assert.equal(filterAtlasMaps(atlas.maps, { mode: 'Escort', search: '国王' }).length, 0)
})

test('the current FCR26 snapshot reconciles map, hero and composition evidence', () => {
  const db = JSON.parse(fs.readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const atlas = buildMapAtlas(db)
  const royal = findAtlasMap(atlas, 'Circuit Royal')
  assert.equal(atlas.totalRecords, 286)
  assert.equal(atlas.maps.length, 15)
  assert.equal(royal.count, 63)
  assert.equal(royal.heroSamples, 126)
  assert.equal(royal.lineupSamples, 126)
  assert.equal(royal.heroStats.find(hero => hero.key === 'kiriko').count, 83)
  assert.equal(findAtlasMap(atlas, 'Ilios').administrativeCount, 1)
  assert.equal(atlas.maps.reduce((sum, item) => sum + item.count, 0), atlas.totalRecords)
  atlas.maps.forEach(item => {
    assert.ok(item.heroStats.every(hero => hero.rate >= 0 && hero.rate <= 1))
    assert.equal(item.compositions.reduce((sum, lineup) => sum + lineup.count, 0), item.lineupSamples)
    assert.ok(item.teams.every(team => team.plays === team.wins + team.losses + team.draws + team.unknown))
  })
})

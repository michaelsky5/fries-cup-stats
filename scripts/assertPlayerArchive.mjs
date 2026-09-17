import assert from 'node:assert/strict'
import fs from 'node:fs'
import { collectPlayerAppearances, getPlayerAppearances, formatPlayerMatchStage, playerPagePath } from '../src/features/player-dossier/playerDossierPresentation.js'
import { getPlayerArchive, getPlayerCompanions } from '../src/features/player-dossier/playerArchiveModel.js'

let count = 0
const check = (name, run) => { run(); count++; console.log(`PASS ${name}`) }
const peer = { playerId: 'p2', displayName: 'Partner', battleTag: 'Partner#22', role: 'SUPPORT', heroes: ['Ana'] }
const base = { matchId: 'm1', key: 'm1:A:p1:TANK', date: '2026-06-01', dateLabel: '06/01', stage: 'SWISS · ROUND 1', role: 'TANK', result: 'win', maps: [{ order: 1, name: 'Ilios', heroes: ['D.Va', 'DVa'], rating: 0, companions: [peer] }, { order: 2, name: 'Nepal', heroes: ['Winston'], rating: null, companions: [peer] }] }
const switched = { ...base, role: 'SUPPORT', key: 'm1:A:p1:SUPPORT', maps: [{ ...base.maps[0], heroes: ['Ana'], rating: 7.2 }] }

check('role changes count one match and unique maps, retaining separate zero and missing ratings', () => {
  const result = getPlayerArchive([switched, base, base])
  assert.deepEqual([result.matches.length, result.mapCount, result.wins], [1, 2, 1])
  assert.deepEqual(result.roles, ['TANK', 'SUPPORT'])
  assert.deepEqual(result.matches[0].maps[0].roleRecords.map(record => record.rating), [7.2, 0])
  assert.equal(result.matches[0].maps[1].roleRecords[0].rating, null)
  assert.equal(result.matches[0].maps[0].heroes.length, 2)
  assert.equal(result.phases[0].heroes.find(hero => hero.key === 'dva').maps, 1)
})
check('the sole recorded appearance gets one starting point, not duplicate story cards', () => {
  const result = getPlayerArchive([base])
  assert.equal(result.markers.length, 1)
  assert.deepEqual(result.highlights[0].reasons, ['first'])
  assert.equal(result.highlights.length, 1)
})
check('chapters and milestone links follow dated personal appearances', () => {
  const result = getPlayerArchive([
    { ...base, matchId: 'final', date: '2026-08-01', stage: 'PLAYOFFS · GRAND FINALS' },
    { ...base, matchId: 'unknown', date: '', stage: 'PLAYOFFS' },
    { ...base, matchId: 'first', date: '2026-06-01' },
    { ...base, matchId: 'playoffs', date: '2026-07-01', stage: 'PLAYOFFS · UB QF' }
  ])
  assert.deepEqual(result.phases.map(phase => phase.key), ['SWISS', 'PLAYOFFS'])
  assert.equal(result.first.matchId, 'first')
  assert.equal(result.latest.matchId, 'final')
  assert.deepEqual(result.markers.map(marker => marker.match.matchId), ['first', 'playoffs', 'final'])
  assert.equal(result.phases[1].mapCount, 6)
  assert.equal(result.phases[1].heroes.find(hero => hero.key === 'dva').maps, 3)
})
check('undated and empty records do not invent dates, opening matches or wins', () => {
  const undated = getPlayerArchive([{ ...base, date: '', result: 'pending' }])
  assert.equal(undated.first, null)
  assert.equal(undated.latest, null)
  assert.deepEqual(undated.markers, [])
  assert.deepEqual(undated.highlights[0].reasons, ['record'])
  assert.equal(undated.wins, 0)
  const empty = getPlayerArchive([])
  assert.deepEqual([empty.matches.length, empty.mapCount, empty.highlights.length, empty.phases.length], [0, 0, 0, 0])
})
check('shared maps deduplicate hero rows, role changes and repeated match records', () => {
  const peers = getPlayerCompanions([base, base, switched], [{ player_id: 'p2', nickname: 'Partner' }])
  assert.deepEqual(peers.map(item => [item.playerId, item.maps, item.matches]), [['p2', 2, 1]])
})
check('same nicknames stay separate and unidentified or ambiguous accounts do not get profile links', () => {
  const records = [{ ...base, maps: [{ ...base.maps[0], companions: [peer, { ...peer, playerId: 'p3' }, { displayName: 'Partner' }, { ...peer, playerId: 'missing' }, { ...peer, playerId: '', battleTag: 'Shared#1' }] }] }]
  const players = [{ player_id: 'p2', nickname: 'Partner' }, { player_id: 'p3', nickname: 'Partner' }, { player_id: 'p4', player_name: 'Shared#1' }, { player_id: 'p5', player_name: 'Shared#1' }]
  const peers = getPlayerCompanions(records, players)
  assert.equal(peers.length, 4)
  assert.deepEqual(peers.filter(item => item.playerId).map(item => item.playerId).sort(), ['p2', 'p3'])
})
check('a full unique BattleTag can resolve a teammate without matching by nickname', () => {
  const records = [{ ...base, maps: [{ ...base.maps[0], companions: [{ ...peer, playerId: '' }] }] }]
  assert.equal(getPlayerCompanions(records, [{ player_id: 'p2', player_name: 'Partner#22' }])[0].playerId, 'p2')
})
check('companions must be on the same side of the same published non-administrative map', () => {
  const row = (id, role, hero) => ({ playerId: id, displayName: id, role, hero, damage: 500 })
  const map = (order, extra = {}) => ({ order, name: 'Ilios', hasResult: true, winnerSide: 'A', raw: {}, teamAStats: [row('p1', 'TANK', 'Winston'), row('p2', 'SUPPORT', 'Ana')], teamBStats: [row('enemy', 'SUPPORT', 'Ana')], rating: { entries: [] }, ...extra })
  const dossier = { internalId: 'm1', match: {}, state: { canShowResults: true }, teamA: {}, teamB: {}, breadcrumb: [], rating: { entries: [] }, mapRecords: [map(1), map(2, { raw: { is_administrative: true } }), map(3, { hasResult: false })] }
  const appearances = collectPlayerAppearances([dossier], { player_id: 'p1' })
  assert.deepEqual(appearances[0].maps.map(item => item.order), [1])
  assert.deepEqual(appearances[0].maps[0].companions.map(item => item.playerId), ['p2'])
})
check('journey links preserve site and view context while clearing an incompatible stage', () => {
  const path = playerPagePath('p 1', 'journey', '?season=FCR2026&design=kpr5&lang=en&role=SUPPORT&pstage=SWISS', { jmatch: 'final', pstage: '' })
  const url = new URL(path, 'http://localhost')
  assert.equal(url.pathname, '/players/p%201/journey')
  assert.equal(url.searchParams.get('lang'), 'en')
  assert.equal(url.searchParams.get('role'), 'SUPPORT')
  assert.equal(url.searchParams.get('pstage'), null)
  assert.equal(url.searchParams.get('jmatch'), 'final')
  assert.equal(formatPlayerMatchStage('PLAYOFFS · LB Final'), '季后赛 · 败者组决赛')
})

const db = JSON.parse(fs.readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const appearancesOf = id => getPlayerAppearances(db, db.players.find(player => player.player_id === id))
check('AIP player dossier identifies the four actual teammates and excludes the unused roster slot', () => {
  const appearances = appearancesOf('FCR26-P0005')
  const result = getPlayerArchive(appearances)
  assert.deepEqual([result.matches.length, result.mapCount], [10, 32])
  const peers = getPlayerCompanions(appearances, db.players)
  assert.deepEqual(peers.map(item => item.playerId).sort(), ['FCR26-P0001', 'FCR26-P0002', 'FCR26-P0003', 'FCR26-P0006'])
  assert.ok(peers.every(item => item.maps === 32 && item.matches === 10))
  assert.equal(result.latest.matchId, 'FCR26-PLAYOFFS-R1-M14')
})
check('real multi-role archive counts personal maps once and keeps each published role rating', () => {
  const appearances = appearancesOf('FCR26-P0249')
  const result = getPlayerArchive(appearances)
  assert.deepEqual([result.matches.length, result.mapCount, result.roles.length], [10, 29, 3])
  for (const match of result.matches) for (const map of match.maps) for (const record of map.roleRecords) {
    const original = appearances.find(item => item.matchId === match.matchId && item.role === record.role).maps.find(item => item.order === map.order)
    assert.equal(record.rating, original.rating)
  }
})
check('registered non-appearance and one-match players have honest-sized archives', () => {
  assert.equal(getPlayerArchive(appearancesOf('FCR26-P0004')).matches.length, 0)
  const sparse = getPlayerArchive(appearancesOf('FCR26-P0031'))
  assert.deepEqual([sparse.matches.length, sparse.mapCount, sparse.highlights.length], [1, 2, 1])
})
console.log(`${count} player archive checks passed`)

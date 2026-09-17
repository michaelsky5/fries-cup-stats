import assert from 'node:assert/strict'
import fs from 'node:fs'
import { collectPlayerAppearances, filterPlayerAppearances, formatPlayerMatchStage, getPlayerAppearances, getPlayerMapProfiles, getPlayerPrimaryRole, getPlayerRecentForm, getPlayerSeasonJourney, getRecordedPlayerHeroes, playerComparisonPath, playerContextPath, playerMapKey, playerPagePath, playerRecordMatches } from '../src/features/player-dossier/playerDossierPresentation.js'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { getMatchReviewPlayers } from '../src/lib/matchReviewSelectors.js'
import { getPlayerDossier } from '../src/lib/playerDetailSelectors.js'
import { getSeasonById } from '../src/config/seasons.js'

let assertions = 0
function check(name, action) { action(); assertions += 1; console.log(`PASS ${name}`) }
const player = { player_id: 'p1', player_name: 'Coach#1234' }
const row = (role, hero, extra = {}) => ({ playerId: 'p1', displayName: 'Coach', battleTag: 'Coach#1234', role, hero, eliminations: 4, damage: 500, originalIndex: 0, ...extra })
const rating = (role, value) => ({ player_id: 'p1', role, mapRating: value })
const map = (order, rows, extra = {}) => ({ order, name: `Map ${order}`, hasResult: true, winnerSide: 'B', scoreA: 1, scoreB: 2, raw: {}, teamAStats: [], teamBStats: rows, rating: { entries: [rating('TANK', 8.2), rating('SUPPORT', 7.9)] }, ...extra })
const fixture = (extra = {}) => ({ internalId: 'match-1', match: { scheduled_at: '2026-08-15T12:00:00Z', team_a: { score: 1 }, team_b: { score: 2 } }, state: { canShowResults: true, isComplete: true, isForfeit: false }, teamA: { id: 'a', short: 'A' }, teamB: { id: 'b', short: 'B' }, breadcrumb: [], scheduleCompact: '08/15', winnerSide: 'B', rating: { entries: [rating('TANK', 6.7), rating('SUPPORT', 7.4)] }, mapRecords: [map(1, [row('TANK', 'D.Va'), row('TANK', 'D.Va'), row('TANK', 'Winston')]), map(2, [row('TANK', 'D.Va')]), map(3, [row('SUPPORT', 'Ana')])], ...extra })
const appearances = collectPlayerAppearances([fixture()], player)

check('keeps one player in two roles separate', () => {
  assert.equal(appearances.length, 2)
  assert.deepEqual(appearances.find(item => item.role === 'TANK').maps.map(item => item.order), [1, 2])
  assert.deepEqual(appearances.find(item => item.role === 'SUPPORT').maps.map(item => item.order), [3])
})
check('deduplicates hero-map appearances without losing multiple recorded heroes', () => {
  const heroes = getRecordedPlayerHeroes(appearances)
  assert.equal(heroes.find(hero => hero.key === 'dva').maps, 2)
  assert.equal(heroes.find(hero => hero.key === 'winston').maps, 1)
  assert.equal(heroes.length, 3)
})
check('keeps match rating independent of map ratings', () => {
  assert.equal(appearances[0].rating, 6.7)
  assert.equal(appearances[0].maps[0].rating, 8.2)
})
check('uses the player team perspective for scores and outcomes', () => {
  assert.equal(appearances[0].result, 'win')
  assert.deepEqual([appearances[0].scoreFor, appearances[0].scoreAgainst], [2, 1])
  assert.deepEqual([appearances[0].maps[0].scoreFor, appearances[0].maps[0].scoreAgainst], [2, 1])
})
check('does not convert missing role time or ratings to zero', () => {
  const [result] = collectPlayerAppearances([fixture({ rating: { entries: [] }, mapRecords: [map(1, [row('TANK', 'D.Va')], { rating: { entries: [] } })] })], player)
  assert.equal(result.rating, null)
  assert.equal(result.maps[0].rating, null)
  assert.equal(result.maps[0].minutes, null)
})
check('excludes forfeits, unpublished records and administrative maps', () => {
  assert.deepEqual(collectPlayerAppearances([fixture({ state: { canShowResults: false } })], player), [])
  assert.deepEqual(collectPlayerAppearances([fixture({ state: { canShowResults: true, isForfeit: true } })], player), [])
  assert.deepEqual(collectPlayerAppearances([fixture({ mapRecords: [map(1, [row('TANK', 'D.Va')], { raw: { is_administrative: true } }), map(2, [row('TANK', 'D.Va')], { hasResult: false })] })], player), [])
})
check('does not identify distinct players by shared nicknames', () => {
  assert.equal(playerRecordMatches({ playerId: 'p2', battleTag: 'Coach#1234' }, player), false)
  assert.equal(playerRecordMatches({ displayName: 'Coach' }, player), false)
  assert.equal(playerRecordMatches({ player_name: 'coach#1234' }, player), true)
})
check('hero and result filters apply within the selected role', () => {
  assert.equal(filterPlayerAppearances(appearances, { role: 'TANK', hero: 'dva', result: 'win' }).length, 1)
  assert.equal(filterPlayerAppearances(appearances, { role: 'SUPPORT', hero: 'dva' }).length, 0)
  assert.equal(filterPlayerAppearances(appearances, { result: 'loss' }).length, 0)
})
check('full history remains available beyond the old five-match cutoff', () => {
  assert.equal(collectPlayerAppearances(Array.from({ length: 12 }, (_, i) => fixture({ internalId: `match-${i}` })), player).length, 24)
})
check('map links carry only site context, keeping player filters on the return URL', () => {
  const path = playerContextPath('/matches/m1?map=3', '?season=FCR2026&design=kpr5&lang=en&role=TANK&phero=dva&popen=m1')
  assert.equal(path, '/matches/m1?map=3&season=FCR2026&design=kpr5&lang=en')
})
check('unknown outcomes stay unknown instead of implying a live or lost match', () => {
  assert.equal(collectPlayerAppearances([fixture({ winnerSide: '' })], player)[0].result, 'unknown')
})

const db = JSON.parse(fs.readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const actualPlayer = db.players.find(item => item.player_id === 'FCR26-P0249')
const actual = getPlayerAppearances(db, actualPlayer)
check('real multi-role player uses the most played role by default', () => {
  assert.equal(getPlayerPrimaryRole(getPlayerDossier(db, actualPlayer.player_id, '', getSeasonById('FCR2026'))).role, 'SUPPORT')
  assert.deepEqual([...new Set(actual.map(item => item.role))].sort(), ['DPS', 'SUPPORT', 'TANK'])
})
check('real match and map ratings match the published match detail', () => {
  for (const record of actual) {
    const match = getMatchDossier(db, record.matchId)
    const expected = getMatchReviewPlayers(match).find(item => item.playerId === actualPlayer.player_id && item.role === record.role)
    assert.equal(record.rating, expected.rating)
    for (const mapRecord of record.maps) {
      const expectedMap = getMatchReviewPlayers(match, mapRecord.order).find(item => item.playerId === actualPlayer.player_id && item.role === record.role)
      assert.equal(mapRecord.rating, expectedMap.rating)
      assert.deepEqual(mapRecord.heroes, expectedMap.heroes)
    }
  }
})
check('registered players without match statistics have no invented appearances', () => {
  assert.deepEqual(getPlayerAppearances(db, { player_id: 'not-an-appearance', player_name: 'Unplayed#0000' }), [])
})
check('a multi-role match counts once in a personal journey', () => {
  const journey = getPlayerSeasonJourney(appearances)
  assert.equal(journey.matches.length, 1)
  assert.equal(journey.mapCount, 3)
  assert.equal(journey.phases[0].wins, 1)
  assert.deepEqual(journey.roles.sort(), ['SUPPORT', 'TANK'])
})
check('journey chapters are chronological and use the latest real match in each phase', () => {
  const journey = getPlayerSeasonJourney([
    { ...appearances[0], matchId: 'final', stage: 'PLAYOFFS · GRAND FINALS', date: '2026-08-20', result: 'loss' },
    { ...appearances[0], matchId: 'swiss-later', stage: 'SWISS · ROUND 2', date: '2026-08-10' },
    { ...appearances[0], matchId: 'swiss-first', stage: 'SWISS · ROUND 1', date: '2026-08-01' }
  ])
  assert.deepEqual(journey.phases.map(phase => phase.phase), ['SWISS', 'PLAYOFFS'])
  assert.equal(journey.phases[0].matches.length, 2)
  assert.equal(journey.phases[0].latest.matchId, 'swiss-later')
  assert.equal(journey.phases[1].losses, 1)
})
check('empty and live appearances do not produce a false win or invented journey', () => {
  assert.deepEqual(getPlayerSeasonJourney([]), { matches: [], mapCount: 0, roles: [], phases: [] })
  const journey = getPlayerSeasonJourney([{ ...appearances[0], result: 'pending' }])
  assert.equal(journey.phases[0].wins, 0)
  assert.equal(journey.phases[0].losses, 0)
})
check('profile and analysis routes retain site context and analysis filters', () => {
  const search = '?season=FCR2026&design=kpr5&lang=en&role=SUPPORT&phero=ana&popen=m1'
  const analysisPath = playerPagePath('p 1', 'analysis', search)
  assert.equal(analysisPath, '/players/p%201/analysis' + search)
  assert.equal(playerPagePath('p 1', 'profile', analysisPath.split('?')[1]), '/players/p%201' + search)
  const path = playerPagePath('p1', 'analysis', search, { role: 'TANK', phero: '', popen: '', pview: 'heroes' })
  const params = new URL(path, 'http://localhost').searchParams
  assert.equal(params.get('role'), 'TANK')
  assert.equal(params.get('phero'), null)
  assert.equal(params.get('popen'), null)
  assert.equal(params.get('pview'), 'heroes')
})
check('comparison opens the correct player-role entry without leaking match filters', () => {
  const path = playerComparisonPath({ role: 'SUPPORT', entryKey: 'p1:SUPPORT' }, '?season=FCR2026&design=kpr5&lang=en&phero=ana&pview=matches', 'perMap')
  const params = new URL(path, 'http://localhost').searchParams
  assert.equal(params.get('compare'), 'p1:SUPPORT')
  assert.equal(params.get('role'), 'SUPPORT')
  assert.equal(params.get('mode'), 'perMap')
  assert.equal(params.get('design'), 'kpr5')
  assert.equal(params.get('phero'), null)
})
check('real player profile counts are independent of role records', () => {
  const journey = getPlayerSeasonJourney(actual)
  assert.equal(journey.matches.length, 10)
  assert.equal(journey.mapCount, 29)
  assert.equal(journey.roles.length, 3)
})
check('hero and map filters must match the same map appearance', () => {
  const base = appearances[0]
  const source = [{ ...base, maps: [
    { ...base.maps[0], name: 'Nepal', heroes: ['D.Va'] },
    { ...base.maps[1], name: 'Ilios', heroes: ['Winston'] }
  ] }]
  assert.equal(filterPlayerAppearances(source, { map: 'nepal', hero: 'dva' }).length, 1)
  assert.equal(filterPlayerAppearances(source, { map: 'nepal', hero: 'winston' }).length, 0)
  assert.equal(playerMapKey('尼泊尔'), playerMapKey('Nepal'))
})
check('map atlas merges aliases and duplicate rows without inventing ratings', () => {
  const base = appearances[0]
  const first = { ...base.maps[0], name: 'Nepal', rating: 8, result: 'win', heroes: ['D.Va', 'DVa', 'Winston'] }
  const source = [
    { ...base, maps: [first, first, { ...base.maps[1], name: '尼泊尔', rating: null, result: 'draw' }] },
    { ...base, matchId: 'match-2', maps: [{ ...first, rating: 6, result: 'loss' }] }
  ]
  const [profile] = getPlayerMapProfiles(source)
  assert.equal(profile.key, 'nepal')
  assert.equal(profile.maps, 3)
  assert.equal(profile.ratedCount, 2)
  assert.equal(profile.averageRating, 7)
  assert.deepEqual([profile.wins, profile.losses, profile.draws], [1, 1, 1])
  assert.equal(profile.heroes.length, 2)
  const dva = getRecordedPlayerHeroes(source).find(hero => hero.key === 'dva')
  assert.deepEqual([dva.wins, dva.losses, dva.draws], [1, 1, 1])
})
check('recent form uses chronological match ratings, not map ratings or missing zeros', () => {
  const base = appearances[0]
  const form = getPlayerRecentForm([
    { ...base, matchId: 'old', date: '2026-01-01', rating: 10 },
    { ...base, matchId: 'latest', date: '2026-03-01', rating: null, result: 'pending' },
    { ...base, matchId: 'recent', date: '2026-02-01', rating: 6, result: 'loss' }
  ], 2)
  assert.deepEqual(form.matches.map(match => match.matchId), ['latest', 'recent'])
  assert.equal(form.ratedCount, 1)
  assert.equal(form.averageRating, 6)
  assert.deepEqual([form.wins, form.losses, form.draws], [0, 1, 0])
})
check('empty analysis has neither map profiles nor a synthetic recent rating', () => {
  assert.deepEqual(getPlayerMapProfiles([]), [])
  assert.equal(getPlayerRecentForm([]).averageRating, null)
  assert.equal(getPlayerRecentForm([{ ...appearances[0], rating: null }]).averageRating, null)
})
check('real role map atlas traces every rating back to a published map', () => {
  const support = filterPlayerAppearances(actual, { role: 'SUPPORT' })
  const profiles = getPlayerMapProfiles(support)
  assert.equal(profiles.reduce((count, item) => count + item.maps, 0), 21)
  for (const profile of profiles) {
    assert.equal(filterPlayerAppearances(support, { map: profile.key }).length, new Set(profile.records.map(record => record.match.matchId)).size)
    assert.ok(profile.records.every(record => playerMapKey(record.map.name) === profile.key))
  }
})
check('partner event stage names localize without inferring unspecified rounds', () => {
  assert.equal(formatPlayerMatchStage('GROUP · GROUP A / DAY 1'), '小组赛 · A 组 / 第 1 比赛日')
  assert.equal(formatPlayerMatchStage('PLAYOFFS · SEMIFINALS'), '季后赛 · 半决赛')
  assert.equal(formatPlayerMatchStage('PLAYOFFS · QUARTERFINALS'), '季后赛 · 四分之一决赛')
  assert.equal(formatPlayerMatchStage('PLAYOFFS · Unspecified'), '季后赛 · Unspecified')
  assert.equal(formatPlayerMatchStage('GROUP · GROUP A / DAY 1', true), 'GROUP · GROUP A / DAY 1')
})
console.log(`${assertions} player dossier checks passed`)

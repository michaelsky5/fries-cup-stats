import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildHeroFieldGuide, filterGuideHeroes, filterHeroRecords, findGuideHero, heroGuideHref, heroMatchHref } from '../src/features/hero-data/heroDataModel.js'

const stats = (hero, player = 'P1', name = `${player}#123`) => ({ heroes_played: hero, player_id: player, player_name: name })
const map = (overrides = {}) => ({ map_name: 'Circuit Royal', map_type: 'Escort', map_order: 1, score_a: 3, score_b: 1, match_time: '10:00', team_a_stats: [stats('Kiriko'), stats('Lúcio', 'P2')], team_b_stats: [stats('Kiriko', 'P3')], ...overrides })
const match = (maps, overrides = {}) => ({ match_id: 'M1', status: 'COMPLETE', scheduled_at: '2026-08-01T10:00:00Z', team_a: { id: 'A', short: 'AA' }, team_b: { id: 'B', short: 'BB' }, maps, ...overrides })

test('mirror appearances keep two team-side samples but one traceable map', () => {
  const db = { matches: [match([map()])], players: [{ player_id: 'P1', display_name: 'One' }] }
  const before = JSON.stringify(db)
  const guide = buildHeroFieldGuide(db)
  const kiriko = findGuideHero(guide, '雾子')
  assert.equal(guide.samples, 2)
  assert.equal(guide.mapRecords, 1)
  assert.equal(kiriko.count, 2)
  assert.equal(kiriko.rate, 1)
  assert.equal(kiriko.records.length, 1)
  assert.equal(kiriko.records[0].appearances.length, 2)
  assert.equal(kiriko.players.length, 2)
  assert.equal(kiriko.players.find(player => player.id === 'P1').name, 'One')
  assert.equal(kiriko.partners[0].count, 1)
  assert.equal(kiriko.partners[0].rate, .5)
  assert.equal(JSON.stringify(db), before, 'published source must remain unchanged')
})

test('aliases and duplicate rows count once per side and per player', () => {
  const guide = buildHeroFieldGuide({ matches: [match([map({ team_a_stats: [stats('Lúcio'), stats('Lucio'), stats('卢西奥')], team_b_stats: [] })])] })
  assert.equal(guide.samples, 1)
  assert.equal(guide.heroes.length, 1)
  assert.equal(guide.heroes[0].count, 1)
  assert.equal(guide.heroes[0].players[0].count, 1)
  assert.equal(guide.heroes[0].partners.length, 0)
})

test('unpublished maps, rulings, placeholders and missing hero coverage do not inflate appearances', () => {
  const guide = buildHeroFieldGuide({ matches: [match([
    map(), map({ map_order: 2, is_administrative: true }),
    map({ map_order: 3, team_a_stats: [stats('UNKNOWN'), stats('-')], team_b_stats: [] }),
    map({ map_order: 4, map_name: '', map_type: 'UNKNOWN' })
  ]), match([map()], { match_id: 'LATER', status: 'PENDING' })] })
  assert.equal(guide.samples, 2)
  assert.equal(guide.mapRecords, 1)
  assert.equal(guide.totalMapRecords, 3)
  assert.equal(guide.heroes.length, 2)
  assert.equal(findGuideHero(guide, 'Kiriko').count, 2)
  assert.deepEqual(buildHeroFieldGuide(null), { heroes: [], samples: 0, mapRecords: 0, totalMapRecords: 0 })
})

test('same-name players stay separate by ID or by full recorded identity and team', () => {
  const guide = buildHeroFieldGuide({ matches: [match([map({
    team_a_stats: [stats('Kiriko', 'P1', 'Same#1'), stats('Kiriko', '', 'Same#2')],
    team_b_stats: [stats('Kiriko', 'P3', 'Same#1'), stats('Kiriko', '', 'Same#2')]
  })])] })
  assert.equal(guide.heroes[0].players.length, 4)
  assert.equal(new Set(guide.heroes[0].players.map(player => player.key)).size, 4)
  assert.ok(guide.heroes[0].players.every(player => player.id === ''), 'do not link a player profile absent from the season')
})

test('map and player evidence filters preserve repeated maps and exact map orders', () => {
  const guide = buildHeroFieldGuide({ matches: [match([
    map(), map({ map_order: 3 }), map({ map_order: 4, map_name: 'Ilios', map_type: 'Control', team_a_stats: [stats('Ana')], team_b_stats: [] })
  ])] })
  const hero = findGuideHero(guide, 'Kiriko')
  assert.equal(hero.count, 4)
  assert.equal(hero.maps[0].count, 4)
  assert.equal(hero.maps[0].samples, 4)
  assert.equal(hero.rate, .8)
  assert.equal(hero.maps[0].rate, 1)
  const records = filterHeroRecords(hero, { player: 'id:P1', map: 'Circuit Royal', search: '皇家' })
  assert.deepEqual(records.map(record => record.order), [3, 1])
  assert.equal(heroMatchHref(records[0]), '/matches/M1?map=3')
  assert.equal(filterHeroRecords(hero, { map: 'Ilios' }).length, 0)
  assert.equal(filterHeroRecords(hero, { player: 'missing' }).length, 0)
})

test('bilingual search and role sorting keep a consistent denominator', () => {
  const guide = buildHeroFieldGuide({ matches: [match([map({ team_a_stats: [stats('D.Va'), stats('Kiriko')], team_b_stats: [stats('Lúcio')] })])] })
  assert.equal(filterGuideHeroes(guide.heroes, { search: 'dva' })[0].name, 'D.Va')
  assert.equal(filterGuideHeroes(guide.heroes, { search: '雾子' })[0].name, 'Kiriko')
  const filtered = filterGuideHeroes(guide.heroes, { role: 'support', sort: 'name' })
  assert.equal(filtered.length, 2)
  assert.ok(filtered.every(hero => hero.rate === .5))
  assert.deepEqual(filtered.map(hero => hero.name), ['Kiriko', 'Lúcio'])
  assert.ok(guide.heroes.every(hero => hero.rank === 1), 'tied counts share a rank')
})

test('hero navigation retains index state and season while clearing dossier filters', () => {
  const params = new URLSearchParams('season=FCR2026&design=kpr5&lang=zh&heroRole=support&heroSearch=雾子&heroSort=players&hero=kiriko&heroMap=Ilios&heroPlayer=id:P1&heroRecordSearch=AA&heroPlayers=all&heroMaps=all&heroRecordLimit=24')
  const detail = new URL(heroGuideHref(params, 'lucio'), 'https://example.test')
  assert.equal(detail.searchParams.get('hero'), 'lucio')
  assert.equal(detail.searchParams.get('heroRole'), 'support')
  assert.equal(detail.searchParams.get('heroSearch'), '雾子')
  assert.equal(detail.searchParams.get('heroPlayer'), null)
  for (const key of ['heroPlayers', 'heroMaps', 'heroRecordLimit']) assert.equal(detail.searchParams.get(key), null)
  const back = new URL(heroGuideHref(params, '', '#hero-directory'), 'https://example.test')
  assert.equal(back.searchParams.get('hero'), null)
  for (const key of ['heroPlayers', 'heroMaps', 'heroRecordLimit']) assert.equal(back.searchParams.get(key), null)
  assert.equal(back.searchParams.get('season'), 'FCR2026')
  assert.equal(back.hash, '#hero-directory')
})

test('published FCR26 data reconciles appearances, player filters and map evidence', () => {
  const db = JSON.parse(fs.readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
  const guide = buildHeroFieldGuide(db)
  assert.equal(guide.samples, 570)
  assert.equal(guide.mapRecords, 285)
  assert.equal(guide.heroes.length, 50)
  const kiriko = findGuideHero(guide, 'Kiriko')
  assert.equal(kiriko.count, 489)
  assert.equal(kiriko.records.length, 270)
  assert.equal(kiriko.players.length, 80)
  guide.heroes.forEach(hero => {
    assert.ok(hero.rate > 0 && hero.rate <= 1)
    assert.equal(hero.maps.reduce((sum, map) => sum + map.count, 0), hero.count)
    assert.equal(hero.records.reduce((sum, record) => sum + record.appearances.length, 0), hero.count)
    hero.players.forEach(player => assert.equal(filterHeroRecords(hero, { player: player.key }).length, player.count))
    assert.ok(hero.maps.every(map => map.count <= map.samples))
    assert.ok(hero.partners.every(partner => partner.count <= hero.count && partner.key !== hero.key))
  })
})

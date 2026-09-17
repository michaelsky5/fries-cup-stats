import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getPlayerSignatureMatch, getPlayerPersonalReadout, resolvePlayerStorySelection } from '../src/features/player-dossier/playerPersonalStory.js'
import { getPlayerStoryCardModel } from '../src/features/player-share/playerStoryCardModel.js'
import { getPlayerDossier } from '../src/lib/playerDetailSelectors.js'
import { getPlayerAppearances } from '../src/features/player-dossier/playerDossierPresentation.js'
import { SEASONS } from '../src/config/seasons.js'

let checks = 0
const check = (name, run) => { run(); checks++; console.log(`PASS ${name}`) }
const match = (id, rating, overrides = {}) => ({ matchId: id, key: `${id}:A:p1:SUPPORT`, role: 'SUPPORT', rating, date: '2026-07-01', dateLabel: '07/01', stage: 'SWISS', result: 'win', scoreFor: 3, scoreAgainst: 0, opponent: { short: id }, maps: [{ order: 1, name: 'Ilios', heroes: ['Ana'], rating: 7.1, result: 'win' }], ...overrides })
const identity = { displayName: 'Player', battleTag: 'Player#1', teamShort: 'TEAM', teamFull: 'Team', teamRouteId: 't1' }
const roleData = { role: 'SUPPORT', entry: { eligible: true, seasonRatingStatus: 'FORMAL', seasonOvr: 81 }, summary: { eligible: true, sampleSize: 20 }, coreStats: [{ id: 'heal', label: '治疗', value: 12000, valueLabel: '12,000', average: 10000, averageLabel: '10,000', percentile: 78, direction: 'positive' }] }
const dossier = { identity, roleEntries: [roleData] }
const card = (appearances, selection = {}, extra = {}) => getPlayerStoryCardModel({ dossier, appearances, role: 'SUPPORT', selection, seasonCode: 'TEST', locale: 'zh-CN', ...extra })

check('representative selection separates roles, pending scores and match/map scales', () => {
  const best = match('best', 7.8)
  const records = [match('map-peak', 6.8, { maps: [{ ...best.maps[0], rating: 9.8 }] }), best, match('live', 9, { result: 'pending' }), match('other-role', 9.5, { role: 'DPS' })]
  assert.equal(getPlayerSignatureMatch(records, 'SUPPORT').match.key, best.key)
  assert.equal(getPlayerSignatureMatch(records, 'SUPPORT').ratedCount, 2)
  assert.equal(getPlayerSignatureMatch(records, 'DPS').reason, 'onlyRated')
})
check('published ties are explicit and do not compare hidden decimal precision', () => {
  const records = [match('later', 7.83, { date: '2026-08-01' }), match('earlier', 7.81), match('lower', 7.6)]
  const signature = getPlayerSignatureMatch(records, 'SUPPORT')
  assert.equal(signature.match.matchId, 'earlier')
  assert.equal(signature.tiedCount, 2)
  assert.deepEqual(records.map(item => item.matchId), ['later', 'earlier', 'lower'])
})
check('missing ratings never become zero and a single rated match is not a season peak claim', () => {
  assert.equal(getPlayerSignatureMatch([match('missing', null), match('rated', 0)], 'SUPPORT').reason, 'onlyRated')
  assert.equal(getPlayerSignatureMatch([match('missing', null)], 'SUPPORT').ratedCount, 0)
  assert.equal(getPlayerSignatureMatch([], 'SUPPORT'), null)
})
check('unknown win dates cannot claim the first victory', () => {
  const records = [match('known', null), match('unknown', null, { date: '' })]
  assert.equal(getPlayerSignatureMatch(records, 'SUPPORT').reason, 'win')
  assert.equal(getPlayerSignatureMatch([records[0]], 'SUPPORT').reason, 'firstWin')
  assert.equal(getPlayerSignatureMatch([match('loss', null, { result: 'loss', date: '' })], 'SUPPORT').reason, 'record')
})
check('personal readout uses a literal eligible per-10 advantage and preserves raw values', () => {
  const result = getPlayerPersonalReadout(roleData, [match('one', 7)])
  assert.equal(result.metric.id, 'heal')
  assert.equal(result.metric.value, 12000)
  const deaths = { ...roleData, coreStats: [{ id: 'dth', value: 4, average: 6, percentile: 75, direction: 'negative' }] }
  assert.equal(getPlayerPersonalReadout(deaths, [match('one', 7)]).metric.id, 'dth')
  assert.equal(getPlayerPersonalReadout(deaths, []).metric, null)
  assert.equal(getPlayerPersonalReadout({ ...deaths, coreStats: [{ ...deaths.coreStats[0], value: 8 }] }, []).metric, null)
})
check('small samples and lone comparison records get no invented strength label', () => {
  for (const summary of [{ eligible: false, sampleSize: 20 }, { eligible: true, sampleSize: 1 }]) assert.equal(getPlayerPersonalReadout({ ...roleData, summary }, [match('one', 7)]).metric, null)
  assert.equal(getPlayerPersonalReadout({ ...roleData, coreStats: [{ ...roleData.coreStats[0], value: null }] }, []).metric, null)
})
check('a chosen loss remains a loss and retains the actual role rating on its share card', () => {
  const records = [match('high', 8), match('chosen-loss', 6.7, { result: 'loss', scoreFor: 1, scoreAgainst: 3 })]
  const model = card(records, { kind: 'match', matchKey: records[1].key })
  assert.equal(model.title, 'VS chosen-loss')
  assert.equal(model.seriesScore, '1 : 3')
  assert.equal(model.facts[0].value, '6.7')
  assert.equal(model.facts[2].value, '负')
  assert.equal(model.rating, null)
})
check('role switches reject stale match and hero selections', () => {
  const support = match('support', 7)
  const tank = match('tank', 6.5, { role: 'TANK', key: 'tank:A:p1:TANK', maps: [{ ...support.maps[0], heroes: ['Winston'] }] })
  const selected = resolvePlayerStorySelection([support, tank], 'TANK', { kind: 'hero', matchKey: support.key, heroKey: 'ana' })
  assert.equal(selected.match.matchId, 'tank')
  assert.equal(selected.hero.key, 'winston')
  assert.equal(selected.matches.length, 1)
  assert.equal(resolvePlayerStorySelection([support], 'DPS', { kind: 'match' }).kind, 'season')
})
check('hero cards deduplicate hero switches without assigning a hero-specific rating', () => {
  const one = match('one', 7, { maps: [{ order: 1, heroes: ['D.Va', 'DVa', 'Ana'], result: 'draw' }, { order: 2, heroes: ['Ana'], result: 'unknown' }] })
  const model = card([one], { kind: 'hero', heroKey: 'ana' })
  assert.equal(model.facts[0].value, '2')
  assert.equal(model.facts[0].suffix, '/ 2')
  assert.equal(model.facts[1].value, '1')
  assert.match(model.facts[2].label, /1 平 · 1 未定/)
  assert.equal(model.rating, null)
})
check('registered-only players receive an identity card instead of invented ratings or artwork', () => {
  const model = card([], { kind: 'hero' })
  assert.equal(model.kind, 'season')
  assert.equal(model.title, '我在这一届。')
  assert.equal(model.rawHero, '')
  assert.equal(model.rating, null)
  assert.equal(model.heroCaption, '所属战队')
  assert.deepEqual(model.facts.map(item => item.value), ['支援', 'TEAM', 'TEST'])
})
check('season artwork preserves a selected recorded hero without changing season totals', () => {
  const records = [match('one', 7, { maps: [{ order: 1, heroes: ['Ana'], result: 'win' }, { order: 2, heroes: ['Ana', 'Lucio'], result: 'loss' }] })]
  const model = card(records, { kind: 'season', heroKey: 'lucio' })
  assert.equal(model.selectedHeroKey, 'lucio')
  assert.equal(model.rawHero, 'Lucio')
  assert.equal(model.heroCaption, '选自本季实际出场英雄')
  assert.deepEqual(model.facts.map(item => item.value), ['1', '2', '2'])
  assert.equal(model.rating.value, '81')
})
check('invalid season artwork falls back to a recorded hero and keeps tied counts explicit', () => {
  const records = [match('one', 7, { maps: [{ order: 1, heroes: ['Ana', 'Lucio'], result: 'win' }] })]
  const model = card(records, { kind: 'season', heroKey: 'unrecorded-hero' })
  assert.notEqual(model.selectedHeroKey, 'unrecorded-hero')
  assert.match(model.heroCaption, /并列最多出场/)
})
check('changing share artwork never replaces the heroes actually recorded in a chosen match', () => {
  const records = [match('ana-game', 7), match('lucio-game', 6, { maps: [{ order: 1, heroes: ['Lucio'], result: 'loss' }] })]
  const model = card(records, { kind: 'match', matchKey: records[0].key, heroKey: 'lucio' })
  assert.equal(model.rawHero, 'Ana')
  assert.equal(model.rating, null)
})
check('English match cards preserve missing scores and recorded round labels', () => {
  const model = card([match('missing', null, { date: '', scoreFor: null, scoreAgainst: null, stage: 'PLAYOFFS · SEMIFINALS' })], { kind: 'match' }, { locale: 'en-US' })
  assert.equal(model.seriesScore, '—')
  assert.equal(model.facts[0].value, '—')
  assert.equal(model.detail, '— · PLAYOFFS · SEMIFINALS')
})

const db = JSON.parse(fs.readFileSync(new URL('../public/data/fcr2026_local_public.json', import.meta.url), 'utf8'))
const season = SEASONS.find(item => item.id === 'FCR26')
check('real multi-role player retains 21 support maps and 3 tank maps on separate cards', () => {
  const actualDossier = getPlayerDossier(db, 'FCR26-P0249', 'SUPPORT', season)
  const appearances = getPlayerAppearances(db, actualDossier.basePlayer)
  const model = role => getPlayerStoryCardModel({ dossier: actualDossier, appearances, role, selection: { kind: 'season' }, seasonCode: 'FCR2026', locale: 'zh-CN' })
  assert.deepEqual(model('SUPPORT').facts.slice(0, 2).map(item => item.value), ['7', '21'])
  assert.deepEqual(model('TANK').facts.slice(0, 2).map(item => item.value), ['1', '3'])
  assert.equal(model('TANK').rating.value, '—')
  const signature = getPlayerSignatureMatch(appearances, 'TANK')
  assert.equal(signature.reason, 'onlyRated')
  assert.equal(signature.match.rating, 7.4)
})
check('real unplayed roster identity remains available for a season share', () => {
  const actualDossier = getPlayerDossier(db, 'FCR26-P0004', 'SUPPORT', season)
  const appearances = getPlayerAppearances(db, actualDossier.basePlayer)
  assert.equal(appearances.length, 0)
  const model = getPlayerStoryCardModel({ dossier: actualDossier, appearances, role: 'SUPPORT', selection: { kind: 'match' }, seasonCode: 'FCR2026', locale: 'en-US' })
  assert.equal(model.identity.displayName, 'dontsmile')
  assert.equal(model.title, 'Part of this season.')
})
console.log(`${checks} player personal story checks passed`)

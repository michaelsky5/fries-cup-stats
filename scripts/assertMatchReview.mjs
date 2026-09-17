import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { getMatchDossier } from '../src/lib/matchDetailSelectors.js'
import { canCompareReviewPlayers, getMatchReviewMvp, getMatchReviewPlayers, getMatchReviewProgress, getMatchReviewTimeline, getReviewBanOrder, getReviewComparisonSelection, getReviewPlayerComparison, getReviewTeamMvpKeys, getReviewFormat, REVIEW_METRICS } from '../src/lib/matchReviewSelectors.js'
import { getBroadcastInfo } from '../src/lib/broadcastSelectors.js'

const row = (id, role = 'TANK', values = {}) => ({ playerId: id, displayName: id, rawName: id, role, originalIndex: 0, hero: 'Reinhardt', rawHero: 'Reinhardt', eliminations: 10, assists: 5, deaths: 2, damage: 1000, healing: 0, mitigation: 2000, ...values })
const entry = (id, role = 'TANK', values = {}) => ({ player_id: id, role, roleScore: 70, ...values })
const map = (order, winnerSide, a = [], b = []) => ({ order, winnerSide, hasResult: true, teamAStats: a, teamBStats: b, rating: { entries: [...a, ...b].map(player => entry(player.playerId, player.role)) } })
const dossier = (maps, values = {}) => ({ state: { canShowResults: true, isForfeit: false }, formatLabel: 'FT3', teamA: { id: 'A' }, teamB: { id: 'B' }, mapRecords: maps, rating: { entries: [] }, ...values })

test('comparison brings in a unique same-role opponent from either side, including one hidden by table filters', () => {
  const players = [
    { key: 'a-tank', side: 'A', role: 'TANK' }, { key: 'b-tank', side: 'B', role: 'TANK' },
    { key: 'b-dps', side: 'B', role: 'DPS' }
  ]
  assert.deepEqual(getReviewComparisonSelection(players, players[0]), { compareA: 'a-tank', compareB: 'b-tank' })
  assert.deepEqual(getReviewComparisonSelection(players, players[1]), { compareA: 'a-tank', compareB: 'b-tank' })
  assert.deepEqual(getReviewComparisonSelection(players, players[0], 'b-dps'), { compareA: 'a-tank', compareB: 'b-tank' })
})

test('comparison leaves multiple opponents or substitutes to the user and preserves a compatible choice', () => {
  const players = [
    { key: 'a-dps', side: 'A', role: 'DPS' }, { key: 'b-dps-1', side: 'B', role: 'DPS' },
    { key: 'b-dps-2', side: 'B', role: 'DPS' }, { key: 'a-support', side: 'A', role: 'SUPPORT' }
  ]
  assert.deepEqual(getReviewComparisonSelection(players, players[0]), { compareA: 'a-dps', compareB: '' })
  assert.deepEqual(getReviewComparisonSelection(players, players[0], 'b-dps-2'), { compareA: 'a-dps', compareB: 'b-dps-2' })
  assert.deepEqual(getReviewComparisonSelection(players, players[3], 'b-dps-2'), { compareA: 'a-support', compareB: '' })
  assert.deepEqual(getReviewComparisonSelection(players, undefined), { compareA: '', compareB: '' })
  const tanks = players.slice(0, 3).map(player => ({ ...player, role: 'TANK' }))
  assert.equal(getReviewComparisonSelection(tanks, tanks[0]).compareB, '')
})

test('ban order follows published records and never guesses from side or map winner', () => {
  assert.equal(getReviewBanOrder({ raw: { first_ban_side: 'B' } }, 'A'), 2)
  assert.equal(getReviewBanOrder({ raw: { first_ban_side: 'B' } }, 'B'), 1)
  assert.equal(getReviewBanOrder({ raw: { bans: { firstBanSide: 'a' } } }, 'A'), 1)
  assert.equal(getReviewBanOrder({ raw: { team_a_ban: 'Freja', winner: 'A', pickerSide: 'A' } }, 'A'), null)
  assert.equal(getReviewBanOrder({ raw: { first_ban_side: 'UNKNOWN' } }, 'B'), null)
  assert.equal(getReviewBanOrder({ raw: { first_ban_side: 'A', is_administrative: true } }, 'A'), null)
})

test('published broadcast crew retains all roles and deduplicates legacy lists', () => {
  const info = getBroadcastInfo({ status: 'COMPLETE', broadcast: {
    crew: [
      { role: 'CASTER', name: 'Caster', battle_tag: 'Caster#1234' },
      { role: 'VOICE_REFEREE', name: 'Ref', battle_tag: 'Ref#4567' },
      { role: 'DIRECTOR', name: 'Director', battle_tag: 'Director#6789' },
      { role: 'OB', name: 'Observer', battle_tag: 'Observer#7890' }
    ], casters: [{ name: 'Caster', battle_tag: 'Caster#1234' }]
  } })
  assert.deepEqual(info.staffGroups.map(group => group.role), ['CASTER', 'VOICE_REFEREE', 'DIRECTOR', 'OB'])
  assert.equal(info.casters.length, 1)
  assert.equal(info.staffGroups[2].people[0].battleTag, 'Director#6789')
  assert.equal(info.streamLinks[0].kind, 'archive')
  assert.deepEqual(getBroadcastInfo({}).staffGroups, [])
})

test('series progression records a comeback, tie and deciding map in map order', () => {
  const maps = ['B', 'B', 'A', 'A', 'B'].map((winner, i) => map(i + 1, winner))
  const progress = getMatchReviewProgress(dossier([...maps].reverse()))
  assert.deepEqual(progress.map(item => item.cumulative), ['0:1', '0:2', '1:2', '2:2', '2:3'])
  assert.deepEqual(progress.filter(item => item.tied).map(item => item.order), [4])
  assert.deepEqual(progress.filter(item => item.deciding).map(item => item.order), [5])
  assert.equal(getMatchReviewProgress(dossier(maps, { formatLabel: 'BO5' }))[4].deciding, true)
  assert.equal(getReviewFormat('FT4'), '先赢 4 图获胜')
})

test('unknown and pending results do not invent a running score; draws do not add a win', () => {
  assert.deepEqual(getMatchReviewProgress(dossier([map(1, 'A'), map(2, 'DRAW'), map(3, 'B')])).map(item => item.cumulative), ['1:0', '1:0', '1:1'])
  const maps = [map(1, 'A'), { ...map(2, ''), hasResult: false }, map(3, 'B')]
  assert.deepEqual(getMatchReviewProgress(dossier(maps)).map(item => item.cumulative), ['1:0', '—', '—'])
  assert.deepEqual(getMatchReviewProgress(dossier([map(2, 'A'), map(3, 'B')])).map(item => item.cumulative), ['—', '—'])
  const pending = dossier(maps, { state: { canShowResults: false } })
  assert.ok(getMatchReviewProgress(pending).every(item => item.cumulative === '—'))
  assert.deepEqual(getMatchReviewPlayers(pending), [])
  assert.deepEqual(getMatchReviewPlayers(dossier(maps, { state: { canShowResults: true, isForfeit: true } })), [])
})

test('aggregation preserves player-role and team identity while counting each map once', () => {
  const maps = [map(1, 'A', [row('p'), row('p', 'TANK', { hero: 'Winston', damage: 500 })], [row('p')]), map(2, 'B', [row('p', 'SUPPORT'), row('sub')]), map(3, 'A', [row('p')])]
  const rows = getMatchReviewPlayers(dossier(maps))
  assert.equal(rows.length, 4)
  const tank = rows.find(item => item.side === 'A' && item.playerId === 'p' && item.role === 'TANK')
  assert.deepEqual(tank.maps, [1, 3])
  assert.deepEqual(tank.heroes, ['Reinhardt', 'Winston'])
  assert.deepEqual(tank.heroUsage, [{ hero: 'Reinhardt', maps: [1, 3] }, { hero: 'Winston', maps: [1] }])
  assert.equal(tank.damage, 2500)
  assert.equal(tank.eliminations, 30)
  assert.equal(rows.find(item => item.role === 'SUPPORT').maps.length, 1)
  assert.equal(rows.find(item => item.side === 'B').eliminations, 10)
})

test('full-match and map ratings share a scale while preserving their scope and missing ratings', () => {
  const maps = [map(1, 'A', [row('p'), row('missing')]), map(2, 'B', [row('p')])]
  maps[0].rating.entries = [entry('p', 'TANK', { mapRating: 8.2 }), entry('missing', 'TANK', { roleScore: null, mapRating: null })]
  const model = dossier(maps, { rating: { entries: [entry('p', 'TANK', { roleScore: 54, matchAwardEligible: false })] } })
  const all = getMatchReviewPlayers(model)
  assert.equal(all.find(item => item.playerId === 'p').rating, 7.1)
  assert.equal(all.find(item => item.playerId === 'p').lowSample, true)
  assert.equal(getMatchReviewPlayers(model, 1).find(item => item.playerId === 'p').rating, 8.2)
  assert.equal(getMatchReviewPlayers(model, 1).find(item => item.playerId === 'missing').rating, null)
  assert.deepEqual(getMatchReviewPlayers(model, 99), [])
})

test('a same-name player never borrows another registered player rating', () => {
  const maps = [map(1, 'A', [row('one', 'TANK', { displayName: 'same' })])]
  const model = dossier(maps, { rating: { entries: [entry('two', 'TANK', { display_name: 'same', roleScore: 95 }), entry('one', 'TANK', { display_name: 'same', roleScore: 40 })] } })
  assert.equal(getMatchReviewPlayers(model)[0].rating, 6.8)
})

test('comparison requires opposing teams and the same known role', () => {
  const a = { side: 'A', role: 'TANK' }
  assert.equal(canCompareReviewPlayers(a, { side: 'B', role: 'TANK' }), true)
  assert.equal(canCompareReviewPlayers(a, { side: 'A', role: 'TANK' }), false)
  assert.equal(canCompareReviewPlayers(a, { side: 'B', role: 'SUPPORT' }), false)
  assert.equal(canCompareReviewPlayers({ side: 'A', role: 'UNKNOWN' }, { side: 'B', role: 'UNKNOWN' }), false)
  assert.equal(canCompareReviewPlayers(a, null), false)
})

test('comparison intersects actual role appearances and retains whole-match ratings', () => {
  const maps = [map(1, 'A', [row('a')]), map(2, 'B', [], [row('b')]), map(3, 'A', [row('a'), row('a', 'TANK', { hero: 'Winston', damage: 500 })], [row('b')])]
  maps.forEach(item => item.rating.entries.forEach(rating => { rating.roleTimeMins = item.order === 3 ? 20 : 10 }))
  const model = dossier(maps, { rating: { entries: [entry('a', 'TANK', { roleScore: 58 }), entry('b', 'TANK', { roleScore: 49 })] } })
  const players = getMatchReviewPlayers(model)
  const timeline = getMatchReviewTimeline(model)
  const common = getReviewPlayerComparison(players[0], players[1], timeline)
  assert.deepEqual(common.commonOrders, [3])
  assert.deepEqual(common.a.maps, [3])
  assert.equal(common.a.totals.damage, 1500)
  assert.equal(common.a.minutes, 20)
  assert.equal(common.a.per10.damage, 750)
  assert.equal(common.a.rating, 7.2)
  assert.deepEqual(common.a.heroes, ['Reinhardt', 'Winston'])
  const all = getReviewPlayerComparison(players[0], players[1], timeline, 'all')
  assert.deepEqual(all.a.maps, [1, 3])
  assert.deepEqual(all.b.maps, [2, 3])
  assert.equal(all.a.totals.damage, 2500)
  assert.equal(all.a.minutes, 30)
})

test('missing role time and unfinished maps disable rates without losing totals', () => {
  const maps = [map(1, 'A', [row('a')], [row('b')]), map(2, 'B', [row('a')], [row('b')])]
  maps[0].rating.entries.forEach(rating => { rating.roleTimeMins = 10 })
  const model = dossier(maps)
  const [a, b] = getMatchReviewPlayers(model)
  const result = getReviewPlayerComparison(a, b, getMatchReviewTimeline(model), 'all')
  assert.equal(result.canUsePer10, false)
  assert.equal(result.a.per10, null)
  assert.equal(result.a.totals.damage, 2000)
  maps[1].rating.entries.forEach(rating => { rating.roleTimeMins = 10 })
  maps[1].hasResult = false
  assert.equal(getReviewPlayerComparison(a, b, getMatchReviewTimeline(model)).canUsePer10, false)
})

test('no shared maps is an empty sample, not zero performance or an invented matchup', () => {
  const model = dossier([map(1, 'A', [row('a')]), map(2, 'B', [], [row('b')])])
  const [a, b] = getMatchReviewPlayers(model)
  const timeline = getMatchReviewTimeline(model)
  const result = getReviewPlayerComparison(a, b, timeline)
  assert.deepEqual(result.commonOrders, [])
  assert.equal(result.a.totals.damage, null)
  assert.equal(result.canUsePer10, false)
  assert.equal(getReviewPlayerComparison(a, { ...b, role: 'SUPPORT' }, timeline), null)
  assert.equal(getReviewPlayerComparison(a, b, timeline, 'all').b.totals.damage, 1000)
})

test('team MVP preserves displayed ties and excludes unavailable ratings', () => {
  const candidates = [
    { key: 'a', rating: 7.6 }, { key: 'b', rating: 7.6 }, { key: 'c', rating: 7.5 },
    { key: 'missing', rating: null }, { key: 'empty', rating: '' }, { key: 'zero', rating: 0 }, { key: 'invalid', rating: NaN }
  ]
  assert.deepEqual([...getReviewTeamMvpKeys(candidates)], ['a', 'b'])
  assert.deepEqual([...getReviewTeamMvpKeys(candidates.slice(3))], [])
})

test('map timeline keeps substitutes, role changes and both team MVP scopes separate', () => {
  const maps = [map(1, 'A', [row('p')], [row('opponent')]), map(2, 'B', [row('p', 'SUPPORT'), row('sub')], [row('opponent')])]
  maps[0].rating.entries = [entry('p', 'TANK', { mapRating: 8.2 }), entry('opponent', 'TANK', { mapRating: 7.1 })]
  maps[1].rating.entries = [entry('p', 'SUPPORT', { mapRating: 7.9 }), entry('sub', 'TANK', { mapRating: 6.5 }), entry('opponent', 'TANK', { mapRating: 7.6 })]
  const timeline = getMatchReviewTimeline(dossier(maps))
  assert.equal(timeline[0].playersByKey.has('A:sub:TANK'), false)
  assert.equal(timeline[1].playersByKey.has('A:p:TANK'), false)
  assert.equal(timeline[1].playersByKey.get('A:p:SUPPORT').rating, 7.9)
  assert.deepEqual([...timeline[0].teamMvpKeys.A], ['A:p:TANK'])
  assert.deepEqual([...timeline[0].teamMvpKeys.B], ['B:opponent:TANK'])
  assert.deepEqual([...timeline[1].teamMvpKeys.A], ['A:p:SUPPORT'])
  const pending = getMatchReviewTimeline(dossier([{ ...maps[0], hasResult: false }]))
  assert.equal(pending[0].teamMvpKeys.A.size, 0)
})

test('series MVP retains the original eligible selection, not rounded ties or the winning team', () => {
  const first = entry('a', 'TANK', { roleScore: 58.252, matchAwardEligible: true })
  const second = entry('b', 'TANK', { roleScore: 58.249, matchAwardEligible: true })
  const model = dossier([map(1, 'B', [row('a')], [row('b')])], {
    state: { canShowResults: true, isComplete: true }, winnerSide: 'B',
    topRatedPlayer: first, rating: { supported: true, entries: [first, second] }
  })
  assert.equal(getMatchReviewMvp(model).playerId, 'a')
  assert.equal(getMatchReviewMvp(model).side, 'A')
  assert.equal(getMatchReviewMvp(model).rating, 7.2)
  assert.equal(getMatchReviewMvp({ ...model, state: { canShowResults: true, isLive: true } }), null)
  assert.equal(getMatchReviewMvp({ ...model, state: { ...model.state, isForfeit: true } }), null)
  assert.equal(getMatchReviewMvp({ ...model, topRatedPlayer: null }), null)
  assert.equal(getMatchReviewMvp({ ...model, topRatedPlayer: { ...first, matchAwardEligible: false } }), null)
  assert.equal(getMatchReviewMvp({ ...model, rating: { supported: false, entries: [] } }), null)
})

test('the published final retains all eleven participants, substitutes and every team metric', () => {
  const fixture = JSON.parse(fs.readFileSync('public/data/fcr2026_local_public.json', 'utf8'))
  const final = getMatchDossier(fixture, 'FCR26-PLAYOFFS-R1-M14')
  const players = getMatchReviewPlayers(final)
  assert.equal(new Set(players.map(player => player.identityKey)).size, 11)
  assert.equal(players.filter(player => player.side === 'A').length, 6)
  assert.equal(players.find(player => player.playerId === 'FCR26-P0084').maps.length, 2)
  assert.ok(players.every(player => player.rating != null))
  assert.equal(getMatchReviewMvp(final, players).playerId, final.topRatedPlayer.player_id)
  for (const side of ['A', 'B']) for (const metric of REVIEW_METRICS) {
    const expected = final.mapRecords.flatMap(item => item[`team${side}Stats`]).reduce((total, item) => total + item[metric.key], 0)
    assert.equal(players.filter(item => item.side === side).reduce((total, item) => total + item[metric.key], 0), expected)
  }
  const semi = getMatchDossier(fixture, 'FCR26-PLAYOFFS-R1-M13')
  assert.deepEqual(getMatchReviewProgress(semi).map(item => item.cumulative), ['0:1', '0:2', '1:2', '2:2', '2:3'])
})

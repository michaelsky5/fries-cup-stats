import { buildMapAtlas } from '../map-atlas/mapAtlasModel.js'
import { getOwHero, getOwHeroCanonicalKey, getOwNameSearchText, normalizeOwLookupKey } from '../../lib/heroes.js'

export const HERO_DATA_ROLES = ['tank', 'damage', 'support']
const array = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const byCount = (a, b) => b.count - a.count || a.key.localeCompare(b.key)

// Use the same completed, named-map evidence as the map atlas. A sample is
// one team-side with recognized hero records, not an interval of play time.
export function buildHeroFieldGuide(db) {
  const atlas = buildMapAtlas(db)
  const profiles = new Map(array(db?.players).map(player => [text(player.player_id), player]))
  const heroes = new Map()
  const mapSamples = new Map()
  const coveredRecords = new Set()
  let samples = 0

  atlas.maps.flatMap(map => map.records).forEach(record => {
    if (record.administrative) return
    record.groups.forEach(({ side, team, stats }) => {
      const sideHeroes = new Map()
      stats.forEach(stat => {
        const definition = getOwHero(stat.heroes_played)
        if (!definition) return
        const key = getOwHeroCanonicalKey(definition.en)
        if (!sideHeroes.has(key)) sideHeroes.set(key, { key, name: definition.en, role: definition.role, players: new Map() })
        const id = text(stat.player_id || stat.playerId)
        const rawName = text(stat.player_name)
        if (!id && !rawName) return
        const profile = profiles.get(id)
        const playerKey = id ? `id:${id}` : `name:${rawName.toLowerCase()}:${team.id || team.name}`
        sideHeroes.get(key).players.set(playerKey, {
          key: playerKey, id: profile ? id : '',
          name: text(profile?.display_name || profile?.nickname || rawName || id).split(/[#＃]/)[0],
          team: team.short || team.name
        })
      })
      if (!sideHeroes.size) return
      samples += 1
      coveredRecords.add(record.id)
      mapSamples.set(record.name, (mapSamples.get(record.name) || 0) + 1)
      sideHeroes.forEach(hero => {
        if (!heroes.has(hero.key)) heroes.set(hero.key, {
          key: hero.key, name: hero.name, role: hero.role, count: 0,
          players: new Map(), maps: new Map(), partners: new Map(), records: new Map(),
          wins: 0, losses: 0, draws: 0, unknown: 0
        })
        const report = heroes.get(hero.key)
        report.count += 1
        if (record.winner === side) report.wins += 1
        else if (record.winner === 'DRAW') report.draws += 1
        else if (record.winner) report.losses += 1
        else report.unknown += 1
        if (!report.records.has(record.id)) report.records.set(record.id, { ...record, appearances: [], playerKeys: new Set() })
        const entry = report.records.get(record.id)
        entry.appearances.push({ side, team, players: [...hero.players.values()] })
        hero.players.forEach(player => {
          entry.playerKeys.add(player.key)
          if (!report.players.has(player.key)) report.players.set(player.key, { ...player, count: 0, teams: new Set() })
          const row = report.players.get(player.key)
          row.count += 1
          if (player.team) row.teams.add(player.team)
        })
        if (!report.maps.has(record.name)) report.maps.set(record.name, {
          key: record.name, name: record.name, routeName: record.sourceName, type: record.type, count: 0
        })
        report.maps.get(record.name).count += 1
        sideHeroes.forEach(partner => {
          if (partner.key === hero.key) return
          if (!report.partners.has(partner.key)) report.partners.set(partner.key, { key: partner.key, name: partner.name, role: partner.role, count: 0 })
          report.partners.get(partner.key).count += 1
        })
      })
    })
  })

  const entries = [...heroes.values()].map(hero => ({
    ...hero, rate: samples ? hero.count / samples : 0,
    players: [...hero.players.values()].map(player => ({ ...player, teams: [...player.teams] })).sort(byCount),
    maps: [...hero.maps.values()].map(map => ({ ...map, samples: mapSamples.get(map.name), rate: map.count / mapSamples.get(map.name) })).sort(byCount),
    partners: [...hero.partners.values()].map(partner => ({ ...partner, rate: partner.count / hero.count })).sort(byCount),
    records: [...hero.records.values()].sort((a, b) => b.timestamp - a.timestamp || b.sequence - a.sequence),
    searchText: getOwNameSearchText(hero.name)
  })).sort(byCount)
  entries.forEach(hero => {
    hero.rank = entries.filter(item => item.count > hero.count).length + 1
    hero.roleRank = entries.filter(item => item.role === hero.role && item.count > hero.count).length + 1
  })
  return { heroes: entries, samples, mapRecords: coveredRecords.size, totalMapRecords: atlas.totalRecords }
}

export function findGuideHero(guide, name) {
  const key = getOwHeroCanonicalKey(name)
  return guide.heroes.find(hero => hero.key === key) || null
}

export function filterGuideHeroes(heroes, { role = '', search = '', sort = 'records' } = {}) {
  const query = normalizeOwLookupKey(search)
  return heroes.filter(hero => (!role || hero.role === role) && (!query || hero.searchText.includes(query)))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name)
      : sort === 'players' ? b.players.length - a.players.length || byCount(a, b) : byCount(a, b))
}

export function filterHeroRecords(hero, { map = '', player = '', search = '' } = {}) {
  const query = normalizeOwLookupKey(search)
  return hero.records.filter(record => (!map || record.name === map)
    && (!player || record.playerKeys.has(player))
    && (!query || [getOwNameSearchText(record.name, 'map'), record.a.name, record.a.short, record.b.name, record.b.short,
      ...record.appearances.flatMap(side => side.players.map(item => item.name))]
      .some(value => normalizeOwLookupKey(value).includes(query))))
}

export function heroGuideHref(params, hero = '', hash = '') {
  const next = new URLSearchParams(params)
  ;['hero', 'heroMap', 'heroPlayer', 'heroRecordSearch', 'heroRecordLimit', 'heroPlayers', 'heroMaps'].forEach(key => next.delete(key))
  if (hero) next.set('hero', hero)
  const query = next.toString()
  return `/heroes${query ? `?${query}` : ''}${hash}`
}

export const heroMatchHref = record => `/matches/${encodeURIComponent(record.matchId)}?map=${record.order}`

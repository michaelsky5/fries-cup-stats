import { getOwHeroCanonicalKey } from '../../lib/heroes.js'
import { getRecordedPlayerHeroes } from './playerDossierPresentation.js'

const clean = value => String(value || '').trim()
const identity = value => clean(value).toLowerCase()
const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : null
const compareDates = (a, b) => (time(a.date) ?? Infinity) - (time(b.date) ?? Infinity) || a.matchId.localeCompare(b.matchId)
const roleOrder = ['TANK', 'DPS', 'SUPPORT']

// A personal chapter counts a match/map once, while preserving each role's
// published rating. There is no new cross-role rating or inferred appearance.
export function getPlayerArchive(appearances) {
  const groups = new Map()
  for (const appearance of appearances) {
    if (!groups.has(appearance.matchId)) groups.set(appearance.matchId, { ...appearance, roles: new Set(), mapRecords: new Map() })
    const match = groups.get(appearance.matchId)
    match.roles.add(appearance.role)
    for (const record of appearance.maps) {
      if (!match.mapRecords.has(record.order)) match.mapRecords.set(record.order, { ...record, roleRecords: new Map(), heroNames: new Map() })
      const map = match.mapRecords.get(record.order)
      map.roleRecords.set(appearance.role, { role: appearance.role, rating: record.rating, minutes: record.minutes, heroes: record.heroes })
      record.heroes.forEach(hero => map.heroNames.set(getOwHeroCanonicalKey(hero) || identity(hero), hero))
    }
  }
  const matches = [...groups.values()].map(({ mapRecords, ...match }) => ({
    ...match,
    roles: [...match.roles].sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b)),
    maps: [...mapRecords.values()].sort((a, b) => a.order - b.order).map(({ roleRecords, heroNames, ...record }) => ({
      ...record, heroes: [...heroNames.values()], roleRecords: [...roleRecords.values()]
    }))
  })).sort(compareDates)
  const phaseGroups = new Map()
  for (const match of matches) {
    const key = clean(match.stage).split(' · ')[0]
    if (!phaseGroups.has(key)) phaseGroups.set(key, { key, matches: [] })
    phaseGroups.get(key).matches.push(match)
  }
  const phases = [...phaseGroups.values()].map(phase => {
    const ids = new Set(phase.matches.map(match => match.matchId))
    return { ...phase, mapCount: phase.matches.reduce((sum, match) => sum + match.maps.length, 0), heroes: getRecordedPlayerHeroes(appearances.filter(match => ids.has(match.matchId))) }
  })
  const dated = matches.filter(match => time(match.date) !== null)
  const markers = new Map()
  const mark = (match, reason) => {
    if (!match) return
    if (!markers.has(match.matchId)) markers.set(match.matchId, { match, reasons: [] })
    markers.get(match.matchId).reasons.push(reason)
  }
  mark(dated[0], 'first')
  phases.slice(1).forEach(phase => mark(phase.matches.find(match => time(match.date) !== null), 'phase'))
  if (dated.length > 1) mark(dated.at(-1), 'latest')
  const highlights = new Map()
  const feature = (match, reason) => {
    if (!match) return
    if (!highlights.has(match.matchId)) highlights.set(match.matchId, { match, reasons: [] })
    highlights.get(match.matchId).reasons.push(reason)
  }
  feature(dated[0], 'first')
  if (matches.length > 1) feature([...matches].sort((a, b) => b.maps.length - a.maps.length || compareDates(a, b))[0], 'maps')
  feature(dated.length > 1 ? dated.at(-1) : !dated.length ? matches[0] : null, dated.length ? 'latest' : 'record')
  return {
    matches, phases, markers: [...markers.values()].sort((a, b) => compareDates(a.match, b.match)), highlights: [...highlights.values()],
    first: dated[0] || null, latest: dated.at(-1) || null,
    mapCount: matches.reduce((sum, match) => sum + match.maps.length, 0),
    roles: roleOrder.filter(role => matches.some(match => match.roles.includes(role))),
    wins: matches.filter(match => match.result === 'win').length,
    losses: matches.filter(match => match.result === 'loss').length,
    draws: matches.filter(match => match.result === 'draw').length
  }
}

// Only co-presence in the same published map on the same side establishes a
// teammate record. A roster slot or a matching nickname does not.
export function getPlayerCompanions(appearances, players = []) {
  const byId = new Map(players.map(player => [identity(player.player_id), player]))
  const groups = new Map()
  for (const match of appearances) for (const map of match.maps) for (const peer of map.companions || []) {
    const id = identity(peer.playerId)
    const tag = identity(peer.battleTag)
    const known = id ? byId.get(id) : tag.includes('#') ? players.filter(player => [player.player_name, player.battleTag, player.battle_tag].some(value => identity(value) === tag)) : []
    const player = Array.isArray(known) ? known.length === 1 ? known[0] : null : known
    const key = player?.player_id || id || (tag.includes('#') ? tag : '')
    if (!key) continue
    if (!groups.has(key)) groups.set(key, { key, playerId: player?.player_id || '', name: player?.nickname || peer.displayName || clean(peer.battleTag).split('#')[0], mapKeys: new Set(), matches: new Set(), roles: new Map(), heroes: new Map() })
    const entry = groups.get(key)
    const mapKey = `${match.matchId}:${map.order}`
    entry.mapKeys.add(mapKey)
    entry.matches.add(match.matchId)
    if (!entry.roles.has(peer.role)) entry.roles.set(peer.role, new Set())
    entry.roles.get(peer.role).add(mapKey)
    for (const hero of peer.heroes || []) {
      const heroKey = getOwHeroCanonicalKey(hero) || identity(hero)
      if (!heroKey || ['—', '-'].includes(heroKey)) continue
      if (!entry.heroes.has(heroKey)) entry.heroes.set(heroKey, { hero, maps: new Set() })
      entry.heroes.get(heroKey).maps.add(mapKey)
    }
  }
  return [...groups.values()].map(entry => ({
    key: entry.key, playerId: entry.playerId, name: entry.name,
    maps: entry.mapKeys.size, matches: entry.matches.size,
    roles: [...entry.roles].sort((a, b) => b[1].size - a[1].size || roleOrder.indexOf(a[0]) - roleOrder.indexOf(b[0])).map(([role]) => role),
    hero: [...entry.heroes.values()].sort((a, b) => b.maps.size - a.maps.size || a.hero.localeCompare(b.hero))[0]?.hero || ''
  })).sort((a, b) => b.maps - a.maps || b.matches - a.matches || a.name.localeCompare(b.name) || a.key.localeCompare(b.key))
}

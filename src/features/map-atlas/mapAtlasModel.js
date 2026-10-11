import {
  getOwMap, getOwMapModeFolder, getOwMapImageName, getOwNameSearchText, normalizeOwLookupKey,
  getOwHeroCanonicalKey, getOwHeroCanonicalName, getOwHeroRole
} from '../../lib/heroes.js'

export const MAP_MODES = ['Control', 'Hybrid', 'Escort', 'Push', 'Flashpoint', 'Clash']
export const HERO_ROLES = ['tank', 'damage', 'support']
const array = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const normalized = value => text(value).toLowerCase()
const number = value => value === '' || value == null || !Number.isFinite(Number(value)) ? null : Number(value)

export function mapImageUrl(map) {
  return `/maps/${getOwMapModeFolder(map.type)}/${getOwMapImageName(map.name)}.jpg`
}

export function formatMapDuration(seconds) {
  if (!(seconds > 0)) return '—'
  const rounded = Math.round(seconds)
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

function durationSeconds(value) {
  const parts = text(value).split(':')
  if (parts.length < 2 || parts.length > 3 || parts.some(part => !/^\d+$/.test(part))) return null
  const seconds = parts.reduce((total, part) => total * 60 + Number(part), 0)
  return seconds > 0 ? seconds : null
}

function resolveTeam(side, map, letter, teams) {
  const id = text(side?.id || side?.team_id || map[`team_${letter}_id`])
  const fallback = text(map[`team_${letter}_name`] || side?.name || side?.short)
  const record = teams.get(normalized(id)) || teams.get(normalized(fallback)) || side || {}
  return {
    id: id || text(record.team_id || record.id),
    name: text(record.team_name || record.name || fallback || id),
    short: text(record.team_short_name || record.short || side?.short || fallback || id),
    record
  }
}

function winnerSide(map, a, b) {
  const winner = normalized(map.winner)
  const label = normalized(map.winner_label)
  for (const [side, team] of [['A', a], ['B', b]]) {
    const names = [team.id, team.name, team.short].map(normalized).filter(Boolean)
    if ((winner && names.includes(winner)) || (label && names.includes(label))) return side
  }
  if (['draw', 'tie', '平局'].includes(winner) || ['draw', 'tie', '平局'].includes(label)) return 'DRAW'
  const scoreA = number(map.score_a)
  const scoreB = number(map.score_b)
  if (scoreA !== null && scoreB !== null) {
    if (scoreA > scoreB) return 'A'
    if (scoreB > scoreA) return 'B'
    if (scoreA > 0 || durationSeconds(map.match_time || map.time)) return 'DRAW'
  }
  return ''
}

function sideStats(map, letter, team) {
  const direct = array(map[`team_${letter.toLowerCase()}_stats`])
  if (direct.length) return direct
  return array(map.player_stats).filter(row => row.side === letter || (team.id && text(row.team_id) === team.id))
}

function collectRecords(db) {
  const teams = new Map()
  array(db?.teams).forEach(team => {
    [team.team_id, team.id, team.team_name, team.name, team.team_short_name, team.short]
      .filter(Boolean).forEach(key => teams.set(normalized(key), team))
  })
  const records = []
  array(db?.matches).forEach((match, matchIndex) => {
    if (!['COMPLETE', 'COMPLETED'].includes(text(match.status).toUpperCase())) return
    array(match.maps).forEach((map, index) => {
      const rawName = text(map.map_name)
      if (!rawName || normalized(map.map_type) === 'unknown') return
      const definition = getOwMap(rawName)
      const type = getOwMapModeFolder(map.map_type || definition?.mode)
      if (!MAP_MODES.includes(type)) return
      const a = resolveTeam(match.team_a, map, 'a', teams)
      const b = resolveTeam(match.team_b, map, 'b', teams)
      const administrative = Boolean(map.is_administrative || map.forfeited_by || /FORFEIT|ADMIN|RULING/i.test(text(map.reason)))
      const groups = [['A', a], ['B', b]].map(([side, team]) => ({
        side, team, stats: administrative ? [] : sideStats(map, side, team)
      }))
      const order = Number(map.map_order) > 0 ? Number(map.map_order) : index + 1
      const date = text(match.scheduled_at)
      const timestamp = Date.parse(date)
      records.push({
        id: `${match.match_id || matchIndex}:${order}:${index}`,
        matchId: text(match.match_id), order, name: definition?.en || rawName, sourceName: rawName, type,
        a, b, groups, administrative, winner: winnerSide(map, a, b),
        scoreA: number(map.score_a), scoreB: number(map.score_b),
        duration: administrative ? null : durationSeconds(map.match_time || map.time),
        date: Number.isFinite(timestamp) ? date : '', timestamp: Number.isFinite(timestamp) ? timestamp : 0,
        stage: text(match.stage), round: text(match.round), reason: text(map.notes || map.reason),
        sequence: matchIndex * 100 + index
      })
    })
  })
  return records
}

function buildReport(name, records) {
  const heroes = new Map()
  const teams = new Map()
  const compositions = new Map()
  const extremes = new Map()
  let heroSamples = 0
  let lineupSamples = 0
  const metrics = ['eliminations', 'assists', 'damage', 'healing', 'mitigation']

  records.forEach(record => {
    record.heroKeys = new Set()
    record.compositionKeys = new Set()
    record.teamKeys = new Set()
    record.groups.forEach(({ side, team, stats }) => {
      const teamKey = team.id || team.name
      if (teamKey) {
        record.teamKeys.add(teamKey)
        if (!teams.has(teamKey)) teams.set(teamKey, { ...team, key: teamKey, plays: 0, wins: 0, losses: 0, draws: 0, unknown: 0 })
        const row = teams.get(teamKey)
        row.plays += 1
        if (record.winner === side) row.wins += 1
        else if (record.winner === 'DRAW') row.draws += 1
        else if (record.winner) row.losses += 1
        else row.unknown += 1
      }
      const uniqueHeroes = new Map()
      stats.forEach(stat => {
        const key = getOwHeroCanonicalKey(stat.heroes_played)
        if (!key) return
        const hero = getOwHeroCanonicalName(stat.heroes_played)
        uniqueHeroes.set(key, { key, name: hero, role: getOwHeroRole(hero) || 'other' })
        record.heroKeys.add(key)
        metrics.forEach(metric => {
          const value = number(stat[metric])
          if (!(value > 0) || value <= (extremes.get(metric)?.value ?? 0)) return
          extremes.set(metric, {
            metric, value, hero, player: text(stat.player_name).split('#')[0],
            playerId: text(stat.player_id || stat.playerId), team, record
          })
        })
      })
      if (!uniqueHeroes.size) return
      heroSamples += 1
      uniqueHeroes.forEach((hero, key) => {
        if (!heroes.has(key)) heroes.set(key, { ...hero, count: 0 })
        heroes.get(key).count += 1
      })
      // A recorded set of five distinct heroes is a team-side composition sample.
      if (uniqueHeroes.size !== 5) return
      lineupSamples += 1
      const lineup = [...uniqueHeroes.values()].sort((a, b) => [...HERO_ROLES, 'other'].indexOf(a.role) - [...HERO_ROLES, 'other'].indexOf(b.role) || a.key.localeCompare(b.key))
      const key = lineup.map(hero => hero.key).join('|')
      record.compositionKeys.add(key)
      if (!compositions.has(key)) compositions.set(key, { key, heroes: lineup, count: 0, teamNames: new Set() })
      const composition = compositions.get(key)
      composition.count += 1
      if (team.short) composition.teamNames.add(team.short)
    })
  })
  const times = records.map(record => record.duration).filter(value => value > 0)
  const totalDuration = times.reduce((sum, value) => sum + value, 0)
  return {
    name, routeName: records[0].sourceName, type: records[0].type, count: records.length,
    administrativeCount: records.filter(record => record.administrative).length,
    avgDuration: times.length ? totalDuration / times.length : null, durationSamples: times.length,
    heroSamples, lineupSamples,
    heroStats: [...heroes.values()].map(hero => ({ ...hero, rate: hero.count / heroSamples })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    teams: [...teams.values()].map(team => ({ ...team, winRate: team.plays > team.unknown ? team.wins / (team.plays - team.unknown) : null }))
      .sort((a, b) => b.wins - a.wins || b.plays - a.plays || a.name.localeCompare(b.name)),
    compositions: [...compositions.values()].map(row => ({ ...row, share: row.count / lineupSamples, teamNames: [...row.teamNames] }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    records: [...records].sort((a, b) => b.timestamp - a.timestamp || b.sequence - a.sequence),
    extremes: metrics.map(metric => extremes.get(metric)).filter(Boolean),
    searchText: getOwNameSearchText(name, 'map')
  }
}

export function buildMapAtlas(db) {
  const records = collectRecords(db)
  const grouped = new Map()
  records.forEach(record => {
    if (!grouped.has(record.name)) grouped.set(record.name, [])
    grouped.get(record.name).push(record)
  })
  const maps = [...grouped.entries()].map(([name, entries]) => buildReport(name, entries))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const modes = MAP_MODES.map(type => {
    const items = maps.filter(map => map.type === type)
    return { type, maps: items, count: items.reduce((sum, map) => sum + map.count, 0) }
  }).filter(mode => mode.maps.length)
  maps.forEach(map => {
    const mode = modes.find(item => item.type === map.type)
    map.rank = maps.filter(item => item.count > map.count).length + 1
    map.modeRank = mode.maps.filter(item => item.count > map.count).length + 1
    map.share = records.length ? map.count / records.length : 0
    map.modeShare = mode.count ? map.count / mode.count : 0
  })
  return { maps, modes, totalRecords: records.length }
}

export function findAtlasMap(atlas, name) {
  const canonical = getOwMap(name)?.en || name
  return atlas.maps.find(map => normalized(map.name) === normalized(canonical)) || null
}

export function filterAtlasMaps(maps, { mode = '', search = '', sort = 'plays' } = {}) {
  const query = normalizeOwLookupKey(search)
  return maps.filter(map => (!mode || map.type === mode) && (!query || map.searchText.replace(/\s+/g, '').includes(query)))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'duration' ? (b.avgDuration ?? -1) - (a.avgDuration ?? -1) : b.count - a.count || a.name.localeCompare(b.name))
}

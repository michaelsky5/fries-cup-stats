import { getMatchDossier } from '../../lib/matchDetailSelectors.js'
import { getMatchReviewPlayers } from '../../lib/matchReviewSelectors.js'
import { getOwHeroCanonicalKey, getOwMap } from '../../lib/heroes.js'

const clean = value => String(value ?? '').trim()
const key = value => clean(value).toLowerCase()
const list = value => Array.isArray(value) ? value : []

export function playerRecordMatches(row, player) {
  const rowId = key(row.playerId || row.player_id)
  const playerId = key(player.player_id)
  if (rowId && playerId) return rowId === playerId
  // A display nickname is not a unique account identifier.
  const tags = [player.player_name, player.battleTag, player.battle_tag].map(key).filter(value => value.includes('#'))
  return [row.battleTag, row.player_name, row.rawName].some(value => tags.includes(key(value)))
}

function matchContainsPlayer(match, player) {
  return list(match.maps).some(map =>
    ['player_stats', 'team_a_stats', 'team_b_stats'].some(field => list(map[field]).some(row => playerRecordMatches(row, player))))
}

function outcome(winnerSide, side) {
  if (winnerSide === 'DRAW') return 'draw'
  return ['A', 'B'].includes(winnerSide) ? (winnerSide === side ? 'win' : 'loss') : 'unknown'
}

function score(value) {
  return value != null && clean(value) !== '' && Number.isFinite(Number(value)) ? Number(value) : null
}

// The match page is the source of ratings and published map records. Keep role
// changes separate and count a map only once, even if several heroes were used.
export function collectPlayerAppearances(dossiers, player) {
  const appearances = []
  for (const dossier of dossiers) {
    if (!dossier?.state.canShowResults || dossier.state.isForfeit) continue
    const validMaps = dossier.mapRecords.filter(map => map.hasResult && !map.raw?.is_administrative)
    const published = { ...dossier, mapRecords: validMaps }
    const seriesPlayers = getMatchReviewPlayers(published).filter(row => playerRecordMatches(row, player))
    const mapPlayers = new Map(validMaps.map(map => [map.order, getMatchReviewPlayers(published, map.order)]))
    for (const row of seriesPlayers) {
      const opponentSide = row.side === 'A' ? 'B' : 'A'
      const maps = validMaps.flatMap(map => {
        const record = mapPlayers.get(map.order).find(candidate => candidate.key === row.key)
        if (!record) return []
        return [{
          ...record,
          order: map.order,
          name: map.name,
          result: outcome(map.winnerSide, row.side),
          scoreFor: score(map[`score${row.side}`]),
          scoreAgainst: score(map[`score${opponentSide}`]),
          companions: mapPlayers.get(map.order).filter(candidate => candidate.side === row.side && !playerRecordMatches(candidate, player)).map(candidate => ({ playerId: candidate.playerId, displayName: candidate.displayName, battleTag: candidate.battleTag, role: candidate.role, heroes: candidate.heroes })),
          minutes: Number(record.ratingEntry?.roleTimeMins) > 0 ? Number(record.ratingEntry.roleTimeMins) : null
        }]
      })
      if (!maps.length) continue
      appearances.push({
        ...row,
        matchId: dossier.internalId,
        key: `${dossier.internalId}:${row.key}`,
        date: dossier.match.scheduled_at || '',
        dateLabel: dossier.scheduleCompact,
        stage: dossier.breadcrumb.join(' · '),
        team: dossier[`team${row.side}`],
        opponent: dossier[`team${opponentSide}`],
        result: dossier.state.isComplete ? outcome(dossier.winnerSide, row.side) : 'pending',
        scoreFor: score(dossier.match[`team_${row.side.toLowerCase()}`]?.score),
        scoreAgainst: score(dossier.match[`team_${opponentSide.toLowerCase()}`]?.score),
        maps
      })
    }
  }
  return appearances.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0) || a.matchId.localeCompare(b.matchId))
}

export function getPlayerAppearances(db, player, locale = 'zh-CN') {
  const candidates = list(db?.matches).filter(match => matchContainsPlayer(match, player))
  return collectPlayerAppearances(candidates.map(match => getMatchDossier(db, match.match_id, { locale })), player)
}

export function getRecordedPlayerHeroes(appearances) {
  const groups = new Map()
  appearances.forEach(match => match.maps.forEach(map => map.heroes.forEach(hero => {
    const heroKey = getOwHeroCanonicalKey(hero) || key(hero)
    if (!heroKey || ['—', '-'].includes(heroKey)) return
    if (!groups.has(heroKey)) groups.set(heroKey, { key: heroKey, hero, roles: new Set(), maps: new Map(), matches: new Set() })
    const record = groups.get(heroKey)
    record.roles.add(match.role)
    record.matches.add(match.matchId)
    record.maps.set(`${match.matchId}:${map.order}`, map.result)
  })))
  return [...groups.values()].map(record => ({
    key: record.key, hero: record.hero, roles: [...record.roles],
    maps: record.maps.size, matches: record.matches.size,
    wins: [...record.maps.values()].filter(result => result === 'win').length,
    losses: [...record.maps.values()].filter(result => result === 'loss').length,
    draws: [...record.maps.values()].filter(result => result === 'draw').length
  })).sort((a, b) => b.maps - a.maps || a.key.localeCompare(b.key))
}

export function playerMapKey(value) {
  return getOwMap(value)?.id || key(value)
}

export function filterPlayerAppearances(appearances, { role = '', hero = '', map = '', result = '' } = {}) {
  return appearances.filter(match => (!role || match.role === role) && (!result || match.result === result) &&
    (!(hero || map) || match.maps.some(record => (!map || playerMapKey(record.name) === map) &&
      (!hero || record.heroes.some(value => (getOwHeroCanonicalKey(value) || key(value)) === hero)))))
}

export function getPlayerRecentForm(appearances, limit = 5) {
  const matches = [...appearances].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0) || a.matchId.localeCompare(b.matchId)).slice(0, limit)
  const rated = matches.filter(match => Number.isFinite(match.rating))
  return {
    matches,
    wins: matches.filter(match => match.result === 'win').length,
    losses: matches.filter(match => match.result === 'loss').length,
    draws: matches.filter(match => match.result === 'draw').length,
    ratedCount: rated.length,
    averageRating: rated.length ? rated.reduce((sum, match) => sum + match.rating, 0) / rated.length : null
  }
}

// Every atlas entry is backed by map records. Group aliases together, retain
// missing ratings, and never count two hero rows as two map appearances.
export function getPlayerMapProfiles(appearances) {
  const groups = new Map()
  for (const match of appearances) {
    for (const map of match.maps) {
      const mapKey = playerMapKey(map.name)
      if (!groups.has(mapKey)) groups.set(mapKey, { key: mapKey, name: map.name, records: new Map() })
      groups.get(mapKey).records.set(`${match.matchId}:${map.order}:${match.role}`, { match, map })
    }
  }
  return [...groups.values()].map(group => {
    const records = [...group.records.values()].sort((a, b) => (Date.parse(b.match.date) || 0) - (Date.parse(a.match.date) || 0) || a.map.order - b.map.order)
    const rated = records.filter(record => Number.isFinite(record.map.rating))
    return {
      key: group.key, name: group.name, records,
      maps: records.length,
      wins: records.filter(record => record.map.result === 'win').length,
      losses: records.filter(record => record.map.result === 'loss').length,
      draws: records.filter(record => record.map.result === 'draw').length,
      ratedCount: rated.length,
      averageRating: rated.length ? rated.reduce((sum, record) => sum + record.map.rating, 0) / rated.length : null,
      heroes: [...new Map(records.flatMap(record => record.map.heroes).map(hero => [getOwHeroCanonicalKey(hero) || key(hero), hero])).values()]
    }
  }).sort((a, b) => b.maps - a.maps || a.key.localeCompare(b.key))
}

export function getPlayerPrimaryRole(dossier) {
  return [...(dossier?.roleEntries || [])].sort((a, b) => b.summary.timeMins - a.summary.timeMins || b.summary.maps - a.summary.maps)[0]
}

// A profile describes the person across roles. A role switch within one match
// must not create a second match, a second win, or a second journey chapter.
export function getPlayerSeasonJourney(appearances) {
  const matchesById = new Map()
  for (const appearance of appearances) {
    if (!matchesById.has(appearance.matchId)) {
      matchesById.set(appearance.matchId, { ...appearance, roles: new Set(), mapOrders: new Set() })
    }
    const match = matchesById.get(appearance.matchId)
    match.roles.add(appearance.role)
    appearance.maps.forEach(map => match.mapOrders.add(map.order))
  }
  const matches = [...matchesById.values()]
    .sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0) || a.matchId.localeCompare(b.matchId))
  const phases = new Map()
  for (const match of matches) {
    const phase = clean(match.stage).split(' · ')[0]
    if (!phases.has(phase)) phases.set(phase, { phase, matches: [], wins: 0, losses: 0, draws: 0 })
    const chapter = phases.get(phase)
    chapter.matches.push(match)
    if (match.result === 'win') chapter.wins += 1
    if (match.result === 'loss') chapter.losses += 1
    if (match.result === 'draw') chapter.draws += 1
  }
  return {
    matches,
    mapCount: matches.reduce((total, match) => total + match.mapOrders.size, 0),
    roles: ['TANK', 'DPS', 'SUPPORT'].filter(role => appearances.some(match => match.role === role)),
    phases: [...phases.values()].map(chapter => ({ ...chapter, latest: chapter.matches.at(-1) }))
  }
}

export function playerPagePath(playerId, page, search, changes = {}) {
  const params = new URLSearchParams(search)
  for (const [name, value] of Object.entries(changes)) {
    if (value) params.set(name, value)
    else params.delete(name)
  }
  const pathname = `/players/${encodeURIComponent(playerId)}${['analysis', 'journey'].includes(page) ? `/${page}` : ''}`
  return `${pathname}${params.size ? `?${params}` : ''}`
}

export function playerComparisonPath(entry, search, mode = 'per10') {
  const params = new URLSearchParams({ role: entry.role, mode, compare: entry.entryKey })
  return playerContextPath(`/leaderboard?${params}`, search)
}

export function formatPlayerMatchStage(value, en = false) {
  if (en) return value
  const labels = { SWISS: '瑞士轮', QUALIFIERS: '瑞士轮', LCQ: '突围赛', PLAYOFFS: '季后赛', GROUP: '小组赛', SEMIFINALS: '半决赛', QUARTERFINALS: '四分之一决赛', 'UB QF': '胜者组四分之一决赛', 'UB SF': '胜者组半决赛', 'UB FINAL': '胜者组决赛', 'LB FINAL': '败者组决赛', 'GRAND FINALS': '总决赛', 'ROUND OF 16': '十六强赛', QUALIFICATION: '晋级赛', 'PLAY-IN': '入围赛' }
  return String(value || '').split(' · ').map(part => {
    const normalized = part.trim().toUpperCase()
    if (labels[normalized]) return labels[normalized]
    const groupDay = /^GROUP\s+([A-Z])(?:\s*\/\s*DAY\s+(\d+))?$/.exec(normalized)
    if (groupDay) return `${groupDay[1]} 组${groupDay[2] ? ` / 第 ${groupDay[2]} 比赛日` : ''}`
    const lower = /^LB R(\d+)$/.exec(normalized)
    if (lower) return `败者组第 ${lower[1]} 轮`
    const round = /^ROUND\s+(\d+)$/.exec(normalized)
    return round ? `第 ${round[1]} 轮` : part
  }).join(' · ')
}

export function playerContextPath(path, search) {
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  const current = new URLSearchParams(search)
  for (const name of ['season', 'design', 'lang']) {
    if (!params.has(name) && current.has(name)) params.set(name, current.get(name))
  }
  return `${pathname}${params.size ? `?${params}` : ''}`
}

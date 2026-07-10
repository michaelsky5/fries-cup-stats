import {
  PUBLIC_METRICS,
  ROLE_ORDER,
  compareLeaderboardEntries,
  getRoleCoreMetricIds,
  scoreLeaderboardEntries
} from './leaderboardScoring.js'
import { normalizeLeaderboardRole } from './leaderboardSelectors.js'
import { getOwHeroCanonicalKey, getOwHeroCanonicalName } from './heroes.js'

const METRIC_IDS = PUBLIC_METRICS.map(metric => metric.id)

function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function cleanText(value) {
  return String(value ?? '').trim()
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function parseTimeToMinutes(value) {
  const text = cleanText(value)
  if (!text) return 0
  const parts = text.split(':').map(part => Number(part))
  if (parts.some(part => !Number.isFinite(part))) return 0
  if (parts.length === 3) return (parts[0] * 60) + parts[1] + (parts[2] / 60)
  if (parts.length === 2) return parts[0] + (parts[1] / 60)
  return 0
}

function getPlayerIdentity(row, player) {
  const rawName = cleanText(row?.player_name || player?.player_name || player?.battle_tag || player?.battleTag)
  const nickname = cleanText(player?.nickname)
  const displayName = cleanText(player?.display_name)
  const battleTag = cleanText(player?.battle_tag || player?.battleTag || player?.battletag || rawName)

  return {
    playerName: rawName,
    battleTag,
    displayName: nickname || displayName || rawName || cleanText(row?.player_id),
    nickname
  }
}

function buildMetrics(totals, roleTimeMins, mapsPlayed) {
  const per10 = {}
  const perMap = {}
  const perMin = {}

  METRIC_IDS.forEach(metricId => {
    const total = toFiniteNumber(totals?.[metricId])
    per10[metricId] = roleTimeMins > 0 ? total / roleTimeMins * 10 : 0
    perMap[metricId] = mapsPlayed > 0 ? total / mapsPlayed : 0
    perMin[metricId] = roleTimeMins > 0 ? total / roleTimeMins : 0
  })

  return { total: totals, per10, perMap, perMin }
}

function getStatTotals(row) {
  return {
    elim: toFiniteNumber(row?.eliminations),
    ast: toFiniteNumber(row?.assists),
    dth: toFiniteNumber(row?.deaths),
    dmg: toFiniteNumber(row?.damage),
    heal: toFiniteNumber(row?.healing),
    block: toFiniteNumber(row?.mitigation ?? row?.blocked)
  }
}

function addTotals(target, source) {
  METRIC_IDS.forEach(metricId => {
    target[metricId] = toFiniteNumber(target[metricId]) + toFiniteNumber(source?.[metricId])
  })
}

function hasStatSignal(row) {
  const totals = getStatTotals(row)
  return Object.values(totals).some(value => value > 0)
}

function getHeroList(row) {
  const seen = new Set()

  return cleanText(row?.heroes_played)
    .split(/[，,/|]+/)
    .map(cleanText)
    .filter(hero => hero && hero !== '-' && hero.toUpperCase() !== 'UNKNOWN')
    .reduce((acc, hero) => {
      const key = getOwHeroCanonicalKey(hero)
      if (!key || seen.has(key)) return acc
      seen.add(key)
      acc.push(getOwHeroCanonicalName(hero))
      return acc
    }, [])
}

function createPlayerDirectory(players = []) {
  const map = new Map()
  safeArr(players).forEach(player => {
    const ids = [
      player?.player_id,
      player?.id,
      player?.player_name,
      player?.battle_tag,
      player?.battleTag,
      player?.display_name,
      player?.nickname
    ].map(value => cleanText(value).toLowerCase()).filter(Boolean)

    ids.forEach(id => {
      if (!map.has(id)) map.set(id, player)
    })
  })
  return map
}

function createLogTimeIndex(players = [], match) {
  const index = new Map()
  const matchIds = new Set([
    match?.match_id,
    match?.raw_match_id,
    match?.id
  ].map(cleanText).filter(Boolean))

  safeArr(players).forEach(player => {
    const logs = [...safeArr(player?.match_logs), ...safeArr(player?.live_match_logs)]
    logs.forEach(log => {
      if (!matchIds.has(cleanText(log?.matchId || log?.match_id || log?.rawMatchId || log?.raw_match_id))) return

      const role = normalizeLeaderboardRole(log?.role)
      const mapOrder = cleanText(log?.mapOrder ?? log?.map_order)
      const minutes = toFiniteNumber(log?.playtimeMinutes ?? log?.raw_time_mins)
      if (!role || !mapOrder || minutes <= 0) return

      const playerId = cleanText(player?.player_id || log?.playerId || log?.player_id)
      if (!playerId) return

      const key = `${playerId}:${role}:${mapOrder}`
      if (!index.has(key)) index.set(key, minutes)
    })
  })

  return index
}

function getRoleSortValue(role) {
  const normalized = normalizeLeaderboardRole(role)
  const index = ROLE_ORDER.indexOf(normalized)
  return index === -1 ? 99 : index
}

function normalizeTeamKey(value) {
  return cleanText(value).toLowerCase()
}

function getTeamKeys(team) {
  return [team?.id, team?.name, team?.short].map(normalizeTeamKey).filter(Boolean)
}

function getMapResultContext(match, map) {
  if (!map) return { winnerTeamKeys: [], mapWinDominance: 0 }

  const teamAKeys = getTeamKeys(match?.team_a)
  const teamBKeys = getTeamKeys(match?.team_b)
  const winnerKeys = [map?.winner, map?.winner_label].map(normalizeTeamKey).filter(Boolean)
  const scoreA = Number(map?.score_a)
  const scoreB = Number(map?.score_b)
  const hasScores = Number.isFinite(scoreA) && Number.isFinite(scoreB) && scoreA !== scoreB
  const winnerMatchesA = winnerKeys.some(key => teamAKeys.includes(key))
  const winnerMatchesB = winnerKeys.some(key => teamBKeys.includes(key))
  const hasResolvedWinner = winnerMatchesA || winnerMatchesB
  const winnerIsA = winnerMatchesA || (!hasResolvedWinner && hasScores && scoreA > scoreB)
  const winnerIsB = winnerMatchesB || (!hasResolvedWinner && hasScores && scoreB > scoreA)
  const resolvedWinnerKeys = winnerIsA ? teamAKeys : winnerIsB ? teamBKeys : []
  const highScore = hasScores ? Math.max(Math.abs(scoreA), Math.abs(scoreB)) : 0
  const mapWinDominance = highScore > 0 ? Math.min(1, Math.abs(scoreA - scoreB) / highScore) : 0

  return { winnerTeamKeys: resolvedWinnerKeys, mapWinDominance }
}

function finalizeEntry(group) {
  const heroes = [...group.heroCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([hero]) => hero)
  const mapsPlayed = group.maps.size
  const roleTimeMins = group.roleTimeMins
  const metrics = buildMetrics(group.totals, roleTimeMins, mapsPlayed)

  return {
    entryKey: `${group.playerId}:${group.role}`,
    player_id: group.playerId,
    player_name: group.playerName,
    battleTag: group.battleTag,
    nickname: group.nickname,
    display_name: group.displayName,
    team_id: group.teamId,
    team_name: group.teamName,
    team_short_name: group.teamShortName,
    role: group.role,
    maps_played: mapsPlayed,
    roleMapsPlayed: mapsPlayed,
    raw_time_mins: roleTimeMins,
    roleTimeMins,
    total_time_played: roleTimeMins > 0 ? `${Math.round(roleTimeMins)}m` : '0m',
    most_played_hero: heroes[0] || '',
    top_3_heroes: heroes.slice(0, 3),
    metrics,
    total_elim: metrics.total.elim,
    total_ast: metrics.total.ast,
    total_dth: metrics.total.dth,
    total_dmg: metrics.total.dmg,
    total_heal: metrics.total.heal,
    total_block: metrics.total.block,
    avg_elim: metrics.per10.elim,
    avg_ast: metrics.per10.ast,
    avg_dth: metrics.per10.dth,
    avg_dmg: metrics.per10.dmg,
    avg_heal: metrics.per10.heal,
    avg_block: metrics.per10.block,
    sourceType: 'match_maps'
  }
}

function buildMatchRatingEntries(match, maps = [], players = []) {
  const playerDirectory = createPlayerDirectory(players)
  const logTimeIndex = createLogTimeIndex(players, match)
  const groups = new Map()

  safeArr(maps).forEach(map => {
    const mapOrder = cleanText(map?.map_order)
    const mapMinutes = parseTimeToMinutes(map?.match_time)

    const rows = [
      ...safeArr(map?.team_a_stats).map((row, index) => ({ row, side: 'A', index })),
      ...safeArr(map?.team_b_stats).map((row, index) => ({ row, side: 'B', index }))
    ]

    rows.forEach(({ row, side, index }) => {
      if (!hasStatSignal(row)) return

      const role = normalizeLeaderboardRole(row?.role)
      const playerId = cleanText(row?.player_id || `${side}-${index}`)
      if (!role || !playerId) return

      const player = playerDirectory.get(playerId.toLowerCase()) ||
        playerDirectory.get(cleanText(row?.player_name).toLowerCase())
      const identity = getPlayerIdentity(row, player)
      const teamId = cleanText(row?.team_id || (side === 'A' ? match?.team_a?.id : match?.team_b?.id))
      const teamName = cleanText(row?.team_name || (side === 'A' ? match?.team_a?.name : match?.team_b?.name))
      const teamShortName = cleanText(side === 'A' ? match?.team_a?.short : match?.team_b?.short) || teamName
      const groupKey = `${playerId}:${role}`

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          playerId,
          playerName: identity.playerName,
          battleTag: identity.battleTag,
          nickname: identity.nickname,
          displayName: identity.displayName,
          teamId,
          teamName,
          teamShortName,
          role,
          roleTimeMins: 0,
          maps: new Set(),
          heroCounts: new Map(),
          totals: { elim: 0, ast: 0, dth: 0, dmg: 0, heal: 0, block: 0 }
        })
      }

      const group = groups.get(groupKey)
      const statTotals = getStatTotals(row)
      addTotals(group.totals, statTotals)
      if (mapOrder) group.maps.add(mapOrder)

      const logMinutes = logTimeIndex.get(`${playerId}:${role}:${mapOrder}`)
      group.roleTimeMins += logMinutes || mapMinutes || 0

      getHeroList(row).forEach(hero => {
        group.heroCounts.set(hero, (group.heroCounts.get(hero) || 0) + (logMinutes || mapMinutes || 1))
      })
    })
  })

  return [...groups.values()]
    .sort((a, b) => getRoleSortValue(a.role) - getRoleSortValue(b.role) || a.playerId.localeCompare(b.playerId))
    .map(finalizeEntry)
}

function getCoreStats(entry) {
  const metricMap = PUBLIC_METRICS.reduce((acc, metric) => {
    acc[metric.id] = metric
    return acc
  }, {})

  return getRoleCoreMetricIds(entry?.role, entry?.most_played_hero)
    .filter(metricId => metricId !== 'dth')
    .slice(0, 2)
    .map(metricId => ({
      metricId,
      label: metricMap[metricId]?.label || metricId,
      value: toFiniteNumber(entry?.metrics?.total?.[metricId])
    }))
}

function decorateScoreEntry(entry) {
  return {
    ...entry,
    coreStats: getCoreStats(entry)
  }
}

export function getMatchRatingSummary(match, maps = [], players = []) {
  const rawEntries = buildMatchRatingEntries(match, maps, players)
  if (!rawEntries.length) {
    return {
      supported: false,
      level: 'match',
      formulaSource: 'ratingModel.v1',
      topEntries: [],
      roleLeaders: {},
      entries: []
    }
  }

  const scoreContext = maps.length === 1 ? 'map' : 'match'
  const resultContext = scoreContext === 'map' ? getMapResultContext(match, maps[0]) : {}
  const scoredEntries = scoreLeaderboardEntries(rawEntries, 0, {
    players,
    scoreContext,
    ...resultContext
  })
    .filter(entry => entry.roleScore > 0)
    .sort(compareLeaderboardEntries)
    .map(decorateScoreEntry)

  const roleLeaders = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = scoredEntries.find(entry => entry.role === role) || null
    return acc
  }, {})

  return {
    supported: scoredEntries.length > 0,
    level: 'match',
    formulaSource: 'ratingModel.v1',
    topEntries: scoredEntries.slice(0, 3),
    roleLeaders,
    entries: scoredEntries
  }
}

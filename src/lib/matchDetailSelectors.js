import { formatInt, formatScore, formatUpdatedAt } from './format.js'
import { getBroadcastInfo } from './broadcastSelectors.js'
import { getMatchRatingSummary } from './matchRatingAdapter.js'
import {
  getMatchStatusText,
  getMatchCompetitionDay,
  getMatchGroupLabel,
  getRoundText,
  getTeamFullName,
  getTeamLabel,
  safeArr,
  sortMatchesBySchedule
} from './matchesSelectors.js'
import { formatMatchSchedule } from './scheduleFormat.js'
import { getRoleEnLabel, getRoleLabel, normalizeLeaderboardRole } from './leaderboardSelectors.js'
import { normalizeRosterRole } from './rosterSelectors.js'
import { formatOwHeroName, formatOwMapMode, formatOwMapName } from './heroes.js'

const COMPLETE_STATUSES = new Set(['COMPLETE', 'COMPLETED'])
const LIVE_STATUSES = new Set(['IN_PROGRESS', 'LIVE'])
const POSTPONED_STATUSES = new Set(['POSTPONED', 'DELAYED', 'RESCHEDULED'])
const CANCELLED_STATUSES = new Set(['CANCELLED', 'CANCELED'])
const ROLE_ORDER = { TANK: 1, DPS: 2, SUPPORT: 3 }

const TEAM_METRICS = [
  { key: 'mapWins', label: '地图胜利', en: 'MAPS' },
  { key: 'elim', label: '消灭', en: 'ELIM' },
  { key: 'ast', label: '助攻', en: 'AST' },
  { key: 'dth', label: '阵亡', en: 'DTH', lowerIsBetter: true },
  { key: 'dmg', label: '伤害', en: 'DMG' },
  { key: 'heal', label: '治疗', en: 'HEAL' },
  { key: 'block', label: '阻挡', en: 'MIT' }
]

function cleanText(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase()
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function isKnownValue(value) {
  const text = cleanText(value)
  return text && !['TBD', 'N/A', 'NULL', 'UNKNOWN', '-'].includes(text.toUpperCase())
}

function matchIdValues(match) {
  return [
    match?.match_id,
    match?.raw_match_id,
    match?.id
  ].map(cleanText).filter(Boolean)
}

function getMatchById(db, matchId) {
  const target = normalizeKey(matchId)
  return safeArr(db?.matches).find(match => matchIdValues(match).some(id => normalizeKey(id) === target)) || null
}

function getScheduleLabel(match, locale = 'zh-CN') {
  if (match?.scheduled_at) return formatUpdatedAt(match.scheduled_at)
  if (match?.scheduled_date && match?.scheduled_time) return `${match.scheduled_date} ${match.scheduled_time}`
  const schedule = formatMatchSchedule(match, { locale })
  return schedule.hasSchedule ? schedule.label : schedule.title
}

function parseDurationSeconds(value) {
  const text = cleanText(value)
  if (!text) return 0
  const parts = text.split(':').map(part => Number(part))
  if (parts.some(part => !Number.isFinite(part))) return 0
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2]
  if (parts.length === 2) return (parts[0] * 60) + parts[1]
  return 0
}

function formatDuration(seconds) {
  const total = Math.round(toFiniteNumber(seconds))
  if (total <= 0) return ''
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function getMatchState(match) {
  const status = cleanText(match?.status || 'PENDING').toUpperCase()
  const resultMode = cleanText(match?.result_mode).toUpperCase()
  const isForfeit = Boolean(match?.is_forfeit) || resultMode === 'FORFEIT'
  const isComplete = COMPLETE_STATUSES.has(status)
  const isCancelled = CANCELLED_STATUSES.has(status)
  const isPostponed = POSTPONED_STATUSES.has(status)
  const isLive = LIVE_STATUSES.has(status)
  const isUpcoming = !isForfeit && !isComplete && !isCancelled && !isPostponed && !isLive

  return {
    status,
    resultMode,
    isForfeit,
    isComplete,
    isCancelled,
    isPostponed,
    isLive,
    isUpcoming,
    canShowResults: (isComplete || isForfeit) && !isCancelled && !isPostponed
  }
}

function getTeamModel(team, side) {
  const short = getTeamLabel(team)
  const full = getTeamFullName(team)
  return {
    side,
    id: cleanText(team?.id || team?.team_id),
    short,
    full,
    score: formatScore(team?.score),
    rawScore: team?.score
  }
}

function getWinnerSide(map, match) {
  const winner = cleanText(map?.winner)
  if (!winner || winner.toUpperCase() === 'UNKNOWN') {
    const scoreA = toFiniteNumber(map?.score_a, NaN)
    const scoreB = toFiniteNumber(map?.score_b, NaN)
    if (Number.isFinite(scoreA) && Number.isFinite(scoreB)) {
      if (scoreA > scoreB) return 'A'
      if (scoreB > scoreA) return 'B'
    }
    return ''
  }

  if (winner === 'A' || winner === cleanText(match?.team_a?.id) || normalizeKey(winner) === normalizeKey(match?.team_a?.name)) return 'A'
  if (winner === 'B' || winner === cleanText(match?.team_b?.id) || normalizeKey(winner) === normalizeKey(match?.team_b?.name)) return 'B'
  if (winner.toUpperCase() === 'DRAW') return 'DRAW'
  return ''
}

function hasStatSignal(row) {
  return [
    row?.eliminations,
    row?.assists,
    row?.deaths,
    row?.damage,
    row?.healing,
    row?.mitigation,
    row?.blocked
  ].some(value => toFiniteNumber(value) > 0)
}

function hasMapScore(map) {
  const scoreA = cleanText(map?.score_a)
  const scoreB = cleanText(map?.score_b)
  return isKnownValue(scoreA) || isKnownValue(scoreB)
}

function hasMapResult(map, match) {
  return Boolean(getWinnerSide(map, match)) || hasMapScore(map)
}

function createPlayerDirectory(db) {
  const players = new Map()
  safeArr(db?.players).forEach(player => {
    const ids = [
      player?.player_id,
      player?.id,
      player?.player_name,
      player?.battle_tag,
      player?.battleTag,
      player?.display_name,
      player?.nickname
    ].map(normalizeKey).filter(Boolean)

    ids.forEach(id => {
      if (!players.has(id)) players.set(id, player)
    })
  })
  return players
}

function getPlayerIdentity(row, player) {
  const rawName = cleanText(row?.player_name || player?.player_name || player?.battle_tag || player?.battleTag)
  const nickname = cleanText(player?.nickname)
  const displayName = cleanText(player?.display_name)
  const battleTag = cleanText(player?.battle_tag || player?.battleTag || player?.battletag || rawName)
  const main = nickname || displayName || rawName || cleanText(row?.player_id) || 'PLAYER'

  return {
    displayName: main,
    battleTag: battleTag && battleTag !== main ? battleTag : '',
    rawName
  }
}

function normalizeStatRow(row, side, map, match, playerDirectory, index, locale = 'zh-CN') {
  const role = normalizeLeaderboardRole(row?.role)
  const player = playerDirectory.get(normalizeKey(row?.player_id)) || playerDirectory.get(normalizeKey(row?.player_name))
  const identity = getPlayerIdentity(row, player)
  const rawHero = cleanText(row?.heroes_played)

  return {
    key: `${map.order}-${side}-${row?.player_id || row?.player_name || index}`,
    side,
    teamId: cleanText(row?.team_id || (side === 'A' ? match?.team_a?.id : match?.team_b?.id)),
    teamName: cleanText(row?.team_name || (side === 'A' ? match?.team_a?.name : match?.team_b?.name)),
    playerId: cleanText(row?.player_id),
    displayName: identity.displayName,
    battleTag: identity.battleTag,
    rawName: identity.rawName,
    role,
    roleLabel: locale === 'en-US' ? getRoleEnLabel(role) : getRoleLabel(role),
    hero: formatOwHeroName(rawHero, locale),
    rawHero,
    eliminations: toFiniteNumber(row?.eliminations),
    assists: toFiniteNumber(row?.assists),
    deaths: toFiniteNumber(row?.deaths),
    damage: toFiniteNumber(row?.damage),
    healing: toFiniteNumber(row?.healing),
    mitigation: toFiniteNumber(row?.mitigation ?? row?.blocked),
    originalIndex: index
  }
}

function sortPlayerRows(rows) {
  return safeArr(rows).slice().sort((a, b) => {
    const roleDelta = (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99)
    if (roleDelta !== 0) return roleDelta
    return a.originalIndex - b.originalIndex
  })
}

function getTeamTotalsBase() {
  return { mapWins: 0, elim: 0, ast: 0, dth: 0, dmg: 0, heal: 0, block: 0 }
}

function addRowToTotals(totals, row) {
  totals.elim += row.eliminations
  totals.ast += row.assists
  totals.dth += row.deaths
  totals.dmg += row.damage
  totals.heal += row.healing
  totals.block += row.mitigation
}

function getRosterForTeam(db, team) {
  const ids = new Set([
    team?.id,
    team?.team_id,
    team?.short,
    team?.team_short_name,
    team?.name,
    team?.team_name
  ].map(normalizeKey).filter(Boolean))

  return safeArr(db?.players)
    .filter(player => [
      player?.team_id,
      player?.team_short_name,
      player?.team_name,
      player?.team
    ].some(value => ids.has(normalizeKey(value))))
    .map(player => ({
      id: cleanText(player?.player_id),
      name: cleanText(player?.nickname || player?.display_name || player?.player_name || player?.player_id),
      role: normalizeRosterRole(player?.role)
    }))
}

function normalizeMap(map, match, playerDirectory, index, locale = 'zh-CN') {
  const order = Number(map?.map_order || index + 1)
  const winnerSide = getWinnerSide(map, match)
  const scoreA = isKnownValue(map?.score_a) ? cleanText(map?.score_a) : '-'
  const scoreB = isKnownValue(map?.score_b) ? cleanText(map?.score_b) : '-'
  const rawName = cleanText(map?.map_name)
  const rawType = cleanText(map?.map_type)
  const teamAStats = sortPlayerRows(safeArr(map?.team_a_stats)
    .filter(hasStatSignal)
    .map((row, rowIndex) => normalizeStatRow(row, 'A', { order }, match, playerDirectory, rowIndex, locale)))
  const teamBStats = sortPlayerRows(safeArr(map?.team_b_stats)
    .filter(hasStatSignal)
    .map((row, rowIndex) => normalizeStatRow(row, 'B', { order }, match, playerDirectory, rowIndex, locale)))
  const hasResult = hasMapResult(map, match)
  const hasStats = teamAStats.length > 0 || teamBStats.length > 0
  const hasProvidedInfo = isKnownValue(map?.map_name) ||
    isKnownValue(map?.map_type) ||
    hasResult ||
    hasStats ||
    isKnownValue(map?.match_time) ||
    isKnownValue(map?.lobby_code)
  const winnerTeam = winnerSide === 'A'
    ? getTeamModel(match?.team_a, 'A')
    : winnerSide === 'B'
      ? getTeamModel(match?.team_b, 'B')
      : null

  return {
    key: `map-${order}`,
    order,
    orderLabel: String(order).padStart(2, '0'),
    name: rawName ? formatOwMapName(rawName, locale) : `MAP ${String(order).padStart(2, '0')}`,
    rawName,
    type: rawType ? formatOwMapMode(rawType, locale) : rawType,
    rawType,
    matchTime: cleanText(map?.match_time),
    durationSeconds: parseDurationSeconds(map?.match_time),
    winnerSide,
    winnerTeam,
    winnerLabel: cleanText(map?.winner_label) || winnerTeam?.short || '',
    scoreA,
    scoreB,
    hasResult,
    hasStats,
    hasProvidedInfo,
    isComplete: hasResult && hasStats,
    lobbyCode: cleanText(map?.lobby_code),
    notes: cleanText(map?.notes),
    teamABan: formatOwHeroName(cleanText(map?.team_a_ban), locale),
    teamABanRole: cleanText(map?.team_a_ban_role),
    teamBBan: formatOwHeroName(cleanText(map?.team_b_ban), locale),
    teamBBanRole: cleanText(map?.team_b_ban_role),
    teamAStats,
    teamBStats,
    raw: map
  }
}

function buildTeamComparison(teamA, teamB, maps) {
  const totalsA = getTeamTotalsBase()
  const totalsB = getTeamTotalsBase()

  safeArr(maps).forEach(map => {
    if (!map.hasResult) return
    if (map.winnerSide === 'A') totalsA.mapWins += 1
    if (map.winnerSide === 'B') totalsB.mapWins += 1
    map.teamAStats.forEach(row => addRowToTotals(totalsA, row))
    map.teamBStats.forEach(row => addRowToTotals(totalsB, row))
  })

  const rows = TEAM_METRICS.map(metric => {
    const a = totalsA[metric.key]
    const b = totalsB[metric.key]
    const leader = metric.lowerIsBetter
      ? a < b ? 'A' : b < a ? 'B' : ''
      : a > b ? 'A' : b > a ? 'B' : ''
    return {
      ...metric,
      a,
      b,
      aLabel: Number.isFinite(a) ? formatInt(a, '—') : '—',
      bLabel: Number.isFinite(b) ? formatInt(b, '—') : '—',
      leader
    }
  })

  return {
    teamA,
    teamB,
    totalsA,
    totalsB,
    rows
  }
}

function getMatchWinnerSide(match) {
  const scoreA = toFiniteNumber(match?.team_a?.score, NaN)
  const scoreB = toFiniteNumber(match?.team_b?.score, NaN)
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return ''
  if (scoreA > scoreB) return 'A'
  if (scoreB > scoreA) return 'B'
  return ''
}

function buildSeriesPath(maps) {
  return safeArr(maps).map(map => ({
    key: map.key,
    order: map.order,
    orderLabel: map.orderLabel,
    name: map.name,
    type: map.type || 'MAP',
    score: `${map.scoreA} : ${map.scoreB}`,
    winnerSide: map.winnerSide,
    winner: map.winnerTeam?.short || map.winnerLabel || '',
    complete: map.hasResult
  }))
}

function getLongestMap(maps) {
  return safeArr(maps)
    .filter(map => map.durationSeconds > 0)
    .sort((a, b) => b.durationSeconds - a.durationSeconds)[0] || null
}

function getClosestMap(maps) {
  return safeArr(maps)
    .filter(map => map.hasResult && Number.isFinite(Number(map.scoreA)) && Number.isFinite(Number(map.scoreB)))
    .sort((a, b) => Math.abs(Number(a.scoreA) - Number(a.scoreB)) - Math.abs(Number(b.scoreA) - Number(b.scoreB)))[0] || null
}

function buildMapTypeResults(maps, teamA, teamB) {
  const groups = new Map()

  safeArr(maps).forEach(map => {
    const type = cleanText(map.type)
    if (!type || !map.hasResult) return
    if (!groups.has(type)) groups.set(type, { type, a: 0, b: 0 })
    const group = groups.get(type)
    if (map.winnerSide === 'A') group.a += 1
    if (map.winnerSide === 'B') group.b += 1
  })

  return [...groups.values()].map(group => ({
    key: group.type,
    label: group.type,
    value: `${teamA.short} ${group.a} : ${group.b} ${teamB.short}`
  }))
}

function getPeakPlayerKey(row) {
  const playerKey = cleanText(row?.playerId) || cleanText(row?.rawName) || cleanText(row?.displayName)
  return `${row?.side || ''}:${normalizeKey(row?.teamId)}:${normalizeKey(playerKey)}`
}

function addPeakRow(groups, row, team) {
  const key = getPeakPlayerKey(row)
  if (!key.replace(/:/g, '')) return

  if (!groups.has(key)) {
    groups.set(key, {
      key,
      playerId: cleanText(row?.playerId),
      name: cleanText(row?.displayName || row?.rawName) || 'PLAYER',
      battleTag: cleanText(row?.battleTag),
      teamShort: cleanText(team?.short || row?.teamName || row?.teamId),
      damage: 0,
      healing: 0,
      mitigation: 0
    })
  }

  const group = groups.get(key)
  group.damage += toFiniteNumber(row?.damage)
  group.healing += toFiniteNumber(row?.healing)
  group.mitigation += toFiniteNumber(row?.mitigation)
}

export function getSeriesPeakPlayers(maps, teamA, teamB) {
  const groups = new Map()

  safeArr(maps).forEach(map => {
    safeArr(map?.teamAStats).forEach(row => addPeakRow(groups, row, teamA))
    safeArr(map?.teamBStats).forEach(row => addPeakRow(groups, row, teamB))
  })

  const players = [...groups.values()]
  const getPeak = metric => players
    .filter(player => Number.isFinite(player[metric]) && player[metric] > 0)
    .sort((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name) || a.key.localeCompare(b.key))[0] || null

  return {
    damage: getPeak('damage'),
    healing: getPeak('healing'),
    mitigation: getPeak('mitigation')
  }
}

export function getMatchPeakDamage(maps, teamA, teamB) {
  return getSeriesPeakPlayers(maps, teamA, teamB).damage
}

export function getMatchPeakHealing(maps, teamA, teamB) {
  return getSeriesPeakPlayers(maps, teamA, teamB).healing
}

export function getMatchPeakMitigation(maps, teamA, teamB) {
  return getSeriesPeakPlayers(maps, teamA, teamB).mitigation
}

function buildPeakFact(key, codeKey, labelKey, peak, metric, unit) {
  return {
    key,
    codeKey,
    labelKey,
    value: peak?.name || '\u2014',
    detail: peak ? `${peak.teamShort || '\u2014'} \u00b7 ${formatInt(peak[metric], '\u2014')} ${unit}` : '',
    tone: 'peak'
  }
}

function buildAnalysisFacts({ completedMaps, totalDurationLabel, longestMap, closestMap, seriesPeakPlayers }) {
  return [
    totalDurationLabel ? { key: 'duration', label: '系列赛总时长', en: 'DURATION', value: totalDurationLabel } : null,
    completedMaps.length ? { key: 'maps', label: '总地图数', en: 'MAPS', value: `${completedMaps.length}` } : null,
    longestMap ? { key: 'longest', label: '最长地图', en: 'LONGEST', value: `${longestMap.name} · ${longestMap.matchTime}` } : null,
    closestMap ? { key: 'closest', label: '最接近比分', en: 'CLOSEST', value: `${closestMap.name} · ${closestMap.scoreA}:${closestMap.scoreB}` } : null,
    buildPeakFact('top-damage', 'matchDetail.factTopDamageCode', 'matchDetail.factTopDamage', seriesPeakPlayers?.damage, 'damage', 'DMG'),
    buildPeakFact('top-healing', 'matchDetail.factTopHealingCode', 'matchDetail.factTopHealing', seriesPeakPlayers?.healing, 'healing', 'HEAL'),
    buildPeakFact('top-mitigation', 'matchDetail.factTopMitigationCode', 'matchDetail.factTopMitigation', seriesPeakPlayers?.mitigation, 'mitigation', 'MIT')
  ].filter(Boolean).map(fact => {
    const staticKeys = {
      duration: { codeKey: 'matchDetail.factDurationCode', labelKey: 'matchDetail.factDuration' },
      maps: { codeKey: 'matchDetail.factMapsCode', labelKey: 'matchDetail.factMaps' },
      longest: { codeKey: 'matchDetail.factLongestCode', labelKey: 'matchDetail.factLongest' },
      closest: { codeKey: 'matchDetail.factClosestCode', labelKey: 'matchDetail.factClosest' }
    }
    const valueOverrides = {
      longest: longestMap ? `${longestMap.name} \u00b7 ${longestMap.matchTime}` : '',
      closest: closestMap ? `${closestMap.name} \u00b7 ${closestMap.scoreA}:${closestMap.scoreB}` : ''
    }

    return staticKeys[fact.key]
      ? { ...fact, ...staticKeys[fact.key], ...(valueOverrides[fact.key] ? { value: valueOverrides[fact.key] } : {}) }
      : fact
  })
}

function getAdjacentMatches(matches, match) {
  const sorted = sortMatchesBySchedule(matches)
  const index = sorted.findIndex(row => matchIdValues(row).some(id => matchIdValues(match).includes(id)))
  return {
    previous: index > 0 ? sorted[index - 1] : null,
    next: index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null
  }
}

export function getMatchDossier(db, matchId, { locale = 'zh-CN' } = {}) {
  const match = getMatchById(db, matchId)
  if (!match) return null

  const state = getMatchState(match)
  const playerDirectory = createPlayerDirectory(db)
  const teamA = getTeamModel(match?.team_a, 'A')
  const teamB = getTeamModel(match?.team_b, 'B')
  const players = safeArr(db?.players)
  const maps = safeArr(match?.maps).map((map, index) => {
    const normalizedMap = normalizeMap(map, match, playerDirectory, index, locale)
    if (!state.canShowResults || state.isForfeit || !normalizedMap.hasResult || !normalizedMap.hasStats) {
      return normalizedMap
    }
    return {
      ...normalizedMap,
      rating: getMatchRatingSummary(match, [normalizedMap.raw], players)
    }
  })
  const completedMaps = maps.filter(map => map.hasResult && map.hasStats)
  const displayMaps = state.canShowResults ? completedMaps : maps.filter(map => map.hasProvidedInfo)
  const mapRecords = state.isForfeit ? [] : displayMaps
  const allDurationsPresent = completedMaps.length > 0 && completedMaps.every(map => map.durationSeconds > 0)
  const totalDurationSeconds = allDurationsPresent
    ? completedMaps.reduce((sum, map) => sum + map.durationSeconds, 0)
    : 0
  const totalDurationLabel = totalDurationSeconds ? formatDuration(totalDurationSeconds) : ''
  const comparison = buildTeamComparison(teamA, teamB, completedMaps)
  const seriesPath = buildSeriesPath(mapRecords)
  const mapTypeResults = buildMapTypeResults(completedMaps, teamA, teamB)
  const seriesPeakPlayers = getSeriesPeakPlayers(completedMaps, teamA, teamB)
  const rating = state.canShowResults && !state.isForfeit
    ? getMatchRatingSummary(match, completedMaps.map(map => map.raw), players)
    : {
        supported: false,
        level: 'match',
        formulaSource: 'ratingModel.v1',
        topEntries: [],
        roleLeaders: {},
        entries: []
      }
  const longestMap = getLongestMap(completedMaps)
  const closestMap = getClosestMap(completedMaps)
  const analysisFacts = buildAnalysisFacts({
    completedMaps,
    totalDurationLabel,
    longestMap,
    closestMap,
    seriesPeakPlayers
  })
  const adjacent = getAdjacentMatches(safeArr(db?.matches), match)
  const mapCountLabel = state.canShowResults && !state.isForfeit
    ? `${completedMaps.length} / ${maps.length || completedMaps.length}`
    : maps.length ? `${maps.length}` : '—'
  const isGroupStage = cleanText(match?.stage).toUpperCase() === 'GROUP'
  const groupLabel = getMatchGroupLabel(match)
  const competitionDay = getMatchCompetitionDay(match)
  const stageLabel = isGroupStage
    ? (groupLabel ? `${groupLabel} 组小组赛` : '小组赛')
    : cleanText(match?.stage) || '—'
  const roundLabel = isGroupStage && competitionDay > 0
    ? `第 ${competitionDay} 比赛日`
    : cleanText(match?.round) || '—'
  const roundText = getRoundText(match)

  return {
    match,
    state,
    teamA,
    teamB,
    title: `${teamA.short} vs ${teamB.short}`,
    fullTitle: `${teamA.full} vs ${teamB.full}`,
    broadcast: getBroadcastInfo(match),
    breadcrumb: isGroupStage ? [stageLabel, roundLabel] : [match?.stage, match?.round].map(cleanText).filter(Boolean),
    stageLabel,
    roundLabel,
    roundText,
    scheduleLabel: getScheduleLabel(match, locale),
    scheduleCompact: formatMatchSchedule(match, { locale }).compact,
    statusLabel: state.isForfeit ? '弃权' : getMatchStatusText(match),
    statusEn: state.isComplete ? 'COMPLETED' : state.isLive ? 'LIVE' : state.isCancelled ? 'CANCELLED' : state.isPostponed ? 'POSTPONED' : 'PENDING',
    scoreLabel: state.canShowResults ? `${formatScore(match?.team_a?.score)} : ${formatScore(match?.team_b?.score)}` : 'VS',
    winnerSide: getMatchWinnerSide(match),
    hasSeriesScore: state.canShowResults,
    mapCountLabel,
    totalDurationLabel,
    internalId: cleanText(match?.match_id || match?.raw_match_id),
    rawDisplayName: cleanText(match?.match_display_name),
    metaItems: [
      { key: 'stage', label: '阶段', en: 'STAGE', value: stageLabel },
      { key: 'round', label: '轮次', en: 'ROUND', value: roundLabel },
      { key: 'format', label: '赛制', en: 'FORMAT', value: cleanText(match?.format) || '—' },
      { key: 'status', label: '状态', en: 'STATUS', value: state.isForfeit ? '弃权' : getMatchStatusText(match), accent: true },
      { key: 'maps', label: '地图', en: 'MAPS', value: mapCountLabel },
      ...(totalDurationSeconds ? [{ key: 'duration', label: '系列赛总时长', en: 'DURATION', value: formatDuration(totalDurationSeconds) }] : [])
    ],
    maps,
    completedMaps,
    mapRecords,
    hasMapRecords: mapRecords.length > 0,
    seriesPath,
    comparison,
    rating,
    topRatedPlayer: rating.topEntries?.[0] || null,
    roleLeaders: rating.roleLeaders || {},
    mapTypeResults,
    seriesPeakPlayers,
    analysisFacts,
    rosters: {
      teamA: getRosterForTeam(db, match?.team_a),
      teamB: getRosterForTeam(db, match?.team_b)
    },
    statusNote: cleanText(match?.schedule_note || match?.note || match?.notes || match?.ruling?.note || match?.ruling?.reason),
    adjacent
  }
}

export function getValidMapOrder(dossier, value) {
  const requested = Number(value)
  const maps = safeArr(dossier?.mapRecords)
  if (!maps.length) return 0
  if (Number.isFinite(requested) && maps.some(map => map.order === requested)) return requested
  return maps[0].order
}

export function getMatchPath(match) {
  return match?.match_id ? `/matches/${match.match_id}` : '/matches'
}

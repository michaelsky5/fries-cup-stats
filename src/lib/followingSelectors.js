import { getSeasonRules } from '../config/seasons.js'
import {
  getPlayerDisplayName,
  getPlayerBattleTag,
  getPlayerFavoriteId,
  getPlayerIdentityValues,
  getTeamFavoriteId,
  getTeamFullName,
  getTeamIdentityValues,
  getTeamRouteId,
  getTeamShortName,
  identityMatches,
  sanitizeFavoritesForSeason
} from '../features/favorites/favoritesSelectors.js'
import { formatMatchSchedule } from './scheduleFormat.js'
import { calculateSwissStandings } from './swissEngine.js'
import { getOwHeroCanonicalKey, getOwHeroCanonicalName } from './heroes.js'
import { getRoundText } from './matchesSelectors.js'
import { getPlayerDirectory } from './rosterSelectors.js'

const safeArr = value => Array.isArray(value) ? value : []
const SHANGHAI_TZ = 'Asia/Shanghai'

function normalize(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return normalize(value).toLowerCase()
}

function uniqueCanonicalHeroes(values, limit = 3) {
  const seen = new Set()

  return safeArr(values).reduce((acc, value) => {
    if (acc.length >= limit) return acc
    const key = getOwHeroCanonicalKey(value)
    if (!key || seen.has(key)) return acc
    seen.add(key)
    acc.push(getOwHeroCanonicalName(value))
    return acc
  }, [])
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getMatchTime(match) {
  const value = match?.scheduled_at || match?.scheduledAt || match?.schedule?.scheduled_at
  const timestamp = value ? new Date(value).getTime() : NaN
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

function formatMatchClock(match, locale = 'zh-CN') {
  const value = match?.scheduled_at || match?.scheduledAt || match?.schedule?.scheduled_at
  if (!value) return locale === 'en-US' ? 'TBD' : '待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return locale === 'en-US' ? 'TBD' : '待定'
  return new Intl.DateTimeFormat(locale, {
    timeZone: SHANGHAI_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function isCompletedMatch(match) {
  const status = normalize(match?.status).toUpperCase()
  return status === 'COMPLETE' || status === 'COMPLETED'
}

function isActiveMatch(match) {
  const status = normalize(match?.status).toUpperCase()
  return status === 'LIVE' || status === 'IN_PROGRESS'
}

function getStatusLabel(match) {
  if (isCompletedMatch(match)) return '已结束'
  if (isActiveMatch(match)) return '进行中'
  const status = normalize(match?.status).toUpperCase()
  if (status === 'CANCELLED') return '已取消'
  return '未开始'
}

function getMatchScore(match) {
  const scoreA = match?.team_a?.score
  const scoreB = match?.team_b?.score
  const left = scoreA === '' || scoreA === null || scoreA === undefined ? '-' : scoreA
  const right = scoreB === '' || scoreB === null || scoreB === undefined ? '-' : scoreB
  return `${left} : ${right}`
}

function getRoundLabel(match) {
  return getRoundText(match)
}

function buildTeamIndex(db) {
  const entries = []
  safeArr(db?.teams).forEach(team => {
    const canonicalId = getTeamFavoriteId(team)
    if (!canonicalId) return
    getTeamIdentityValues(team).forEach(identity => {
      entries.push([normalizeKey(identity), team])
    })
  })
  return new Map(entries)
}

function buildPlayerIndex(db) {
  const entries = []
  safeArr(db?.players).forEach(player => {
    const canonicalId = getPlayerFavoriteId(player)
    if (!canonicalId) return
    getPlayerIdentityValues(player).forEach(identity => {
      entries.push([normalizeKey(identity), player])
    })
  })
  return new Map(entries)
}

function findTeam(db, teamOrId) {
  if (!teamOrId) return null
  if (typeof teamOrId === 'object' && (teamOrId.team_id || teamOrId.id || teamOrId.team_short_name || teamOrId.short)) {
    const direct = safeArr(db?.teams).find(team => identityMatches(getTeamFavoriteId(teamOrId), getTeamIdentityValues(team)))
    return direct || teamOrId
  }
  return buildTeamIndex(db).get(normalizeKey(teamOrId)) || null
}

function findPlayer(db, playerOrId) {
  if (!playerOrId) return null
  if (typeof playerOrId === 'object' && (playerOrId.player_id || playerOrId.id)) return playerOrId
  return buildPlayerIndex(db).get(normalizeKey(playerOrId)) || null
}

function getTeamIds(teamOrId, db) {
  const team = findTeam(db, teamOrId)
  if (team) return getTeamIdentityValues(team)
  return [normalize(teamOrId)].filter(Boolean)
}

function matchHasTeam(match, teamOrId, db) {
  const identities = getTeamIds(teamOrId, db)
  return identities.some(identity => (
    identityMatches(identity, [match?.team_a?.id, match?.team_a?.short, match?.team_a?.name]) ||
    identityMatches(identity, [match?.team_b?.id, match?.team_b?.short, match?.team_b?.name])
  ))
}

function getMatchTeam(match, side, db) {
  const source = side === 'b' ? match?.team_b : match?.team_a
  const team = findTeam(db, source?.id || source?.short || source?.name) || source || {}
  return {
    ...team,
    id: getTeamFavoriteId(team) || source?.id || source?.short || '',
    routeId: getTeamRouteId(team) || source?.id || source?.short || '',
    short: source?.short || getTeamShortName(team),
    full: source?.name || getTeamFullName(team),
    score: source?.score
  }
}

function getOpponent(match, teamOrId, db) {
  const teamA = getMatchTeam(match, 'a', db)
  const teamB = getMatchTeam(match, 'b', db)
  const ids = getTeamIds(teamOrId, db)
  const isA = ids.some(id => identityMatches(id, [teamA.id, teamA.short, teamA.full]))
  return isA ? teamB : teamA
}

function buildMatchSnapshot(match, teamOrId, db) {
  if (!match) return null

  const teamA = getMatchTeam(match, 'a', db)
  const teamB = getMatchTeam(match, 'b', db)
  const opponent = teamOrId ? getOpponent(match, teamOrId, db) : null
  const schedule = formatMatchSchedule(match, { locale: 'zh-CN', includeWeekday: true })
  const ownIdentities = teamOrId ? getTeamIds(teamOrId, db) : []
  const ownSide = ownIdentities.some(id => identityMatches(id, [teamA.id, teamA.short, teamA.full]))
    ? 'a'
    : ownIdentities.some(id => identityMatches(id, [teamB.id, teamB.short, teamB.full]))
      ? 'b'
      : null
  const ownScore = ownSide === 'a' ? toNumber(teamA.score) : ownSide === 'b' ? toNumber(teamB.score) : null
  const opponentScore = ownSide === 'a' ? toNumber(teamB.score) : ownSide === 'b' ? toNumber(teamA.score) : null
  const resultText = ownScore === null || opponentScore === null
    ? ''
    : ownScore > opponentScore ? '胜' : ownScore < opponentScore ? '负' : '平'

  return {
    match,
    matchId: match.match_id || match.raw_match_id,
    teamA,
    teamB,
    opponent,
    ownSide,
    schedule,
    timeLabel: schedule.label,
    compactTime: schedule.compact,
    stageLabel: getRoundLabel(match),
    format: normalize(match?.format || 'FT2'),
    statusLabel: getStatusLabel(match),
    score: getMatchScore(match),
    resultText
  }
}

function compareMatches(a, b) {
  const timeDiff = getMatchTime(a) - getMatchTime(b)
  if (timeDiff !== 0) return timeDiff
  return normalize(a?.match_id).localeCompare(normalize(b?.match_id))
}

export function getPrimaryFavoriteTeam(db, favorites) {
  const clean = sanitizeFavoritesForSeason(favorites, db)
  if (!clean.primaryTeamId) return null
  return findTeam(db, clean.primaryTeamId)
}

export function getNextMatchForTeam(db, teamOrId) {
  if (!teamOrId) return null
  const now = Date.now()

  return (safeArr(db?.matches)
    .filter(match => matchHasTeam(match, teamOrId, db))
    .filter(match => !isCompletedMatch(match) && getMatchTime(match) >= now - 60 * 60 * 1000)
    .sort(compareMatches))[0] || null
}

export function getLatestFinishedMatchForTeam(db, teamOrId) {
  if (!teamOrId) return null

  return (safeArr(db?.matches)
    .filter(match => matchHasTeam(match, teamOrId, db))
    .filter(isCompletedMatch)
    .sort((a, b) => getMatchTime(b) - getMatchTime(a)))[0] || null
}

export function getTeamAdvanceSnapshot(db, teamOrId, season) {
  const team = findTeam(db, teamOrId)
  const teamId = getTeamFavoriteId(team) || normalize(teamOrId)
  const standings = calculateSwissStandings(db)
  const row = standings.find(item => identityMatches(teamId, getTeamIdentityValues(item)))
  const rules = getSeasonRules(season, db)
  const slots = rules?.advancement?.totalSlots || 8

  if (!row || !row.matches_played) {
    const finalRank = toNumber(team?.final_rank)
    if (finalRank) {
      return {
        label: team?.final_rank_text || `第 ${finalRank} 名`,
        rank: finalRank,
        zone: finalRank <= slots ? '晋级区' : '赛季排名',
        played: true
      }
    }

    return {
      label: '暂无',
      rank: null,
      zone: '积分未生成',
      played: false
    }
  }

  const zone = row.rank <= slots
    ? '晋级区'
    : row.rank <= slots + 8
      ? '竞争区'
      : '危险区'

  return {
    ...row,
    label: `第 ${row.rank} 名`,
    rank: row.rank,
    zone,
    played: true
  }
}

export function getPrimaryTeamOverview(db, favorites, season) {
  const team = getPrimaryFavoriteTeam(db, favorites)
  if (!team) return null

  const teamId = getTeamFavoriteId(team)
  const nextMatch = getNextMatchForTeam(db, teamId)
  const latestMatch = getLatestFinishedMatchForTeam(db, teamId)
  const advance = getTeamAdvanceSnapshot(db, teamId, season)
  const hasPendingMatch = safeArr(db?.matches).some(match => !isCompletedMatch(match))

  return {
    team,
    teamId,
    teamRouteId: getTeamRouteId(team),
    shortName: getTeamShortName(team),
    fullName: getTeamFullName(team),
    nextMatch: buildMatchSnapshot(nextMatch, teamId, db),
    latestResult: buildMatchSnapshot(latestMatch, teamId, db),
    advance,
    seasonFinished: !hasPendingMatch,
    finalRankText: team?.final_rank_text || advance.label
  }
}

export function getFavoriteTeamsOverview(db, favorites, season) {
  const clean = sanitizeFavoritesForSeason(favorites, db)
  return clean.favoriteTeamIds
    .map((teamId, index) => {
      const team = findTeam(db, teamId)
      if (!team) return null
      return {
        team,
        teamId: getTeamFavoriteId(team),
        teamRouteId: getTeamRouteId(team),
        shortName: getTeamShortName(team),
        fullName: getTeamFullName(team),
        order: index,
        isPrimary: clean.primaryTeamId === getTeamFavoriteId(team),
        nextMatch: buildMatchSnapshot(getNextMatchForTeam(db, team), team, db),
        latestResult: buildMatchSnapshot(getLatestFinishedMatchForTeam(db, team), team, db),
        advance: getTeamAdvanceSnapshot(db, team, season)
      }
    })
    .filter(Boolean)
}

function dateFromKey(dateKey) {
  const [year, month, day] = normalize(dateKey).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(Date.UTC(year, month - 1, day))
}

function dateKeyFromDate(date) {
  if (!date) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, days) {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function getMatchDateKey(match) {
  if (match?.scheduled_date) return normalize(match.scheduled_date)
  const value = match?.scheduled_at || match?.scheduledAt
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(date)
}

function getWeekendStartKey(dateKey) {
  const date = dateFromKey(dateKey)
  if (!date) return ''
  const day = date.getUTCDay()
  if (day === 4) return dateKeyFromDate(addDays(date, 2))
  if (day === 5) return dateKeyFromDate(addDays(date, 1))
  if (day === 0) return dateKey
  if (day === 1) return dateKeyFromDate(addDays(date, -1))
  if (day === 2) return dateKeyFromDate(addDays(date, -2))
  return dateKey
}

function formatMonthDay(dateKey) {
  return normalize(dateKey).slice(5).replace('-', '-')
}

function formatBoardMonthDay(dateKey) {
  return normalize(dateKey).slice(5).replace('-', '.')
}

function formatDateRangeLabel(startDate, endDate, formatter) {
  const startLabel = formatter(startDate)
  const endLabel = formatter(endDate)
  return startDate === endDate ? startLabel : `${startLabel} — ${endLabel}`
}

function formatDateGroupLabel(dateKey, locale = 'zh-CN') {
  const date = dateFromKey(dateKey)
  if (!date) return locale === 'en-US' ? 'TBD' : '待定'
  if (locale === 'en-US') {
    const month = new Intl.DateTimeFormat('en-US', {
      timeZone: SHANGHAI_TZ,
      month: 'short'
    }).format(date).toUpperCase()
    const day = new Intl.DateTimeFormat('en-US', {
      timeZone: SHANGHAI_TZ,
      day: '2-digit'
    }).format(date)
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: SHANGHAI_TZ,
      weekday: 'short'
    }).format(date).toUpperCase()
    return `${month} ${day} ${weekday}`
  }

  const [month, day] = normalize(dateKey).slice(5).split('-')
  const weekday = new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI_TZ,
    weekday: 'short'
  }).format(date)
  return `${month}/${day} ${weekday}`
}

function formatRoundNumberLabel(matches, fallback = '') {
  const raw = normalize(fallback || getRoundLabel(safeArr(matches)[0])).toUpperCase()
  const match = raw.match(/\d+/)
  if (!match) return raw || 'ROUND'
  return `ROUND ${String(Number(match[0])).padStart(2, '0')}`
}

function formatStageBoardLabel(matches) {
  const stage = normalize(safeArr(matches)[0]?.stage).toUpperCase()
  if (!stage) return ''
  if (stage === 'SWISS') return 'SWISS STAGE'
  return `${stage} STAGE`
}

function getWeekRoundLabel(matches) {
  const rounds = Array.from(new Set(safeArr(matches).map(getRoundLabel).filter(Boolean)))
  if (!rounds.length) return '比赛周'
  if (rounds.length === 1) return rounds[0]
  return `${rounds[0]} 等 ${rounds.length} 个阶段`
}

function buildMatchWeeks(db) {
  const groups = new Map()

  safeArr(db?.matches).forEach(match => {
    const dateKey = getMatchDateKey(match)
    const startKey = getWeekendStartKey(dateKey)
    const startDate = dateFromKey(startKey)
    if (!startKey || !startDate) return

    if (!groups.has(startKey)) {
      groups.set(startKey, {
        key: startKey,
        startDate: dateKey,
        endDate: dateKey,
        matches: []
      })
    }
    const group = groups.get(startKey)
    group.matches.push(match)
    if (dateKey < group.startDate) group.startDate = dateKey
    if (dateKey > group.endDate) group.endDate = dateKey
  })

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      matches: group.matches.sort(compareMatches),
      hasPending: group.matches.some(match => !isCompletedMatch(match)),
      startTime: dateFromKey(group.startDate)?.getTime() || 0,
      endTime: dateFromKey(group.endDate)?.getTime() || 0
    }))
    .sort((a, b) => a.startTime - b.startTime)
}

function favoriteMatchOrder(match, cleanFavorites) {
  const orderMap = new Map(cleanFavorites.favoriteTeamIds.map((id, index) => [normalizeKey(id), index]))
  const ids = [match?.team_a?.id, match?.team_a?.short, match?.team_b?.id, match?.team_b?.short]

  const indexes = ids
    .map(id => orderMap.get(normalizeKey(id)))
    .filter(index => Number.isInteger(index))
  return indexes.length ? Math.min(...indexes) : 1000
}

export function sortFollowingMatches(matches, cleanFavorites) {
  return safeArr(matches).sort((a, b) => {
    const timeDiff = getMatchTime(a) - getMatchTime(b)
    if (timeDiff !== 0) return timeDiff
    const favoriteDiff = favoriteMatchOrder(a, cleanFavorites) - favoriteMatchOrder(b, cleanFavorites)
    if (favoriteDiff !== 0) return favoriteDiff
    return normalize(a?.match_id).localeCompare(normalize(b?.match_id))
  })
}

export function getFavoriteMatchesForMatchWeek(db, favorites, week) {
  const clean = sanitizeFavoritesForSeason(favorites, db)
  if (!week || clean.favoriteTeamIds.length === 0) return []

  return sortFollowingMatches(
    safeArr(week.matches).filter(match => clean.favoriteTeamIds.some(teamId => matchHasTeam(match, teamId, db))),
    clean
  )
    .map(match => ({
      ...buildMatchSnapshot(match, null, db),
      isPrimaryMatch: matchHasTeam(match, clean.primaryTeamId, db)
    }))
}

export function groupFollowingMatchesByTime(matches, locale = 'zh-CN') {
  const groups = new Map()

  safeArr(matches).forEach(match => {
    const timeKey = formatMatchClock(match.match || match, locale)
    if (!groups.has(timeKey)) {
      groups.set(timeKey, {
        key: timeKey,
        timeLabel: timeKey,
        matches: []
      })
    }
    groups.get(timeKey).matches.push(match)
  })

  return Array.from(groups.values())
}

export function groupFollowingMatchesByDate(matches, locale = 'zh-CN') {
  const groups = new Map()

  safeArr(matches).forEach(match => {
    const source = match.match || match
    const dateKey = getMatchDateKey(source) || 'unscheduled'
    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        key: dateKey,
        dateLabel: dateKey === 'unscheduled'
          ? locale === 'en-US' ? 'TBD' : '时间待定'
          : formatDateGroupLabel(dateKey, locale),
        matches: []
      })
    }
    groups.get(dateKey).matches.push(match)
  })

  return Array.from(groups.values()).map(group => {
    const numberedMatches = group.matches.map((match, index) => ({
      ...match,
      displayIndex: String(index + 1).padStart(2, '0')
    }))

    return {
      ...group,
      matches: numberedMatches,
      timeGroups: groupFollowingMatchesByTime(numberedMatches, locale)
    }
  })
}

export function getFollowingMatchWeekGroups(matches, locale = 'zh-CN') {
  return groupFollowingMatchesByDate(matches, locale)
}

export function getFavoriteMatchWeek(db, favorites, locale = 'zh-CN') {
  const weeks = buildMatchWeeks(db)
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  const today = dateFromKey(todayKey)?.getTime() || Date.now()

  const currentWeek = weeks.find(week => week.startTime <= today && today <= week.endTime)
  const nextUnfinishedWeek = weeks.find(week => week.hasPending && week.endTime >= today)
  const latestFinishedWeek = [...weeks].reverse().find(week => !week.hasPending) || weeks[weeks.length - 1]
  const selected = currentWeek || nextUnfinishedWeek || latestFinishedWeek || null

  if (!selected) return null

  const favoriteMatches = getFavoriteMatchesForMatchWeek(db, favorites, selected)
  const visibleMatches = favoriteMatches.slice(0, 6)
  const roundBoardLabel = formatRoundNumberLabel(selected.matches, getWeekRoundLabel(selected.matches))
  const stageBoardLabel = formatStageBoardLabel(selected.matches)
  return {
    ...selected,
    dateRangeLabel: formatDateRangeLabel(selected.startDate, selected.endDate, formatMonthDay),
    boardDateRangeLabel: formatDateRangeLabel(selected.startDate, selected.endDate, formatBoardMonthDay),
    roundLabel: getWeekRoundLabel(selected.matches),
    roundBoardLabel,
    dateGroupMetaLabel: [roundBoardLabel, stageBoardLabel].filter(Boolean).join(' / '),
    favoriteMatches,
    visibleMatches,
    matchGroups: getFollowingMatchWeekGroups(visibleMatches, locale),
    totalFavoriteMatches: favoriteMatches.length,
    hasMore: favoriteMatches.length > 6
  }
}

function getPlayerTotal(db, player) {
  const playerId = getPlayerFavoriteId(player)
  return safeArr(db?.player_totals).find(total => getPlayerFavoriteId(total) === playerId) || null
}

function getPlayerRecentLog(player) {
  return ([
    ...safeArr(player?.live_match_logs),
    ...safeArr(player?.match_logs),
    ...safeArr(player?.historical_match_logs)
  ]
    .filter(log => log?.matchId || log?.rawMatchId)
    .sort((a, b) => normalize(b.matchId || b.rawMatchId).localeCompare(normalize(a.matchId || a.rawMatchId))))[0] || null
}

function formatStat(value, suffix = '') {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '暂无'
  if (number >= 1000) return `${Math.round(number).toLocaleString('zh-CN')}${suffix}`
  return `${Number.isInteger(number) ? number : number.toFixed(1)}${suffix}`
}

function getRoleCoreMetric(player, total) {
  const role = normalize(player?.role || total?.role).toUpperCase()
  if (!total || Number(total.maps_played || 0) <= 0) {
    return {
      label: role === 'SUP' ? '场均治疗' : role === 'TANK' ? '场均承伤' : '场均淘汰',
      value: '比赛开始后更新'
    }
  }

  if (role === 'TANK') {
    const block = Number(total.avg_block || total.total_block)
    if (block > 0) return { label: '场均承伤', value: formatStat(total.avg_block || block) }
    return { label: '场均阵亡', value: formatStat(total.avg_dth) }
  }

  if (role === 'SUP') {
    const heal = Number(total.avg_heal || total.total_heal)
    if (heal > 0) return { label: '场均治疗', value: formatStat(total.avg_heal || heal) }
    return { label: '场均助攻', value: formatStat(total.avg_ast) }
  }

  const damage = Number(total.avg_dmg || total.total_dmg)
  if (damage > 0) return { label: '场均伤害', value: formatStat(total.avg_dmg || damage) }
  return { label: '场均淘汰', value: formatStat(total.avg_elim) }
}

export function getPlayerRecentSnapshot(db, playerOrId) {
  const player = findPlayer(db, playerOrId)
  if (!player) return null

  const total = getPlayerTotal(db, player)
  const recentLog = getPlayerRecentLog(player)
  const hasTotals = Number(total?.maps_played || 0) > 0
  const coreMetric = getRoleCoreMetric(player, total)

  if (recentLog?.matchId) {
    const recentHero = getOwHeroCanonicalName(recentLog.hero)

    return {
      mode: 'recent',
      label: recentLog.matchDisplayName || recentLog.matchId,
      mapsPlayed: total?.maps_played || '',
      heroes: uniqueCanonicalHeroes([recentLog.hero, ...(total?.top_3_heroes || [])]),
      summary: recentLog.mapName ? `${recentLog.mapName} · ${recentHero || '英雄未记录'}` : '最近比赛记录',
      coreMetric,
      total
    }
  }

  if (hasTotals) {
    const mostPlayedHero = getOwHeroCanonicalName(total.most_played_hero)

    return {
      mode: 'season',
      label: '赛季累计',
      mapsPlayed: total.maps_played,
      heroes: uniqueCanonicalHeroes(total.top_3_heroes),
      summary: `${total.maps_played} 张地图 · ${mostPlayedHero || '英雄未记录'}`,
      coreMetric,
      total
    }
  }

  return {
    mode: 'profile',
    label: '暂无比赛数据',
    mapsPlayed: '',
    heroes: [],
    summary: '',
    coreMetric,
    total
  }
}

export function getFavoritePlayersOverview(db, favorites) {
  const clean = sanitizeFavoritesForSeason(favorites, db)
  const resolvedPlayers = getPlayerDirectory(db)
  const resolvedPlayerIndex = new Map()
  resolvedPlayers.forEach(player => {
    getPlayerIdentityValues(player).forEach(identity => {
      const key = normalizeKey(identity)
      if (key && !resolvedPlayerIndex.has(key)) resolvedPlayerIndex.set(key, player)
    })
  })

  return clean.favoritePlayerIds
    .map((playerId, index) => {
      const player = resolvedPlayerIndex.get(normalizeKey(playerId)) || findPlayer(db, playerId)
      if (!player) return null
      return {
        player,
        playerId: getPlayerFavoriteId(player),
        displayName: getPlayerDisplayName(player),
        battleTag: getPlayerBattleTag(player),
        team: findTeam(db, player.team_id || player.team_short_name),
        teamShortName: player.team_short_name || getTeamShortName(findTeam(db, player.team_id)),
        role: player.role || 'FLEX',
        order: index,
        snapshot: getPlayerRecentSnapshot(db, player)
      }
    })
    .filter(Boolean)
}

export { sanitizeFavoritesForSeason }

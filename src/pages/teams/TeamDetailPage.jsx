import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import RosterSubnav from '../../components/roster/RosterSubnav.jsx'
import { getShareHeroArtwork } from '../../features/player-share/heroShareArtworkResolver.js'
import TeamShareDialog from '../../features/team-share/TeamShareDialog.jsx'
import {
  getCompetitiveRoleLabel,
  getCoreRosterSlots,
  getPlayerAvatarSource,
  getPlayerDirectory,
  getPlayerDisplayIdentity,
  getPlayerRoleBreakdown,
  getTeamDirectory,
  getTeamRosterPlayers,
  getRosterRoleLabel,
  normalizeStaffIdentity,
  normalizeRosterRole,
  safeArr
} from '../../lib/rosterSelectors.js'
import {
  getMatchTimeLabel,
  getRoundText,
  isFinishedMatch,
  isLiveMatch,
  isUpcomingMatch,
  sortMatchesBySchedule
} from '../../lib/matchesSelectors.js'
import {
  OW_MAP_MODE_LABELS,
  formatOwHeroName,
  formatOwMapMode,
  formatOwMapName,
  getOwHeroAssetKey,
  getOwHeroCanonicalKey,
  getOwHeroCanonicalName,
  getOwHeroRole,
  getOwMapImageName,
  getOwMapModeFolder
} from '../../lib/heroes.js'
import { getGroupStandings, getSwissStandingsRows } from '../../lib/advanceSelectors.js'
import {
  getRestoreScrollState,
  getRestoreScrollY,
  getReturnState,
  getSafeInternalPath,
  readReturnState,
  restoreWindowScroll,
  saveReturnScroll
} from '../../lib/navigationState.js'
import styles from './TeamDetailPage.module.css'

const TABS = [
  { id: 'overview', label: '战队概览' },
  { id: 'matches', label: '赛程赛果' },
  { id: 'stats', label: '战队数据' }
]

const ADVANCE_SLOTS = 8

const SWISS_STATUS_PRESENTATION = {
  direct: { zone: '晋级区', tone: 'win' },
  breakthrough: { zone: '突围区', tone: 'draw' },
  contending: { zone: '竞争区', tone: 'draw' },
  danger: { zone: '危险区', tone: 'loss' },
  eliminated: { zone: '已出局', tone: 'loss' }
}

const ROLE_ORDER = ['TANK', 'DPS', 'SUP']

const TEAM_COMBAT_METRICS = [
  { id: 'damage', labelZh: '团队伤害', labelEn: 'Team Damage', unit: 'DMG', avgKeys: ['avg_dmg'], totalKeys: ['total_dmg', 'damage'], featured: true },
  { id: 'healing', labelZh: '团队治疗', labelEn: 'Team Healing', unit: 'HEAL', avgKeys: ['avg_heal'], totalKeys: ['total_heal', 'healing'], featured: true },
  { id: 'mitigation', labelZh: '团队减伤', labelEn: 'Team Mitigation', unit: 'MIT', avgKeys: ['avg_block'], totalKeys: ['total_block', 'blocked', 'mitigation'], featured: true },
  { id: 'eliminations', labelZh: '团队击杀', labelEn: 'Team Eliminations', unit: 'ELIM', avgKeys: ['avg_elim'], totalKeys: ['total_elim', 'eliminations'], featured: true },
  { id: 'assists', labelZh: '团队助攻', labelEn: 'Team Assists', unit: 'AST', avgKeys: ['avg_ast', 'avg_assist'], totalKeys: ['total_ast', 'total_assist', 'assists'] },
  { id: 'deaths', labelZh: '团队死亡', labelEn: 'Team Deaths', unit: 'DTH', avgKeys: ['avg_dth', 'avg_death'], totalKeys: ['total_dth', 'total_death', 'deaths'], lowerIsBetter: true }
]

const FALLBACK_MAP_VISUAL = {
  displayName: '漓江塔',
  mode: '控制',
  imageUrl: '/maps/Control/Lijiang_Tower.jpg'
}

const PENDING_MAP_VISUAL = {
  displayName: '比赛后生成',
  mode: '暂无地图数据',
  imageUrl: ''
}

function getMapVisual(map, locale = 'zh-CN') {
  const name = String(map?.map_name || map?.name || '').trim()
  const type = String(map?.map_type || map?.type || '').trim()
  if (!name || !type || type.toUpperCase() === 'UNKNOWN') return FALLBACK_MAP_VISUAL

  return {
    name,
    type,
    displayName: formatOwMapName(name, locale),
    mode: formatOwMapMode(type, locale),
    imageUrl: `/maps/${getOwMapModeFolder(type)}/${getOwMapImageName(name)}.jpg`
  }
}

function isKnownMapType(type) {
  const value = String(type || '').trim()
  return Boolean(value) && value.toUpperCase() !== 'UNKNOWN'
}

function hasScoreValue(value) {
  const text = String(value ?? '').trim()
  return text !== '' && Number.isFinite(Number(text))
}

function getMapRoundResult(map, side) {
  if (!hasScoreValue(map?.score_a) || !hasScoreValue(map?.score_b)) {
    return { hasScore: false, tone: 'pending', score: '- : -', mine: 0, other: 0 }
  }

  const scoreA = Number(map.score_a)
  const scoreB = Number(map.score_b)
  const mine = side === 'team_a' ? scoreA : scoreB
  const other = side === 'team_a' ? scoreB : scoreA

  if (mine > other) return { hasScore: true, tone: 'win', score: `${mine} : ${other}`, mine, other }
  if (mine < other) return { hasScore: true, tone: 'loss', score: `${mine} : ${other}`, mine, other }
  return { hasScore: true, tone: 'draw', score: `${mine} : ${other}`, mine, other }
}

function formatMapRecord(wins, losses, draws = 0) {
  return draws ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`
}

function getMatchScheduleTime(match) {
  const raw = match?.scheduled_at ||
    match?.match_date ||
    match?.date ||
    (match?.scheduled_date && match?.scheduled_time ? `${match.scheduled_date}T${match.scheduled_time}:00+08:00` : '')
  const time = raw ? new Date(raw).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

function getRepresentativeMapSpotlight(rows, locale = 'zh-CN') {
  const mapRecords = new Map()
  const typeRecords = new Map()

  rows.filter(row => isFinishedMatch(row.match)).forEach(row => {
    safeArr(row.match?.maps).forEach(map => {
      const name = String(map?.map_name || map?.name || '').trim()
      const type = String(map?.map_type || map?.type || '').trim()
      if (!name || !isKnownMapType(type)) return

      const result = getMapRoundResult(map, row.side)
      if (!result.hasScore) return

      const visual = getMapVisual(map, locale)
      const mapKey = normalizeKey(name)
      const typeKey = normalizeKey(type)

      if (!typeRecords.has(typeKey)) {
        typeRecords.set(typeKey, {
          type,
          mode: visual.mode,
          maps: 0,
          wins: 0,
          losses: 0,
          draws: 0
        })
      }

      if (!mapRecords.has(mapKey)) {
        mapRecords.set(mapKey, {
          ...visual,
          type,
          maps: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          latestTime: 0,
          latestResult: '',
          latestOpponent: '',
          latestRound: '',
          latestScore: '',
          latestTimeLabel: ''
        })
      }

      const typeRecord = typeRecords.get(typeKey)
      const mapRecord = mapRecords.get(mapKey)
      const records = [typeRecord, mapRecord]
      records.forEach(record => {
        record.maps += 1
        if (result.tone === 'win') record.wins += 1
        else if (result.tone === 'loss') record.losses += 1
        else record.draws += 1
      })

      const time = getMatchScheduleTime(row.match)
      if (time >= mapRecord.latestTime) {
        mapRecord.latestTime = time
        mapRecord.latestResult = result.tone === 'win' ? 'WIN' : result.tone === 'loss' ? 'LOSS' : 'DRAW'
        mapRecord.latestOpponent = row.opponentLabel
        mapRecord.latestRound = getMatchRound(row.match)
        mapRecord.latestScore = result.score
        mapRecord.latestTimeLabel = getMatchTimeLabel(row.match)
      }
    })
  })

  const candidates = [...mapRecords.values()]
    .map(record => ({
      ...record,
      hasData: true,
      recordLabel: formatMapRecord(record.wins, record.losses, record.draws),
      winRate: record.maps ? record.wins / record.maps : 0,
      typeRecord: typeRecords.get(normalizeKey(record.type)) || null
    }))
    .sort((a, b) => b.maps - a.maps ||
      b.wins - a.wins ||
      b.latestTime - a.latestTime ||
      compareName(a.displayName, b.displayName))

  if (candidates.length) return candidates[0]

  return {
    ...PENDING_MAP_VISUAL,
    hasData: false,
    maps: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    recordLabel: '-',
    winRate: 0,
    typeRecord: null,
    latestResult: '',
    latestOpponent: '',
    latestRound: '',
    latestScore: '- : -',
    latestTimeLabel: ''
  }
}

function getPlayerName(player) {
  return player?.identity?.primary || player?.display_name || player?.player_name || player?.nickname || player?.player_id || '-'
}

function getPlayerHeroLabel(player, locale = 'zh-CN') {
  return player?.avatar?.heroName ? formatOwHeroName(player.avatar.heroName, locale) : '英雄待定'
}

function getPlayerAvatarSrc(player) {
  return player?.avatar?.candidates?.[0] || ''
}

function getPlayerInitials(player) {
  return player?.avatar?.initials || String(getPlayerName(player)).slice(0, 2).toUpperCase()
}

function getPlayerRosterKey(player) {
  return String(player?.identity?.playerId || player?.player_id || getPlayerName(player))
}

function getDistinctSecondaryName(primary, secondary) {
  const value = String(secondary || '').trim()
  if (!value || normalizeKey(value) === normalizeKey(primary)) return ''
  return value
}

function formatRosterPerformanceValue(value) {
  const number = toNumber(value)
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`
  return Math.round(number).toLocaleString()
}

function getRosterPerformanceMetric(player) {
  const registeredRole = normalizeRosterRole(player?.role)
  const role = registeredRole === 'FLEX'
    ? normalizeRosterRole(player?.performanceRole)
    : registeredRole
  if (role === 'FLEX') return null

  const roleStats = getPlayerRoleBreakdown(player, role)
  const metric = role === 'TANK'
    ? { label: '阻挡 /10', unit: 'MIT', keys: ['avg_block'] }
    : role === 'SUP'
      ? { label: '治疗 /10', unit: 'HEAL', keys: ['avg_heal'] }
      : { label: '伤害 /10', unit: 'DMG', keys: ['avg_dmg'] }
  const value = getPlayerMetric(roleStats || player, metric.keys)

  return value ? { ...metric, valueLabel: formatRosterPerformanceValue(value) } : null
}

function buildSharePlayer(player, locale = 'zh-CN') {
  const artwork = getShareHeroArtwork(player?.avatar?.heroName, player?.role)
  const name = getPlayerName(player)
  const mapsPlayed = Number(player?.maps_played || 0)
  const timeMins = Number(player?.raw_time_mins || 0)

  return {
    id: player?.identity?.playerId || player?.player_id || getPlayerName(player),
    name,
    battleTag: getDistinctSecondaryName(name, player?.identity?.secondary),
    role: getCompetitiveRoleLabel(player?.role, locale),
    roleKey: normalizeRosterRole(player?.role),
    hero: getPlayerHeroLabel(player, locale),
    mapsPlayed,
    timeMins,
    hasAppearance: mapsPlayed > 0 || timeMins > 0,
    avatarSrc: getPlayerAvatarSrc(player),
    initials: getPlayerInitials(player),
    hasArtwork: Boolean(artwork.src || artwork.fallbackSrc || getPlayerAvatarSrc(player)),
    artwork: {
      src: artwork.src,
      fallbackSrc: artwork.fallbackSrc,
      crop: artwork.crop
    }
  }
}

function getResultLabel(row) {
  if (!row) return ''
  if (row.result?.tone === 'win') return 'WIN'
  if (row.result?.tone === 'loss') return 'LOSS'
  if (row.result?.tone === 'draw') return 'DRAW'
  return row.result?.label || 'NEXT'
}

function getShareModel({
  team,
  seasonId,
  featuredMap,
  advanceState,
  matchSummary,
  recentForm,
  focusMatch,
  finishedRows,
  corePlayers,
  rosterPlayers,
  teamLeaders,
  rosterSize,
  locale
}) {
  if (!team) return null

  return {
    seasonId,
    seasonLabel: String(seasonId || 'FRIES CUP').toUpperCase(),
    team: {
      raw: team,
      shortName: team.shortName,
      fullName: team.fullName
    },
    staff: {
      manager: team.staff?.managerLabel || '',
      coach: team.staff?.coachLabel || ''
    },
    rosterSize,
    featuredMap,
    advance: advanceState,
    matchRecord: `${matchSummary.wins}-${matchSummary.losses}`,
    mapRecord: `${matchSummary.mapWins}-${matchSummary.mapLosses}`,
    mapWinRate: `${formatPercent(matchSummary.mapWinRate)} 地图胜率`,
    completedLabel: `${matchSummary.completed} 场已完成`,
    focusMatch: focusMatch ? {
      opponent: focusMatch.opponentLabel,
      result: getResultLabel(focusMatch),
      score: focusMatch.score,
      round: getMatchRound(focusMatch.match),
      time: getMatchTimeLabel(focusMatch.match)
    } : null,
    recentForm,
    latestResults: safeArr(finishedRows).slice(0, 3).map(row => ({
      opponent: row.opponentLabel,
      result: getResultLabel(row),
      score: row.score,
      time: getMatchTimeLabel(row.match)
    })),
    corePlayers: safeArr(corePlayers).slice(0, 5).map(player => buildSharePlayer(player, locale)),
    rosterPlayers: safeArr(rosterPlayers).slice(0, 7).map(player => buildSharePlayer(player, locale)),
    leaders: safeArr(teamLeaders).slice(0, 4).map(item => ({
      label: item.label,
      name: getPlayerName(item.player),
      value: item.valueLabel
    })),
    footerText: 'Generated from official match records'
  }
}

function PlayerPortrait({ player, className = '', decorative = false }) {
  const src = getPlayerAvatarSrc(player)
  const name = getPlayerName(player)
  return (
    <span className={className} aria-hidden={decorative ? 'true' : undefined}>
      {src ? (
        <img
          src={src}
          alt={decorative ? '' : getPlayerHeroLabel(player)}
          loading="lazy"
          onError={event => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <b>{getPlayerInitials(player)}</b>
      )}
      <em className={styles.portraitLabel}>{name}</em>
    </span>
  )
}

function toFiniteScrollY(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function readTeamSourceReturnState(state) {
  const base = readReturnState(state)
  return {
    ...base,
    parentReturnTo: getSafeInternalPath(state?.parentReturnTo),
    parentReturnScrollY: toFiniteScrollY(state?.parentReturnScrollY)
  }
}

function buildTeamBackState(sourceReturnState) {
  const restoreState = getRestoreScrollState(sourceReturnState.returnScrollY) || {}
  const parentState = sourceReturnState.parentReturnTo
    ? {
        returnTo: sourceReturnState.parentReturnTo,
        ...(sourceReturnState.parentReturnScrollY === null ? {} : { returnScrollY: sourceReturnState.parentReturnScrollY })
      }
    : {}
  const state = { ...restoreState, ...parentState }
  return Object.keys(state).length ? state : undefined
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase()
}

function compareName(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'zh-Hans-CN', { numeric: true })
}

function teamIdentitySet(team) {
  return new Set([
    team?.team_id,
    team?.id,
    team?.routeId,
    team?.shortName,
    team?.fullName,
    team?.team_short_name,
    team?.team_name
  ].map(normalizeKey).filter(Boolean))
}

function matchTeamSide(match, teamKeys) {
  const sideValues = side => [
    match?.[side]?.id,
    match?.[side]?.team_id,
    match?.[side]?.short,
    match?.[side]?.name,
    match?.[side]?.team_short_name,
    match?.[side]?.team_name
  ].map(normalizeKey)

  if (sideValues('team_a').some(value => teamKeys.has(value))) return 'team_a'
  if (sideValues('team_b').some(value => teamKeys.has(value))) return 'team_b'
  return ''
}

function getOpponent(match, side) {
  return side === 'team_a' ? match?.team_b : match?.team_a
}

function getOpponentLabel(team) {
  return team?.shortName || team?.short || team?.team_short_name || team?.id || team?.name || team?.team_name || 'TBD'
}

function getOpponentFullName(team, label = '') {
  const fullName = String(team?.fullName || team?.full || team?.team_name || team?.name || '').trim()
  if (!fullName || normalizeKey(fullName) === normalizeKey(label)) return ''
  return fullName
}

function getTeamScore(match, side) {
  const value = match?.[side]?.score
  return toNumber(value)
}

function getMatchResult(match, side) {
  if (!side || isUpcomingMatch(match) || isLiveMatch(match)) return { label: isLiveMatch(match) ? 'LIVE' : 'NEXT', tone: 'pending' }
  const mine = getTeamScore(match, side)
  const other = getTeamScore(match, side === 'team_a' ? 'team_b' : 'team_a')
  if (mine > other) return { label: 'WIN', tone: 'win' }
  if (mine < other) return { label: 'LOSS', tone: 'loss' }
  return { label: 'DRAW', tone: 'draw' }
}

function getMatchScoreText(match, side) {
  if (!side || isUpcomingMatch(match) || isLiveMatch(match)) return '- : -'
  const mine = getTeamScore(match, side)
  const other = getTeamScore(match, side === 'team_a' ? 'team_b' : 'team_a')
  return `${mine} : ${other}`
}

function getMatchRound(match) {
  return getRoundText(match)
}

function getTeamMatchRows(matches, team) {
  const keys = teamIdentitySet(team)
  return sortMatchesBySchedule(matches)
    .map(match => {
      const side = matchTeamSide(match, keys)
      if (!side) return null
      const opponent = getOpponent(match, side)
      const opponentLabel = getOpponentLabel(opponent)
      return {
        match,
        side,
        opponent,
        opponentLabel,
        opponentFullName: getOpponentFullName(opponent, opponentLabel),
        result: getMatchResult(match, side),
        score: getMatchScoreText(match, side)
      }
    })
    .filter(Boolean)
}

function getMatchSummary(rows) {
  const finished = rows.filter(row => isFinishedMatch(row.match))
  let wins = 0
  let losses = 0
  let draws = 0
  let mapWins = 0
  let mapLosses = 0

  finished.forEach(row => {
    if (row.result.tone === 'win') wins += 1
    else if (row.result.tone === 'loss') losses += 1
    else draws += 1

    mapWins += getTeamScore(row.match, row.side)
    mapLosses += getTeamScore(row.match, row.side === 'team_a' ? 'team_b' : 'team_a')
  })

  return {
    wins,
    losses,
    draws,
    mapWins,
    mapLosses,
    completed: finished.length,
    pending: rows.filter(row => isUpcomingMatch(row.match)).length,
    live: rows.filter(row => isLiveMatch(row.match)).length,
    winRate: finished.length ? wins / finished.length : 0,
    mapWinRate: mapWins + mapLosses ? mapWins / (mapWins + mapLosses) : 0
  }
}

function getSeasonLedgerStats(rows, matchSummary) {
  const finished = rows.filter(row => isFinishedMatch(row.match))
  let currentWinStreak = 0
  let longestWinStreak = 0
  let runningWinStreak = 0

  finished.forEach(row => {
    if (row.result.tone === 'win') {
      runningWinStreak += 1
      longestWinStreak = Math.max(longestWinStreak, runningWinStreak)
    } else {
      runningWinStreak = 0
    }
  })

  for (let index = finished.length - 1; index >= 0; index -= 1) {
    if (finished[index].result.tone !== 'win') break
    currentWinStreak += 1
  }

  const sweeps = finished.filter(row => (
    row.result.tone === 'win' &&
    getTeamScore(row.match, row.side === 'team_a' ? 'team_b' : 'team_a') === 0
  )).length
  const mapDifferential = matchSummary.mapWins - matchSummary.mapLosses

  return {
    progress: `${matchSummary.completed}/${rows.length}`,
    mapDifferential: `${mapDifferential > 0 ? '+' : ''}${mapDifferential}`,
    sweeps,
    currentWinStreak,
    longestWinStreak
  }
}

function getMapTypeStats(rows) {
  const stats = new Map()

  rows.filter(row => isFinishedMatch(row.match)).forEach(row => {
    safeArr(row.match?.maps).forEach(map => {
      const type = map?.map_type || map?.type || 'UNKNOWN'
      if (!isKnownMapType(type)) return
      const result = getMapRoundResult(map, row.side)
      if (!result.hasScore) return

      if (!stats.has(type)) stats.set(type, { type, maps: 0, wins: 0, losses: 0, draws: 0 })

      const record = stats.get(type)
      record.maps += 1
      if (result.tone === 'win') record.wins += 1
      else if (result.tone === 'loss') record.losses += 1
      else record.draws += 1
    })
  })

  return [...stats.values()].sort((a, b) => b.maps - a.maps || compareName(a.type, b.type))
}

function getTeamMapPool(rows, locale = 'zh-CN') {
  const records = new Map()

  rows.filter(row => isFinishedMatch(row.match)).forEach(row => {
    safeArr(row.match?.maps).forEach(map => {
      const name = String(map?.map_name || map?.name || '').trim()
      const type = String(map?.map_type || map?.type || '').trim()
      if (!name || !isKnownMapType(type)) return

      const result = getMapRoundResult(map, row.side)
      if (!result.hasScore) return

      const key = normalizeKey(name)
      if (!records.has(key)) {
        records.set(key, {
          ...getMapVisual(map, locale),
          name,
          type,
          maps: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          latestTime: 0,
          latestTone: 'pending',
          latestOpponent: ''
        })
      }

      const record = records.get(key)
      record.maps += 1
      if (result.tone === 'win') record.wins += 1
      else if (result.tone === 'loss') record.losses += 1
      else record.draws += 1

      const time = getMatchScheduleTime(row.match)
      if (time >= record.latestTime) {
        record.latestTime = time
        record.latestTone = result.tone
        record.latestOpponent = row.opponentLabel
      }
    })
  })

  const rowsByStrength = [...records.values()]
    .map(record => ({
      ...record,
      winRate: record.maps ? record.wins / record.maps : 0,
      recordLabel: formatMapRecord(record.wins, record.losses, record.draws)
    }))
    .sort((a, b) => b.maps - a.maps || b.winRate - a.winRate || b.wins - a.wins || compareName(a.displayName, b.displayName))

  const signature = [...rowsByStrength]
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.maps - a.maps || compareName(a.displayName, b.displayName))[0]

  return rowsByStrength.map(record => {
    const isSignature = signature?.name === record.name
    const tag = isSignature
      ? { labelZh: '招牌地图', labelEn: 'Signature', tone: 'signature' }
      : record.maps < 2
        ? { labelZh: '待观察', labelEn: 'Watching', tone: 'sample' }
        : record.winRate >= 0.67
          ? { labelZh: '强势', labelEn: 'Strong', tone: 'strong' }
          : record.winRate <= 0.33
            ? { labelZh: '薄弱', labelEn: 'Weak', tone: 'weak' }
            : { labelZh: '均衡', labelEn: 'Balanced', tone: 'balanced' }

    return { ...record, tag }
  })
}

function getPlayerMetricTotal(player, metric) {
  const directTotal = getPlayerMetric(player, metric.totalKeys)
  if (directTotal > 0) return directTotal

  const average = getPlayerMetric(player, metric.avgKeys)
  const minutes = toNumber(player?.raw_time_mins || player?.roleTimeMins)
  return average > 0 && minutes > 0 ? average * minutes / 10 : 0
}

function getTeamCombatProfile(players) {
  const activePlayers = safeArr(players).filter(player => toNumber(player?.raw_time_mins || player?.roleTimeMins) > 0)
  const totalPlayerMinutes = activePlayers.reduce((sum, player) => sum + toNumber(player?.raw_time_mins || player?.roleTimeMins), 0)
  const teamMinutes = totalPlayerMinutes / 5
  const values = {}

  TEAM_COMBAT_METRICS.forEach(metric => {
    const total = activePlayers.reduce((sum, player) => sum + getPlayerMetricTotal(player, metric), 0)
    values[metric.id] = teamMinutes > 0 ? total * 10 / teamMinutes : 0
  })

  return {
    hasData: teamMinutes > 0 && Object.values(values).some(value => value > 0),
    teamMinutes,
    values
  }
}

function getTournamentCombatBaseline(players) {
  const teams = new Map()

  safeArr(players).forEach(player => {
    const key = String(player?.teamRouteId || player?.team_id || player?.teamShortName || player?.team_short_name || '').trim()
    if (!key) return
    if (!teams.has(key)) teams.set(key, [])
    teams.get(key).push(player)
  })

  const profiles = [...teams.values()].map(getTeamCombatProfile).filter(profile => profile.hasData)
  const values = {}

  TEAM_COMBAT_METRICS.forEach(metric => {
    const samples = profiles.map(profile => profile.values[metric.id]).filter(value => value > 0)
    values[metric.id] = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0
  })

  return { teamCount: profiles.length, values }
}

function getCombatComparisons(profile, baseline, locale = 'zh-CN') {
  const isEn = String(locale).toLowerCase().startsWith('en')

  return TEAM_COMBAT_METRICS.map(metric => {
    const value = profile.values[metric.id] || 0
    const average = baseline.values[metric.id] || 0
    const ratio = value > 0 && average > 0 ? value / average : 0
    const delta = ratio ? Math.round((ratio - 1) * 100) : 0
    const valueLabel = metric.id === 'eliminations'
      ? value ? Math.round(value).toLocaleString() : '--'
      : value ? formatRosterPerformanceValue(value) : '--'
    const deltaLabel = !ratio
      ? isEn ? 'Awaiting sample' : '样本待生成'
      : delta === 0
        ? isEn ? 'At tournament average' : '持平赛事平均'
        : `${delta > 0 ? '+' : ''}${delta}% ${isEn ? 'vs avg' : '较赛事平均'}`

    return {
      ...metric,
      label: isEn ? metric.labelEn : metric.labelZh,
      value,
      valueLabel,
      average,
      ratio,
      delta,
      deltaLabel,
      position: ratio ? Math.min(100, Math.max(4, ratio * 50)) : 0,
      tone: !ratio ? 'empty' : ratio >= 1.08 ? 'high' : ratio <= 0.92 ? 'low' : 'average'
    }
  })
}

function clampScore(value) {
  return Math.max(8, Math.min(96, Math.round(value)))
}

function getComparisonRatio(comparisons, id, inverse = false) {
  const ratio = safeArr(comparisons).find(item => item.id === id)?.ratio || 0
  if (!ratio) return 0
  return inverse ? 1 / ratio : ratio
}

function getTeamTacticalProfile(comparisons, mapTypeStats, mapPool, roster, locale = 'zh-CN') {
  const isEn = String(locale).toLowerCase().startsWith('en')
  const ratio = (id, inverse = false) => getComparisonRatio(comparisons, id, inverse)
  const axis = (id, labelZh, labelEn, sourceRatio) => ({
    id,
    label: isEn ? labelEn : labelZh,
    ratio: sourceRatio,
    score: sourceRatio ? clampScore(sourceRatio * 50) : 0
  })
  const pressureRatio = [ratio('damage'), ratio('eliminations')].filter(Boolean)
  const pressure = pressureRatio.length ? pressureRatio.reduce((sum, value) => sum + value, 0) / pressureRatio.length : 0
  const axes = [
    axis('pressure', '进攻压迫', 'Pressure', pressure),
    axis('conversion', '击杀转化', 'Conversion', ratio('eliminations')),
    axis('frontline', '前排承压', 'Frontline', ratio('mitigation')),
    axis('sustain', '续航能力', 'Sustain', ratio('healing')),
    axis('coordination', '团队联动', 'Coordination', ratio('assists')),
    axis('survival', '生存控制', 'Survival', ratio('deaths', true))
  ]
  const validAxes = axes.filter(item => item.ratio > 0)
  const strongest = [...validAxes].sort((a, b) => b.score - a.score)
  const weakest = [...validAxes].sort((a, b) => a.score - b.score)
  const totalMinutes = safeArr(roster).reduce((sum, player) => sum + toNumber(player?.raw_time_mins || player?.roleTimeMins), 0)
  const coreMinutes = [...safeArr(roster)]
    .sort((a, b) => toNumber(b?.raw_time_mins || b?.roleTimeMins) - toNumber(a?.raw_time_mins || a?.roleTimeMins))
    .slice(0, 5)
    .reduce((sum, player) => sum + toNumber(player?.raw_time_mins || player?.roleTimeMins), 0)
  const coreShare = totalMinutes ? coreMinutes / totalMinutes : 0
  const mapSamples = safeArr(mapPool).reduce((sum, map) => sum + map.maps, 0)
  const signature = safeArr(mapPool).find(map => map.tag?.tone === 'signature') || null
  const signatureShare = mapSamples ? toNumber(signature?.maps) / mapSamples : 0
  const pressureHigh = pressure >= 1.12
  const defenseHigh = ratio('mitigation') >= 1.1 && ratio('healing') >= 1.02
  const volatile = ratio('damage') >= 1.08 && ratio('deaths') >= 1.08
  const specialist = mapTypeStats.length <= 2 && mapSamples >= 6

  let archetype = isEn ? 'Balanced operations' : '均衡运营型'
  let archetypeEn = 'BALANCED OPS'
  let description = isEn
    ? 'No single dimension dominates. The team wins through balanced resource allocation and stable map execution.'
    : '没有单一维度完全主导比赛，队伍更依赖均衡资源分配与稳定的地图执行。'

  if (volatile) {
    archetype = isEn ? 'High-risk trading' : '高风险换血型'
    archetypeEn = 'HIGH-RISK TRADE'
    description = isEn
      ? 'The team creates heavy damage pressure but also gives opponents more return windows. Fight selection is the main review point.'
      : '队伍能持续制造高额伤害，但也会给对手留下更多反打窗口，团战选择是首要复盘点。'
  } else if (pressureHigh && defenseHigh) {
    archetype = isEn ? 'Pressure with structure' : '强压控场型'
    archetypeEn = 'CONTROLLED PRESSURE'
    description = isEn
      ? 'Above-average kill pressure is backed by a durable frontline, allowing the team to keep initiative without abandoning structure.'
      : '高于赛事平均的击杀压力由稳定前排承接，队伍能持续掌握主动，同时保留阵型完整性。'
  } else if (pressureHigh) {
    archetype = isEn ? 'High-pressure focus fire' : '高压集火型'
    archetypeEn = 'FOCUS-FIRE PRESSURE'
    description = isEn
      ? 'The team converts sustained damage into eliminations efficiently and prefers to decide fights through the first focus-fire window.'
      : '队伍擅长把持续伤害转化为击杀，更倾向通过第一轮集火窗口快速决定团战走向。'
  } else if (defenseHigh) {
    archetype = isEn ? 'Structured sustain' : '稳态阵地型'
    archetypeEn = 'STRUCTURED SUSTAIN'
    description = isEn
      ? 'Frontline durability and sustain are the foundation. The team is strongest when it can extend fights and control space deliberately.'
      : '前排承压与团队续航是基本盘，队伍在延长团战并逐步控制空间时最具优势。'
  } else if (specialist) {
    archetype = isEn ? 'Map-pool specialist' : '地图专精型'
    archetypeEn = 'MAP SPECIALIST'
    description = isEn
      ? 'Results are concentrated in a narrow set of map modes, with strong execution on familiar terrain and clear expansion needs.'
      : '战绩集中在少数地图类型，熟悉地图上的执行力突出，同时也存在明确的地图池扩展需求。'
  }

  const strengths = strongest.slice(0, 2).map(item => ({
    tone: 'strength',
    label: isEn ? 'Advantage' : '优势',
    title: item.label,
    body: item.ratio
      ? `${item.ratio >= 1 ? '+' : ''}${Math.round((item.ratio - 1) * 100)}% ${isEn ? 'vs tournament baseline' : '较赛事基线'}`
      : isEn ? 'Awaiting sample' : '样本待生成'
  }))
  const risks = []
  if (specialist) {
    risks.push({
      tone: 'risk',
      label: isEn ? 'Risk' : '风险',
      title: isEn ? 'Narrow mode coverage' : '地图类型覆盖偏窄',
      body: isEn ? `${mapTypeStats.length} modes currently tracked` : `当前仅覆盖 ${mapTypeStats.length} 类地图模式`
    })
  }
  if (signature && signatureShare >= 0.4) {
    risks.push({
      tone: 'risk',
      label: isEn ? 'Dependency' : '依赖',
      title: isEn ? `${signature.displayName} concentration` : `${signature.displayName}样本集中`,
      body: `${formatPercent(signatureShare)} ${isEn ? 'of tracked maps' : '的地图样本来自该图'}`
    })
  }
  if (!risks.length && weakest[0] && weakest[0].score < 48) {
    risks.push({
      tone: 'risk',
      label: isEn ? 'Review' : '复盘',
      title: weakest[0].label,
      body: `${Math.round((weakest[0].ratio - 1) * 100)}% ${isEn ? 'vs tournament baseline' : '较赛事基线'}`
    })
  }
  const plan = specialist
    ? isEn ? 'Prioritize one additional map mode in training while preserving the current signature-map structure.' : '训练优先补齐一种新地图类型，同时保留现有招牌地图体系。'
    : pressureHigh
      ? isEn ? 'Build set plays around the first focus-fire window and review disengage timing after failed entries.' : '围绕第一轮集火窗口设计固定战术，并重点复盘进场失败后的脱离时机。'
      : isEn ? 'Use the weakest tactical axis as the next training-cycle objective and verify it across multiple map modes.' : '把当前最弱战术维度设为下一训练周期目标，并在多种地图类型中验证。'

  return {
    archetype,
    archetypeEn,
    description,
    axes,
    notes: [...strengths, ...risks.slice(0, 1), { tone: 'plan', label: isEn ? 'Training' : '训练建议', title: isEn ? 'Next focus' : '下一步重点', body: plan }],
    confidence: mapSamples >= 8 && validAxes.length >= 5 ? (isEn ? 'HIGH' : '高') : mapSamples >= 4 ? (isEn ? 'MEDIUM' : '中') : (isEn ? 'LOW' : '低'),
    mapSamples,
    modeCount: mapTypeStats.length,
    coreShare
  }
}

function getPlayerStyleProfiles(players, allPlayers, locale = 'zh-CN') {
  const isEn = String(locale).toLowerCase().startsWith('en')
  const metricOptions = {
    TANK: [
      { id: 'mitigation', keys: ['avg_block'], labelZh: '空间承压', labelEn: 'Frontline anchor', unit: 'MIT /10' },
      { id: 'damage', keys: ['avg_dmg'], labelZh: '压迫前排', labelEn: 'Pressure tank', unit: 'DMG /10' },
      { id: 'survival', keys: ['avg_dth', 'avg_death'], labelZh: '生存前排', labelEn: 'Survival tank', unit: 'DTH /10', lowerIsBetter: true }
    ],
    DPS: [
      { id: 'damage', keys: ['avg_dmg'], labelZh: '持续火力', labelEn: 'Sustained fire', unit: 'DMG /10' },
      { id: 'eliminations', keys: ['avg_elim'], labelZh: '击杀转化', labelEn: 'Kill conversion', unit: 'ELIM /10' },
      { id: 'survival', keys: ['avg_dth', 'avg_death'], labelZh: '生存输出', labelEn: 'Survival damage', unit: 'DTH /10', lowerIsBetter: true }
    ],
    SUP: [
      { id: 'healing', keys: ['avg_heal'], labelZh: '续航枢纽', labelEn: 'Sustain hub', unit: 'HEAL /10' },
      { id: 'assists', keys: ['avg_ast', 'avg_assist'], labelZh: '团队连接', labelEn: 'Team connector', unit: 'AST /10' },
      { id: 'survival', keys: ['avg_dth', 'avg_death'], labelZh: '稳健支援', labelEn: 'Survival support', unit: 'DTH /10', lowerIsBetter: true }
    ]
  }

  return safeArr(players).map(player => {
    const role = normalizeRosterRole(player?.role)
    const pool = safeArr(allPlayers).filter(row => normalizeRosterRole(row?.role) === role && toNumber(row?.raw_time_mins || row?.roleTimeMins) >= 10)
    const candidates = safeArr(metricOptions[role]).map(metric => {
      const value = getPlayerMetric(player, metric.keys)
      const samples = pool.map(row => getPlayerMetric(row, metric.keys)).filter(sample => sample > 0)
      const average = samples.length ? samples.reduce((sum, sample) => sum + sample, 0) / samples.length : 0
      const ratio = value > 0 && average > 0 ? (metric.lowerIsBetter ? average / value : value / average) : 0
      const percentile = value > 0 && samples.length
        ? Math.round(samples.filter(sample => metric.lowerIsBetter ? sample >= value : sample <= value).length / samples.length * 100)
        : 0
      return { ...metric, value, average, ratio, percentile }
    }).filter(metric => metric.value > 0)
    const sortedCandidates = candidates.sort((a, b) => b.ratio - a.ratio)
    const best = sortedCandidates[0] || null
    const second = sortedCandidates[1] || null
    const roleLabel = getRosterRoleLabel(role, locale)
    let style = best ? (isEn ? best.labelEn : best.labelZh) : (isEn ? 'Role sample pending' : '职责样本待生成')

    if (best?.id === 'survival' && second) {
      const compositeLabels = {
        TANK: {
          mitigation: ['稳健承压', 'Stable anchor'],
          damage: ['稳健压迫', 'Controlled pressure']
        },
        DPS: {
          damage: ['稳健火力', 'Safe pressure'],
          eliminations: ['生存收割', 'Survival finisher']
        },
        SUP: {
          healing: ['稳健续航', 'Safe sustain'],
          assists: ['稳健联动', 'Safe connector']
        }
      }
      const composite = compositeLabels[role]?.[second.id]
      if (composite) style = isEn ? composite[1] : composite[0]
    }

    return {
      player,
      name: getPlayerName(player),
      role,
      roleLabel,
      heroLabel: getPlayerHeroLabel(player, locale),
      avatar: getPlayerAvatarSrc(player),
      style,
      metric: best ? `${formatRosterPerformanceValue(best.value)} ${best.unit}` : '--',
      percentile: best?.percentile || 0
    }
  })
}

function getHeroPortraitSrc(hero, role) {
  const assetKey = getOwHeroAssetKey(hero)
  const folder = {
    TANK: 'tank',
    DPS: 'damage',
    SUP: 'support'
  }[normalizeRosterRole(role)] || getOwHeroRole(hero)
  return assetKey && folder ? `/heroes/${folder}/${assetKey}.png` : ''
}

function getRecordedLineups(matchRows, locale = 'zh-CN') {
  const lineups = new Map()
  let completeSamples = 0

  safeArr(matchRows).filter(row => isFinishedMatch(row.match)).forEach(row => {
    safeArr(row.match?.maps).forEach(map => {
      const statsKey = row.side === 'team_a' ? 'team_a_stats' : 'team_b_stats'
      const entries = safeArr(map?.[statsKey]).map(stat => {
        const hero = getOwHeroCanonicalName(stat?.heroes_played)
        const heroKey = getOwHeroCanonicalKey(hero)
        const role = normalizeRosterRole(stat?.role)
        if (!heroKey || !ROLE_ORDER.includes(role)) return null

        return {
          hero,
          heroKey,
          heroLabel: formatOwHeroName(hero, locale),
          role,
          roleLabel: getRosterRoleLabel(role, locale),
          portrait: getHeroPortraitSrc(hero, role)
        }
      }).filter(Boolean)

      const roleCounts = entries.reduce((counts, entry) => {
        counts[entry.role] = (counts[entry.role] || 0) + 1
        return counts
      }, {})
      if (entries.length !== 5 || roleCounts.TANK !== 1 || roleCounts.DPS !== 2 || roleCounts.SUP !== 2) return

      const ordered = [...entries].sort((a, b) => (
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || compareName(a.heroKey, b.heroKey)
      ))
      const key = ordered.map(entry => `${entry.role}:${entry.heroKey}`).join('|')
      const mapResult = getMapRoundResult(map, row.side)
      completeSamples += 1

      if (!lineups.has(key)) {
        lineups.set(key, {
          key,
          maps: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          latestTime: 0,
          mapCounts: new Map(),
          slots: ordered
        })
      }

      const record = lineups.get(key)
      record.maps += 1
      if (mapResult.tone === 'win') record.wins += 1
      else if (mapResult.tone === 'loss') record.losses += 1
      else if (mapResult.tone === 'draw') record.draws += 1
      record.latestTime = Math.max(record.latestTime, getMatchScheduleTime(row.match))
      const mapName = formatOwMapName(map?.map_name || map?.name || '', locale) || '-'
      record.mapCounts.set(mapName, (record.mapCounts.get(mapName) || 0) + 1)
    })
  })

  const ranked = [...lineups.values()].sort((a, b) => (
    b.maps - a.maps || b.latestTime - a.latestTime || b.wins - a.wins || compareName(a.key, b.key)
  ))
  if (!ranked.length) return { lineups: [], completeSamples, uniqueLineups: 0 }

  const normalizedLineups = ranked.slice(0, 3).map((lineup, index) => {
    const commonMap = [...lineup.mapCounts.entries()].sort((a, b) => b[1] - a[1] || compareName(a[0], b[0]))[0]?.[0] || '-'
    return {
      ...lineup,
      rank: index + 1,
      adoptionRate: completeSamples ? lineup.maps / completeSamples : 0,
      winRate: lineup.maps ? lineup.wins / lineup.maps : 0,
      recordLabel: formatMapRecord(lineup.wins, lineup.losses, lineup.draws),
      commonMap
    }
  })

  return {
    lineups: normalizedLineups,
    completeSamples,
    uniqueLineups: ranked.length
  }
}

function groupRosterByRole(roster) {
  const groups = { TANK: [], DPS: [], SUP: [], FLEX: [] }
  roster.forEach(player => {
    const role = normalizeRosterRole(player.role)
    const key = groups[role] ? role : 'FLEX'
    groups[key].push(player)
  })

  Object.values(groups).forEach(rows => rows.sort((a, b) => compareName(a.identity?.primary, b.identity?.primary)))
  return groups
}

function getTodayRows(rows, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const startTime = start.getTime()
  const endTime = end.getTime()

  return rows.filter(row => {
    const raw = row.match?.scheduled_at ||
      row.match?.match_date ||
      row.match?.date ||
      (row.match?.scheduled_date && row.match?.scheduled_time ? `${row.match.scheduled_date}T${row.match.scheduled_time}:00+08:00` : '')
    const time = raw ? new Date(raw).getTime() : 0
    return Number.isFinite(time) && time >= startTime && time < endTime
  })
}

function getRecentForm(rows, limit = 5) {
  return rows
    .filter(row => isFinishedMatch(row.match))
    .slice(0, limit)
    .reverse()
    .map(row => {
      if (row.result.tone === 'win') return { label: 'W', tone: 'win' }
      if (row.result.tone === 'loss') return { label: 'L', tone: 'loss' }
      return { label: 'D', tone: 'draw' }
    })
}

function formatPercent(value) {
  return `${Math.round(toNumber(value) * 100)}%`
}

function formatPlayerTime(minutes) {
  const mins = Math.round(toNumber(minutes))
  if (mins <= 0) return '0 min'
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  return hours ? `${hours}h ${rest}m` : `${rest}m`
}

function getAdvanceState(standing, team) {
  const finalRank = toNumber(team?.final_rank)
  if (finalRank) {
    return {
      label: team?.final_rank_text || `第 ${finalRank} 名`,
      zone: finalRank <= ADVANCE_SLOTS ? '晋级区' : '赛季排名',
      tone: finalRank <= ADVANCE_SLOTS ? 'win' : 'pending'
    }
  }

  if (!standing) {
    return { label: '待生成', zone: '积分未生成', tone: 'pending' }
  }

  const groupLabel = String(standing.groupLabel || standing.group_label || team?.groupLabel || team?.group_label || '').trim().toUpperCase()
  const matchesPlayed = toNumber(standing.matchesPlayed ?? standing.matches_played)
  const rank = toNumber(standing.rank ?? standing.groupRank ?? standing.group_rank, 999)

  if (groupLabel) {
    const label = rank < 999 ? `${groupLabel} 组第 ${rank} 名` : `${groupLabel} 组`
    if (!matchesPlayed) return { label, zone: '小组赛未开始', tone: 'pending' }
    if (standing.requiresTiebreak || standing.requires_tiebreak) return { label, zone: '加赛待定', tone: 'draw' }
    if (standing.qualified) return { label, zone: '已晋级', tone: 'win' }
    if (standing.status === 'eliminated') return { label, zone: '已出局', tone: 'loss' }
    if (standing.inAdvanceZone) return { label, zone: '晋级区', tone: 'win' }
    return { label, zone: '小组当前排名', tone: 'pending' }
  }

  if (!matchesPlayed) return { label: '待生成', zone: '积分未生成', tone: 'pending' }

  const presentation = SWISS_STATUS_PRESENTATION[standing.status] || { zone: '当前排名', tone: 'pending' }
  return { label: `第 ${rank} 名`, ...presentation }
}

function getPlayerMetric(player, keys) {
  return keys.reduce((best, key) => Math.max(best, toNumber(player?.[key])), 0)
}

function getTeamLeaders(roster, locale = 'zh-CN') {
  const rows = safeArr(roster)
  const pick = (label, keys, formatter = value => String(Math.round(value))) => {
    const player = [...rows].sort((a, b) => getPlayerMetric(b, keys) - getPlayerMetric(a, keys))[0]
    const value = player ? getPlayerMetric(player, keys) : 0
    return {
      label,
      player,
      value,
      valueLabel: value ? formatter(value) : '暂无',
      heroLabel: player?.avatar?.heroName ? formatOwHeroName(player.avatar.heroName, locale) : '尚未出场'
    }
  }

  return [
    pick('出场核心', ['raw_time_mins', 'roleTimeMins'], formatPlayerTime),
    pick('火力代表', ['avg_dmg', 'total_dmg', 'damage'], value => `${Math.round(value).toLocaleString()} DMG`),
    pick('支援代表', ['avg_heal', 'total_heal', 'healing'], value => `${Math.round(value).toLocaleString()} HEAL`),
    pick('承伤代表', ['avg_block', 'total_block', 'blocked', 'mitigation'], value => `${Math.round(value).toLocaleString()} MIT`)
  ].filter(item => item.player)
}

function getTrackedRosterMapCount(roster) {
  const rows = safeArr(roster)
  const totalMapAppearances = rows.reduce((sum, player) => sum + toNumber(player?.maps_played), 0)
  const maxPlayerMaps = rows.reduce((max, player) => Math.max(max, toNumber(player?.maps_played)), 0)
  const estimatedTeamMaps = Math.round(totalMapAppearances / 5)
  return Math.max(maxPlayerMaps, estimatedTeamMaps)
}

function getLeaderBadgesByPlayer(teamLeaders) {
  const badges = new Map()

  safeArr(teamLeaders).forEach(item => {
    if (!item?.player) return
    const key = getPlayerRosterKey(item.player)
    if (!key) return
    if (!badges.has(key)) badges.set(key, [])

    const rows = badges.get(key)
    if (!rows.some(row => row.label === item.label)) {
      rows.push({ label: item.label, valueLabel: item.valueLabel })
    }
  })

  return badges
}

function HeaderMetric({ label, value, meta }) {
  return (
    <span className={styles.headerMetric}>
      <strong>{value}</strong>
      <em>{label}</em>
      {meta ? <b>{meta}</b> : null}
    </span>
  )
}

function FormStrip({ form }) {
  if (!form.length) return <span className={styles.formEmpty}>暂无赛果</span>

  return (
    <span className={styles.formStrip}>
      {form.map((item, index) => (
        <b key={`${item.label}-${index}`} className={styles[item.tone]}>{item.label}</b>
      ))}
    </span>
  )
}

function StaffIdentityValue({ people }) {
  const rows = safeArr(people)
    .map(person => {
      const identity = normalizeStaffIdentity(person)
      const name = identity.name || identity.battleTag
      return {
        ...identity,
        name,
        battleTag: getDistinctSecondaryName(name, identity.battleTag)
      }
    })
    .filter(identity => identity.name || identity.battleTag)

  if (!rows.length) {
    return <b className={`${styles.heroMetaValue} ${styles.heroMetaValueNoWrap}`}>-</b>
  }

  return (
    <b className={`${styles.heroMetaValue} ${styles.staffIdentityList}`}>
      {rows.map((identity, index) => (
        <i className={styles.staffIdentityItem} key={`${identity.key || identity.name}-${index}`}>
          {identity.name}
          {identity.battleTag ? <small>{identity.battleTag}</small> : null}
        </i>
      ))}
    </b>
  )
}

function TeamFocusCard({ row, withSeason, seasonId, matchSummary, recentForm = [] }) {
  const location = useLocation()
  const isPending = row.result.tone === 'pending'
  const summary = matchSummary || {}
  const recordLabel = `${toNumber(summary.wins)}-${toNumber(summary.losses)}`
  const mapRecordLabel = `${toNumber(summary.mapWins)}-${toNumber(summary.mapLosses)}`
  const pendingLabel = `${toNumber(summary.pending)}`
  const statusLabel = row.result.label === 'LIVE' ? '进行中' : isPending ? '等待开赛' : '已完成'

  return (
    <Link
      to={withSeason(`/matches/${row.match.match_id}`)}
      state={getReturnState(location)}
      className={styles.focusMatchCard}
      onClick={() => saveReturnScroll(location)}
    >
      <span className={`${styles.focusMatchBadge} ${styles[row.result.tone]}`}>
        {isPending ? 'NEXT' : row.result.label}
      </span>
      <TeamLogo team={row.opponent} seasonId={seasonId} className={styles.focusMatchLogo} />
      <span className={styles.focusMatchMain}>
        <em>{isPending ? 'NEXT MATCH' : 'LATEST MATCH'}</em>
        <strong>{row.opponentLabel}</strong>
        {row.opponentFullName ? <small>{row.opponentFullName}</small> : null}
        <b>{getMatchRound(row.match)} · {getMatchTimeLabel(row.match)}</b>
      </span>
      <span className={styles.focusMatchScore}>{row.score}</span>
      <span className={styles.focusMatchHint}>
        <em>{isPending ? 'MATCH STATUS' : 'MATCH RESULT'}</em>
        <b>{isPending ? '赛前数据待更新' : '最近完成比赛'}</b>
      </span>
      <span className={styles.focusMatchPrep}>
        <span>
          <em>开赛状态</em>
          <b>{statusLabel}</b>
        </span>
        <span>
          <em>近期状态</em>
          <FormStrip form={recentForm} />
        </span>
      </span>
      <span className={styles.focusMatchStats}>
        <span><b>{recordLabel}</b><em>比赛战绩</em></span>
        <span><b>{mapRecordLabel}</b><em>地图战绩</em></span>
        <span><b>{pendingLabel}</b><em>待赛</em></span>
      </span>
    </Link>
  )
}

function TeamTimelineRow({ row, withSeason, seasonId }) {
  const location = useLocation()

  return (
    <Link
      to={withSeason(`/matches/${row.match.match_id}`)}
      state={getReturnState(location)}
      className={styles.timelineRow}
      onClick={() => saveReturnScroll(location)}
    >
      <span className={`${styles.matchResult} ${styles[row.result.tone]}`}>{row.result.label}</span>
      <TeamLogo team={row.opponent} seasonId={seasonId} className={styles.timelineLogo} />
      <span className={styles.timelineMain}>
        <strong>{row.opponentLabel}</strong>
        {row.opponentFullName ? <small>{row.opponentFullName}</small> : null}
        <em>{getMatchRound(row.match)} · {getMatchTimeLabel(row.match)}</em>
      </span>
      <span className={styles.matchScore}>{row.score}</span>
    </Link>
  )
}

function RosterPlayerArtwork({ player }) {
  const artwork = getShareHeroArtwork(player?.avatar?.heroName, player?.role)
  const candidates = [artwork.src, artwork.fallbackSrc].filter(Boolean)
  const candidateKey = candidates.join('|')
  const [candidateIndex, setCandidateIndex] = useState(0)
  const src = candidates[candidateIndex]

  useEffect(() => {
    setCandidateIndex(0)
  }, [candidateKey])

  if (!src) {
    return <span className={styles.rosterPlayerFallback}>{getPlayerInitials(player)}</span>
  }

  return (
    <img
      className={styles.rosterPlayerArtwork}
      src={src}
      alt=""
      loading="lazy"
      style={{
        '--roster-art-position': artwork.crop.objectPosition,
        '--roster-art-scale': artwork.crop.scale,
        '--roster-art-x': artwork.crop.translateX,
        '--roster-art-y': artwork.crop.translateY
      }}
      onError={() => setCandidateIndex(index => index + 1)}
    />
  )
}

function TeamSeasonMatchRow({ row, index, isFirst, isLast, withSeason, seasonId, locale = 'zh-CN' }) {
  const location = useLocation()
  const roundLabel = getMatchRound(row.match)
  const roundNumber = String(roundLabel).match(/\d+/)?.[0] || String(index + 1)
  const maps = safeArr(row.match?.maps).filter(map => map?.map_name && isKnownMapType(map?.map_type || map?.type))
  const isPending = row.result.tone === 'pending'

  return (
    <Link
      to={withSeason(`/matches/${row.match.match_id}`)}
      state={getReturnState(location)}
      className={styles.seasonMatchRow}
      data-tone={row.result.tone}
      data-first={isFirst || undefined}
      data-last={isLast || undefined}
      onClick={() => saveReturnScroll(location)}
    >
      <span className={styles.seasonMatchRound}>
        <b>{String(roundNumber).padStart(2, '0')}</b>
        <em>{roundLabel}</em>
      </span>
      <span className={`${styles.matchResult} ${styles[row.result.tone]}`}>{isPending ? 'NEXT' : row.result.label}</span>
      <TeamLogo team={row.opponent} seasonId={seasonId} className={styles.seasonMatchLogo} />
      <span className={styles.seasonMatchOpponent}>
        <strong>{row.opponentLabel}</strong>
        {row.opponentFullName ? <small>{row.opponentFullName}</small> : null}
        <em>{getMatchTimeLabel(row.match)}</em>
      </span>
      <span className={styles.seasonMatchMaps}>
        <em>MAP PROGRESSION</em>
        <span className={styles.seasonMatchMapChips}>
          {maps.length ? maps.map((map, mapIndex) => {
            const mapResult = getMapRoundResult(map, row.side)
            const resultLabel = mapResult.tone === 'win'
              ? 'W'
              : mapResult.tone === 'loss'
                ? 'L'
                : mapResult.tone === 'draw'
                  ? 'D'
                  : '-'
            const mapName = formatOwMapName(map.map_name, locale)

            return (
              <span
                key={`${map.map_name}-${mapIndex}`}
                className={styles.seasonMatchMapChip}
                data-tone={mapResult.tone}
                title={`${mapName} ${mapResult.score}`}
              >
                <b>{resultLabel}</b>
                <span>{mapName}</span>
                {mapResult.hasScore ? <small>{mapResult.mine}:{mapResult.other}</small> : null}
              </span>
            )
          }) : (
            <span className={styles.seasonMatchMapEmpty}>{isPending ? '地图待更新' : '暂无地图明细'}</span>
          )}
        </span>
      </span>
      <span className={styles.seasonMatchScore}>{row.score}</span>
      <span className={styles.seasonMatchLink} aria-hidden="true">›</span>
    </Link>
  )
}

function CombatMetricCard({ item, isEn }) {
  return (
    <article className={styles.combatMetricCard} data-tone={item.tone}>
      <span className={styles.combatMetricHead}>
        <em>{item.label}</em>
        <small>{item.unit} / 10 MIN</small>
      </span>
      <strong>{item.valueLabel}</strong>
      <span className={styles.combatMetricDelta}>{item.deltaLabel}</span>
      <span className={styles.combatMetricTrack} aria-hidden="true">
        <i style={{ '--combat-position': `${item.position}%` }} />
        <b />
      </span>
      <small className={styles.combatMetricFoot}>{isEn ? 'Tournament average' : '赛事平均'} {item.average ? formatRosterPerformanceValue(item.average) : '--'}</small>
    </article>
  )
}

function TacticalAxisRow({ axis, isEn }) {
  const delta = axis.ratio ? Math.round((axis.ratio - 1) * 100) : 0
  return (
    <span className={styles.tacticalAxisRow} data-tone={axis.score >= 56 ? 'high' : axis.score && axis.score < 46 ? 'low' : 'average'}>
      <span>
        <strong>{axis.label}</strong>
        <em>{axis.ratio ? `${delta >= 0 ? '+' : ''}${delta}%` : '--'}</em>
      </span>
      <span className={styles.tacticalAxisTrack} aria-hidden="true">
        <i style={{ '--axis-score': `${axis.score}%` }} />
        <b />
      </span>
      <small>{isEn ? 'TOURNAMENT BASELINE' : '赛事基线'}</small>
    </span>
  )
}

function CoachingNote({ note }) {
  return (
    <article className={styles.coachingNote} data-tone={note.tone}>
      <em>{note.label}</em>
      <strong>{note.title}</strong>
      <p>{note.body}</p>
    </article>
  )
}

function RecordedCompHero({ slot, index }) {
  return (
    <span className={styles.recordedCompHero} data-role={slot.role}>
      <span className={styles.recordedCompHeroPortrait}>
        {slot.portrait ? (
          <img
            src={slot.portrait}
            alt={slot.heroLabel}
            loading="lazy"
            onError={event => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        <i aria-hidden="true">{String(index + 1).padStart(2, '0')}</i>
      </span>
      <strong>{slot.heroLabel}</strong>
      <em>{slot.roleLabel}</em>
    </span>
  )
}

function RecordedCompCard({ lineup, isEn }) {
  return (
    <article className={styles.recordedCompCard} data-rank={lineup.rank}>
      <header className={styles.recordedCompCardHead}>
        <span>
          <em>{isEn ? 'RECORDED COMP' : '记录阵容'}</em>
          <strong>{String(lineup.rank).padStart(2, '0')}</strong>
        </span>
        <span className={styles.recordedCompCardShare}>
          <strong>{formatPercent(lineup.adoptionRate)}</strong>
          <em>{isEn ? 'SHARE' : '记录占比'}</em>
        </span>
      </header>
      <div className={styles.recordedCompCardHeroes}>
        {lineup.slots.map((slot, index) => (
          <RecordedCompHero key={`${lineup.key}-${slot.role}-${slot.heroKey}`} slot={slot} index={index} />
        ))}
      </div>
      <footer className={styles.recordedCompCardMeta}>
        <span>
          <em>{isEn ? 'COMMON MAP' : '常见地图'}</em>
          <strong title={lineup.commonMap}>{lineup.commonMap}</strong>
        </span>
        <span>
          <em>{isEn ? 'RECORDED' : '记录次数'}</em>
          <strong>{lineup.maps}</strong>
        </span>
        <span>
          <em>{isEn ? 'MAP RECORD' : '地图战绩'}</em>
          <strong>{lineup.recordLabel}</strong>
        </span>
      </footer>
    </article>
  )
}

function PlayerStyleCard({ profile, isEn }) {
  return (
    <article className={styles.playerStyleCard} data-role={profile.role}>
      {profile.avatar ? <img src={profile.avatar} alt="" loading="lazy" /> : null}
      <span className={styles.playerStyleShade} aria-hidden="true" />
      <span className={styles.playerStyleRole}>{profile.roleLabel}</span>
      <span className={styles.playerStyleIdentity}>
        <strong>{profile.name}</strong>
        <small>{profile.heroLabel}</small>
      </span>
      <span className={styles.playerStyleReadout}>
        <em>{isEn ? 'ROLE READ' : '职责画像'}</em>
        <strong>{profile.style}</strong>
        <small>{profile.metric}</small>
      </span>
      <span className={styles.playerStylePercentile}>
        <b>{profile.percentile ? `${profile.percentile}%` : '--'}</b>
        <em>{isEn ? 'ROLE PERCENTILE' : '同职责百分位'}</em>
      </span>
    </article>
  )
}

function MapModePerformanceRow({ row, locale = 'zh-CN' }) {
  const winRate = row.maps ? row.wins / row.maps : 0
  const isEn = String(locale).toLowerCase().startsWith('en')

  return (
    <article className={styles.mapModeRow}>
      <span className={styles.mapModeIdentity}>
        <strong>{formatOwMapMode(row.type, locale)}</strong>
        <em>{row.maps} {isEn ? 'maps' : '张地图'}</em>
      </span>
      <span className={styles.mapModeRecord}>
        <strong>{formatMapRecord(row.wins, row.losses, row.draws)}</strong>
        <em>{formatPercent(winRate)}</em>
      </span>
      <span className={styles.mapModeTrack} aria-hidden="true">
        <i style={{ '--mode-win-rate': `${Math.round(winRate * 100)}%` }} />
      </span>
    </article>
  )
}

function TeamMapPoolCard({ map, isEn }) {
  const latestLabel = map.latestTone === 'win'
    ? 'W'
    : map.latestTone === 'loss'
      ? 'L'
      : map.latestTone === 'draw'
        ? 'D'
        : '-'

  return (
    <article className={styles.teamMapCard} data-tone={map.tag.tone}>
      <span className={styles.teamMapVisual}>
        <img
          src={map.imageUrl}
          alt=""
          loading="lazy"
          onError={event => {
            event.currentTarget.style.display = 'none'
          }}
        />
        <em>{isEn ? map.tag.labelEn : map.tag.labelZh}</em>
      </span>
      <span className={styles.teamMapInfo}>
        <small>{map.mode}</small>
        <strong>{map.displayName}</strong>
        <span className={styles.teamMapMetrics}>
          <span><b>{map.recordLabel}</b><em>{isEn ? 'Record' : '地图战绩'}</em></span>
          <span><b>{formatPercent(map.winRate)}</b><em>{isEn ? 'Win rate' : '地图胜率'}</em></span>
          <span><b>{map.maps}</b><em>{isEn ? 'Played' : '出场次数'}</em></span>
        </span>
        <span className={styles.teamMapLatest} data-tone={map.latestTone}>
          <b>{latestLabel}</b>
          <em>{isEn ? 'Latest' : '最近'} vs {map.latestOpponent || 'TBD'}</em>
        </span>
      </span>
    </article>
  )
}

function RosterPlayerRow({ player, withSeason, locale = 'zh-CN' }) {
  const playerName = getPlayerName(player)
  const secondaryName = getDistinctSecondaryName(playerName, player.identity?.secondary)
  const hasLongName = Array.from(playerName).length > 8
  const mapsPlayed = toNumber(player.maps_played)
  const timeMins = toNumber(player.raw_time_mins)
  const hasUsage = mapsPlayed > 0 || timeMins > 0
  const performanceMetric = getRosterPerformanceMetric(player)

  return (
    <Link to={withSeason(`/players/${player.identity?.playerId || player.player_id}`)} className={styles.rosterPlayerCard}>
      <RosterPlayerArtwork player={player} />
      <span className={styles.rosterPlayerShade} aria-hidden="true" />
      <span
        className={styles.rosterPlayerRole}
        title={player.isRegisteredFlex ? (locale === 'en-US' ? 'Registered as FLEX' : '报名职责：灵活') : undefined}
      >
        {getCompetitiveRoleLabel(player.role, locale)}
      </span>
      <span className={`${styles.rosterPlayerIdentity} ${hasLongName ? styles.rosterPlayerIdentityLong : ''}`}>
        <strong>{playerName}</strong>
        {secondaryName ? <small>{secondaryName}</small> : null}
      </span>
      <span className={`${styles.rosterPlayerPerformance} ${performanceMetric ? '' : styles.rosterPlayerPerformanceEmpty}`}>
        <em>{performanceMetric?.label || '角色表现'}</em>
        <span>
          <b>{performanceMetric?.valueLabel || '--'}</b>
          {performanceMetric ? <small data-i18n-ignore>{performanceMetric.unit}</small> : null}
        </span>
      </span>
      {hasUsage ? (
        <span className={styles.rosterPlayerMeta}>
          <span><b>{mapsPlayed}</b><em>出场地图</em></span>
          <span><b>{formatPlayerTime(timeMins)}</b><em>出场时长</em></span>
        </span>
      ) : (
        <span className={styles.rosterPlayerMeta}>
          <span className={styles.rosterPlayerMetaEmpty} data-i18n-ignore>
            {locale === 'en-US' ? 'NOT YET PLAYED' : '尚未出场'}
          </span>
        </span>
      )}
    </Link>
  )
}

export default function TeamDetailPage() {
  const {
    db,
    season,
    seasonId,
    withSeason = path => path,
    favorites,
    favoriteLimits,
    isFavoriteTeam,
    toggleTeamFavorite,
    locale = 'zh-CN'
  } = useOutletContext()
  const isEn = locale === 'en-US'
  const { teamId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [shareOpen, setShareOpen] = useState(false)
  const [matchFilter, setMatchFilter] = useState('all')
  const sourceReturnRef = useRef(null)
  const incomingReturnState = readTeamSourceReturnState(location.state)
  if (incomingReturnState.returnTo) sourceReturnRef.current = incomingReturnState
  const sourceReturnState = sourceReturnRef.current || incomingReturnState
  const restoreScrollY = getRestoreScrollY(location.state)

  useEffect(() => {
    if (restoreScrollY !== null) {
      restoreWindowScroll(restoreScrollY)
      return
    }

    window.scrollTo(0, 0)
  }, [teamId, restoreScrollY])

  const requestedTab = searchParams.get('tab')
  const activeTab = TABS.some(tab => tab.id === requestedTab) ? requestedTab : 'overview'

  useEffect(() => {
    if (requestedTab !== 'roster') return
    const next = new URLSearchParams(searchParams)
    next.delete('tab')
    setSearchParams(next, { replace: true })
  }, [requestedTab, searchParams, setSearchParams])

  const setActiveTab = tab => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'overview') next.delete('tab')
    else next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const teams = useMemo(() => getTeamDirectory(db, favorites), [db, favorites])
  const team = useMemo(() => {
    const target = normalizeKey(teamId)
    return teams.find(row => [
      row.routeId,
      row.team_id,
      row.id,
      row.shortName,
      row.fullName,
      row.team_short_name,
      row.team_name
    ].some(value => normalizeKey(value) === target))
  }, [teamId, teams])

  const playerDirectory = useMemo(() => getPlayerDirectory(db, favorites), [db, favorites])
  const roster = useMemo(() => {
    if (!team) return []
    const byId = new Map(playerDirectory.map(player => [String(player.player_id || player.identity?.playerId), player]))
    return getTeamRosterPlayers(db, team).map(player => {
      const merged = byId.get(String(player.player_id))
      if (merged) return merged
      return {
        ...player,
        identity: getPlayerDisplayIdentity(player),
        avatar: getPlayerAvatarSource(player),
        role: normalizeRosterRole(player.role),
        hasStats: Number(player.maps_played || 0) > 0 || Number(player.raw_time_mins || 0) > 0
      }
    })
  }, [db, playerDirectory, team])

  const rosterGroups = useMemo(() => groupRosterByRole(roster), [roster])
  const matchRows = useMemo(() => getTeamMatchRows(safeArr(db?.matches), team), [db, team])
  const matchSummary = useMemo(() => getMatchSummary(matchRows), [matchRows])
  const seasonLedgerStats = useMemo(() => getSeasonLedgerStats(matchRows, matchSummary), [matchRows, matchSummary])
  const mapTypeStats = useMemo(() => getMapTypeStats(matchRows), [matchRows])
  const teamMapPool = useMemo(() => getTeamMapPool(matchRows, locale), [matchRows, locale])
  const mapSpotlight = useMemo(() => getRepresentativeMapSpotlight(matchRows, locale), [matchRows, locale])
  const teamCombatProfile = useMemo(() => getTeamCombatProfile(roster), [roster])
  const tournamentCombatBaseline = useMemo(() => getTournamentCombatBaseline(playerDirectory), [playerDirectory])
  const combatComparisons = useMemo(
    () => getCombatComparisons(teamCombatProfile, tournamentCombatBaseline, locale),
    [teamCombatProfile, tournamentCombatBaseline, locale]
  )
  const standings = useMemo(() => {
    if (season?.rules?.competitionFormat === 'GROUP') {
      return getGroupStandings(db, season).flatMap(group => group.rows)
    }
    return getSwissStandingsRows(db, season)
  }, [db, season])
  const standing = useMemo(() => {
    if (!team) return null
    const keys = teamIdentitySet(team)
    return standings.find(row => [
      row.team_id,
      row.teamId,
      row.team_short_name,
      row.teamShortName,
      row.team_name,
      row.teamName
    ].map(normalizeKey).some(value => keys.has(value))) || null
  }, [standings, team])

  const upcomingRows = matchRows.filter(row => isUpcomingMatch(row.match) || isLiveMatch(row.match))
  const todayRows = getTodayRows(matchRows)
  const nextMatch = upcomingRows[0] || null
  const finishedRows = matchRows.filter(row => isFinishedMatch(row.match)).reverse()
  const wonRows = matchRows.filter(row => row.result.tone === 'win')
  const lostRows = matchRows.filter(row => row.result.tone === 'loss')
  const matchFilterOptions = [
    { id: 'all', label: '全部', count: matchRows.length },
    { id: 'win', label: '胜场', count: wonRows.length },
    { id: 'loss', label: '负场', count: lostRows.length },
    { id: 'pending', label: '待进行', count: upcomingRows.length }
  ]
  const effectiveMatchFilter = matchFilterOptions.some(option => (
    option.id === matchFilter && (option.id === 'all' || option.count > 0)
  )) ? matchFilter : 'all'
  const filteredMatchRows = matchRows.filter(row => {
    if (effectiveMatchFilter === 'win') return row.result.tone === 'win'
    if (effectiveMatchFilter === 'loss') return row.result.tone === 'loss'
    if (effectiveMatchFilter === 'pending') return isUpcomingMatch(row.match) || isLiveMatch(row.match)
    return true
  })
  const startingFiveSlots = getCoreRosterSlots(roster)
  const corePlayers = startingFiveSlots.map(slot => slot.player).filter(Boolean)
  const tacticalProfile = useMemo(
    () => getTeamTacticalProfile(combatComparisons, mapTypeStats, teamMapPool, roster, locale),
    [combatComparisons, mapTypeStats, teamMapPool, roster, locale]
  )
  const playerStyleProfiles = useMemo(
    () => getPlayerStyleProfiles(getCoreRosterSlots(roster).map(slot => slot.player).filter(Boolean), playerDirectory, locale),
    [roster, playerDirectory, locale]
  )
  const recordedLineups = useMemo(
    () => getRecordedLineups(matchRows, locale),
    [matchRows, locale]
  )
  const recentForm = getRecentForm(finishedRows)
  const advanceState = getAdvanceState(standing, team)
  const teamLeaders = useMemo(() => getTeamLeaders(roster, locale), [roster, locale])
  const leaderBadgesByPlayer = useMemo(() => getLeaderBadgesByPlayer(teamLeaders), [teamLeaders])
  const trackedRosterMapCount = useMemo(() => getTrackedRosterMapCount(roster), [roster])
  const mapPoolSamples = teamMapPool.reduce((sum, map) => sum + map.maps, 0)
  const rosterDisplayGroups = [
    ...ROLE_ORDER.map(role => ({ role, rows: rosterGroups[role] || [] })),
    ...Object.entries(rosterGroups)
      .filter(([role]) => !ROLE_ORDER.includes(role))
      .map(([role, rows]) => ({ role, rows }))
  ].filter(group => group.rows.length)
  const roleComposition = ROLE_ORDER
    .map(role => ({ role, count: rosterGroups[role]?.length || 0 }))
    .filter(group => group.count)
  const rosterDisplay = rosterDisplayGroups.flatMap(group => group.rows)
  const focusMatch = todayRows.find(row => isLiveMatch(row.match) || isUpcomingMatch(row.match)) ||
    nextMatch ||
    finishedRows[0] ||
    null
  const featuredMap = mapSpotlight
  const teamShareModel = getShareModel({
    team,
    seasonId,
    featuredMap,
    advanceState,
    matchSummary,
    recentForm,
    focusMatch,
    finishedRows,
    corePlayers,
    rosterPlayers: rosterDisplay,
    teamLeaders,
    rosterSize: roster.length,
    locale
  })

  const teamFavorited = team ? Boolean(isFavoriteTeam?.(team)) : false
  const favoriteCount = safeArr(favorites?.favoriteTeamIds).length
  const favoriteLimitReached = !teamFavorited && favoriteCount >= (favoriteLimits?.teams || 5)

  const handleBack = () => {
    if (sourceReturnState.returnTo) {
      const restoreState = buildTeamBackState(sourceReturnState)
      navigate(sourceReturnState.returnTo, restoreState ? { state: restoreState } : undefined)
      return
    }

    if (window.history.state && window.history.state.idx > 0) navigate(-1)
    else navigate(withSeason('/teams'))
  }

  if (!team) {
    return (
      <div className={styles.shell}>
        <section className={styles.errorState}>
          <div className={styles.sectionLabel}>TEAM DOSSIER</div>
          <h1>未找到战队</h1>
          <p>当前赛季中不存在编号或简称为 {teamId} 的战队。</p>
          <button type="button" onClick={handleBack} className={styles.primaryButton}>返回战队目录</button>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <button type="button" className={styles.backButton} onClick={handleBack}>← 返回</button>
        <Link to={withSeason('/following?manage=1')} className={styles.manageLink}>管理关注 →</Link>
      </div>

      <RosterSubnav withSeason={withSeason} />

      <section className={styles.teamHero}>
        {featuredMap.imageUrl ? (
          <img
            className={styles.teamHeroMap}
            src={featuredMap.imageUrl}
            alt=""
            loading="lazy"
            onError={event => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        <div className={styles.teamHeroOverlay} aria-hidden="true" />

        <div className={styles.heroLogoStage}>
          {teamFavorited ? <span className={styles.followingBadge}>FOLLOWING</span> : null}
          <TeamLogo team={team} seasonId={seasonId} className={styles.heroTeamLogo} large />
        </div>

        <div className={styles.heroMainStage}>
          <div className={styles.heroTopLine}>
            <div className={styles.sectionLabel}>TEAM DOSSIER</div>
            <div className={styles.heroSeason}>{String(seasonId || 'FRIES CUP').toUpperCase()}</div>
          </div>

          <h1>{team.shortName}</h1>
          <p>{team.fullName}</p>

          <div className={styles.heroMetaStrip}>
            {team.groupLabel ? (
              <span>
                <strong>赛事分组</strong>
                <b>{team.groupLabel} 组</b>
              </span>
            ) : null}
            <span>
              <strong>经理</strong>
              <StaffIdentityValue people={team.staff.managers} />
            </span>
            <span>
              <strong>教练</strong>
              <StaffIdentityValue people={team.staff.coaches} />
            </span>
            <span className={styles.heroRosterMetaItem}>
              <strong>阵容结构</strong>
              <b className={styles.heroRolePills}>
                {roleComposition.length ? roleComposition.map(item => (
                  <i key={item.role}>
                    {getRosterRoleLabel(item.role, locale)}
                    <em>{item.count}</em>
                  </i>
                )) : `${roster.length} 名选手`}
              </b>
            </span>
          </div>

          <div className={styles.heroMetrics}>
            <HeaderMetric label="当前排名" value={advanceState.label} meta={advanceState.zone} />
            <HeaderMetric label="比赛战绩" value={`${matchSummary.wins}-${matchSummary.losses}`} meta={`${matchSummary.completed} 场已完成`} />
            <HeaderMetric label="比赛胜率" value={formatPercent(matchSummary.winRate)} meta={`${matchSummary.wins}-${matchSummary.losses}`} />
          </div>
        </div>

        <aside className={styles.heroIntelStage}>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={`${styles.primaryButton} ${teamFavorited ? styles.primaryButtonActive : ''}`}
              onClick={() => toggleTeamFavorite?.(team)}
              disabled={favoriteLimitReached}
            >
              {teamFavorited ? '取消关注' : favoriteLimitReached ? '关注已满' : '关注战队'}
            </button>
            <button
              type="button"
              className={styles.shareButton}
              onClick={() => setShareOpen(true)}
            >
              导出分享图
            </button>
          </div>

          <div className={styles.focusDossier}>
            <span>NEXT MATCH</span>
            <strong>{nextMatch ? nextMatch.opponentLabel : '暂无对手'}</strong>
            <em>{nextMatch ? `${getMatchRound(nextMatch.match)} · ${getMatchTimeLabel(nextMatch.match)}` : '暂无赛程'}</em>
            <b>{nextMatch ? nextMatch.score : '- : -'}</b>
          </div>

          <div className={styles.heroFormBlock}>
            <span>RECENT FORM</span>
            <FormStrip form={recentForm} />
          </div>

          <div className={styles.heroIntelFacts}>
            <span>
              <strong>{matchSummary.mapWins}-{matchSummary.mapLosses}</strong>
              <em>地图战绩</em>
            </span>
            <span>
              <strong>{formatPercent(matchSummary.mapWinRate)}</strong>
              <em>地图胜率</em>
            </span>
            <span>
              <strong>{todayRows.length || '-'}</strong>
              <em>今日赛程</em>
            </span>
            <span>
              <strong>{matchSummary.pending || '-'}</strong>
              <em>待赛</em>
            </span>
          </div>
        </aside>
      </section>

      <div className={styles.tabs} role="tablist" aria-label="Team dossier tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? styles.tabActive : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className={styles.overviewGrid}>
          <section className={`${styles.panel} ${styles.mapSpotlightPanel}`}>
            <div className={styles.panelHead}>
              <h2>赛场背景</h2>
              <span>BATTLEGROUND PROFILE</span>
            </div>
            <div className={styles.mapSpotlight}>
              <div className={styles.mapSpotlightVisual}>
                {featuredMap.imageUrl ? (
                  <img
                    src={featuredMap.imageUrl}
                    alt={featuredMap.displayName}
                    loading="lazy"
                    onError={event => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
                <div className={styles.mapSpotlightCaption}>
                  <span>{featuredMap.hasData ? 'REPRESENTATIVE MAP' : 'MAP PROFILE PENDING'}</span>
                  <strong>{featuredMap.displayName}</strong>
                  <em>{featuredMap.hasData ? `${featuredMap.mode} · ${featuredMap.maps} maps tracked` : '首场完赛后生成代表地图'}</em>
                </div>
              </div>
              <div className={styles.mapSpotlightIntel}>
                <span className={styles.mapIntelKicker}>TEAM ON THIS MAP</span>
                <div className={styles.mapIntelTitle}>
                  <strong>{featuredMap.displayName}</strong>
                  <em>{featuredMap.mode}</em>
                </div>
                <div className={styles.mapIntelGrid}>
                  <span>
                    <b>{featuredMap.hasData ? featuredMap.maps : '-'}</b>
                    <em>出场地图</em>
                  </span>
                  <span>
                    <b>{featuredMap.recordLabel}</b>
                    <em>地图战绩</em>
                  </span>
                  <span>
                    <b>{featuredMap.hasData ? formatPercent(featuredMap.winRate) : '-'}</b>
                    <em>地图胜率</em>
                  </span>
                  <span>
                    <b>{featuredMap.typeRecord ? formatMapRecord(featuredMap.typeRecord.wins, featuredMap.typeRecord.losses, featuredMap.typeRecord.draws) : '-'}</b>
                    <em>{featuredMap.typeRecord ? `${featuredMap.typeRecord.mode} 类型` : '类型战绩'}</em>
                  </span>
                </div>
                <div className={styles.mapIntelNote}>
                  <span>RECENT RECORD</span>
                  {featuredMap.hasData ? (
                    <strong>
                      {featuredMap.latestResult} vs {featuredMap.latestOpponent} · {featuredMap.latestRound} · {featuredMap.latestScore}
                    </strong>
                  ) : (
                    <strong>等待已完赛地图数据</strong>
                  )}
                  {featuredMap.latestTimeLabel ? <em>{featuredMap.latestTimeLabel}</em> : null}
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.corePanel}`}>
            <div className={styles.panelHead}>
              <h2>核心五人</h2>
              <span>STARTING FIVE</span>
            </div>
            <div className={styles.coreRosterList}>
              {startingFiveSlots.map((slot, index) => {
                const player = slot.player
                if (!player) {
                  return (
                    <div key={slot.id} className={`${styles.coreRosterCard} ${styles.coreRosterEmpty}`}>
                      <span className={styles.coreSlotTop}>
                        <b>{getRosterRoleLabel(slot.role, locale)}</b>
                        <em>{String(index + 1).padStart(2, '0')}</em>
                      </span>
                      <span className={styles.coreRosterName}>
                        <strong>待定</strong>
                        <em>阵容待补充</em>
                      </span>
                    </div>
                  )
                }

                const mapsPlayed = toNumber(player.maps_played)
                const timeMins = toNumber(player.raw_time_mins)
                const hasUsage = mapsPlayed > 0 || timeMins > 0
                const awardBadges = leaderBadgesByPlayer.get(getPlayerRosterKey(player)) || []
                const appearanceRate = trackedRosterMapCount ? Math.min(1, mapsPlayed / trackedRosterMapCount) : 0

                return (
                  <Link
                    key={`${slot.id}:${getPlayerRosterKey(player)}`}
                    to={withSeason(`/players/${player.identity?.playerId || player.player_id}`)}
                    className={styles.coreRosterCard}
                  >
                    <PlayerPortrait player={player} className={styles.coreRosterHeroWash} decorative />
                    <span className={styles.coreSlotTop}>
                      <b>{getRosterRoleLabel(slot.role, locale)}</b>
                      <em>{String(index + 1).padStart(2, '0')}</em>
                    </span>
                    <span className={styles.coreRosterMain}>
                      <span className={styles.coreRosterName}>
                        <strong>{getPlayerName(player)}</strong>
                        {getDistinctSecondaryName(getPlayerName(player), player.identity?.secondary) ? (
                          <small>{player.identity?.secondary}</small>
                        ) : null}
                      </span>
                    </span>
                    <span className={`${styles.coreAwardTags} ${awardBadges.length ? '' : styles.coreAwardTagsEmpty}`}>
                      {awardBadges.map(badge => (
                        <span key={badge.label} title={badge.valueLabel}>{badge.label}</span>
                      ))}
                    </span>
                    {hasUsage ? (
                      <span className={styles.coreRosterMeta}>
                        <span><b>{formatPercent(appearanceRate)}</b><em>出场率</em></span>
                        <span><b>{formatPlayerTime(timeMins)}</b><em>出场时长</em></span>
                      </span>
                    ) : (
                      <span className={styles.coreRosterMeta}>
                        <span className={styles.coreRosterMetaEmpty} data-i18n-ignore>
                          {locale === 'en-US' ? 'NOT YET PLAYED' : '尚未出场'}
                        </span>
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.rosterPanel}`}>
            <div className={styles.panelHead}>
              <h2>完整名单</h2>
              <span>
                {roster.length} PLAYERS
                {roleComposition.length ? ` · ${roleComposition.map(item => `${getRosterRoleLabel(item.role, locale)} ${item.count}`).join(' · ')}` : ''}
              </span>
            </div>
            <div
              className={styles.rosterWall}
              data-roster-size={Math.min(Math.max(rosterDisplay.length, 5), 7)}
              style={{ '--roster-count': Math.max(rosterDisplay.length, 1) }}
            >
              {rosterDisplayGroups.map(group => (
                <div
                  key={group.role}
                  className={styles.rosterRoleGroup}
                  data-role={group.role}
                  style={{ '--roster-role-count': group.rows.length }}
                >
                  {group.rows.map(player => (
                    <RosterPlayerRow
                      key={player.identity?.playerId || player.player_id}
                      player={player}
                      withSeason={withSeason}
                      locale={locale}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.schedulePanel}`}>
            <div className={styles.panelHead}>
              <h2>赛程近况</h2>
              <span>MATCH DESK</span>
            </div>
            <div className={styles.scheduleBoard}>
              <div className={styles.scheduleFocus}>
                {focusMatch ? (
                  <TeamFocusCard
                    row={focusMatch}
                    withSeason={withSeason}
                    seasonId={seasonId}
                    matchSummary={matchSummary}
                    recentForm={recentForm}
                  />
                ) : (
                  <div className={styles.emptyPanel}>暂无待进行比赛</div>
                )}
              </div>
              <div className={styles.scheduleRecent}>
                <div className={styles.scheduleSubhead}>
                  <strong>最近赛果</strong>
                  <span>RECENT RESULTS</span>
                </div>
                <div className={styles.recentTimeline}>
                  {finishedRows.slice(0, 3).length ? finishedRows.slice(0, 3).map(row => (
                    <TeamTimelineRow key={row.match.match_id} row={row} withSeason={withSeason} seasonId={seasonId} />
                  )) : <div className={styles.emptyPanel}>暂无已完成比赛</div>}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'matches' ? (
        <section className={`${styles.panel} ${styles.matchesPanel}`}>
          <div className={styles.panelHead}>
            <h2>赛程赛果</h2>
            <Link to={withSeason(`/matches?team=${encodeURIComponent(team.shortName)}`)}>查看全部相关比赛 →</Link>
          </div>
          <div className={styles.matchLedgerSummary}>
            <span><em>SEASON PROGRESS</em><strong>{seasonLedgerStats.progress}</strong><small>赛程进度</small></span>
            <span><em>MAP DIFFERENTIAL</em><strong>{seasonLedgerStats.mapDifferential}</strong><small>净胜地图</small></span>
            <span><em>SWEEPS</em><strong>{seasonLedgerStats.sweeps}</strong><small>横扫场次</small></span>
            <span>
              <em>WIN STREAK</em>
              <strong>W{seasonLedgerStats.currentWinStreak}</strong>
              <small>当前连胜 · 最长 W{seasonLedgerStats.longestWinStreak}</small>
            </span>
          </div>
          <div className={styles.matchLedgerToolbar}>
            <div>
              <span>SEASON LEDGER</span>
              <strong>完整赛季记录</strong>
            </div>
            <div className={styles.matchFilters} role="group" aria-label="赛程筛选">
              {matchFilterOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={effectiveMatchFilter === option.id ? styles.matchFilterActive : ''}
                  aria-pressed={effectiveMatchFilter === option.id}
                  disabled={option.id !== 'all' && option.count === 0}
                  onClick={() => setMatchFilter(option.id)}
                >
                  {option.label}<span>{option.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.matchLedgerList}>
            {filteredMatchRows.length ? filteredMatchRows.map((row, index) => (
              <TeamSeasonMatchRow
                key={row.match.match_id}
                row={row}
                index={index}
                isFirst={index === 0}
                isLast={index === filteredMatchRows.length - 1}
                withSeason={withSeason}
                seasonId={seasonId}
                locale={locale}
              />
            )) : <div className={`${styles.emptyPanel} ${styles.matchLedgerEmpty}`}>当前筛选下暂无比赛</div>}
          </div>
        </section>
      ) : null}

      {activeTab === 'stats' ? (
        <section className={`${styles.panel} ${styles.statsPanel}`}>
          <div className={styles.panelHead}>
            <h2>{isEn ? 'Team Stats' : '战队数据'}</h2>
            <span>{isEn ? 'TACTICAL PROFILE' : '战术画像'}</span>
          </div>

          <section className={styles.tacticalCommandDeck}>
            <div className={styles.tacticalIdentity}>
              <span className={styles.tacticalEyebrow}>
                <em>TEAM ARCHETYPE</em>
                <small>{isEn ? 'Data-derived tactical read' : '基于赛事数据的战术研判'}</small>
              </span>
              <strong>{tacticalProfile.archetype}</strong>
              <b>{tacticalProfile.archetypeEn}</b>
              <p>{tacticalProfile.description}</p>
              <span className={styles.tacticalMetaStrip}>
                <span><em>{isEn ? 'CONFIDENCE' : '研判可信度'}</em><strong>{tacticalProfile.confidence}</strong></span>
                <span><em>{isEn ? 'MAP SAMPLE' : '地图样本'}</em><strong>{tacticalProfile.mapSamples}</strong></span>
                <span><em>{isEn ? 'MODE COVERAGE' : '模式覆盖'}</em><strong>{tacticalProfile.modeCount}/{Object.keys(OW_MAP_MODE_LABELS).length}</strong></span>
                <span><em>{isEn ? 'CORE LOAD' : '主力负载'}</em><strong>{tacticalProfile.coreShare ? formatPercent(tacticalProfile.coreShare) : '--'}</strong></span>
              </span>
            </div>

            <div className={styles.tacticalAxes}>
              <span className={styles.tacticalSubhead}>
                <em>TACTICAL DNA</em>
                <strong>{isEn ? 'Offense and defense tendencies' : '攻防倾向'}</strong>
              </span>
              <div className={styles.tacticalAxisList}>
                {tacticalProfile.axes.map(axis => <TacticalAxisRow key={axis.id} axis={axis} isEn={isEn} />)}
              </div>
            </div>
          </section>

          <section className={styles.recordedCompsSection}>
            <div className={styles.statsSectionHead}>
              <span>
                <em>RECORDED COMPS</em>
                <h3>{isEn ? 'Recorded five-hero lineups' : '最终记录阵容'}</h3>
              </span>
              <small>
                {isEn
                  ? `TOP 3 · ${recordedLineups.completeSamples} COMPLETE SAMPLES`
                  : `TOP 3 · ${recordedLineups.completeSamples} 个完整样本`}
              </small>
            </div>
            {recordedLineups.lineups.length ? (
              <>
                <div className={styles.recordedCompsBoard}>
                  {recordedLineups.lineups.map(lineup => (
                    <RecordedCompCard key={lineup.key} lineup={lineup} isEn={isEn} />
                  ))}
                </div>
                <div className={styles.recordedCompsMethod}>
                  <strong>{isEn ? 'METHOD' : '统计口径'}</strong>
                  <span>
                    {isEn
                      ? 'Built from each map\'s final recorded five-hero set; this does not imply full-map uptime.'
                      : '基于每张地图最终记录的五英雄组合统计，不代表整局全程阵容。'}
                  </span>
                </div>
              </>
            ) : (
              <div className={`${styles.emptyPanel} ${styles.recordedCompsEmpty}`}>
                <strong>{isEn ? 'No complete recorded lineup yet' : '暂无完整记录阵容'}</strong>
                <span>{isEn ? 'This section appears after all five final heroes are recorded on the same map.' : '同一张地图记录完整五个最终英雄后将在这里生成。'}</span>
              </div>
            )}
          </section>

          <section className={styles.coachingWorkbench}>
            <div className={styles.statsSectionHead}>
              <span>
                <em>COACHING READOUT</em>
                <h3>{isEn ? 'Coaching observations' : '教练观察'}</h3>
              </span>
              <small>{isEn ? 'Strengths, exposure and the next training focus' : '优势、暴露点与下一训练重点'}</small>
            </div>
            <div className={styles.coachingNoteGrid}>
              {tacticalProfile.notes.map((note, index) => <CoachingNote key={`${note.tone}-${index}`} note={note} />)}
            </div>
          </section>

          <section className={styles.statsDataSection}>
            <div className={styles.statsSectionHead}>
              <span>
                <em>COMBAT PROFILE</em>
                <h3>{isEn ? 'Team combat profile' : '团队作战画像'}</h3>
              </span>
              <small>
                {teamCombatProfile.hasData
                  ? `${isEn ? 'Compared with' : '对比'} ${tournamentCombatBaseline.teamCount} ${isEn ? 'teams' : '支有效样本队伍'}`
                  : isEn ? 'Awaiting official combat data' : '等待官方赛时作战数据'}
              </small>
            </div>
            <div className={styles.combatMetricGrid}>
              {combatComparisons.filter(item => item.featured).map(item => (
                <CombatMetricCard key={item.id} item={item} isEn={isEn} />
              ))}
            </div>
          </section>

          <section className={styles.statsDataSection}>
            <div className={styles.statsSectionHead}>
              <span>
                <em>PLAYER RESPONSIBILITY MATRIX</em>
                <h3>{isEn ? 'Core player role reads' : '核心选手职责画像'}</h3>
              </span>
              <small>{isEn ? 'Strongest role-relative trait for each starter' : '展示每名首发相对同职责最突出的维度'}</small>
            </div>
            <div className={styles.playerStyleGrid}>
              {playerStyleProfiles.map(profile => (
                <PlayerStyleCard key={getPlayerRosterKey(profile.player)} profile={profile} isEn={isEn} />
              ))}
            </div>
          </section>

          <div className={styles.statsAnalysisGrid}>
            <section className={styles.statsDataSection}>
              <div className={styles.statsSectionHead}>
                <span>
                  <em>MODE PERFORMANCE</em>
                  <h3>{isEn ? 'Map mode performance' : '地图类型表现'}</h3>
                </span>
                <small>{mapPoolSamples} {isEn ? 'maps tracked' : '张地图样本'}</small>
              </div>
              <div className={styles.mapModeList}>
              {mapTypeStats.length ? mapTypeStats.map(row => (
                  <MapModePerformanceRow key={row.type} row={row} locale={locale} />
                )) : <div className={`${styles.emptyPanel} ${styles.statsEmptyPanel}`}>{isEn ? 'No map mode data' : '暂无地图类型数据'}</div>}
              </div>
            </section>

            <section className={`${styles.statsDataSection} ${styles.mapPoolSection}`}>
              <div className={styles.statsSectionHead}>
                <span>
                  <em>COMPLETE MAP POOL</em>
                  <h3>{isEn ? 'Complete map pool' : '完整地图池'}</h3>
                </span>
                <small>{teamMapPool.length} {isEn ? 'maps' : '张地图'}</small>
              </div>
              <div className={styles.teamMapGrid}>
                {teamMapPool.length ? teamMapPool.map(map => (
                  <TeamMapPoolCard key={map.name} map={map} isEn={isEn} />
                )) : <div className={`${styles.emptyPanel} ${styles.statsEmptyPanel}`}>{isEn ? 'No map pool data' : '暂无地图池数据'}</div>}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      <TeamShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        model={teamShareModel}
      />
    </div>
  )
}

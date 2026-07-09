import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import RosterSubnav from '../../components/roster/RosterSubnav.jsx'
import { PlayerAvatar } from '../../components/roster/PlayerDirectoryCard.jsx'
import TeamShareDialog from '../../features/team-share/TeamShareDialog.jsx'
import {
  getPlayerAvatarSource,
  getPlayerDirectory,
  getPlayerDisplayIdentity,
  getTeamDirectory,
  getTeamRosterPlayers,
  getRosterRoleLabel,
  normalizeStaffIdentity,
  normalizeRosterRole,
  safeArr
} from '../../lib/rosterSelectors.js'
import {
  getMatchTimeLabel,
  isFinishedMatch,
  isLiveMatch,
  isUpcomingMatch,
  sortMatchesBySchedule
} from '../../lib/matchesSelectors.js'
import { formatOwHeroName, formatOwMapMode, formatOwMapName, getOwMapImageName, getOwMapModeFolder } from '../../lib/heroes.js'
import { getSwissStandings } from '../../lib/selectors.js'
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
  { id: 'roster', label: '完整名单' },
  { id: 'matches', label: '赛程赛果' },
  { id: 'stats', label: '战队数据' }
]

const ROLE_LABELS = {
  TANK: '重装',
  DPS: '输出',
  SUP: '支援',
  FLEX: '自由'
}

const ADVANCE_SLOTS = 8

const ROLE_ORDER = ['TANK', 'DPS', 'SUP']

const STARTING_FIVE_SLOTS = [
  { id: 'tank', role: 'TANK', label: '重装' },
  { id: 'dps-1', role: 'DPS', label: '输出' },
  { id: 'dps-2', role: 'DPS', label: '输出' },
  { id: 'sup-1', role: 'SUP', label: '支援' },
  { id: 'sup-2', role: 'SUP', label: '支援' }
]

const FALLBACK_MAP_VISUAL = {
  displayName: '漓江塔',
  mode: '控制',
  imageUrl: '/maps/Control/Lijiang_Tower.jpg'
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

function getFeaturedMapVisual(focusMatch, finishedRows, matchRows, locale = 'zh-CN') {
  const row = [focusMatch, ...safeArr(finishedRows), ...safeArr(matchRows)]
    .filter(Boolean)
    .find(item => safeArr(item.match?.maps).some(map => map?.map_name && String(map?.map_type || '').toUpperCase() !== 'UNKNOWN'))
  const map = safeArr(row?.match?.maps).find(item => item?.map_name && String(item?.map_type || '').toUpperCase() !== 'UNKNOWN')
  return getMapVisual(map, locale)
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

  const fallback = getFeaturedMapVisual(null, [], rows, locale)
  return {
    ...fallback,
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

function sortCoreCandidates(a, b) {
  return Number(b?.raw_time_mins || 0) - Number(a?.raw_time_mins || 0) ||
    Number(b?.maps_played || 0) - Number(a?.maps_played || 0) ||
    getPlayerName(a).localeCompare(getPlayerName(b))
}

function getStartingFiveSlots(roster) {
  const rows = safeArr(roster).slice().sort(sortCoreCandidates)
  const used = new Set()

  return STARTING_FIVE_SLOTS.map(slot => {
    const rolePick = rows.find(player => normalizeRosterRole(player?.role) === slot.role && !used.has(getPlayerRosterKey(player)))
    const fallbackPick = rolePick || rows.find(player => !used.has(getPlayerRosterKey(player)))
    if (fallbackPick) used.add(getPlayerRosterKey(fallbackPick))
    return { ...slot, player: fallbackPick || null }
  })
}

function buildSharePlayer(player, locale = 'zh-CN') {
  return {
    id: player?.identity?.playerId || player?.player_id || getPlayerName(player),
    name: getPlayerName(player),
    role: getRosterRoleLabel(player?.role, locale),
    hero: getPlayerHeroLabel(player, locale),
    avatarSrc: getPlayerAvatarSrc(player),
    initials: getPlayerInitials(player)
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
    corePlayers: safeArr(corePlayers).slice(0, 4).map(player => buildSharePlayer(player, locale)),
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
  return match?.round || match?.stage || '赛程待定'
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

  if (!standing || !standing.matches_played) {
    return { label: '待生成', zone: '积分未生成', tone: 'pending' }
  }

  const rank = toNumber(standing.rank, 999)
  if (rank <= ADVANCE_SLOTS) return { label: `第 ${rank} 名`, zone: '晋级区', tone: 'win' }
  if (rank <= ADVANCE_SLOTS + 8) return { label: `第 ${rank} 名`, zone: '竞争区', tone: 'draw' }
  return { label: `第 ${rank} 名`, zone: '危险区', tone: 'loss' }
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
      heroLabel: player?.avatar?.heroName ? formatOwHeroName(player.avatar.heroName, locale) : '英雄数据待更新'
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

function TeamMatchCard({ row, withSeason }) {
  const location = useLocation()

  return (
    <Link
      to={withSeason(`/matches/${row.match.match_id}`)}
      state={getReturnState(location)}
      className={styles.matchCard}
      onClick={() => saveReturnScroll(location)}
    >
      <span className={`${styles.matchResult} ${styles[row.result.tone]}`}>{row.result.label}</span>
      <span className={styles.matchMain}>
        <strong>{row.opponentLabel}</strong>
        {row.opponentFullName ? <small>{row.opponentFullName}</small> : null}
        <em>{getMatchRound(row.match)} · {getMatchTimeLabel(row.match)}</em>
      </span>
      <span className={styles.matchScore}>{row.score}</span>
    </Link>
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

function RosterPlayerRow({ player, withSeason, locale = 'zh-CN' }) {
  return (
    <Link to={withSeason(`/players/${player.identity.playerId || player.player_id}`)} className={styles.rosterPlayerRow}>
      <PlayerAvatar avatar={player.avatar} name={player.identity.primary} />
      <span className={styles.rosterPlayerName}>
        <strong>{player.identity.primary}</strong>
        {player.identity.secondary ? <em>{player.identity.secondary}</em> : null}
      </span>
      <span className={styles.rosterPlayerRole}>{getRosterRoleLabel(player.role, locale)}</span>
      <span className={styles.rosterPlayerHero}>
        {player.hasStats && player.avatar?.heroName ? formatOwHeroName(player.avatar.heroName, locale) : '比赛开始后更新'}
      </span>
      <span className={styles.rosterPlayerStats}>
        <b>{toNumber(player.maps_played)} maps</b>
        <em>{formatPlayerTime(player.raw_time_mins)}</em>
      </span>
    </Link>
  )
}

export default function TeamDetailPage() {
  const {
    db,
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

  const activeTab = TABS.some(tab => tab.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
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
  const mapTypeStats = useMemo(() => getMapTypeStats(matchRows), [matchRows])
  const mapSpotlight = useMemo(() => getRepresentativeMapSpotlight(matchRows, locale), [matchRows, locale])
  const standings = useMemo(() => getSwissStandings(db), [db])
  const standing = useMemo(() => {
    if (!team) return null
    const keys = teamIdentitySet(team)
    return standings.find(row => [row.team_id, row.team_short_name, row.team_name].map(normalizeKey).some(value => keys.has(value))) || null
  }, [standings, team])

  const upcomingRows = matchRows.filter(row => isUpcomingMatch(row.match) || isLiveMatch(row.match))
  const todayRows = getTodayRows(matchRows)
  const nextMatch = upcomingRows[0] || null
  const finishedRows = matchRows.filter(row => isFinishedMatch(row.match)).reverse()
  const startingFiveSlots = getStartingFiveSlots(roster)
  const corePlayers = startingFiveSlots.map(slot => slot.player).filter(Boolean)
  const recentForm = getRecentForm(finishedRows)
  const advanceState = getAdvanceState(standing, team)
  const teamLeaders = useMemo(() => getTeamLeaders(roster, locale), [roster, locale])
  const leaderBadgesByPlayer = useMemo(() => getLeaderBadgesByPlayer(teamLeaders), [teamLeaders])
  const trackedRosterMapCount = useMemo(() => getTrackedRosterMapCount(roster), [roster])
  const roleComposition = ROLE_ORDER
    .map(role => ({ role, count: rosterGroups[role]?.length || 0 }))
    .filter(item => item.count)
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
        <img
          className={styles.teamHeroMap}
          src={featuredMap.imageUrl}
          alt=""
          loading="lazy"
          onError={event => {
            event.currentTarget.style.display = 'none'
          }}
        />
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
          <section className={`${styles.panel} ${styles.statusPanel}`}>
            <div className={styles.panelHead}>
              <h2>当前状态</h2>
              <span>TEAM SNAPSHOT</span>
            </div>
            <div className={styles.statusBoard}>
              <div className={styles.statusLead}>
                <span className={`${styles.statusBadge} ${styles[advanceState.tone]}`}>{advanceState.zone}</span>
                <strong>{advanceState.label}</strong>
                <em>{standing ? `瑞士轮 ${standing.match_wins || 0}-${standing.match_losses || 0}` : '等待积分生成'}</em>
              </div>
              <div className={styles.statusStats}>
                <HeaderMetric label="比赛胜率" value={formatPercent(matchSummary.winRate)} meta={`${matchSummary.wins}-${matchSummary.losses}`} />
                <HeaderMetric label="地图胜率" value={formatPercent(matchSummary.mapWinRate)} meta={`${matchSummary.mapWins}-${matchSummary.mapLosses}`} />
                <HeaderMetric label="今日比赛" value={todayRows.length || '-'} meta={todayRows.length ? '今日赛程' : '今日暂无'} />
                <HeaderMetric label="待赛" value={matchSummary.pending} meta={matchSummary.live ? `${matchSummary.live} 场进行中` : '未开始'} />
              </div>
              <div className={styles.formPanel}>
                <span>RECENT FORM</span>
                <FormStrip form={recentForm} />
              </div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.mapSpotlightPanel}`}>
            <div className={styles.panelHead}>
              <h2>赛场背景</h2>
              <span>BATTLEGROUND PROFILE</span>
            </div>
            <div className={styles.mapSpotlight}>
              <div className={styles.mapSpotlightVisual}>
                <img
                  src={featuredMap.imageUrl}
                  alt={featuredMap.displayName}
                  loading="lazy"
                  onError={event => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
                <div className={styles.mapSpotlightCaption}>
                  <span>REPRESENTATIVE MAP</span>
                  <strong>{featuredMap.displayName}</strong>
                  <em>{featuredMap.hasData ? `${featuredMap.mode} · ${featuredMap.maps} maps tracked` : '暂无有效地图记录'}</em>
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
                    key={slot.id}
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
                        <span className={styles.coreRosterMetaEmpty}>赛时待更新</span>
                      </span>
                    )}
                  </Link>
                )
              })}
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

      {activeTab === 'roster' ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>完整名单</h2>
            <span>{roster.length} PLAYERS</span>
          </div>
          <div className={styles.roleGroups}>
            {Object.entries(rosterGroups).filter(([, rows]) => rows.length).map(([role, rows]) => (
              <div key={role} className={styles.roleGroup}>
                <div className={styles.roleGroupHead}>{ROLE_LABELS[role] || getRosterRoleLabel(role, locale)} · {rows.length}</div>
                <div className={styles.rosterRows}>
                  {rows.map(player => (
                    <RosterPlayerRow key={player.identity?.playerId || player.player_id} player={player} withSeason={withSeason} locale={locale} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'matches' ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>赛程赛果</h2>
            <Link to={withSeason(`/matches?team=${encodeURIComponent(team.shortName)}`)}>查看全部相关比赛 →</Link>
          </div>
          <div className={styles.matchSections}>
            <div className={styles.matchBrief}>
              <h3>{todayRows.length ? '今日比赛' : '下一场'}</h3>
              {focusMatch ? <TeamMatchCard row={focusMatch} withSeason={withSeason} /> : <div className={styles.emptyPanel}>暂无待进行比赛</div>}
            </div>
            <div className={styles.matchTimelinePanel}>
              <h3>队伍赛程线</h3>
              <div className={styles.matchTimeline}>
                {matchRows.length ? matchRows.map(row => (
                  <TeamTimelineRow key={row.match.match_id} row={row} withSeason={withSeason} seasonId={seasonId} />
                )) : <div className={styles.emptyPanel}>暂无相关比赛</div>}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'stats' ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>{isEn ? 'Team Stats' : '战队数据'}</h2>
            <span>{isEn ? 'Season performance' : '赛季表现'}</span>
          </div>
          <div className={styles.statsLayout}>
            <div className={styles.statGrid}>
              <span><strong>{matchSummary.mapWins + matchSummary.mapLosses}</strong>地图数</span>
              <span><strong>{matchSummary.wins}-{matchSummary.losses}</strong>胜负</span>
              <span><strong>{matchSummary.pending}</strong>待赛</span>
              <span><strong>{matchSummary.live}</strong>进行中</span>
            </div>

            <div className={styles.dataBlock}>
              <h3>地图类型表现</h3>
              {mapTypeStats.length ? mapTypeStats.map(row => (
                <div key={row.type} className={styles.dataRow}>
                  <span>{row.type}</span>
                  <strong>{row.wins}-{row.losses}</strong>
                  <em>{row.maps} maps</em>
                </div>
              )) : <div className={styles.emptyPanel}>暂无地图类型数据</div>}
            </div>

            <div className={styles.dataBlock}>
              <h3>核心出场</h3>
              {corePlayers.length ? corePlayers.map(player => (
                <div key={player.identity?.playerId || player.player_id} className={styles.dataRow}>
                  <span>{player.identity?.primary || player.display_name || player.player_name}</span>
                  <strong>{player.maps_played || 0} maps</strong>
                  <em>{player.avatar?.heroName ? formatOwHeroName(player.avatar.heroName, locale) : 'no hero data'}</em>
                </div>
              )) : <div className={styles.emptyPanel}>暂无选手数据</div>}
            </div>
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

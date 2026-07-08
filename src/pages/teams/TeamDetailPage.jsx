import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import RosterSubnav from '../../components/roster/RosterSubnav.jsx'
import { PlayerAvatar } from '../../components/roster/PlayerDirectoryCard.jsx'
import TeamShareDialog from '../../features/team-share/TeamShareDialog.jsx'
import {
  formatStaffPerson,
  getPlayerAvatarSource,
  getPlayerDirectory,
  getPlayerDisplayIdentity,
  getTeamDirectory,
  getTeamRosterPlayers,
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
  TANK: 'TANK',
  DPS: 'DPS',
  SUP: 'SUP',
  FLEX: 'FLEX'
}

const ADVANCE_SLOTS = 8

const ROLE_ORDER = ['TANK', 'DPS', 'SUP', 'FLEX']

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

function buildSharePlayer(player, locale = 'zh-CN') {
  return {
    id: player?.identity?.playerId || player?.player_id || getPlayerName(player),
    name: getPlayerName(player),
    role: player?.role || 'FLEX',
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

function PlayerPortrait({ player, className = '' }) {
  const src = getPlayerAvatarSrc(player)
  const name = getPlayerName(player)
  return (
    <span className={className}>
      {src ? (
        <img
          src={src}
          alt={getPlayerHeroLabel(player)}
          loading="lazy"
          onError={event => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <b>{getPlayerInitials(player)}</b>
      )}
      <em>{name}</em>
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
      return {
        match,
        side,
        opponent,
        opponentLabel: opponent?.short || opponent?.team_short_name || opponent?.name || opponent?.team_name || 'TBD',
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
      if (!type || String(type).toUpperCase() === 'UNKNOWN') return
      if (!stats.has(type)) stats.set(type, { type, maps: 0, wins: 0, losses: 0 })

      const record = stats.get(type)
      const scoreA = Number(map?.score_a || 0)
      const scoreB = Number(map?.score_b || 0)
      const mine = row.side === 'team_a' ? scoreA : scoreB
      const other = row.side === 'team_a' ? scoreB : scoreA
      record.maps += 1
      if (mine > other) record.wins += 1
      else if (mine < other) record.losses += 1
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
        <em>{getMatchRound(row.match)} · {getMatchTimeLabel(row.match)}</em>
      </span>
      <span className={styles.matchScore}>{row.score}</span>
    </Link>
  )
}

function TeamTimelineRow({ row, withSeason }) {
  const location = useLocation()

  return (
    <Link
      to={withSeason(`/matches/${row.match.match_id}`)}
      state={getReturnState(location)}
      className={styles.timelineRow}
      onClick={() => saveReturnScroll(location)}
    >
      <span className={`${styles.matchResult} ${styles[row.result.tone]}`}>{row.result.label}</span>
      <span className={styles.timelineMain}>
        <strong>{row.opponentLabel}</strong>
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
      <span className={styles.rosterPlayerRole}>{player.role}</span>
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
  const corePlayers = [...roster]
    .sort((a, b) => Number(b.raw_time_mins || 0) - Number(a.raw_time_mins || 0) || Number(b.maps_played || 0) - Number(a.maps_played || 0))
    .slice(0, 5)
  const recentForm = getRecentForm(finishedRows)
  const advanceState = getAdvanceState(standing, team)
  const teamLeaders = getTeamLeaders(roster, locale)
  const roleComposition = ROLE_ORDER
    .map(role => ({ role, count: rosterGroups[role]?.length || 0 }))
    .filter(item => item.count)
  const focusMatch = todayRows.find(row => isLiveMatch(row.match) || isUpcomingMatch(row.match)) ||
    nextMatch ||
    finishedRows[0] ||
    null
  const featuredMap = getFeaturedMapVisual(focusMatch, finishedRows, matchRows, locale)
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
          <div className={styles.heroMapLabel}>
            <span>{featuredMap.mode}</span>
            <strong>{featuredMap.displayName}</strong>
          </div>
        </div>

        <div className={styles.heroMainStage}>
          <div className={styles.heroTopLine}>
            <div className={styles.sectionLabel}>TEAM DOSSIER</div>
            <div className={styles.heroSeason}>{String(seasonId || 'FRIES CUP').toUpperCase()}</div>
          </div>

          <h1>{team.shortName}</h1>
          <p>{team.fullName}</p>

          <div className={styles.heroMetaStrip}>
            {team.club ? <span><strong>俱乐部</strong>{team.club}</span> : null}
            <span><strong>经理</strong>{team.staff.managerLabel || '-'}</span>
            <span><strong>教练</strong>{team.staff.coachLabel || '-'}</span>
            <span><strong>阵容</strong>{roleComposition.map(item => `${item.role} ${item.count}`).join(' / ') || `${roster.length} 名选手`}</span>
          </div>

          <div className={styles.heroMetrics}>
            <HeaderMetric label="当前排名" value={advanceState.label} meta={advanceState.zone} />
            <HeaderMetric label="比赛战绩" value={`${matchSummary.wins}-${matchSummary.losses}`} meta={`${matchSummary.completed} 场已完成`} />
            <HeaderMetric label="地图战绩" value={`${matchSummary.mapWins}-${matchSummary.mapLosses}`} meta={formatPercent(matchSummary.mapWinRate)} />
            <HeaderMetric label="下一场" value={nextMatch ? nextMatch.opponentLabel : '待定'} meta={nextMatch ? getMatchTimeLabel(nextMatch.match) : '暂无赛程'} />
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
            <span>{todayRows.length ? 'TODAY MATCH' : 'FOCUS MATCH'}</span>
            <strong>{focusMatch ? focusMatch.opponentLabel : '暂无对手'}</strong>
            <em>{focusMatch ? `${getMatchRound(focusMatch.match)} · ${getMatchTimeLabel(focusMatch.match)}` : '暂无赛程'}</em>
            <b>{focusMatch ? focusMatch.score : '- : -'}</b>
          </div>

          <div className={styles.heroFormBlock}>
            <span>RECENT FORM</span>
            <FormStrip form={recentForm} />
          </div>

          <div className={styles.heroCoreStrip}>
            {corePlayers.slice(0, 4).map(player => (
              <Link
                key={player.identity?.playerId || player.player_id}
                to={withSeason(`/players/${player.identity?.playerId || player.player_id}`)}
                className={styles.heroCorePlayer}
              >
                <PlayerPortrait player={player} className={styles.heroCoreAvatar} />
                <strong>{getPlayerName(player)}</strong>
                <em>{player.role} / {getPlayerHeroLabel(player, locale)}</em>
              </Link>
            ))}
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
              <span>{featuredMap.mode}</span>
            </div>
            <div className={styles.mapSpotlight}>
              <img
                src={featuredMap.imageUrl}
                alt={featuredMap.displayName}
                loading="lazy"
                onError={event => {
                  event.currentTarget.style.display = 'none'
                }}
              />
              <div>
                <span>MAP BACKDROP</span>
                <strong>{featuredMap.displayName}</strong>
                <em>{focusMatch ? `${focusMatch.opponentLabel} · ${getMatchTimeLabel(focusMatch.match)}` : '来自最近有效比赛记录'}</em>
              </div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.corePanel}`}>
            <div className={styles.panelHead}>
              <h2>核心轮廓</h2>
              <span>CORE FOUR</span>
            </div>
            <div className={styles.corePortraitGrid}>
              {corePlayers.slice(0, 4).length ? corePlayers.slice(0, 4).map(player => (
                <Link
                  key={player.identity?.playerId || player.player_id}
                  to={withSeason(`/players/${player.identity?.playerId || player.player_id}`)}
                  className={styles.corePortraitCard}
                >
                  <PlayerPortrait player={player} className={styles.corePortrait} />
                  <span>
                    <strong>{getPlayerName(player)}</strong>
                    <em>{player.role} / {getPlayerHeroLabel(player, locale)}</em>
                  </span>
                </Link>
              )) : <div className={styles.emptyPanel}>暂无核心出场数据</div>}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>队伍信息</h2>
              <span>PROFILE</span>
            </div>
            <div className={styles.profileList}>
              <span><strong>简称</strong>{team.shortName}</span>
              <span><strong>全称</strong>{team.fullName}</span>
              <span><strong>经理</strong>{team.staff.managers.map(formatStaffPerson).join('、') || '-'}</span>
              {team.staff.coaches.length ? <span><strong>教练</strong>{team.staff.coaches.map(formatStaffPerson).join('、')}</span> : null}
              <span><strong>当前排名</strong>{advanceState.label}</span>
              <span><strong>阵容结构</strong>{roleComposition.map(item => `${item.role} ${item.count}`).join(' / ') || '待补充'}</span>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.focusPanel}`}>
            <div className={styles.panelHead}>
              <h2>{todayRows.length ? '今日比赛' : '焦点比赛'}</h2>
              <span>{todayRows.length ? 'TODAY' : 'FOCUS'}</span>
            </div>
            {focusMatch ? (
              <TeamMatchCard row={focusMatch} withSeason={withSeason} />
            ) : (
              <div className={styles.emptyPanel}>暂无待进行比赛</div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>最近赛果</h2>
              <span>RECENT</span>
            </div>
            <div className={styles.stack}>
              {finishedRows.slice(0, 3).length ? finishedRows.slice(0, 3).map(row => (
                <TeamMatchCard key={row.match.match_id} row={row} withSeason={withSeason} />
              )) : <div className={styles.emptyPanel}>暂无已完成比赛</div>}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.leadersPanel}`}>
            <div className={styles.panelHead}>
              <h2>队内代表</h2>
              <span>TEAM LEADERS</span>
            </div>
            <div className={styles.leaderGrid}>
              {teamLeaders.length ? teamLeaders.map(item => (
                <Link
                  key={item.label}
                  to={withSeason(`/players/${item.player.identity?.playerId || item.player.player_id}`)}
                  className={styles.leaderCard}
                >
                  <span>{item.label}</span>
                  <strong>{item.player.identity?.primary || item.player.display_name || item.player.player_name}</strong>
                  <em>{item.valueLabel}</em>
                  <b>{item.heroLabel}</b>
                </Link>
              )) : <div className={styles.emptyPanel}>暂无队内数据</div>}
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
                <div className={styles.roleGroupHead}>{ROLE_LABELS[role] || role} · {rows.length}</div>
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
                  <TeamTimelineRow key={row.match.match_id} row={row} withSeason={withSeason} />
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

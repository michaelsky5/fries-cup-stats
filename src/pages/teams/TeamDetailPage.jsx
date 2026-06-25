import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import RosterSubnav from '../../components/roster/RosterSubnav.jsx'
import { PlayerAvatar } from '../../components/roster/PlayerDirectoryCard.jsx'
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
import { formatOwHeroName } from '../../lib/heroes.js'
import { getSwissStandings } from '../../lib/selectors.js'
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
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
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
    live: rows.filter(row => isLiveMatch(row.match)).length
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

function TeamMatchCard({ row, withSeason }) {
  return (
    <Link to={withSeason(`/matches/${row.match.match_id}`)} className={styles.matchCard}>
      <span className={`${styles.matchResult} ${styles[row.result.tone]}`}>{row.result.label}</span>
      <span className={styles.matchMain}>
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
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [teamId])

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
  const nextMatch = upcomingRows[0] || null
  const finishedRows = matchRows.filter(row => isFinishedMatch(row.match)).reverse()
  const currentRound = nextMatch?.match?.round || finishedRows[0]?.match?.round || ''
  const currentRoundRows = currentRound ? matchRows.filter(row => row.match?.round === currentRound) : []
  const corePlayers = [...roster]
    .sort((a, b) => Number(b.raw_time_mins || 0) - Number(a.raw_time_mins || 0) || Number(b.maps_played || 0) - Number(a.maps_played || 0))
    .slice(0, 5)

  const teamFavorited = team ? Boolean(isFavoriteTeam?.(team)) : false
  const favoriteCount = safeArr(favorites?.favoriteTeamIds).length
  const favoriteLimitReached = !teamFavorited && favoriteCount >= (favoriteLimits?.teams || 5)

  const handleBack = () => {
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

      <section className={styles.teamHeader}>
        <div className={styles.logoPanel}>
          {teamFavorited ? <span className={styles.followingBadge}>FOLLOWING</span> : null}
          <TeamLogo team={team} seasonId={seasonId} className={styles.detailLogo} large />
        </div>

        <div className={styles.teamIdentity}>
          <div className={styles.sectionLabel}>TEAM DOSSIER</div>
          <h1>{team.shortName}</h1>
          <p>{team.fullName}</p>
          <div className={styles.infoGrid}>
            {team.club ? <span><strong>俱乐部</strong>{team.club}</span> : null}
            {team.staff.managerLabel ? <span><strong>经理</strong>{team.staff.managerLabel}</span> : null}
            {team.staff.coachLabel ? <span><strong>教练</strong>{team.staff.coachLabel}</span> : null}
            <span><strong>名单</strong>{roster.length} 名选手</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.primaryButton} ${teamFavorited ? styles.primaryButtonActive : ''}`}
            onClick={() => toggleTeamFavorite?.(team)}
            disabled={favoriteLimitReached}
          >
            {teamFavorited ? '取消关注' : favoriteLimitReached ? '关注已满' : '关注战队'}
          </button>
        </div>
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
              <span><strong>当前排名</strong>{team.final_rank_text || (standing ? `瑞士轮第 ${standing.rank}` : '待更新')}</span>
              <span><strong>晋级状态</strong>{standing ? `${standing.match_wins || 0}-${standing.match_losses || 0}` : '随赛程生成'}</span>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>下一场比赛</h2>
              <span>NEXT MATCH</span>
            </div>
            {nextMatch ? (
              <TeamMatchCard row={nextMatch} withSeason={withSeason} />
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

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>核心数据摘要</h2>
              <span>SUMMARY</span>
            </div>
            <div className={styles.statGrid}>
              <span><strong>{matchSummary.completed}</strong>已完成</span>
              <span><strong>{matchSummary.wins}-{matchSummary.losses}</strong>胜负</span>
              <span><strong>{matchSummary.mapWins}-{matchSummary.mapLosses}</strong>地图</span>
              <span><strong>{roster.length}</strong>名单人数</span>
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
            <div>
              <h3>下一场</h3>
              {nextMatch ? <TeamMatchCard row={nextMatch} withSeason={withSeason} /> : <div className={styles.emptyPanel}>暂无待进行比赛</div>}
            </div>
            <div>
              <h3>当前比赛周</h3>
              <div className={styles.stack}>
                {currentRoundRows.length ? currentRoundRows.map(row => (
                  <TeamMatchCard key={row.match.match_id} row={row} withSeason={withSeason} />
                )) : <div className={styles.emptyPanel}>暂无当前轮次比赛</div>}
              </div>
            </div>
            <div>
              <h3>最近赛果</h3>
              <div className={styles.stack}>
                {finishedRows.slice(0, 5).length ? finishedRows.slice(0, 5).map(row => (
                  <TeamMatchCard key={row.match.match_id} row={row} withSeason={withSeason} />
                )) : <div className={styles.emptyPanel}>暂无已完成比赛</div>}
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
              <h3>主要选手数据</h3>
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
    </div>
  )
}

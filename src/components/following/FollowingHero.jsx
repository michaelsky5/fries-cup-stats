import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import styles from '../../pages/following/FollowingPage.module.css'

export default function FollowingHero({
  overview,
  favorites,
  favoriteLimits,
  seasonId,
  withSeason,
  onManage
}) {
  const nextMatch = overview?.nextMatch
  const teamPath = overview?.teamRouteId || overview?.teamId
    ? withSeason(`/teams/${encodeURIComponent(overview.teamRouteId || overview.teamId)}`)
    : withSeason('/teams')
  const matchPath = nextMatch?.matchId
    ? withSeason(`/matches/${encodeURIComponent(nextMatch.matchId)}`)
    : withSeason('/matches?view=list&tab=following')
  const opponentPath = nextMatch?.opponent?.routeId
    ? withSeason(`/teams/${encodeURIComponent(nextMatch.opponent.routeId)}`)
    : withSeason('/teams')
  const title = overview?.seasonFinished ? '赛季结果' : '下一场比赛'
  const isTeamAOwn = nextMatch?.ownSide === 'a'
  const isTeamBOwn = nextMatch?.ownSide === 'b'

  return (
    <section className={styles.followingHero}>
      <div className={styles.heroIdentityCard}>
        <p className={styles.kicker}>MY FOLLOWING</p>
        <h1>我的关注</h1>
        {overview ? (
          <>
            <TeamLogo
              className={styles.heroTeamLogo}
              team={overview.team}
              seasonId={seasonId}
              teamShortName={overview.shortName}
              teamName={overview.fullName}
              large
            />
            <div className={styles.heroTeamName}>
              <strong>{overview.shortName}</strong>
              <span>{overview.fullName}</span>
            </div>
            <span className={styles.primaryBadge}>主关注队伍</span>
            <Link className={styles.darkLink} to={teamPath}>查看队伍资料 →</Link>
          </>
        ) : (
          <div className={styles.heroEmptyCopy}>
            <strong>尚未设置主关注队伍</strong>
            <span>打开管理关注，选择一支队伍作为赛事工作台主角。</span>
            <button type="button" onClick={onManage}>编辑关注</button>
          </div>
        )}
      </div>

      <div className={styles.heroMatchCard}>
        <div className={styles.heroMatchHead}>
          <div>
            <span>NEXT MATCH</span>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onManage}>编辑关注</button>
        </div>

        {nextMatch ? (
          <div className={styles.heroMatchBody}>
            <div className={styles.heroMatchupCard}>
              <div className={styles.heroMatchTeam} data-own={isTeamAOwn ? 'true' : 'false'}>
                <TeamLogo className={styles.matchupLogo} team={nextMatch.teamA} seasonId={seasonId} />
                <div>
                  <strong title={nextMatch.teamA.full}>{nextMatch.teamA.short}</strong>
                  <span>{nextMatch.teamA.full}</span>
                </div>
              </div>
              <span className={styles.heroVs}>VS</span>
              <div className={styles.heroMatchTeam} data-own={isTeamBOwn ? 'true' : 'false'}>
                <TeamLogo className={styles.matchupLogo} team={nextMatch.teamB} seasonId={seasonId} />
                <div>
                  <strong title={nextMatch.teamB.full}>{nextMatch.teamB.short}</strong>
                  <span>{nextMatch.teamB.full}</span>
                </div>
              </div>
            </div>
            <p>{nextMatch.compactTime} · {nextMatch.format} · {nextMatch.stageLabel}</p>
            <p>状态：{nextMatch.statusLabel}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} to={matchPath}>比赛详情</Link>
              {nextMatch.opponent ? <Link className={styles.textAction} to={opponentPath}>查看对手 →</Link> : null}
              <Link className={styles.textAction} to={teamPath}>队伍资料 →</Link>
            </div>
          </div>
        ) : (
          <div className={styles.heroNoMatch}>
            <strong>{overview?.seasonFinished ? overview.finalRankText : '当前轮暂无比赛'}</strong>
            <span>{overview ? '下一场比赛排定后将优先显示。' : '关注队伍后会显示主关注队伍的下一场比赛。'}</span>
          </div>
        )}

        <div className={styles.heroMetrics}>
          <div>
            <span>关注队伍</span>
            <strong>{favorites.favoriteTeamIds.length} / {favoriteLimits.teams}</strong>
          </div>
          <div>
            <span>关注选手</span>
            <strong>{favorites.favoritePlayerIds.length} / {favoriteLimits.players}</strong>
          </div>
          <div>
            <span>最近赛果</span>
            <strong>{overview?.latestResult ? `${overview.latestResult.score} · ${overview.latestResult.resultText || '已结束'}` : '暂无'}</strong>
          </div>
          <div>
            <span>排名 / 晋级</span>
            <strong>{overview?.advance?.played ? `${overview.advance.label} · ${overview.advance.zone}` : '暂无'}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

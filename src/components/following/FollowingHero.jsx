import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import styles from '../../pages/following/FollowingPage.module.css'

export default function FollowingHero({
  overview,
  favorites,
  favoriteLimits,
  seasonId,
  locale = 'zh-CN',
  withSeason,
  onManage,
  primaryLabel = '主关注队伍'
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
        <h1>{uiText("我的关注", locale)}</h1>
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
            <span className={styles.primaryBadge}>{primaryLabel}</span>
            <Link className={styles.darkLink} to={teamPath}>{uiText("查看队伍资料 →", locale)}</Link>
          </>
        ) : (
          <div className={styles.heroEmptyCopy}>
            <strong>{uiText("尚未设置主关注队伍", locale)}</strong>
            <span>{locale === 'zh-CN' ? uiText("选择主关注队伍后，在这里查看它的赛程、赛果与晋级进度。", locale) : 'Choose a primary team to see its schedule, results and advancement progress.'}</span>
            <button type="button" onClick={onManage}>{uiText("编辑关注", locale)}</button>
          </div>
        )}
      </div>

      <div className={styles.heroMatchCard}>
        <div className={styles.heroMatchHead}>
          <div>
            <span>NEXT MATCH</span>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onManage}>{uiText("编辑关注", locale)}</button>
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
            <p>{uiText("状态：", locale)}{nextMatch.statusLabel}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} to={matchPath}>{uiText("比赛详情", locale)}</Link>
              {nextMatch.opponent ? <Link className={styles.textAction} to={opponentPath}>{uiText("查看对手 →", locale)}</Link> : null}
              <Link className={styles.textAction} to={teamPath}>{uiText("队伍资料 →", locale)}</Link>
            </div>
          </div>
        ) : (
          <div className={styles.heroNoMatch}>
            <strong>{overview?.seasonFinished ? overview.finalRankText : uiText("当前轮暂无比赛", locale)}</strong>
            <span>{overview ? uiText("下一场比赛排定后将优先显示。", locale) : uiText("关注队伍后会显示主关注队伍的下一场比赛。", locale)}</span>
          </div>
        )}

        <div className={styles.heroMetrics}>
          <div>
            <span>{uiText("关注队伍", locale)}</span>
            <strong>{favorites.favoriteTeamIds.length} / {favoriteLimits.teams}</strong>
          </div>
          <div>
            <span>{uiText("关注选手", locale)}</span>
            <strong>{favorites.favoritePlayerIds.length} / {favoriteLimits.players}</strong>
          </div>
          <div>
            <span>{uiText("最近赛果", locale)}</span>
            <strong>{overview?.latestResult ? `${overview.latestResult.score} · ${overview.latestResult.resultText || '已结束'}` : uiText("暂无", locale)}</strong>
          </div>
          <div>
            <span>{uiText("排名 / 晋级", locale)}</span>
            <strong>{overview?.advance?.played ? `${overview.advance.label} · ${overview.advance.zone}` : uiText("暂无", locale)}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

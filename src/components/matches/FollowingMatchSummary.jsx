import { Link, useLocation, useOutletContext } from 'react-router-dom'
import {
  getMatchDisplayTeams,
  getMatchStatusText,
  getMatchTimeLabel,
  safeArr
} from '../../lib/matchesSelectors.js'
import MatchHubSectionLabel from './MatchHubSectionLabel.jsx'
import styles from './MatchHub.module.css'

function EmptyFollowing({ message }) {
  const { withSeason = path => path } = useOutletContext()

  return (
    <section className={styles.section} aria-labelledby="following-title" data-testid="following-section">
      <header className={styles.sectionHead}>
        <div>
          <MatchHubSectionLabel code="B / FOLLOWING" title="我的关注" />
          <h2 id="following-title">我的关注</h2>
        </div>
      </header>

      <div className={styles.followingEmpty} data-testid="following-summary">
        <strong>主关注队伍下一场</strong>
        <p>{message}</p>
        <div className={styles.followingActions}>
          <Link to={withSeason('/following?manage=1')}>设置主关注</Link>
          <Link to={withSeason('/following')}>前往我的关注 →</Link>
        </div>
      </div>
    </section>
  )
}

export default function FollowingMatchSummary({ hub }) {
  const { favorites, withSeason = path => path } = useOutletContext()
  const location = useLocation()
  const primaryTeamId = favorites?.primaryTeamId
  const match = hub?.primaryFollowingNextMatch || null

  if (!primaryTeamId) {
    return (
      <EmptyFollowing message="设置主关注队伍后，将优先展示你的下一场比赛。" />
    )
  }

  if (!match) {
    return (
      <EmptyFollowing message="主关注队伍暂无下一场未开始比赛。" />
    )
  }

  const teams = getMatchDisplayTeams(match)
  const favoriteTeamTotal = safeArr(favorites?.favoriteTeamIds).length
  const otherFavoriteTeams = Math.max(favoriteTeamTotal - 1, 0)
  const primaryMatchInRound = safeArr(hub?.currentRoundMatches)
    .some(row => row?.match_id === match.match_id)
  const otherRoundMatches = Math.max((hub?.followingRoundMatchCount || 0) - (primaryMatchInRound ? 1 : 0), 0)

  return (
    <section className={styles.section} aria-labelledby="following-title" data-testid="following-section">
      <header className={styles.sectionHead}>
        <div>
          <MatchHubSectionLabel code="B / FOLLOWING" title="我的关注" />
          <h2 id="following-title">我的关注</h2>
        </div>
      </header>

      <div className={styles.followingCard} data-testid="following-summary">
        <div className={styles.followingMain}>
          <span className={styles.followingLabel}>主关注队伍下一场</span>
          <h3 className={styles.followingMatchTitle}>
            {teams.teamA.short} vs {teams.teamB.short}
          </h3>
          <p className={styles.followingMeta}>
            {getMatchTimeLabel(match)} · {match.format || 'TBD'}
          </p>
          <span className={styles.followingStatus}>{getMatchStatusText(match)}</span>
        </div>
        <div className={styles.followingSide}>
          <p>另外关注 {otherFavoriteTeams} 支队伍</p>
          <p>本轮还有 {otherRoundMatches} 场相关比赛</p>
          <div className={styles.followingActions}>
            <Link
              to={withSeason(`/matches/${match.match_id}`)}
              state={{ returnTo: `${location.pathname}${location.search || ''}` }}
            >
              比赛详情
            </Link>
            <Link to={withSeason('/following')}>前往我的关注 →</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

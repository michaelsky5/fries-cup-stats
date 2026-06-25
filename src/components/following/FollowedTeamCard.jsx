import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import styles from '../../pages/following/FollowingPage.module.css'

export default function FollowedTeamCard({ overview, seasonId, withSeason }) {
  if (!overview) return null

  const teamPath = withSeason(`/teams/${encodeURIComponent(overview.teamRouteId || overview.teamId)}`)
  const matchText = overview.nextMatch
    ? `${overview.nextMatch.compactTime} · ${overview.nextMatch.opponent?.short || 'TBD'}`
    : '暂无'
  const resultText = overview.latestResult
    ? `${overview.latestResult.score} · ${overview.latestResult.resultText || '已结束'}`
    : '暂无'
  const advanceText = overview.advance?.played
    ? `${overview.advance.label} · ${overview.advance.zone}`
    : '暂无'

  return (
    <article className={styles.teamCard}>
      <Link className={styles.teamCardMain} to={teamPath}>
        <div className={styles.teamCardTop}>
          <TeamLogo
            className={styles.teamLogo}
            team={overview.team}
            seasonId={seasonId}
            teamShortName={overview.shortName}
            teamName={overview.fullName}
          />
          <div>
            <strong>{overview.shortName}</strong>
            <span>{overview.fullName}</span>
          </div>
        </div>

        <dl className={styles.cardFacts}>
          <div>
            <dt>下一场</dt>
            <dd>{matchText}</dd>
          </div>
          <div>
            <dt>最近赛果</dt>
            <dd>{resultText}</dd>
          </div>
          <div>
            <dt>排名 / 晋级</dt>
            <dd>{advanceText}</dd>
          </div>
        </dl>
      </Link>

      <div className={styles.cardActions}>
        <Link to={teamPath}>队伍资料 →</Link>
        <Link to={withSeason('/matches?view=list&tab=following')}>相关比赛 →</Link>
      </div>
    </article>
  )
}

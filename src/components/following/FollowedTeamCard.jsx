import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import styles from '../../pages/following/FollowingPage.module.css'

export default function FollowedTeamCard({ overview, seasonId, withSeason }) {
  const uiLocale = useUiLocale()
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
            <dt>{uiText("下一场", uiLocale)}</dt>
            <dd>{matchText}</dd>
          </div>
          <div>
            <dt>{uiText("最近赛果", uiLocale)}</dt>
            <dd>{resultText}</dd>
          </div>
          <div>
            <dt>{uiText("排名 / 晋级", uiLocale)}</dt>
            <dd>{advanceText}</dd>
          </div>
        </dl>
      </Link>

      <div className={styles.cardActions}>
        <Link to={teamPath}>{uiText("队伍资料 →", uiLocale)}</Link>
        <Link to={withSeason('/matches?view=list&tab=following')}>{uiText("相关比赛 →", uiLocale)}</Link>
      </div>
    </article>
  )
}

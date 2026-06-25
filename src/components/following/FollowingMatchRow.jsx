import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import styles from '../../pages/following/FollowingPage.module.css'

function TeamSide({ team, seasonId, align = 'left' }) {
  const shortName = team?.short || 'TBD'
  const fullName = team?.full && team.full !== shortName ? team.full : ''

  return (
    <span className={styles.matchTeam} data-align={align}>
      {align === 'right' ? <TeamLogo className={styles.matchLogo} team={team} seasonId={seasonId} /> : null}
      <span className={styles.matchTeamText}>
        <strong title={team?.full || shortName}>{shortName}</strong>
        {fullName ? <small title={fullName}>{fullName}</small> : null}
      </span>
      {align === 'left' ? <TeamLogo className={styles.matchLogo} team={team} seasonId={seasonId} /> : null}
    </span>
  )
}

export default function FollowingMatchRow({ match, seasonId, withSeason }) {
  const matchPath = match?.matchId
    ? withSeason(`/matches/${encodeURIComponent(match.matchId)}`)
    : withSeason('/matches')

  return (
    <Link
      className={styles.matchRow}
      data-primary={match?.isPrimaryMatch ? 'true' : 'false'}
      to={matchPath}
      aria-label={`查看 ${match?.teamA?.short || 'TBD'} 对 ${match?.teamB?.short || 'TBD'} 比赛详情`}
    >
      <span className={styles.matchIndex}>
        <b>{match?.displayIndex || '--'}</b>
        {match?.isPrimaryMatch ? <em>主关注</em> : null}
      </span>
      <div className={styles.matchDuel}>
        <TeamSide team={match?.teamA} seasonId={seasonId} align="left" />
        <span className={styles.vs}>VS</span>
        <TeamSide team={match?.teamB} seasonId={seasonId} align="right" />
      </div>
      <span className={styles.matchMeta}>
        <span className={styles.matchFormat}>{match?.format || 'FT2'}</span>
        <span className={styles.matchStatus}>{match?.statusLabel || '未开始'}</span>
      </span>
      <span className={styles.rowLink} aria-hidden="true">→</span>
    </Link>
  )
}

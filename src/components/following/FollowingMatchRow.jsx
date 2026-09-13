import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
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
  const uiLocale = useUiLocale()
  const matchPath = match?.matchId
    ? withSeason(`/matches/${encodeURIComponent(match.matchId)}`)
    : withSeason('/matches')

  return (
    <Link
      className={styles.matchRow}
      data-primary={match?.isPrimaryMatch ? 'true' : 'false'}
      to={matchPath}
      aria-label={uiText("查看 {0} 对 {1} 比赛详情", uiLocale, [match?.teamA?.short || 'TBD', match?.teamB?.short || 'TBD'])}
    >
      <span className={styles.matchIndex}>
        <b>{match?.displayIndex || '--'}</b>
        {match?.isPrimaryMatch ? <em>{uiText("主关注", uiLocale)}</em> : null}
      </span>
      <div className={styles.matchDuel}>
        <TeamSide team={match?.teamA} seasonId={seasonId} align="left" />
        <span className={styles.vs}>VS</span>
        <TeamSide team={match?.teamB} seasonId={seasonId} align="right" />
      </div>
      <span className={styles.matchMeta}>
        <span className={styles.matchFormat}>{match?.format || 'FT2'}</span>
        <span className={styles.matchStatus}>{match?.statusLabel || uiText("未开始", uiLocale)}</span>
      </span>
      <span className={styles.rowLink} aria-hidden="true">→</span>
    </Link>
  )
}

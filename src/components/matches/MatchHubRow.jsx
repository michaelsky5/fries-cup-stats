import { Link, useLocation, useOutletContext } from 'react-router-dom'
import {
  getMatchDisplayTeams,
  getMatchScore,
  getMatchStatusText,
  getMatchTimeLabel,
  getRoundBadgeText,
  getRoundText
} from '../../lib/matchesSelectors.js'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import TeamLogo from './TeamLogo.jsx'
import styles from './MatchHub.module.css'

function handleRowKeyDown(event) {
  if (event.key !== ' ') return
  event.preventDefault()
  event.currentTarget.click()
}

function ScheduleRow({ match, to, returnTo, seasonId, teams }) {
  const label = `${teams.teamA.full} vs ${teams.teamB.full}，${match?.format || 'TBD'}，${getMatchStatusText(match)}`

  return (
    <Link
      to={to}
      state={returnTo}
      className={styles.matchRow}
      data-testid="match-hub-row"
      aria-label={label}
      title={`${teams.teamA.full} vs ${teams.teamB.full}`}
      onClick={() => saveReturnScroll(returnTo.returnTo)}
      onKeyDown={handleRowKeyDown}
    >
      <span className={styles.rowStage} title={getRoundText(match)}>{getRoundBadgeText(match)}</span>
      <span className={styles.rowDuel}>
        <span className={styles.rowTeam} title={teams.teamA.full}>
          <TeamLogo team={match?.team_a} seasonId={seasonId} className={styles.rowLogo} />
          <strong>{teams.teamA.short}</strong>
        </span>
        <b>VS</b>
        <span className={styles.rowTeam} title={teams.teamB.full}>
          <TeamLogo team={match?.team_b} seasonId={seasonId} className={styles.rowLogo} />
          <strong>{teams.teamB.short}</strong>
        </span>
      </span>
      <span className={styles.rowAux}>
        <span className={styles.rowFormat}>{match?.format || 'TBD'}</span>
        <span className={styles.rowStatus}>{getMatchStatusText(match)}</span>
        <span className={styles.rowArrow} aria-hidden="true">→</span>
      </span>
    </Link>
  )
}

function ResultRow({ match, to, returnTo, teams, seasonId }) {
  const score = getMatchScore(match)
  const matchCode = match?.match_id || match?.match_display_name || match?.raw_match_id || ''

  return (
    <Link
      to={to}
      state={returnTo}
      className={styles.resultRow}
      data-testid="match-result-row"
      aria-label={`${teams.teamA.full} ${score} ${teams.teamB.full}，${getRoundText(match)}`}
      title={`${teams.teamA.full} vs ${teams.teamB.full}`}
      onClick={() => saveReturnScroll(returnTo.returnTo)}
      onKeyDown={handleRowKeyDown}
    >
      <span className={styles.resultDuel}>
        <span className={styles.resultTeam} title={teams.teamA.full}>
          <TeamLogo team={match?.team_a} seasonId={seasonId} className={styles.rowLogo} />
          <span className={styles.resultTeamCopy}>
            <strong>{teams.teamA.short}</strong>
            <em>{teams.teamA.full}</em>
          </span>
        </span>
        <span className={styles.resultScore}>
          <b>{score}</b>
          <em>FINAL</em>
        </span>
        <span className={styles.resultTeam} title={teams.teamB.full}>
          <span className={styles.resultTeamCopy}>
            <strong>{teams.teamB.short}</strong>
            <em>{teams.teamB.full}</em>
          </span>
          <TeamLogo team={match?.team_b} seasonId={seasonId} className={styles.rowLogo} />
        </span>
      </span>
      <span className={styles.resultMeta}>
        <span className={styles.resultStage}>{getRoundText(match)}</span>
        {matchCode ? <span className={styles.resultCode}>{matchCode}</span> : null}
      </span>
      <span className={styles.rowArrow} aria-hidden="true">→</span>
    </Link>
  )
}

function UpcomingRow({ match, to, returnTo, teams, seasonId }) {
  return (
    <Link
      to={to}
      state={returnTo}
      className={`${styles.resultRow} ${styles.upcomingRow}`}
      data-testid="match-upcoming-row"
      aria-label={`${teams.teamA.full} vs ${teams.teamB.full}，${getMatchTimeLabel(match)}`}
      title={`${teams.teamA.full} vs ${teams.teamB.full}`}
      onClick={() => saveReturnScroll(returnTo.returnTo)}
      onKeyDown={handleRowKeyDown}
    >
      <span className={styles.resultDuel}>
        <span className={styles.resultTeam} title={teams.teamA.full}>
          <TeamLogo team={match?.team_a} seasonId={seasonId} className={styles.rowLogo} />
          <span className={styles.resultTeamCopy}>
            <strong>{teams.teamA.short}</strong>
            <em>{teams.teamA.full}</em>
          </span>
        </span>
        <span className={styles.upcomingVersus}>
          <b>VS</b>
          <em>{match?.format || 'TBD'} · {getMatchStatusText(match)}</em>
        </span>
        <span className={styles.resultTeam} title={teams.teamB.full}>
          <span className={styles.resultTeamCopy}>
            <strong>{teams.teamB.short}</strong>
            <em>{teams.teamB.full}</em>
          </span>
          <TeamLogo team={match?.team_b} seasonId={seasonId} className={styles.rowLogo} />
        </span>
      </span>
      <span className={`${styles.resultMeta} ${styles.upcomingMeta}`}>
        <span className={styles.resultStage}>{getRoundText(match)}</span>
        <time>{getMatchTimeLabel(match)}</time>
      </span>
      <span className={styles.rowArrow} aria-hidden="true">→</span>
    </Link>
  )
}

export default function MatchHubRow({ match, variant = 'schedule' }) {
  const { withSeason = path => path, seasonId } = useOutletContext()
  const location = useLocation()
  const teams = getMatchDisplayTeams(match)
  const to = withSeason(`/matches/${match?.match_id}`)
  const returnTo = getReturnState(location)

  if (variant === 'result') {
    return <ResultRow match={match} to={to} returnTo={returnTo} teams={teams} seasonId={seasonId} />
  }

  if (variant === 'upcoming') {
    return <UpcomingRow match={match} to={to} returnTo={returnTo} teams={teams} seasonId={seasonId} />
  }

  return <ScheduleRow match={match} to={to} returnTo={returnTo} seasonId={seasonId} teams={teams} />
}

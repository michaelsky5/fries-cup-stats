import { Link, useLocation, useOutletContext } from 'react-router-dom'
import {
  getMatchDisplayTeams,
  getMatchScore,
  getMatchStatusText,
  getRoundText
} from '../../lib/matchesSelectors.js'
import TeamLogo from './TeamLogo.jsx'
import styles from './MatchHub.module.css'

function handleRowKeyDown(event) {
  if (event.key !== ' ') return
  event.preventDefault()
  event.currentTarget.click()
}

function getRoundBadge(match) {
  const stage = String(match?.stage || '').trim().toUpperCase()
  const round = String(match?.round || '').trim().toUpperCase()
  const roundNumber = round.match(/\d+/)?.[0]
  const stageLabel = stage || 'MATCH'

  if (roundNumber) return `${stageLabel}-ROUND${roundNumber}`
  return round ? `${stageLabel}-${round}` : stageLabel
}

function ScheduleRow({ match, to, returnTo, seasonId, teams }) {
  const label = `${teams.teamA.full} vs ${teams.teamB.full}，${match?.format || 'TBD'}，${getMatchStatusText(match)}`

  return (
    <Link
      to={to}
      state={{ returnTo }}
      className={styles.matchRow}
      data-testid="match-hub-row"
      aria-label={label}
      title={`${teams.teamA.full} vs ${teams.teamB.full}`}
      onKeyDown={handleRowKeyDown}
    >
      <span className={styles.rowStage}>{getRoundBadge(match)}</span>
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

function ResultRow({ match, to, returnTo, teams }) {
  const score = getMatchScore(match)

  return (
    <Link
      to={to}
      state={{ returnTo }}
      className={styles.resultRow}
      data-testid="match-result-row"
      aria-label={`${teams.teamA.full} ${score} ${teams.teamB.full}，${getRoundText(match)}`}
      title={`${teams.teamA.full} vs ${teams.teamB.full}`}
      onKeyDown={handleRowKeyDown}
    >
      <span className={styles.resultDuel}>
        <strong>{teams.teamA.short}</strong>
        <b>{score}</b>
        <strong>{teams.teamB.short}</strong>
      </span>
      <span className={styles.resultStage}>{getRoundText(match)}</span>
      <span className={styles.rowArrow} aria-hidden="true">→</span>
    </Link>
  )
}

export default function MatchHubRow({ match, variant = 'schedule' }) {
  const { withSeason = path => path, seasonId } = useOutletContext()
  const location = useLocation()
  const teams = getMatchDisplayTeams(match)
  const to = withSeason(`/matches/${match?.match_id}`)
  const returnTo = `${location.pathname}${location.search || ''}`

  if (variant === 'result') {
    return <ResultRow match={match} to={to} returnTo={returnTo} teams={teams} />
  }

  return <ScheduleRow match={match} to={to} returnTo={returnTo} seasonId={seasonId} teams={teams} />
}

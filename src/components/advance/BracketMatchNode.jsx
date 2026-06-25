import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import { getMatchStatusLabelKey } from '../../lib/advanceSelectors.js'
import styles from '../../pages/advance/AdvancePage.module.css'

function teamRouteId(team) {
  return team?.team_id || team?.id || team?.short || team?.team_short_name || ''
}

function TeamLine({ team, score, winnerId, seasonId, t, withSeason, isFavorite, isPrimary }) {
  const isWinner = winnerId && [team?.id, team?.team_id].filter(Boolean).includes(winnerId)
  const label = team?.short || team?.team_short_name || team?.name || team?.team_name || t('advance.common.tbd', 'TBD')
  const routeId = teamRouteId(team)
  const inner = (
    <>
      <TeamLogo team={team} seasonId={seasonId} className={styles.bracketLogo} />
      <span>
        <strong>{label}</strong>
        {isPrimary ? <em>PRIMARY</em> : isFavorite ? <em>FOLLOWING</em> : null}
      </span>
      <b>{score === null || score === undefined ? t('advance.common.noScore', '—') : score}</b>
    </>
  )

  if (!routeId || team?.isTbd) {
    return <div className={`${styles.bracketTeam} ${isWinner ? styles.bracketWinner : ''}`}>{inner}</div>
  }

  return (
    <Link to={withSeason(`/teams/${routeId}`)} className={`${styles.bracketTeam} ${isWinner ? styles.bracketWinner : ''}`}>
      {inner}
    </Link>
  )
}

export default function BracketMatchNode({
  match,
  seasonId,
  t,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  const matchHref = match.matchId ? withSeason(`/matches/${match.matchId}`) : ''
  const statusLabel = t(getMatchStatusLabelKey(match.status), match.status)
  const teamAFavorite = isFavoriteTeam?.(match.teamA)
  const teamBFavorite = isFavoriteTeam?.(match.teamB)
  const teamAPrimary = isPrimaryFavoriteTeam?.(match.teamA)
  const teamBPrimary = isPrimaryFavoriteTeam?.(match.teamB)

  return (
    <article className={`${styles.bracketNode} ${styles[`bracket_${match.status}`]}`}>
      <header>
        <span>{match.round || match.stage}</span>
        <em>{statusLabel}</em>
      </header>
      <div className={styles.bracketTeams}>
        <TeamLine
          team={match.teamA}
          score={match.scoreA}
          winnerId={match.winnerId}
          seasonId={seasonId}
          t={t}
          withSeason={withSeason}
          isFavorite={teamAFavorite}
          isPrimary={teamAPrimary}
        />
        <TeamLine
          team={match.teamB}
          score={match.scoreB}
          winnerId={match.winnerId}
          seasonId={seasonId}
          t={t}
          withSeason={withSeason}
          isFavorite={teamBFavorite}
          isPrimary={teamBPrimary}
        />
      </div>
      <footer>
        <span>{match.label}</span>
        {matchHref ? <Link to={matchHref}>{t('advance.common.details', '详情')}</Link> : null}
      </footer>
      {match.hasConnection ? <i aria-hidden="true" className={styles.bracketConnector} /> : null}
    </article>
  )
}

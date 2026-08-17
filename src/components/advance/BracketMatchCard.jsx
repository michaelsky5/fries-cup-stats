import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import styles from '../../pages/advance/AdvancePage.module.css'

function teamRouteId(team) {
  return team?.team_id || team?.id || team?.team_short_name || team?.short || ''
}

function sameTeam(left, right) {
  const leftKeys = [left?.team_id, left?.id].filter(Boolean)
  const rightKeys = [right?.team_id, right?.id].filter(Boolean)
  return leftKeys.some(value => rightKeys.includes(value))
}

function BracketTeamSlot({
  slot,
  winner,
  seasonId,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  const team = slot.team
  const routeId = teamRouteId(team)
  const isWinner = sameTeam(team, winner)
  const isPrimary = isPrimaryFavoriteTeam?.(team)
  const isFavorite = isFavoriteTeam?.(team)
  const className = [
    styles.playoffTeamSlot,
    isWinner ? styles.playoffTeamWinner : '',
    slot.crossover ? styles.playoffCrossedSlot : ''
  ].filter(Boolean).join(' ')
  const content = (
    <>
      <span className={styles.playoffSlotSource}>{slot.source}</span>
      {team && !team.isTbd ? (
        <TeamLogo team={team} seasonId={seasonId} className={styles.playoffTeamLogo} />
      ) : (
        <span className={styles.playoffTeamPlaceholder} aria-hidden="true" />
      )}
      <span className={styles.playoffTeamIdentity}>
        <strong>{slot.name}</strong>
        {slot.detail ? <em>{slot.detail}</em> : null}
      </span>
      {isPrimary ? <i>PRIMARY</i> : isFavorite ? <i>FOLLOWING</i> : null}
      <b>{slot.score === '' || slot.score === null || slot.score === undefined ? '—' : slot.score}</b>
    </>
  )

  if (!routeId || team?.isTbd) return <div className={className}>{content}</div>
  return <Link className={className} to={withSeason(`/teams/${routeId}`)}>{content}</Link>
}

export default function BracketMatchCard({
  label,
  formatLabel,
  status,
  statusText,
  href,
  slots,
  winner,
  accent,
  seasonId,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam,
  t
}) {
  return (
    <article className={[
      styles.playoffMatchCard,
      styles[`playoffMatch_${status}`],
      accent === 'grandFinal' ? styles.playoffGrandFinalCard : '',
      accent === 'lowerFinal' ? styles.playoffLowerFinalCard : '',
      accent === 'qualification' ? styles.playoffQualificationCard : ''
    ].filter(Boolean).join(' ')}>
      <header>
        <strong>{label}</strong>
        <span>{formatLabel}</span>
        <time>{statusText}</time>
        {href ? (
          <Link
            className={styles.bracketMatchDetails}
            to={href}
            aria-label={t('advance.common.details', '详情')}
          >
            {t('advance.common.details', '详情')}<i aria-hidden="true">→</i>
          </Link>
        ) : null}
      </header>
      <div className={styles.playoffMatchTeams}>
        {slots.map((slot, index) => (
          <BracketTeamSlot
            key={`${label}-${index}`}
            slot={slot}
            winner={winner}
            seasonId={seasonId}
            withSeason={withSeason}
            isFavoriteTeam={isFavoriteTeam}
            isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
          />
        ))}
      </div>
    </article>
  )
}

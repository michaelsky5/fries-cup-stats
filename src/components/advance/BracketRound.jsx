import BracketMatchNode from './BracketMatchNode.jsx'
import styles from '../../pages/advance/AdvancePage.module.css'

export default function BracketRound({
  round,
  seasonId,
  t,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  return (
    <section className={styles.bracketRound}>
      <header className={styles.bracketRoundHeader}>
        <span>{round.id}</span>
        <strong>{round.label}</strong>
      </header>
      <div className={styles.bracketRoundMatches}>
        {round.matches.map(match => (
          <BracketMatchNode
            key={match.matchId || match.label}
            match={match}
            seasonId={seasonId}
            t={t}
            withSeason={withSeason}
            isFavoriteTeam={isFavoriteTeam}
            isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
          />
        ))}
      </div>
    </section>
  )
}

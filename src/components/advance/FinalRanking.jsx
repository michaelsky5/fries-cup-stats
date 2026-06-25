import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import { teamFull, teamShort } from '../../lib/advanceSelectors.js'
import styles from '../../pages/advance/AdvancePage.module.css'

function routeId(team) {
  return team?.team_id || team?.id || teamShort(team)
}

export default function FinalRanking({ rows, seasonId, t, withSeason, isFavoriteTeam, isPrimaryFavoriteTeam }) {
  if (!rows.length) return null

  return (
    <section className={styles.finalRanking}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionLabel}>FINAL RANKING</span>
          <h2>{t('advance.final.rankingTitle', '最终排名')}</h2>
        </div>
      </header>
      <div className={styles.finalRankingList}>
        {rows.map(team => {
          const favorite = isFavoriteTeam?.(team)
          const primary = isPrimaryFavoriteTeam?.(team)
          return (
            <Link
              key={routeId(team)}
              to={withSeason(`/teams/${routeId(team)}`)}
              className={[
                styles.finalRankingRow,
                Number(team.final_rank) <= 3 ? styles.finalTopRow : '',
                favorite ? styles.finalFollowingRow : ''
              ].filter(Boolean).join(' ')}
            >
              <span>{String(team.final_rank).padStart(2, '0')}</span>
              <TeamLogo team={team} seasonId={seasonId} className={styles.finalLogo} />
              <strong>{teamShort(team)}</strong>
              <em>{teamFull(team)}</em>
              {primary ? <b>PRIMARY</b> : favorite ? <b>FOLLOWING</b> : null}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

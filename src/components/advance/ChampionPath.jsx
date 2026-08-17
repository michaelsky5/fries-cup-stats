import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import { teamFull, teamShort } from '../../lib/advanceSelectors.js'
import styles from '../../pages/advance/AdvancePage.module.css'

export default function ChampionPath({ champion, path, seasonId, t, withSeason }) {
  if (!champion || !path.length) return null

  return (
    <section className={styles.championPath}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionLabel}>CHAMPION PATH</span>
          <h2>{t('advance.final.championPath', '冠军路径')}</h2>
        </div>
      </header>
      <div className={styles.championPathLead}>
        <TeamLogo team={champion} seasonId={seasonId} className={styles.championLogo} />
        <div>
          <strong>{teamShort(champion)}</strong>
          <span>{teamFull(champion)}</span>
        </div>
      </div>
      <div className={styles.championPathList}>
        {path.map(item => (
          <Link key={item.matchId} to={withSeason(`/matches/${item.matchId}`)}>
            <span className={styles.championPathStage}>
              <i className={item.won ? styles.championPathWin : styles.championPathLoss}>{item.won ? 'W' : 'L'}</i>
              {item.stage}
            </span>
            <strong>{teamShort(champion)} {item.scoreLabel} {teamShort(item.opponent)}</strong>
            <em>{t('advance.final.opponent', '对手')} {teamFull(item.opponent)}</em>
          </Link>
        ))}
      </div>
    </section>
  )
}

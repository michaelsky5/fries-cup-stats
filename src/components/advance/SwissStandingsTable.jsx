import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import styles from '../../pages/advance/AdvancePage.module.css'

function getRouteId(team) {
  return team?.team_id || team?.id || team?.team_short_name || team?.short || ''
}

export default function SwissStandingsTable({ rows, seasonId, t, withSeason }) {
  return (
    <section className={styles.standingsSection}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionLabel}>SWISS STANDINGS</span>
          <h2>{t('advance.swiss.fullStandings', '完整瑞士轮积分榜')}</h2>
        </div>
      </header>

      <div className={styles.tableScroller}>
        <table className={styles.standingsTable}>
          <thead>
            <tr>
              <th className={styles.colRank}>{t('advance.table.rank', '排名')}</th>
              <th className={styles.colTeam}>{t('advance.table.team', '战队')}</th>
              <th>{t('advance.table.matchRecord', '胜负')}</th>
              <th>{t('advance.table.mapRecord', '地图胜负')}</th>
              <th>{t('advance.table.mapDiff', '地图净胜')}</th>
              <th>Buchholz</th>
              <th>{t('advance.table.omw', '对手胜率')}</th>
              <th className={styles.colStatus}>{t('advance.table.status', '当前状态')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.team_id} className={row.isFavorite ? styles.followingRow : ''}>
                <td className={styles.colRank}>
                  <span className={styles.rankPill}>{String(row.rank).padStart(2, '0')}</span>
                </td>
                <td className={styles.colTeam}>
                  <Link to={withSeason(`/teams/${getRouteId(row)}`)} className={styles.tableTeam}>
                    <TeamLogo team={row} seasonId={seasonId} className={styles.tableTeamLogo} />
                    <span>
                      <strong>{row.team_short_name || row.team_name}</strong>
                      <em>{row.team_name || row.team_short_name}</em>
                    </span>
                    {row.isPrimaryFavorite ? <b>PRIMARY</b> : row.isFavorite ? <b>FOLLOWING</b> : null}
                  </Link>
                </td>
                <td className={styles.numeric}>{row.recordLabel}</td>
                <td className={styles.numeric}>{row.mapRecordLabel}</td>
                <td className={styles.numeric}>{row.mapDiffLabel}</td>
                <td className={styles.numeric}>{row.buchholz}</td>
                <td className={styles.numeric}>{row.opponentWinRateLabel}</td>
                <td className={styles.colStatus}>
                  <span className={`${styles.statusBadge} ${styles[`status_${row.status}`]}`}>
                    {t(`advance.zone.${row.status}`, row.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

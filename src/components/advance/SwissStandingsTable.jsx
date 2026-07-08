import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import styles from '../../pages/advance/AdvancePage.module.css'

function getRouteId(team) {
  return team?.team_id || team?.id || team?.team_short_name || team?.short || ''
}

function getStatusCounts(rows = []) {
  return rows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1
    return counts
  }, {})
}

function TiebreakerStrip({ rules, t }) {
  if (!rules?.length) return null

  return (
    <aside className={styles.tiebreakerStrip} aria-label={t('advance.tiebreakers.title', '同分规则')}>
      <span>{t('advance.tiebreakers.title', '同分规则')}</span>
      <ol>
        {rules.map(rule => (
          <li key={`${rule.index}-${rule.key}`}>
            <strong>{String(rule.index).padStart(2, '0')}</strong>
            <em>{t(`advance.tiebreaker.${rule.key}`, rule.key)}</em>
          </li>
        ))}
      </ol>
    </aside>
  )
}

function ZoneDivider({ status, count, t }) {
  return (
    <tr className={[styles.zoneDividerRow, styles[`zoneDivider_${status}`]].filter(Boolean).join(' ')}>
      <td colSpan={8}>
        <span>{t(`advance.zone.${status}`, status)}</span>
        <strong>{count} {t('advance.unit.teams', '支队伍')}</strong>
      </td>
    </tr>
  )
}

function TeamRow({ row, seasonId, t, withSeason }) {
  return (
    <tr
      key={row.team_id}
      className={[
        row.isFavorite ? styles.followingRow : '',
        styles[`tableZone_${row.status}`]
      ].filter(Boolean).join(' ')}
    >
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
      <td className={`${styles.numeric} ${styles.primaryMetric}`}>{row.recordLabel}</td>
      <td className={`${styles.numeric} ${styles.primaryMetric}`}>{row.buchholz}</td>
      <td className={`${styles.numeric} ${styles.primaryMetric}`}>{row.opponentWinRateLabel}</td>
      <td className={`${styles.numeric} ${styles.secondaryMetric}`}>{row.mapRecordLabel}</td>
      <td className={`${styles.numeric} ${styles.secondaryMetric}`}>{row.mapDiffLabel}</td>
      <td className={styles.colStatus}>
        <span className={`${styles.statusBadge} ${styles[`status_${row.status}`]}`}>
          {t(`advance.zone.${row.status}`, row.status)}
        </span>
      </td>
    </tr>
  )
}

export default function SwissStandingsTable({
  rows,
  allRows = rows,
  activeZone = 'all',
  seasonId,
  t,
  withSeason,
  tiebreakers = []
}) {
  const statusCounts = getStatusCounts(allRows)
  const activeLabel = activeZone === 'all'
    ? t('advance.common.all', '全部')
    : t(`advance.zone.${activeZone}`, activeZone)
  const tableItems = rows.flatMap((row, index) => {
    const previous = rows[index - 1]
    const needsDivider = !previous || previous.status !== row.status

    return [
      ...(needsDivider ? [{ type: 'divider', status: row.status, key: `${row.status}-divider` }] : []),
      { type: 'team', row, key: row.team_id }
    ]
  })

  return (
    <section className={styles.standingsSection}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionLabel}>SWISS STANDINGS</span>
          <h2>{t('advance.swiss.fullStandings', '完整瑞士轮积分榜')}</h2>
        </div>
        <div className={styles.standingsTools}>
          <span className={styles.standingsFilterTag}>{activeLabel}</span>
          <TiebreakerStrip rules={tiebreakers} t={t} />
        </div>
      </header>

      <div className={styles.tableScroller}>
        <table className={styles.standingsTable}>
          <thead>
            <tr>
              <th className={styles.colRank}>{t('advance.table.rank', '排名')}</th>
              <th className={styles.colTeam}>{t('advance.table.team', '战队')}</th>
              <th>{t('advance.table.matchRecord', '胜负')}</th>
              <th>{t('advance.table.buchholz', '对手分')}</th>
              <th>{t('advance.table.omw', '对手胜率')}</th>
              <th>{t('advance.table.mapRecord', '地图胜负')}</th>
              <th>{t('advance.table.mapDiff', '地图净胜')}</th>
              <th className={styles.colStatus}>{t('advance.table.status', '当前状态')}</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.map(item => item.type === 'divider' ? (
              <ZoneDivider key={item.key} status={item.status} count={statusCounts[item.status] || 0} t={t} />
            ) : (
              <TeamRow key={item.key} row={item.row} seasonId={seasonId} t={t} withSeason={withSeason} />
            ))}
            {!rows.length ? (
              <tr className={styles.emptyStandingsRow}>
                <td colSpan={8}>{t('advance.common.none', '暂无')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

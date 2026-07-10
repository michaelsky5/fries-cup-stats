import { formatInt } from '../../../lib/format.js'
import { getRoleEnLabel, getRoleLabel } from '../../../lib/leaderboardSelectors.js'
import styles from './MatchDetail.module.css'

function formatRating(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(1) : '-'
}

function formatTenPointRating(value) {
  const num = Number(value)
  return Number.isFinite(num) ? (num / 10).toFixed(1) : '-'
}

function getName(entry) {
  return entry?.display_name || entry?.nickname || entry?.player_name || entry?.player_id || '-'
}

export default function RoleLeaderRow({ role, entry, locale = 'zh-CN' }) {
  if (!entry) return null

  const coreStats = (entry.coreStats || []).filter(stat => Number(stat.value) > 0).slice(0, 2)
  const roleLabel = locale === 'en-US' ? getRoleEnLabel(role) : getRoleLabel(role)

  return (
    <div className={styles.roleLeaderLine} data-role={role}>
      <span className={styles.roleLeaderIdentity}>
        <span className={styles.roleLabel}>
          {roleLabel}
        </span>
        <span className={styles.roleLeaderPlayer}>
          <strong>{getName(entry)}</strong>
          <em>{entry.team_short_name || entry.team_name}</em>
        </span>
      </span>
      <span className={styles.roleLeaderScore} title={`Raw rating ${formatRating(entry.roleScore)} / 100`}>
        <span className={styles.roleLeaderScoreLabel}>RATING</span>
        <b>{formatTenPointRating(entry.roleScore)}</b>
        <small>/10</small>
      </span>
      <span className={styles.roleLeaderStats}>
        {coreStats.map(stat => (
          <span key={stat.metricId}>
            <em>{stat.label}</em>
            <strong>{formatInt(stat.value, '-')}</strong>
          </span>
        ))}
      </span>
    </div>
  )
}

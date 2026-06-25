import { formatInt } from '../../../lib/format.js'
import { getRoleColor, getRoleEnLabel } from '../../../lib/leaderboardSelectors.js'
import styles from './MatchDetail.module.css'

function formatRating(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(1) : '-'
}

function getName(entry) {
  return entry?.display_name || entry?.nickname || entry?.player_name || entry?.player_id || '-'
}

export default function RoleLeaderRow({ role, entry }) {
  if (!entry) return null

  const coreStats = (entry.coreStats || []).filter(stat => Number(stat.value) > 0).slice(0, 2)

  return (
    <div className={styles.roleLeaderLine}>
      <span className={styles.roleLabel} style={{ color: getRoleColor(role) }}>
        {getRoleEnLabel(role)}
      </span>
      <strong>{getName(entry)}</strong>
      <em>{entry.team_short_name || entry.team_name}</em>
      <b>{formatRating(entry.roleScore)}</b>
      <span className={styles.roleLeaderStats}>
        {coreStats.map(stat => (
          <span key={stat.metricId}>{stat.label} {formatInt(stat.value, '-')}</span>
        ))}
      </span>
    </div>
  )
}

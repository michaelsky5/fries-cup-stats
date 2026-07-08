import { Link } from 'react-router-dom'
import { formatDecimal, formatInt } from '../../lib/format.js'
import {
  formatEntrySeasonOvr,
  getEntryMetricValue,
  getRoleEnLabel,
  getRoleLabel
} from '../../lib/leaderboardSelectors.js'
import { PUBLIC_METRICS, getRoleCoreMetricIds } from '../../lib/leaderboardScoring.js'
import { HeroAvatar } from './LeaderboardRow.jsx'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

const METRIC_LABELS = PUBLIC_METRICS.reduce((acc, metric) => {
  acc[metric.id] = metric.label
  return acc
}, {})

const COMPACT_METRICS = new Set(['dmg', 'heal', 'block'])

function formatRoleLeaderMetricValue(value, metricId) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '-'
  }

  if (COMPACT_METRICS.has(metricId) && Math.abs(number) >= 10000) {
    return `${formatDecimal(number / 1000, 1, '-')}K`
  }

  return formatDecimal(number, 1, '-')
}

export default function RoleLeaderCard({ role, entry, withSeason, order = 1 }) {
  const roleCode = getRoleEnLabel(role)

  if (!entry) {
    return (
      <div className={styles.roleLeaderCard}>
        <div className={styles.roleLeaderHead}>
          <span>{String(order).padStart(2, '0')} / {roleCode}</span>
          <b>{getRoleLabel(role)}</b>
        </div>
        <div className={styles.roleLeaderEmpty}>暂无合格样本</div>
      </div>
    )
  }

  const href = withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`)
  const metricIds = getRoleCoreMetricIds(role, entry.most_played_hero).slice(0, 2)
  const playerName = entry.nickname || entry.display_name || entry.player_name || entry.player_id

  return (
    <Link to={href} className={styles.roleLeaderCard} aria-label={`查看 ${playerName} 的选手详情`}>
      <div className={styles.roleLeaderHead}>
        <span>{String(order).padStart(2, '0')} / {roleCode}</span>
        <b>{getRoleLabel(role)}</b>
      </div>

      <div className={styles.roleLeaderIdentity}>
        <HeroAvatar entry={entry} />
        <div>
          <strong>{playerName}</strong>
          <span>{entry.team_short_name || entry.team_name || '-'} / {entry.battleTag || entry.player_name}</span>
        </div>
      </div>

      <div className={styles.roleLeaderStats}>
        <div className={styles.roleLeaderScore}>
          <span>OVR</span>
          <strong>{formatEntrySeasonOvr(entry)}</strong>
        </div>
        <div>
          <span>地图</span>
          <strong>{formatInt(entry.roleMapsPlayed)}</strong>
        </div>
        {metricIds.map(metricId => (
          <div key={metricId}>
            <span>{METRIC_LABELS[metricId]}</span>
            <strong>{formatRoleLeaderMetricValue(getEntryMetricValue(entry, metricId, 'per10'), metricId)}</strong>
          </div>
        ))}
      </div>
    </Link>
  )
}

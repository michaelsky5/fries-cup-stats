import { translateUiText as uiText } from '../../lib/uiText.js'
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
import HeroArtwork from '../media/HeroArtwork.jsx'
import styles from '../../features/fd-design/leaderboardStyles.js'

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

export default function RoleLeaderCard({ role, entry, withSeason, order = 1, locale = 'zh-CN', isFdDesign = false }) {
  const roleCode = locale === 'en-US' ? getRoleEnLabel(role) : uiText(getRoleLabel(role), locale)

  if (!entry) {
    return (
      <div className={styles.roleLeaderCard}>
        <div className={styles.roleLeaderHead}>
          <span>{String(order).padStart(2, '0')} / {roleCode}</span>
          <b>{uiText(getRoleLabel(role), locale)}</b>
        </div>
        <div className={styles.roleLeaderEmpty}>{uiText("暂无合格样本", locale)}</div>
      </div>
    )
  }

  const href = withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`)
  const metricIds = getRoleCoreMetricIds(role, entry.most_played_hero).slice(0, 2)
  const playerName = entry.nickname || entry.display_name || entry.player_name || entry.player_id

  return (
    <Link to={href} className={styles.roleLeaderCard} aria-label={uiText("查看 {0} 的选手详情", locale, [playerName])}>
      {isFdDesign ? <HeroArtwork hero={entry.most_played_hero} className={styles.roleHeroArt} decorative locale={locale} /> : null}
      <div className={styles.roleLeaderHead}>
        <span>{String(order).padStart(2, '0')} / {roleCode}</span>
        <b>{uiText(getRoleLabel(role), locale)}</b>
      </div>

      <div className={styles.roleLeaderIdentity}>
        {!isFdDesign ? <HeroAvatar entry={entry} /> : null}
        <div>
          <strong>{playerName}</strong>
          <span>{entry.team_short_name || entry.team_name || '-'} / {entry.battleTag || entry.player_name}</span>
        </div>
      </div>

      <div className={styles.roleLeaderStats}>
        <div className={isFdDesign ? styles.fdRoleScore : styles.roleLeaderScore}>
          <span>OVR</span>
          <strong>{formatEntrySeasonOvr(entry)}</strong>
        </div>
        <div>
          <span>{uiText("地图", locale)}</span>
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

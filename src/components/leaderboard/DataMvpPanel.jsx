import { Link } from 'react-router-dom'
import { formatDecimal, formatInt, formatPlayerTime } from '../../lib/format.js'
import {
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

function CoreMetrics({ entry }) {
  const metricIds = getRoleCoreMetricIds(entry?.role, entry?.most_played_hero).slice(0, 2)

  return (
    <div className={styles.coreMetricGrid}>
      <div>
        <span>出场地图</span>
        <strong>{formatInt(entry.roleMapsPlayed)}</strong>
      </div>
      <div>
        <span>出场时间</span>
        <strong>{formatPlayerTime({ raw_time_mins: entry.roleTimeMins, total_time_played: entry.total_time_played })}</strong>
      </div>
      {metricIds.map(metricId => (
        <div key={metricId}>
          <span>{METRIC_LABELS[metricId]}</span>
          <strong>{formatDecimal(getEntryMetricValue(entry, metricId, 'per10'), 1, '-')}</strong>
        </div>
      ))}
    </div>
  )
}

export default function DataMvpPanel({ entry, withSeason }) {
  if (!entry) {
    return (
      <section className={`${styles.mvpPanel} ${styles.emptyPanel}`}>
        <div className={styles.panelTopline}>
          <span className={styles.panelKicker}>A / DATA MVP</span>
        </div>
        <h2>暂无合格样本</h2>
        <p>正式排名门槛达成后，这里会显示综合评分最高的 player × role 条目。</p>
      </section>
    )
  }

  const href = withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`)
  const playerName = entry.nickname || entry.display_name || entry.player_name || entry.player_id

  return (
    <Link to={href} className={styles.mvpPanel} aria-label={`查看 ${playerName} 的选手详情`}>
      <div className={styles.panelTopline}>
        <span className={styles.panelKicker}>A / DATA MVP</span>
        <span className={styles.disclaimer}>统计评分不代表官方 MVP 评选</span>
      </div>

      <div className={styles.mvpBody}>
        <HeroAvatar entry={entry} className={styles.heroAvatarLarge} />
        <div className={styles.mvpIdentity}>
          <span>{getRoleEnLabel(entry.role)} / CURRENT LEADER</span>
          <h2>{playerName}</h2>
          <em>{entry.battleTag || entry.player_name || entry.player_id}</em>
          <em>{entry.team_short_name || entry.team_name || '-'} / {getRoleLabel(entry.role)}</em>
        </div>
        <div className={styles.mvpScore}>
          <span>综合评分</span>
          <strong>{formatDecimal(entry.roleScore, 1, '-')}</strong>
          <em>{getRoleEnLabel(entry.role)} SCORE</em>
        </div>
      </div>

      <CoreMetrics entry={entry} />
    </Link>
  )
}

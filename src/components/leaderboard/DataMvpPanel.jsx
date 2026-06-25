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
  acc[metric.id] = metric
  return acc
}, {})

function CoreMetrics({ entry, locale }) {
  const metricIds = getRoleCoreMetricIds(entry?.role, entry?.most_played_hero).slice(0, 2)
  const isEn = locale === 'en-US'

  return (
    <div className={styles.coreMetricGrid}>
      <div>
        <span>{isEn ? 'Maps Played' : '出场地图'}</span>
        <strong>{formatInt(entry.roleMapsPlayed)}</strong>
      </div>
      <div>
        <span>{isEn ? 'Time Played' : '出场时间'}</span>
        <strong>{formatPlayerTime({ raw_time_mins: entry.roleTimeMins, total_time_played: entry.total_time_played })}</strong>
      </div>
      {metricIds.map(metricId => (
        <div key={metricId}>
          <span>{isEn ? METRIC_LABELS[metricId]?.short : METRIC_LABELS[metricId]?.label}</span>
          <strong>{formatDecimal(getEntryMetricValue(entry, metricId, 'per10'), 1, '-')}</strong>
        </div>
      ))}
    </div>
  )
}

export default function DataMvpPanel({ entry, withSeason, locale = 'zh-CN' }) {
  const isEn = locale === 'en-US'
  const panelKicker = isEn ? 'Leaderboard Highlight' : '榜首表现'

  if (!entry) {
    return (
      <section className={`${styles.mvpPanel} ${styles.emptyPanel}`}>
        <div className={styles.panelTopline}>
          <span className={styles.panelKicker}>{panelKicker}</span>
        </div>
        <h2>{isEn ? 'No eligible sample yet' : '暂无合格样本'}</h2>
        <p>
          {isEn
            ? 'Once the ranking threshold is met, this panel will feature the top player-role entry.'
            : '正式排名门槛达成后，将显示综合评分最高的选手职责条目。'}
        </p>
      </section>
    )
  }

  const href = withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`)
  const playerName = entry.nickname || entry.display_name || entry.player_name || entry.player_id

  return (
    <Link to={href} className={styles.mvpPanel} aria-label={`查看 ${playerName} 的选手详情`}>
      <div className={styles.panelTopline}>
        <span className={styles.panelKicker}>{panelKicker}</span>
        <span className={styles.disclaimer}>
          {isEn ? 'Reference rating' : '统计评分仅供参考'}
        </span>
      </div>

      <div className={styles.mvpBody}>
        <HeroAvatar entry={entry} className={styles.heroAvatarLarge} />
        <div className={styles.mvpIdentity}>
          <span>{isEn ? `${getRoleEnLabel(entry.role)} / Current Leader` : `${getRoleLabel(entry.role)} / 当前领跑`}</span>
          <h2>{playerName}</h2>
          <em>{entry.battleTag || entry.player_name || entry.player_id}</em>
          <em>{entry.team_short_name || entry.team_name || '-'} / {getRoleLabel(entry.role)}</em>
        </div>
        <div className={styles.mvpScore}>
          <span>{isEn ? 'Rating' : '综合评分'}</span>
          <strong>{formatDecimal(entry.roleScore, 1, '-')}</strong>
          <em>{isEn ? `${getRoleEnLabel(entry.role)} score` : `${getRoleLabel(entry.role)}评分`}</em>
        </div>
      </div>

      <CoreMetrics entry={entry} locale={locale} />
    </Link>
  )
}

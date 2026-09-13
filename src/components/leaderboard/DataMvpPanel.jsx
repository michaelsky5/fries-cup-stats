import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import { formatDecimal, formatInt, formatPlayerTime } from '../../lib/format.js'
import {
  formatEntrySeasonOvr,
  getEntrySeasonScoreMeta,
  getEntryMetricValue,
  getRoleEnLabel,
  getRoleLabel
} from '../../lib/leaderboardSelectors.js'
import { PUBLIC_METRICS, getRoleCoreMetricIds } from '../../lib/leaderboardScoring.js'
import { HeroAvatar } from './LeaderboardRow.jsx'
import styles from '../../features/fd-design/leaderboardStyles.js'

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
        <span>{isEn ? 'Maps Played' : uiText("出场地图", locale)}</span>
        <strong>{formatInt(entry.roleMapsPlayed)}</strong>
      </div>
      <div>
        <span>{isEn ? 'Time Played' : uiText("出场时间", locale)}</span>
        <strong>{formatPlayerTime({ raw_time_mins: entry.roleTimeMins, total_time_played: entry.total_time_played })}</strong>
      </div>
      {metricIds.map(metricId => (
        <div key={metricId}>
          <span>{isEn ? METRIC_LABELS[metricId]?.short : uiText(METRIC_LABELS[metricId]?.label, locale)}</span>
          <strong>{formatDecimal(getEntryMetricValue(entry, metricId, 'per10'), 1, '-')}</strong>
        </div>
      ))}
    </div>
  )
}

export default function DataMvpPanel({ entry, withSeason, locale = 'zh-CN' }) {
  const isEn = locale === 'en-US'
  const panelKicker = isEn ? 'Leaderboard Highlight' : uiText("榜首表现", locale)

  if (!entry) {
    return (
      <section className={`${styles.mvpPanel} ${styles.emptyPanel}`}>
        <div className={styles.panelTopline}>
          <span className={styles.panelKicker}>{panelKicker}</span>
        </div>
        <h2>{isEn ? 'No eligible sample yet' : uiText("暂无合格样本", locale)}</h2>
        <p>
          {isEn
            ? 'Once the ranking threshold is met, this panel will feature the top player-role entry.'
            : uiText("正式排名门槛达成后，将显示赛季 OVR 领跑的选手职责条目。", locale)}
        </p>
      </section>
    )
  }

  const href = withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`)
  const playerName = entry.nickname || entry.display_name || entry.player_name || entry.player_id

  return (
    <Link to={href} className={styles.mvpPanel} aria-label={uiText("查看 {0} 的选手详情", locale, [playerName])}>
      <div className={styles.panelTopline}>
        <span className={styles.panelKicker}>{panelKicker}</span>
        <span className={styles.disclaimer}>
          {isEn ? 'Reference OVR' : uiText("赛季 OVR 仅供参考", locale)}
        </span>
      </div>

      <div className={styles.mvpBody}>
        <HeroAvatar entry={entry} className={styles.heroAvatarLarge} />
        <div className={styles.mvpIdentity}>
          <span>{isEn ? `${getRoleEnLabel(entry.role)} / Current Leader` : uiText("{0} / 当前领跑", locale, [uiText(getRoleLabel(entry.role), locale)])}</span>
          <h2>{playerName}</h2>
          <em>{entry.battleTag || entry.player_name || entry.player_id}</em>
          <em>{entry.team_short_name || entry.team_name || '-'} / {uiText(getRoleLabel(entry.role), locale)}</em>
        </div>
        <div className={styles.mvpScore}>
          <span>{isEn ? 'Season OVR' : uiText("赛季 OVR", locale)}</span>
          <strong>{formatEntrySeasonOvr(entry)}</strong>
          <em>{getEntrySeasonScoreMeta(entry, locale) || (isEn ? `${getRoleEnLabel(entry.role)} OVR` : `${uiText(getRoleLabel(entry.role), locale)} OVR`)}</em>
        </div>
      </div>

      <CoreMetrics entry={entry} locale={locale} />
    </Link>
  )
}

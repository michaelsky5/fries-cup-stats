import { formatDecimal, formatInt } from '../../lib/format.js'
import {
  formatEntrySeasonOvr,
  getEntryMetricValue,
  getRoleEnLabel,
  getRoleLabel
} from '../../lib/leaderboardSelectors.js'
import { PUBLIC_METRICS, getRoleCoreMetricIds } from '../../lib/leaderboardScoring.js'
import { PlayerIdentity } from './LeaderboardRow.jsx'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

function formatValue(value, mode, metricId) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  if (mode === 'total') return formatInt(num)
  if (metricId === 'dmg' || metricId === 'heal' || metricId === 'block') {
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  }
  return formatDecimal(num, 1, '-')
}

function getBarWidth(entry, metric, entries, mode) {
  const values = entries.map(item => getEntryMetricValue(item, metric.id, mode))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const value = getEntryMetricValue(entry, metric.id, mode)

  if (!Number.isFinite(value) || max === min) return 50

  const ratio = metric.direction === 'negative'
    ? (max - value) / (max - min)
    : (value - min) / (max - min)

  return Math.max(6, Math.min(100, ratio * 100))
}

export default function PlayerComparePanel({ entries, mode, modeLabel, onClose, locale = 'zh-CN' }) {
  if (!entries.length) return null

  const role = entries[0].role
  const priorityMetrics = new Set(getRoleCoreMetricIds(role).slice(0, 2))

  return (
    <div className={styles.compareOverlay} role="dialog" aria-modal="true" aria-label="选手比较面板">
      <section className={styles.comparePanel} style={{ '--compare-count': entries.length }}>
        <header className={styles.comparePanelHeader}>
          <div>
            <span>PLAYER COMPARE</span>
            <h2>{getRoleLabel(role)} 同职责比较</h2>
            <p>{locale === 'en-US' ? getRoleEnLabel(role) : getRoleLabel(role)} / {modeLabel}</p>
          </div>
          <button type="button" onClick={onClose}>关闭</button>
        </header>

        <div className={styles.comparePlayerGrid}>
          {entries.map(entry => (
            <div key={entry.entryKey} className={styles.comparePlayerCard}>
              <PlayerIdentity entry={entry} locale={locale} />
              <div className={styles.compareScore}>
                <span>赛季 OVR</span>
                <strong>{formatEntrySeasonOvr(entry)}</strong>
              </div>
              {!entry.eligible ? <em>样本不足，比较结果仅作参考</em> : null}
            </div>
          ))}
        </div>

        <div className={styles.compareMatrix}>
          {PUBLIC_METRICS.map(metric => (
            <div
              key={metric.id}
              className={`${styles.compareMetricRow} ${priorityMetrics.has(metric.id) ? styles.compareMetricPriority : ''}`}
            >
              <div className={styles.compareMetricLabel}>
                <strong>{metric.label}</strong>
                <span>{metric.short}</span>
              </div>

              {entries.map(entry => (
                <div key={`${entry.entryKey}-${metric.id}`} className={styles.compareMetricCell}>
                  <span>{formatValue(getEntryMetricValue(entry, metric.id, mode), mode, metric.id)}</span>
                  <div className={styles.compareBarTrack}>
                    <i style={{ width: `${getBarWidth(entry, metric, entries, mode)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

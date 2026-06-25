import { METRIC_MODES } from '../../lib/leaderboardSelectors.js'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

export default function MetricModeTabs({ mode, onChange }) {
  return (
    <div className={styles.modeTabs} role="group" aria-label="统计口径">
      {METRIC_MODES.map(item => (
        <button
          key={item.id}
          type="button"
          className={`${styles.modeTab} ${mode === item.id ? styles.modeTabActive : ''}`}
          aria-pressed={mode === item.id}
          onClick={() => onChange(item.id)}
        >
          <span>{item.label}</span>
          <b>{item.en}</b>
        </button>
      ))}
    </div>
  )
}

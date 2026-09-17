import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { METRIC_MODES } from '../../lib/leaderboardSelectors.js'
import styles from '../../features/fd-design/leaderboardStyles.js'

export default function MetricModeTabs({ mode, onChange }) {
  const uiLocale = useUiLocale()
  return (
    <div className={styles.modeTabs} role="group" aria-label={uiText("统计口径", uiLocale)}>
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

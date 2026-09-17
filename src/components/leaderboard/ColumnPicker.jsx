import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { LEADERBOARD_COLUMNS } from '../../lib/leaderboardSelectors.js'
import styles from '../../features/fd-design/leaderboardStyles.js'

export default function ColumnPicker({ visibleColumns, onChange }) {
  const uiLocale = useUiLocale()
  const visibleSet = new Set(visibleColumns)

  const toggleColumn = columnId => {
    const next = visibleSet.has(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId]

    onChange(next)
  }

  return (
    <details className={styles.columnPicker}>
      <summary aria-label={uiText("打开列设置", uiLocale)}>{uiText("列设置", uiLocale)}</summary>
      <div className={styles.columnPickerPanel}>
        {LEADERBOARD_COLUMNS.map(column => (
          <label key={column.id}>
            <input
              type="checkbox"
              checked={visibleSet.has(column.id)}
              onChange={() => toggleColumn(column.id)}
            />
            <span>{column.label}</span>
            <b>{column.en}</b>
          </label>
        ))}
      </div>
    </details>
  )
}

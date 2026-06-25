import { LEADERBOARD_COLUMNS } from '../../lib/leaderboardSelectors.js'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

export default function ColumnPicker({ visibleColumns, onChange }) {
  const visibleSet = new Set(visibleColumns)

  const toggleColumn = columnId => {
    const next = visibleSet.has(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId]

    onChange(next)
  }

  return (
    <details className={styles.columnPicker}>
      <summary aria-label="打开列设置">列设置</summary>
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

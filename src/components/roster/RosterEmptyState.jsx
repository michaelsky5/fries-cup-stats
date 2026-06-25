import styles from './RosterComponents.module.css'

export default function RosterEmptyState({ title, onReset }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyTitle}>{title}</div>
      {onReset ? (
        <button type="button" className={styles.emptyAction} onClick={onReset}>
          清除筛选 →
        </button>
      ) : null}
    </div>
  )
}

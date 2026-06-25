import styles from '../../pages/advance/AdvancePage.module.css'

export default function AdvancePhaseNav({ items, activeKey, onChange, ariaLabel }) {
  return (
    <div className={styles.phaseFilter} role="group" aria-label={ariaLabel}>
      {items.map(item => (
        <button
          key={item.key}
          type="button"
          className={item.key === activeKey ? styles.phaseFilterActive : ''}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

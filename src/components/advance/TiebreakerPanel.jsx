import styles from '../../pages/advance/AdvancePage.module.css'

export default function TiebreakerPanel({ rules, t }) {
  return (
    <aside className={styles.tiebreakerPanel}>
      <div className={styles.sectionHeaderCompact}>
        <span className={styles.sectionLabel}>TIEBREAKERS</span>
        <h2>{t('advance.tiebreakers.title', '同分规则')}</h2>
      </div>
      <ol>
        {rules.map(rule => (
          <li key={`${rule.index}-${rule.key}`}>
            <strong>{String(rule.index).padStart(2, '0')}</strong>
            <span>{t(`advance.tiebreaker.${rule.key}`, rule.key)}</span>
          </li>
        ))}
      </ol>
    </aside>
  )
}

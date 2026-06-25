import styles from './RosterComponents.module.css'

export default function RosterPageHeader({ stats = [] }) {
  return (
    <section className={styles.pageHeader}>
      <div className={styles.pageHeaderMain}>
        <div className={styles.sectionLabel}>ROSTER</div>
        <h1 className={styles.pageTitle}>参赛阵容</h1>
        <p className={styles.pageDesc}>浏览本届赛事的参赛战队、选手与赛事职员。</p>
      </div>

      <div className={styles.summaryGrid} aria-label="Roster summary">
        {stats.map(item => (
          <div key={`${item.label}-${item.value}`} className={styles.summaryItem}>
            <div className={styles.summaryValue}>{item.value}</div>
            <div className={styles.summaryLabel}>{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

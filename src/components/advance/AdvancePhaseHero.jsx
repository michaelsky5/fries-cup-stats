import styles from '../../pages/advance/AdvancePage.module.css'

export default function AdvancePhaseHero({
  eyebrow,
  title,
  description,
  metrics = [],
  standalone = false
}) {
  return (
    <header className={`${styles.phaseHero} ${standalone ? styles.phaseHeroStandalone : ''}`}>
      <div className={styles.phaseHeroCopy}>
        <span className={styles.sectionLabel}>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className={styles.phaseHeroMetrics}>
        {metrics.map(metric => (
          <span key={`${metric.value}-${metric.label}`} className={metric.accent ? styles.phaseHeroMetricAccent : ''}>
            <strong>{metric.value}</strong>
            <em>{metric.label}</em>
          </span>
        ))}
      </div>
    </header>
  )
}

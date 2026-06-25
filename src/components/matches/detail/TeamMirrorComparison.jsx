import styles from './MatchDetail.module.css'

export default function TeamMirrorComparison({ comparison, t }) {
  return (
    <section className={styles.mirrorPanel} aria-labelledby="mirror-comparison-title">
      <header className={styles.analysisSubhead}>
        <span>TEAM MIRROR</span>
        <strong id="mirror-comparison-title">{t('matchDetail.seriesComparison', 'Series Team Comparison')}</strong>
      </header>

      <div className={styles.mirrorTeams}>
        <strong>{comparison.teamA.short}</strong>
        <span>{comparison.teamB.short}</span>
      </div>

      <div className={styles.mirrorRows}>
        {comparison.rows.map(row => (
          <div key={row.key} className={styles.mirrorRow} data-negative={row.lowerIsBetter ? 'true' : 'false'}>
            <span className={styles.mirrorValue} data-leader={row.leader === 'A' ? 'true' : 'false'}>
              {row.aLabel}
            </span>
            <span className={styles.mirrorMetric}>
              <small>{row.en}</small>
              <strong>{row.label}</strong>
            </span>
            <span className={styles.mirrorValueRight} data-leader={row.leader === 'B' ? 'true' : 'false'}>
              {row.bLabel}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

import styles from './GlobalSummaryBar.module.css'

function Item({ label, value, meta, accent = false, isLive = false }) {
  const showPulse = isLive && Number(value) > 0

  return (
    <div className={`${styles.metricCard} ${accent ? styles.metricCardAccent : ''} ${showPulse ? styles.metricCardLive : ''}`}>
      <div className={styles.metricTop}>
        <div className={styles.metricLabelWrap}>
          <div className={styles.metricLabel}>{label}</div>
          {showPulse ? <div className={styles.pulseDot}></div> : null}
        </div>
        <div className={styles.metricMeta}>{meta}</div>
      </div>

      <div className={`${styles.metricValue} ${showPulse ? styles.valueLive : ''}`}>
        {value}
      </div>
    </div>
  )
}

export default function GlobalSummaryBar({ summary, t = (key, fallback) => fallback || key }) {
  return (
    <section className={styles.metrics}>
      <Item label={t('summary.teams', 'Teams')} value={summary?.teamCount || 0} meta="TEAMS" />
      <Item label={t('summary.players', 'Players')} value={summary?.playerCount || 0} meta="PLAYERS" />
      <Item label={t('summary.matches', 'Matches')} value={summary?.matchCount || 0} meta="MATCHES" accent />
      <Item label={t('summary.maps', 'Maps')} value={summary?.mapCount || 0} meta="MAPS PLAYED" />
      <Item label={t('summary.completed', 'Completed')} value={summary?.completed || 0} meta="FINISHED" />
      <Item label={t('summary.live', 'Live')} value={summary?.inProgress || 0} meta="LIVE MATCHES" isLive />
      <Item label={t('summary.pending', 'Pending')} value={summary?.pending || 0} meta="UPCOMING" />
    </section>
  )
}

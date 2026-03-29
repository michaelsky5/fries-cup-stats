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

export default function GlobalSummaryBar({ summary }) {
  return (
    <section className={styles.metrics}>
      <Item label="参赛队伍" value={summary?.teamCount || 0} meta="REGISTERED TEAMS" />
      <Item label="选手名单" value={summary?.playerCount || 0} meta="ACTIVE ROSTER" />
      <Item label="总场次" value={summary?.matchCount || 0} meta="SEASON MATCHES" accent />
      <Item label="地图总数" value={summary?.mapCount || 0} meta="TOTAL MAPS" />
      <Item label="已完结" value={summary?.completed || 0} meta="COMPLETED" />
      <Item label="进行中" value={summary?.inProgress || 0} meta="LIVE OPERATION" isLive />
      <Item label="未开始" value={summary?.pending || 0} meta="PENDING" />
    </section>
  )
}
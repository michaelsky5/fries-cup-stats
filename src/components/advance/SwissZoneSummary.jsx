import styles from '../../pages/advance/AdvancePage.module.css'

export default function SwissZoneSummary({ zones, t, archive = false }) {
  const visibleZones = archive
    ? zones.filter(zone => zone.count > 0 || ['direct', 'breakthrough', 'eliminated'].includes(zone.key))
    : zones

  return (
    <section className={styles.zoneSummary}>
      <header>
        <span className={styles.sectionLabel}>ZONE SUMMARY</span>
        <h2>{archive ? t('advance.swiss.archiveZoneSummary', '瑞士轮最终分层') : t('advance.swiss.zoneSummary', '晋级区域统计')}</h2>
      </header>
      <div className={styles.zoneList}>
        {visibleZones.map(zone => (
          <article key={zone.key} className={styles[`zone_${zone.tone}`]}>
            <span>{t(`advance.zone.${zone.key}`, zone.key)}</span>
            <strong>{zone.count}</strong>
            <em>{zone.rows.slice(0, 4).map(row => row.team_short_name || row.team_name).join(' / ') || t('advance.common.none', '暂无')}</em>
          </article>
        ))}
      </div>
    </section>
  )
}

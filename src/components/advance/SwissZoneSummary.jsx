import styles from '../../pages/advance/AdvancePage.module.css'

export default function SwissZoneSummary({ zones, t, archive = false, activeZone = 'all', onZoneSelect }) {
  const visibleZones = archive
    ? zones.filter(zone => zone.count > 0 || ['direct', 'breakthrough', 'eliminated'].includes(zone.key))
    : zones
  const total = visibleZones.reduce((sum, zone) => sum + zone.count, 0)
  const selectedLabel = activeZone === 'all'
    ? t('advance.common.all', '全部')
    : t(`advance.zone.${activeZone}`, activeZone)

  return (
    <section className={styles.zoneSummary}>
      <header>
        <div>
          <span className={styles.sectionLabel}>ZONE SUMMARY</span>
          <h2>{archive ? t('advance.swiss.archiveZoneSummary', '瑞士轮最终分层') : t('advance.swiss.zoneSummary', '晋级区域统计')}</h2>
        </div>
        <button
          type="button"
          className={[styles.zoneReset, activeZone === 'all' ? styles.zoneResetActive : ''].filter(Boolean).join(' ')}
          onClick={() => onZoneSelect?.('all')}
        >
          {selectedLabel}
        </button>
      </header>
      <div className={styles.zoneBar} aria-hidden="true">
        {visibleZones.map(zone => {
          const share = total ? Math.max(2, (zone.count / total) * 100) : 0
          return (
            <span
              key={zone.key}
              className={styles[`zone_${zone.tone}`]}
              style={{ '--zone-share': `${share}%` }}
            />
          )
        })}
      </div>
      <div className={styles.zoneList}>
        {visibleZones.map(zone => (
          <button
            key={zone.key}
            type="button"
            className={[
              styles[`zone_${zone.tone}`],
              activeZone === zone.key ? styles.zoneActive : ''
            ].filter(Boolean).join(' ')}
            onClick={() => onZoneSelect?.(zone.key)}
          >
            <span>{t(`advance.zone.${zone.key}`, zone.key)}</span>
            <strong>{zone.count}</strong>
            <em>{zone.rows.slice(0, 4).map(row => row.team_short_name || row.team_name).join(' / ') || t('advance.common.none', '暂无')}</em>
          </button>
        ))}
      </div>
    </section>
  )
}

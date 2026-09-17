import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from '../../pages/advance/AdvancePage.module.css'

export default function SwissZoneSummary({ zones, t, archive = false, activeZone = 'all', onZoneSelect }) {
  const uiLocale = useUiLocale()
  const visibleZones = archive
    ? zones.filter(zone => zone.count > 0 || ['direct', 'breakthrough', 'eliminated'].includes(zone.key))
    : zones
  const selectedLabel = activeZone === 'all'
    ? t('advance.common.all', '全部')
    : t(`advance.zone.${activeZone}`, activeZone)

  return (
    <section className={styles.swissZonePool}>
      <header>
        <div>
          <span className={styles.sectionLabel}>ZONE SUMMARY</span>
          <strong>{archive ? t('advance.swiss.archiveZoneSummary', uiText("瑞士轮最终分层", uiLocale)) : t('advance.swiss.zoneSummary', uiText("晋级区域", uiLocale))}</strong>
        </div>
        <button
          type="button"
          className={[styles.zoneReset, activeZone === 'all' ? styles.zoneResetActive : ''].filter(Boolean).join(' ')}
          onClick={() => onZoneSelect?.('all')}
        >
          {selectedLabel}
        </button>
      </header>
      <div>
        {visibleZones.map((zone, index) => (
          <button
            key={zone.key}
            type="button"
            className={[
              styles[`zone_${zone.tone}`],
              activeZone === zone.key ? styles.zoneActive : ''
            ].filter(Boolean).join(' ')}
            onClick={() => onZoneSelect?.(zone.key)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{t(`advance.zone.${zone.key}`, zone.key)}</strong>
            <b>{zone.count}</b>
            <em>{zone.rows.slice(0, 4).map(row => row.team_short_name || row.team_name).join(' / ') || t('advance.common.none', uiText("暂无", uiLocale))}</em>
          </button>
        ))}
      </div>
    </section>
  )
}

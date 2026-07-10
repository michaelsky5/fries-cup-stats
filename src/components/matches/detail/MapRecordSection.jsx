import DualTeamStatsTable from './DualTeamStatsTable.jsx'
import MapMetaStrip from './MapMetaStrip.jsx'
import MapRecordHeader from './MapRecordHeader.jsx'
import styles from './MatchDetail.module.css'

export default function MapRecordSection({
  dossier,
  expandedMaps,
  onToggleMap,
  onExpandAll,
  onCollapseAll,
  setMapRef,
  seasonId,
  locale = 'zh-CN',
  t
}) {
  const allExpanded = dossier.mapRecords.length > 0 && dossier.mapRecords.every(map => expandedMaps.has(map.order))

  return (
    <section className={styles.mapRecordsSection} id="map-records">
      <header className={styles.sectionHead}>
        <div>
          <div className={styles.sectionEyebrow}>MAP RECORDS</div>
          <h2 className={styles.sectionTitle}>{t('matchDetail.mapRecords', 'Map Records')}</h2>
        </div>
        <div className={styles.mapControls}>
          {allExpanded ? (
            <button type="button" className={styles.textButton} onClick={onCollapseAll}>
              {t('matchDetail.collapseAll', 'Collapse All Maps')}
            </button>
          ) : (
            <button type="button" className={styles.textButton} onClick={onExpandAll}>
              {t('matchDetail.expandAll', 'Expand All Maps')}
            </button>
          )}
        </div>
      </header>

      <div className={styles.mapsStack}>
        {dossier.mapRecords.map(map => {
          const expanded = expandedMaps.has(map.order)

          return (
            <article
              key={map.key}
              id={`map-${map.order}`}
              ref={node => setMapRef(map.order, node)}
              className={styles.mapRecord}
            >
              <button
                type="button"
                className={styles.accordionButton}
                aria-expanded={expanded}
                aria-controls={`map-${map.order}-body`}
                onClick={() => onToggleMap(map.order)}
              >
                <MapRecordHeader map={map} dossier={dossier} expanded={expanded} t={t} />
              </button>

              {expanded ? (
                <div id={`map-${map.order}-body`} className={styles.mapRecordBody}>
                  <MapMetaStrip map={map} dossier={dossier} t={t} />
                  <DualTeamStatsTable map={map} dossier={dossier} seasonId={seasonId} locale={locale} t={t} />
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

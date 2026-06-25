import styles from './MatchDetail.module.css'

export default function SeriesMapRail({
  dossier,
  activeMapOrder,
  overviewActive,
  onOverview,
  onSelectMap,
  t
}) {
  if (!dossier.hasMapRecords) return null

  return (
    <nav className={styles.seriesRail} aria-label={t('matchDetail.seriesPath', 'Series Path')}>
      <div className={styles.seriesRailHead}>
        <span>SERIES PATH</span>
        <strong>{t('matchDetail.seriesPath', 'Series Path')}</strong>
      </div>
      <div className={styles.seriesRailScroller}>
        <div className={styles.seriesRailTrack} style={{ '--map-count': dossier.seriesPath.length }}>
          <button
            type="button"
            className={styles.seriesOverviewNode}
            data-active={overviewActive ? 'true' : 'false'}
            onClick={onOverview}
          >
            <span>MATCH</span>
            <strong>{t('matchDetail.overview', 'Match Overview')}</strong>
            <b>{dossier.scoreLabel}</b>
          </button>

          {dossier.seriesPath.map(map => (
            <button
              type="button"
              key={map.key}
              className={styles.seriesMapNode}
              data-active={activeMapOrder === map.order ? 'true' : 'false'}
              data-complete={map.complete ? 'true' : 'false'}
              onClick={() => onSelectMap(map.order)}
              aria-current={activeMapOrder === map.order ? 'step' : undefined}
            >
              <span>{map.orderLabel}</span>
              <strong title={map.name}>{map.name}</strong>
              <b>
                <span>{map.score}</span>
                {map.winner ? <em>{map.winner === 'DRAW' ? 'DRAW' : `${map.winner} WIN`}</em> : null}
              </b>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

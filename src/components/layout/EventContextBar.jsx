import styles from './EventContextBar.module.css'

function getSwitcherGroup(season) {
  return season?.reviewEnabled ? 'ARCHIVE' : 'CURRENT'
}

function getSwitcherMeta(season, currentSeasonId, seasonStatus) {
  if (season?.id === currentSeasonId) {
    const status = getReadableStatus(seasonStatus)
    if (season?.reviewEnabled) return `${status} · 冠军 HYW · 127 场`
    return `${status} · 38 队 · 250 选手`
  }

  if (season?.reviewEnabled) return '冠军 HYW · 127 场'
  return '38 队 · 250 选手'
}

function getReadableStatus(seasonStatus) {
  if (seasonStatus?.isFinished) return '\u8d5b\u5b63\u5df2\u5f52\u6863'
  if (seasonStatus?.liveMatches) return '\u6bd4\u8d5b\u8fdb\u884c\u4e2d'
  if (seasonStatus?.completedMatches) return '\u8d5b\u4e8b\u8fdb\u884c\u4e2d'
  if (seasonStatus?.totalMatches) return '\u8d5b\u7a0b\u5df2\u53d1\u5e03'
  return '\u8d5b\u7a0b\u5f85\u53d1\u5e03'
}

function EventSwitcher({ seasonId, seasons, locale, seasonStatus, onSeasonChange }) {
  const currentSeason = seasons.find(item => item.id === seasonId) || seasons[0]
  const currentItems = seasons.filter(item => getSwitcherGroup(item) === 'CURRENT')
  const archiveItems = seasons.filter(item => getSwitcherGroup(item) === 'ARCHIVE')

  const renderSeasonButton = item => {
    const name = locale === 'en-US' ? item?.name?.en : item?.name?.zh
    const isActive = item.id === seasonId

    return (
      <button
        key={item.id}
        type="button"
        className={isActive ? styles.switcherOptionActive : ''}
        onClick={event => {
          event.currentTarget.closest('details')?.removeAttribute('open')
          onSeasonChange?.(item.id)
        }}
      >
        <strong>{item.publicCode}</strong>
        <span>{name}</span>
        <em>{getSwitcherMeta(item, seasonId, seasonStatus)}</em>
      </button>
    )
  }

  return (
    <details className={styles.eventSwitcher}>
      <summary>
        <span>切换赛事</span>
        <strong>{currentSeason?.publicCode || seasonId}</strong>
      </summary>
      <div className={styles.switcherPanel}>
        {currentItems.length ? (
          <section>
            <h3>CURRENT 当前赛事</h3>
            {currentItems.map(renderSeasonButton)}
          </section>
        ) : null}
        {archiveItems.length ? (
          <section>
            <h3>ARCHIVE 赛季档案</h3>
            {archiveItems.map(renderSeasonButton)}
          </section>
        ) : null}
      </div>
    </details>
  )
}

export default function EventContextBar({
  season,
  seasonId,
  locale,
  seasons = [],
  updatedAtText = '',
  seasonStatus,
  onSeasonChange
}) {
  const statusLabel = getReadableStatus(seasonStatus)

  return (
    <section className={styles.contextBar}>
      <div className={styles.eventLead}>
        <div className={styles.eventIdentity}>
          <span className={styles.eventCode}>{season?.publicCode || seasonId}</span>
        </div>
      </div>

      <div className={styles.eventMeta}>
        <span>状态：{statusLabel}</span>
        <span>更新 {updatedAtText || '-'}</span>
        <a href="https://fries-cup.com/" className={styles.homeLink}>
          HOME
        </a>
        <EventSwitcher
          seasonId={seasonId}
          seasons={seasons}
          locale={locale}
          seasonStatus={seasonStatus}
          onSeasonChange={onSeasonChange}
        />
      </div>
    </section>
  )
}

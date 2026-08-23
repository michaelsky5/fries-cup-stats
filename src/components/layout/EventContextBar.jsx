import styles from './EventContextBar.module.css'
import { pickLocale } from '../../lib/legacyI18n.js'

const FALLBACK_CURRENT_SCALE = {
  teamCount: 38,
  playerCount: 251
}

function getSwitcherGroup(season) {
  return season?.reviewEnabled ? 'ARCHIVE' : 'CURRENT'
}

function toPositiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function getCurrentScale(activeSummary = null) {
  return {
    teamCount: toPositiveNumber(activeSummary?.teamCount) || FALLBACK_CURRENT_SCALE.teamCount,
    playerCount: toPositiveNumber(activeSummary?.playerCount) || FALLBACK_CURRENT_SCALE.playerCount
  }
}

function getCurrentScaleText(locale, activeSummary = null) {
  const scale = getCurrentScale(activeSummary)
  return pickLocale(
    locale,
    `${scale.teamCount} 队 · ${scale.playerCount} 选手`,
    `${scale.teamCount} teams · ${scale.playerCount} players`
  )
}

function getArchiveMetaText(season, locale = 'zh-CN', activeSummary = null) {
  const championShort = String(season?.switcherMeta?.championShort || '').trim() || '-'
  const matchCount = toPositiveNumber(activeSummary?.matchCount) ||
    toPositiveNumber(season?.switcherMeta?.matchCount) ||
    '-'

  return pickLocale(
    locale,
    `冠军 ${championShort} · ${matchCount} 场`,
    `Champion ${championShort} · ${matchCount} matches`
  )
}

function getSwitcherMeta(season, currentSeasonId, seasonStatus, locale = 'zh-CN', activeSummary = null) {
  if (season?.id === currentSeasonId) {
    const status = getReadableStatus(seasonStatus, locale)
    if (season?.reviewEnabled) return `${status} · ${getArchiveMetaText(season, locale, activeSummary)}`
    return `${status} · ${getCurrentScaleText(locale, activeSummary)}`
  }

  if (season?.reviewEnabled) return getArchiveMetaText(season, locale)
  return getCurrentScaleText(locale)
}

function getReadableStatus(seasonStatus, locale = 'zh-CN') {
  if (seasonStatus?.isFinished) return pickLocale(locale, '赛季已归档', 'Season Archived')
  if (seasonStatus?.liveMatches) return pickLocale(locale, '比赛进行中', 'Live')
  if (seasonStatus?.completedMatches) return pickLocale(locale, '赛事进行中', 'Season Active')
  if (seasonStatus?.totalMatches) return pickLocale(locale, '赛程已发布', 'Schedule Published')
  return pickLocale(locale, '赛程待发布', 'Schedule Pending')
}

function EventSwitcher({ seasonId, seasons, locale, seasonStatus, activeSummary, onSeasonChange }) {
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
        <em>{getSwitcherMeta(item, seasonId, seasonStatus, locale, activeSummary)}</em>
      </button>
    )
  }

  return (
    <details className={styles.eventSwitcher}>
      <summary>
        <span>{pickLocale(locale, '切换赛事', 'Switch Event')}</span>
        <strong>{currentSeason?.publicCode || seasonId}</strong>
      </summary>
      <div className={styles.switcherPanel}>
        {currentItems.length ? (
          <section>
            <h3>{pickLocale(locale, 'CURRENT 当前赛事', 'CURRENT Event')}</h3>
            {currentItems.map(renderSeasonButton)}
          </section>
        ) : null}
        {archiveItems.length ? (
          <section>
            <h3>{pickLocale(locale, 'ARCHIVE 赛季档案', 'ARCHIVE Season')}</h3>
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
  activeSummary,
  onSeasonChange
}) {
  const statusLabel = getReadableStatus(seasonStatus, locale)

  return (
    <section className={styles.contextBar}>
      <div className={styles.eventLead}>
        <div className={styles.eventIdentity}>
          <span className={styles.eventCode}>{season?.publicCode || seasonId}</span>
        </div>
      </div>

      <div className={styles.eventMeta}>
        <span>{pickLocale(locale, '状态：', 'Status: ')}{statusLabel}</span>
        <span>
          {pickLocale(locale, '更新 ', 'Updated ')}<span data-i18n-ignore>{updatedAtText || '-'}</span>
        </span>
        <a href="https://fries-cup.com/" className={styles.homeLink}>
          HOME
        </a>
        <EventSwitcher
          seasonId={seasonId}
          seasons={seasons}
          locale={locale}
          seasonStatus={seasonStatus}
          activeSummary={activeSummary}
          onSeasonChange={onSeasonChange}
        />
      </div>
    </section>
  )
}

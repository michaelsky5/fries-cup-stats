import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useRef } from 'react'
import styles from '../../features/fd-design/eventContextStyles.js'
import { pickLocale } from '../../lib/legacyI18n.js'
import { getSeasonLifecycleGroup } from '../../lib/publicDataStatus.js'

function contextText(locale, zh, en, ko = en) {
  if (locale === 'ko-KR') return ko
  return pickLocale(locale, zh, en)
}

function toPositiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function getCurrentScale(activeSummary = null, season = null) {
  return {
    teamCount: toPositiveNumber(activeSummary?.teamCount) || toPositiveNumber(season?.switcherMeta?.teamCount) || '—',
    playerCount: toPositiveNumber(activeSummary?.playerCount) || toPositiveNumber(season?.switcherMeta?.playerCount) || '—'
  }
}

function getCurrentScaleText(locale, activeSummary = null, season = null) {
  const scale = getCurrentScale(activeSummary, season)
  return contextText(
    locale,
    `${scale.teamCount} 队 · ${scale.playerCount} 选手`,
    `${scale.teamCount} teams · ${scale.playerCount} players`,
    `${scale.teamCount}개 팀 · ${scale.playerCount}명 선수`
  )
}

function getArchiveMetaText(season, locale = 'zh-CN', activeSummary = null) {
  const championShort = String(season?.switcherMeta?.championShort || '').trim()
  const matchCount = toPositiveNumber(activeSummary?.matchCount) ||
    toPositiveNumber(season?.switcherMeta?.matchCount) ||
    '—'

  return contextText(
    locale,
    `${championShort ? `冠军 ${championShort} · ` : ''}${matchCount} 场`,
    `${championShort ? `Champion ${championShort} · ` : ''}${matchCount} matches`,
    `${championShort ? `우승 ${championShort} · ` : ''}${matchCount}경기`
  )
}

function getSwitcherMeta(season, currentSeasonId, seasonStatus, locale = 'zh-CN', activeSummary = null) {
  if (season?.id === currentSeasonId) {
    const status = getReadableStatus(seasonStatus, locale)
    if (getSeasonLifecycleGroup(season, seasonStatus) === 'ARCHIVE') return `${status} · ${getArchiveMetaText(season, locale, activeSummary)}`
    return `${status} · ${getCurrentScaleText(locale, activeSummary, season)}`
  }

  if (getSeasonLifecycleGroup(season) === 'ARCHIVE') return getArchiveMetaText(season, locale)
  return getCurrentScaleText(locale, null, season)
}

function getReadableStatus(seasonStatus, locale = 'zh-CN') {
  if (seasonStatus?.isFinished) return contextText(locale, '赛季已归档', 'Season Archived', '시즌 아카이브 완료')
  if (seasonStatus?.liveMatches) return contextText(locale, '比赛进行中', 'Live', '경기 진행 중')
  if (seasonStatus?.completedMatches) return contextText(locale, '赛事进行中', 'Season Active', '시즌 진행 중')
  if (seasonStatus?.totalMatches) return contextText(locale, '赛程已发布', 'Schedule Published', '일정 공개')
  return contextText(locale, '赛程待发布', 'Schedule Pending', '일정 공개 대기')
}

function EventSwitcher({ seasonId, seasons, locale, seasonStatus, activeSummary, onSeasonChange, compact = false }) {
  const detailsRef = useRef(null)
  const currentSeason = seasons.find(item => item.id === seasonId) || seasons[0]
  const groupFor = item => getSeasonLifecycleGroup(item, item.id === seasonId ? seasonStatus : null)
  const currentItems = seasons.filter(item => groupFor(item) === 'CURRENT')
  const archiveItems = seasons.filter(item => groupFor(item) === 'ARCHIVE')

  useEffect(() => {
    const closeMenu = event => {
      const details = detailsRef.current
      if (!details?.open) return

      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return
        details.removeAttribute('open')
        details.querySelector('summary')?.focus()
        return
      }

      if (!details.contains(event.target)) details.removeAttribute('open')
    }

    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeMenu)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeMenu)
    }
  }, [])

  const renderSeasonButton = item => {
    const name = contextText(locale, item?.name?.zh, item?.name?.en, uiText(item?.name?.zh, locale))
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
    <details ref={detailsRef} className={styles.eventSwitcher}>
      <summary>
        {compact ? (
          <>
            <strong>{currentSeason?.publicCode || seasonId}</strong>
            <span>{groupFor(currentSeason)}</span>
          </>
        ) : (
          <>
            <span>{contextText(locale, uiText("切换赛事", locale), 'Switch Event', '대회 전환')}</span>
            <strong>{currentSeason?.publicCode || seasonId}</strong>
          </>
        )}
      </summary>
      <div className={styles.switcherPanel}>
        {currentItems.length ? (
          <section>
            <h3>{contextText(locale, uiText("CURRENT 当前赛事", locale), 'CURRENT Event', 'CURRENT 진행 중')}</h3>
            {currentItems.map(renderSeasonButton)}
          </section>
        ) : null}
        {archiveItems.length ? (
          <section>
            <h3>{contextText(locale, uiText("ARCHIVE 赛季档案", locale), 'ARCHIVE Season', 'ARCHIVE 시즌 아카이브')}</h3>
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
  isSyncing = false,
  dataStatus = null,
  onSeasonChange,
  activeSection = null,
  contextMode = '',
  placement = '',
  presentation = 'default',
  isPreview = false,
  onRetry
}) {
  const isHeaderPlacement = placement === 'header'
  const isContentPlacement = placement === 'content'
  const lifecycle = getSeasonLifecycleGroup(season, seasonStatus)
  const statusLabel = dataStatus?.key === 'loading'
    ? contextText(locale, '正在载入赛事状态', 'Loading event status', '대회 상태 불러오는 중')
    : getReadableStatus(seasonStatus, locale)
  const directoryNotice = [
    isPreview && dataStatus?.key === 'local' ? '' : dataStatus?.notice,
    isPreview ? contextText(locale, '设计样例 · 对阵、比分与积分均为演示', 'Design sample · fictional fixtures, scores and points', '디자인 예시 · 대진, 점수 및 순위 점수는 가상입니다') : ''
  ].filter(Boolean).join(' ')

  if (presentation === 'directory') return (
    <section className={styles.directoryContext} data-directory-context data-source={dataStatus?.key} data-i18n-ignore aria-label={contextText(locale, uiText("赛事与数据状态", locale), 'Event and data status', '대회 및 데이터 상태')}>
      <div className={styles.directoryIdentity}>
        <strong>{season?.publicCode || seasonId}</strong>
        <span>{statusLabel}</span>
      </div>
      <div className={styles.directoryData} role="status">
        <div className={styles.directoryStamp}><strong>{dataStatus?.label || contextText(locale, uiText("数据更新于", locale), 'Updated', '업데이트')}</strong><time>{updatedAtText || '—'}</time></div>
        {directoryNotice ? <p>{directoryNotice}</p> : null}
      </div>
      {dataStatus?.notice && onRetry ? <button type="button" className={styles.directoryRetry} onClick={onRetry} disabled={isSyncing}>{isSyncing ? dataStatus.refreshingLabel : dataStatus.retryLabel}</button> : null}
    </section>
  )

  return (
    <section
      className={styles.contextBar}
      data-syncing={isSyncing ? 'true' : 'false'}
      data-context-mode={contextMode || undefined}
      data-placement={placement || undefined}
      data-source={dataStatus?.key}
      data-i18n-ignore
    >
      {!isHeaderPlacement ? <div className={styles.eventLead} data-lifecycle={lifecycle}>
        {season?.logoUrl ? (
          <img
            className={styles.eventLogo}
            src={season.logoUrl}
            alt={contextText(locale, season?.name?.zh, season?.name?.en, uiText(season?.name?.zh, locale))}
          />
        ) : null}
        <div className={styles.eventIdentity}>
          <span className={styles.eventCode}>{season?.publicCode || seasonId}</span>
          {season?.partnerLabel ? (
            <span className={styles.partnerLabel}>
              {locale === 'zh-CN' ? uiText(season.partnerLabel.zh, locale) : season.partnerLabel.en}
            </span>
          ) : null}
        </div>
      </div> : null}

      {!isHeaderPlacement && activeSection ? (
        <div className={styles.pageContext} data-i18n-ignore>
          <span>{activeSection.number} / {activeSection.code}</span>
          <strong>{activeSection.label}</strong>
        </div>
      ) : null}

      <div className={styles.eventMeta}>
        {!isHeaderPlacement ? <span className={styles.statusMeta} aria-live="polite" title={statusLabel}>
          <i aria-hidden="true" />
          {contextMode ? statusLabel : `${contextText(locale, '状态：', 'Status: ', '상태: ')}${statusLabel}`}
        </span> : null}
        {!isHeaderPlacement ? <span className={styles.updatedMeta} title={`${dataStatus?.label || ''} ${updatedAtText || '—'}`}>
          <span>{dataStatus?.label || contextText(locale, uiText("数据更新于", locale), 'Updated', '업데이트')}</span>
          <time>{updatedAtText || '—'}</time>
        </span> : null}
        {!isHeaderPlacement && !isContentPlacement ? <a href="https://fries-cup.com/" className={styles.homeLink}>
          HOME
        </a> : null}
        {!isContentPlacement ? <EventSwitcher
          seasonId={seasonId}
          seasons={seasons}
          locale={locale}
          seasonStatus={seasonStatus}
          activeSummary={activeSummary}
          onSeasonChange={onSeasonChange}
          compact={isHeaderPlacement}
        /> : null}
      </div>
      {!isHeaderPlacement && isSyncing ? <i className={styles.syncLine} aria-hidden="true"><span /></i> : null}
    </section>
  )
}

import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useRef } from 'react'
import styles from '../../features/fd-design/eventContextStyles.js'
import { pickLocale } from '../../lib/legacyI18n.js'
import { getSeasonLifecycleGroup, getSeasonStatusKey } from '../../lib/publicDataStatus.js'
import { getSeasonEventKind, getSeasonEventGroups } from '../../config/seasons.js'

function contextText(locale, zh, en, ko = en) {
  if (locale === 'ko-KR') return ko
  return pickLocale(locale, zh, en)
}

function getEventKindLabel(season, locale) {
  return getSeasonEventKind(season) === 'PARTNER'
    ? contextText(locale, uiText('合作赛事', locale), 'Partner event', '협력 대회')
    : contextText(locale, uiText('官方赛事', locale), 'Official event', '공식 대회')
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
    `${scale.teamCount} ${uiText('队', locale)} · ${scale.playerCount} ${uiText('选手', locale)}`,
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
    `${championShort ? `${uiText('冠军', locale)} ${championShort} · ` : ''}${matchCount} ${pickUiLocale(locale, '条赛程记录', 'schedule records', '일정 기록', '條賽程記錄')}`,
    `${championShort ? `Champion ${championShort} · ` : ''}${matchCount} schedule records`,
    `${championShort ? `우승 ${championShort} · ` : ''}일정 기록 ${matchCount}건`
  )
}

function getSwitcherMeta(season, currentSeasonId, seasonStatus, locale = 'zh-CN', activeSummary = null) {
  if (season?.id === currentSeasonId) {
    const status = getReadableStatus(seasonStatus, locale, season)
    if (getSeasonLifecycleGroup(season, seasonStatus) === 'ARCHIVE') return `${status} · ${getArchiveMetaText(season, locale, activeSummary)}`
    return `${status} · ${getCurrentScaleText(locale, activeSummary, season)}`
  }

  if (getSeasonLifecycleGroup(season) === 'ARCHIVE') return `${getReadableStatus(null, locale, season)} · ${getArchiveMetaText(season, locale)}`
  return getCurrentScaleText(locale, null, season)
}

function getReadableStatus(seasonStatus, locale = 'zh-CN', season = null) {
  const key = getSeasonStatusKey(season, seasonStatus)
  if (key === 'archive') return contextText(locale, uiText('赛季已归档', locale), 'Season Archived', '시즌 아카이브 완료')
  if (key === 'live') return contextText(locale, uiText('比赛进行中', locale), 'Live', '경기 진행 중')
  if (key === 'active') return contextText(locale, uiText('赛事进行中', locale), 'Season Active', '시즌 진행 중')
  if (key === 'scheduled') return contextText(locale, uiText('赛程已发布', locale), 'Schedule Published', '일정 공개')
  return contextText(locale, uiText('赛程待发布', locale), 'Schedule Pending', '일정 공개 대기')
}

function EventSwitcher({ seasonId, seasons, locale, seasonStatus, activeSummary, onSeasonChange, compact = false }) {
  const detailsRef = useRef(null)
  const currentSeason = seasons.find(item => item.id === seasonId) || seasons[0]
  const eventGroups = getSeasonEventGroups(seasons)

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
        aria-current={isActive ? 'true' : undefined}
        data-season-option={item.id}
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
            <span>{getSeasonEventKind(currentSeason)}</span>
          </>
        ) : (
          <>
            <span>{contextText(locale, uiText("切换赛事", locale), 'Switch Event', '대회 전환')}</span>
            <strong>{currentSeason?.publicCode || seasonId}</strong>
          </>
        )}
      </summary>
      <div className={styles.switcherPanel}>
        {eventGroups.map(group => (
          <section key={group.kind} data-event-kind={group.kind}>
            <h3><span>{getEventKindLabel(group.seasons[0], locale)}</span><small>{group.kind} / {String(group.seasons.length).padStart(2, '0')}</small></h3>
            {group.seasons.map(renderSeasonButton)}
          </section>
        ))}
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
    : getReadableStatus(seasonStatus, locale, season)
  const directoryNotice = [
    isPreview && dataStatus?.key === 'local' ? '' : dataStatus?.notice,
    isPreview ? contextText(locale, '设计样例 · 对阵、比分与积分均为演示', 'Design sample · fictional fixtures, scores and points', '디자인 예시 · 대진, 점수 및 순위 점수는 가상입니다') : ''
  ].filter(Boolean).join(' ')

  if (presentation === 'directory') return (
    <section className={styles.directoryContext} data-directory-context data-source={dataStatus?.key} data-i18n-ignore aria-label={contextText(locale, uiText("赛事与数据状态", locale), 'Event and data status', '대회 및 데이터 상태')}>
      <div className={styles.directoryIdentity}>
        <strong>{season?.publicCode || seasonId}</strong>
        <small className={styles.eventKindLabel}>{getEventKindLabel(season, locale)}</small>
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
          <span className={styles.partnerLabel}>{getEventKindLabel(season, locale)}</span>
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

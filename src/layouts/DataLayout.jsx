import { translateUiText as uiText } from '../lib/uiText.js'
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_SEASON_ID,
  SEASONS,
  getInitialSeasonId,
  getSeasonById,
  resolveSeasonFromUrl,
  seasonHasReview,
  setStoredSeasonId,
  withSeason as buildSeasonLink
} from '../config/seasons.js'
import { createTranslator, getStoredLocale, setStoredLocale } from '../lib/i18n.js'
import {
  getReviewLocaleParam,
  getStoredReviewLocale,
  normalizeReviewLocale
} from '../lib/reviewLocale.js'
import { usePublicSeasonData } from '../hooks/usePublicSeasonData.js'
import { getPublicDataStatus } from '../lib/publicDataStatus.js'
import { formatUpdatedAt } from '../lib/format.js'
import { getGlobalSummary } from '../lib/selectors.js'
import { getSeasonStatus } from '../lib/homeSelectors.js'
import { isWeeklyOverview } from '../features/weekly-overview/weeklyOverviewModel.js'
import { buildFriesCupTitle, getDataCenterPageLabel } from '../lib/pageTitle.js'
import { getRestoreScrollY } from '../lib/navigationState.js'
import { FavoritesProvider, normalizeSeasonId, useFavorites } from '../features/favorites/index.js'
import AuthButton from '../features/auth/AuthDialog.jsx'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import { buildAccountIdentity, findVerifiedAccountIdentity, getAccountCapabilities, resolveAccountIdentityTarget } from '../features/auth/accountIdentity.js'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import { getDossierView } from '../features/team-dossier/teamDossierScenes.js'
import { PRIMARY_NAV, getNavLabel, getPersonalNavItem, getNavigationSearch } from '../components/layout/publicNavigation.js'
import EventContextBar from '../components/layout/EventContextBar.jsx'
import UrgentAnnouncementGate from '../features/communications/UrgentAnnouncementGate.jsx'
import { fetchMySpaceContext } from '../features/my-space/mySpaceApi.js'
import { requiresPublicSnapshot } from '../features/my-space/personalSpacePolicy.js'
import useAccountCompetition from '../features/my-space/useAccountCompetition.js'
import { withAccountCompetition } from '../features/my-space/accountCompetitionModel.js'
import { buildAccountAttention } from '../features/my-space/accountAttentionModel.js'
import { useLocaleDomTranslation } from '../hooks/useLocaleDomTranslation.js'
import { createPublicTextTranslator } from '../lib/publicText.js'
import DesignPreviewBar from '../features/fd-design/DesignPreviewBar.jsx'
import { getDesignPreview, shouldShowDesignPreview } from '../features/fd-design/designPreview.js'
import styles from '../features/fd-design/layoutStyles.js'
import '../features/fd-design/FdDesignTokens.css'

const REVIEW_LAYOUT_COPY_KO = {
  'layout.meta.loading': '동기화 중',
  'layout.meta.empty': '데이터 없음',
  'layout.state.loading': '최신 대회 데이터 동기화 중',
  'layout.state.loadingDesc': '최신 공개 버전과 일정, 결과, 진출 현황을 확인하고 있습니다.',
  'layout.state.loadingProgress': '대회 데이터 동기화 진행률',
  'layout.state.fallbackKicker': 'LIVE DATA SYNC',
  'layout.state.fallbackTitle': '최신 공개 데이터 동기화 중',
  'layout.state.fallbackDesc': '마지막으로 사용 가능한 데이터가 임시로 표시되며, 동기화가 끝나면 자동으로 갱신됩니다.',
  'layout.state.error': '데이터 오류',
  'layout.state.errorDesc': '대회 데이터를 불러올 수 없습니다. 잠시 후 새로고침해 주세요.'
}

const ACCOUNT_ATTENTION_REFRESH_INTERVAL_MS = 60_000

function getReviewRouteLocale(search, fallbackLocale) {
  const requestedLocale = new URLSearchParams(search).get('lang')
  return requestedLocale
    ? normalizeReviewLocale(requestedLocale, fallbackLocale)
    : getStoredReviewLocale(fallbackLocale)
}

function createLayoutTranslator(locale) {
  const baseTranslator = createTranslator(locale)
  if (locale !== 'ko-KR') return baseTranslator

  return (key, fallback = key) => REVIEW_LAYOUT_COPY_KO[key] || baseTranslator(key, fallback)
}

function getLayoutDocumentTitle(pathname, search, locale) {
  if (/^\/review\/?$/.test(pathname)) {
    if (locale === 'ko-KR') return '시즌 리뷰 | Fries Cup'
    if (locale === 'en-US') return 'Season Review | Fries Cup'
  }
  return buildFriesCupTitle(getDataCenterPageLabel(pathname, search), locale)
}

function getNavActiveGroup(pathname, search = '') {
  const params = new URLSearchParams(search)
  const matchTab = String(params.get('tab') || '').toLowerCase()
  const isFollowingView = params.get('following') === '1' || matchTab === 'following'

  if (pathname === '/') return 'overview'
  if (pathname.startsWith('/me') || pathname.startsWith('/following')) return 'space'
  if (pathname.startsWith('/matches') || pathname.startsWith('/schedule')) return isFollowingView ? 'space' : 'matches'
  if (pathname.startsWith('/advance') || pathname.startsWith('/standings')) return 'advance'
  if (pathname.startsWith('/teams') || pathname.startsWith('/players') || pathname.startsWith('/staff') || pathname.startsWith('/roster')) return 'roster'
  if (pathname.startsWith('/leaderboard') || pathname.startsWith('/heroes') || pathname.startsWith('/maps')) return 'database'
  return ''
}

export default function DataLayout() {
  const shellRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const location = useLocation()
  const isReviewEntryRoute = /^\/review\/?$/.test(location.pathname)
  const [seasonId, setSeasonId] = useState(() => getInitialSeasonId())
  const locale = getStoredLocale()
  const publicData = usePublicSeasonData(seasonId, { reviewArchive: isReviewEntryRoute })
  const { db, error, isLoading, isRefreshing, retry } = publicData
  const [accountAttentionContext, setAccountAttentionContext] = useState(null)
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const previousPathRef = useRef(location.pathname)
  const requestedLocale = new URLSearchParams(location.search).get('lang')
  const layoutLocale = isReviewEntryRoute
    ? getReviewRouteLocale(location.search, locale)
    : requestedLocale ? normalizeReviewLocale(requestedLocale, locale) : locale
  const compatibleLayoutLocale = layoutLocale
  const isAccountSpaceRoute = /^\/(?:me|following)\/?$/.test(location.pathname)
  const designPreview = isAccountSpaceRoute ? 'kpr5' : getDesignPreview(location.search)
  const showDesignPreview = !isAccountSpaceRoute && shouldShowDesignPreview(location.search)
  const isFdDesign = designPreview === 'fd'
  const isKprStageDesign = designPreview === 'kpr3'
  const isKprImmersiveDesign = designPreview === 'kpr4'
  const isKprHybridDesign = designPreview === 'kpr5'
  const isKprDesign = designPreview === 'kpr' || isKprStageDesign || isKprImmersiveDesign || isKprHybridDesign
  const isEditorialDataRoute = isKprDesign && /^\/(?:leaderboard|maps|heroes)(?:\/|$)/.test(location.pathname)
  const isRosterIndexRoute = isKprHybridDesign && /^\/(?:roster|teams|players|staff)\/?$/.test(location.pathname)
  const isRosterDirectoryRoute = isRosterIndexRoute
  const isScheduleDirectoryRoute = isKprHybridDesign && /^\/matches\/?$/.test(location.pathname)
  const isPublicMatchDetailRoute = isKprHybridDesign && /^\/matches\/[^/]+\/?$/.test(location.pathname)
  const isPlayerRankingsRoute = isKprHybridDesign && /^\/leaderboard\/?$/.test(location.pathname)
  const isHeroDataRoute = isKprHybridDesign && /^\/heroes\/?$/.test(location.pathname)
  const isMapDataRoute = isKprHybridDesign && /^\/maps(?:\/|$)/.test(location.pathname)
  const isTeamArchiveRoute = isKprHybridDesign && /^\/teams\/[^/]+(?:\/(?:journey|analysis))?\/?$/.test(location.pathname)
  const isTeamExhibitionRoute = isTeamArchiveRoute && getDossierView(location.pathname, location.search) === 'gallery'
  const isPlayerArchiveRoute = isKprHybridDesign && /^\/players\/[^/]+(?:\/analysis)?\/?$/.test(location.pathname)
  const isKprSamplePage = /^(?:\/|\/leaderboard\/?)$/.test(location.pathname) ||
    (isKprHybridDesign && /^\/(?:matches|advance)(?:\/)?$/.test(location.pathname))
  const isFdSamplePage = /^(?:\/leaderboard|\/teams\/[^/]+)\/?$/.test(location.pathname)
  const {
    accountDataError,
    accountCapabilities: accountApiCapabilities,
    accountIdentities,
    accountPrimaryIdentity,
    accountProfile,
    accountRequests,
    isAccountDataLoading,
    isAuthenticated,
    setPrimaryIdentity,
    user: authUser
  } = useAuth()

  const t = useMemo(() => createLayoutTranslator(layoutLocale), [layoutLocale])
  const needsPublicSnapshot = requiresPublicSnapshot({
    pathname: location.pathname,
    section: new URLSearchParams(location.search).get('section'),
    isAuthenticated
  })
  const season = useMemo(() => getSeasonById(seasonId), [seasonId])
  const isWeeklyAdvanceRoute = isKprHybridDesign && /^\/advance\/?$/.test(location.pathname) && isWeeklyOverview(db, season)
  const isWeeklyHomeRoute = isKprHybridDesign && location.pathname === '/' && isWeeklyOverview(db, season)
  const isAdvanceIndexRoute = isKprHybridDesign && /^\/advance\/?$/.test(location.pathname)
  const isPublicFollowingRoute = isAccountSpaceRoute && (!isAuthenticated || location.pathname.startsWith('/following') || new URLSearchParams(location.search).get('section') === 'following')
  const isCompactContextRoute = isRosterDirectoryRoute || isScheduleDirectoryRoute || isPublicMatchDetailRoute || isPlayerRankingsRoute || isHeroDataRoute || isMapDataRoute || isAdvanceIndexRoute || isWeeklyHomeRoute || isPublicFollowingRoute || isPlayerArchiveRoute || (isTeamArchiveRoute && !isTeamExhibitionRoute)
  const competition = useAccountCompetition(season.id)
  const canonicalSeasonId = normalizeSeasonId(season?.publicCode || seasonId)
  const favoritesApi = useFavorites(canonicalSeasonId, db)

  useEffect(() => {
    let alive = true
    let requestInFlight = false

    if (!isAuthenticated || !seasonId || accountApiCapabilities?.canReadOperationalSummary !== true) {
      setAccountAttentionContext(null)
      return () => { alive = false }
    }

    setAccountAttentionContext(null)

    const refreshAccountAttention = () => {
      if (document.visibilityState === 'hidden' || requestInFlight) return
      requestInFlight = true
      fetchMySpaceContext(seasonId)
        .then(context => {
          if (alive) setAccountAttentionContext(context)
        })
        .catch(() => {
          // The navigation remains usable and simply omits its optional counters.
        })
        .finally(() => {
          requestInFlight = false
        })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshAccountAttention()
    }

    refreshAccountAttention()
    const interval = globalThis.setInterval(refreshAccountAttention, ACCOUNT_ATTENTION_REFRESH_INTERVAL_MS)
    globalThis.addEventListener('focus', refreshAccountAttention)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      alive = false
      globalThis.clearInterval(interval)
      globalThis.removeEventListener('focus', refreshAccountAttention)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [accountApiCapabilities?.canReadOperationalSummary, authUser?.id, isAuthenticated, seasonId])

  const visibleDb = isLoading ? null : db
  const summary = getGlobalSummary(visibleDb)
  const seasonStatus = getSeasonStatus(visibleDb, season)
  const isArchivedHomeRoute = isKprHybridDesign && location.pathname === '/' && !isWeeklyHomeRoute && seasonStatus.isFinished
  const isSyncing = isLoading || isRefreshing
  const dataStatus = getPublicDataStatus(publicData, layoutLocale)
  const updatedAtText = formatUpdatedAt(summary.updatedAt, t('layout.meta.empty'))
  const reviewAvailable = seasonHasReview(season, db)
  const activeGroup = getNavActiveGroup(location.pathname, location.search)
  const activeNavItem = activeGroup === 'space' ? getPersonalNavItem(isAuthenticated) : PRIMARY_NAV.find(item => item.group === activeGroup) || PRIMARY_NAV[0]
  const activeNavLabel = getNavLabel(activeNavItem, layoutLocale)
  const activeNavIndex = Math.max(0, PRIMARY_NAV.findIndex(item => item.group === activeNavItem.group))
  const headerContextMode = isKprHybridDesign
    ? (activeGroup === 'overview' && location.pathname === '/' ? 'overview' : 'data')
    : undefined
  const activeSection = isKprHybridDesign
    ? {
        code: activeNavItem.en,
        label: activeNavLabel,
        number: String(activeNavIndex + 1).padStart(2, '0')
      }
    : null
  const accountAttention = useMemo(
    () => buildAccountAttention(accountAttentionContext, compatibleLayoutLocale),
    [accountAttentionContext, compatibleLayoutLocale]
  )
  const isMatchRoomRoute = /^\/matches\/[^/]+\/room\/?$/.test(location.pathname)
  const navigationSearch = getNavigationSearch(location.search, designPreview)
  const withSeason = useMemo(
    () => path => withAccountCompetition(buildSeasonLink(path, seasonId, navigationSearch), competition.navigationId, navigationSearch),
    [seasonId, navigationSearch, competition.navigationId]
  )
  const accountIdentity = useMemo(
    () => buildAccountIdentity({
      primaryIdentity: accountPrimaryIdentity,
      profile: accountProfile,
      requests: accountRequests,
      seasonId: canonicalSeasonId
    }),
    [accountPrimaryIdentity, accountProfile, accountRequests, canonicalSeasonId]
  )
  const accountCapabilities = useMemo(
    () => getAccountCapabilities(accountIdentity, accountIdentities),
    [accountIdentities, accountIdentity]
  )
  const accountIdentityTarget = useMemo(
    () => resolveAccountIdentityTarget(accountIdentity, db),
    [accountIdentity, db]
  )
  const accountPlayerIdentity = useMemo(
    () => findVerifiedAccountIdentity([accountPrimaryIdentity, ...accountIdentities], 'PLAYER', canonicalSeasonId),
    [accountIdentities, accountPrimaryIdentity, canonicalSeasonId]
  )
  const accountPlayerIdentityTarget = useMemo(
    () => resolveAccountIdentityTarget(accountPlayerIdentity, db),
    [accountPlayerIdentity, db]
  )

  const translatePublicText = useMemo(() => createPublicTextTranslator(db, authUser), [db, authUser])
  useLocaleDomTranslation(compatibleLayoutLocale, shellRef, translatePublicText)

  useEffect(() => {
    const pathnameChanged = previousPathRef.current !== location.pathname
    previousPathRef.current = location.pathname
    if (pathnameChanged && navigationType === 'PUSH' && !location.hash && getRestoreScrollY(location.state) === null) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [location.pathname, location.hash, location.state, navigationType])

  useEffect(() => {
    document.documentElement.lang = layoutLocale
    setStoredLocale(layoutLocale)
  }, [layoutLocale])

  useEffect(() => {
    document.title = isAccountSpaceRoute && !isAuthenticated
      ? buildFriesCupTitle(getNavLabel(getPersonalNavItem(false), layoutLocale), layoutLocale)
      : getLayoutDocumentTitle(location.pathname, location.search, layoutLocale)
  }, [layoutLocale, location.pathname, location.search, isAccountSpaceRoute, isAuthenticated])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.has('season')) return

    const requestedSeasonId = resolveSeasonFromUrl(params.get('season'))
    const resolvedSeasonId = requestedSeasonId || DEFAULT_SEASON_ID

    // Persist a valid URL selection even when it already matches the initial
    // render. Account email links intentionally omit the season, so the next
    // navigation must inherit the season the user was actually viewing.
    if (requestedSeasonId) setStoredSeasonId(requestedSeasonId)
    if (resolvedSeasonId === seasonId) return

    setSeasonId(resolvedSeasonId)

  }, [location.search, seasonId])

  const handleSeasonChange = eventOrSeasonId => {
    const rawSeasonId = eventOrSeasonId?.target ? eventOrSeasonId.target.value : eventOrSeasonId
    const nextSeasonId = getSeasonById(rawSeasonId).id
    if (nextSeasonId === seasonId) return
    setStoredSeasonId(nextSeasonId)
    setSeasonId(nextSeasonId)
    const nextPath = location.pathname.replace(/^(\/(?:matches|players|teams))\/[^/]+(?:\/(?:room|journey|analysis))?\/?$/, '$1')
    navigate(buildSeasonLink(nextPath, nextSeasonId, navigationSearch))
  }

  const handleLocaleChange = nextLocale => {
    if (isReviewEntryRoute) {
      const nextReviewLocale = normalizeReviewLocale(nextLocale, layoutLocale)
      const params = new URLSearchParams(location.search)
      params.set('lang', getReviewLocaleParam(nextReviewLocale))
      navigate({
        pathname: location.pathname,
        search: `?${params.toString()}`,
        hash: location.hash
      }, { replace: true })
      return
    }

    const params = new URLSearchParams(location.search)
    params.set('lang', getReviewLocaleParam(nextLocale))
    navigate({ pathname: location.pathname, search: `?${params}`, hash: location.hash }, { replace: true })
  }

  const outletContext = {
    publicSnapshotState: isLoading ? 'loading' : error ? 'error' : 'ready',
    isFdDesign,
    isKprDesign,
    isKprStageDesign,
    isKprImmersiveDesign,
    isKprHybridDesign,
    db,
    season,
    seasonId,
    canonicalSeasonId,
    locale: layoutLocale,
    t,
    updatedAtText,
    dataStatus,
    reviewAvailable,
    withSeason,
    navigationSearch,
    favorites: favoritesApi.favorites,
    toggleTeamFavorite: favoritesApi.toggleTeamFavorite,
    togglePlayerFavorite: favoritesApi.togglePlayerFavorite,
    setPrimaryTeamFavorite: favoritesApi.setPrimaryTeamFavorite,
    saveFavorites: favoritesApi.saveFavorites,
    isFavoriteTeam: favoritesApi.isFavoriteTeam,
    isPrimaryFavoriteTeam: favoritesApi.isPrimaryFavoriteTeam,
    isFavoritePlayer: favoritesApi.isFavoritePlayer,
    favoriteLimits: favoritesApi.favoriteLimits,
    favoritesSyncStatus: favoritesApi.syncStatus,
    favoritesSyncError: favoritesApi.syncError,
    accountIdentity,
    accountIdentities,
    setPrimaryIdentity,
    accountCapabilities,
    accountIdentityTarget,
    accountPlayerIdentity,
    accountPlayerIdentityTarget,
    accountProfile,
    accountRequests,
    accountIdentityError: accountDataError?.message || '',
    isAccountIdentityLoading: isAccountDataLoading,
    isAuthenticated,
    authUser
  }

  const eventContextDock = isKprHybridDesign && (headerContextMode === 'data' || isWeeklyHomeRoute) ? (
        <div className={styles.contentContextDock}>
          <EventContextBar
            season={season}
            seasonId={seasonId}
            locale={layoutLocale}
            seasons={SEASONS}
            updatedAtText={updatedAtText}
            seasonStatus={seasonStatus}
            activeSummary={summary}
            isSyncing={isSyncing}
            dataStatus={dataStatus}
            onSeasonChange={handleSeasonChange}
            activeSection={activeSection}
            contextMode={headerContextMode}
            placement="content"
            presentation={isCompactContextRoute ? 'directory' : 'default'}
            isPreview={Boolean(db?.meta?.preview)}
            onRetry={isCompactContextRoute && !isLoading && !error ? retry : undefined}
          />
        </div>
      ) : null

  return (
    <div
      className={styles.shell}
      style={!showDesignPreview ? { '--kpr-preview-height': '0px' } : undefined}
      ref={shellRef}
      data-design={isKprDesign ? 'kpr' : designPreview || undefined}
      data-design-edition={isKprHybridDesign ? 'hybrid' : isKprImmersiveDesign ? 'immersive' : isKprStageDesign ? 'stage' : undefined}
      data-fd-page={isFdDesign ? (isFdSamplePage ? 'sample' : 'legacy') : undefined}
      data-kpr-page={isKprDesign ? (isKprSamplePage ? 'sample' : 'legacy') : undefined}
      data-locale={layoutLocale}
      data-room-route={isMatchRoomRoute ? 'true' : 'false'}
      data-header-mode={headerContextMode}
      data-archive-home={isArchivedHomeRoute || undefined}
      data-compact-context={isCompactContextRoute || undefined}
      data-team-exhibition={isTeamExhibitionRoute || undefined}
      data-roster-directory={isRosterDirectoryRoute || undefined}
      data-schedule-directory={isScheduleDirectoryRoute || undefined}
      data-weekly-advance={isWeeklyAdvanceRoute || undefined}
      data-match-detail={isPublicMatchDetailRoute || undefined}
      data-player-rankings={isPlayerRankingsRoute || undefined}
      data-hero-data={isHeroDataRoute || undefined} data-map-data={isMapDataRoute || undefined}
    >
      {showDesignPreview && <DesignPreviewBar design={designPreview} locale={compatibleLayoutLocale} />}
      {!isMatchRoomRoute ? (
      <PublicHeader
        isKprHybridDesign={isKprHybridDesign} mobileMenuRef={mobileMenuRef}
        activeGroup={activeGroup} layoutLocale={layoutLocale} compatibleLayoutLocale={compatibleLayoutLocale}
        withSeason={withSeason} accountAttention={accountAttention} activeNavLabel={activeNavLabel}
        season={season} seasonId={seasonId} updatedAtText={updatedAtText} seasonStatus={seasonStatus}
        summary={summary} isSyncing={isSyncing} dataStatus={dataStatus}
        handleSeasonChange={handleSeasonChange} headerContextMode={headerContextMode}
        isReviewEntryRoute={isReviewEntryRoute} handleLocaleChange={handleLocaleChange} activeSection={activeSection}
      />
      ) : null}

      {isMatchRoomRoute ? <AuthButton dialogOnly locale={compatibleLayoutLocale} seasonId={seasonId} teams={db?.teams || []} /> : null}

      {!isTeamExhibitionRoute && !(isAuthenticated && /^\/me\/?$/.test(location.pathname) && new URLSearchParams(location.search).get('section') !== 'following') ? eventContextDock : null}

      <UrgentAnnouncementGate
        seasonId={seasonId}
        isAuthenticated={isAuthenticated}
        detailsUrl={withSeason('/me?section=communications')}
      />

      <div className={styles.pageFrame} data-roster-index={isRosterIndexRoute || undefined} data-roster-directory={isRosterDirectoryRoute || undefined} data-schedule-directory={isScheduleDirectoryRoute || undefined} data-match-detail={isPublicMatchDetailRoute || undefined} data-player-rankings={isPlayerRankingsRoute || undefined} data-hero-data={isHeroDataRoute || undefined} data-map-data={isMapDataRoute || undefined} data-data-section={isEditorialDataRoute || undefined} data-team-archive={isTeamArchiveRoute || undefined}>
        <main className={styles.main} aria-busy={isLoading && needsPublicSnapshot ? 'true' : 'false'}>
          {isLoading && needsPublicSnapshot ? (
            <div className={`${styles.systemBox} ${styles.syncBox}`} role="status" aria-live="polite">
              <span className={styles.syncKicker}>LIVE DATA SYNC</span>
              <div className={styles.syncMark} aria-hidden="true"><span /></div>
              <strong className={styles.syncTitle}>{t('layout.state.loading')}</strong>
              <p className={styles.syncDescription}>
                {t('layout.state.loadingDesc', uiText("正在核对最新发布版本、赛程、赛果与晋级状态，请稍候。", layoutLocale))}
              </p>
              <div
                className={styles.syncProgress}
                role="progressbar"
                aria-label={t('layout.state.loadingProgress', uiText("赛事数据同步进度", layoutLocale))}
              >
                <span />
              </div>
              <small>{layoutLocale === 'zh-CN' ? uiText(season?.name?.zh, layoutLocale) : season?.name?.en}</small>
            </div>
          ) : error && needsPublicSnapshot ? (
            <div className={`${styles.systemBox} ${styles.errorBox}`}>
              <div className={styles.errorTitle}>{t('layout.state.error')}</div>
              <div className={styles.errorText}>
                {error === 'DATA_LOAD_FAILED'
                  ? t('layout.state.errorDesc', uiText("赛事数据暂时无法载入，请稍后刷新重试。", layoutLocale))
                  : error}
              </div>
              <button type="button" className={styles.dataRetry} onClick={retry}>{dataStatus.retryLabel}</button>
            </div>
          ) : (
            <FavoritesProvider value={outletContext}>
              <>
                {dataStatus.notice && needsPublicSnapshot && !isCompactContextRoute ? (
                  <div className={`${styles.dataNotice} ${isKprHybridDesign || isEditorialDataRoute ? styles.dataNoticeCompact : ''}`} data-source={dataStatus.key} role="status" data-i18n-ignore>
                    <div><strong>{dataStatus.label}</strong><p>{dataStatus.notice}</p></div>
                    <button type="button" className={styles.dataRetry} onClick={retry} disabled={isRefreshing}>
                      {isRefreshing ? dataStatus.refreshingLabel : dataStatus.retryLabel}
                    </button>
                  </div>
                ) : null}
                <Outlet context={outletContext} />
                {isTeamExhibitionRoute ? eventContextDock : null}
                {isKprHybridDesign && headerContextMode === 'overview' && !isWeeklyHomeRoute && !isArchivedHomeRoute ? (
                  <div className={styles.dataStamp} data-i18n-ignore>
                    <span>{dataStatus.label}</span><time>{updatedAtText}</time>
                  </div>
                ) : null}
              </>
            </FavoritesProvider>
          )}
        </main>
      </div>
    </div>
  )
}

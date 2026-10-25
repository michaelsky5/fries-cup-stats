import { pickUiLocale, translateUiText as uiText } from '../lib/uiText.js'
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SEASONS,
  getInitialSeasonId,
  getSeasonById,
  resolveSeasonFromSearch,
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
import { startVisiblePolling } from '../lib/visiblePolling.js'
import { getPublicDataStatus } from '../lib/publicDataStatus.js'
import { formatUpdatedAt } from '../lib/format.js'
import { getGlobalSummary, getSeasonStatus } from '../lib/seasonSummary.js'
import { isWeeklyOverview } from '../features/weekly-overview/weeklyOverviewModel.js'
import { isChineseLocale, weeklyMatchContextLabel } from '../features/weekly-overview/weeklyPresentation.js'
import { getMatchPairingLabel } from '../lib/matchPairingLabel.js'
import { buildFriesCupTitle, getDataCenterPageLabel } from '../lib/pageTitle.js'
import { getRestoreScrollY, restoreWindowScroll } from '../lib/navigationState.js'
import { FavoritesProvider, normalizeSeasonId, useFavorites } from '../features/favorites/index.js'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import { buildAccountIdentity, findVerifiedAccountIdentity, getAccountCapabilities, resolveAccountIdentityTarget } from '../features/auth/accountIdentity.js'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import PartnerTrialNotice from '../components/layout/PartnerTrialNotice.jsx'
import { getDossierView } from '../features/team-dossier/teamDossierScenes.js'
import { PRIMARY_NAV, getNavLabel, getPersonalNavItem, getNavigationSearch, getWeeklyNavigationPath } from '../components/layout/publicNavigation.js'
import OverviewSectionNav, { overviewSectionId } from '../components/navigation/OverviewSectionNav.jsx'
import EventContextBar from '../components/layout/EventContextBar.jsx'
import UrgentAnnouncementGate from '../features/communications/UrgentAnnouncementGate.jsx'
import { fetchAccountAttentionContext } from '../features/my-space/accountAttentionApi.js'
import { isCompetitionMatchesEntry, requiresPublicSnapshot } from '../features/my-space/personalSpacePolicy.js'
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

function getLayoutDocumentTitle(pathname, search, locale, db) {
  if (/^\/reports(?:\/|$)/.test(pathname)) return buildFriesCupTitle(locale === 'en-US' ? 'Fries Cup Weekly' : '薯条周报', locale)
  // 票 2.44: a match tab reads 「BBB vs SPS · 第一赛段 · 季后赛 · 决赛」 once the season data is in.
  const matchPath = /^\/matches\/([^/]+)$/.exec(pathname)
  const pairing = matchPath && db ? getMatchPairingLabel(db, decodeURIComponent(matchPath[1])) : null
  if (pairing) return buildFriesCupTitle([pairing.pairing, weeklyMatchContextLabel(pairing.match, locale)].filter(Boolean).join(' · '), locale)
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

  if (pathname === '/' || pathname.startsWith('/reports')) return 'overview'
  if (pathname.startsWith('/me') || pathname.startsWith('/following')) return 'space'
  if (pathname.startsWith('/matches') || pathname.startsWith('/schedule')) return isFollowingView ? 'space' : 'matches'
  if (pathname.startsWith('/advance') || pathname.startsWith('/standings')) return 'advance'
  if (pathname.startsWith('/teams') || pathname.startsWith('/players') || pathname.startsWith('/staff') || pathname.startsWith('/roster')) return 'roster'
  if (pathname.startsWith('/leaderboard') || pathname.startsWith('/heroes') || pathname.startsWith('/maps')) return 'database'
  if (/^\/(?:play|guides\/weekly-room)\/?$/.test(pathname)) return 'play'
  return ''
}

const SKELETON_ROWS = [0, 1, 2, 3, 4]

export default function DataLayout() {
  const shellRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const location = useLocation()
  const isReviewEntryRoute = /^\/review\/?$/.test(location.pathname)
  const [fallbackSeasonId, setFallbackSeasonId] = useState(() => getInitialSeasonId())
  const seasonId = useMemo(
    () => resolveSeasonFromSearch(location.search, fallbackSeasonId),
    [fallbackSeasonId, location.search]
  )
  const season = useMemo(() => getSeasonById(seasonId), [seasonId])
  const locale = getStoredLocale()
  const publicData = usePublicSeasonData(seasonId, { reviewArchive: isReviewEntryRoute && season.reviewEnabled })
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
  const isPlayerArchiveRoute = isKprHybridDesign && /^\/players\/[^/]+(?:\/(?:analysis|journey))?\/?$/.test(location.pathname)
  const isPlayRoute = isKprHybridDesign && /^\/play\/?$/.test(location.pathname)
  // 票 2.26: every hybrid page uses the one-line directory status line.
  const isUnifiedContextRoute = isKprHybridDesign && /^\/(?:support|guides\/weekly-room)\/?$/.test(location.pathname)
  const isKprSamplePage = /^(?:\/|\/leaderboard\/?)$/.test(location.pathname) ||
    (isKprHybridDesign && /^\/(?:matches|advance)(?:\/)?$/.test(location.pathname))
  const isFdSamplePage = /^(?:\/leaderboard|\/teams\/[^/]+)\/?$/.test(location.pathname)
  // Pages whose frame spans the window and carry their own side gutters.
  const isFullBleedFrame = location.pathname === '/' || isTeamArchiveRoute || isPlayerArchiveRoute
  const {
    accountDataError,
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
  const isMatchEntry = isCompetitionMatchesEntry(location)
  const needsPublicSnapshot = requiresPublicSnapshot({
    pathname: location.pathname,
    search: location.search,
    section: new URLSearchParams(location.search).get('section'),
    isAuthenticated
  })
  const isWeeklyAdvanceRoute = isKprHybridDesign && /^\/advance\/?$/.test(location.pathname) && isWeeklyOverview(db, season)
  const isWeeklyHomeRoute = isKprHybridDesign && location.pathname === '/' && isWeeklyOverview(db, season)
  const isAdvanceIndexRoute = isKprHybridDesign && /^\/advance\/?$/.test(location.pathname)
  const isPublicFollowingRoute = isAccountSpaceRoute && ((!isAuthenticated && !isMatchEntry) || location.pathname.startsWith('/following') || new URLSearchParams(location.search).get('section') === 'following')
  const isCompactContextRoute = /^\/reports(?:\/|$)/.test(location.pathname) || /^\/staff\/[^/]+\/?$/.test(location.pathname) || isRosterDirectoryRoute || isScheduleDirectoryRoute || isPublicMatchDetailRoute || isPlayerRankingsRoute || isHeroDataRoute || isMapDataRoute || isAdvanceIndexRoute || isWeeklyHomeRoute || isPublicFollowingRoute || isPlayerArchiveRoute || isPlayRoute || isUnifiedContextRoute || (isTeamArchiveRoute && !isTeamExhibitionRoute)
  const competition = useAccountCompetition(season.id)
  const attentionSeasonId = competition.id
  const attentionEnabled = isAuthenticated && !competition.loading && !competition.error && !competition.issue
  const attentionScope = `${authUser?.id || ''}:${attentionSeasonId}`
  const canonicalSeasonId = normalizeSeasonId(season?.publicCode || seasonId)
  const favoritesApi = useFavorites(canonicalSeasonId, db)

  useEffect(() => {
    let alive = true

    if (!attentionEnabled || !attentionSeasonId) {
      setAccountAttentionContext(null)
      return () => { alive = false }
    }

    setAccountAttentionContext({ scope: attentionScope, overview: { taskSyncStatus: 'loading' } })

    const refreshAccountAttention = async ({ signal }) => {
      let context
      try { context = await fetchAccountAttentionContext(attentionSeasonId, authUser?.id, { signal }) }
      catch (error) {
        if (alive) setAccountAttentionContext({ scope: attentionScope, overview: { taskSyncStatus: 'error' } })
        throw error
      }
      if (alive) setAccountAttentionContext(context ? { ...context, scope: attentionScope } : null)
      // Keep partial counts visible while respecting failed sources' backoff.
      if (context?.refreshError) throw context.refreshError
    }

    const polling = startVisiblePolling(refreshAccountAttention, { intervalMs: ACCOUNT_ATTENTION_REFRESH_INTERVAL_MS })
    const activityChanged = () => polling.refresh({ changed: true })
    globalThis.addEventListener('fc:account-activity-changed', activityChanged)

    return () => {
      alive = false
      polling.stop()
      globalThis.removeEventListener('fc:account-activity-changed', activityChanged)
    }
  }, [authUser?.id, attentionEnabled, attentionSeasonId, attentionScope])

  const visibleDb = isLoading ? null : db
  const summary = getGlobalSummary(visibleDb)
  const seasonStatus = getSeasonStatus(visibleDb, season)
  const isArchivedHomeRoute = isKprHybridDesign && location.pathname === '/' && !isWeeklyHomeRoute && seasonStatus.isFinished
  const isSyncing = isLoading || isRefreshing
  const dataStatus = getPublicDataStatus(publicData, layoutLocale)
  const updatedAtText = formatUpdatedAt(summary.updatedAt, t('layout.meta.empty'))
  const reviewAvailable = seasonHasReview(season, db)
  const activeGroup = getNavActiveGroup(location.pathname, location.search)
  const activeNavItem = activeGroup === 'space' ? getPersonalNavItem(isAuthenticated || isMatchEntry) : PRIMARY_NAV.find(item => item.group === activeGroup) || PRIMARY_NAV[0]
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
  const navigationSearch = getNavigationSearch(location.search, designPreview, layoutLocale)
  const withSeason = useMemo(
    () => path => withAccountCompetition(buildSeasonLink(path, seasonId, navigationSearch), competition.navigationId, navigationSearch),
    [seasonId, navigationSearch, competition.navigationId]
  )
  // 票 2.45: same rule as the phase card — open while enabled and before any deadline; the deadline
  // is compared with the time the account data was last read, not during render.
  const seasonRegistrationRules = db?.season?.rules?.registration
  const registrationNextAction = useMemo(() => seasonRegistrationRules?.enabled === true
    ? { closesAt: seasonRegistrationRules.closesAt || null, path: withSeason(`/participate/${encodeURIComponent(seasonId)}`) }
    : null, [seasonRegistrationRules, seasonId, withSeason])
  const accountAttention = useMemo(
    () => buildAccountAttention(attentionEnabled && accountAttentionContext?.scope === attentionScope ? accountAttentionContext : null, compatibleLayoutLocale, { registration: registrationNextAction }),
    [accountAttentionContext, compatibleLayoutLocale, attentionEnabled, attentionScope, registrationNextAction]
  )
  const overviewSection = isKprHybridDesign && !season?.partnerTrial ? overviewSectionId(location.pathname) : null
  const overviewNavPath = path => withSeason(getWeeklyNavigationPath(path, location.search, season?.rules?.weeklyCompetition?.enabled || season?.competitionFormat === 'WEEKLY'))
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
    if (location.state?.mobileTabRestore && !isLoading) restoreWindowScroll(getRestoreScrollY(location.state))
  }, [location.key, location.state, isLoading])

  useEffect(() => {
    document.documentElement.lang = layoutLocale
    setStoredLocale(layoutLocale)
  }, [layoutLocale])

  useEffect(() => {
    document.title = isAccountSpaceRoute && !isAuthenticated && !isMatchEntry
      ? buildFriesCupTitle(getNavLabel(getPersonalNavItem(false), layoutLocale), layoutLocale)
      : getLayoutDocumentTitle(location.pathname, location.search, layoutLocale, db)
  }, [layoutLocale, location.pathname, location.search, isAccountSpaceRoute, isAuthenticated, isMatchEntry, db])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedSeasonId = resolveSeasonFromUrl(params.get('season'))
    if (!requestedSeasonId) return

    // Persist a valid URL selection even when it already matches the initial
    // render. Account email links intentionally omit the season, so the next
    // navigation must inherit the season the user was actually viewing.
    setStoredSeasonId(requestedSeasonId)
    setFallbackSeasonId(currentSeasonId => (
      currentSeasonId === requestedSeasonId ? currentSeasonId : requestedSeasonId
    ))
  }, [location.search])

  const handleSeasonChange = eventOrSeasonId => {
    const rawSeasonId = eventOrSeasonId?.target ? eventOrSeasonId.target.value : eventOrSeasonId
    const nextSeasonId = getSeasonById(rawSeasonId).id
    if (nextSeasonId === seasonId) return
    setStoredSeasonId(nextSeasonId)
    setFallbackSeasonId(nextSeasonId)
    const nextPath = location.pathname.replace(/^(\/(?:matches|players|teams|staff))\/[^/]+(?:\/(?:room|journey|analysis))?\/?$/, '$1')
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
    authUser,
    accountNextAction: accountAttention.nextAction
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
            nextAction={isPlayRoute ? null : accountAttention.nextAction}
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
      <PublicHeader
        isKprHybridDesign={isKprHybridDesign} mobileMenuRef={mobileMenuRef}
        activeGroup={activeGroup} layoutLocale={layoutLocale} compatibleLayoutLocale={compatibleLayoutLocale}
        withSeason={withSeason} accountAttention={accountAttention} activeNavLabel={activeNavLabel}
        season={season} seasonId={seasonId} updatedAtText={updatedAtText} seasonStatus={seasonStatus}
        summary={summary} isSyncing={isSyncing} dataStatus={dataStatus}
        handleSeasonChange={handleSeasonChange} headerContextMode={headerContextMode}
        isReviewEntryRoute={isReviewEntryRoute} handleLocaleChange={handleLocaleChange} activeSection={activeSection}
      />

      {!isTeamExhibitionRoute && !isMatchEntry && !(isAuthenticated && /^\/me\/?$/.test(location.pathname) && new URLSearchParams(location.search).get('section') !== 'following') ? eventContextDock : null}

      <UrgentAnnouncementGate
        seasonId={seasonId}
        key={`${authUser?.id || ''}:${seasonId}`}
        isAuthenticated={isAuthenticated}
        detailsUrl={withSeason('/me?section=communications')}
      />

      <div className={styles.pageFrame} data-roster-index={isRosterIndexRoute || undefined} data-roster-directory={isRosterDirectoryRoute || undefined} data-schedule-directory={isScheduleDirectoryRoute || undefined} data-match-detail={isPublicMatchDetailRoute || undefined} data-player-rankings={isPlayerRankingsRoute || undefined} data-hero-data={isHeroDataRoute || undefined} data-map-data={isMapDataRoute || undefined} data-data-section={isEditorialDataRoute || undefined} data-team-archive={isTeamArchiveRoute || undefined}>
        <main className={styles.main} aria-busy={isLoading && needsPublicSnapshot ? 'true' : 'false'}>
          <PartnerTrialNotice season={season} locale={layoutLocale} />
          {isLoading && needsPublicSnapshot && isKprHybridDesign ? (
            // 票 2.17: the header and status bar are already drawn; a page-shaped placeholder holds the
            // content area until the snapshot arrives. The full-page box below is left to the preview designs.
            <div className={styles.pageSkeleton} data-page-skeleton data-bleed={isFullBleedFrame || undefined} role="status" aria-live="polite">
              <span className={styles.skeletonLabel}>{t('layout.state.loading')}</span>
              <div className={styles.skeletonCard} aria-hidden="true"><i /><i /><i /><span><i /><i /></span></div>
              <ul className={styles.skeletonRows} aria-hidden="true">{SKELETON_ROWS.map(row => <li key={row}><i /><i /></li>)}</ul>
            </div>
          ) : isLoading && needsPublicSnapshot ? (
            <div className={`${styles.systemBox} ${styles.syncBox}`} role="status" aria-live="polite">
              <span className={styles.syncKicker}>{pickUiLocale(layoutLocale, '赛事数据同步', 'LIVE DATA SYNC', 'LIVE DATA SYNC', '賽事數據同步')}</span>
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
                {overviewSection ? <OverviewSectionNav active={overviewSection} locale={layoutLocale} navPath={overviewNavPath} inset={overviewSection !== 'overview'} /> : null}
                <Outlet context={outletContext} />
                {isTeamExhibitionRoute ? eventContextDock : null}
                {isKprHybridDesign && headerContextMode === 'overview' && !isWeeklyHomeRoute && !isArchivedHomeRoute ? (
                  <div className={styles.dataStamp} data-i18n-ignore>
                    <span>{dataStatus.label}</span><time>{updatedAtText}</time>
                  </div>
                ) : null}
                {/* 票 2.13: Chinese pages drop the UTC+8 after each time and say it once here. */}
                {isKprHybridDesign && needsPublicSnapshot && isChineseLocale(layoutLocale) ? (
                  <p className={`${styles.timeNote} ${/^\/?$/.test(location.pathname) ? styles.timeNoteGutter : ''}`} data-time-zone-note data-i18n-ignore>{pickUiLocale(layoutLocale, '时间均为北京时间（UTC+8）', '', '', '時間均為北京時間（UTC+8）')}</p>
                ) : null}
              </>
            </FavoritesProvider>
          )}
        </main>
      </div>
    </div>
  )
}

import { Navigate, Outlet, createBrowserRouter, redirect, useLocation } from 'react-router-dom'
import RouteErrorPage from '../pages/errors/RouteErrorPage.jsx'
import { getStoredLocale } from '../lib/i18n.js'
import { normalizeLocale } from '../lib/locales.js'
import { ensureUiLocale, ensureTraditionalReview } from '../lib/localeCatalog.js'

export function RouteFallback() {
  const location = useLocation()
  const language = normalizeLocale(new URLSearchParams(location.search).get('lang') || getStoredLocale())
  const isScoutingRoute = location.pathname.startsWith('/scouting/')
  const loadingLabel = isScoutingRoute
    ? language.startsWith('en')
      ? 'Loading technical analysis report…'
      : language.startsWith('ko')
        ? '기술 분석 보고서를 불러오는 중…'
        : language === 'zh-TW' ? '正在載入技術分析報告…' : '正在载入技术分析报告…'
    : language.startsWith('en') ? 'Loading page…' : language.startsWith('ko') ? '페이지를 불러오는 중…' : language === 'zh-TW' ? '正在載入頁面…' : '正在载入页面…'

  return (
    <div className="sys-booting" role="status" aria-live="polite" aria-busy="true">
      <span>{isScoutingRoute ? 'FRIES CUP · PERFORMANCE INTELLIGENCE' : 'FRIES CUP EVENT CENTER'}</span>
      <strong>{loadingLabel}</strong>
      <i className="sys-booting__track" aria-hidden="true"><em /></i>
    </div>
  )
}

function lazyDefault(importer) {
  return async () => ({ Component: (await importer()).default })
}

function lazyNamed(importer, exportName) {
  return async () => ({ Component: (await importer())[exportName] })
}

function lazyReviewStory(storyType) {
  return async () => {
    const { default: ReviewStoryPage } = await import('../pages/review/ReviewStoryPage.jsx')
    return {
      Component: function ReviewStoryRoute() {
        return <ReviewStoryPage storyType={storyType} />
      }
    }
  }
}

function ScheduleRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('view', 'list')
  if (!params.has('tab')) params.set('tab', 'all')
  return <Navigate to={{ pathname: '/matches', search: `?${params.toString()}` }} replace />
}

function FollowingRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('section', 'following')
  return <Navigate to={{ pathname: '/me', search: `?${params.toString()}` }} replace />
}

const developmentRoutes = import.meta.env.DEV ? [
  {
    path: '/dev/account-review',
    HydrateFallback: RouteFallback,
    lazy: lazyDefault(() => import('../pages/dev/AccountReviewPage.jsx'))
  },
  ...[
    '/scouting/season-preview/:seasonId',
    '/scouting/season-preview/:seasonId/positions/:positionSlug',
    '/scouting/season-preview/:seasonId/players/:playerId'
  ].map(path => ({
    path,
    HydrateFallback: RouteFallback,
    lazy: lazyDefault(() => import('../pages/scouting/season-report/GeneratedSeasonReportRoute.jsx'))
  })),
  ...[
    '/scouting/qgcs4-preview',
    '/scouting/qgcs4-preview/positions/:positionSlug',
    '/scouting/qgcs4-preview/players/:playerId'
  ].map(path => ({
    path,
    HydrateFallback: RouteFallback,
    lazy: lazyDefault(() => import('../pages/scouting/qgcs4/Qgcs4PreviewPage.jsx'))
  })),
  {
    path: '/dev/account-preview',
    HydrateFallback: RouteFallback,
    lazy: async () => ({ Component: (await import('../pages/dev/AccountDesignPreviewPage.jsx')).default })
  },
  {
    path: '/dev/weekly-room-preview',
    HydrateFallback: RouteFallback,
    lazy: async () => ({ Component: (await import('../pages/dev/WeeklyRoomDesignPreview.jsx')).default })
  },
  {
    path: '/dev/review-poster-qa',
    HydrateFallback: RouteFallback,
    lazy: async () => ({ Component: (await import('../pages/dev/ReviewPosterQaPage.jsx')).default })
  }
] : []

const router = createBrowserRouter([
  { element: <Outlet />, errorElement: <RouteErrorPage />, HydrateFallback: RouteFallback,
    // A sibling navigation can reuse this root without rerunning its loader.
    // Review copy needs its converter even when the language query stays the same.
    shouldRevalidate: ({ currentUrl, nextUrl, defaultShouldRevalidate }) =>
      defaultShouldRevalidate || currentUrl.pathname !== nextUrl.pathname,
    loader: async ({ request }) => {
      const url = new URL(request.url)
      const locale = normalizeLocale(url.searchParams.get('lang') || getStoredLocale())
      await Promise.all([
        ensureUiLocale(locale),
        locale === 'zh-TW' && /(?:^\/review(?:\/|$)|^\/dev\/review-poster-qa)/.test(url.pathname) ? ensureTraditionalReview() : null
      ])
      return null
    }, children: [
  ...developmentRoutes,
  { path: '/guides/weekly-room', HydrateFallback: RouteFallback, lazy: lazyDefault(() => import('../features/room-guide/WeeklyRoomGuidePage.jsx')) },
  { path: '/guides/weekly-room/simulate', HydrateFallback: RouteFallback, lazy: lazyDefault(() => import('../features/room-guide/RoomPracticePage.jsx')) },
  { path: '/account', HydrateFallback: RouteFallback, lazy: lazyDefault(() => import('../pages/account/AccountSettingsPage.jsx')) },
  // Retired room bookmarks resolve to public details; no legacy room component or API.
  { path: '/matches/:matchId/room', loader: ({ params, request }) => redirect(`/matches/${encodeURIComponent(params.matchId)}${new URL(request.url).search}`) },
  { path: '/me/matches/:matchId/room', HydrateFallback: RouteFallback, lazy: lazyDefault(() => import('../features/weekly-competition/WeeklyLiveRoomPage.jsx')) },
  { path: '/participate/:seasonId', HydrateFallback: RouteFallback, lazy: lazyDefault(() => import('../features/event-registration/SeasonParticipationPage.jsx')) },
  { path: '/activate-weekly', HydrateFallback: RouteFallback, lazy: lazyDefault(() => import('../pages/auth/WeeklyAccountActivationPage.jsx')) },
  {
    path: '/',
    HydrateFallback: RouteFallback,
    lazy: lazyDefault(() => import('../layouts/DataLayout.jsx')),
    children: [
      { index: true, lazy: lazyDefault(() => import('../pages/home/HomePage.jsx')) },

      { path: 'schedule', element: <ScheduleRedirect /> },
      { path: 'matches', lazy: lazyDefault(() => import('../pages/matches/MatchesPage.jsx')) },
      { path: 'me', lazy: lazyDefault(() => import('../pages/me/MySpacePage.jsx')) },
      { path: 'following', element: <FollowingRedirect /> },
      { path: 'matches/:matchId', lazy: lazyDefault(() => import('../pages/matches/MatchDetailPage.jsx')) },
      { path: 'leaderboard', lazy: lazyDefault(() => import('../pages/leaderboard/LeaderboardPage.jsx')) },
      { path: 'players', lazy: lazyDefault(() => import('../pages/players/PlayersPage.jsx')) },
      { path: 'players/:playerId', lazy: lazyDefault(() => import('../pages/players/PlayerDetailPage.jsx')) },
      { path: 'players/:playerId/journey', lazy: lazyDefault(() => import('../pages/players/PlayerDetailPage.jsx')) },
      { path: 'players/:playerId/analysis', lazy: lazyDefault(() => import('../pages/players/PlayerDetailPage.jsx')) },
      { path: 'teams', lazy: lazyDefault(() => import('../pages/teams/TeamsPage.jsx')) },
      { path: 'teams/:teamId', lazy: lazyDefault(() => import('../pages/teams/TeamDetailPage.jsx')) },
      { path: 'teams/:teamId/journey', lazy: lazyDefault(() => import('../pages/teams/TeamDetailPage.jsx')) },
      { path: 'teams/:teamId/analysis', lazy: lazyDefault(() => import('../pages/teams/TeamDetailPage.jsx')) },
      { path: 'staff', lazy: lazyDefault(() => import('../pages/staff/StaffPage.jsx')) },
      { path: 'staff/:staffId', lazy: lazyDefault(() => import('../pages/staff/StaffDetailPage.jsx')) },
      { path: 'roster', lazy: lazyDefault(() => import('../pages/roster/RosterHubPage.jsx')) },
      { path: 'heroes', lazy: lazyDefault(() => import('../pages/heroes/HeroesPage.jsx')) },
      { path: 'advance', lazy: lazyDefault(() => import('../pages/advance/AdvancePage.jsx')) },
      { path: 'standings', lazy: lazyDefault(() => import('../pages/standings/StandingsPage.jsx')) },
      { path: 'maps', lazy: lazyDefault(() => import('../pages/stats/MapStatsPage.jsx')) },
      { path: 'maps/:mapName', lazy: lazyDefault(() => import('../pages/stats/MapDetailPage.jsx')) },

      { path: 'review', lazy: lazyDefault(() => import('../pages/review/ReviewEntryPage.jsx')) },

      { path: 'fantasy', lazy: lazyDefault(() => import('../EsportsManagerClassic/pages/FantasyPage.jsx')) },
      { path: 'fantasy-classic', lazy: lazyDefault(() => import('../EsportsManagerClassic/pages/FantasyPage.jsx')) },
      { path: 'fantasy/battle', lazy: lazyDefault(() => import('../EsportsManagerClassic/pages/FantasyBattle.jsx')) },
      { path: 'shop', lazy: lazyDefault(() => import('../EsportsManagerClassic/pages/ShopPage.jsx')) },
      { path: 'champion', lazy: lazyDefault(() => import('../EsportsManagerClassic/pages/ChampionPage.jsx')) },
      { path: 'career', lazy: lazyDefault(() => import('../EsportsManagerClassic/pages/CareerPage.jsx')) }
    ]
  },

  { path: '/review/story/tournament', HydrateFallback: RouteFallback, lazy: lazyReviewStory('tournament') },
  { path: '/review/story/person/:identityKey', HydrateFallback: RouteFallback, lazy: lazyReviewStory('person') },
  { path: '/review/story/player/:playerId', HydrateFallback: RouteFallback, lazy: lazyReviewStory('player') },
  { path: '/review/story/team/:teamId', HydrateFallback: RouteFallback, lazy: lazyReviewStory('team') },
  { path: '/review/story/staff/:staffType/:staffKey', HydrateFallback: RouteFallback, lazy: lazyReviewStory('staff') },
  { path: '/scouting/:shareKey', HydrateFallback: RouteFallback, lazy: lazyDefault(() => import('../pages/scouting/ScoutingReportRoute.jsx')) },
  { path: '/scouting/:shareKey/players/:playerId', HydrateFallback: RouteFallback, lazy: lazyNamed(() => import('../pages/scouting/ScoutingReportRoute.jsx'), 'ScoutingPlayerRoute') },
  { path: '*', element: <RouteErrorPage notFound /> }
  ] }
])

export default router

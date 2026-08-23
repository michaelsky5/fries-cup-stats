import { lazy, Suspense } from 'react'
import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom'
import DataLayout from '../layouts/DataLayout.jsx'
import HomePage from '../pages/home/HomePage.jsx'

const MatchesPage = lazy(() => import('../pages/matches/MatchesPage.jsx'))
const MatchDetailPage = lazy(() => import('../pages/matches/MatchDetailPage.jsx'))
const LeaderboardPage = lazy(() => import('../pages/leaderboard/LeaderboardPage.jsx'))
const PlayersPage = lazy(() => import('../pages/players/PlayersPage.jsx'))
const PlayerDetailPage = lazy(() => import('../pages/players/PlayerDetailPage.jsx'))
const TeamsPage = lazy(() => import('../pages/teams/TeamsPage.jsx'))
const TeamDetailPage = lazy(() => import('../pages/teams/TeamDetailPage.jsx'))
const StaffPage = lazy(() => import('../pages/staff/StaffPage.jsx'))
const FollowingPage = lazy(() => import('../pages/following/FollowingPage.jsx'))
const HeroesPage = lazy(() => import('../pages/heroes/HeroesPage.jsx'))
const StandingsPage = lazy(() => import('../pages/standings/StandingsPage.jsx'))
const AdvancePage = lazy(() => import('../pages/advance/AdvancePage.jsx'))
const MapStatsPage = lazy(() => import('../pages/stats/MapStatsPage.jsx'))
const MapDetailPage = lazy(() => import('../pages/stats/MapDetailPage.jsx'))

const ClassicFantasyPage = lazy(() => import('../EsportsManagerClassic/pages/FantasyPage.jsx'))
const ClassicFantasyBattle = lazy(() => import('../EsportsManagerClassic/pages/FantasyBattle.jsx'))
const ClassicShopPage = lazy(() => import('../EsportsManagerClassic/pages/ShopPage.jsx'))
const ClassicChampionPage = lazy(() => import('../EsportsManagerClassic/pages/ChampionPage.jsx'))
const ClassicCareerPage = lazy(() => import('../EsportsManagerClassic/pages/CareerPage.jsx'))

const ReviewEntryPage = lazy(() => import('../pages/review/ReviewEntryPage.jsx'))
const ReviewStoryPage = lazy(() => import('../pages/review/ReviewStoryPage.jsx'))

function lazyPage(Component, props = {}) {
  return (
    <Suspense fallback={<div role="status" aria-live="polite">页面载入中…</div>}>
      <Component {...props} />
    </Suspense>
  )
}

function RosterRedirect() {
  const location = useLocation()
  return <Navigate to={{ pathname: '/teams', search: location.search }} replace />
}

function ScheduleRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('view', 'list')
  if (!params.has('tab')) params.set('tab', 'all')
  return <Navigate to={{ pathname: '/matches', search: `?${params.toString()}` }} replace />
}

function FantasyNextDisabledRedirect() {
  const location = useLocation()
  return <Navigate to={{ pathname: '/fantasy', search: location.search }} replace />
}

const router = createBrowserRouter([
  { path: '/fantasy-next', element: <FantasyNextDisabledRedirect /> },
  {
    path: '/',
    element: <DataLayout />,
    children: [
      { index: true, element: <HomePage /> },

      { path: 'schedule', element: <ScheduleRedirect /> },
      { path: 'matches', element: lazyPage(MatchesPage) },
      { path: 'following', element: lazyPage(FollowingPage) },
      { path: 'matches/:matchId', element: lazyPage(MatchDetailPage) },
      { path: 'leaderboard', element: lazyPage(LeaderboardPage) },
      { path: 'players', element: lazyPage(PlayersPage) },
      { path: 'players/:playerId', element: lazyPage(PlayerDetailPage) },
      { path: 'teams', element: lazyPage(TeamsPage) },
      { path: 'teams/:teamId', element: lazyPage(TeamDetailPage) },
      { path: 'staff', element: lazyPage(StaffPage) },
      { path: 'roster', element: <RosterRedirect /> },
      { path: 'heroes', element: lazyPage(HeroesPage) },
      { path: 'advance', element: lazyPage(AdvancePage) },
      { path: 'standings', element: lazyPage(StandingsPage) },
      { path: 'maps', element: lazyPage(MapStatsPage) },
      { path: 'maps/:mapName', element: lazyPage(MapDetailPage) },

      { path: 'review', element: lazyPage(ReviewEntryPage) },

      { path: 'fantasy', element: lazyPage(ClassicFantasyPage) },
      { path: 'fantasy-classic', element: lazyPage(ClassicFantasyPage) },
      { path: 'fantasy/battle', element: lazyPage(ClassicFantasyBattle) },
      { path: 'shop', element: lazyPage(ClassicShopPage) },
      { path: 'champion', element: lazyPage(ClassicChampionPage) },
      { path: 'career', element: lazyPage(ClassicCareerPage) }
    ]
  },

  { path: '/review/story/tournament', element: lazyPage(ReviewStoryPage, { storyType: 'tournament' }) },
  { path: '/review/story/player/:playerId', element: lazyPage(ReviewStoryPage, { storyType: 'player' }) },
  { path: '/review/story/team/:teamId', element: lazyPage(ReviewStoryPage, { storyType: 'team' }) },
  { path: '/review/story/staff/:staffType/:staffKey', element: lazyPage(ReviewStoryPage, { storyType: 'staff' }) }
])

export default router

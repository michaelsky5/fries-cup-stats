import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom'
import DataLayout from '../layouts/DataLayout.jsx'
import MatchesPage from '../pages/matches/MatchesPage.jsx'
import MatchDetailPage from '../pages/matches/MatchDetailPage.jsx'
import LeaderboardPage from '../pages/leaderboard/LeaderboardPage.jsx'
import PlayersPage from '../pages/players/PlayersPage.jsx'
import PlayerDetailPage from '../pages/players/PlayerDetailPage.jsx'
import TeamsPage from '../pages/teams/TeamsPage.jsx'
import TeamDetailPage from '../pages/teams/TeamDetailPage.jsx'
import StaffPage from '../pages/staff/StaffPage.jsx'
import HomePage from '../pages/home/HomePage.jsx'
import FollowingPage from '../pages/following/FollowingPage.jsx'
import HeroesPage from '../pages/heroes/HeroesPage.jsx'
import StandingsPage from '../pages/standings/StandingsPage.jsx'
import AdvancePage from '../pages/advance/AdvancePage.jsx'
import MapStatsPage from '../pages/stats/MapStatsPage.jsx'
import MapDetailPage from '../pages/stats/MapDetailPage.jsx'

import ClassicFantasyPage from '../EsportsManagerClassic/pages/FantasyPage.jsx'
import ClassicFantasyBattle from '../EsportsManagerClassic/pages/FantasyBattle.jsx'
import ClassicShopPage from '../EsportsManagerClassic/pages/ShopPage.jsx'
import ClassicChampionPage from '../EsportsManagerClassic/pages/ChampionPage.jsx'
import ClassicCareerPage from '../EsportsManagerClassic/pages/CareerPage.jsx'

import ReviewEntryPage from '../pages/review/ReviewEntryPage.jsx'
import ReviewStoryPage from '../pages/review/ReviewStoryPage.jsx'

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
      { path: 'matches', element: <MatchesPage /> },
      { path: 'following', element: <FollowingPage /> },
      { path: 'matches/:matchId', element: <MatchDetailPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'players/:playerId', element: <PlayerDetailPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'teams/:teamId', element: <TeamDetailPage /> },
      { path: 'staff', element: <StaffPage /> },
      { path: 'roster', element: <RosterRedirect /> },
      { path: 'heroes', element: <HeroesPage /> },
      { path: 'advance', element: <AdvancePage /> },
      { path: 'standings', element: <StandingsPage /> },
      { path: 'maps', element: <MapStatsPage /> },
      { path: 'maps/:mapName', element: <MapDetailPage /> },

      { path: 'review', element: <ReviewEntryPage /> },

      { path: 'fantasy', element: <ClassicFantasyPage /> },
      { path: 'fantasy-classic', element: <ClassicFantasyPage /> },
      { path: 'fantasy/battle', element: <ClassicFantasyBattle /> },
      { path: 'shop', element: <ClassicShopPage /> },
      { path: 'champion', element: <ClassicChampionPage /> },
      { path: 'career', element: <ClassicCareerPage /> }
    ]
  },

  { path: '/review/story/tournament', element: <ReviewStoryPage storyType="tournament" /> },
  { path: '/review/story/player/:playerId', element: <ReviewStoryPage storyType="player" /> },
  { path: '/review/story/team/:teamId', element: <ReviewStoryPage storyType="team" /> },
  { path: '/review/story/staff/:staffType/:staffKey', element: <ReviewStoryPage storyType="staff" /> }
])

export default router

import { createBrowserRouter } from 'react-router-dom'
import DataLayout from '../layouts/DataLayout.jsx'
import MatchesPage from '../pages/matches/MatchesPage.jsx'
import MatchDetailPage from '../pages/matches/MatchDetailPage.jsx'
import LeaderboardPage from '../pages/leaderboard/LeaderboardPage.jsx'
import PlayersPage from '../pages/players/PlayersPage.jsx'
import PlayerDetailPage from '../pages/players/PlayerDetailPage.jsx'
import TeamsPage from '../pages/teams/TeamsPage.jsx'
import TeamDetailPage from '../pages/teams/TeamDetailPage.jsx'
import HomePage from '../pages/home/HomePage.jsx'
import HeroesPage from '../pages/heroes/HeroesPage.jsx'
import StandingsPage from '../pages/standings/StandingsPage.jsx'
import MapStatsPage from '../pages/stats/MapStatsPage.jsx'
import MapDetailPage from '../pages/stats/MapDetailPage.jsx'

import FantasyPage from '../EsportsManager/pages/FantasyPage.jsx'
import FantasyBattle from '../EsportsManager/pages/FantasyBattle.jsx'
import ShopPage from '../EsportsManager/pages/ShopPage.jsx'
import ChampionPage from '../EsportsManager/pages/ChampionPage.jsx'
import CareerPage from '../EsportsManager/pages/CareerPage.jsx'

import ReviewEntryPage from '../pages/review/ReviewEntryPage.jsx'
import ReviewStoryPage from '../pages/review/ReviewStoryPage.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <DataLayout />,
    children: [
      { index: true, element: <HomePage /> },

      { path: 'matches', element: <MatchesPage /> },
      { path: 'matches/:matchId', element: <MatchDetailPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'players/:playerId', element: <PlayerDetailPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'teams/:teamId', element: <TeamDetailPage /> },
      { path: 'heroes', element: <HeroesPage /> },
      { path: 'standings', element: <StandingsPage /> },
      { path: 'maps', element: <MapStatsPage /> },
      { path: 'maps/:mapName', element: <MapDetailPage /> },

      { path: 'review', element: <ReviewEntryPage /> },

      { path: 'fantasy', element: <FantasyPage /> },
      { path: 'fantasy/battle', element: <FantasyBattle /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'champion', element: <ChampionPage /> },
      { path: 'career', element: <CareerPage /> }
    ]
  },

  { path: '/review/story/tournament', element: <ReviewStoryPage storyType="tournament" /> },
  { path: '/review/story/player/:playerId', element: <ReviewStoryPage storyType="player" /> },
  { path: '/review/story/team/:teamId', element: <ReviewStoryPage storyType="team" /> },
  { path: '/review/story/staff/:staffType/:staffKey', element: <ReviewStoryPage storyType="staff" /> }
])

export default router
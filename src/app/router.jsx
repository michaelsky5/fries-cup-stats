import { createBrowserRouter, Navigate } from 'react-router-dom'
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

import FantasyPage from '../pages/fantasy/FantasyPage.jsx'
import FantasyBattle from '../pages/fantasy/FantasyBattle.jsx';

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

      { path: 'fantasy', element: <FantasyPage /> },
      { path: 'fantasy/battle', element: <FantasyBattle /> }
    ]
  }
])

export default router
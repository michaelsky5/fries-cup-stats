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
// 导入最新的英雄情报局页面
import HeroesPage from '../pages/heroes/HeroesPage.jsx'

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
      // 新增：英雄情报大厅的路由
      { path: 'heroes', element: <HeroesPage /> }
    ]
  }
])

export default router
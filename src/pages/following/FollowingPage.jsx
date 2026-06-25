import { useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import FavoriteManagerDialog from '../../features/favorites/components/FavoriteManagerDialog.jsx'
import FollowedPlayerCard from '../../components/following/FollowedPlayerCard.jsx'
import FollowedTeamCard from '../../components/following/FollowedTeamCard.jsx'
import FollowingEmptyState from '../../components/following/FollowingEmptyState.jsx'
import FollowingHero from '../../components/following/FollowingHero.jsx'
import MatchWeekPanel from '../../components/following/MatchWeekPanel.jsx'
import {
  getFavoriteMatchWeek,
  getFavoritePlayersOverview,
  getFavoriteTeamsOverview,
  getPrimaryTeamOverview
} from '../../lib/followingSelectors.js'
import styles from './FollowingPage.module.css'

function buildSeasonLink(path, canonicalSeasonId) {
  const rawPath = String(path || '')
  if (!rawPath || /^[a-z][a-z0-9+.-]*:/i.test(rawPath) || rawPath.startsWith('#')) return rawPath

  const [pathAndQuery, hash = ''] = rawPath.split('#')
  const queryIndex = pathAndQuery.indexOf('?')
  const pathname = queryIndex >= 0 ? pathAndQuery.slice(0, queryIndex) : pathAndQuery
  const query = queryIndex >= 0 ? pathAndQuery.slice(queryIndex + 1) : ''
  const params = new URLSearchParams(query)
  params.set('season', canonicalSeasonId)
  const search = params.toString()
  return `${pathname}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`
}

function replaceCurrentSearch(updater) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  updater(params)
  const search = params.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
  )
}

function showSaveToast(className) {
  if (typeof document === 'undefined') return
  const id = 'following-save-toast'
  document.getElementById(id)?.remove()
  const toast = document.createElement('div')
  toast.id = id
  toast.className = className
  toast.textContent = '关注已保存'
  document.body.appendChild(toast)
  window.setTimeout(() => toast.remove(), 2200)
}

export default function FollowingPage() {
  const context = useOutletContext() || {}
  const {
    db,
    season,
    canonicalSeasonId = season?.publicCode || 'FCR2026',
    locale = 'zh-CN',
    favorites = { primaryTeamId: null, favoriteTeamIds: [], favoritePlayerIds: [] },
    favoriteLimits = { teams: 5, players: 12 },
    saveFavorites
  } = context
  const [searchParams] = useSearchParams()
  const [managerOpenOverride, setManagerOpenOverride] = useState(null)
  const [managerTabOverride, setManagerTabOverride] = useState(null)

  const requestedManagerOpen = searchParams.get('manage') === '1'
  const managerOpen = managerOpenOverride ?? requestedManagerOpen
  const managerTab = managerTabOverride || (searchParams.get('tab') === 'players' ? 'players' : 'teams')
  const logoSeasonId = season?.id || canonicalSeasonId
  const pageLink = useMemo(
    () => path => buildSeasonLink(path, canonicalSeasonId),
    [canonicalSeasonId]
  )

  const primaryOverview = useMemo(
    () => getPrimaryTeamOverview(db, favorites, season),
    [db, favorites, season]
  )
  const teamOverviews = useMemo(
    () => getFavoriteTeamsOverview(db, favorites, season),
    [db, favorites, season]
  )
  const playerOverviews = useMemo(
    () => getFavoritePlayersOverview(db, favorites),
    [db, favorites]
  )
  const matchWeek = useMemo(
    () => getFavoriteMatchWeek(db, favorites, locale),
    [db, favorites, locale]
  )

  const otherTeams = teamOverviews.filter(team => !team.isPrimary).slice(0, 4)
  const hasAnyFavorites = favorites.favoriteTeamIds.length > 0 || favorites.favoritePlayerIds.length > 0

  const openManager = (tab = 'teams') => {
    setManagerOpenOverride(true)
    setManagerTabOverride(tab)
    replaceCurrentSearch(params => {
      params.set('manage', '1')
      params.set('tab', tab)
    })
  }

  const closeManager = () => {
    setManagerOpenOverride(false)
    replaceCurrentSearch(params => {
      params.delete('manage')
      params.delete('tab')
    })
  }

  const handleSave = nextFavorites => {
    showSaveToast(styles.saveToast)
    saveFavorites?.(nextFavorites)
    closeManager()
  }

  return (
    <main className={styles.page}>
      <FollowingHero
        overview={primaryOverview}
        favorites={favorites}
        favoriteLimits={favoriteLimits}
        seasonId={logoSeasonId}
        withSeason={pageLink}
        onManage={() => openManager('teams')}
      />

      {!hasAnyFavorites ? (
        <FollowingEmptyState
          withSeason={pageLink}
          onManageTeams={() => openManager('teams')}
          onManagePlayers={() => openManager('players')}
        />
      ) : null}

      {hasAnyFavorites ? (
        <>
          <MatchWeekPanel
            week={matchWeek}
            seasonId={logoSeasonId}
            withSeason={pageLink}
            onManage={() => openManager('teams')}
          />

          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <div>
                <span>FOLLOWED TEAMS</span>
                <h2>其他关注队伍</h2>
                <p>快速查看下一场、最近赛果和排名状态。</p>
              </div>
              <button className={styles.sectionTextAction} type="button" onClick={() => openManager('teams')}>添加队伍 →</button>
            </div>

            {otherTeams.length ? (
              <div className={styles.teamGrid}>
                {otherTeams.map(team => (
                  <FollowedTeamCard
                    key={team.teamId}
                    overview={team}
                    seasonId={logoSeasonId}
                    withSeason={pageLink}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.miniEmpty}>
                <strong>暂无其他关注队伍</strong>
                <span>你还可以关注最多 {Math.max(0, favoriteLimits.teams - favorites.favoriteTeamIds.length)} 支队伍。</span>
                <button className={styles.textAction} type="button" onClick={() => openManager('teams')}>添加队伍 →</button>
              </div>
            )}
          </section>

          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <div>
                <span>FOLLOWED PLAYERS</span>
                <h2>关注选手</h2>
                <p>查看昵称、战网 ID、职责与比赛数据。</p>
              </div>
              <button className={styles.sectionTextAction} type="button" onClick={() => openManager('players')}>添加选手 →</button>
            </div>

            {playerOverviews.length ? (
              <div className={styles.playerGrid}>
                {playerOverviews.map(player => (
                  <FollowedPlayerCard key={player.playerId} overview={player} withSeason={pageLink} locale={locale} />
                ))}
              </div>
            ) : (
              <div className={styles.miniEmpty}>
                <strong>暂无关注选手</strong>
                <span>你可以关注最多 {favoriteLimits.players} 名选手。</span>
                <button className={styles.textAction} type="button" onClick={() => openManager('players')}>添加选手 →</button>
              </div>
            )}
          </section>

        </>
      ) : null}

      <FavoriteManagerDialog
        open={managerOpen}
        db={db}
        favorites={favorites}
        seasonId={logoSeasonId}
        initialTab={managerTab}
        onClose={closeManager}
        onSave={handleSave}
      />
    </main>
  )
}

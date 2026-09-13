import { useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { withSeason as buildSeasonLink } from '../../config/seasons.js'
import FavoriteManagerDialog from '../../features/favorites/components/FavoriteManagerDialog.jsx'
import useFavoriteManagerNavigation from '../../features/favorites/useFavoriteManagerNavigation.js'
import { getPlayerFavoriteId, getTeamFavoriteId, sanitizeFavoritesForSeason } from '../../features/favorites/favoritesSelectors.js'
import FollowingWorkspace from '../../features/following/FollowingWorkspace.jsx'
import styles from './FollowingPage.module.css'

export default function FollowingPage() {
  const context = useOutletContext() || {}
  const { db, season, canonicalSeasonId = season?.publicCode || 'FCR2026', locale = 'zh-CN', favorites, favoriteLimits,
    saveFavorites, favoritesSyncStatus = 'local', favoritesSyncError = '', isAuthenticated = false } = context
  const [searchParams] = useSearchParams()
  const [saveMessage, setSaveMessage] = useState('')
  const { managerOpen, managerTab, openManager: openManagerPage, closeManager } = useFavoriteManagerNavigation()
  const target = context.accountPlayerIdentityTarget || (context.accountIdentity?.identityType === 'PLAYER' ? context.accountIdentityTarget : null)
  const manualFavorites = useMemo(() => {
    const clean = sanitizeFavoritesForSeason(favorites, db)
    const identity = sanitizeFavoritesForSeason({ favoriteTeamIds: [getTeamFavoriteId(target?.team) || target?.teamRouteId], favoritePlayerIds: [getPlayerFavoriteId(target?.player) || target?.playerRouteId] }, db)
    return sanitizeFavoritesForSeason({ ...clean, favoriteTeamIds: clean.favoriteTeamIds.filter(id => !identity.favoriteTeamIds.includes(id)), favoritePlayerIds: clean.favoritePlayerIds.filter(id => !identity.favoritePlayerIds.includes(id)) }, db)
  }, [db, favorites, target])
  const pageLink = useMemo(() => path => buildSeasonLink(path, canonicalSeasonId, context.navigationSearch || searchParams.toString()), [canonicalSeasonId, context.navigationSearch, searchParams])
  const openManager = tab => {
    setSaveMessage('')
    openManagerPage(tab)
  }
  const handleSave = async next => {
    if (typeof saveFavorites !== 'function') throw new Error('Following is unavailable')
    await saveFavorites(next)
    setSaveMessage(locale === 'en-US' ? 'Following updated.' : '关注已更新。')
  }
  return <main className={styles.page} data-design="signal" data-page-mode="index">
    <FollowingWorkspace key={`${canonicalSeasonId}:${context.authUser?.id || 'guest'}`} db={db} favorites={manualFavorites} favoriteLimits={favoriteLimits} season={season} locale={locale} withSeason={pageLink}
      standalone isAuthenticated={isAuthenticated} accountId={context.authUser?.id} onSave={handleSave} excludedFavorites={sanitizeFavoritesForSeason({ favoriteTeamIds: [getTeamFavoriteId(target?.team) || target?.teamRouteId], favoritePlayerIds: [getPlayerFavoriteId(target?.player) || target?.playerRouteId] }, db)} syncStatus={favoritesSyncStatus} syncError={favoritesSyncError} onManageTeams={() => openManager('teams')} onManagePlayers={() => openManager('players')} />
    {saveMessage ? <p role="status" data-i18n-ignore>{saveMessage}</p> : null}
    <FavoriteManagerDialog open={managerOpen} db={db} favorites={manualFavorites} seasonId={season?.id || canonicalSeasonId} locale={locale} accountId={context.authUser?.id} syncStatus={favoritesSyncStatus}
      excludedFavorites={sanitizeFavoritesForSeason({ favoriteTeamIds: [getTeamFavoriteId(target?.team) || target?.teamRouteId], favoritePlayerIds: [getPlayerFavoriteId(target?.player) || target?.playerRouteId] }, db)}
      initialTab={managerTab} onClose={closeManager} onSave={handleSave} />
  </main>
}

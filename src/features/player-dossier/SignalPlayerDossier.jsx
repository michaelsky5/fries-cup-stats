import { translateUiText as uiText } from '../../lib/uiText.js'
import { useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import PlayerStoryShareDialog from '../player-share/PlayerStoryShareDialog.jsx'
import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { getReturnState, readReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { getPlayerAppearances, getPlayerPrimaryRole, playerContextPath, playerPagePath } from './playerDossierPresentation.js'
import SignalPlayerArchive from './SignalPlayerArchive.jsx'
import SignalPlayerJourney from './SignalPlayerJourney.jsx'
import { getPlayerArchive } from './playerArchiveModel.js'
import SignalPlayerAnalysis from './SignalPlayerAnalysis.jsx'
import styles from './SignalPlayerDossier.module.css'
import pages from './SignalPlayerPages.module.css'
import archiveStyles from './PlayerArchive.module.css'
import navStyles from '../../components/navigation/SignalSectionNav.module.css'

export default function SignalPlayerDossier({ db, dossier, season, seasonId, locale, onBack, backLabel, onFavorite, favorited, favoriteDisabled }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [params] = useSearchParams()
  const [shareRequest, setShareRequest] = useState(null)
  const active = dossier.roleEntries.find(item => item.role === params.get('role')) || getPlayerPrimaryRole(dossier)
  const appearances = useMemo(() => getPlayerAppearances(db, dossier.basePlayer, locale), [db, dossier.basePlayer, locale])
  const archive = useMemo(() => getPlayerArchive(appearances), [appearances])
  const page = location.pathname.replace(/\/+$/, '').endsWith('/analysis') ? 'analysis' : location.pathname.replace(/\/+$/, '').endsWith('/journey') ? 'journey' : 'profile'
  const analysisPage = page === 'analysis'
  const { identity } = dossier
  const openShare = selection => setShareRequest({ kind: selection?.kind || 'season', role: selection?.role || active.role, matchKey: selection?.matchKey || '', heroKey: selection?.heroKey || '' })
  const closeShare = useCallback(() => setShareRequest(null), [])
  const source = readReturnState(location.state, { allowedPrefixes: ['/roster', '/matches', '/teams', '/players', '/leaderboard', '/me', '/following'] })
  const linkState = { ...getReturnState(location), ...(source.returnTo ? { parentReturnTo: source.returnTo, parentReturnScrollY: source.returnScrollY } : {}) }
  const linkProps = path => ({ to: playerContextPath(path, location.search), state: linkState, onClick: () => saveReturnScroll(location) })
  const pageLink = (page, changes = {}) => {
    const state = { ...location.state }
    delete state.restoreScrollY
    return { to: playerPagePath(identity.playerId, page, location.search, changes), state, onClick: () => saveReturnScroll(location) }
  }

  return <article className={analysisPage ? styles.dossier : archiveStyles.archiveHost} data-player-dossier="signal" data-role={active.role} data-player-page={page}>
    <div className={pages.pageTop}><button type="button" onClick={onBack}>← {backLabel}</button><nav className={`${pages.pageNav} ${navStyles.root}`} aria-label={en ? 'Player pages' : uiText("选手页面", locale)}>
      <div>{[['profile', '选手档案', 'Profile'], ['journey', '赛季征程', 'Journey'], ['analysis', '竞技分析', 'Performance']].map(([key, label, english], index) => <Link key={key} {...pageLink(key)} className={navStyles.item} aria-current={page === key ? 'page' : undefined}><small className={navStyles.code}>0{index + 1}</small>{en ? english : uiText(label, locale)}</Link>)}</div>
    </nav></div>

    {analysisPage ? <SignalPlayerAnalysis db={db} dossier={dossier} active={active} appearances={appearances} season={season} seasonId={seasonId} locale={locale} linkProps={linkProps} onShare={openShare} /> :
      page === 'journey' ? <SignalPlayerJourney dossier={dossier} archive={archive} season={season} seasonId={seasonId} locale={locale} linkProps={linkProps} analysisLink={changes => pageLink('analysis', changes)} profileLink={pageLink('profile')} /> :
      <SignalPlayerArchive key={identity.playerId} db={db} dossier={dossier} appearances={appearances} archive={archive} season={season} seasonId={seasonId} locale={locale} linkProps={linkProps} analysisLink={changes => pageLink('analysis', changes)} journeyLink={changes => pageLink('journey', changes)} onFavorite={onFavorite} favorited={favorited} favoriteDisabled={favoriteDisabled} onShare={openShare} />}

    {analysisPage && <footer className={styles.footer}><Link {...linkProps('/teams/' + encodeURIComponent(identity.teamRouteId))}>{en ? 'View team dossier' : uiText("查看队伍档案", locale)}<strong>{identity.teamShort} ↗</strong></Link><Link {...linkProps('/leaderboard?role=' + active.role)}>{en ? 'Rankings for this role' : uiText("同职责选手排行", locale)}<strong>{en ? getRoleEnLabel(active.role) : uiText(getRoleLabel(active.role), locale)} ↗</strong></Link></footer>}
    {shareRequest && <PlayerStoryShareDialog key={`${identity.playerId}:${seasonId}`} onClose={closeShare} dossier={dossier} appearances={appearances} seasonCode={season?.publicCode || seasonId} locale={locale} initialSelection={shareRequest} />}
  </article>
}

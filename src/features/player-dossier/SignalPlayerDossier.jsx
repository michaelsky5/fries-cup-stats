import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import PlayerShareDialog from '../player-share/PlayerShareDialog.jsx'
import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { getReturnState, readReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { getPlayerAppearances, getPlayerPrimaryRole, playerContextPath, playerPagePath } from './playerDossierPresentation.js'
import SignalPlayerProfile from './SignalPlayerProfile.jsx'
import SignalPlayerAnalysis from './SignalPlayerAnalysis.jsx'
import styles from './SignalPlayerDossier.module.css'
import pages from './SignalPlayerPages.module.css'
import navStyles from '../../components/navigation/SignalSectionNav.module.css'

export default function SignalPlayerDossier({ db, dossier, season, seasonId, locale, updatedAtText, onBack, backLabel, onFavorite, favorited, favoriteDisabled }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [params] = useSearchParams()
  const [shareOpen, setShareOpen] = useState(false)
  const active = dossier.roleEntries.find(item => item.role === params.get('role')) || getPlayerPrimaryRole(dossier)
  const appearances = useMemo(() => getPlayerAppearances(db, dossier.basePlayer, locale), [db, dossier.basePlayer, locale])
  const analysisPage = location.pathname.replace(/\/+$/, '').endsWith('/analysis')
  const { identity } = dossier
  const source = readReturnState(location.state, { allowedPrefixes: ['/roster', '/matches', '/teams', '/players', '/leaderboard', '/me', '/following'] })
  const linkState = { ...getReturnState(location), ...(source.returnTo ? { parentReturnTo: source.returnTo, parentReturnScrollY: source.returnScrollY } : {}) }
  const linkProps = path => ({ to: playerContextPath(path, location.search), state: linkState, onClick: () => saveReturnScroll(location) })
  const pageLink = (page, changes = {}) => {
    const state = { ...location.state }
    delete state.restoreScrollY
    return { to: playerPagePath(identity.playerId, page, location.search, changes), state, onClick: () => saveReturnScroll(location) }
  }

  return <article className={styles.dossier} data-player-dossier="signal" data-role={active.role} data-player-page={analysisPage ? 'analysis' : 'profile'}>
    <div className={pages.pageTop}><button type="button" onClick={onBack}>← {backLabel}</button><nav className={`${pages.pageNav} ${navStyles.root}`} aria-label={en ? 'Player pages' : uiText("选手页面", locale)}>
      <div><Link {...pageLink('profile')} className={navStyles.item} aria-current={!analysisPage ? 'page' : undefined}><small className={navStyles.code}>01</small>{en ? 'Player profile' : uiText("选手档案", locale)}</Link><Link {...pageLink('analysis')} className={navStyles.item} aria-current={analysisPage ? 'page' : undefined}><small className={navStyles.code}>02</small>{en ? 'Data analysis' : uiText("数据分析", locale)}</Link></div>
    </nav></div>

    {analysisPage ? <SignalPlayerAnalysis db={db} dossier={dossier} active={active} appearances={appearances} season={season} seasonId={seasonId} locale={locale} linkProps={linkProps} onShare={() => setShareOpen(true)} /> :
      <SignalPlayerProfile key={identity.playerId} dossier={dossier} appearances={appearances} season={season} seasonId={seasonId} locale={locale} linkProps={linkProps} analysisLink={changes => pageLink('analysis', changes)} onFavorite={onFavorite} favorited={favorited} favoriteDisabled={favoriteDisabled} onShare={() => setShareOpen(true)} />}

    {analysisPage && <footer className={styles.footer}><Link {...linkProps('/teams/' + encodeURIComponent(identity.teamRouteId))}>{en ? 'View team dossier' : uiText("查看队伍档案", locale)}<strong>{identity.teamShort} ↗</strong></Link><Link {...linkProps('/leaderboard?role=' + active.role)}>{en ? 'Rankings for this role' : uiText("同职责选手排行", locale)}<strong>{en ? getRoleEnLabel(active.role) : uiText(getRoleLabel(active.role), locale)} ↗</strong></Link></footer>}
    <PlayerShareDialog open={shareOpen} onClose={() => setShareOpen(false)} db={db} season={season} seasonId={seasonId} locale={locale} playerId={identity.playerId} roleEntries={dossier.roleEntries} currentRole={active.role} updatedAtText={updatedAtText} />
  </article>
}

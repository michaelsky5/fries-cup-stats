import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { SignalDataHeading } from '../../components/database/SignalDataHeader.jsx'
import PlayerStoryShareDialog from '../player-share/PlayerStoryShareDialog.jsx'
import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { getReturnState, readReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { getPlayerAppearances, getPlayerPrimaryRole, playerContextPath, playerPagePath } from './playerDossierPresentation.js'
import { PLAYER_ARCHIVE_PAGES } from './playerArchiveRoutes.js'
import SignalPlayerArchive from './SignalPlayerArchive.jsx'
import { getPlayerArchive } from './playerArchiveModel.js'
import SignalPlayerAnalysis from './SignalPlayerAnalysis.jsx'
import styles from './SignalPlayerDossier.module.css'
import pages from './SignalPlayerPages.module.css'
import archiveStyles from './PlayerArchive.module.css'
import navStyles from '../../components/navigation/SignalSectionNav.module.css'

// 票 2.52: two pages under one frame, like the team pages — 选手展厅 (profile) and 选手数据
// (analysis, which also holds the full match record). Both share the page tabs and title row.
export default function SignalPlayerDossier({ db, dossier, season, seasonId, locale, onBack, backLabel, onFavorite, favorited, favoriteDisabled }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [params] = useSearchParams()
  const [shareRequest, setShareRequest] = useState(null)
  const active = dossier.roleEntries.find(item => item.role === params.get('role')) || getPlayerPrimaryRole(dossier)
  const appearances = useMemo(() => getPlayerAppearances(db, dossier.basePlayer, locale), [db, dossier.basePlayer, locale])
  const archive = useMemo(() => getPlayerArchive(appearances), [appearances])
  const page = location.pathname.replace(/\/+$/, '').endsWith('/analysis') ? 'analysis' : 'profile'
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
  // 票 2.42 补: the 选手展厅 cover already shows team and roles; only the data page repeats them here.
  const roleLine = (archive.roles.length ? archive.roles : dossier.roles).map(role => uiText(en ? getRoleEnLabel(role) : getRoleLabel(role), locale)).join(' / ')
  const followLabel = favorited
    ? pickUiLocale(locale, '已关注', 'Following', '팔로우 중', '已追蹤')
    : favoriteDisabled ? pickUiLocale(locale, '关注已满', 'Follow limit reached', '팔로우 한도 도달', '追蹤已滿') : pickUiLocale(locale, '关注选手', 'Follow player', '선수 팔로우', '追蹤選手')

  // 票 2.77: on phones the back row also names the season (the season bar above is hidden there).
  const seasonName = season?.name?.zh ? pickUiLocale(locale, season.name.zh, season.name.en, uiText(season.name.zh, 'ko-KR'), uiText(season.name.zh, 'zh-TW')) : season?.publicCode || seasonId
  return <article className={analysisPage ? styles.dossier : archiveStyles.archiveHost} data-player-dossier="signal" data-role={active.role} data-player-page={page}>
    <div className={pages.pageTop}><button type="button" onClick={onBack}>← {backLabel}</button><span className={pages.pageSeason}>{seasonName}</span><nav className={`${pages.pageNav} ${navStyles.root}`} aria-label={en ? 'Player pages' : pickUiLocale(locale, '选手页面', 'Player pages', '선수 페이지', '選手頁面')} data-archive-tabs>
      <div>{PLAYER_ARCHIVE_PAGES.map(([key, ...labels]) => <Link key={key} {...pageLink(key)} className={navStyles.item} aria-current={page === key ? 'page' : undefined}>{pickUiLocale(locale, ...labels)}</Link>)}</div>
    </nav></div>
    <div className={pages.titleRow}>
      <SignalDataHeading title={identity.displayName} description={analysisPage ? [identity.teamShort, roleLine].filter(Boolean).join(' · ') || null : null}>
        <button type="button" className={pages.follow} aria-pressed={favorited} disabled={favoriteDisabled && !favorited} onClick={onFavorite}>{followLabel}<span aria-hidden="true">{favorited ? '✓' : '+'}</span></button>
      </SignalDataHeading>
    </div>

    {analysisPage ? <SignalPlayerAnalysis db={db} dossier={dossier} active={active} appearances={appearances} season={season} seasonId={seasonId} locale={locale} linkProps={linkProps} onShare={openShare} /> :
      <SignalPlayerArchive key={identity.playerId} db={db} dossier={dossier} appearances={appearances} archive={archive} season={season} seasonId={seasonId} locale={locale} linkProps={linkProps} analysisLink={changes => pageLink('analysis', changes)} onShare={openShare} />}

    {analysisPage && <footer className={styles.footer}><Link {...linkProps('/teams/' + encodeURIComponent(identity.teamRouteId) + '/analysis')}>{en ? 'View team dossier' : uiText("查看队伍档案", locale)}<strong>{identity.teamShort} →</strong></Link><Link {...linkProps('/leaderboard?role=' + active.role)}>{en ? 'Rankings for this role' : uiText("同职责选手排行", locale)}<strong>{en ? getRoleEnLabel(active.role) : uiText(getRoleLabel(active.role), locale)} →</strong></Link></footer>}
    {shareRequest && <PlayerStoryShareDialog key={`${identity.playerId}:${seasonId}`} onClose={closeShare} dossier={dossier} appearances={appearances} seasonCode={season?.publicCode || seasonId} locale={locale} initialSelection={shareRequest} />}
  </article>
}

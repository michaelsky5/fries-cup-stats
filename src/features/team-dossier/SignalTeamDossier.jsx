import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { SignalDataHeading } from '../../components/database/SignalDataHeader.jsx'
import { getRestoreScrollY, getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { buildDossierSummary, getDossierJourneyStages, getDossierMapPool, getDossierMatch } from './teamDossierPresentation.js'
import TeamGalleryScenes from './TeamGalleryScenes.jsx'
import TeamSeasonChronicle from './TeamSeasonChronicle.jsx'
import TeamMatchLedger from './TeamMatchLedger.jsx'
import TeamArchiveNavigation from './TeamArchiveNavigation.jsx'
import TeamPerformanceReport from './TeamPerformanceReport.jsx'
import { getArchiveIdentity } from './teamArchiveContent.js'
import { getTeamResearch } from './teamDossierResearch.js'
import { TEAM_MATCHES_ANCHOR, TEAM_SEASON_ANCHOR, getDossierView, getDossierViewHref } from './teamArchiveRoutes.js'
import styles from './SignalTeamDossier.module.css'

const percent = value => value === null ? '—' : `${Math.round(value * 100)}%`

// 票 2.42: two pages under one frame. 展厅 (gallery) is the promotional page — cover, people,
// 这一季, staff; 数据 (analysis) is the professional page — 赛程赛果 and 竞技分析. Both share the
// site header, status bar, the same page tabs and the same title row.
export default function SignalTeamDossier({ team, seasonId, locale, withSeason, rosterGroups, matchRows, allMatches, advanceState, onBack, onShare, onToggleFavorite, favorited, favoriteDisabled, sourceReturnState }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const rows = useMemo(() => matchRows.map(row => getDossierMatch(row, locale)), [matchRows, locale])
  const summary = useMemo(() => buildDossierSummary(rows), [rows])
  const stages = useMemo(() => getDossierJourneyStages(rows, locale), [rows, locale])
  const mapPool = useMemo(() => getDossierMapPool(rows, locale), [rows, locale])
  const roster = useMemo(() => rosterGroups.flatMap(group => [...group.rows].sort((a, b) => Number(b.raw_time_mins || 0) - Number(a.raw_time_mins || 0))), [rosterGroups])
  const research = useMemo(() => getTeamResearch(rows, roster, locale), [rows, roster, locale])
  const mapSamples = mapPool.reduce((sum, map) => sum + map.maps, 0)
  const view = getDossierView(location.pathname)
  const viewState = { returnTo: sourceReturnState.returnTo, returnScrollY: sourceReturnState.returnScrollY }
  const galleryHref = getDossierViewHref(location.pathname, location.search, 'gallery')
  const analysisHref = getDossierViewHref(location.pathname, location.search, 'analysis')
  const ledgerHref = getDossierViewHref(location.pathname, location.search, 'analysis', TEAM_MATCHES_ANCHOR)
  const restoredScroll = getRestoreScrollY(location.state)
  const returnState = { ...getReturnState(location), ...(sourceReturnState.returnTo ? { parentReturnTo: sourceReturnState.returnTo, parentReturnScrollY: sourceReturnState.returnScrollY } : {}) }
  const onLeave = () => saveReturnScroll(location)
  const updateQuery = (values) => {
    const nextParams = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => value && value !== 'all' ? nextParams.set(key, value) : nextParams.delete(key))
    setParams(nextParams, { replace: true, state: location.state, preventScrollReset: true })
  }

  // #team-season and #team-matches (links from other pages and old 赛季征程 URLs). The page
  // first scrolls to the top on arrival, so the anchor is applied just after.
  const anchor = location.hash.slice(1)
  useEffect(() => {
    if (restoredScroll !== null || ![TEAM_SEASON_ANCHOR, TEAM_MATCHES_ANCHOR].includes(anchor)) return undefined
    const timer = window.setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ block: 'start', behavior: 'instant' }), 80)
    return () => window.clearTimeout(timer)
  }, [anchor, team.routeId, restoredScroll, view])

  const shareDossier = () => {
    const mapWins = mapPool.reduce((sum, map) => sum + map.wins, 0)
    const mapLosses = mapPool.reduce((sum, map) => sum + map.losses, 0)
    onShare({ matchRecordLabel: summary.administrative ? (en ? `W/L · incl. ${summary.administrative} admin` : uiText("比赛胜负 · 含 {0} 场判罚", locale, [summary.administrative])) : (en ? 'Series W/L' : uiText("比赛胜负", locale)), matchRecord: `${summary.wins}-${summary.losses}`, completedLabel: `${summary.completed} ${en ? 'completed series' : uiText("场已完成", locale)}`, mapRecord: `${mapWins}-${mapLosses}`, mapWinRate: `${mapSamples ? percent(mapWins / mapSamples) : '—'} ${en ? 'map win rate' : uiText("地图胜率", locale)}` })
  }
  const openedEvidence = (params.get('teamEvidence') || '').split(',').filter(Boolean)
  const toggleEvidence = id => {
    const next = openedEvidence.includes(id) ? openedEvidence.filter(key => key !== id) : [...openedEvidence, id]
    updateQuery({ teamEvidence: next.join(',') })
  }
  // 票 2.42 补: the 展厅 cover already shows the full name and honours, so its title row is the
  // name alone; the 数据 page keeps them under the title.
  const fullName = team.fullName && team.fullName !== team.shortName ? team.fullName : ''
  const standing = advanceState.label && advanceState.label !== '—' ? advanceState.label : ''
  const followLabel = favorited
    ? pickUiLocale(locale, '已关注', 'Following', '팔로우 중', '已追蹤')
    : favoriteDisabled ? pickUiLocale(locale, '关注已满', 'Follow limit reached', '팔로우 한도 도달', '追蹤已滿') : pickUiLocale(locale, '关注队伍', 'Follow team', '팀 팔로우', '追蹤隊伍')

  return <article className={styles.dossier} data-team-dossier="signal" data-archive-view={view} data-page-mode={view === 'analysis' ? 'index' : 'archive'} style={getArchiveIdentity()} data-i18n-ignore>
    <TeamArchiveNavigation team={team} seasonId={seasonId} locale={locale} view={view} galleryHref={galleryHref} analysisHref={analysisHref} viewState={viewState} onBack={onBack} onShare={view === 'gallery' ? shareDossier : null} />
    <div className={styles.titleRow}>
      <SignalDataHeading title={team.shortName} description={view === 'analysis' ? [fullName, standing].filter(Boolean).join(' · ') || null : null}>
        <button type="button" className={styles.follow} aria-pressed={favorited} disabled={favoriteDisabled && !favorited} onClick={onToggleFavorite}>{followLabel}<span aria-hidden="true">{favorited ? '✓' : '+'}</span></button>
      </SignalDataHeading>
    </div>
    {view === 'gallery' ? <TeamGalleryScenes team={team} seasonId={seasonId} locale={locale} roster={roster} rows={rows} advanceState={advanceState} research={research} memberId={params.get('member')} onMemberChange={member => updateQuery({ member })} analysisHref={analysisHref} ledgerHref={ledgerHref} withSeason={withSeason} returnState={returnState} viewState={viewState} onLeave={onLeave}>
      <TeamSeasonChronicle key={team.routeId + seasonId} team={team} seasonId={seasonId} locale={locale} rows={rows} advanceState={advanceState} matchId={params.get('teamMatch') || params.get('journalMatch')} onMatchChange={teamMatch => updateQuery({ teamMatch, journalMatch: null })} ledgerHref={ledgerHref} viewState={viewState} withSeason={withSeason} returnState={returnState} onLeave={onLeave} />
    </TeamGalleryScenes> : <>
      <TeamMatchLedger team={team} seasonId={seasonId} locale={locale} rows={rows} stages={stages} params={params} updateQuery={updateQuery} onShowAll={() => updateQuery({ journey: 'all' })} withSeason={withSeason} returnState={returnState} onLeave={onLeave} />
      <TeamPerformanceReport team={team} seasonId={seasonId} rows={rows} roster={roster} allMatches={allMatches} locale={locale} params={params} updateQuery={updateQuery} opened={openedEvidence} onToggle={toggleEvidence} withSeason={withSeason} returnState={returnState} onLeave={onLeave} />
    </>}
    <footer className={styles.pageFoot}><Link to={withSeason('/teams')}>← {en ? 'Explore more teams' : uiText("继续浏览其他队伍", locale)}</Link><span>{team.shortName} / {seasonId}</span><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>{pickUiLocale(locale, '回到顶部', 'Back to top', '맨 위로', '回到頂部')} ↑</button></footer>
  </article>
}

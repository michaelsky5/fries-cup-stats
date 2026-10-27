import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getDefaultTeamLogoCandidates, getTeamLogoCandidates } from '../../lib/teamLogoResolver.js'
import styles from './TeamArchiveIdentity.module.css'
import navStyles from '../../components/navigation/SignalSectionNav.module.css'

export function ArchiveCrest({ team, seasonId, className = '' }) {
  const defaults = new Set(getDefaultTeamLogoCandidates(seasonId, team))
  const sources = getTeamLogoCandidates(team, seasonId).filter(source => !defaults.has(source))
  const [index, setIndex] = useState(0)
  return <span className={`${styles.crest} ${className}`}>
    {sources[index] ? <img src={sources[index]} alt={`${team.shortName} logo`} onError={() => setIndex(value => value + 1)} /> : <b>{team.shortName.slice(0, 3)}</b>}
  </span>
}

// 票 2.42: two page tabs in the same place on both pages; the poster export belongs to the 展厅.
export const TEAM_ARCHIVE_PAGES = [
  ['gallery', '队伍展厅', 'Showcase', '팀 전시실', '隊伍展廳'],
  ['analysis', '队伍数据', 'Team data', '팀 데이터', '隊伍數據']
]

export default function TeamArchiveNavigation({ team, seasonId, locale, view, galleryHref, analysisHref, viewState, backLabel, onBack, onShare }) {
  const en = locale === 'en-US'
  const hrefs = { gallery: galleryHref, analysis: analysisHref }
  // 票 2.72: the back button reads 「← 返回参赛队伍」 (where it goes) instead of a bare ←.
  return <div className={styles.navigation} data-archive-tabs>
    <div className={styles.identity}><button type="button" className={styles.back} onClick={onBack}><span aria-hidden="true">←</span>{backLabel}</button><ArchiveCrest key={`${seasonId}-${team.routeId}`} team={team} seasonId={seasonId} /><span><b>{team.shortName}</b><small>{seasonId}</small></span></div>
    <nav className={navStyles.root} aria-label={en ? 'Team pages' : pickUiLocale(locale, '队伍页面', 'Team pages', '팀 페이지', '隊伍頁面')}>{TEAM_ARCHIVE_PAGES.map(([id, ...labels]) => <Link key={id} className={navStyles.item} to={hrefs[id]} state={viewState} aria-current={view === id ? 'page' : undefined}>{pickUiLocale(locale, ...labels)}</Link>)}</nav>
    <div className={styles.actions}>{onShare ? <button type="button" className={styles.export} onClick={onShare} aria-label={en ? 'Export roster poster' : uiText("导出阵容海报", locale)} title={en ? 'Export roster poster' : uiText("导出阵容海报", locale)}><span>{en ? 'Poster' : uiText("导出海报", locale)}</span> ↓</button> : null}</div>
  </div>
}

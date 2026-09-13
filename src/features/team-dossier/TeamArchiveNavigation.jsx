import { translateUiText as uiText } from '../../lib/uiText.js'
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

export default function TeamArchiveNavigation({ team, seasonId, locale, view, galleryHref, journeyHref, analysisHref, viewState, onBack, onShare }) {
  const en = locale === 'en-US'
  return <div className={styles.navigation} data-exhibition={view === 'gallery' || undefined}>
    <div className={styles.identity}><button type="button" onClick={onBack} aria-label={en ? 'Back to previous page' : uiText("返回上一页", locale)} title={en ? 'Back to previous page' : uiText("返回上一页", locale)}>←</button><ArchiveCrest key={`${seasonId}-${team.routeId}`} team={team} seasonId={seasonId} /><span><b>{team.shortName}</b><small>{seasonId}</small></span></div>
    <nav className={navStyles.root} aria-label={en ? 'Team archive pages' : uiText("队伍档案页面", locale)}>{[[galleryHref, 'gallery', '队伍展厅', 'Exhibition'], [journeyHref, 'journey', '赛季征程', 'Journey'], [analysisHref, 'analysis', '竞技分析', 'Analysis']].map(([href, id, zh, english], index) => <Link key={id} className={navStyles.item} to={href} state={viewState} aria-current={view === id ? 'page' : undefined}><small className={navStyles.code}>0{index + 1}</small>{en ? english : zh}</Link>)}</nav>
    <button type="button" className={styles.export} onClick={onShare} aria-label={en ? 'Export roster poster' : uiText("导出阵容海报", locale)} title={en ? 'Export roster poster' : uiText("导出阵容海报", locale)}><span>{en ? 'Poster' : uiText("导出海报", locale)}</span> ↓</button>
  </div>
}

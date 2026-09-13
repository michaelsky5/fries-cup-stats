import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo } from 'react'
import { getPerformanceField } from './teamPerformance.js'
import { getRolePeerSamples } from './teamPerformanceReadings.js'
import { getTeamResearch } from './teamDossierResearch.js'
import { CombatSection, MemberSection, HeroSection, TrendSection, OpponentSection } from './TeamPerformanceSections.jsx'
import TeamMapAnalysis from './TeamMapAnalysis.jsx'
import { PerformanceHeading, rateLabel } from './TeamPerformancePrimitives.jsx'
import styles from './TeamPerformance.module.css'

export default function TeamAnalysisDetails({ topic, report, allMatches, stage, rows, roster, team, seasonId, mapPool, ...context }) {
  const { en, locale, params, updateQuery } = context
  const field = useMemo(() => topic === 'team' ? getPerformanceField(allMatches, stage, locale) : null, [topic, allMatches, stage, locale])
  const peers = useMemo(() => topic === 'members' ? getRolePeerSamples(allMatches, stage, locale) : null, [topic, allMatches, stage, locale])
  const research = useMemo(() => ['team', 'opponents'].includes(topic) ? getTeamResearch(rows, roster, locale) : null, [topic, rows, roster, locale])
  if (topic === 'team') return <><CombatSection report={report} field={field} team={team} {...context} /><TrendSection report={report} research={research} team={team} {...context} /></>
  if (topic === 'members') return <MemberSection report={report} team={team} rolePeers={peers} {...context} />
  if (topic === 'heroes') return <HeroSection report={report} {...context} />
  if (topic === 'opponents') return <OpponentSection report={report} research={research} team={team} seasonId={seasonId} {...context} />
  const selectedMap = mapPool.find(map => map.name === params.get('teamMap')) || mapPool[0]
  const modes = [...new Set(mapPool.map(map => map.mode))].map(mode => {
    const maps = mapPool.filter(map => map.mode === mode)
    return { mode, maps: maps.reduce((sum, map) => sum + map.maps, 0), wins: maps.reduce((sum, map) => sum + map.wins, 0) }
  })
  return <section id="performance-maps" className={styles.section}>
    <PerformanceHeading index="05" title={en ? 'Maps and modes.' : uiText("地图与模式。", locale)} note={en ? 'One part of the complete team picture.' : uiText("把地图放回这支队伍的完整表现中。", locale)} />
    <div className={styles.mapSummary}>
      <strong>{report.mapWins}<small>{en ? 'map wins' : uiText("图获胜", locale)}</small></strong><strong>{report.mapLosses}<small>{en ? 'map losses' : uiText("图失利", locale)}</small></strong><strong>{mapPool.length}<small>{en ? 'different maps' : uiText("张不同地图", locale)}</small></strong>
    </div>
    <div className={styles.modeSummary}>{modes.map(mode => <div key={mode.mode}><b>{mode.mode}</b><strong>{rateLabel(mode.wins / mode.maps)}</strong><span>{mode.wins} / {mode.maps} {en ? 'maps won' : uiText("图获胜", locale)}</span></div>)}</div>
    <TeamMapAnalysis team={team} mapPool={mapPool} selectedMap={selectedMap} locale={locale}
      onSelect={teamMap => updateQuery({ teamMap })}
      evidenceOpen={params.get('mapEvidence') === 'open'}
      onEvidenceToggle={() => updateQuery({ mapEvidence: params.get('mapEvidence') === 'open' ? null : 'open' })}
      withSeason={context.withSeason} returnState={context.returnState} onLeave={context.onLeave} />
  </section>
}

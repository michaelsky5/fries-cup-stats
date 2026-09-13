import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef } from 'react'
import TeamPerformanceCover from './TeamPerformanceCover.jsx'
import TeamScoutingBrief from './TeamScoutingBrief.jsx'
import TeamAnalysisPlayerPeek from './TeamAnalysisPlayerPeek.jsx'
import TeamAnalysisDetails from './TeamAnalysisDetails.jsx'
import TeamAnalysisMethod from './TeamAnalysisMethod.jsx'
import { buildTeamPerformance } from './teamPerformance.js'
import { getDossierMapPool } from './teamDossierPresentation.js'
import { ANALYSIS_TOPICS, getAnalysisReading, getFindingDestination } from './teamAnalysisReading.js'
import styles from './TeamPerformance.module.css'
import readingStyles from './TeamAnalysisReading.module.css'

export default function TeamPerformanceReport({ team, seasonId, rows, roster, allMatches, locale, params, updateQuery, opened, withSeason, returnState, onLeave }) {
  const en = locale === 'en-US'
  const { view, topic } = getAnalysisReading(params)
  const stageOptions = [...new Set(rows.map(row => row.match.stage).filter(Boolean))]
  const stage = stageOptions.includes(params.get('analysisStage')) ? params.get('analysisStage') : 'all'
  const scopedRows = useMemo(() => rows.filter(row => stage === 'all' || row.match.stage === stage), [rows, stage])
  const report = useMemo(() => buildTeamPerformance(scopedRows, roster, locale), [scopedRows, roster, locale])
  const mapPool = useMemo(() => getDossierMapPool(scopedRows, locale), [scopedRows, locale])
  const topicSamples = {
    team: report.records.length + (en ? ' scored maps' : uiText(" 张有效地图", locale)),
    members: report.members.length + (en ? ' players' : uiText(" 位名单成员", locale)),
    heroes: report.heroes.length + (en ? ' heroes' : uiText(" 位有记录的英雄", locale)),
    opponents: report.opponents.length + (en ? ' opponents' : uiText(" 支交手队伍", locale)),
    maps: mapPool.length + (en ? ' maps' : uiText(" 张比赛地图", locale))
  }
  const pendingTarget = useRef(null)
  const search = params.toString()
  useEffect(() => {
    if (!pendingTarget.current) return undefined
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(pendingTarget.current)
      if (target) {
        const isNavigation = target.id === 'analysis-reading-controls'
        const focusTarget = isNavigation ? target.querySelector('button[aria-pressed="true"]') : target.hasAttribute('tabindex') ? target : document.getElementById('analysis-panel')
        focusTarget?.focus({ preventScroll: true })
        const scrollTarget = isNavigation ? document.getElementById('analysis-panel') : target
        scrollTarget?.scrollIntoView({ block: 'start', behavior: 'instant' })
      }
      pendingTarget.current = null
    })
    return () => window.cancelAnimationFrame(frame)
  }, [search])
  const readingQuery = { analysisView: view, ...(view === 'full' ? { analysisTopic: topic } : {}) }
  const changeQuery = values => updateQuery({ ...readingQuery, ...values })
  const onToggle = id => changeQuery({ teamEvidence: (opened.includes(id) ? opened.filter(key => key !== id) : [...opened, id]).join(',') })
  const context = { en, locale, opened, onToggle, withSeason, returnState, onLeave, params, updateQuery: changeQuery }
  const navigate = (values, target = 'analysis-reading-controls') => {
    const next = new URLSearchParams(params)
    Object.entries({ ...readingQuery, ...values }).forEach(([key, value]) => value && value !== 'all' ? next.set(key, value) : next.delete(key))
    if (next.toString() === search) return
    pendingTarget.current = target
    changeQuery(values)
  }
  const openMember = (member, metric) => navigate({ analysisView: 'full', analysisTopic: 'members', member: member.id, ...(metric ? { memberMetric: metric } : {}), performanceMember: null })
  const inspectFinding = finding => {
    const destination = getFindingDestination(finding)
    navigate({ ...destination.query, ...(destination.evidence ? { teamEvidence: [...new Set([...opened, destination.evidence])].join(',') } : {}) }, finding.section === 'trend' ? destination.target : 'analysis-reading-controls')
  }
  return <div className={styles.report} data-team-performance="comprehensive" data-analysis-view={view}>
    <TeamPerformanceCover team={team} seasonId={seasonId} report={report} stage={stage} stageOptions={stageOptions} {...context} />
    <nav className={readingStyles.controls} id="analysis-reading-controls" aria-label={en ? 'Analysis sections' : uiText("竞技分析栏目", locale)} tabIndex={-1}>
      <div className={readingStyles.topicTabs}>
        <button type="button" aria-label={en ? 'Quick read' : uiText("速览", locale)} aria-pressed={view === 'brief'} aria-controls="analysis-panel" onClick={() => navigate({ analysisView: 'brief' })}>
          <span className={readingStyles.topicNumber} aria-hidden="true">00</span>
          <span><b>{en ? 'Quick read' : uiText("速览", locale)}</b><small>{en ? 'Findings & players' : uiText("重点与成员", locale)}</small></span>
        </button>
        {ANALYSIS_TOPICS.map((item, index) => <button type="button" key={item.id} aria-label={en ? item.en : uiText(item.zh, locale)} aria-pressed={view === 'full' && topic === item.id} aria-controls="analysis-panel" onClick={() => navigate({ analysisView: 'full', analysisTopic: item.id })}>
          <span className={readingStyles.topicNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span><b>{en ? item.en : uiText(item.zh, locale)}</b><small>{topicSamples[item.id]}</small></span>
        </button>)}
      </div>
    </nav>
    <div className={readingStyles.panel} key={view === 'full' ? topic : view} id="analysis-panel" tabIndex={-1} role="region" aria-label={view === 'brief' ? (en ? 'Team quick read' : uiText("队伍速览", locale)) : uiText(ANALYSIS_TOPICS.find(item => item.id === topic)?.[en ? 'en' : 'zh'], locale)} data-analysis-topic={view === 'full' ? topic : undefined}>
      {view === 'brief' ? <>
        <TeamScoutingBrief team={team} report={report} mapPool={mapPool} onInspect={inspectFinding} {...context} />
        <TeamAnalysisPlayerPeek report={report} onInspect={openMember} {...context} />
      </> : <TeamAnalysisDetails topic={topic} report={report} allMatches={allMatches} stage={stage} rows={scopedRows} roster={roster} team={team} seasonId={seasonId} mapPool={mapPool} {...context} />}
    </div>
    <TeamAnalysisMethod report={report} {...context} />
  </div>
}

import { translateUiText as uiText } from '../../lib/uiText.js'
import { getDossierStageLabel } from './teamDossierPresentation.js'
import { rateLabel } from './TeamPerformancePrimitives.jsx'
import styles from './TeamAnalysisReading.module.css'

export default function TeamPerformanceCover({ team, report, stage, stageOptions, en, locale, updateQuery }) {
  return <header className={styles.cover}>
    <div className={styles.masthead}>
      <div className={styles.identity}>
        <h1 id="team-performance-title"><strong>{team.shortName}</strong><span>{en ? 'Competitive analysis' : uiText("竞技分析", locale)}</span></h1>
      </div>
      <label className={styles.scope}><span>{en ? 'Stage' : uiText("分析赛段", locale)}</span>
        <select aria-label={en ? 'Analysis stage' : uiText("分析赛段", locale)} value={stage} onChange={event => updateQuery({ analysisStage: event.target.value, teamOpponent: null, teamMap: null, chapter: null, tab: null, performanceMember: null })}>
          <option value="all">{en ? 'Full season' : uiText("整个赛季", locale)}</option>
          {stageOptions.map(key => <option value={key} key={key}>{getDossierStageLabel(key, locale)}</option>)}
        </select>
      </label>
    <div className={styles.record}>
      <span><small>{en ? 'Played series' : uiText("实际交手", locale)}</small><strong><span>{report.summary.decided ? report.summary.wins : '—'}<em>{en ? 'W' : uiText("胜", locale)}</em></span><span>{report.summary.decided ? report.summary.losses : '—'}<em>{en ? 'L' : uiText("负", locale)}</em></span>{report.summary.draws ? <span>{report.summary.draws}<em>{en ? 'D' : uiText("平", locale)}</em></span> : null}</strong></span>
      <span><small>{en ? 'Series win rate' : uiText("比赛胜率", locale)}</small><strong>{rateLabel(report.summary.winRate)}</strong></span>
      <span><small>{en ? 'Scored maps' : uiText("有效地图", locale)}</small><strong>{report.records.length}<em>{en ? 'maps' : uiText("图", locale)}</em></strong></span>
    </div>
    </div>
  </header>
}

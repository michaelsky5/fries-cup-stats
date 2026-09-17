import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { valueLabel } from './TeamPerformancePrimitives.jsx'
import styles from './TeamScoutingBrief.module.css'

export default function TeamBriefFigure({ finding, team, en }) {
  const uiLocale = useUiLocale()
  const rows = finding.chart?.rows.filter(row => Number.isFinite(row.value)) || []
  const max = Math.max(...rows.map(row => row.value), 1)
  const series = new Set(finding.records.map(record => record.match.match_id)).size
  return <figure className={styles.figure}>
    <figcaption><span>{en ? 'THE RECORD BEHIND IT' : uiText("从记录中，读出差异", uiLocale)}</span><b>{finding.chart?.label || finding.highlightLabel}</b></figcaption>
    {rows.length ? <div className={styles.figureRows}>{rows.map((row, index) => <div key={row.label} data-own={index === 0}>
      <div><span>{index === 0 ? team.shortName : row.label}</span><strong>{valueLabel(row.value)}</strong></div>
      <span className={styles.figureTrack} aria-hidden="true"><i style={{ width: row.value / max * 100 + '%' }} /></span>
    </div>)}</div> : <strong className={styles.figureFact}>{finding.highlight || '—'}</strong>}
    <footer><span><b>{finding.records.length}</b>{en ? 'maps' : uiText("图", uiLocale)}</span><span><b>{series}</b>{en ? 'series' : uiText("场交手", uiLocale)}</span><span>{en ? 'Observation sample' : uiText("本条观察样本", uiLocale)}</span></footer>
  </figure>
}

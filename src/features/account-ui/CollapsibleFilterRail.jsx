import { translateUiText as uiText } from '../../lib/uiText.js'
import { useId, useState } from 'react'
import styles from './CollapsibleFilterRail.module.css'

export default function CollapsibleFilterRail({ activeCount, resultLabel, onReset, locale = 'zh-CN', inline = false, children }) {
  const [expanded, setExpanded] = useState(false)
  const controlsId = useId()
  const en = locale === 'en-US'
  const label = en ? `Filters · ${activeCount} active` : uiText("筛选 · {0} 项", locale, [activeCount])
  return <div className={styles.rail} data-expanded={expanded} data-inline={inline}>
    <div className={styles.summary}>
      <button className={styles.toggle} type="button" aria-expanded={expanded} aria-controls={controlsId} onClick={() => setExpanded(value => !value)}>{label}<span aria-hidden="true">{expanded ? '−' : '＋'}</span></button>
      <span className={styles.desktopLabel}>{label}</span>
      <span className={styles.results} role="status">{resultLabel}</span>
      {activeCount > 0 ? <button className={styles.reset} type="button" onClick={onReset}>{en ? 'Clear' : uiText("清除筛选", locale)}</button> : null}
    </div>
    <div id={controlsId} className={styles.controls}>{children}</div>
  </div>
}

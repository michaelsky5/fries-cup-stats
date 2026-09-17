import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './RosterComponents.module.css'

export default function RosterPageHeader({ stats = [] }) {
  const uiLocale = useUiLocale()
  return (
    <section className={styles.pageHeader}>
      <div className={styles.pageHeaderMain}>
        <div className={styles.sectionLabel}>ROSTER</div>
        <h1 className={styles.pageTitle}>{uiText("参赛阵容", uiLocale)}</h1>
        <p className={styles.pageDesc}>{uiText("浏览本届赛事的参赛战队、选手与赛事职员。", uiLocale)}</p>
      </div>

      <div className={styles.summaryGrid} aria-label="Roster summary">
        {stats.map(item => (
          <div key={`${item.label}-${item.value}`} className={styles.summaryItem}>
            <div className={styles.summaryValue}>{item.value}</div>
            <div className={styles.summaryLabel}>{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

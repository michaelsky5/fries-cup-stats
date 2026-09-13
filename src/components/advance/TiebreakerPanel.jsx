import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from '../../pages/advance/AdvancePage.module.css'

export default function TiebreakerPanel({ rules, t }) {
  const uiLocale = useUiLocale()
  return (
    <aside className={styles.tiebreakerPanel}>
      <div className={styles.sectionHeaderCompact}>
        <span className={styles.sectionLabel}>TIEBREAKERS</span>
        <h2>{t('advance.tiebreakers.title', uiText("同分规则", uiLocale))}</h2>
      </div>
      <ol>
        {rules.map(rule => (
          <li key={`${rule.index}-${rule.key}`}>
            <strong>{String(rule.index).padStart(2, '0')}</strong>
            <span>{t(`advance.tiebreaker.${rule.key}`, rule.key)}</span>
          </li>
        ))}
      </ol>
    </aside>
  )
}

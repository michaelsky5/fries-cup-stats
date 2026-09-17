import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from './RosterComponents.module.css'

export default function RosterEmptyState({ title, onReset, locale = 'zh-CN' }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyTitle}>{title}</div>
      {onReset ? (
        <button type="button" className={styles.emptyAction} onClick={onReset}>
          {locale === 'en-US' ? 'Clear filters' : uiText("清除筛选", locale)} →
        </button>
      ) : null}
    </div>
  )
}

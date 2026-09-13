import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { LEADERBOARD_TABS } from '../../lib/leaderboardSelectors.js'
import styles from '../../features/fd-design/leaderboardStyles.js'

export default function LeaderboardTabs({ activeTab, onChange, counts = {} }) {
  const uiLocale = useUiLocale()
  return (
    <div className={styles.tabRail} role="tablist" aria-label={uiText("排行榜分类", uiLocale)}>
      {LEADERBOARD_TABS.map((tab, index) => {
        const active = activeTab === tab.id
        const count = tab.role === 'ALL' ? counts.overall || 0 : counts[tab.role] || 0

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.mainTab} ${active ? styles.mainTabActive : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <b>{String(index + 1).padStart(2, '0')}</b>
            <span>{tab.label}</span>
            <em>{tab.en}</em>
            <strong>{count}</strong>
          </button>
        )
      })}
    </div>
  )
}

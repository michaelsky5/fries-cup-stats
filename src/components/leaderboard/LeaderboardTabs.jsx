import { LEADERBOARD_TABS } from '../../lib/leaderboardSelectors.js'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

export default function LeaderboardTabs({ activeTab, onChange, counts = {} }) {
  return (
    <div className={styles.tabRail} role="tablist" aria-label="排行榜分类">
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

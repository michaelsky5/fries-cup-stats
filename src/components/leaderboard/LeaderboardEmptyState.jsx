import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from '../../features/fd-design/leaderboardStyles.js'

export default function LeaderboardEmptyState({
  title = '暂无符合条件的排行条目',
  note = '调整搜索、队伍或样本筛选后再试。',
  locale = 'zh-CN'
}) {
  const isEn = locale === 'en-US'

  return (
    <div className={styles.emptyState}>
      <span>{isEn ? 'No Results' : uiText("暂无结果", locale)}</span>
      <strong>{isEn ? 'No leaderboard entries match these filters' : uiText(title, locale)}</strong>
      <em>{isEn ? 'Try changing the search, team, or sample filters.' : uiText(note, locale)}</em>
    </div>
  )
}

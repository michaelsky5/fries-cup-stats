import styles from '../../features/fd-design/leaderboardStyles.js'
import { getSeasonRatingStatusLabel } from '../../lib/seasonRatingPolicy.js'

export default function EligibilityBadge({ eligible, entry, locale = 'zh-CN' }) {
  return (
    <span className={`${styles.eligibilityBadge} ${(entry?.eligible ?? eligible) ? styles.eligible : styles.insufficient}`}>
      {getSeasonRatingStatusLabel(entry || { eligible }, locale)}
    </span>
  )
}

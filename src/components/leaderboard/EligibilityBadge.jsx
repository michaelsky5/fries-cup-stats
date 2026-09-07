import styles from '../../pages/leaderboard/LeaderboardPage.module.css'
import { getSeasonRatingStatusLabel } from '../../lib/seasonRatingPolicy.js'

export default function EligibilityBadge({ eligible, entry, locale = 'zh-CN' }) {
  return (
    <span className={`${styles.eligibilityBadge} ${eligible ? styles.eligible : styles.insufficient}`}>
      {getSeasonRatingStatusLabel(entry || { eligible }, locale)}
    </span>
  )
}

import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

export default function EligibilityBadge({ eligible }) {
  return (
    <span className={`${styles.eligibilityBadge} ${eligible ? styles.eligible : styles.insufficient}`}>
      {eligible ? '正式排名' : '样本不足'}
    </span>
  )
}

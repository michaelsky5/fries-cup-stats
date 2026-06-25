import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

export default function LeaderboardEmptyState({
  title = '暂无符合条件的排行条目',
  note = '调整搜索、队伍或样本筛选后再试。'
}) {
  return (
    <div className={styles.emptyState}>
      <span>EMPTY STATE</span>
      <strong>{title}</strong>
      <em>{note}</em>
    </div>
  )
}

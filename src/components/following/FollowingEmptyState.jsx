import { Link } from 'react-router-dom'
import styles from '../../pages/following/FollowingPage.module.css'

export default function FollowingEmptyState({ withSeason, onManageTeams, onManagePlayers }) {
  return (
    <section className={styles.emptyState}>
      <p className={styles.kicker}>FOLLOWING</p>
      <h1>建立你的赛事工作台</h1>
      <p>关注队伍后查看下一场比赛、赛果和晋级状态；关注选手后查看个人数据与比赛表现。</p>
      <div className={styles.emptyActions}>
        <button type="button" onClick={onManageTeams}>选择关注队伍</button>
        <button type="button" onClick={onManagePlayers}>关注选手</button>
      </div>
      <div className={styles.emptyLinks}>
        <Link to={withSeason('/teams')}>查看参赛阵容 →</Link>
        <Link to={withSeason('/matches')}>查看本轮赛程 →</Link>
      </div>
    </section>
  )
}

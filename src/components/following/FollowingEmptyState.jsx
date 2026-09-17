import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import styles from '../../pages/following/FollowingPage.module.css'

export default function FollowingEmptyState({ withSeason, onManageTeams, onManagePlayers }) {
  const uiLocale = useUiLocale()
  return (
    <section className={styles.emptyState}>
      <p className={styles.kicker}>FOLLOWING</p>
      <h2>{uiText("建立你的赛事工作台", uiLocale)}</h2>
      <p>{uiText("关注队伍后查看下一场比赛、赛果和晋级状态；关注选手后查看个人数据与比赛表现。", uiLocale)}</p>
      <div className={styles.emptyActions}>
        <button type="button" onClick={onManageTeams}>{uiText("选择关注队伍", uiLocale)}</button>
        <button type="button" onClick={onManagePlayers}>{uiText("关注选手", uiLocale)}</button>
      </div>
      <div className={styles.emptyLinks}>
        <Link to={withSeason('/teams')}>{uiText("查看参赛阵容 →", uiLocale)}</Link>
        <Link to={withSeason('/matches')}>{uiText("查看本轮赛程 →", uiLocale)}</Link>
      </div>
    </section>
  )
}

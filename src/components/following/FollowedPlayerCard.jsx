import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import { formatOwHeroNames } from '../../lib/heroes.js'
import { getCompetitiveRoleLabel } from '../../lib/rosterSelectors.js'
import styles from '../../pages/following/FollowingPage.module.css'

export default function FollowedPlayerCard({ overview, withSeason, locale = 'zh-CN', relationLabel = '' }) {
  if (!overview) return null

  const heroes = overview.snapshot?.heroes || []
  const coreMetric = overview.snapshot?.coreMetric
  const battleTag = overview.battleTag || overview.player?.battle_tag || overview.player?.battleTag || overview.player?.player_name || ''

  return (
    <article className={styles.playerCard}>
      <div className={styles.playerHeader}>
        <div className={styles.playerMark}>{overview.displayName.slice(0, 2)}</div>
        <div className={styles.playerIdentity}>
          <strong>{overview.displayName}</strong>
          {battleTag && battleTag !== overview.displayName ? <em>{battleTag}</em> : null}
        </div>
        <div className={styles.playerTags}>
          {relationLabel ? <span className={styles.playerIdentityBadge}>{relationLabel}</span> : null}
          <span className={styles.playerTeamBadge}>{overview.teamShortName || 'TBD'}</span>
          <span className={styles.playerRoleBadge}>{getCompetitiveRoleLabel(overview.role, locale)}</span>
        </div>
      </div>

      <div className={styles.playerSnapshot}>
        <span>{coreMetric?.label || uiText("核心指标", locale)}</span>
        <strong>{coreMetric?.value || uiText("比赛开始后更新", locale)}</strong>
      </div>

      <div className={styles.playerSnapshot}>
        <span>{uiText("常用英雄", locale)}</span>
        <strong>{heroes.length ? formatOwHeroNames(heroes, locale, 2).join(' / ') : uiText("暂无", locale)}</strong>
      </div>

      <Link className={styles.inlineLink} to={withSeason(`/players/${encodeURIComponent(overview.playerId)}`)}>{uiText("查看选手资料 →", locale)}</Link>
    </article>
  )
}

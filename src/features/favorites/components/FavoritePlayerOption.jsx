import {
  getPlayerBattleTag,
  getPlayerDisplayName,
  getPlayerFavoriteId,
  getTeamShortName
} from '../favoritesSelectors.js'
import styles from './FavoriteManagerDialog.module.css'

export default function FavoritePlayerOption({ player, team, selected, disabled, onToggle }) {
  const playerId = getPlayerFavoriteId(player)
  const displayName = getPlayerDisplayName(player)
  const battleTag = getPlayerBattleTag(player)

  return (
    <article className={styles.optionCard} data-selected={selected ? 'true' : 'false'}>
      <div className={styles.playerAvatar}>{displayName.slice(0, 2)}</div>
      <div className={styles.optionText}>
        <strong>{displayName}</strong>
        {battleTag ? <em>{battleTag}</em> : null}
        <span>{getTeamShortName(team || player)} · {player.role || 'FLEX'}</span>
      </div>
      <div className={styles.optionActionRail}>
        <button type="button" onClick={() => onToggle(playerId)} disabled={selected || (disabled && !selected)}>
          {selected ? '已关注' : disabled ? '已达上限' : '关注'}
        </button>
      </div>
    </article>
  )
}

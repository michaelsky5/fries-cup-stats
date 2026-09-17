import {
  getPlayerBattleTag,
  getPlayerDisplayName,
  getPlayerFavoriteId,
  getTeamShortName
} from '../favoritesSelectors.js'
import styles from './FavoriteManagerDialog.module.css'
import { getFavoriteRoleLabel } from '../favoriteManagerCopy.js'
import FollowingPlayerPortrait from '../../following/FollowingPlayerPortrait.jsx'

export default function FavoritePlayerOption({ player, db, team, selected, disabled, busy, copy, locale, onToggle }) {
  const playerId = getPlayerFavoriteId(player)
  const displayName = getPlayerDisplayName(player)
  const battleTag = getPlayerBattleTag(player)

  return (
    <article className={styles.optionCard} data-selected={selected ? 'true' : 'false'}>
      <FollowingPlayerPortrait player={player} db={db} locale={locale} className={styles.playerAvatar} />
      <div className={styles.optionText}>
        <strong>{displayName}</strong>
        {battleTag ? <em>{battleTag}</em> : null}
        <span>{getTeamShortName(team || player)} · {getFavoriteRoleLabel(player.role, locale)}</span>
      </div>
      <div className={styles.optionActionRail}>
        <button type="button" onClick={() => onToggle(playerId)} disabled={busy || selected || disabled} aria-label={selected ? copy.followed + ' ' + displayName : copy.followLabel(displayName)}>
          {selected ? copy.followed : disabled ? copy.limit : copy.follow}
        </button>
      </div>
    </article>
  )
}

import { getPlayerBattleTag, getPlayerDisplayName, getPlayerFavoriteId } from '../favoritesSelectors.js'
import styles from './FavoriteManagerDialog.module.css'
import { getFavoriteRoleLabel } from '../favoriteManagerCopy.js'
import FollowingPlayerPortrait from '../../following/FollowingPlayerPortrait.jsx'

export default function FavoriteSelectedPlayerRow({
  player,
  db,
  index,
  total,
  copy,
  locale,
  disabled,
  draggable,
  onDragStart,
  onDrop,
  onMove,
  onRemove
}) {
  const id = getPlayerFavoriteId(player)
  const displayName = getPlayerDisplayName(player)
  const battleTag = getPlayerBattleTag(player)

  return (
    <div
      className={styles.selectedRow}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={event => event.preventDefault()}
      onDrop={onDrop}
    >
      <span className={styles.dragHandle} aria-hidden="true">≡</span>
      <FollowingPlayerPortrait player={player} db={db} locale={locale} className={styles.playerInitial} />
      <div className={styles.rowText}>
        <strong>{displayName}</strong>
        {battleTag ? <em>{battleTag}</em> : null}
        <span>{player.team_short_name || player.team_name || '—'} · {getFavoriteRoleLabel(player.role, locale)}</span>
      </div>
      <div className={styles.rowActions}>
        <button type="button" className={styles.orderButton} onClick={() => onMove(index, index - 1)} disabled={disabled || index <= 0} aria-label={copy.up(displayName)}>↑</button>
        <button type="button" className={styles.orderButton} onClick={() => onMove(index, index + 1)} disabled={disabled || index >= total - 1} aria-label={copy.down(displayName)}>↓</button>
        <button type="button" className={styles.removeButton} disabled={disabled} onClick={() => onRemove(id)} aria-label={copy.removeLabel(displayName)}>{copy.remove}</button>
      </div>
    </div>
  )
}

import { getPlayerBattleTag, getPlayerDisplayName, getPlayerFavoriteId } from '../favoritesSelectors.js'
import { getCompetitiveRoleLabel } from '../../../lib/rosterSelectors.js'
import styles from './FavoriteManagerDialog.module.css'

export default function FavoriteSelectedPlayerRow({
  player,
  index,
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
      <div className={styles.playerInitial}>{displayName.slice(0, 2)}</div>
      <div className={styles.rowText}>
        <strong>{displayName}</strong>
        {battleTag ? <em>{battleTag}</em> : null}
        <span>{player.team_short_name || player.team_name || 'TBD'} · {getCompetitiveRoleLabel(player.role)}</span>
      </div>
      <div className={styles.rowActions}>
        <button type="button" className={styles.orderButton} onClick={() => onMove(index, index - 1)} disabled={index <= 0} aria-label="上移">↑</button>
        <button type="button" className={styles.orderButton} onClick={() => onMove(index, index + 1)} aria-label="下移">↓</button>
        <button type="button" className={styles.removeButton} onClick={() => onRemove(id)}>移除</button>
      </div>
    </div>
  )
}

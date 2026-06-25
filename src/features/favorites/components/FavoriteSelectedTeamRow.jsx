import TeamLogo from '../../../components/matches/TeamLogo.jsx'
import { getTeamFavoriteId, getTeamFullName, getTeamShortName } from '../favoritesSelectors.js'
import styles from './FavoriteManagerDialog.module.css'

export default function FavoriteSelectedTeamRow({
  team,
  index,
  seasonId,
  primary,
  draggable,
  onDragStart,
  onDrop,
  onMove,
  onMakePrimary,
  onRemove
}) {
  const id = getTeamFavoriteId(team)

  return (
    <div
      className={styles.selectedRow}
      data-primary={primary ? 'true' : 'false'}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={event => event.preventDefault()}
      onDrop={onDrop}
    >
      <span className={styles.dragHandle} aria-hidden="true">≡</span>
      <TeamLogo className={styles.rowLogo} team={team} seasonId={seasonId} />
      <div className={styles.rowText}>
        <strong>{getTeamShortName(team)}</strong>
        <span>{getTeamFullName(team)}</span>
        {primary ? <em>主关注</em> : null}
      </div>
      <div className={styles.rowActions}>
        <button type="button" className={styles.orderButton} onClick={() => onMove(index, index - 1)} disabled={primary || index <= 1} aria-label="上移">↑</button>
        <button type="button" className={styles.orderButton} onClick={() => onMove(index, index + 1)} disabled={primary} aria-label="下移">↓</button>
        {!primary ? <button type="button" className={styles.primaryTextButton} onClick={() => onMakePrimary(id)}>设为主关注</button> : null}
        <button type="button" className={styles.removeButton} onClick={() => onRemove(id)}>移除</button>
      </div>
    </div>
  )
}

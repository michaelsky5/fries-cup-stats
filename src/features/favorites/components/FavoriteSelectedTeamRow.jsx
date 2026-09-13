import TeamLogo from '../../../components/matches/TeamLogo.jsx'
import { getTeamFavoriteId, getTeamFullName, getTeamShortName } from '../favoritesSelectors.js'
import styles from './FavoriteManagerDialog.module.css'

export default function FavoriteSelectedTeamRow({
  team,
  index,
  total,
  copy,
  disabled,
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
        {primary ? <em>{copy.primary}</em> : null}
      </div>
      <div className={styles.rowActions}>
        <button type="button" className={styles.orderButton} onClick={() => onMove(index, index - 1)} disabled={disabled || primary || index <= 1} aria-label={copy.up(getTeamShortName(team))}>↑</button>
        <button type="button" className={styles.orderButton} onClick={() => onMove(index, index + 1)} disabled={disabled || primary || index >= total - 1} aria-label={copy.down(getTeamShortName(team))}>↓</button>
        {!primary ? <button type="button" className={styles.primaryTextButton} disabled={disabled} onClick={() => onMakePrimary(id)}>{copy.makePrimary}</button> : null}
        <button type="button" className={styles.removeButton} disabled={disabled} onClick={() => onRemove(id)} aria-label={copy.removeLabel(getTeamShortName(team))}>{copy.remove}</button>
      </div>
    </div>
  )
}

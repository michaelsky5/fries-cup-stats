import TeamLogo from '../../../components/matches/TeamLogo.jsx'
import { getTeamFavoriteId, getTeamFullName, getTeamShortName } from '../favoritesSelectors.js'
import styles from './FavoriteManagerDialog.module.css'

export default function FavoriteTeamOption({
  team,
  seasonId,
  selected,
  primary,
  disabled,
  onToggle,
  onMakePrimary
}) {
  const teamId = getTeamFavoriteId(team)
  const shortName = getTeamShortName(team)

  return (
    <article className={styles.optionCard} data-selected={selected ? 'true' : 'false'}>
      <TeamLogo
        className={styles.optionLogo}
        team={team}
        seasonId={seasonId}
        teamShortName={shortName}
        teamName={getTeamFullName(team)}
      />
      <div className={styles.optionText}>
        <strong>{shortName}</strong>
        <span>{getTeamFullName(team)}</span>
      </div>
      <div className={styles.optionActionRail}>
        {primary ? <span className={styles.primaryPill}>主关注</span> : null}
        <button type="button" onClick={() => onToggle(teamId)} disabled={selected || (disabled && !selected)}>
          {selected ? '已关注' : disabled ? '已达上限' : '关注'}
        </button>
        {selected && !primary ? (
          <button type="button" className={styles.primaryTextButton} onClick={() => onMakePrimary(teamId)}>设为主关注</button>
        ) : null}
      </div>
    </article>
  )
}

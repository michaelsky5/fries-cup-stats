import TeamLogo from '../../../components/matches/TeamLogo.jsx'
import { getTeamFavoriteId, getTeamFullName, getTeamShortName } from '../favoritesSelectors.js'
import styles from './FavoriteManagerDialog.module.css'

export default function FavoriteTeamOption({
  team,
  seasonId,
  selected,
  primary,
  disabled,
  busy,
  copy,
  onToggle,
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
        {primary ? <span className={styles.primaryPill}>{copy.primary}</span> : null}
        <button type="button" onClick={() => onToggle(teamId)} disabled={busy || selected || disabled} aria-label={selected ? copy.followed + ' ' + shortName : copy.followLabel(shortName)}>
          {selected ? copy.followed : disabled ? copy.limit : copy.follow}
        </button>
      </div>
    </article>
  )
}

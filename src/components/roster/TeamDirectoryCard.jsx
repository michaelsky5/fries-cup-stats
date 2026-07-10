import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import { formatStaffPerson, normalizeStaffIdentity } from '../../lib/rosterSelectors.js'
import styles from './RosterComponents.module.css'

function StaffBlock({ label, person }) {
  if (!person) return null

  const identity = normalizeStaffIdentity(person)
  const name = formatStaffPerson(person)

  return (
    <div className={styles.staffBlock}>
      <span className={styles.metaLabel}>{label}</span>
      <strong title={name}>{name}</strong>
      {identity.battleTag && identity.battleTag !== name ? (
        <em title={identity.battleTag}>{identity.battleTag}</em>
      ) : null}
    </div>
  )
}

function TeamRosterSplit({ team }) {
  const counts = team.roleCounts || {}

  return (
    <div className={styles.rosterSplit} aria-label={`选手 ${team.rosterSize}`}>
      <span className={styles.rosterSplitLabel}>选手</span>
      <span className={styles.rosterTotal}>{team.rosterSize}</span>
      <span className={styles.roleSplitRow}>
        <b className={styles.roleTank} title="重装">{counts.TANK || 0}</b>
        <b className={styles.roleDps} title="输出">{counts.DPS || 0}</b>
        <b className={styles.roleSupport} title="支援">{counts.SUP || 0}</b>
      </span>
    </div>
  )
}

export default function TeamDirectoryCard({
  team,
  seasonId,
  withSeason = path => path,
  onToggleFavorite,
  favoriteDisabled = false
}) {
  const teamPath = withSeason(`/teams/${team.routeId}`)
  const favoriteLabel = team.isFavorite ? '取消关注' : favoriteDisabled ? '关注已满' : '关注'
  const manager = team.staff?.managers?.[0]
  const coach = team.staff?.coaches?.[0]

  return (
    <article className={`${styles.teamCard} ${team.isFavorite ? styles.teamCardFavorite : ''}`}>
      <Link to={teamPath} className={styles.cardLinkOverlay} aria-label={`查看战队 ${team.shortName}`} />

      <div className={styles.teamBrandArea}>
        {team.isFavorite ? <span className={styles.favoriteBadge}>FOLLOWING</span> : null}
        <button
          type="button"
          className={`${styles.favoriteButton} ${team.isFavorite ? styles.favoriteButtonActive : ''}`}
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
            onToggleFavorite?.(team)
          }}
          disabled={favoriteDisabled}
          aria-label={favoriteLabel}
        >
          {team.isFavorite ? '已关注' : '关注'}
        </button>
        <TeamLogo team={team} seasonId={seasonId} className={styles.teamLogo} large />
      </div>

      <div className={styles.teamBody}>
        <div className={styles.teamIdentityRow}>
          <div className={styles.teamNameBlock}>
            <div className={styles.teamShortName}>{team.shortName}</div>
            <div className={styles.teamFullName}>{team.fullName}</div>
          </div>
          <TeamRosterSplit team={team} />
        </div>

        <div className={styles.teamStaffGrid}>
          <StaffBlock label="经理" person={manager} />
          <StaffBlock label="教练" person={coach} />
        </div>

        <span className={styles.cardTextLink}>查看战队 →</span>
      </div>
    </article>
  )
}

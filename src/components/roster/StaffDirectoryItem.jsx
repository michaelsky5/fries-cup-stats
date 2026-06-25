import { Link, useNavigate } from 'react-router-dom'
import styles from './RosterComponents.module.css'

export default function StaffDirectoryItem({ staff, withSeason = path => path }) {
  const navigate = useNavigate()
  const teamPath = withSeason(`/teams/${staff.team.routeId}`)

  const stop = event => {
    event.stopPropagation()
  }

  return (
    <article
      className={styles.staffItem}
      tabIndex={0}
      role="link"
      onClick={() => navigate(teamPath)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigate(teamPath)
        }
      }}
    >
      <Link to={teamPath} className={styles.cardLinkOverlay} aria-label={`查看战队 ${staff.team.shortName}`} />

      <div className={styles.staffName}>
        <span className={styles.staffPrimary}>{staff.name}</span>
        {staff.battleTag && staff.battleTag !== staff.name ? (
          <span className={styles.staffSecondary} title={staff.battleTag}>{staff.battleTag}</span>
        ) : null}
      </div>

      <div className={styles.staffMetaGrid}>
        <div className={styles.staffMetaBlock}>
          <span className={styles.staffMetaLabel}>所属战队</span>
          <strong>{staff.team.shortName}</strong>
          <em>{staff.team.fullName}</em>
        </div>
        <div className={styles.staffMetaBlock}>
          <span className={styles.staffMetaLabel}>身份</span>
          <strong>{staff.roleLabel}</strong>
        </div>
      </div>

      <Link to={teamPath} className={styles.staffTeamLink} onClick={stop}>
        战队资料 →
      </Link>
    </article>
  )
}

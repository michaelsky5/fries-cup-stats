import { Link } from 'react-router-dom'
import styles from './PlayerCard.module.css'

function getRoleClass(role) {
  const r = String(role || '').toUpperCase()
  if (r === 'TANK') return styles.roleTank
  if (r === 'DPS') return styles.roleDps
  if (r === 'SUP' || r === 'SUPPORT') return styles.roleSup
  return styles.roleFlex
}

export default function PlayerCard({ player }) {
  const roleClass = getRoleClass(player.role)
  const roleText = player.role || 'FLEX'
  const teamShort = player.team_short_name || player.team_name || 'FREE AGENT'
  const displayName = player.display_name || player.player_id
  const realName = player.player_name || 'Unknown Player'

  return (
    <Link to={`/players/${player.player_id}`} className={`${styles.card} ${roleClass}`}>
      <div className={styles.cardGlow}></div>

      <div className={styles.top}>
        <div className={styles.roleTag}>{roleText}</div>
        <div className={styles.teamBlock}>
          <div className={styles.teamLabel}>TEAM</div>
          <div className={styles.teamTag} title={teamShort}>{teamShort}</div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.nameBlock}>
          <div className={styles.displayName} title={displayName}>{displayName}</div>
          <div className={styles.realName} title={realName}>{realName}</div>
        </div>

        <div className={styles.arrow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
import { Link } from 'react-router-dom'
import styles from './PlayerCard.module.css'

function getRoleClass(role) {
  const r = String(role || '').toUpperCase()
  if (r === 'TANK') return styles.roleTank
  if (r === 'DPS' || r === 'DAMAGE') return styles.roleDps // 🌟 兼容 DAMAGE
  if (r === 'SUP' || r === 'SUPPORT') return styles.roleSup
  return styles.roleFlex
}

function toNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatTimeCompact(value) {
  const mins = Math.round(toNum(value))
  if (!mins) return ''

  if (mins < 60) return `${mins} MIN`

  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!m) return `${h}H`
  return `${h}H ${m}M`
}

export default function PlayerCard({ player }) {
  // 卡片主色调依然使用选手最常玩的本职
  const roleClass = getRoleClass(player.role)
  
  // 🌟 核心升级：提取该选手所有打过的职责
  const availableRoles = player.role_breakdown && Object.keys(player.role_breakdown).length > 0
    ? Object.keys(player.role_breakdown).filter(r => (player.role_breakdown[r].raw_time_mins || 0) > 0)
    : [player.role || 'FLEX']

  const teamShort = player.team_short_name || player.team_name || 'FREE AGENT'
  const displayName = player.display_name || player.player_id
  const realName = player.player_name || 'Unknown Player'

  const mapsPlayed = toNum(player.maps_played)
  const timePlayed = formatTimeCompact(player.raw_time_mins || player.total_time_played)

  const subMetaParts = []
  if (mapsPlayed > 0) subMetaParts.push(`${mapsPlayed} MAP${mapsPlayed > 1 ? 'S' : ''}`)
  if (timePlayed) subMetaParts.push(timePlayed)
  const subMetaText = subMetaParts.join(' · ')

  return (
    <Link to={`/players/${player.player_id}`} className={`${styles.card} ${roleClass}`}>
      <div className={styles.cardGlow}></div>

      <div className={styles.top}>
        {/* 🌟 渲染多个职责标签 */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {availableRoles.map(r => (
            <div key={r} className={styles.roleTag}>{r}</div>
          ))}
        </div>

        <div className={styles.teamBlock}>
          <div className={styles.teamLabel}>TEAM</div>
          <div className={styles.teamTag} title={teamShort}>{teamShort}</div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.nameBlock}>
          <div className={styles.displayName} title={displayName}>{displayName}</div>
          <div className={styles.realName} title={realName}>{realName}</div>
          {subMetaText ? (
            <div className={styles.subMeta} title={subMetaText}>{subMetaText}</div>
          ) : null}
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
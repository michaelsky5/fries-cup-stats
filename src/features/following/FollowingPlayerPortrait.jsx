import { useState } from 'react'
import { getPlayerAvatarSource } from '../../lib/rosterSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import styles from './FollowingPlayerPortrait.module.css'

export default function FollowingPlayerPortrait({ player, db, locale, className = '' }) {
  const [failed, setFailed] = useState('')
  const total = (Array.isArray(db?.player_totals) ? db.player_totals : []).find(item => item.player_id === player?.player_id)
  const avatar = getPlayerAvatarSource({ ...player, ...total })
  const src = avatar.candidates[0]
  const label = `${locale === 'en-US' ? 'Most played hero' : '常用英雄'} · ${formatOwHeroName(avatar.heroName, locale)}`
  return <span className={`${styles.portrait} ${className}`}>
    {src && failed !== src ? <img src={src} alt={label} loading="lazy" onError={() => setFailed(src)} /> : <span aria-hidden="true">{avatar.initials}</span>}
  </span>
}

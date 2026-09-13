import { useState } from 'react'
import { accountAvatarSource } from './accountAvatar.js'
import styles from './AccountAvatar.module.css'

export default function AccountAvatar({ user, url, name, className = '', size, thumbnail = true, children }) {
  const src = accountAvatarSource(url === undefined ? user?.avatarUrl : url, thumbnail)
  const [failed, setFailed] = useState('')
  return <span className={`${styles.avatar} ${className}`} style={size ? { width: size, height: size } : undefined} aria-hidden="true" data-i18n-ignore>
    {src && failed !== src ? <img src={src} alt="" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(src)} /> : Array.from(String(name || user?.displayName || 'FC')).slice(0, 2).join('')}
    {children}
  </span>
}

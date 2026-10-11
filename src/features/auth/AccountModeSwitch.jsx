import { useState } from 'react'
import { useAuth } from './AuthProvider.jsx'
import styles from './AccountModeSwitch.module.css'

export default function AccountModeSwitch({ locale = 'zh-CN' }) {
  const { user, switchAccountMode } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user?.canSwitchAccountMode) return null
  const english = locale === 'en-US'
  const player = user.accountMode === 'PLAYER'
  const switchMode = async () => {
    setBusy(true)
    setError('')
    try { await switchAccountMode(player ? 'ADMIN' : 'PLAYER') }
    catch (error) { setError(error.message || (english ? 'Please try again.' : '切换失败，请重试。')) }
    finally { setBusy(false) }
  }
  return <div className={styles.bar} data-account-mode={user.accountMode} data-i18n-ignore>
    <div className={styles.status} role="status"><strong>{player ? english ? 'Player mode' : '选手模式' : english ? 'Administrator mode' : '管理员模式'}</strong>
      <span>{player ? english ? 'Administration is disabled' : '管理权限已关闭' : english ? 'Administration is enabled' : '管理权限已启用'}</span></div>
    <button type="button" disabled={busy} onClick={switchMode}>{busy ? english ? 'Switching…' : '正在切换…' : player ? english ? 'Switch to administrator' : '切换管理员' : english ? 'Switch to player' : '切换选手'}</button>
    {!player && <a href="https://admin.fries-cup.com/account-mode" target="_blank" rel="noopener noreferrer">{english ? 'Open System ↗' : '进入 System ↗'}</a>}
    {error && <span className={styles.error} role="alert">{error}</span>}
  </div>
}

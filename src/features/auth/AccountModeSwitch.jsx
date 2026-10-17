import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'
import { systemManagementLink } from './systemManagementLink.js'
import useAccountCompetition from '../my-space/useAccountCompetition.js'
import styles from './AccountModeSwitch.module.css'

export default function AccountModeSwitch({ locale = 'zh-CN', seasonId = '' }) {
  const { user, switchAccountMode } = useAuth()
  const { search } = useLocation()
  const competition = useAccountCompetition(seasonId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user?.canSwitchAccountMode) return null
  const english = locale === 'en-US'
  const player = user.accountMode === 'PLAYER'
  const systemLink = systemManagementLink({ search, seasonId: competition.navigationId || seasonId })
  const returningToTask = new URLSearchParams(search).has('systemReturnTo')
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
    {!player && systemLink && <a href={systemLink} target="_blank" rel="noopener noreferrer">{returningToTask ? english ? 'Return to task ↗' : '返回管理任务 ↗' : english ? 'Open System ↗' : '进入 System ↗'}</a>}
    {player && returningToTask && <span>{english ? 'Switch to administrator to continue your System task.' : '切换管理员后，可继续原来的 System 任务。'}</span>}
    {error && <span className={styles.error} role="alert">{error}</span>}
  </div>
}

import AccountAvatar from '../account-ui/AccountAvatar.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useState } from 'react'
import { useAuth } from './AuthProvider.jsx'
import styles from './AccountCenter.module.css'

const LABELS = { PLAYER: '选手', MANAGER: '队伍负责人', COACH: '教练', REFEREE: '赛管', CASTER: '解说' }

export default function FoundationAccountCenter({ locale = 'zh-CN', onLogout }) {
  const { user, accountProfile, accountIdentities, accountDataError, isAccountDataLoading, refreshAccountData, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const isEn = locale === 'en-US'
  const activeIdentities = accountIdentities.filter(identity => identity.isVerified)
  const runAction = async action => {
    setBusy(true)
    setActionError('')
    try { await action() } catch (error) {
      setActionError(error?.message || (isEn ? 'Action failed. Please try again.' : uiText("操作未完成，请重试。", locale)))
    } finally { setBusy(false) }
  }
  return (
    <section className={styles.accountCenter} aria-label={isEn ? 'Account status' : uiText("账号状态", locale)} aria-busy={isAccountDataLoading}>
      <div className={styles.profileCard}>
        <AccountAvatar className={styles.accountAvatar} user={user} />
        <div className={styles.profileMain}>
          <div className={styles.profileTitle}><strong>{user?.displayName || user?.email}</strong><em className={styles.statusBadge}>{isEn ? 'SIGNED IN' : uiText("已登录", locale)}</em></div>
          <span>{user?.email}</span>
          <p>{user?.emailVerified ? (isEn ? 'Email verified' : uiText("邮箱已验证", locale)) : (isEn ? 'Email not yet verified' : uiText("邮箱尚未验证", locale))}</p>
        </div>
      </div>
      {isAccountDataLoading ? <p className={styles.accountNotice}>{isEn ? 'Syncing account identities…' : uiText("正在同步账号身份…", locale)}</p> : accountDataError ? (
        <p className={styles.accountError} role="alert">{isEn ? 'Account identities could not be synced. Try refreshing.' : uiText("账号身份暂未同步成功，请刷新重试。", locale)}</p>
      ) : (
        <>
          <div className={styles.detailGrid}>
            <div><span>{isEn ? 'Active identities' : uiText("已关联身份", locale)}</span><strong>{activeIdentities.map(identity => isEn ? identity.identityType : LABELS[identity.identityType] || identity.identityType).join(' / ') || (isEn ? 'No event identity linked' : uiText("尚未关联赛事身份", locale))}</strong></div>
            <div><span>{isEn ? 'Nickname' : uiText("昵称", locale)}</span><strong>{accountProfile?.nickname || user?.displayName || '—'}</strong></div>
          </div>
          <p className={styles.accountNotice}>{isEn
            ? 'This release uses organizer invitations for identity linking. Self-service identity requests and extended account settings are not open yet.'
            : uiText("当前通过赛管邀请关联身份。自助身份申请与完整账号设置尚未开放；已关联队伍可按赛季权限进入周赛。", locale)}</p>
        </>
      )}
      {actionError ? <p className={styles.accountError} role="alert">{actionError}</p> : null}
      <button type="button" className={styles.primaryButton} disabled={busy || isAccountDataLoading} onClick={() => runAction(refreshAccountData)}>{isEn ? 'Refresh account' : uiText("刷新账号状态", locale)}</button>
      <button type="button" className={styles.logoutButton} disabled={busy} onClick={() => runAction(onLogout || logout)}>{busy ? (isEn ? 'Working…' : uiText("处理中…", locale)) : (isEn ? 'Sign Out' : uiText("退出登录", locale))}</button>
    </section>
  )
}

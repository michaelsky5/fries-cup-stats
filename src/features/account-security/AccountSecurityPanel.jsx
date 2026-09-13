import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { fetchContactPrivacy, fetchNotificationPreferences, updateNotificationPreferences } from '../auth/userDataApi.js'
import {
  changeAccountPassword,
  deactivateAccount,
  fetchAccountSecurity,
  requestAccountEmailAppeal,
  requestAccountEmailChange,
  revokeAccountSession,
  revokeOtherAccountSessions
} from './accountSecurityApi.js'
import { buildAccountSettingsView, DEFAULT_NOTIFICATION_PREFERENCES } from './accountSettingsModel.js'
import styles from './AccountSecurityPanel.module.css'

const IDENTITY_LABELS = {
  PLAYER: '选手',
  MANAGER: '经理',
  COACH: '教练',
  REFEREE: '赛管',
  CASTER: '解说'
}

const STATUS_LABELS = {
  PENDING: '审核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELLED: '已取消'
}

const EMAIL_APPEAL_LABELS = {
  PENDING_EMAIL_VERIFICATION: '请先验证新邮箱',
  PENDING_REVIEW: '人工换绑审核中',
  APPROVED: '邮箱换绑已通过',
  REJECTED: '邮箱换绑未通过',
  CANCELLED: '邮箱换绑申请已取消'
}

const ACTIVE_EMAIL_APPEAL_STATUSES = new Set(['PENDING_EMAIL_VERIFICATION', 'PENDING_REVIEW'])

const PRIVACY_GRANT_LABELS = {
  APPLICATION_REVIEW: '报名申请审核',
  TEAM_OPERATIONS: '本届队伍事务',
  SYSTEM_REVIEW: '身份认证审核'
}

const PRIVACY_END_LABELS = {
  APPLICATION_RESOLVED: '申请通过、拒绝或撤回时结束',
  TEAM_RELATION_ENDED: '本届队伍关系结束时终止',
  REVIEW_RESOLVED: '认证审核完成时结束'
}

const ACCESS_PURPOSE_LABELS = {
  APPLICATION_REVIEW: '审核队伍申请',
  TEAM_OPERATIONS: '处理队伍事务',
  SYSTEM_REVIEW: '处理身份认证'
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN', { hour12: false })
}

function getErrorMessage(error) {
  const code = error?.data?.error
  const messages = {
    PASSWORD_INVALID: '密码不正确。',
    EMAIL_ALREADY_IN_USE: '这个邮箱已被其他账号使用。',
    EMAIL_UNCHANGED: '新邮箱不能和当前邮箱相同。',
    EMAIL_VERIFICATION_REQUIRED: '请先验证当前邮箱。',
    ACTIVE_TEAM_MANAGER: '你仍是长期队伍的现任经理。请先在“我的队伍”完成经理交接，再注销账号。',
    ACTIVE_EVENT_STAFF_ASSIGNMENT: '你还有未结束的赛管或解说排班。请先联系 System 完成改派，再注销账号。',
    INVALID_INPUT: '请检查填写内容。',
    SESSION_NOT_FOUND: '该登录设备已经退出。'
  }
  return messages[code] || error?.message || '操作未完成，请稍后重试。'
}

function SecuritySection({ id, eyebrow, title, description, aside, children }) {
  return (
    <section id={id} className={styles.securitySection}>
      <header className={styles.sectionHeader}>
        <div><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
        {aside}
      </header>
      {children}
    </section>
  )
}

export default function AccountSecurityPanel({ seasonId = '' }) {
  const uiLocale = useUiLocale()
  const {
    accountIdentities = [],
    emailAppealState,
    emailVerificationState,
    logout,
    requestEmailVerification
  } = useAuth()
  const [security, setSecurity] = useState(null)
  const [notificationSettings, setNotificationSettings] = useState({ preference: DEFAULT_NOTIFICATION_PREFERENCES, mandatory: null })
  const [contactPrivacy, setContactPrivacy] = useState({ grants: [], recentAccesses: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' })
  const [appealForm, setAppealForm] = useState({ newEmail: '', password: '', reason: '' })
  const [appealOpen, setAppealOpen] = useState(false)
  const [deactivationForm, setDeactivationForm] = useState({ password: '', confirmation: '', reason: '' })

  const loadSecurity = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextSecurity, nextNotificationSettings, nextContactPrivacy] = await Promise.all([
        fetchAccountSecurity(),
        fetchNotificationPreferences().catch(() => null),
        fetchContactPrivacy(seasonId).catch(() => null)
      ])
      setSecurity(nextSecurity)
      if (nextNotificationSettings) setNotificationSettings(nextNotificationSettings)
      if (nextContactPrivacy) setContactPrivacy(nextContactPrivacy)
    } catch (nextError) {
      setError(getErrorMessage(nextError))
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => {
    loadSecurity()
  }, [emailAppealState?.status, emailVerificationState?.status, loadSecurity])

  const otherSessions = useMemo(
    () => (security?.sessions || []).filter(session => !session.current),
    [security?.sessions]
  )
  const activeAccountIdentities = useMemo(
    () => accountIdentities.filter(identity => identity?.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity?.status || '').toUpperCase())),
    [accountIdentities]
  )
  const settingsView = useMemo(() => buildAccountSettingsView({
    security,
    notificationSettings,
    contactPrivacy,
    identities: accountIdentities
  }), [accountIdentities, contactPrivacy, notificationSettings, security])

  const runAction = async (key, action, successText, { reload = true } = {}) => {
    setBusyAction(key)
    setError('')
    setMessage('')
    try {
      await action()
      setMessage(successText)
      if (reload) await loadSecurity()
      return true
    } catch (nextError) {
      const actionError = getErrorMessage(nextError)
      if (reload) await loadSecurity().catch(() => {})
      setError(actionError)
      return false
    } finally {
      setBusyAction('')
    }
  }

  const handlePasswordChange = async event => {
    event.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('两次输入的新密码不一致。')
      return
    }
    const changed = await runAction('password', () => changeAccountPassword(
      passwordForm.currentPassword,
      passwordForm.newPassword
    ), '密码已更新，其他设备已退出。')
    if (changed) setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const handleEmailChange = async event => {
    event.preventDefault()
    const requested = await runAction('email', () => requestAccountEmailChange(
      emailForm.newEmail,
      emailForm.password
    ), '确认邮件已分别发送到原邮箱和新邮箱。完成两边确认后邮箱才会变更。')
    if (requested) setEmailForm({ newEmail: '', password: '' })
  }

  const handleDeactivate = async event => {
    event.preventDefault()
    if (deactivationForm.confirmation !== '注销账号') {
      setError('请完整输入“注销账号”以确认。')
      return
    }
    const deactivated = await runAction('deactivate', () => deactivateAccount(
      deactivationForm.password,
      deactivationForm.confirmation,
      deactivationForm.reason
    ), '', { reload: false })
    if (deactivated) await logout()
  }

  const handleEmailAppeal = async event => {
    event.preventDefault()
    const requested = await runAction('email-appeal', () => requestAccountEmailAppeal(
      appealForm.newEmail,
      appealForm.password,
      appealForm.reason
    ), '验证邮件已发送到新邮箱。验证完成后申请会进入 System 审核。')
    if (requested) {
      setAppealForm({ newEmail: '', password: '', reason: '' })
      setAppealOpen(false)
    }
  }

  const handleNotificationChange = (field, value) => {
    setNotificationSettings(current => ({
      ...current,
      preference: { ...settingsView.notificationPreference, ...current.preference, [field]: value }
    }))
    setError('')
    setMessage('')
  }

  const handleNotificationSubmit = async event => {
    event.preventDefault()
    setBusyAction('notifications')
    setError('')
    setMessage('')
    try {
      const preference = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...notificationSettings.preference }
      const result = await updateNotificationPreferences(Object.fromEntries(
        Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map(key => [key, Boolean(preference[key])])
      ))
      setNotificationSettings(result)
      setMessage('通知偏好已保存；未来生成及尚未发送的可选通知会按新设置执行。')
    } catch (nextError) {
      setError(getErrorMessage(nextError))
    } finally {
      setBusyAction('')
    }
  }

  const scrollToTarget = target => {
    document.getElementById(`account-settings-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handlePrimaryAction = async () => {
    if (settingsView.action.key === 'verify-email') {
      await runAction('verify-email', requestEmailVerification, '验证邮件已发送，请检查邮箱。', { reload: false })
      return
    }
    scrollToTarget(settingsView.action.target)
  }

  if (loading && !security) return <div className={styles.loading}>{uiText("正在读取账号安全状态…", uiLocale)}</div>

  const emailRequest = security?.emailChangeRequest
  const emailAppeal = security?.emailAppeal
  const emailAppealActive = ACTIVE_EMAIL_APPEAL_STATUSES.has(emailAppeal?.status)
  const currentUser = security?.user || {}
  const notificationPreference = settingsView.notificationPreference

  return (
    <div className={styles.panel}>
      <section className={styles.securityHero}>
        <div><span>ACCOUNT SETTINGS</span><h1>{uiText("账号设置", uiLocale)}</h1><p>{uiText("集中管理登录安全、通知、隐私授权和长期身份记录；普通资料和新身份申请仍由顶部“账号中心”处理。", uiLocale)}</p></div>
        <dl>
          <div><dt>{uiText("登录邮箱", uiLocale)}</dt><dd>{currentUser.email || '—'}</dd></div>
          <div><dt>{uiText("邮箱状态", uiLocale)}</dt><dd>{currentUser.emailVerified ? uiText("已验证", uiLocale) : uiText("待验证", uiLocale)}</dd></div>
          <div><dt>{uiText("长期身份", uiLocale)}</dt><dd>{settingsView.counts.activeIdentities}</dd></div>
        </dl>
      </section>

      <section className={styles.primaryAction} data-action={settingsView.action.key}>
        <div><span>{settingsView.action.eyebrow}</span><strong>{settingsView.action.headline}</strong><p>{settingsView.action.description}</p><button type="button" disabled={Boolean(busyAction)} onClick={handlePrimaryAction}>{busyAction === 'verify-email' ? uiText("发送中…", uiLocale) : settingsView.action.label} →</button></div>
        <aside><span>ACCOUNT STATUS</span><strong>{settingsView.readiness.filter(item => item.complete).length}<small> / {settingsView.readiness.length}</small></strong><p>{uiText("邮箱、设备、通知、隐私和身份记录的当前状态。", uiLocale)}</p></aside>
      </section>

      <nav className={styles.settingsRail} aria-label={uiText("账号设置概览", uiLocale)}>
        {settingsView.readiness.map(item => <button key={item.key} type="button" data-complete={item.complete} onClick={() => scrollToTarget(item.target)}><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail || (item.complete ? uiText("状态正常", uiLocale) : uiText("需要处理", uiLocale))}</small></button>)}
      </nav>

      {error ? <div className={styles.feedback} data-tone="error" role="alert">{error}</div> : null}
      {message ? <div className={styles.feedback} data-tone="success" role="status">{message}</div> : null}

      <SecuritySection
        id="account-settings-sessions"
        eyebrow="ACTIVE SESSIONS"
        title={uiText("登录设备", uiLocale)}
        description={uiText("退出不认识的设备；设备被移除后，其现有登录凭证立即失效。", uiLocale)}
        aside={otherSessions.length ? <button type="button" onClick={() => runAction('revoke-all', revokeOtherAccountSessions, '其他设备已全部退出。')} disabled={Boolean(busyAction)}>{uiText("退出其他设备", uiLocale)}</button> : null}
      >
        <div className={styles.sessionList}>
          {(security?.sessions || []).map(session => (
            <article className={styles.sessionCard} data-current={session.current ? 'true' : 'false'} key={session.id}>
              <div className={styles.deviceMark}>{session.current ? 'NOW' : 'WEB'}</div>
              <div><strong>{session.deviceName || uiText("未知设备", uiLocale)}</strong><span>{session.ipAddress || uiText("IP 未记录", uiLocale)}{uiText(" · 最近活动 ", uiLocale)}{formatDateTime(session.lastSeenAt)}</span><small>{uiText("登录于 ", uiLocale)}{formatDateTime(session.createdAt)}{uiText(" · 到期 ", uiLocale)}{formatDateTime(session.expiresAt)}</small></div>
              {session.current ? <em>{uiText("当前设备", uiLocale)}</em> : <button type="button" disabled={Boolean(busyAction)} onClick={() => runAction(`session-${session.id}`, () => revokeAccountSession(session.id), '该设备已退出。')}>{uiText("退出", uiLocale)}</button>}
            </article>
          ))}
        </div>
      </SecuritySection>

      <div id="account-settings-credentials" className={styles.formGrid}>
        <SecuritySection eyebrow="PASSWORD" title={uiText("修改密码", uiLocale)} description={uiText("修改后保留当前设备，其他设备全部退出。", uiLocale)}>
          <form className={styles.securityForm} onSubmit={handlePasswordChange}>
            <label><span>{uiText("当前密码", uiLocale)}</span><input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={event => setPasswordForm(current => ({ ...current, currentPassword: event.target.value }))} required /></label>
            <label><span>{uiText("新密码", uiLocale)}</span><input type="password" autoComplete="new-password" minLength={8} value={passwordForm.newPassword} onChange={event => setPasswordForm(current => ({ ...current, newPassword: event.target.value }))} required /></label>
            <label><span>{uiText("确认新密码", uiLocale)}</span><input type="password" autoComplete="new-password" minLength={8} value={passwordForm.confirmPassword} onChange={event => setPasswordForm(current => ({ ...current, confirmPassword: event.target.value }))} required /></label>
            <div className={styles.passwordRules}><span data-done={passwordForm.newPassword.length >= 8}>{uiText("至少 8 个字符", uiLocale)}</span><span data-done={Boolean(passwordForm.newPassword) && passwordForm.newPassword !== passwordForm.currentPassword}>{uiText("不同于当前密码", uiLocale)}</span><span data-done={Boolean(passwordForm.confirmPassword) && passwordForm.newPassword === passwordForm.confirmPassword}>{uiText("两次输入一致", uiLocale)}</span></div>
            <button type="submit" disabled={Boolean(busyAction) || passwordForm.newPassword.length < 8 || passwordForm.newPassword !== passwordForm.confirmPassword}>{busyAction === 'password' ? uiText("更新中…", uiLocale) : uiText("更新密码", uiLocale)}</button>
          </form>
        </SecuritySection>

        <SecuritySection eyebrow="EMAIL" title={uiText("更换邮箱", uiLocale)} description={uiText("需要原邮箱和新邮箱分别确认；原邮箱不可用时请联系 System 人工处理。", uiLocale)}>
          {emailAppeal && !emailAppealActive ? (
            <div className={styles.emailPending} data-status={emailAppeal.status}>
              <strong>{EMAIL_APPEAL_LABELS[emailAppeal.status] || emailAppeal.status}</strong>
              <p>{emailAppeal.currentEmail} → {emailAppeal.newEmail}</p>
              <div>
                <span data-done="true">{uiText("新邮箱已验证", uiLocale)}</span>
                <span data-done={emailAppeal.status === 'APPROVED' ? 'true' : 'false'}>{emailAppeal.status === 'APPROVED' ? uiText("登录邮箱已更新", uiLocale) : uiText("可以重新提交申请", uiLocale)}</span>
              </div>
              <small>{emailAppeal.adminNote || (emailAppeal.status === 'APPROVED' ? uiText("所有旧登录设备已经退出，请使用新邮箱登录。", uiLocale) : uiText("审核时间 {0}", uiLocale, [formatDateTime(emailAppeal.reviewedAt)]))}</small>
            </div>
          ) : null}
          {emailAppealActive ? (
            <div className={styles.emailPending}>
              <strong>{EMAIL_APPEAL_LABELS[emailAppeal.status] || emailAppeal.status}</strong>
              <p>{emailAppeal.currentEmail} → {emailAppeal.newEmail}</p>
              <div>
                <span data-done={emailAppeal.newEmailConfirmedAt ? 'true' : 'false'}>{uiText("新邮箱", uiLocale)}{emailAppeal.newEmailConfirmedAt ? uiText("已验证", uiLocale) : uiText("待验证", uiLocale)}</span>
                <span data-done={emailAppeal.status === 'PENDING_REVIEW' ? 'true' : 'false'}>{emailAppeal.status === 'PENDING_REVIEW' ? uiText("等待 System 审核", uiLocale) : uiText("尚未进入审核", uiLocale)}</span>
              </div>
              <small>{emailAppeal.adminNote || uiText("验证链接有效期至 {0}", uiLocale, [formatDateTime(emailAppeal.expiresAt)])}</small>
            </div>
          ) : emailRequest ? (
            <div className={styles.emailPending}>
              <strong>{uiText("邮箱变更确认中", uiLocale)}</strong>
              <p>{emailRequest.currentEmail} → {emailRequest.newEmail}</p>
              <div><span data-done={emailRequest.currentEmailConfirmedAt ? 'true' : 'false'}>{uiText("原邮箱", uiLocale)}{emailRequest.currentEmailConfirmedAt ? uiText("已确认", uiLocale) : uiText("待确认", uiLocale)}</span><span data-done={emailRequest.newEmailConfirmedAt ? 'true' : 'false'}>{uiText("新邮箱", uiLocale)}{emailRequest.newEmailConfirmedAt ? uiText("已确认", uiLocale) : uiText("待确认", uiLocale)}</span></div>
              <small>{uiText("链接有效期至 ", uiLocale)}{formatDateTime(emailRequest.expiresAt)}</small>
            </div>
          ) : (
            <form className={styles.securityForm} onSubmit={handleEmailChange}>
              <label><span>{uiText("新邮箱", uiLocale)}</span><input type="email" autoComplete="email" value={emailForm.newEmail} onChange={event => setEmailForm(current => ({ ...current, newEmail: event.target.value }))} required /></label>
              <label><span>{uiText("当前密码", uiLocale)}</span><input type="password" autoComplete="current-password" value={emailForm.password} onChange={event => setEmailForm(current => ({ ...current, password: event.target.value }))} required /></label>
              <button type="submit" disabled={Boolean(busyAction) || !currentUser.emailVerified}>{busyAction === 'email' ? uiText("发送中…", uiLocale) : uiText("发送双重确认", uiLocale)}</button>
              {!currentUser.emailVerified ? <p className={styles.blockedNote}>{uiText("当前邮箱验证完成后才能发起普通双重确认换绑。", uiLocale)}</p> : null}
            </form>
          )}
          {!emailAppealActive ? (
            <div className={styles.appealFallback}>
              <button type="button" onClick={() => setAppealOpen(value => !value)}>{appealOpen ? uiText("收起人工申请", uiLocale) : uiText("原邮箱不可用？申请人工处理", uiLocale)}</button>
              {appealOpen ? (
                <form className={styles.securityForm} onSubmit={handleEmailAppeal}>
                  <p>{uiText("新邮箱验证成功后，System 会结合账号历史和申请理由人工判断；提交申请不会立即更改登录邮箱。", uiLocale)}</p>
                  <label><span>{uiText("希望换绑的新邮箱", uiLocale)}</span><input type="email" autoComplete="email" value={appealForm.newEmail} onChange={event => setAppealForm(current => ({ ...current, newEmail: event.target.value }))} required /></label>
                  <label><span>{uiText("当前密码", uiLocale)}</span><input type="password" autoComplete="current-password" value={appealForm.password} onChange={event => setAppealForm(current => ({ ...current, password: event.target.value }))} required /></label>
                  <label><span>{uiText("原邮箱不可用的原因", uiLocale)}</span><textarea minLength={10} maxLength={1000} value={appealForm.reason} onChange={event => setAppealForm(current => ({ ...current, reason: event.target.value }))} required /></label>
                  <button type="submit" disabled={Boolean(busyAction)}>{busyAction === 'email-appeal' ? uiText("提交中…", uiLocale) : uiText("验证新邮箱并提交审核", uiLocale)}</button>
                </form>
              ) : null}
            </div>
          ) : null}
        </SecuritySection>
      </div>

      <SecuritySection id="account-settings-notifications" eyebrow="NOTIFICATION DELIVERY" title={uiText("通知偏好", uiLocale)} description={uiText("决定普通提醒通过站内还是邮件送达；核心赛事待办和紧急公告仍会保留必达渠道。", uiLocale)} aside={<em className={styles.sectionBadge}>{uiText("未来通知生效", uiLocale)}</em>}>
        <form className={styles.notificationForm} onSubmit={handleNotificationSubmit}>
          <label className={styles.emailMaster}>
            <div><strong>{uiText("允许发送可选邮件", uiLocale)}</strong><small>{uiText("关闭后，普通提醒、公告和竞猜结果不再发送邮件。", uiLocale)}</small></div>
            <input type="checkbox" checked={Boolean(notificationPreference.emailEnabled)} onChange={event => handleNotificationChange('emailEnabled', event.target.checked)} />
            <i aria-hidden="true" />
          </label>
          <div className={styles.preferenceLegend}><span>{uiText("通知类型", uiLocale)}</span><em>{uiText("站内", uiLocale)}</em><em>{uiText("邮件", uiLocale)}</em></div>
          <div className={styles.preferenceRows}>
            <article>
              <div><strong>{uiText("赛事流程与待办", uiLocale)}</strong><small>{uiText("报名、阵容、赛程确认、申诉及审核结果", uiLocale)}</small></div>
              <label title={uiText("核心流程固定保留站内记录", uiLocale)}><input type="checkbox" checked readOnly disabled /><span>{uiText("固定", uiLocale)}</span></label>
              <label><input type="checkbox" checked={Boolean(notificationPreference.operationsEmail)} disabled={!notificationPreference.emailEnabled} onChange={event => handleNotificationChange('operationsEmail', event.target.checked)} /><span>{uiText("邮件", uiLocale)}</span></label>
            </article>
            <article>
              <div><strong>{uiText("比赛提醒", uiLocale)}</strong><small>{uiText("赛前 3 小时、1 小时和比赛房开放", uiLocale)}</small></div>
              <label><input type="checkbox" checked={Boolean(notificationPreference.matchReminderInApp)} onChange={event => handleNotificationChange('matchReminderInApp', event.target.checked)} /><span>{uiText("站内", uiLocale)}</span></label>
              <label><input type="checkbox" checked={Boolean(notificationPreference.matchReminderEmail)} disabled={!notificationPreference.emailEnabled} onChange={event => handleNotificationChange('matchReminderEmail', event.target.checked)} /><span>{uiText("邮件", uiLocale)}</span></label>
            </article>
            <article>
              <div><strong>{uiText("赛事公告", uiLocale)}</strong><small>{uiText("普通和重要公告；紧急或要求确认的公告除外", uiLocale)}</small></div>
              <label><input type="checkbox" checked={Boolean(notificationPreference.announcementInApp)} onChange={event => handleNotificationChange('announcementInApp', event.target.checked)} /><span>{uiText("站内", uiLocale)}</span></label>
              <label><input type="checkbox" checked={Boolean(notificationPreference.announcementEmail)} disabled={!notificationPreference.emailEnabled} onChange={event => handleNotificationChange('announcementEmail', event.target.checked)} /><span>{uiText("邮件", uiLocale)}</span></label>
            </article>
            <article>
              <div><strong>{uiText("竞猜结果", uiLocale)}</strong><small>{uiText("结算得分、冲正和本届排名相关结果", uiLocale)}</small></div>
              <label><input type="checkbox" checked={Boolean(notificationPreference.predictionInApp)} onChange={event => handleNotificationChange('predictionInApp', event.target.checked)} /><span>{uiText("站内", uiLocale)}</span></label>
              <label><input type="checkbox" checked={Boolean(notificationPreference.predictionEmail)} disabled={!notificationPreference.emailEnabled} onChange={event => handleNotificationChange('predictionEmail', event.target.checked)} /><span>{uiText("邮件", uiLocale)}</span></label>
            </article>
          </div>
          <div className={styles.mandatoryNotice}><strong>{uiText("必达规则", uiLocale)}</strong><p>{uiText("核心赛事待办始终保留站内记录；紧急公告和要求确认的公告始终通过站内与邮件送达。", uiLocale)}</p></div>
          <button type="submit" disabled={Boolean(busyAction)}>{busyAction === 'notifications' ? uiText("保存中…", uiLocale) : uiText("保存通知偏好", uiLocale)}</button>
        </form>
      </SecuritySection>

      <SecuritySection id="account-settings-privacy" eyebrow="CONTACT PRIVACY" title={uiText("隐私授权与查看记录", uiLocale)} description={uiText("QQ 和 Discord 不公开展示；只有流程中的授权角色可以按需查看，每次实际查看都会留痕。", uiLocale)} aside={<em className={styles.sectionBadge}>{settingsView.counts.privacyGrants}{uiText(" 项有效授权", uiLocale)}</em>}>
        <div className={styles.privacyColumns}>
          <section>
            <header><span>ACTIVE GRANTS</span><strong>{uiText("当前有效授权", uiLocale)}</strong></header>
            <div className={styles.privacyRecords}>
              {contactPrivacy.grants.length ? contactPrivacy.grants.map(grant => (
                <article key={grant.id}>
                  <div><strong>{PRIVACY_GRANT_LABELS[grant.grantType] || grant.grantType}</strong><em>{grant.seasonId || uiText("全局", uiLocale)}</em></div>
                  <p>{grant.teamOrganization ? `${grant.teamOrganization.shortName || grant.teamOrganization.name} · ` : ''}{grant.authorizedParty?.displayName || uiText("赛事管理方", uiLocale)}</p>
                  <small>{PRIVACY_END_LABELS[grant.endsWhen] || grant.endsWhen || uiText("流程结束后自动终止", uiLocale)}</small>
                </article>
              )) : <div className={styles.privacyEmpty}><strong>{uiText("当前没有有效授权", uiLocale)}</strong><span>{uiText("没有角色能够主动查看你的联系方式。", uiLocale)}</span></div>}
            </div>
          </section>
          <section>
            <header><span>ACCESS HISTORY</span><strong>{uiText("最近查看记录", uiLocale)}</strong></header>
            <div className={styles.privacyRecords}>
              {contactPrivacy.recentAccesses.length ? contactPrivacy.recentAccesses.map(access => (
                <article key={access.id}>
                  <div><strong>{access.viewer?.displayName || uiText("System 管理员", uiLocale)}</strong><em>{formatDateTime(access.accessedAt)}</em></div>
                  <p>{ACCESS_PURPOSE_LABELS[access.context?.purpose] || uiText("赛事审核", uiLocale)}{access.context?.teamName ? ` · ${access.context.teamName}` : ''}</p>
                  <small>{uiText("查看字段：", uiLocale)}{(access.context?.fields || []).join(' / ') || uiText("未记录", uiLocale)}</small>
                </article>
              )) : <div className={styles.privacyEmpty}><strong>{uiText("暂时没有查看记录", uiLocale)}</strong><span>{uiText("任何真实查看行为都会在这里留下时间与用途。", uiLocale)}</span></div>}
            </div>
          </section>
        </div>
      </SecuritySection>

      <SecuritySection id="account-settings-identity" eyebrow="IDENTITY HISTORY" title={uiText("长期身份与申请记录", uiLocale)} description={uiText("基础身份审核通过后长期有效；赛事队伍、阵容和工作人员关系仍按每届重新确认。", uiLocale)} aside={<em className={styles.sectionBadge}>{settingsView.counts.activeIdentities}{uiText(" 个长期身份", uiLocale)}</em>}>
        <div className={styles.activeIdentities}>
          {activeAccountIdentities.length ? activeAccountIdentities.map(identity => (
            <article key={identity.id || `${identity.identityType}-${identity.targetId || ''}`} data-verified={identity.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity.status || '').toUpperCase())}>
              <span>{IDENTITY_LABELS[identity.identityType] || identity.identityType}</span>
              <strong>{identity.targetId || identity.displayName || uiText("已认证身份", uiLocale)}</strong>
              <small>{identity.battleTag || identity.teamId || uiText("基础身份长期保留", uiLocale)}</small>
              <em>{identity.isVerified || ['ACTIVE', 'APPROVED'].includes(String(identity.status || '').toUpperCase()) ? uiText("长期有效", uiLocale) : (STATUS_LABELS[identity.status] || identity.status)}</em>
            </article>
          )) : <div className={styles.identityEmpty}><strong>{uiText("暂无长期赛事身份", uiLocale)}</strong><span>{uiText("普通观众无需认证；需要参赛或承担赛事职责时，可从顶部“账号中心”提交申请。", uiLocale)}</span></div>}
        </div>
        <div className={styles.identityTable}>
          {(security?.identityRequests || []).length ? (security.identityRequests.map(item => (
            <article key={item.id}>
              <div><strong>{IDENTITY_LABELS[item.identityType] || item.identityType}</strong><span>{item.seasonId}</span></div>
              <p>{[item.teamId, item.targetId].filter(Boolean).join(' · ') || uiText("工作人员身份", uiLocale)}</p>
              <em data-status={item.status}>{STATUS_LABELS[item.status] || item.status}</em>
              <time>{formatDateTime(item.reviewedAt || item.createdAt)}</time>
              {item.adminNote ? <small>{item.adminNote}</small> : null}
            </article>
          ))) : <div className={styles.empty}>{uiText("暂无身份申请记录。", uiLocale)}</div>}
        </div>
      </SecuritySection>

      <details className={styles.dangerZone}>
        <summary><span>DANGER ZONE</span><strong>{uiText("注销账号", uiLocale)}</strong><em>{uiText("展开", uiLocale)}</em></summary>
        <form onSubmit={handleDeactivate}>
          <p>{uiText("注销后将停止登录、清除联系方式与可删除的个人资料，并退出全部设备。历史比赛、正式阵容、赛果、积分流水和审计记录会继续保留；现任经理须先交接管理权，已有赛管或解说排班也须先由 System 改派。", uiLocale)}</p>
          <label><span>{uiText("当前密码", uiLocale)}</span><input type="password" autoComplete="current-password" value={deactivationForm.password} onChange={event => setDeactivationForm(current => ({ ...current, password: event.target.value }))} required /></label>
          <label><span>{uiText("可选原因", uiLocale)}</span><textarea maxLength={500} value={deactivationForm.reason} onChange={event => setDeactivationForm(current => ({ ...current, reason: event.target.value }))} /></label>
          <label><span>{uiText("输入“注销账号”", uiLocale)}</span><input type="text" autoComplete="off" value={deactivationForm.confirmation} onChange={event => setDeactivationForm(current => ({ ...current, confirmation: event.target.value }))} required /></label>
          <button type="submit" disabled={Boolean(busyAction) || !deactivationForm.password || deactivationForm.confirmation !== '注销账号'}>{busyAction === 'deactivate' ? uiText("处理中…", uiLocale) : uiText("确认注销账号", uiLocale)}</button>
        </form>
      </details>
    </div>
  )
}

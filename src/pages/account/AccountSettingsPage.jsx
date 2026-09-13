import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useLocation } from 'react-router-dom'
import AccountFrame from '../../features/account-ui/AccountFrame.jsx'
import AccountOverview from './AccountOverview.jsx'
import AccountAvatar from '../../features/account-ui/AccountAvatar.jsx'
import AvatarEditor from '../../features/account-ui/AvatarEditor.jsx'
import { translateAccountSettingsText } from '../../features/account-ui/accountSettingsCopy.js'
import { getStoredLocale } from '../../lib/i18n.js'
import useAccountCompetition from '../../features/my-space/useAccountCompetition.js'
import { getInitialSeasonId, withSeason } from '../../config/seasons.js'
import { ACCOUNT_SIGN_OUT_EVENT, canSignOutOfAccount, UNSAVED_ACCOUNT_MESSAGE } from '../../features/account-ui/accountNavigationGuard.js'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { updateUserProfile } from '../../features/auth/userDataApi.js'
import { REGION_GROUPS } from '../../features/auth/regionOptions.js'
import {
  changeAccountPassword, fetchAccountProfile, fetchAccountSessions,
  revokeAccountSession, revokeOtherAccountSessions
} from '../../features/account-security/accountSecurityApi.js'
import {
  accountSettingsError, buildAccountProfilePatch, createAccountProfileForm,
  emailVerificationNotice, validateAccountPassword
} from '../../features/account-security/accountFoundationSettings.js'
import styles from './AccountSettingsPage.module.css'

const SECTIONS = [
  ['overview', '00', '账号概览', 'OVERVIEW'],
  ['profile', '01', '个人资料', 'PROFILE'], ['password', '02', '修改密码', 'PASSWORD'],
  ['email', '03', '邮箱验证', 'EMAIL'], ['sessions', '04', '登录设备', 'DEVICES']
]

function Notice({ notice }) {
  if (!notice) return null
  return <p className={styles.notice} data-tone={notice.tone} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>
}

function Section({ id, title, description, children }) {
  return <section id={id} className={styles.card} aria-labelledby={`${id}-title`}>
    <header className={styles.cardHeader}><div><h2 id={`${id}-title`} tabIndex={-1}>{title}</h2><p>{description}</p></div></header>
    <div className={styles.cardBody}>{children}</div>
  </section>
}

function useMounted() {
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  return mounted
}

function ProfileSettings({ user, onDirtyChange }) {
  const uiLocale = useUiLocale()
  const { refreshSession, clearRevokedSession } = useAuth()
  const [record, setRecord] = useState(null)
  const [savedAvatar, setSavedAvatar] = useState(null)
  const [avatarDraft, setAvatarDraft] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState(null)
  const lock = useRef(false)
  const mounted = useMounted()
  const readOnly = ['GUEST', 'OPERATOR'].includes(user.role)
  const patch = form && record ? buildAccountProfilePatch(form, record) : {}
  if (avatarDraft) patch.avatar = avatarDraft.command
  const dirty = Object.keys(patch).length > 0
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setNotice(null)
    fetchAccountProfile({ signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return
      if (data.user.id !== user.id) { refreshSession().catch(() => {}); throw new Error('登录账号已变化，请重新读取账号资料。') }
      const next = createAccountProfileForm(data.user, data.profile)
      setRecord(next)
      setForm(next)
      setSavedAvatar(data.profile?.avatarUrl || null)
      setAvatarDraft(null)
    }).catch(error => {
      if (controller.signal.aborted) return
      if (error?.status === 401) clearRevokedSession()
      setNotice({ tone: 'error', text: accountSettingsError(error) })
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt, user.id, refreshSession, clearRevokedSession])

  async function save(event) {
    event.preventDefault()
    if (lock.current || !dirty || readOnly) return
    lock.current = true
    setBusy(true)
    setNotice(null)
    try {
      const result = await updateUserProfile(patch)
      if (!mounted.current) return
      if (result.user?.id !== user.id) throw new Error('账号资料响应发生变化，请重新登录核对。')
      const next = createAccountProfileForm(result.user, result.profile)
      setForm(next)
      setRecord(next)
      setSavedAvatar(result.profile?.avatarUrl || null)
      setAvatarDraft(null)
      setNotice({ tone: 'success', text: uiText("个人资料已保存。", uiLocale) })
      try { await refreshSession() } catch {
        if (mounted.current) setNotice({ tone: 'info', text: uiText("资料已保存，账号显示信息暂未刷新；稍后重新读取即可。", uiLocale) })
      }
    } catch (error) {
      if (!mounted.current) return
      if (error?.status === 401) clearRevokedSession()
      setNotice({ tone: 'error', text: accountSettingsError(error, uiLocale) })
    } finally {
      lock.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const field = name => ({ value: form[name], onChange: event => { setNotice(null); setForm(current => ({ ...current, [name]: event.target.value })) } })
  return <Section id="profile" number="01" title={uiText("个人资料", uiLocale)} description={uiText("设置账号的显示名称和介绍。赛事档案与队伍名单按参赛流程维护。", uiLocale)}>
    <Notice notice={notice} />
    {loading ? <p role="status">{uiText("正在读取个人资料…", uiLocale)}</p> : !form ? <button type="button" className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>{uiText("重新读取资料", uiLocale)}</button> : <form onSubmit={save}>
      {readOnly && <p className={styles.hint}>{uiText("当前账号的个人资料为只读。", uiLocale)}</p>}
      <AvatarEditor user={user} savedUrl={savedAvatar} draft={avatarDraft} onChange={value => { setAvatarDraft(value); setNotice(null) }} disabled={busy || readOnly} locale={uiLocale} />
      <div className={styles.profileLayout}>
      <fieldset disabled={busy || readOnly} className={styles.fields}>
        <label>{uiText("显示名称", uiLocale)}<input name="displayName" autoComplete="nickname" required maxLength={40} aria-describedby="display-name-hint" {...field('displayName')} /><small id="display-name-hint" className={styles.fieldHint}>{uiText("账号入口与站内交流时显示的名字", uiLocale)}</small></label>
        <label><span>{uiText("个人昵称 ", uiLocale)}<small className={styles.optional}>{uiText("选填", uiLocale)}</small></span><input name="nickname" maxLength={40} aria-describedby="nickname-hint" {...field('nickname')} /><small id="nickname-hint" className={styles.fieldHint}>{uiText("补充个人称呼，不会修改游戏 ID", uiLocale)}</small></label>
        <label>{uiText("国家／地区", uiLocale)}<select name="regionCode" {...field('regionCode')}><option value="">{uiText("未设置", uiLocale)}</option>{form.regionCode && !REGION_GROUPS.some(group => group.options.some(option => option.value === form.regionCode)) && <option value={form.regionCode}>{form.regionCode}</option>}{REGION_GROUPS.map(group => <optgroup key={group.value} label={group.zh}>{group.options.map(option => <option key={option.value} value={option.value}>{option.zh}</option>)}</optgroup>)}</select></label>
        <label className={styles.wide}>{uiText("个人介绍", uiLocale)}<textarea name="bio" rows={3} maxLength={280} {...field('bio')} /><small>{form.bio.length} / 280</small></label>
      </fieldset>
      <aside className={styles.profilePreview} aria-label={uiText("个人资料预览", uiLocale)}><div className={styles.previewHeading}><span>{uiText("展示预览", uiLocale)}</span><small>{dirty ? uiText("尚未保存", uiLocale) : uiText("已保存的资料", uiLocale)}</small></div><AccountAvatar className={styles.previewAvatar} url={avatarDraft ? avatarDraft.url : savedAvatar} name={form.displayName} thumbnail={false} /><strong data-i18n-ignore>{form.displayName.trim() || '—'}</strong>{form.nickname.trim() && <span data-i18n-ignore>{form.nickname}</span>}<p data-i18n-ignore>{form.bio.trim() || '—'}</p><small>{uiText("这里只预览账号资料；赛事档案与出赛名单不会随之修改。", uiLocale)}</small></aside>
      </div>
      <div className={styles.saveBar}><span className={styles.hint} aria-live="polite">{dirty ? uiText("有尚未保存的修改", uiLocale) : readOnly ? uiText("只读资料", uiLocale) : uiText("资料已同步，可继续编辑", uiLocale)}</span><div className={styles.inlineActions}><button type="button" className={styles.secondary} disabled={busy || !dirty} onClick={() => { setForm(record); setAvatarDraft(null); setNotice(null) }}>{uiText("撤销修改", uiLocale)}</button><button className={styles.primary} disabled={busy || !dirty || readOnly}>{busy ? uiText("正在保存…", uiLocale) : uiText("保存资料", uiLocale)}</button></div></div>
    </form>}
  </Section>
}

function PasswordSettings({ user, onRevoked, onDirtyChange }) {
  const uiLocale = useUiLocale()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' })
  const [visible, setVisible] = useState({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const lock = useRef(false)
  const mounted = useMounted()
  const { clearRevokedSession } = useAuth()
  const dirty = Object.values(form).some(Boolean)
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])
  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    const error = validateAccountPassword(form)
    if (error) { setNotice({ tone: 'error', text: error }); return }
    lock.current = true
    setBusy(true)
    setNotice(null)
    try {
      const result = await changeAccountPassword(form.currentPassword, form.newPassword)
      if (!mounted.current) return
      if (result?.changed !== true || result?.allSessionsRevoked !== true) throw new Error('改密结果尚未确认，请重新登录核对。')
      setForm({ currentPassword: '', newPassword: '', confirmation: '' })
      onRevoked('密码已更新，所有登录设备均已退出。请使用新密码登录。')
      clearRevokedSession()
    } catch (error) {
      if (!mounted.current) return
      if (error?.status === 401 || error?.data?.error === 'ACCOUNT_CREDENTIALS_CHANGED') clearRevokedSession()
      setNotice({ tone: 'error', text: accountSettingsError(error) })
    } finally {
      lock.current = false
      if (mounted.current) setBusy(false)
    }
  }
  return <Section id="password" number="02" title={uiText("修改密码", uiLocale)} description={uiText("更新密码后，包含当前设备在内的所有登录设备都会退出。", uiLocale)}>
    <Notice notice={notice} />
    {user.role === 'GUEST' ? <p className={styles.hint}>{uiText("共享游客账号不能自行修改密码。", uiLocale)}</p> : <form onSubmit={submit}>
      <input type="text" autoComplete="username" value={user.email} readOnly hidden aria-hidden="true" />
      <fieldset disabled={busy} className={styles.fields}>
        {[['currentPassword', '当前密码', 'current-password'], ['newPassword', '新密码', 'new-password'], ['confirmation', '确认新密码', 'new-password']].map(([key, label, autoComplete]) => <div className={key === 'currentPassword' ? styles.wide : undefined} key={key}><label htmlFor={key}>{label}</label><div className={styles.passwordInput}><input id={key} type={visible[key] ? 'text' : 'password'} name={key} autoComplete={autoComplete} required minLength={key === 'currentPassword' ? undefined : 8} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} aria-describedby="password-hint" /><button type="button" aria-label={`${visible[key] ? '隐藏' : '显示'}${label}`} aria-pressed={Boolean(visible[key])} onClick={() => setVisible(value => ({ ...value, [key]: !value[key] }))}>{visible[key] ? uiText("隐藏", uiLocale) : uiText("显示", uiLocale)}</button></div></div>)}
      </fieldset>
      <p id="password-hint" className={styles.hint}>{uiText("新密码至少 8 位，不超过 72 个 UTF-8 字节；中文字符会占用多个字节。", uiLocale)}</p>
      <div className={styles.securityImpact}><strong>{uiText("更新后需要重新登录", uiLocale)}</strong><p>{uiText("当前设备和其他设备都会退出。请确认你能使用新密码重新登录。", uiLocale)}</p></div>
      <div className={styles.saveBar}><span className={styles.hint}>{uiText("仅提交后才会更新密码", uiLocale)}</span><button className={styles.primary} disabled={busy || !dirty}>{busy ? uiText("正在更新…", uiLocale) : uiText("更新密码并退出登录", uiLocale)}</button></div>
    </form>}
  </Section>
}

function EmailSettings({ user }) {
  const uiLocale = useUiLocale()
  const { authConfig, authConfigError, retryAuthConfig, emailVerificationState, requestEmailVerification, refreshSession, clearRevokedSession } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshNotice, setRefreshNotice] = useState(null)
  const mounted = useMounted()
  const lock = useRef(false)
  const pending = ['SENDING', 'VERIFYING'].includes(emailVerificationState.status)
  async function refresh() {
    if (lock.current) return
    lock.current = true
    setRefreshing(true)
    setRefreshNotice(null)
    try {
      const current = await refreshSession()
      if (mounted.current && current?.id === user.id) setRefreshNotice({ tone: current.emailVerified ? 'success' : 'info', text: current.emailVerified ? uiText("邮箱已验证。", uiLocale) : uiText("邮箱尚未完成验证。打开验证邮件中的链接后，可再次刷新。", uiLocale) })
    } catch (error) { if (mounted.current) setRefreshNotice({ tone: 'error', text: accountSettingsError(error) }) }
    finally { lock.current = false; if (mounted.current) setRefreshing(false) }
  }
  async function send() {
    if (lock.current || pending || !authConfig?.emailVerificationEnabled) return
    lock.current = true
    setRefreshNotice(null)
    try { await requestEmailVerification() } catch (error) { if (error?.status === 401) clearRevokedSession() }
    finally { lock.current = false }
  }
  return <Section id="email" number="03" title={uiText("邮箱验证", uiLocale)} description={uiText("受邀邮箱用于登录和接收账号验证邮件。", uiLocale)}>
    <div className={styles.emailAddress}><span className={styles.hint}>{uiText("当前登录邮箱", uiLocale)}</span><div className={styles.emailLine}><strong data-i18n-ignore>{user.email}</strong><span className={styles.badge} data-ready={user.emailVerified === true}>{user.emailVerified === true ? uiText("已验证", uiLocale) : user.emailVerified === false ? uiText("待验证", uiLocale) : uiText("状态待确认", uiLocale)}</span></div></div>
    <Notice notice={refreshNotice || emailVerificationNotice(emailVerificationState)} />
    {user.emailVerified ? <div className={styles.securityImpact}><strong>{uiText("邮箱验证已完成", uiLocale)}</strong><p>{uiText("这表示登录邮箱已验证；队伍与参赛身份仍按邀请认领流程关联。", uiLocale)}</p></div> : <ol className={styles.verificationSteps}><li><span aria-hidden="true">01</span><div><strong>{uiText("发送验证邮件", uiLocale)}</strong><p>{uiText("邮件会发送到上方的登录邮箱。", uiLocale)}</p></div></li><li><span aria-hidden="true">02</span><div><strong>{uiText("打开邮件中的链接", uiLocale)}</strong><p>{uiText("未收到时，请检查垃圾邮件或稍后重试。", uiLocale)}</p></div></li><li><span aria-hidden="true">03</span><div><strong>{uiText("回到这里核对状态", uiLocale)}</strong><p>{uiText("完成后点击“刷新验证状态”。", uiLocale)}</p></div></li></ol>}
    {!user.emailVerified && <>
      {authConfigError ? <Notice notice={{ tone: 'error', text: uiText("暂时无法读取邮件服务状态。", uiLocale) }} /> : authConfig?.emailVerificationEnabled === false ? <Notice notice={{ tone: 'info', text: uiText("邮件服务暂未开放，目前无法发送验证邮件。请联系赛事负责人核对账号邮箱。", uiLocale) }} /> : !authConfig ? <p role="status">{uiText("正在读取邮件服务状态…", uiLocale)}</p> : null}
      <div className={styles.actions}><button type="button" className={styles.primary} onClick={send} disabled={pending || refreshing || authConfig?.emailVerificationEnabled !== true}>{pending ? uiText("正在处理…", uiLocale) : uiText("发送验证邮件", uiLocale)}</button><button type="button" className={styles.secondary} onClick={refresh} disabled={pending || refreshing}>{refreshing ? uiText("正在刷新…", uiLocale) : uiText("刷新验证状态", uiLocale)}</button>{authConfigError && <button type="button" className={styles.secondary} onClick={retryAuthConfig}>{uiText("重试服务状态", uiLocale)}</button>}</div>
    </>}
  </Section>
}

function formatTime(value) {
  const date = new Date(value)
  return value && Number.isFinite(date.getTime()) ? date.toLocaleString('zh-CN', { hour12: false }) : '暂无记录'
}

function SessionSettings({ onRevoked }) {
  const uiLocale = useUiLocale()
  const { clearRevokedSession, logout } = useAuth()
  const [sessions, setSessions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [confirmation, setConfirmation] = useState(null)
  const mounted = useMounted()
  const lock = useRef(false)
  async function signOut() {
    if (!canSignOutOfAccount()) { setNotice({ tone: 'info', text: UNSAVED_ACCOUNT_MESSAGE }); return }
    if (lock.current) return
    lock.current = true
    setBusy('logout')
    setNotice(null)
    try {
      await logout()
      onRevoked('当前设备已退出登录。')
    } catch (error) {
      if (mounted.current) setNotice({ tone: 'error', text: accountSettingsError(error) })
    } finally { lock.current = false; if (mounted.current) setBusy('') }
  }
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetchAccountSessions({ signal: controller.signal }).then(next => {
      if (!controller.signal.aborted) { setSessions(next); setNotice(null) }
    }).catch(error => {
      if (controller.signal.aborted) return
      if (error?.status === 401) clearRevokedSession()
      setSessions(null)
      setNotice({ tone: 'error', text: accountSettingsError(error) })
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt, clearRevokedSession])

  async function revoke(session) {
    if (lock.current || loading) return
    if (session?.current && !canSignOutOfAccount()) { setNotice({ tone: 'info', text: UNSAVED_ACCOUNT_MESSAGE }); return }
    lock.current = true
    setBusy(session?.id || 'others')
    setNotice(null)
    try {
      const result = await (session ? revokeAccountSession(session.id) : revokeOtherAccountSessions())
      if (!mounted.current) return
      if (result?.currentSessionRevoked) {
        onRevoked('当前设备已退出登录。')
        clearRevokedSession()
        return
      }
      if (session ? result?.revoked !== true : typeof result?.revokedCount !== 'number') throw new Error('设备退出结果尚未确认，请刷新列表核对。')
      setSessions(current => current?.filter(item => session ? item.id !== session.id : item.current))
      setNotice({ tone: 'success', text: session ? uiText("已退出这台设备。", uiLocale) : uiText("已结束其他 {0} 条登录，当前设备保持登录。", uiLocale, [result.revokedCount]) })
      try {
        const next = await fetchAccountSessions()
        if (mounted.current) setSessions(next)
      } catch (error) {
        if (!mounted.current) return
        if (error?.status === 401) clearRevokedSession()
        setSessions(null)
        setNotice({ tone: 'info', text: uiText("退出操作已完成，最新设备列表暂未同步，请刷新列表。", uiLocale) })
      }
    } catch (error) {
      if (!mounted.current) return
      if (error?.status === 401) clearRevokedSession()
      setNotice({ tone: 'error', text: accountSettingsError(error) })
    } finally { lock.current = false; if (mounted.current) setBusy('') }
  }
  const otherCount = sessions?.filter(session => !session.current).length || 0
  const orderedSessions = sessions ? [...sessions].sort((a, b) => Number(Boolean(b.current)) - Number(Boolean(a.current))) : null
  const dismissConfirmation = useCallback(() => setConfirmation(null), [])
  const confirmExit = () => {
    const action = confirmation
    setConfirmation(null)
    if (action.kind === 'logout') signOut()
    else revoke(action.kind === 'others' ? null : action.session)
  }
  return <Section id="sessions" number="04" title={uiText("登录设备", uiLocale)} description={uiText("查看仍然有效的登录会话，退出不再使用的设备。", uiLocale)}>
    {confirmation && <ConfirmationDialog title={confirmation.kind === 'others' ? uiText("退出其他所有设备？", uiLocale) : confirmation.kind === 'logout' || confirmation.session?.current ? uiText("退出当前设备？", uiLocale) : uiText("退出这台设备？", uiLocale)} description={confirmation.kind === 'others' ? uiText("将结束其他 {0} 条有效登录，当前设备保持登录。其他设备需要重新登录才能继续使用账号。", uiLocale, [otherCount]) : confirmation.kind === 'logout' || confirmation.session?.current ? uiText("退出后，将回到登录入口。你可以随时使用账号密码重新登录。", uiLocale) : uiText("设备「{0}」将退出登录，当前设备保持登录。", uiLocale, [confirmation.session.deviceName || '未知设备'])} confirmLabel="确认退出" cancelLabel="取消" onCancel={dismissConfirmation} onConfirm={confirmExit} />}
    <div className={styles.sessionToolbar}><div><strong>{loading ? uiText("正在核对登录记录", uiLocale) : sessions ? uiText("{0} 条有效登录", uiLocale, [sessions.length]) : uiText("设备列表暂未同步", uiLocale)}</strong><p>{uiText("每条记录对应一次登录，同一设备可能有多条记录。", uiLocale)}</p></div><button type="button" className={styles.secondary} onClick={() => setAttempt(value => value + 1)} disabled={loading || Boolean(busy)}>{loading ? uiText("正在读取…", uiLocale) : uiText("刷新设备列表", uiLocale)}</button></div>
    <Notice notice={notice} />
    {!loading && !sessions?.some(session => session.current) && <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setConfirmation({ kind: 'logout' })} disabled={Boolean(busy)}>{busy === 'logout' ? uiText("正在退出…", uiLocale) : uiText("退出当前登录", uiLocale)}</button></div>}
    {loading ? <p role="status">{uiText("正在读取登录设备…", uiLocale)}</p> : sessions?.length === 0 ? <p className={styles.hint}>{uiText("暂无有效设备会话记录。可退出后重新登录以建立新的会话。", uiLocale)}</p> : orderedSessions && <ul className={styles.sessions}>{orderedSessions.map(session => <li key={session.id} data-current={Boolean(session.current)}>
      <div className={styles.deviceIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M8 21h8M12 16v5" /></svg></div><div className={styles.deviceDetails}><div className={styles.deviceTitle}><strong data-i18n-ignore>{session.deviceName || '—'}</strong>{session.current && <span className={styles.badge} data-ready>{uiText("当前设备", uiLocale)}</span>}</div><span>{uiText("最近活动 · ", uiLocale)}{formatTime(session.lastSeenAt)}</span><small>{uiText("登录时间 ", uiLocale)}{formatTime(session.createdAt)} · IP {session.ipAddress || uiText("未记录", uiLocale)}</small></div>
      <button type="button" className={styles.secondary} disabled={Boolean(busy)} onClick={() => setConfirmation({ kind: 'session', session })} aria-label={session.current ? uiText("退出当前设备", uiLocale) : uiText("退出设备 {0}", uiLocale, [session.deviceName || '未知设备'])}>{busy === session.id ? uiText("正在退出…", uiLocale) : session.current ? uiText("退出当前设备", uiLocale) : uiText("退出设备", uiLocale)}</button>
    </li>)}</ul>}
    <div className={styles.saveBar}><span className={styles.hint}>{uiText("不认识某条登录记录？可先退出该设备，再修改密码。", uiLocale)}</span><button type="button" className={styles.secondary} disabled={loading || Boolean(busy) || otherCount === 0 || !sessions?.some(session => session.current)} onClick={() => setConfirmation({ kind: 'others' })}>{busy === 'others' ? uiText("正在退出…", uiLocale) : uiText("退出其他所有设备", uiLocale)}</button></div>
  </Section>
}

function ConfirmationDialog({ title, description, cancelLabel, confirmLabel, onCancel, onConfirm }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onCancel() }
      if (event.key !== 'Tab') return
      const buttons = dialogRef.current?.querySelectorAll('button')
      const first = buttons?.[0]
      const last = buttons?.[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onCancel])
  return <div ref={dialogRef} className={styles.leavePrompt} role="alertdialog" aria-modal="true" aria-labelledby="account-confirm-title" aria-describedby="account-confirm-description"><div><h2 id="account-confirm-title">{title}</h2><p id="account-confirm-description">{description}</p><div className={styles.actions}><button type="button" className={styles.secondary} onClick={onCancel}>{cancelLabel}</button><button type="button" className={styles.primary} onClick={onConfirm}>{confirmLabel}</button></div></div></div>
}

function SettingsWorkspace({ user, onRevoked }) {
  const uiLocale = useUiLocale()
  const location = useLocation()
  const competition = useAccountCompetition(getInitialSeasonId())
  const spaceHref = competition.link(withSeason('/me', getInitialSeasonId(), location.search))
  const section = SECTIONS.some(([id]) => `#${id}` === location.hash) ? location.hash.slice(1) : 'overview'
  const [dirty, setDirty] = useState(false)
  const onDirtyChange = useCallback(value => setDirty(value), [])
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search || currentLocation.hash !== nextLocation.hash))
  const cards = useRef(null)
  const previousSection = useRef(section)
  useEffect(() => {
    if (previousSection.current !== section) cards.current?.querySelector('h2')?.focus({ preventScroll: true })
    previousSection.current = section
  }, [section])
  useEffect(() => {
    if (!dirty) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    const protectDraft = event => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    window.addEventListener(ACCOUNT_SIGN_OUT_EVENT, protectDraft)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener(ACCOUNT_SIGN_OUT_EVENT, protectDraft) }
  }, [dirty])
  return <div className={styles.workspace}>
    {blocker.state === 'blocked' && <ConfirmationDialog title={uiText("修改尚未保存", uiLocale)} description={uiText("离开后，本页尚未提交的内容会丢失。", uiLocale)} cancelLabel="继续编辑" confirmLabel="放弃修改并离开" onCancel={blocker.reset} onConfirm={blocker.proceed} />}
    <aside className={styles.sidebar}><span className={styles.kicker}>{uiText("账号设置", uiLocale)}</span><nav aria-label={uiText("账号设置分区", uiLocale)}>{SECTIONS.map(([id, , title, english]) => <Link key={id} to={{ pathname: location.pathname, search: location.search, hash: `#${id}` }} aria-current={section === id ? 'page' : undefined}><strong>{title}<small>{english}</small></strong><i aria-hidden="true">→</i></Link>)}</nav><p>{uiText("报名、队伍和比赛事务", uiLocale)}<br />{uiText("可以在我的空间处理。", uiLocale)}</p><Link to={spaceHref}>{uiText("返回我的空间 ↗", uiLocale)}</Link></aside>
    <div className={styles.cards} ref={cards}>
      {section === 'overview' && <AccountOverview user={user} spaceHref={spaceHref} />}
      {section === 'profile' && <ProfileSettings user={user} onDirtyChange={onDirtyChange} />}
      {section === 'password' && <PasswordSettings user={user} onRevoked={onRevoked} onDirtyChange={onDirtyChange} />}
      {section === 'email' && <EmailSettings user={user} />}
      {section === 'sessions' && <SessionSettings onRevoked={onRevoked} />}
    </div>
  </div>
}

export default function AccountSettingsPage() {
  const { user, isBootstrapping, accountDataError } = useAuth()
  const location = useLocation()
  const [signedOutNotice, setSignedOutNotice] = useState('')
  const locale = new URLSearchParams(location.search).get('lang') || getStoredLocale()
  useEffect(() => {
    const previousTitle = document.title
    document.title = `${translateAccountSettingsText('账号设置', locale)} | 薯条杯`
    return () => { document.title = previousTitle }
  }, [locale])
  return <AccountFrame compact title={uiText("账号设置", locale)} eyebrow="ACCOUNT SETTINGS" description={uiText("管理你的个人资料与账号安全。", locale)} aside={<div className={styles.identity}><AccountAvatar className={styles.avatar} user={user} /><div><strong data-i18n-ignore={user ? '' : undefined}>{user?.displayName || (isBootstrapping ? uiText("正在核对账号…", locale) : uiText("受邀账号", locale))}</strong><span data-i18n-ignore={user ? '' : undefined}>{user?.email || uiText("登录后管理账号", locale)}</span></div></div>}>
    <div className={styles.page}>
      {isBootstrapping ? <section className={styles.guest} role="status"><h2>{uiText("正在核对登录状态…", locale)}</h2></section> : user ? <SettingsWorkspace key={user.id} user={user} onRevoked={setSignedOutNotice} /> : <section className={styles.guest}>
        <span className={styles.kicker}>ACCOUNT ACCESS</span><h2>{uiText("欢迎回到薯条杯", locale)}</h2><Notice notice={signedOutNotice ? { tone: 'success', text: signedOutNotice } : accountDataError ? { tone: 'error', text: accountSettingsError(accountDataError, locale) } : null} /><p>{uiText("使用受邀邮箱登录，即可管理资料和安全设置。首次参加，请打开赛事负责人或队长提供的邀请链接。", locale)}</p><button type="button" className={styles.primary} onClick={() => window.dispatchEvent(new Event('fries-cup:open-account'))}>{uiText("登录账号 →", locale)}</button><Link className={styles.guestLink} to={withSeason('/me', getInitialSeasonId(), location.search)}>{uiText("前往我的空间 ↗", locale)}</Link>
      </section>}
    </div>
  </AccountFrame>
}

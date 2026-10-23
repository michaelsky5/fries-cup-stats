import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { platformRequest } from '../auth/platformApi.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { withLocale } from '../../lib/locales.js'
import { accountSettingsError } from './accountFoundationSettings.js'
import styles from '../../pages/account/AccountSettingsPage.module.css'

export default function EmailChangePanel({ user, onDirtyChange }) {
  const locale = useUiLocale(), { clearRevokedSession, emailChangeState } = useAuth()
  const [request, setRequest] = useState(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [newEmail, setNewEmail] = useState(''), [password, setPassword] = useState(''), [notice, setNotice] = useState(null), [version, setVersion] = useState(0)
  const lock = useRef(false), editing = useRef(false), feedback = useRef(null)
  editing.current = Boolean(newEmail || password)
  useEffect(() => { onDirtyChange?.(Boolean(newEmail || password)); return () => onDirtyChange?.(false) }, [newEmail, password, onDirtyChange])
  useEffect(() => { if (!loading && (notice?.tone === 'error' || loadError)) feedback.current?.focus() }, [notice, loadError, loading])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setLoadError('')
    platformRequest('/me/email-change-request', { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setRequest(data.request) })
      .catch(error => { if (!controller.signal.aborted) { setLoadError(accountSettingsError(error)); if (error.status === 401) clearRevokedSession() } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [version, user.id, emailChangeState.status, clearRevokedSession])
  useEffect(() => {
    const refresh = () => { if (document.visibilityState !== 'hidden' && !lock.current && !editing.current) setVersion(value => value + 1) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  async function reconcileRequest(error) {
    if (error.status === 401) { clearRevokedSession(); return }
    setLoading(true); setLoadError('')
    try {
      const data = await platformRequest('/me/email-change-request')
      setRequest(data.request)
      if (data.request) setNewEmail('')
      setNotice(current => current ? { ...current, synced: true } : current)
    } catch (readError) {
      setLoadError(accountSettingsError(readError))
      if (readError.status === 401) clearRevokedSession()
    } finally { setLoading(false) }
  }
  async function submit(event) {
    event.preventDefault()
    if (lock.current || loading || loadError) return
    if (!request && newEmail.trim().toLowerCase() === user.email.toLowerCase()) { setNotice({ tone: 'error', text: uiText('新邮箱需要与当前登录邮箱不同。', locale) }); return }
    lock.current = true; setBusy(true); setNotice(null)
    try {
      const data = await platformRequest('/me/email-change-requests', { method: 'POST', body: { newEmail: request?.newEmail || newEmail.trim(), password } })
      setRequest(data.request); setPassword(''); setNewEmail('')
      const delivered = data.delivery.current.delivered && data.delivery.new.delivered
      const queued = [data.delivery.current, data.delivery.new].every(item => item.queued || item.delivered) && !delivered
      setNotice({ tone: queued ? 'info' : delivered ? 'success' : 'error', text: queued
        ? uiText('确认邮件已排队，系统会自动重试发送。请分别检查原邮箱和新邮箱；两边确认后才会更换。', locale)
        : delivered
        ? uiText('确认邮件已交给投递服务。请分别打开原邮箱和新邮箱的邮件；两边确认后才会更换。', locale)
        : uiText('换绑申请已保存，但至少一封确认邮件未投递。请稍后重发；重发会使旧确认链接失效。', locale) })
    } catch (error) { setPassword(''); setNotice({ tone: 'error', text: accountSettingsError(error) }); await reconcileRequest(error) }
    finally { lock.current = false; setBusy(false) }
  }
  async function cancel() {
    if (lock.current || loading || loadError || !request) return
    lock.current = true; setBusy(true)
    try { await platformRequest('/me/email-change-request', { method: 'DELETE', body: { id: request.id } }); setRequest(null); setPassword(''); setNotice({ tone: 'info', text: uiText('换绑申请已取消，原邮箱继续使用。', locale) }) }
    catch (error) { setPassword(''); setNotice({ tone: 'error', text: accountSettingsError(error) }); await reconcileRequest(error) }
    finally { lock.current = false; setBusy(false) }
  }
  return <section className={styles.emailChange} aria-labelledby="email-change-heading">
    <h3 id="email-change-heading">{uiText('更换邮箱', locale)}</h3><p className={styles.hint}>{uiText('验证当前密码，并分别确认新旧邮箱。完成后所有登录设备都会退出，账号资料、报名和比赛记录保留。', locale)}</p>
    {notice && <p className={styles.notice} data-tone={notice.tone} role={notice.tone === 'error' ? 'alert' : 'status'} tabIndex={-1} ref={loadError ? undefined : feedback}>{uiText(notice.text, locale)}{notice.synced && <> {uiText('已重新读取当前换绑状态，请核对后再操作。', locale)}</>}</p>}
    {loading ? <p role="status">{uiText('正在读取邮箱变更状态…', locale)}</p> : loadError ? <><p className={styles.notice} data-tone="error" role="alert" tabIndex={-1} ref={feedback}>{uiText(loadError, locale)} {uiText('当前换绑状态尚未确认，请先重新读取。', locale)}</p><div className={styles.actions}><button className={styles.secondary} type="button" onClick={() => setVersion(value => value + 1)}>{uiText('重新读取状态', locale)}</button></div></> : <>
      {request && <div className={styles.securityImpact}><strong>{uiText('邮箱换绑尚未完成', locale)}</strong><p data-i18n-ignore>{request.currentEmail} → {request.newEmail}</p><p>{uiText('原邮箱', locale)}：{uiText(request.currentEmailConfirmedAt ? '已确认' : '待确认', locale)} · {uiText('新邮箱', locale)}：{uiText(request.newEmailConfirmedAt ? '已确认' : '待确认', locale)}</p><p>{uiText('有效期至', locale)} {new Date(request.expiresAt).toLocaleString(locale)}</p></div>}
      {!user.emailVerified && <p className={styles.hint}>{uiText('请先完成上方的当前邮箱验证。', locale)}</p>}
      <form onSubmit={submit}>
        <fieldset className={styles.fields} disabled={busy || !user.emailVerified}>
          <label>{uiText('新登录邮箱', locale)}<input type="email" autoComplete="email" value={request?.newEmail || newEmail} readOnly={Boolean(request)} onChange={event => setNewEmail(event.target.value)} maxLength={254} required /></label>
          <label>{uiText('当前密码', locale)}<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        </fieldset>
        {request && <p className={styles.hint}>{uiText('重发需要重新确认两个邮箱，之前的确认链接会失效。', locale)}</p>}
        <div className={styles.actions}><button className={styles.primary} type="submit" disabled={busy || !user.emailVerified}>{uiText(busy ? '正在处理…' : request ? '重发确认邮件' : '发送确认邮件', locale)}</button>{request && <button className={styles.secondary} type="button" disabled={busy} onClick={cancel}>{uiText('取消换绑', locale)}</button>}<button className={styles.secondary} type="button" disabled={busy || loading} onClick={() => setVersion(value => value + 1)}>{uiText('刷新状态', locale)}</button></div>
      </form>
    </>}
    <p className={styles.hint}>{uiText('旧邮箱已无法收信？', locale)} <Link to={withLocale('/account/recovery', locale)}>{uiText('申请账号恢复', locale)} →</Link></p>
  </section>
}

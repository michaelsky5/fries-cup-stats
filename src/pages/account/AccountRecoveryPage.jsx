import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBlocker, useLocation } from 'react-router-dom'
import AccountFrame from '../../features/account-ui/AccountFrame.jsx'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { platformRequest } from '../../features/auth/platformApi.js'
import { accountSettingsError } from '../../features/account-security/accountFoundationSettings.js'
import { readRecoveryProgress, synchronizeAfterCredentialChange, validateRecoveryApplication, validateRecoveryPassword } from '../../features/account-security/accountRecoveryModel.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { withLocale } from '../../lib/locales.js'
import styles from './AccountRecoveryPage.module.css'

const LABELS = { VERIFY_EMAIL: '等待邮箱验证', PENDING_REVIEW: '等待平台核验', APPROVED: '核验已通过', REJECTED: '申请已退回', COMPLETED: '账号已恢复', CANCELLED: '申请已取消', EXPIRED: '申请已过期' }
export default function AccountRecoveryPage() {
  const location = useLocation()
  const tokens = useMemo(() => new URLSearchParams(location.hash.slice(1)), [location.hash])
  return <RecoveryFlow key={tokens.toString()} tokens={tokens} />
}

function RecoveryFlow({ tokens }) {
  const locale = useUiLocale(), { refreshSession, user } = useAuth()
  const [stage, setStage] = useState(tokens.has('complete') ? 'complete' : tokens.has('request') || tokens.has('verify') ? 'status' : 'begin')
  const [form, setForm] = useState({ currentEmail: '', newEmail: '', reason: '', evidence: '', newPassword: '', confirmation: '' })
  const [result, setResult] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [completionPreview, setCompletionPreview] = useState(null), [previewAttempt, setPreviewAttempt] = useState(0), [previewLoading, setPreviewLoading] = useState(true)
  const [progressAttempt, setProgressAttempt] = useState(0), [sentEmail, setSentEmail] = useState(''), [sessionWarning, setSessionWarning] = useState('')
  const [completionUncertain, setCompletionUncertain] = useState(false)
  const lock = useRef(false), verification = useRef(null), verified = useRef(false), heading = useRef(null), errorTarget = useRef(null)
  const accountAction = user ? '前往账号设置' : '使用新邮箱登录'
  const dirty = ['begin', 'complete'].includes(stage) && Object.values(form).some(Boolean)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => { if (!dirty) return undefined; const warn = event => { event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [stage])
  useEffect(() => { if (error) errorTarget.current?.focus() }, [error])
  useEffect(() => {
    if (stage !== 'status') return undefined
    let cancelled = false
    setBusy(true); setError('')
    if (!verification.current) verification.current = readRecoveryProgress(tokens, platformRequest, verified)
    verification.current.then(data => {
      if (cancelled) return
      setResult(data.request)
      const next = new URLSearchParams({ request: tokens.get('request') })
      window.history.replaceState({}, '', window.location.pathname + window.location.search + '#' + next)
    }).catch(failure => { if (!cancelled) setError(accountSettingsError(failure)) }).finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [stage, tokens, progressAttempt])
  useEffect(() => {
    if (stage !== 'complete') return undefined
    const controller = new AbortController()
    setPreviewLoading(true); setCompletionPreview(null); setError('')
    platformRequest('/auth/account-recovery/completion', { method: 'POST', body: { token: tokens.get('complete') }, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setCompletionPreview(data.request); setError(''); setCompletionUncertain(false) } })
      .catch(failure => { if (!controller.signal.aborted) setError(accountSettingsError(failure)) })
      .finally(() => { if (!controller.signal.aborted) setPreviewLoading(false) })
    return () => controller.abort()
  }, [stage, tokens, previewAttempt])
  const field = key => ({ value: form[key], onChange: event => setForm(current => ({ ...current, [key]: event.target.value })), disabled: busy })
  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    setError('')
    const passwordIssue = stage === 'complete' ? validateRecoveryPassword(form.newPassword, form.confirmation) : validateRecoveryApplication(form)
    if (passwordIssue) { setError(uiText(passwordIssue, locale)); return }
    lock.current = true; setBusy(true)
    try {
      if (stage === 'begin') {
        await platformRequest('/auth/account-recovery', { method: 'POST', body: { currentEmail: form.currentEmail, newEmail: form.newEmail, reason: form.reason, evidence: form.evidence } })
        setSentEmail(form.newEmail.trim())
        setForm({ currentEmail: '', newEmail: '', reason: '', evidence: '', newPassword: '', confirmation: '' }); setStage('sent')
      } else {
        await platformRequest('/auth/account-recovery/complete', { method: 'POST', body: { token: tokens.get('complete'), newPassword: form.newPassword } })
        setForm({ currentEmail: '', newEmail: '', reason: '', evidence: '', newPassword: '', confirmation: '' }); setStage('done')
        window.history.replaceState({}, '', window.location.pathname + window.location.search)
        setSessionWarning(await synchronizeAfterCredentialChange(refreshSession))
      }
    } catch (failure) {
      setForm(current => ({ ...current, newPassword: '', confirmation: '' })); setError(accountSettingsError(failure))
      if (stage === 'complete') {
        setCompletionPreview(null); setPreviewLoading(false)
        setCompletionUncertain(Boolean(failure.data?.outcomeUnknown || failure.status >= 500 || failure.name === 'TypeError'))
      }
    }
    finally { lock.current = false; setBusy(false) }
  }
  function refresh() {
    if (busy) return
    verification.current = null
    setProgressAttempt(value => value + 1)
  }
  return <AccountFrame compact title={uiText('账号恢复', locale)} eyebrow="ACCOUNT RECOVERY" description={uiText('旧邮箱无法使用时，先验证新邮箱，再由平台核验账号归属。', locale)}>
    <div className={styles.layout}><aside className={styles.guide}><strong>01 / 02 / 03</strong><ol><li>{uiText('验证可收信的新邮箱', locale)}</li><li>{uiText('平台独立核验原账号归属', locale)}</li><li>{uiText('设置新密码并重新登录', locale)}</li></ol><details><summary>{uiText('恢复说明', locale)}</summary><p>{uiText('申请和邮箱验证不会改变原账号。审核通过后，仍需本人打开完成链接才能生效。', locale)}</p></details><Link to={withLocale('/account#email', locale)}>{uiText('返回邮箱管理', locale)} →</Link></aside>
      <section className={styles.panel} aria-labelledby="recovery-title" aria-busy={busy || (stage === 'complete' && previewLoading)}><h2 id="recovery-title" tabIndex={-1} ref={heading}>{uiText(stage === 'complete' ? '完成账号恢复' : stage === 'status' ? '恢复申请进度' : stage === 'done' ? '账号已恢复' : stage === 'sent' ? '请检查新邮箱' : '提交恢复申请', locale)}</h2>
        {error && <p className={styles.error} role="alert" tabIndex={-1} ref={errorTarget}>{uiText(error, locale)}</p>}
        {stage === 'complete' && completionUncertain && <p className={styles.warning} role="status">{uiText('提交结果尚未确认。请先从验证邮件中的申请进度链接核对是否已恢复；已恢复时，使用新邮箱和刚设置的新密码登录。请勿重复提交。', locale)}</p>}
        {blocker.state === 'blocked' && <div className={styles.warning} role="alert"><p>{uiText('填写内容尚未提交，离开后需要重新填写。', locale)}</p><div className={styles.actions}><button onClick={() => blocker.reset()}>{uiText('继续填写', locale)}</button><button onClick={() => blocker.proceed()}>{uiText('离开页面', locale)}</button></div></div>}
        {stage === 'begin' && <form onSubmit={submit}>
          <div className={styles.fields}><label>{uiText('原登录邮箱', locale)}<input type="email" autoComplete="username" maxLength={254} required {...field('currentEmail')} /></label><label>{uiText('可收信的新邮箱', locale)}<input type="email" autoComplete="email" maxLength={254} required {...field('newEmail')} /></label></div>
          <label>{uiText('无法登录的原因（至少 10 字）', locale)}<textarea rows={3} minLength={10} maxLength={1000} required {...field('reason')} /></label>
          <label>{uiText('可核对的参赛或账号线索（至少 20 字）', locale)}<textarea rows={5} minLength={20} maxLength={2000} required aria-describedby="recovery-evidence-hint" {...field('evidence')} /></label>
          <p id="recovery-evidence-hint" className={styles.hint}>{uiText('例如 BattleTag、参赛赛事、队伍，以及工作人员可通过原有渠道独立核对的记录。不要填写密码、验证码或证件号码。', locale)}</p>
          <div className={styles.actions}><button className={styles.primary} disabled={busy}>{uiText(busy ? '正在提交…' : '验证新邮箱', locale)}</button></div>
        </form>}
        {stage === 'sent' && <div role="status"><p>{uiText('验证请求已受理，请稍后检查', locale)} <strong data-i18n-ignore>{sentEmail}</strong>。</p><p>{uiText('完成新邮箱验证后申请才会进入平台审核；验证链接有效期为 24 小时。', locale)}</p><p className={styles.hint}>{uiText('未收到时请检查垃圾邮件，2 分钟后仍未收到可重新申请。请保留验证邮件中的申请进度链接。', locale)}</p><div className={styles.actions}><a href={withLocale('/account/recovery', locale)}>{uiText('重新填写申请', locale)} →</a></div></div>}
        {stage === 'status' && <div>{busy && !result ? <p role="status">{uiText('正在核对申请…', locale)}</p> : result && <><strong className={styles.state} role="status">{uiText(LABELS[result.status] || '状态待确认', locale)}</strong><p>{uiText(result.status === 'VERIFY_EMAIL' ? '新邮箱尚未验证，申请还没有进入审核。请打开验证邮件中的验证按钮。' : result.status === 'PENDING_REVIEW' ? '新邮箱已验证。平台会核对原账号归属，期间原账号保持原状。核验结果会发送到新邮箱，也可在这里刷新进度。' : result.status === 'APPROVED' ? '请检查新邮箱中的完成链接，设置新密码后恢复才会生效。未收到时请检查垃圾邮件，并联系平台工作人员重发。' : result.status === 'COMPLETED' ? '账号已恢复。请使用新邮箱和新密码重新登录。' : result.status === 'EXPIRED' ? '本次申请或完成链接已过期，不能继续恢复。请重新申请并再次核验。' : result.status === 'CANCELLED' ? '本次申请已取消，不能继续恢复。请先核对账号当前状态。' : '请核对处理说明，补充可独立核验的线索后重新申请。', locale)}</p>{result.decisionNote && <p className={styles.note}>{result.decisionNote}</p>}{['VERIFY_EMAIL', 'PENDING_REVIEW', 'APPROVED'].includes(result.status) && <p className={styles.hint}>{uiText('有效期至', locale)} {new Date(result.expiresAt).toLocaleString(locale)}</p>}</>}
          {result?.status === 'COMPLETED' && user && <p className={styles.hint}>{uiText('当前已登录账号', locale)}：<span data-i18n-ignore>{user.email}</span>。{uiText('如需改用恢复的账号，请先在账号设置中退出当前账号。', locale)}</p>}
          <div className={styles.actions}><button disabled={busy} onClick={refresh}>{uiText(busy ? '正在核对…' : error ? '重新核对' : '刷新进度', locale)}</button>{result?.status === 'COMPLETED' ? <Link to={withLocale('/account', locale)}>{uiText(accountAction, locale)}</Link> : result?.status !== 'PENDING_REVIEW' && result?.status !== 'APPROVED' && <a href={withLocale('/account/recovery', locale)}>{uiText('重新申请', locale)}</a>}</div>
        </div>}
        {stage === 'complete' && <>{completionPreview ? <><div className={styles.note}><p>{uiText('恢复账号', locale)}：<strong data-i18n-ignore>{completionPreview.originalEmailLabel}</strong></p><p>{uiText('新登录邮箱', locale)}：<strong data-i18n-ignore>{completionPreview.newEmail}</strong></p><p>{uiText('有效期至', locale)} {new Date(completionPreview.expiresAt).toLocaleString(locale)}</p></div>{user && <p className={styles.hint}>{uiText('当前已登录账号', locale)}：<span data-i18n-ignore>{user.email}</span>。{uiText('本次只恢复上方指定的账号，请核对后再继续。', locale)}</p>}<form onSubmit={submit}><p>{uiText('完成后，新邮箱用于登录；旧密码、全部旧登录会话与未完成安全链接失效。赛事关系和账号资料保留，默认使用选手模式。', locale)}</p><label>{uiText('新密码', locale)}<input type="password" autoComplete="new-password" minLength={8} required {...field('newPassword')} /></label><label>{uiText('再次输入新密码', locale)}<input type="password" autoComplete="new-password" minLength={8} required {...field('confirmation')} /></label><p className={styles.hint}>{uiText('至少 8 位，最多 72 个 UTF-8 字节。', locale)}</p><div className={styles.actions}><button className={styles.primary} disabled={busy}>{uiText(busy ? '正在恢复…' : '确认恢复账号', locale)}</button></div></form></> : previewLoading ? <p role="status">{uiText('正在核对恢复链接…', locale)}</p> : <><p>{uiText('当前链接无法继续。请先核对是否打开了最新邮件；已完成恢复时可直接使用新邮箱登录。', locale)}</p><div className={styles.actions}><button onClick={() => setPreviewAttempt(value => value + 1)}>{uiText('重新核对', locale)}</button><Link to={withLocale('/account', locale)}>{uiText(accountAction, locale)}</Link><a href={withLocale('/account/recovery', locale)}>{uiText('重新申请', locale)}</a></div></>}</>}
        {stage === 'done' && <div role="status"><p>{uiText('邮箱与密码已更新，此账号的全部旧登录设备已退出。请使用新邮箱和新密码重新登录。', locale)}</p>{sessionWarning && <p className={styles.warning}>{uiText(sessionWarning, locale)}</p>}{user && <p>{uiText('当前仍登录着', locale)} <span data-i18n-ignore>{user.email}</span>。{uiText('如需登录恢复的账号，请先在账号设置中退出当前账号。', locale)}</p>}<div className={styles.actions}><Link className={styles.primary} to={withLocale('/account', locale)}>{uiText(user ? '前往账号设置' : '使用新邮箱登录', locale)}</Link></div></div>}
      </section></div>
  </AccountFrame>
}

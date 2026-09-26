import { translateUiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AccountFrame from '../../features/account-ui/AccountFrame.jsx'
import { platformRequest } from '../../features/auth/platformApi.js'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { withAccountCompetition } from '../../features/my-space/accountCompetitionModel.js'
import styles from './WeeklyAdminInvitationPage.module.css'

const endpoint = '/auth/staff-invitations'
function readCredential() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  return { token: hash.get('verify') || hash.get('invite') || '', verification: hash.has('verify') }
}
export default function StaffInvitationPage() {
  const locale = useUiLocale()
  const t = (value, values) => translateUiText(value, locale, values)
  const { refreshAccountData } = useAuth()
  const [credential, setCredential] = useState(readCredential)
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('form')
  const [sent, setSent] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const pending = useRef(false)
  const heading = useRef(null)
  useEffect(() => {
    const changed = () => {
      const next = readCredential()
      if (!next.token) return
      setCredential(next); setInvitation(null); setStep('form'); setSent(null)
      setEmail(''); setPassword(''); setConfirmation('')
    }
    window.addEventListener('hashchange', changed)
    return () => window.removeEventListener('hashchange', changed)
  }, [])
  useEffect(() => {
    document.title = '工作人员邀请 | 薯条杯'
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    if (!credential.token) return
    const controller = new AbortController()
    setError('')
    platformRequest(endpoint + '/preview', { method: 'POST', body: credential, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setInvitation(result.invitation) })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [credential, attempt])
  useEffect(() => { if (step !== 'form') heading.current?.focus() }, [step])
  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    if (!credential.verification && !invitation.existingAccount && password !== confirmation) { setError('两次输入的密码不一致。'); return }
    pending.current = true; setBusy(true); setError('')
    try {
      if (credential.verification) {
        const result = await platformRequest(endpoint + '/complete', { method: 'POST', body: { token: credential.token } })
        if (!result.accepted) throw new Error('尚未确认认领成功，请重新核对。')
        setStep('complete')
        await refreshAccountData().catch(() => {})
      } else {
        const result = await platformRequest(endpoint + '/begin', { method: 'POST', body: { token: credential.token, email, password } })
        setSent(result); setPassword(''); setConfirmation(''); setStep('email')
      }
    } catch (failure) { setError(failure.message) }
    finally { pending.current = false; setBusy(false) }
  }
  const stage = step === 'complete' ? 3 : step === 'email' || credential.verification ? 2 : 1
  const roleLabel = invitation?.roles.map(role => t(role === 'REFEREE' ? '赛管' : '解说')).join(' / ')
  return <AccountFrame title={t("接受工作人员邀请")} eyebrow="MATCH DAY STAFF" description={t("一个账号，按赛事与场次承担不同职责。")} compact>
    <section className={styles.card} aria-labelledby="staff-invite-title">
      <ol className={styles.steps} aria-label={t("工作人员认领流程")}>{[t("核对账号"), t("验证邮箱"), t("查看比赛安排")].map((label, index) => <li key={label} aria-current={stage === index + 1 ? 'step' : undefined}><span>0{index + 1}</span>{label}</li>)}</ol>
      <div className={styles.body}>
        <p className={styles.kicker}>{invitation?.seasonName || t("工作人员邀请")}</p>
        <h2 id="staff-invite-title" ref={heading} tabIndex={-1}>{step === 'complete' ? t("本届工作人员身份已生效") : step === 'email' ? t("请到邮箱确认邀请") : credential.verification ? t("确认本人邮箱并接受职责") : t("核对你的邀请")}</h2>
        {!credential.token ? <p role="alert">{t("邀请链接缺少凭证，请重新打开管理员发来的完整链接。")}</p> : !invitation ? <><p role={error ? 'alert' : 'status'}>{error || t("正在核对邀请…")}</p>{error && <button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>{t("重新核对邀请")}</button>}</> : step === 'complete' ? <>
          <p>{t('你已接受“{0}”的{1}职责。已有选手身份和队伍关系已保留。', [invitation.seasonName, roleLabel])}</p>
          <p>{t('请使用受邀邮箱 {0} 对应的账号登录；如已登录其他账号，请先退出再切换。', [invitation.maskedEmail])}</p>
          <Link className={styles.primary} to={withAccountCompetition('/me?section=matches', invitation.seasonId)}>{t("前往我的比赛 →")}</Link>
          <p className={styles.hint}>{t("正式排班发布后，相应场次会出现在“我的空间 → 我的比赛”。尚未排班时无需再次注册。本队比赛仍按参赛身份进入。")}</p>
        </> : step === 'email' ? <>
          <p>{t('请验证邮箱 {0}。打开验证邮件中的链接，确认接受本届职责。', [sent?.invitation.maskedEmail])}</p>
          <p role={sent?.emailDelivery?.delivered ? 'status' : 'alert'} className={!sent?.emailDelivery?.delivered ? styles.error : undefined}>{sent?.emailDelivery?.delivered ? t("邮件服务已受理发送，请检查收件箱和垃圾邮件。") : t("邮件投递未确认，身份尚未生效。请稍后返回重试或联系管理员检查邮件服务。")}</p>
          <p className={styles.hint}>{t("邮箱确认链接 30 分钟内有效；重新发送后旧验证链接失效。")}</p>
          <button className={styles.secondary} onClick={() => { setStep('form'); setError('') }}>{t("返回 / 重新发送验证邮件")}</button>
        </> : <form onSubmit={submit}>
          <div className={styles.scope}><strong>{invitation.displayName} · {roleLabel}</strong><p>{t('本届：{0}。具体比赛按已发布排班或管理员单场指派开放；不会获得其他赛事管理权。', [invitation.seasonName])}</p></div>
          {credential.verification ? <p>{t('确认邮箱 {0} 后，此邀请绑定到刚核对的本人账号。', [invitation.maskedEmail])}</p> : <>
            <label className={styles.field}>{t("邀请指定的本人邮箱")}<input required type="email" autoComplete="email" placeholder={invitation.maskedEmail} value={email} maxLength={254} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>
            <label className={styles.field}>{invitation.existingAccount ? t("原账号密码") : t("设置账号密码")}<input required type="password" autoComplete={invitation.existingAccount ? 'current-password' : 'new-password'} minLength={invitation.existingAccount ? 8 : 12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
            {!invitation.existingAccount && <label className={styles.field}>{t("再次输入密码")}<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} /></label>}
            <p className={styles.hint}>{invitation.existingAccount ? t("复用原账号，原密码、选手档案和队伍关系保留。忘记密码可先在登录窗口找回。") : t("新账号请设置至少 12 位密码。邮箱验证完成后，才能获得工作人员身份。")}</p>
          </>}
          {error && <p className={styles.error} role="alert">{t(error)}</p>}
          <button className={styles.primary} type="submit" disabled={busy}>{busy ? t("正在处理…") : credential.verification ? t("确认邮箱并接受本届职责") : t("发送本人邮箱验证 →")}</button>
          <p className={styles.hint}>{t('邀请有效至 {0}（北京时间）。', [new Date(invitation.expiresAt).toLocaleString(locale, { timeZone: 'Asia/Shanghai', hour12: false })])}</p>
        </form>}
      </div>
    </section>
  </AccountFrame>
}

import { useEffect, useRef, useState } from 'react'
import AccountFrame from '../../features/account-ui/AccountFrame.jsx'
import { platformRequest } from '../../features/auth/platformApi.js'
import styles from './WeeklyAdminInvitationPage.module.css'

const endpoint = '/auth/weekly-admin-invitations'

export default function WeeklyAdminInvitationPage() {
  const [credential] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    return { token: hash.get('verify') || hash.get('invite') || '', verification: hash.has('verify') }
  })
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('form')
  const [sent, setSent] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const pending = useRef(false)
  const heading = useRef(null)
  useEffect(() => {
    document.title = '周赛管理员邀请 | 薯条杯'
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    if (!credential.token) return
    const controller = new AbortController()
    setError('')
    platformRequest(`${endpoint}/preview`, { method: 'POST', body: credential, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setInvitation(result.invitation) })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [credential, attempt])
  useEffect(() => { if (step !== 'form') heading.current?.focus() }, [step])
  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    if (!credential.verification && password !== confirmation) { setError('两次输入的密码不一致。'); return }
    pending.current = true; setBusy(true); setError('')
    try {
      if (credential.verification) {
        const result = await platformRequest(`${endpoint}/complete`, { method: 'POST', body: { token: credential.token } })
        if (!result.accepted) throw new Error('未能确认管理员权限，请重新核对。')
        setStep('complete')
      } else {
        const result = await platformRequest(`${endpoint}/begin`, { method: 'POST', body: { token: credential.token, displayName: name, email, password } })
        setSent(result); setPassword(''); setConfirmation(''); setStep('email')
      }
    } catch (failure) { setError(failure.message) }
    finally { pending.current = false; setBusy(false) }
  }
  const stage = step === 'complete' ? 3 : step === 'email' || credential.verification ? 2 : 1
  return <AccountFrame title="成为周赛管理员" eyebrow="WEEKLY OPERATIONS" description="使用本人账号，共同管理这一季周赛。" compact>
    <section className={styles.card} aria-labelledby="weekly-admin-title">
      <ol className={styles.steps} aria-label="管理员认领流程">{['登记账号', '验证邮箱', '进入赛管后台'].map((label, index) => <li key={label} aria-current={stage === index + 1 ? 'step' : undefined}><span>0{index + 1}</span>{label}</li>)}</ol>
      <div className={styles.body}>
        <p className={styles.kicker}>{invitation?.seasonName || '赛事管理员邀请'}</p>
        <h2 id="weekly-admin-title" ref={heading} tabIndex={-1}>{step === 'complete' ? '你的管理权限已就绪' : step === 'email' ? '请到邮箱完成最后一步' : credential.verification ? '确认本人邮箱与管理权限' : '认领你的管理员名额'}</h2>
        {!credential.token ? <p role="alert">邀请链接缺少凭证，请重新打开赛事负责人发来的完整链接。</p> : !invitation ? <><p role={error ? 'alert' : 'status'}>{error || '正在核对邀请…'}</p>{error && <button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>重新核对邀请</button>}</> : step === 'complete' ? <>
          <p>已启用「{invitation.seasonName}」的周赛管理员权限。现在可以登录 System，处理报名审核、赛程、比赛与结果发布。</p>
          <a className={styles.primary} href="https://admin.fries-cup.com/login">进入赛管后台 ↗</a>
          <p className={styles.hint}>使用刚才登记的邮箱和密码登录。这个邀请名额已经认领，原链接不能再次注册。</p>
        </> : step === 'email' ? <>
          <p>验证邮件发往 <strong>{sent?.invitation.maskedEmail}</strong>。打开邮件中的链接，确认后即可获得管理权限。</p>
          {!sent?.emailDelivery?.delivered && <p className={styles.error} role="alert">邮件投递尚未确认。请稍后返回注册信息重试；名额尚未完成认领。</p>}
          <p className={styles.hint}>邮箱确认链接 30 分钟内有效。找不到邮件时，请检查垃圾邮件；重新发送后，旧验证邮件失效。</p>
          <button className={styles.secondary} onClick={() => { setStep('form'); setError('') }}>返回注册信息 / 重新发送</button>
        </> : <form onSubmit={submit}>
          <div className={styles.scope}><strong>{invitation.label}</strong><p>仅管理此周赛赛季：报名与名单审核、周次安排、比赛处理及结果发布。平台账号和其他赛事由平台管理员管理。</p></div>
          {credential.verification ? <p>邮箱：<strong>{invitation.maskedEmail}</strong>。确认后，此邀请将只绑定到刚登记的账号。</p> : <>
            {invitation.registrationStarted && <p className={styles.hint}>此链接已开始注册，请使用原来登记的邮箱继续。</p>}
            <label className={styles.field}>管理员称呼<input required autoComplete="nickname" value={name} maxLength={80} onChange={event => setName(event.target.value)} disabled={busy} /></label>
            <label className={styles.field}>本人邮箱<input required type="email" autoComplete="email" value={email} maxLength={254} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>
            <div className={styles.passwords}>
              <label className={styles.field}>账号密码<input required type="password" autoComplete="new-password" maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
              <label className={styles.field}>再次输入密码<input required type="password" autoComplete="new-password" maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} /></label>
            </div>
            <p className={styles.hint}>新账号请设置至少 12 位密码；邮箱已有薯条杯账号时，请输入现有密码。</p>
          </>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.primary} type="submit" disabled={busy}>{busy ? '正在处理…' : credential.verification ? '确认邮箱并启用管理权限' : '继续验证本人邮箱 →'}</button>
          <p className={styles.hint}>每个链接只能成功认领一次。邀请有效至 {new Date(invitation.expiresAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}（北京时间）。</p>
        </form>}
      </div>
    </section>
  </AccountFrame>
}

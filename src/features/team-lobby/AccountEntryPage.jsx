import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import usePasswordRecovery from '../auth/usePasswordRecovery.js'
import PasswordRecoveryPanel from '../auth/PasswordRecoveryPanel.jsx'
import { readPasswordResetLocation } from '../auth/passwordRecoveryModel.js'
import { safeLobbyReturn, accountFailure } from './lobbyModel.js'
import styles from './Lobby.module.css'

export default function AccountEntryPage() {
  const location = useLocation()
  const mode = location.pathname.split('/').at(-1)
  return <AccountForm key={mode} mode={mode} />
}
function AccountForm({ mode }) {
  const auth = useAuth()
  const { refreshSession } = auth
  const navigate = useNavigate()
  const location = useLocation()
  const destination = safeLobbyReturn(new URLSearchParams(location.search).get('returnTo'))
  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: '', confirmation: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const lock = useRef(false)
  const resetLink = useMemo(() => readPasswordResetLocation(window.location), [])
  const recovery = usePasswordRecovery({ open: ['recover', 'reset-password'].includes(mode), resetLink, locale: 'zh-CN', authConfig: auth.authConfig, refreshSession: auth.refreshSession })
  const accountPath = name => `/account/${name}?returnTo=${encodeURIComponent(destination)}`
  useEffect(() => {
    if (!cooldown) return undefined
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])
  useEffect(() => {
    if (mode !== 'verify-email') return undefined
    const refresh = () => { refreshSession().catch(failure => { if (failure.status !== 401) setError(accountFailure(failure)) }) }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [mode, refreshSession])
  const field = key => ({ value: form[key], onChange: event => setForm(current => ({ ...current, [key]: event.target.value })), disabled: busy })
  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    setError('')
    if (mode === 'register' && form.password !== form.confirmation) { setError('两次输入的密码不一致。'); return }
    lock.current = true; setBusy(true)
    try {
      const user = mode === 'register' ? await auth.register({ email: form.email, username: form.username, displayName: form.displayName || form.username, password: form.password })
        : await auth.login({ email: form.email, password: form.password })
      setForm(current => ({ ...current, password: '', confirmation: '' }))
      navigate(user?.emailVerifiedAt ? destination : accountPath('verify-email'), { replace: true })
    } catch (failure) { setError(accountFailure(failure)); setForm(current => ({ ...current, password: '', confirmation: '' })) }
    finally { lock.current = false; setBusy(false) }
  }
  async function resend() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await auth.requestEmailVerification(); setCooldown(60) }
    catch (failure) { setError(accountFailure(failure)); if (failure.retryAfterMs) setCooldown(Math.ceil(failure.retryAfterMs / 1000)) }
    finally { lock.current = false; setBusy(false) }
  }
  const verified = auth.user ? Boolean(auth.user.emailVerifiedAt) : auth.emailVerificationState.status === 'VERIFIED'
  const title = mode === 'register' ? '创建你的薯条杯账号' : mode === 'verify-email' ? '验证邮箱' : ['recover', 'reset-password'].includes(mode) ? '找回账号' : '欢迎回来'
  return <section className={styles.authPage}>
    <div className={styles.intro}><span className={styles.eyebrow}>FRIES CUP / ACCOUNT</span><h1>{title}</h1><p>先找到队友，再一起上场。</p><Link to="/lobby">← 返回组队大厅</Link></div>
    <div className={styles.formPanel}>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {auth.authConfigError && <p role="alert" className={styles.error}>账号配置暂时无法读取。<button onClick={auth.retryAuthConfig}>重试</button></p>}
      {['recover', 'reset-password'].includes(mode) ? <PasswordRecoveryPanel recovery={recovery} locale="zh-CN" deliveryEnabled={auth.authConfig?.emailVerificationEnabled === true} configLoading={!auth.authConfig && !auth.authConfigError} configError={auth.authConfigError} retryConfig={auth.retryAuthConfig} onLogin={() => navigate(accountPath('login'))} />
        : mode === 'verify-email' ? <div className={styles.stack}>
          {auth.emailVerificationState.status === 'VERIFYING' ? <p role="status">正在核对验证链接…</p> : verified ? <><h2>邮箱已验证</h2><p>现在可以发布求队卡或申请筹建招募。</p><Link className={styles.primary} to={auth.user ? destination : accountPath('login')}>{auth.user ? '继续原来的操作' : '登录后继续'}</Link></>
            : <><h2>{auth.user ? '账号已创建，请验证邮箱' : '登录后查看验证状态'}</h2>{auth.user && <p>{auth.user.email}</p>}
              <p>{auth.emailVerificationState.result?.queued ? '账号已保留，验证邮件正在排队发送。请稍后检查收件箱与垃圾邮件。' : auth.emailVerificationState.result?.delivered ? '验证邮件已提交发送，请检查收件箱与垃圾邮件。' : '验证邮件的发送与账号创建分别记录。尚未收到时，可登录本人账号重新发送。'}</p>
              {auth.emailVerificationState.status === 'ERROR' && <p role="alert" className={styles.error}>验证链接无效或已过期，请登录本人账号后重新发送。</p>}
              {auth.emailVerificationState.status === 'VERIFIED' && auth.user && !auth.user.emailVerifiedAt && <div className={styles.notice}><p>{auth.emailVerificationState.sessionWarning || '链接已验证，当前登录账号尚未显示已验证状态。请重新读取状态并核对账号，必要时为当前账号重发邮件。'}</p><button onClick={() => refreshSession().catch(failure => setError(accountFailure(failure)))}>重新读取账号状态</button></div>}
              {auth.user ? <button className={styles.primary} onClick={resend} disabled={busy || cooldown > 0 || !auth.authConfig?.emailVerificationEnabled}>{cooldown ? `${cooldown} 秒后可重发` : busy ? '正在发送…' : '重新发送验证邮件'}</button> : <Link className={styles.primary} to={accountPath('login')}>登录本人账号</Link>}
              {auth.authConfig?.emailVerificationEnabled === false && <p>邮件服务暂不可用。账号已保留，可以稍后登录并重发。</p>}
              <Link to="/lobby">先浏览大厅</Link></>}
        </div> : auth.isBootstrapping ? <p role="status">正在读取账号…</p> : auth.user ? <div className={styles.stack}><h2>已登录 {auth.user.displayName}</h2><Link className={styles.primary} to={auth.user.emailVerifiedAt ? destination : accountPath('verify-email')}>继续</Link><button onClick={auth.logout}>退出并使用其他账号</button></div>
          : <form onSubmit={submit} className={styles.stack}>
            <label>邮箱<input type="email" autoComplete="email" required maxLength={254} {...field('email')} /></label>
            {mode === 'register' && <><label>用户名<input autoComplete="username" required minLength={2} maxLength={24} {...field('username')} /><small>2—24 位字母、数字、下划线、短横线或点。</small></label><label>显示名（可选）<input maxLength={40} {...field('displayName')} /></label></>}
            <label>密码<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : 1} {...field('password')} /></label>
            {mode === 'register' && <label>再次输入密码<input type="password" autoComplete="new-password" required minLength={8} {...field('confirmation')} /></label>}
            {mode === 'register' && <p>验证邮箱后即可发布求队卡或申请筹建招募；正式参赛另行报名。联系功能将在下一阶段开放，QQ 届时单独填写和授权。</p>}
            {mode === 'register' && auth.authConfig?.selfRegistrationEnabled === false && <p role="status">普通注册暂未开放，已有账号仍可登录。</p>}
            <button className={styles.primary} disabled={busy || !auth.authConfig || (mode === 'register' && !auth.authConfig.selfRegistrationEnabled)}>{busy ? '正在处理…' : mode === 'register' ? '创建账号' : '登录'}</button>
            <div className={styles.actions}><Link to={accountPath(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? '已有账号，去登录' : '没有账号，创建账号'}</Link><Link to={accountPath('recover')}>忘记密码</Link></div>
          </form>}
    </div>
  </section>
}

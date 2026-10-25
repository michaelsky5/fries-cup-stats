import { lobbyText as t } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import usePasswordRecovery from '../auth/usePasswordRecovery.js'
import PasswordRecoveryPanel from '../auth/PasswordRecoveryPanel.jsx'
import PasswordRequirements from '../auth/PasswordRequirements.jsx'
import { validateNewPassword } from '../auth/passwordPolicy.js'
import { readPasswordResetLocation } from '../auth/passwordRecoveryModel.js'
import { safeLobbyReturn, accountFailure } from './lobbyModel.js'
import styles from './Lobby.module.css'

export default function AccountEntryPage() {
  useUiLocale()

  const location = useLocation()
  const mode = location.pathname.split('/').at(-1)
  return <AccountForm key={mode} mode={mode} />
}
function AccountForm({ mode }) {
  const uiLocale = useUiLocale()

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
  const recovery = usePasswordRecovery({ open: ['recover', 'reset-password'].includes(mode), resetLink, locale: uiLocale, authConfig: auth.authConfig, refreshSession: auth.refreshSession })
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
    if (mode === 'register') {
      const issue = validateNewPassword(form.password, uiLocale)
      if (issue) { setError(issue); return }
    }
    if (mode === 'register' && form.password !== form.confirmation) { setError(t("两次输入的密码不一致。")); return }
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
  const title = mode === 'register' ? t("创建你的薯条杯账号") : mode === 'verify-email' ? t("验证邮箱") : ['recover', 'reset-password'].includes(mode) ? t("找回账号") : t("欢迎回来")
  return <section className={styles.authPage}>
    <div className={styles.intro}><h1>{title}</h1><p>{t("先找到队友，再一起上场。")}</p><Link to="/lobby">{t("← 返回组队大厅")}</Link></div>
    <div className={styles.formPanel}>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {auth.authConfigError && <p role="alert" className={styles.error}>{t("账号配置暂时无法读取。")}<button onClick={auth.retryAuthConfig}>{t("重试")}</button></p>}
      {['recover', 'reset-password'].includes(mode) ? <PasswordRecoveryPanel recovery={recovery} locale={uiLocale} deliveryEnabled={auth.authConfig?.emailVerificationEnabled === true} configLoading={!auth.authConfig && !auth.authConfigError} configError={auth.authConfigError} retryConfig={auth.retryAuthConfig} onLogin={() => navigate(accountPath('login'))} />
        : mode === 'verify-email' ? <div className={styles.stack}>
          {auth.emailVerificationState.status === 'VERIFYING' ? <p role="status">{t("正在核对验证链接…")}</p> : verified ? <><h2>{t("邮箱已验证")}</h2><p>{t("现在可以继续使用已开放的账号功能。")}</p><Link className={styles.primary} to={auth.user ? destination : accountPath('login')}>{auth.user ? t("继续原来的操作") : t("登录后继续")}</Link></>
            : <><h2>{auth.user ? t("账号已创建，请验证邮箱") : t("登录后查看验证状态")}</h2>{auth.user && <p>{auth.user.email}</p>}
              <p>{auth.emailVerificationState.result?.queued ? t("账号已保留，验证邮件正在排队发送。请稍后检查收件箱与垃圾邮件。") : auth.emailVerificationState.result?.delivered ? t("验证邮件已提交发送，请检查收件箱与垃圾邮件。") : t("验证邮件的发送与账号创建分别记录。尚未收到时，可登录本人账号重新发送。")}</p>
              {auth.emailVerificationState.status === 'ERROR' && <p role="alert" className={styles.error}>{t("验证链接无效或已过期，请登录本人账号后重新发送。")}</p>}
              {auth.emailVerificationState.status === 'VERIFIED' && auth.user && !auth.user.emailVerifiedAt && <div className={styles.notice}><p>{auth.emailVerificationState.sessionWarning || t("链接已验证，当前登录账号尚未显示已验证状态。请重新读取状态并核对账号，必要时为当前账号重发邮件。")}</p><button onClick={() => refreshSession().catch(failure => setError(accountFailure(failure)))}>{t("重新读取账号状态")}</button></div>}
              {auth.user ? <button className={styles.primary} onClick={resend} disabled={busy || cooldown > 0 || !auth.authConfig?.emailVerificationEnabled}>{cooldown ? t('{0} 秒后可重发', [cooldown]) : busy ? t("正在发送…") : t("重新发送验证邮件")}</button> : <Link className={styles.primary} to={accountPath('login')}>{t("登录本人账号")}</Link>}
              {auth.authConfig?.emailVerificationEnabled === false && <p>{t("邮件服务暂不可用。账号已保留，可以稍后登录并重发。")}</p>}
              <Link to="/lobby">{t("先浏览大厅")}</Link></>}
        </div> : auth.isBootstrapping ? <p role="status">{t("正在读取账号…")}</p> : auth.user ? <div className={styles.stack}><h2>{t("已登录")} {auth.user.displayName}</h2><Link className={styles.primary} to={auth.user.emailVerifiedAt ? destination : accountPath('verify-email')}>{t("继续")}</Link><button onClick={auth.logout}>{t("退出并使用其他账号")}</button></div>
          : <form onSubmit={submit} className={styles.stack}>
            <label>{t("邮箱")}<input type="email" autoComplete="email" required maxLength={254} {...field('email')} /></label>
            {mode === 'register' && <><label>{t("用户名")}<input autoComplete="username" required minLength={2} maxLength={24} {...field('username')} /><small>{t("2—24 位字母、数字、下划线、短横线或点。")}</small></label><label>{t("显示名（可选）")}<input maxLength={40} {...field('displayName')} /></label></>}
            <label>{t("密码")}<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : 1} aria-describedby={mode === 'register' ? 'registration-password-hint' : undefined} {...field('password')} /></label>
            {mode === 'register' && <PasswordRequirements locale={uiLocale} id="registration-password-hint" />}
            {mode === 'register' && <label>{t("再次输入密码")}<input type="password" autoComplete="new-password" required minLength={8} {...field('confirmation')} /></label>}
            {mode === 'register' && <p>{t("验证邮箱后可使用已开放的大厅功能；正式参赛另行报名。QQ 在每次联系时填写并单独授权。")}</p>}
            {mode === 'register' && auth.authConfig?.selfRegistrationEnabled && auth.authConfig?.registrationDailyLimit > 0 && <p role="status">{t("目前分批开放，每天最多新增 {0} 个账号；邮件额度不足时会提前暂停。已有账号仍可登录。", [auth.authConfig.registrationDailyLimit])}</p>}
            {auth.authConfig?.selfRegistrationEnabled === false && <p role="status">{t("普通注册暂未开放，已有账号仍可登录。")}</p>}
            <button className={styles.primary} disabled={busy || !auth.authConfig || (mode === 'register' && !auth.authConfig.selfRegistrationEnabled)}>{busy ? t("正在处理…") : mode === 'register' ? t("创建账号") : t("登录")}</button>
            <div className={styles.actions}>{(mode === 'register' || auth.authConfig?.selfRegistrationEnabled === true) && <Link to={accountPath(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? t("已有账号，去登录") : t("没有账号，创建账号")}</Link>}<Link to={accountPath('recover')}>{t("忘记密码")}</Link></div>
          </form>}
    </div>
  </section>
}

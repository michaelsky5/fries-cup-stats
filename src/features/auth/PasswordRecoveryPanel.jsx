import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from './PasswordRecoveryPanel.module.css'

export default function PasswordRecoveryPanel({ recovery, locale = 'zh-CN', deliveryEnabled, configLoading = false, configError, retryConfig, onLogin }) {
  const t = (zh, en) => locale === 'en-US' ? en : zh
  const { stage, error, busy, sentTo } = recovery
  const loginButton = <button type="button" className={stage === 'complete' ? styles.primary : styles.secondary} disabled={busy} onClick={onLogin}>{stage === 'complete' ? t(uiText("使用新密码登录", locale), 'Sign in with new password') : t(uiText("返回登录", locale), 'Back to sign in')} <span aria-hidden="true">→</span></button>
  const issue = error && stage !== 'invalid' ? <p className={styles.error} role="alert">{error.body}</p> : null
  return <div className={styles.panel} data-i18n-ignore aria-busy={busy}>
    <ol className={styles.steps} aria-label={t(uiText("密码找回进度", locale), 'Password recovery progress')}>
      {[t('申请邮件', 'Request'), t('设置密码', 'Reset'), t('重新登录', 'Sign in')].map((label, index) => <li key={index} aria-current={index === (stage === 'complete' ? 2 : ['reset', 'invalid'].includes(stage) ? 1 : 0) ? 'step' : undefined}><span>0{index + 1}</span>{label}</li>)}
    </ol>
    {stage === 'sent' ? <>
      <div className={styles.receipt} role="status"><span>{t(uiText("申请邮箱", locale), 'Requested email')}</span><strong>{sentTo}</strong><p>{t(uiText("如果该账号符合找回条件，你会收到一次性重置链接。此回执不代表邮件已送达。", locale), 'Eligible accounts will receive a single-use reset link. This receipt does not confirm email delivery.')}</p></div>
      <div className={styles.instructions}><h3>{t(uiText("接下来检查邮箱", locale), 'Check your email next')}</h3><p>{t(uiText("查看收件箱和垃圾邮件，打开最新的重置邮件。新链接会替代之前的链接。", locale), 'Check your inbox and spam folder. Open the latest email; a new link replaces earlier links.')}</p></div>
      {issue}<div className={styles.actions}><button className={styles.secondary} type="button" disabled={busy || !deliveryEnabled} onClick={recovery.submit}>{busy ? t(uiText("正在申请…", locale), 'Requesting…') : t(uiText("重新申请邮件", locale), 'Request another email')}</button><button className={styles.secondary} type="button" disabled={busy} onClick={() => recovery.beginRequest()}>{t(uiText("修改申请邮箱", locale), 'Change email')}</button></div>{loginButton}
    </> : stage === 'complete' ? <>
      <div className={styles.receipt} role="status"><strong>{t(uiText("新密码已生效", locale), 'Your new password is active')}</strong><p>{t(uiText("该账号原有登录设备已退出。队伍、参赛身份和已保存资料保持原样。", locale), 'Existing sessions for this account have been revoked. Your teams, identities and saved details are preserved.')}</p></div>
      {recovery.sessionSyncFailed ? <p className={styles.note}>{t(uiText("密码更新已完成，当前页面暂未同步登录状态。请使用新密码重新登录。", locale), 'Your password was updated, but this page could not refresh its session. Sign in with your new password.')}</p> : null}{loginButton}
    </> : stage === 'invalid' ? <>
      <p className={styles.note} role="status">{error?.body || t(uiText("请打开最新的完整重置链接，或重新申请邮件。", locale), 'Open the latest complete reset link, or request another email.')}</p>
      <button className={styles.primary} type="button" onClick={() => recovery.beginRequest()}>{t(uiText("重新申请重置链接", locale), 'Request a new reset link')} <span aria-hidden="true">→</span></button>{loginButton}
    </> : <>
      <p className={styles.note}>{stage === 'reset' ? t(uiText("设置新密码后，需要重新登录该账号。链接仅可使用一次。", locale), 'After updating your password, sign in again. This link can only be used once.') : t(uiText("填写账号邮箱，符合条件的账号将收到密码重置邮件。", locale), 'Enter your account email to request a password reset link.')}</p>
      {stage === 'request' && !deliveryEnabled ? <p className={styles.notice} role="status">{configLoading ? t(uiText("正在检查邮件服务…", locale), 'Checking email service…') : configError ? t(uiText("暂时无法读取邮件服务状态。", locale), 'Email service status could not be checked.') : t(uiText("邮件找回暂未开放。可以返回登录，或由赛事负责人核对账号状态。", locale), 'Email recovery is currently unavailable. Return to sign in or ask the organizer to check your account.')} {configError ? <button type="button" onClick={retryConfig}>{t(uiText("重新检查", locale), 'Check again')}</button> : null}</p> : null}
      <form onSubmit={recovery.submit} className={styles.form} aria-label={stage === 'reset' ? t(uiText("重置密码", locale), 'Reset password') : t(uiText("申请密码重置", locale), 'Request password reset')}>
        {stage === 'request' ? <label><span>{t(uiText("账号邮箱", locale), 'Account email')}</span><input type="email" autoComplete="email" value={recovery.email} onChange={event => recovery.setEmail(event.target.value)} disabled={busy} required /></label> : <>
          <label><span>{t(uiText("新密码", locale), 'New password')}</span><span className={styles.passwordField}><input aria-label={t(uiText("新密码", locale), 'New password')} type={recovery.showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={recovery.password} onChange={event => recovery.setPassword(event.target.value)} disabled={busy} required aria-describedby="reset-password-hint" /><button type="button" aria-pressed={recovery.showPassword} onClick={() => recovery.setShowPassword(!recovery.showPassword)}>{recovery.showPassword ? t(uiText("隐藏", locale), 'Hide') : t(uiText("显示", locale), 'Show')}</button></span></label>
          <small id="reset-password-hint">{t(uiText("至少 8 位，最多 72 个 UTF-8 字节；中文等字符占多个字节。", locale), 'At least 8 characters, up to 72 UTF-8 bytes; some characters use multiple bytes.')}</small>
          <label><span>{t(uiText("再次输入新密码", locale), 'Confirm new password')}</span><input type={recovery.showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={recovery.confirmation} onChange={event => recovery.setConfirmation(event.target.value)} disabled={busy} required /></label>
        </>}
        {issue}<button className={styles.primary} type="submit" disabled={busy || (stage === 'request' && !deliveryEnabled)}>{busy ? t(uiText("正在处理…", locale), 'Working…') : stage === 'reset' ? t(uiText("确认更新密码", locale), 'Update password') : t(uiText("发送重置链接", locale), 'Send reset link')} <span aria-hidden="true">→</span></button>
      </form>{loginButton}
    </>}
  </div>
}

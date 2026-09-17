import { translateUiText as uiText } from '../../lib/uiText.js'
import { pickUiLocale } from '../../lib/uiText.js'
import { getLocaleParam } from '../../lib/locales.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SEASONS } from '../../config/seasons.js'
import { getStoredLocale } from '../../lib/i18n.js'
import { normalizeReviewLocale } from '../../lib/reviewLocale.js'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { acceptWeeklyAccountInvitation, previewWeeklyAccountInvitation } from '../../features/auth/weeklyInvitationApi.js'
import { getWeeklyInvitationWorkspaceHref, isPendingWeeklyInvitation, readWeeklyInvitationLocation, validateWeeklyInvitationPassword, weeklyInvitationErrorMessage, weeklyInvitationFailureKind } from '../../features/auth/weeklyInvitationModel.js'
import styles from './WeeklyAccountActivationPage.module.css'
import { AuthDialog } from '../../features/auth/AuthDialog.jsx'
import AccountFrame from '../../features/account-ui/AccountFrame.jsx'

export default function WeeklyAccountActivationPage() {
  const location = useLocation()
  // A different invitation creates a fresh flow. Scrubbing the address does not.
  return <WeeklyInvitationFlow key={`${location.key}:${location.search}:${location.hash}`} invitationLocation={location} />
}

function WeeklyInvitationFlow({ invitationLocation }) {
  const navigate = useNavigate()
  const { user, isBootstrapping, refreshAccountData } = useAuth()
  const locale = normalizeReviewLocale(new URLSearchParams(invitationLocation.search).get('lang') || getStoredLocale())
  const t = (zh, en) => pickUiLocale(locale, zh, en)
  const messageLocale = locale
  const [link] = useState(() => readWeeklyInvitationLocation(invitationLocation))
  const token = useRef(link.token)
  const mounted = useRef(false)
  const submitLock = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(Boolean(link.token))
  const [failure, setFailure] = useState(link.token ? null : { kind: 'missing' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [dialogMode, setDialogMode] = useState('')
  const closeLogin = useCallback(() => setDialogMode(''), [])

  useEffect(() => {
    mounted.current = true
    // Tokens stay in this page's memory, never in navigation or storage.
    const scrubAddress = () => {
      const current = readWeeklyInvitationLocation(window.location)
      if (!current.token || current.token === link.token) window.history.replaceState(window.history.state, '', link.cleanPath)
    }
    scrubAddress()
    window.addEventListener('hashchange', scrubAddress)
    return () => { mounted.current = false; window.removeEventListener('hashchange', scrubAddress) }
  }, [link.cleanPath, link.token])

  useEffect(() => {
    if (!token.current) return undefined
    const controller = new AbortController()
    setLoading(true)
    setInvitation(null)
    setFailure(null)
    setError('')
    previewWeeklyAccountInvitation(token.current, { signal: controller.signal })
      .then(next => {
        if (controller.signal.aborted) return
        if (!isPendingWeeklyInvitation(next)) throw new Error('Invalid invitation response')
        setInvitation(next)
      })
      .catch(nextError => {
        if (!controller.signal.aborted) setFailure({ kind: weeklyInvitationFailureKind(nextError), error: nextError })
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  const setupMode = invitation?.passwordMode === 'SET'
  const rawWorkspaceHref = getWeeklyInvitationWorkspaceHref({ seasonId: invitation?.team?.seasonId, seasons: SEASONS })
  const workspaceHref = rawWorkspaceHref ? `${rawWorkspaceHref}&lang=${getLocaleParam(locale)}` : null
  const spaceHref = `/me?lang=${getLocaleParam(locale)}`
  const isInvitedAccount = Boolean(user?.id && user.id === invitation?.user?.id)
  const expiry = invitation?.expiresAt ? new Date(invitation.expiresAt) : null
  const expiresAt = expiry && Number.isFinite(expiry.getTime()) ? new Intl.DateTimeFormat(messageLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(expiry) : ''

  async function handleAccept(event) {
    event.preventDefault()
    if (submitLock.current || !isPendingWeeklyInvitation(invitation) || !token.current || accepted) return
    const validation = validateWeeklyInvitationPassword({ password, confirmation, passwordMode: invitation.passwordMode }, messageLocale)
    if (validation) { setError(validation); return }
    submitLock.current = true
    setBusy('accept')
    setError('')
    try {
      const result = await acceptWeeklyAccountInvitation({ token: token.current, password })
      if (!mounted.current) return
      if (result?.accepted !== true || result?.team?.id !== invitation.team.id || result?.identity?.type !== invitation.identityType) throw new Error('Unexpected invitation acceptance')
      token.current = ''
      window.history.replaceState(window.history.state, '', link.cleanPath)
      setPassword('')
      setConfirmation('')
      setShowPassword(false)
      setAccepted(true)
      // Refresh is a separate next action; it cannot undo this success.
    } catch (nextError) {
      if (!mounted.current) return
      const kind = weeklyInvitationFailureKind(nextError)
      if (kind !== 'retry') { setFailure({ kind, error: nextError }); setPassword(''); setConfirmation('') }
      else setError(weeklyInvitationErrorMessage(nextError, messageLocale))
    } finally { submitLock.current = false; if (mounted.current) setBusy('') }
  }

  async function handleSignedIn(signedIn) {
    if (signedIn?.id !== invitation.user.id) throw new Error(t('登录的账号不是本次受邀账号，请使用上方受邀邮箱对应的账号。', 'Use the account associated with the invited email. The signed-in account does not match.'))
    if (accepted && workspaceHref) navigate(workspaceHref, { replace: true })
    else setDialogMode('')
  }

  async function handleContinue() {
    if (submitLock.current || !isInvitedAccount || !workspaceHref) return
    submitLock.current = true
    setBusy('continue')
    setError('')
    try {
      const refreshed = await refreshAccountData()
      if (!mounted.current) return
      if (!refreshed) { setError(t('身份已认领。当前登录已变化，请重新登录受邀账号。', 'Your identity is linked. Sign in with the invited account again.')); return }
      navigate(workspaceHref, { replace: true })
    } catch {
      if (mounted.current) setError(t('身份已认领，但账号资料同步失败。请重试进入工作台。', 'Your identity is linked, but account details could not be refreshed. Try entering the workspace again.'))
    } finally { submitLock.current = false; if (mounted.current) setBusy('') }
  }

  const failureTitles = {
    missing: t('请打开完整邀请链接', 'Open your invitation link'), used: t('这份邀请已认领', 'This invitation was claimed'),
    expired: t('邀请已过期', 'Invitation expired'), revoked: t('邀请已撤销', 'Invitation revoked'),
    unavailable: t('暂时无法认领这份邀请', 'This invitation is unavailable'), retry: t('暂时无法核对邀请', 'Unable to check the invitation')
  }
  const title = loading ? t('正在核对邀请', 'Checking your invitation') : failure ? failureTitles[failure.kind] : accepted ? t('身份已认领，继续参赛', 'Your identity is linked') : setupMode ? t('设置密码，激活参赛账号', 'Activate your account') : t('用现有账号认领身份', 'Link your existing account')

  return <AccountFrame compact title={t(uiText("邀请认领", locale), 'Claim invitation')} eyebrow="JOIN YOUR TEAM" description={t(uiText("一次认领，连接队伍、比赛与个人事务。", locale), 'Connect your account to your team and matches.')}>
    <div className={styles.shell} data-i18n-ignore>
      <ol className={styles.steps} aria-label={t(uiText("认领进度", locale), 'Claim progress')}>
        {[t('核对邀请', 'Check invitation'), t('绑定身份', 'Link identity'), t('进入周赛', 'Enter workspace')].map((label, index) => <li key={index} aria-current={index === (accepted ? 2 : invitation && !failure ? 1 : 0) ? 'step' : undefined} data-done={index < (accepted ? 2 : invitation && !failure ? 1 : 0)}><span>0{index + 1}</span>{label}</li>)}
      </ol>
      <div className={styles.grid}>
        <aside className={styles.manifest} aria-label={t(uiText("受邀身份资料", locale), 'Invited identity')}>
          <span className={styles.index}>YOUR INVITATION</span>
          <h2>{invitation?.team?.name || t(uiText("从这里加入队伍", locale), 'Join your team here')}</h2>
          <p className={styles.manifestIntro}>{t(uiText("账号、队伍与身份对应后，周赛准备和比赛任务会出现在你的空间。", locale), 'Once linked, team preparation and match tasks appear in My Space.')}</p>
          {invitation ? <dl>
            <div><dt>{t(uiText("受邀邮箱", locale), 'Invited email')}</dt><dd>{invitation.maskedEmail}</dd></div>
            <div><dt>{t(uiText("认领对象", locale), 'Identity')}</dt><dd>{invitation.target?.label || t(uiText("周赛身份", locale), 'Weekly identity')}</dd></div>
            <div><dt>{t(uiText("职责", locale), 'Role')}</dt><dd>{invitation.identityType === 'MANAGER' ? t(uiText("队长 / 队伍负责人", locale), 'Captain / team manager') : t(uiText("选手 · 本队只读", locale), 'Player · team read access')}</dd></div>
            {expiresAt && !accepted ? <div><dt>{t(uiText("有效至（本地时间）", locale), 'Expires (local time)')}</dt><dd>{expiresAt}</dd></div> : null}
          </dl> : <dl><div><dt>{t(uiText("邀请由谁提供", locale), 'Who provides the link')}</dt><dd>{t(uiText("周赛管理员或队伍负责人", locale), 'Weekly organizer or team captain')}</dd></div><div><dt>{t(uiText("已有账号", locale), 'Already have an account')}</dt><dd>{t(uiText("使用原账号，无需重新注册", locale), 'Use your existing account')}</dd></div></dl>}
          <p className={styles.permission}>{t(uiText("本次认领只连接邀请指定的身份。队伍负责人和选手的可用操作，以赛季实际权限为准。", locale), 'This link only claims the specified identity. Available team actions follow the season permissions.')}</p>
        </aside>
        <section className={styles.panel} aria-labelledby="weekly-activation-title" aria-busy={loading || Boolean(busy)}>
          <span className={styles.kicker}>{accepted ? '03 / READY TO CONTINUE' : invitation && !failure ? '02 / LINK ACCOUNT' : '01 / INVITATION'}</span>
          <h2 id="weekly-activation-title">{title}</h2>
          {loading ? <p role="status" className={styles.notice}>{t(uiText("正在核对一次性邀请与队伍资料…", locale), 'Checking your invitation and team details…')}</p> : null}
          {failure && !loading ? <div className={styles.complete}>
            <p className={styles.intro} role="status">{failure.kind === 'missing' ? t(uiText("链接中没有有效凭证。请重新打开管理员提供的完整邀请；普通账号登录不能替代身份认领。", locale), 'This address has no valid invitation. Reopen the complete link from the organizer; signing in alone does not claim an identity.') : weeklyInvitationErrorMessage(failure.error, messageLocale)}</p>
            {['expired', 'revoked', 'unavailable'].includes(failure.kind) ? <p className={styles.notice}>{t(uiText("拿到新的邀请后，直接打开新链接。已经注册的账号和已有队伍资料会保留。", locale), 'Open the newly issued link when available. Your existing account and team records remain in place.')}</p> : null}
            <div className={styles.actions}>
              {failure.kind === 'retry' ? <button className={styles.primary} type="button" onClick={() => setAttempt(value => value + 1)}>{t(uiText("重新核对邀请", locale), 'Retry invitation check')}</button> : null}
              {['used', 'missing'].includes(failure.kind) ? <button className={styles.primary} type="button" onClick={() => setDialogMode('login')}>{t(uiText("登录已有账号", locale), 'Sign in to your account')}</button> : null}
              <Link to={spaceHref}>{t(uiText("返回我的空间", locale), 'Return to My Space')} <span aria-hidden="true">↗</span></Link>
            </div>
          </div> : null}
          {invitation && !accepted && !failure ? <form className={styles.form} onSubmit={handleAccept} aria-label={t(uiText("认领周赛身份", locale), 'Claim weekly identity')}>
            <p className={styles.intro}>{setupMode ? t(uiText("为受邀邮箱设置登录密码。确认后，将绑定这里显示的队伍身份。", locale), 'Set a password for the invited email to link the identity shown here.') : t(uiText("该邮箱已有账号。输入原密码确认本人操作；认领不会更改密码。", locale), 'This email already has an account. Confirm with its current password; claiming will not change it.')}</p>
            {user && !isInvitedAccount ? <p className={styles.notice}>{t(uiText("当前登录：{0}。本次认领属于 {1}，完成后需要登录受邀账号。", locale, [user.displayName || user.email, invitation.maskedEmail]), `Currently signed in as ${user.displayName || user.email}. This invitation belongs to ${invitation.maskedEmail}; sign in with that account after claiming.`)}</p> : null}
            <label><span>{setupMode ? t(uiText("设置密码", locale), 'Set password') : t(uiText("现有账号密码", locale), 'Current password')}</span><span className={styles.passwordField}><input aria-label={setupMode ? t(uiText("设置密码", locale), 'Set password') : t(uiText("现有账号密码", locale), 'Current password')} type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} minLength={8} autoComplete={setupMode ? 'new-password' : 'current-password'} required disabled={Boolean(busy)} aria-describedby="weekly-password-hint" /><button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? t(uiText("隐藏", locale), 'Hide') : t(uiText("显示", locale), 'Show')}</button></span></label>
            <small id="weekly-password-hint">{t(uiText("至少 8 位，最多 72 个 UTF-8 字节；中文等字符占多个字节。", locale), 'At least 8 characters, up to 72 UTF-8 bytes; some characters use multiple bytes.')}</small>
            {setupMode ? <label><span>{t(uiText("再次输入密码", locale), 'Confirm password')}</span><input type={showPassword ? 'text' : 'password'} value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required disabled={Boolean(busy)} /></label> : <button type="button" className={styles.textButton} onClick={() => setDialogMode('forgot')}>{t(uiText("忘记现有密码？", locale), 'Forgot your current password?')}</button>}
            {error ? <p role="alert" className={styles.error}>{error}</p> : null}
            <button className={styles.primary} type="submit" disabled={Boolean(busy)}>{busy === 'accept' ? t(uiText("正在绑定身份…", locale), 'Linking identity…') : t(uiText("确认并绑定身份", locale), 'Confirm and link identity')} <span aria-hidden="true">→</span></button>
            <small>{t(uiText("请先核对受邀邮箱与队伍。认领不自动切换当前登录账号。", locale), 'Check the invited email and team before confirming. Claiming does not switch your signed-in account.')}</small>
          </form> : null}
          {accepted ? <div className={styles.complete}>
            <p className={styles.success} role="status"><strong>{t(uiText("认领已完成", locale), 'Identity linked')}</strong><span>{invitation.target?.label || t(uiText("周赛身份", locale), 'Weekly identity')} · {invitation.team.name}</span></p>
            <p className={styles.intro}>{t(uiText("原有队伍资料保持原样。接下来登录受邀账号，即可查看参赛准备与比赛任务。", locale), 'Your team records are preserved. Sign in with the invited account to continue with preparation and match tasks.')}</p>
            {!workspaceHref ? <p className={styles.notice}>{t(uiText("账号认领已经完成，但该赛季的队伍端入口尚未配置开放；不会转入其他赛季。", locale), 'Your identity is linked. This season’s workspace is not open yet; you will not be sent to another season.')}</p> : null}
            {error ? <p role="alert" className={styles.error}>{error}</p> : null}
            {isBootstrapping ? <p role="status">{t(uiText("正在核对当前登录账号…", locale), 'Checking the current account…')}</p> : isInvitedAccount ? workspaceHref ? <button type="button" className={styles.primary} onClick={handleContinue} disabled={Boolean(busy)}>{busy === 'continue' ? t(uiText("正在同步账号…", locale), 'Refreshing account…') : t(uiText("进入我的周赛工作台", locale), 'Enter my weekly workspace')} →</button> : null : <div className={styles.form} aria-label={uiText("登录受邀账号", locale)}><p>{t(uiText("请使用受邀邮箱 {0} 登录。", locale, [invitation.maskedEmail]), `Sign in with the invited email ${invitation.maskedEmail}.`)}</p><button type="button" className={styles.primary} onClick={() => setDialogMode('login')}>{t(uiText("登录受邀账号", locale), 'Sign in with invited account')} →</button></div>}
          </div> : null}
        </section>
      </div>
      {dialogMode ? <AuthDialog open onClose={closeLogin} initialMode={dialogMode} onSignedIn={invitation ? handleSignedIn : signedIn => { if (signedIn?.id) navigate(spaceHref, { replace: true }) }} locale={messageLocale} /> : null}
    </div>
  </AccountFrame>
}

import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { fetchAccountSessions } from '../../features/account-security/accountSecurityApi.js'
import { accountSettingsError } from '../../features/account-security/accountFoundationSettings.js'
import styles from './AccountSettingsPage.module.css'

export default function AccountOverview({ user, spaceHref }) {
  const uiLocale = useUiLocale()
  const location = useLocation()
  const { clearRevokedSession } = useAuth()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetchAccountSessions({ signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setSessions(result)
    }).catch(cause => {
      if (controller.signal.aborted) return
      if (cause?.status === 401) clearRevokedSession()
      setSessions(null)
      setError(accountSettingsError(cause))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt, clearRevokedSession])

  const href = section => ({ pathname: location.pathname, search: location.search, hash: `#${section}` })
  const current = sessions?.find(session => session.current)
  const verified = user.emailVerified === true
  const emailKnown = typeof user.emailVerified === 'boolean'
  const profileReadOnly = ['GUEST', 'OPERATOR'].includes(user.role)
  return <section className={styles.overview} aria-labelledby="overview-title">
    <div className={styles.overviewHeading}><div><h2 id="overview-title" tabIndex={-1}>{uiText("账号概览", uiLocale)}</h2><p>{uiText("个人资料、登录与验证状态，都在这里。", uiLocale)}</p></div><span className={styles.kicker} aria-hidden="true">YOUR ACCOUNT</span></div>
    <div className={styles.overviewGrid}>
      <section className={styles.accountSummary} aria-label={uiText("当前账号", uiLocale)}>
        <span className={styles.summaryAvatar} aria-hidden="true">{String(user.displayName || 'FC').slice(0, 2)}</span>
        <h3 data-i18n-ignore>{user.displayName || user.username || '—'}</h3>
        <dl><div><dt>{uiText("登录邮箱", uiLocale)}</dt><dd data-i18n-ignore>{user.email || '—'}</dd></div><div><dt>{uiText("用户名", uiLocale)}</dt><dd data-i18n-ignore>{user.username || '—'}</dd></div></dl>
        <Link to={href('profile')}>{profileReadOnly ? uiText("查看个人资料", uiLocale) : uiText("编辑个人资料", uiLocale)} <span aria-hidden="true">↗</span></Link>
        <p>{uiText("账号资料用于个人展示。参赛身份、队伍与出赛名单在我的空间管理。", uiLocale)}</p>
      </section>
      <div className={styles.overviewChecks}>
        <section className={styles.overviewCheck} data-attention={emailKnown && !verified} aria-labelledby="overview-email">
          <div className={styles.checkHeading}><span className={styles.checkNumber} aria-hidden="true">01</span><h3 id="overview-email">{uiText("邮箱验证", uiLocale)}</h3><span className={styles.badge} data-ready={verified}>{verified ? uiText("已验证", uiLocale) : emailKnown ? uiText("待验证", uiLocale) : uiText("状态待确认", uiLocale)}</span></div>
          <p>{verified ? uiText("登录邮箱已完成验证，可用于接收账号验证邮件。", uiLocale) : uiText("确认登录邮箱属于你。发送邮件后，打开邮件中的验证链接即可完成。", uiLocale)}</p>
          <Link className={verified ? styles.secondary : styles.primary} to={href('email')}>{verified ? uiText("查看邮箱", uiLocale) : uiText("前往邮箱验证", uiLocale)} <span aria-hidden="true">→</span></Link>
        </section>
        <section className={styles.overviewCheck} aria-labelledby="overview-devices">
          <div className={styles.checkHeading}><span className={styles.checkNumber} aria-hidden="true">02</span><h3 id="overview-devices">{uiText("登录设备", uiLocale)}</h3><span className={styles.checkCount} aria-live="polite">{loading ? uiText("读取中…", uiLocale) : sessions ? <><b>{sessions.length}</b>{uiText(" 条有效登录", uiLocale)}</> : uiText("暂未同步", uiLocale)}</span></div>
          {error ? <p role="alert">{error}</p> : <p>{loading ? uiText("正在核对当前与其他设备的登录记录。", uiLocale) : current ? <>{uiText("当前登录：", uiLocale)}<strong data-i18n-ignore>{current.deviceName || '—'}</strong>{uiText("。可以在设备列表退出不再使用的登录。", uiLocale)}</> : uiText("当前登录的设备信息暂未识别，可到设备列表核对。", uiLocale)}</p>}
          <div className={styles.inlineActions}><Link className={styles.secondary} to={href('sessions')}>{uiText("管理登录设备 ", uiLocale)}<span aria-hidden="true">→</span></Link>{error && <button type="button" className={styles.textButton} onClick={() => setAttempt(value => value + 1)}>{uiText("重新读取", uiLocale)}</button>}</div>
        </section>
        <div className={styles.passwordRow}><div><h3>{uiText("登录密码", uiLocale)}</h3><p>{uiText("修改后所有设备均需重新登录。", uiLocale)}</p></div><Link to={href('password')}>{uiText("修改密码 ", uiLocale)}<span aria-hidden="true">↗</span></Link></div>
      </div>
    </div>
    <Link className={styles.spaceReturn} to={spaceHref}><span><strong>{uiText("继续参赛事务", uiLocale)}</strong><small>{uiText("查看本周准备、比赛与队伍安排", uiLocale)}</small></span><span>{uiText("我的空间 ", uiLocale)}<i aria-hidden="true">→</i></span></Link>
  </section>
}

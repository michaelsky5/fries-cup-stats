import { lobbyText as t } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LOCALES, setStoredLocale, withLocale } from '../../lib/locales.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import styles from './Lobby.module.css'
import '../../styles/fries-cup-data-system.css'

export default function LobbyFrame() {
  const uiLocale = useUiLocale()

  const { user, logout, isBootstrapping } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  // Email entry forms retain their one-time token after it is scrubbed from
  // the URL. Bootstrap or password-reset logout must not remount that form.
  // Personal lobby pages still reset their data when the account changes.
  const outletKey = location.pathname.startsWith('/account/') ? 'account-entry' : user?.id || 'guest'
  useEffect(() => { document.documentElement.lang = uiLocale; setStoredLocale(uiLocale) }, [uiLocale])
  return <div className={styles.frame} lang={uiLocale}>
    <header className={styles.header}>
      <Link to="/lobby" className={styles.brand}><img src="/logos/fries-cup-mark-ink.svg" alt={t("薯条杯")} /><span>FRIES CUP<small>{t("组队大厅 · TEAM LOBBY")}</small></span></Link>
      <nav aria-label={t("组队大厅导航")}><Link to="/lobby">{t("大厅")}</Link><Link to="/lobby/me">{t("我的组队")}</Link><Link to="/">{t("赛事中心")}</Link></nav>
      <div className={styles.account}>{isBootstrapping ? t("读取账号…") : user ? <><span>{user.displayName || user.username}</span><button onClick={logout}>{t("退出")}</button></> : <Link to={`/account/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>{t("登录／注册")}</Link>}</div>
      <select className={styles.localeSelect} aria-label={t('语言')} value={uiLocale} onChange={event => navigate(withLocale(location.pathname + location.search + location.hash, event.target.value), { replace: true })}>{LOCALES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
    </header>
    <main className={styles.main}><Outlet key={outletKey} /></main>
    <footer className={styles.footer}>{t("FRIES CUP · 找到队友，再一起上场。")}<span>{t("联系意愿与正式参赛资格分别确认。")}</span></footer>
  </div>
}

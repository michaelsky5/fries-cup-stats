import { lobbyText as t } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { setStoredLocale, withLocale } from '../../lib/locales.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import PublicHeader from '../../components/layout/PublicHeader.jsx'
import AccountAvatar from '../account-ui/AccountAvatar.jsx'
import shellStyles from '../fd-design/layoutStyles.js'
import authStyles from '../auth/AuthDialog.module.css'
import { canSignOutOfAccount, UNSAVED_ACCOUNT_MESSAGE } from '../account-ui/accountNavigationGuard.js'
import styles from './Lobby.module.css'
import '../../styles/fries-cup-data-system.css'

export default function LobbyFrame() {
  const uiLocale = useUiLocale()

  const { user, logout, isBootstrapping, authConfig } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  // Email entry forms retain their one-time token after it is scrubbed from
  // the URL. Bootstrap or password-reset logout must not remount that form.
  // Personal lobby pages still reset their data when the account changes.
  const outletKey = location.pathname.startsWith('/account/') ? 'account-entry' : user?.id || 'guest'
  const localPath = path => withLocale(path, uiLocale)
  const loginPath = localPath(`/account/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`)
  useEffect(() => { document.documentElement.lang = uiLocale; setStoredLocale(uiLocale) }, [uiLocale])
  async function signOut() {
    if (!canSignOutOfAccount()) { setLogoutError(UNSAVED_ACCOUNT_MESSAGE); return }
    setSigningOut(true); setLogoutError('')
    try { await logout() } catch { setLogoutError(t('请求未完成，请稍后重试。')) }
    finally { setSigningOut(false) }
  }
  // These pages own their email tokens. A second AuthDialog would open a
  // duplicate recovery form and independently consume the same URL.
  const accountControl = <Link className={authStyles.authButton} to={user ? localPath('/account') : loginPath} aria-label={user?.displayName || user?.username || t('登录')}>
    <AccountAvatar className={authStyles.avatar} user={user} />
    <span className={authStyles.authCopy}><span className={authStyles.authName}>{isBootstrapping ? t('读取账号…') : user?.displayName || user?.username || (authConfig?.selfRegistrationEnabled ? t('登录／注册') : t('登录'))}</span></span>
  </Link>
  return <div className={`${shellStyles.shell} ${styles.frame}`} lang={uiLocale} data-design="kpr" data-design-edition="hybrid" style={{ '--kpr-preview-height': '0px' }}>
    <PublicHeader activeGroup="lobby" activeNavLabel={t('组队大厅')} layoutLocale={uiLocale} withSeason={localPath} showSeason={false} showAccountModeSwitch={false} accountControl={accountControl}
      handleLocaleChange={locale => navigate(withLocale(location.pathname + location.search + location.hash, locale), { replace: true })} />
    <main className={styles.main}>
      <div className={styles.sectionBar}>
        <Link to={localPath('/')}>{t('赛事中心')} <span aria-hidden="true">/</span></Link>
        <nav aria-label={t('组队大厅导航')}><NavLink to={localPath('/lobby')} end>{t('大厅')}</NavLink><NavLink to={localPath('/lobby/me')}>{t('我的组队')}</NavLink></nav>
        {user && <button type="button" onClick={signOut} disabled={signingOut}>{t('退出')}</button>}
      </div>
      {logoutError && <p role="alert" className={styles.error}>{logoutError}</p>}
      <Outlet key={outletKey} />
    </main>
    <footer className={styles.footer}>{t("FRIES CUP · 找到队友，再一起上场。")}<span>{t("联系意愿与正式参赛资格分别确认。")}</span></footer>
  </div>
}

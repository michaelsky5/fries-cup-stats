import { lobbyText as t } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { setStoredLocale, withLocale } from '../../lib/locales.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import PublicHeader from '../../components/layout/PublicHeader.jsx'
import shellStyles from '../fd-design/layoutStyles.js'
import { canSignOutOfAccount, UNSAVED_ACCOUNT_MESSAGE } from '../account-ui/accountNavigationGuard.js'
import styles from './Lobby.module.css'
import '../../styles/fries-cup-data-system.css'

export default function LobbyFrame() {
  const uiLocale = useUiLocale()

  const { user, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  // Personal lobby pages reset their data when the account changes.
  const outletKey = user?.id || 'guest'
  const localPath = path => withLocale(path, uiLocale)
  useEffect(() => { document.documentElement.lang = uiLocale; setStoredLocale(uiLocale) }, [uiLocale])
  useEffect(() => { document.title = `${t('组队大厅', [], uiLocale)} | ${t('薯条杯', [], uiLocale)}` }, [uiLocale])
  async function signOut() {
    if (!canSignOutOfAccount()) { setLogoutError(UNSAVED_ACCOUNT_MESSAGE); return }
    setSigningOut(true); setLogoutError('')
    try { await logout() } catch { setLogoutError(t('请求未完成，请稍后重试。')) }
    finally { setSigningOut(false) }
  }
  // 票 2.71: the lobby signs in with the same dialog as the event pages (it used to link to /account/login,
  // whose entry pages now live in the account frame and keep their own email tokens).
  return <div className={`${shellStyles.shell} ${styles.frame}`} lang={uiLocale} data-design="kpr" data-design-edition="hybrid" style={{ '--kpr-preview-height': '0px' }}>
    <PublicHeader activeGroup="lobby" activeNavLabel={t('组队大厅')} layoutLocale={uiLocale} withSeason={localPath} showSeason={false} showAccountModeSwitch={false}
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

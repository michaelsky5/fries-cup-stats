import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PublicHeader from '../../components/layout/PublicHeader.jsx'
import { getNavLabel, getPersonalNavItem, getNavigationSearch } from '../../components/layout/publicNavigation.js'
import { getInitialSeasonId, getSeasonById, setStoredSeasonId, withSeason } from '../../config/seasons.js'
import { getStoredLocale, setStoredLocale } from '../../lib/i18n.js'
import { getReviewLocaleParam, normalizeReviewLocale } from '../../lib/reviewLocale.js'
import { useLocaleDomTranslation } from '../../hooks/useLocaleDomTranslation.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import useAccountCompetition from '../my-space/useAccountCompetition.js'
import layout from '../fd-design/layoutStyles.js'
import styles from './AccountFrame.module.css'
import { translateAccountSettingsText } from './accountSettingsCopy.js'

// Global account pages share the public frame without fetching a season snapshot.
export default function AccountFrame({ children, title, eyebrow = 'ACCOUNT', description, aside, compact = false }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const menu = useRef(null)
  const shell = useRef(null)
  const [initialSeasonId] = useState(getInitialSeasonId)
  const [initialLocale] = useState(getStoredLocale)
  const params = new URLSearchParams(location.search)
  const season = getSeasonById(params.get('season') || initialSeasonId)
  const locale = normalizeReviewLocale(params.get('lang') || initialLocale)
  title ??= uiText('账号设置', locale)
  const navigationSearch = getNavigationSearch(location.search, 'kpr5')
  const competition = useAccountCompetition(season.id)
  const publicLink = path => competition.link(withSeason(path, season.id, navigationSearch))
  const personalLabel = getNavLabel(getPersonalNavItem(isAuthenticated), locale)
  useLocaleDomTranslation(locale, shell, location.pathname === '/account' ? translateAccountSettingsText : undefined)
  useEffect(() => { setStoredSeasonId(season.id) }, [season.id])
  useEffect(() => { document.documentElement.lang = locale; setStoredLocale(locale) }, [locale])
  const changeContext = (key, value) => {
    const next = new URLSearchParams(location.search)
    next.set(key, value)
    navigate({ pathname: location.pathname, search: `?${next}`, hash: location.hash }, { replace: true })
  }
  return <div ref={shell} className={`${layout.shell} ${styles.frame}`} style={{ '--kpr-preview-height': '0px' }} data-design="kpr" data-design-edition="hybrid" data-header-mode="account" data-locale={locale}>
    <PublicHeader mobileMenuRef={menu} activeNavLabel={personalLabel} withSeason={publicLink} layoutLocale={locale} compatibleLayoutLocale={locale} season={season} seasonId={season.id} seasonStatus={season.lifecycle === 'ARCHIVED' ? { isFinished: true } : undefined} handleSeasonChange={id => changeContext('season', getSeasonById(id).publicCode)} handleLocaleChange={value => changeContext('lang', getReviewLocaleParam(value))} />
    <div className={styles.context}><Link to={publicLink('/me')} data-i18n-ignore>{personalLabel}</Link><span aria-hidden="true">/</span><strong>{title}</strong><span className={styles.scope}>{location.pathname === '/account' ? uiText("通用账号设置", locale) : uiText("参赛服务", locale)}</span></div>
    <main className={styles.main} data-compact={compact}>
      <header className={styles.intro}><div><span className={styles.eyebrow}>{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{aside}</header>
      {children}
    </main>
    <footer className={styles.footer}><span>FRIES CUP <b>DATA CENTER</b></span><Link to={publicLink('/')}>{uiText("返回赛事总览 ↗", locale)}</Link></footer>
  </div>
}

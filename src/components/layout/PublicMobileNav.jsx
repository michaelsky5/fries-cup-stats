import { translateUiText as uiText, pickUiLocale } from '../../lib/uiText.js'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import KprDialog from '../../features/kpr-design/KprDialog.jsx'
import { getNavLabel } from './publicNavigation.js'
import useMobileTabNavigation from './useMobileTabNavigation.js'
import styles from './PublicMobileNav.module.css'

const DOCK_ITEMS = [
  { group: 'overview', zh: '赛事', en: 'Events', ko: '대회', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
  { group: 'matches', zh: '比赛', en: 'Matches', ko: '경기', icon: 'M3 5h18v15H3z M7 2v6 M17 2v6 M3 10h18 M8 14v3 M16 14v3' },
  { group: 'database', zh: '数据', en: 'Stats', ko: '기록', icon: 'M4 20V12h4v8 M10 20V4h4v16 M16 20V8h4v12 M2 20h20' },
  { group: 'space', zh: '我的', en: 'My', ko: '내 정보', icon: 'M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21v-3a8 8 0 0 1 16 0v3' }
]

function NavIcon({ path }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={path} /></svg>
}

export default function PublicMobileNav({ items, locale, navPath, accountAttention }) {
  const navigation = useMobileTabNavigation(navPath)
  const dockItems = DOCK_ITEMS.filter(item => items.some(target => target.group === item.group))
  return <nav className={styles.dock} style={{ '--mobile-tab-count': dockItems.length }} aria-label={pickUiLocale(locale, '手机主导航', 'Mobile primary navigation', '모바일 기본 메뉴', '手機主導覽')} data-public-mobile-nav data-i18n-ignore>
    {dockItems.map(item => {
      const itemPath = items.find(candidate => candidate.group === item.group).to
      let fallback = navPath(itemPath)
      if (item.group === 'matches') {
        const url = new URL(fallback, 'https://navigation.invalid')
        if (!url.searchParams.has('view')) url.searchParams.set('view', 'list')
        fallback = url.pathname + url.search
      }
      const target = navigation.target(item.group, fallback)
      return <Link key={item.group} to={target.to} state={target.state}
        onClick={event => navigation.activate(event, item.group, fallback)}
        aria-current={navigation.group === item.group ? 'page' : undefined}>
        <NavIcon path={item.icon} /><span>{pickUiLocale(locale, item.zh, item.en, item.ko, uiText(item.zh, 'zh-TW'))}</span>
        {item.group === 'space' && accountAttention?.visible ? <i className={styles.attention} aria-label={accountAttention.ariaLabel} /> : null}
      </Link>
    })}
  </nav>
}

export function PublicMobileMenu({ items, locale, navPath, children, reviewAvailable = false, personalAvailable = true }) {
  const location = useLocation()
  const [openKey, setOpenKey] = useState(null)
  const open = openKey === location.key
  const close = () => setOpenKey(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)')
    const closeOnDesktop = () => { if (!media.matches) setOpenKey(null) }
    media.addEventListener('change', closeOnDesktop)
    return () => media.removeEventListener('change', closeOnDesktop)
  }, [])
  const destinations = items.filter(item => ['advance', 'roster'].includes(item.group))
  const title = pickUiLocale(locale, '赛事与设置', 'Event & settings', '대회 및 설정', '賽事與設定')
  return <>
    <button type="button" className={styles.menuTrigger} aria-label={title} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpenKey(location.key)}>
      <NavIcon path="M4 6h16 M4 12h16 M4 18h16" />
    </button>
    <KprDialog open={open} onClose={close} title={title} locale={locale} className={styles.sheet}>
      <nav className={styles.destinations} aria-label={title} data-i18n-ignore>
        {destinations.map(item => <Link key={item.group} to={navPath(item.to)} onClick={close}><strong>{getNavLabel(item, locale)}</strong><span aria-hidden="true">→</span></Link>)}
        {reviewAvailable ? <Link to={navPath('/review')} onClick={close}><strong>{pickUiLocale(locale, '赛季回顾', 'Season review', '시즌 리뷰', '賽季回顧')}</strong><span aria-hidden="true">→</span></Link> : null}
        {personalAvailable ? <>
          <Link to={navPath('/me?section=following')} onClick={close}><strong>{pickUiLocale(locale, '我的关注', 'Following', '내 관심 목록', '我的關注')}</strong><span aria-hidden="true">→</span></Link>
          <Link to={navPath('/account')} onClick={close}><strong>{pickUiLocale(locale, '账号设置', 'Account settings', '계정 설정', '帳號設定')}</strong><span aria-hidden="true">→</span></Link>
        </> : null}
      </nav>
      {children}
    </KprDialog>
  </>
}

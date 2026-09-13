import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import KprDialog from '../../features/kpr-design/KprDialog.jsx'
import { getNavLabel } from './publicNavigation.js'
import styles from './PublicMobileNav.module.css'

const DOCK_ITEMS = [
  { group: 'overview', zh: '总览', en: 'Home', ko: '개요', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
  { group: 'matches', zh: '赛程', en: 'Matches', ko: '경기', icon: 'M3 5h18v15H3z M7 2v6 M17 2v6 M3 10h18 M8 14v3 M16 14v3' },
  { group: 'roster', zh: '阵容', en: 'Roster', ko: '명단', icon: 'M8 5h8v7H8z M5 21v-5h14v5 M2 7v6 M22 7v6' },
  { group: 'database', zh: '数据', en: 'Stats', ko: '기록', icon: 'M4 20V12h4v8 M10 20V4h4v16 M16 20V8h4v12 M2 20h20' }
]

function NavIcon({ path }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={path} /></svg>
}

export default function PublicMobileNav({ items, activeGroup, locale, navPath, children, accountAttention }) {
  const location = useLocation()
  const [openKey, setOpenKey] = useState(null)
  const isEn = locale === 'en-US'
  const isKo = locale === 'ko-KR'
  const open = openKey === location.key
  const close = () => setOpenKey(null)
  const isMoreActive = !DOCK_ITEMS.some(item => item.group === activeGroup)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)')
    const closeOnDesktop = () => { if (!media.matches) setOpenKey(null) }
    media.addEventListener('change', closeOnDesktop)
    return () => media.removeEventListener('change', closeOnDesktop)
  }, [])

  return <>
    <nav className={styles.dock} aria-label={isEn ? 'Mobile event navigation' : isKo ? '모바일 대회 메뉴' : uiText("手机赛事导航", locale)} data-public-mobile-nav data-i18n-ignore>
      {DOCK_ITEMS.map(item => {
        const target = items.find(candidate => candidate.group === item.group)
        return <Link key={item.group} to={navPath(target.to)} aria-current={activeGroup === item.group ? 'page' : undefined}>
          <NavIcon path={item.icon} /><span>{isEn ? item.en : isKo ? item.ko : uiText(item.zh, locale)}</span>
        </Link>
      })}
      <button type="button" aria-haspopup="dialog" aria-expanded={open} data-active={isMoreActive || undefined} onClick={() => setOpenKey(location.key)}>
        <NavIcon path="M4 6h16 M4 12h16 M4 18h16" /><span>{isEn ? 'More' : isKo ? '더 보기' : uiText("更多", locale)}</span>
        {accountAttention?.visible ? <i className={styles.attention} aria-label={accountAttention.ariaLabel} /> : null}
      </button>
    </nav>
    <KprDialog open={open} onClose={close} title={isEn ? 'Explore the event' : isKo ? '대회 둘러보기' : uiText("继续逛薯条杯", locale)} locale={locale} className={styles.sheet}>
      <nav className={styles.destinations} aria-label={isEn ? 'All event pages' : uiText("全部赛事页面", locale)} data-i18n-ignore>
        {items.map((item, index) => <Link key={item.group} to={navPath(item.to)} onClick={close} aria-current={activeGroup === item.group ? 'page' : undefined}>
          <small aria-hidden="true">0{index + 1}</small><strong>{getNavLabel(item, locale)}</strong><span aria-hidden="true">↗</span>
        </Link>)}
      </nav>
      {children}
    </KprDialog>
  </>
}

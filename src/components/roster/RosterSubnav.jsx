import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useRef } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { getStaffDirectoryGroup } from '../../lib/staffDirectoryGroups.js'
import styles from '../../features/fd-design/rosterSubnavStyles.js'
import indexStyles from '../../features/roster-index/RosterIndex.module.css'
import sectionStyles from '../navigation/SignalSectionNav.module.css'

const NAV_ITEMS = [
  { to: '/roster', label: '阵容总览', code: 'FIELD', match: '/roster' },
  { to: '/teams', label: '参赛战队', code: 'TEAMS', match: '/teams' },
  { to: '/players', label: '参赛选手', code: 'PLAYERS', match: '/players' },
  { to: '/staff', label: '赛事职员', code: 'STAFF', match: '/staff' }
]

const INDEX_NAV_ITEMS = [
  { ...NAV_ITEMS[0], english: 'Overview' },
  { ...NAV_ITEMS[1], english: 'Teams' },
  { ...NAV_ITEMS[2], english: 'Players' },
  { to: '/staff?group=team', label: '战队职员', english: 'Team staff', code: 'TEAM STAFF', match: '/staff', group: 'team' },
  { to: '/staff?group=event', label: '赛事职员', english: 'Event staff', code: 'EVENT STAFF', match: '/staff', group: 'event' }
]

export default function RosterSubnav({ className = '', presentation = 'default' }) {
  const location = useLocation()
  const { withSeason, locale = 'zh-CN' } = useOutletContext()
  const navRef = useRef(null)
  const staffGroup = getStaffDirectoryGroup(location.search)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const showActiveItem = () => {
      const active = nav.querySelector('[aria-current="page"]')
      if (!active || nav.scrollWidth <= nav.clientWidth) return
      const bounds = nav.getBoundingClientRect()
      const item = active.getBoundingClientRect()
      if (item.left < bounds.left) nav.scrollLeft += item.left - bounds.left
      else if (item.right > bounds.right) nav.scrollLeft += item.right - bounds.right
    }
    showActiveItem()
    const observer = new ResizeObserver(showActiveItem)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [location.pathname, staffGroup, presentation])

  if (presentation === 'index') return <nav ref={navRef} className={`${indexStyles.subnav} ${sectionStyles.root}`} aria-label={locale === 'en-US' ? 'Roster sections' : uiText("参赛阵容导航", locale)} data-roster-subnav data-i18n-ignore>
    {INDEX_NAV_ITEMS.map(item => <Link key={item.to} className={sectionStyles.item} to={withSeason(item.to)} aria-current={location.pathname.startsWith(item.match) && (!item.group || item.group === staffGroup) ? 'page' : undefined}>
      <span>{locale === 'en-US' ? item.english : uiText(item.label, locale)}</span>
      {locale !== 'en-US' ? <small className={sectionStyles.code} aria-hidden="true">{item.code}</small> : null}
    </Link>)}
  </nav>

  return (
    <nav className={`${styles.subnav} ${className}`.trim()} aria-label="Roster sections">
      {NAV_ITEMS.map(item => {
        const active = location.pathname.startsWith(item.match)

        return (
          <Link
            key={item.to}
            to={withSeason(item.to)}
            className={`${styles.subnavLink} ${active ? styles.subnavActive : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.subnavLabel}>{item.label}</span>
            <span className={styles.subnavCode}>{item.code}</span>
          </Link>
        )
      })}
    </nav>
  )
}

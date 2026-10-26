import { Link } from 'react-router-dom'
import { pickUiLocale } from '../../lib/uiText.js'
import sectionStyles from './SignalSectionNav.module.css'
import styles from './OverviewSectionNav.module.css'

const SECTIONS = [
  { id: 'overview', path: '/', label: ['总览', 'Overview', '개요', '總覽'] },
  { id: 'advance', path: '/advance', label: ['晋级', 'Advance', '진출', '晉級'] },
  { id: 'roster', path: '/roster', label: ['阵容', 'Roster', '명단', '陣容'] }
]

export function overviewSectionId(pathname) {
  if (/^\/?$/.test(pathname)) return 'overview'
  if (/^\/advance\/?$/.test(pathname)) return 'advance'
  if (/^\/roster\/?$/.test(pathname)) return 'roster'
  return null
}

// Phone only: overview, advance and roster share the 总览 tab in the dock, so this row
// switches between them without opening the menu. Desktop already lists all three in the header.
export default function OverviewSectionNav({ active, locale, navPath, inset = false }) {
  return <nav className={`${sectionStyles.root} ${styles.nav}`} data-inset={inset || undefined} aria-label={pickUiLocale(locale, '赛事总览分区', 'Event overview sections', '대회 개요 구역', '賽事總覽分區')} data-overview-sections data-i18n-ignore>
    {SECTIONS.map(item => <Link
      key={item.id}
      className={sectionStyles.item}
      to={navPath(item.path)}
      aria-current={item.id === active ? 'page' : undefined}
    >{pickUiLocale(locale, ...item.label)}</Link>)}
  </nav>
}

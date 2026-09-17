import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { NavLink, useLocation, useOutletContext } from 'react-router-dom'
import styles from '../../features/fd-design/databaseSubnavStyles.js'

const ITEMS = [
  { to: '/leaderboard', label: '选手排行', meta: 'RANKING', group: 'leaderboard' },
  { to: '/heroes', label: '英雄数据', meta: 'HEROES', group: 'heroes' },
  { to: '/maps', label: '地图数据', meta: 'MAPS', group: 'maps' }
]

function getActiveGroup(pathname) {
  if (pathname.startsWith('/heroes')) return 'heroes'
  if (pathname.startsWith('/maps')) return 'maps'
  return 'leaderboard'
}

export default function DatabaseSubnav() {
  const uiLocale = useUiLocale()
  const location = useLocation()
  const { withSeason } = useOutletContext()
  const activeGroup = getActiveGroup(location.pathname)

  return (
    <nav className={styles.subnav} aria-label={uiText("数据资料导航", uiLocale)}>
      {ITEMS.map(item => (
        <NavLink
          key={item.group}
          to={withSeason(item.to)}
          className={[
            styles.subnavItem,
            activeGroup === item.group ? styles.subnavItemActive : ''
          ].filter(Boolean).join(' ')}
        >
          <span>{uiText(item.label, uiLocale)}</span>
          <em>{item.meta}</em>
        </NavLink>
      ))}
    </nav>
  )
}

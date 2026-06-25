import { NavLink, useLocation, useOutletContext } from 'react-router-dom'
import { withSeason as buildSeasonLink } from '../../config/seasons.js'
import styles from './DatabaseSubnav.module.css'

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
  const location = useLocation()
  const { seasonId } = useOutletContext()
  const activeGroup = getActiveGroup(location.pathname)

  return (
    <nav className={styles.subnav} aria-label="数据资料导航">
      {ITEMS.map(item => (
        <NavLink
          key={item.group}
          to={buildSeasonLink(item.to, seasonId, '')}
          className={[
            styles.subnavItem,
            activeGroup === item.group ? styles.subnavItemActive : ''
          ].filter(Boolean).join(' ')}
        >
          <span>{item.label}</span>
          <em>{item.meta}</em>
        </NavLink>
      ))}
    </nav>
  )
}

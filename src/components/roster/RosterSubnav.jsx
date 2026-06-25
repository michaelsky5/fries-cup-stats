import { Link, useLocation } from 'react-router-dom'
import styles from './RosterComponents.module.css'

const NAV_ITEMS = [
  { to: '/teams', label: '参赛战队', code: 'TEAMS', match: '/teams' },
  { to: '/players', label: '参赛选手', code: 'PLAYERS', match: '/players' },
  { to: '/staff', label: '赛事职员', code: 'STAFF', match: '/staff' }
]

export default function RosterSubnav() {
  const location = useLocation()
  const season = new URLSearchParams(location.search).get('season')

  return (
    <nav className={styles.subnav} aria-label="Roster sections">
      {NAV_ITEMS.map(item => {
        const active = location.pathname.startsWith(item.match)
        const cleanPath = season ? `${item.to}?season=${encodeURIComponent(season)}` : item.to

        return (
          <Link
            key={item.to}
            to={cleanPath}
            className={`${styles.subnavLink} ${active ? styles.subnavActive : ''}`}
          >
            <span className={styles.subnavLabel}>{item.label}</span>
            <span className={styles.subnavCode}>{item.code}</span>
          </Link>
        )
      })}
    </nav>
  )
}

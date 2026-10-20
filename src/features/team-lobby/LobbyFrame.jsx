import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import styles from './Lobby.module.css'
import '../../styles/fries-cup-data-system.css'

export default function LobbyFrame() {
  const { user, logout, isBootstrapping } = useAuth()
  const location = useLocation()
  return <div className={styles.frame}>
    <header className={styles.header}>
      <Link to="/lobby" className={styles.brand}><img src="/logos/fries-cup-mark-ink.svg" alt="薯条杯" /><span>FRIES CUP<small>组队大厅 · TEAM LOBBY</small></span></Link>
      <nav aria-label="组队大厅导航"><Link to="/lobby">大厅</Link><Link to="/lobby/me">我的组队</Link><Link to="/">赛事中心</Link></nav>
      <div className={styles.account}>{isBootstrapping ? '读取账号…' : user ? <><span>{user.displayName || user.username}</span><button onClick={logout}>退出</button></> : <Link to={`/account/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>登录／注册</Link>}</div>
    </header>
    <main className={styles.main}><Outlet key={user?.id || 'guest'} /></main>
    <footer className={styles.footer}>FRIES CUP · 找到队友，再一起上场。<span>联系意愿与正式参赛资格分别确认。</span></footer>
  </div>
}

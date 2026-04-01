import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDb } from '../lib/db.js'
import { getGlobalSummary } from '../lib/selectors.js'
import GlobalSummaryBar from '../components/summary/GlobalSummaryBar.jsx'
import styles from './DataLayout.module.css'

export default function DataLayout() {
  const [db, setDb] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    let alive = true
    setIsLoading(true)

    getDb()
      .then(data => {
        if (!alive) return
        setDb(data)
        setError('')
      })
      .catch(err => {
        if (!alive) return
        setError(err?.message || '获取失败')
      })
      .finally(() => {
        if (!alive) return
        setIsLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const summary = getGlobalSummary(db)
  
  // 用于保持导航栏在进入详情页时依然高亮
  const isMatchDetail = location.pathname.startsWith('/matches/')
  const isPlayerDetail = location.pathname.startsWith('/players/')
  const isTeamDetail = location.pathname.startsWith('/teams/')
  const isHeroes = location.pathname.startsWith('/heroes') 
  const isMaps = location.pathname.startsWith('/maps') 
  const isFantasy = location.pathname.startsWith('/fantasy') // ✨ 新增：电竞经理高亮状态

  return (
    <div className={styles.shell}>
      {/* --- 左侧边栏 --- */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <header className={styles.brand}>
            <div className={styles.brandKicker}>FriesCup 薯条杯</div>
            <div className={styles.brandTitle}>数据中心</div>
          </header>

          <nav className={styles.nav}>
            <div className={styles.navLabel}>公共枢纽</div>
            
            <NavLink
              to="/"
              end
              className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
            >
              <span className={styles.navMarker} />
              全局总控
            </NavLink>
            
            <NavLink
              to="/matches"
              className={({ isActive }) => `${styles.link} ${isActive || isMatchDetail ? styles.linkActive : ''}`}
            >
              <span className={styles.navMarker} />
              赛事大厅
            </NavLink>

            <NavLink
              to="/leaderboard"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
            >
              <span className={styles.navMarker} />
              数据排行
            </NavLink>

            <NavLink
              to="/players"
              className={({ isActive }) => `${styles.link} ${isActive || isPlayerDetail ? styles.linkActive : ''}`}
            >
              <span className={styles.navMarker} />
              选手名录
            </NavLink>

            <NavLink
              to="/teams"
              className={({ isActive }) => `${styles.link} ${isActive || isTeamDetail ? styles.linkActive : ''}`}
            >
              <span className={styles.navMarker} />
              战队总控
            </NavLink>

            <NavLink
              to="/heroes"
              className={({ isActive }) => `${styles.link} ${isActive || isHeroes ? styles.linkActive : ''}`}
            >
              <span className={styles.navMarker} />
              英雄情报
            </NavLink>

            <NavLink
              to="/maps"
              className={({ isActive }) => `${styles.link} ${isActive || isMaps ? styles.linkActive : ''}`}
            >
              <span className={styles.navMarker} />
              地图数据
            </NavLink>

            <NavLink
              to="/standings"
              className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
            >
              <span className={styles.navMarker} />
              战队排名
            </NavLink>

            {/* ✨ 新增：电竞经理入口 */}
            <NavLink
              to="/fantasy"
              className={({ isActive }) => `${styles.link} ${isActive || isFantasy ? styles.linkActive : ''}`}
            >
              <span className={styles.navMarker} />
              电竞经理(开发中)
            </NavLink>
          </nav>

          <footer className={styles.sidebarFooter}>
            <div className={styles.metaLabel}>最后同步</div>
            <div className={`${styles.metaValue} ${isLoading ? styles.textPulse : ''}`}>
              {isLoading ? '正在同步' : (summary.updatedAt || '暂无数据')}
            </div>
          </footer>
        </div>
      </aside>

      {/* --- 右侧主内容区 --- */}
      <div className={styles.mainWrapper}>
        <div className={styles.contentInner}>
          <GlobalSummaryBar summary={summary} />

          <main className={styles.main}>
            {isLoading ? (
              <div className={styles.systemBox}>
                <div className={styles.loader}></div>
                <div className={styles.systemText}>连接数据</div>
              </div>
            ) : error ? (
              <div className={`${styles.systemBox} ${styles.errorBox}`}>
                <div className={styles.errorTitle}>系统异常</div>
                <div className={styles.errorText}>{error}</div>
              </div>
            ) : (
              <Outlet context={{ db }} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
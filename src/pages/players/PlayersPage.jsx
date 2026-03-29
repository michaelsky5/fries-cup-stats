import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import PlayerCard from '../../components/players/PlayerCard.jsx'
import { safeArr } from '../../lib/selectors.js'
import styles from './PlayersPage.module.css'

function getRoleLabel(role) {
  if (role === 'ALL') return { cn: '全部位置', en: 'ALL ROLES' }
  if (role === 'TANK') return { cn: '重装', en: 'TANK' }
  if (role === 'DPS') return { cn: '输出', en: 'DPS' }
  return { cn: '支援', en: 'SUPPORT' }
}

export default function PlayersPage() {
  const { db } = useOutletContext()

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')

  const allPlayers = useMemo(() => safeArr(db?.players), [db])

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(p => {
      if (roleFilter !== 'ALL' && p.role !== roleFilter) return false

      if (query) {
        const q = query.toLowerCase()
        const matchName = (p.display_name || '').toLowerCase().includes(q)
        const matchId = (p.player_id || '').toLowerCase().includes(q)
        const matchTeam = (p.team_name || p.team_short_name || '').toLowerCase().includes(q)
        if (!matchName && !matchId && !matchTeam) return false
      }

      return true
    })
  }, [allPlayers, query, roleFilter])

  const summary = useMemo(() => {
    const teamSet = new Set(
      allPlayers
        .map(p => p.team_name || p.team_short_name || '')
        .filter(Boolean)
    )

    const tankCount = allPlayers.filter(p => p.role === 'TANK').length
    const dpsCount = allPlayers.filter(p => p.role === 'DPS').length
    const supCount = allPlayers.filter(p => p.role === 'SUP').length

    let currentFocus = '-'
    if (roleFilter === 'ALL') {
      const roleMap = [
        { role: 'TANK', count: tankCount, label: 'TANK' },
        { role: 'DPS', count: dpsCount, label: 'DPS' },
        { role: 'SUP', count: supCount, label: 'SUP' }
      ].sort((a, b) => b.count - a.count)
      currentFocus = roleMap[0]?.label || '-'
    } else {
      currentFocus = roleFilter
    }

    return {
      totalPlayers: allPlayers.length,
      filteredPlayers: filteredPlayers.length,
      totalTeams: teamSet.size,
      currentFocus
    }
  }, [allPlayers, filteredPlayers, roleFilter])

  const activeRole = getRoleLabel(roleFilter)

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>选手大厅</span>
            <span className={styles.heroKickerEn}>PLAYER ROSTER</span>
          </div>

          <h1 className={styles.heroTitle}>参赛选手名单</h1>

          <p className={styles.heroDesc}>
            全联盟注册选手档案入口。浏览选手所属战队、职责位置与个人标识，并进入详细画像页查看其场上表现与风格数据。
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.metaCn}>注册选手</span>
              <span className={styles.metaEn}>TOTAL PLAYERS</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.totalPlayers}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.metaCn}>当前结果</span>
              <span className={styles.metaEn}>FILTERED</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.filteredPlayers}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.metaCn}>所属战队</span>
              <span className={styles.metaEn}>ACTIVE TEAMS</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.totalTeams}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.metaCn}>当前阵列</span>
              <span className={styles.metaEn}>{activeRole.en}</span>
            </div>
            <div className={styles.heroMetaValueText}>{summary.currentFocus}</div>
          </div>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.toolbarHead}>
          <div className={styles.toolbarTitleGroup}>
            <div className={styles.toolbarTitle}>筛选条件</div>
            <div className={styles.toolbarSubTitle}>PLAYER FILTERS</div>
          </div>

          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => {
              setQuery('')
              setRoleFilter('ALL')
            }}
          >
            重置
            <span className={styles.resetBtnEn}>RESET</span>
          </button>
        </div>

        <div className={styles.toolbarMain}>
          <div className={styles.toolGroup}>
            <div className={styles.field}>
              <label className={styles.label}>
                <span className={styles.labelCn}>位置</span>
                <span className={styles.labelEn}>ROLE</span>
              </label>

              <select
                className={styles.select}
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="ALL">全部位置 / ALL ROLES</option>
                <option value="TANK">重装 / TANK</option>
                <option value="DPS">输出 / DPS</option>
                <option value="SUP">支援 / SUPPORT</option>
              </select>
            </div>
          </div>

          <div className={styles.toolGroupRight}>
            <div className={`${styles.field} ${styles.searchField}`}>
              <label className={styles.label}>
                <span className={styles.labelCn}>检索</span>
                <span className={styles.labelEn}>SEARCH</span>
              </label>

              <input
                className={styles.input}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="输入选手 ID / 游戏名 / 队伍名..."
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.gridSection}>
        {filteredPlayers.length > 0 ? (
          <div className={styles.grid}>
            {filteredPlayers.map(player => (
              <PlayerCard key={player.player_id} player={player} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyCn}>未找到匹配的选手</span>
            <span className={styles.emptyEn}>NO PLAYERS FOUND</span>
          </div>
        )}
      </section>
    </div>
  )
}
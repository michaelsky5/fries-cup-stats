import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { safeArr } from '../../lib/selectors.js'
import styles from './TeamsPage.module.css'

export default function TeamsPage() {
  const { db } = useOutletContext()
  const [query, setQuery] = useState('')

  const teamsWithStats = useMemo(() => {
    const teams = safeArr(db?.teams)
    const players = safeArr(db?.players)

    return teams.map(team => {
      // 🌟 新增：过滤掉状态为 EXITED 或 已退赛 的选手，只计算活跃人数
      const roster = players.filter(
        p => (p.team_id === team.team_id || p.team_name === team.team_name) 
             && p.status !== 'EXITED' 
             && p.status !== '已退赛'
      )

      return {
        ...team,
        playerCount: roster.length
      }
    })
  }, [db])

  const filteredTeams = useMemo(() => {
    if (!query) return teamsWithStats
    const q = query.toLowerCase()

    return teamsWithStats.filter(t =>
      (t.team_name || '').toLowerCase().includes(q) ||
      (t.team_short_name || '').toLowerCase().includes(q) ||
      (t.team_id || '').toLowerCase().includes(q)
    )
  }, [teamsWithStats, query])

  const summary = useMemo(() => {
    const totalTeams = teamsWithStats.length
    const filteredCount = filteredTeams.length
    const totalPlayers = teamsWithStats.reduce((sum, team) => sum + Number(team.playerCount || 0), 0)

    const largestRosterTeam = [...teamsWithStats]
      .sort((a, b) => Number(b.playerCount || 0) - Number(a.playerCount || 0))[0]

    return {
      totalTeams,
      filteredCount,
      totalPlayers,
      largestRoster: largestRosterTeam?.team_short_name || largestRosterTeam?.team_name || '-'
    }
  }, [teamsWithStats, filteredTeams])

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>战队大厅</span>
            <span className={styles.heroKickerEn}>TEAMS DIRECTORY</span>
          </div>

          <h1 className={styles.heroTitle}>联盟注册战队</h1>

          <p className={styles.heroDesc}>
            薯条杯联盟战队总览入口。浏览各支战队的识别信息、阵容规模与基础档案，并进入战队详情页查看其名单与对局数据。
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.metaCn}>注册战队</span>
              <span className={styles.metaEn}>TOTAL TEAMS</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.totalTeams}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.metaCn}>当前结果</span>
              <span className={styles.metaEn}>FILTERED</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.filteredCount}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.metaCn}>在册选手</span>
              <span className={styles.metaEn}>ROSTERED PLAYERS</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.totalPlayers}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.metaCn}>最大阵容</span>
              <span className={styles.metaEn}>LARGEST ROSTER</span>
            </div>
            <div className={styles.heroMetaValueText}>{summary.largestRoster}</div>
          </div>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.toolbarHead}>
          <div className={styles.toolbarTitleGroup}>
            <div className={styles.toolbarTitle}>检索条件</div>
            <div className={styles.toolbarSubTitle}>TEAM SEARCH</div>
          </div>

          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => setQuery('')}
          >
            重置
            <span className={styles.resetBtnEn}>RESET</span>
          </button>
        </div>

        <div className={styles.toolbarMain}>
          <div className={`${styles.field} ${styles.searchField}`}>
            <label className={styles.label}>
              <span className={styles.labelCn}>检索</span>
              <span className={styles.labelEn}>SEARCH</span>
            </label>

            <input
              className={styles.input}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="输入战队名 / 简称 / 编号..."
            />
          </div>
        </div>
      </section>

      <section className={styles.gridSection}>
        {filteredTeams.length > 0 ? (
          <div className={styles.grid}>
            {filteredTeams.map(team => (
              <Link key={team.team_id} to={`/teams/${team.team_id}`} className={styles.teamCard}>
                <div className={styles.cardGlow}></div>

                <div className={styles.cardTop}>
                  <div className={styles.teamCodeBlock}>
                    <div className={styles.teamShortName}>{team.team_short_name || team.team_id}</div>
                    <div className={styles.teamIdBox}>{team.team_id}</div>
                  </div>

                  <div className={styles.arrow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <div className={styles.cardMiddle}>
                  <div className={styles.teamName} title={team.team_name || '未命名战队'}>
                    {team.team_name || '未命名战队'}
                  </div>
                </div>

                <div className={styles.cardBottom}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>ROSTER</span>
                    <span className={styles.infoValue}>{team.playerCount}</span>
                  </div>

                  <div className={styles.infoDivider}></div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>ENTRY</span>
                    <span className={styles.infoValueText}>查看详情</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyCn}>未找到匹配的战队</span>
            <span className={styles.emptyEn}>NO TEAMS FOUND</span>
          </div>
        )}
      </section>
    </div>
  )
}
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import PlayerCard from '../../components/players/PlayerCard.jsx'
import { getLeaderboardRows, safeArr } from '../../lib/selectors.js'
import styles from './PlayersPage.module.css'

function getRoleLabel(role) {
  if (role === 'ALL') return { cn: '全部位置', en: 'ALL ROLES', short: 'ALL' }
  if (role === 'TANK') return { cn: '重装', en: 'TANK', short: 'TANK' }
  if (role === 'DPS') return { cn: '输出', en: 'DPS', short: 'DPS' }
  return { cn: '支援', en: 'SUPPORT', short: 'SUP' }
}

const SORT_OPTIONS = [
  { value: 'time_desc', cn: '按总时长', en: 'TIME PLAYED' },
  { value: 'maps_desc', cn: '按出场地图', en: 'MAPS PLAYED' },
  { value: 'dmg_desc', cn: '按伤害均值', en: 'AVG DAMAGE' },
  { value: 'elim_desc', cn: '按击杀均值', en: 'AVG ELIMS' },
  { value: 'heal_desc', cn: '按治疗均值', en: 'AVG HEALING' },
  { value: 'block_desc', cn: '按阻挡均值', en: 'AVG MITIGATION' },
  { value: 'name_asc', cn: '按名称 A-Z', en: 'NAME A-Z' }
]

function toNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function getSortValue(player, sortBy) {
  if (sortBy === 'time_desc') return toNum(player.raw_time_mins)
  if (sortBy === 'maps_desc') return toNum(player.maps_played)
  if (sortBy === 'dmg_desc') return toNum(player.avg_dmg)
  if (sortBy === 'elim_desc') return toNum(player.avg_elim)
  if (sortBy === 'heal_desc') return toNum(player.avg_heal)
  if (sortBy === 'block_desc') return toNum(player.avg_block)
  return 0
}

function formatViewLabel({ roleFilter, teamFilter, teamOptions }) {
  const role = getRoleLabel(roleFilter)
  const team = teamFilter === 'ALL'
    ? '全部战队'
    : (teamOptions.find(t => t.value === teamFilter)?.labelCn || '指定战队')

  return `${role.cn} / ${team}`
}

export default function PlayersPage() {
  const { db } = useOutletContext()

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('time_desc')

  const allPlayers = useMemo(() => {
    const leaderboardRows = safeArr(getLeaderboardRows?.(db))
    const playerTotals = safeArr(db?.player_totals)
    const rawPlayers = safeArr(db?.players)

    const source =
      leaderboardRows.length > 0 ? leaderboardRows
      : playerTotals.length > 0 ? playerTotals
      : rawPlayers

    return source.map(player => {
      const mapsPlayed = toNum(player.maps_played)
      const rawTimeMins = toNum(player.raw_time_mins)

      return {
        ...player,
        maps_played: mapsPlayed,
        raw_time_mins: rawTimeMins,
        avg_elim: toNum(player.avg_elim),
        avg_ast: toNum(player.avg_ast),
        avg_dth: toNum(player.avg_dth),
        avg_dmg: toNum(player.avg_dmg),
        avg_heal: toNum(player.avg_heal),
        avg_block: toNum(player.avg_block),
        hasStats: mapsPlayed > 0 || rawTimeMins > 0,
        search_blob: [
          player.display_name,
          player.nickname,
          player.player_name,
          player.player_id,
          player.team_name,
          player.team_short_name,
          player.most_played_hero
        ].filter(Boolean).join(' ').toLowerCase()
      }
    })
  }, [db])

  const teamOptions = useMemo(() => {
    const teamMap = new Map()

    allPlayers.forEach(player => {
      const key = player.team_id || player.team_name || player.team_short_name
      if (!key || teamMap.has(key)) return

      teamMap.set(key, {
        value: key,
        labelCn: player.team_name || player.team_short_name || '未知战队',
        labelEn: player.team_short_name || player.team_name || 'TEAM'
      })
    })

    return [...teamMap.values()].sort((a, b) => a.labelCn.localeCompare(b.labelCn, 'zh-Hans-CN'))
  }, [allPlayers])

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(player => {
      if (roleFilter !== 'ALL' && player.role !== roleFilter) return false
      if (teamFilter !== 'ALL' && (player.team_id || player.team_name || player.team_short_name) !== teamFilter) return false

      if (query.trim()) {
        const q = query.trim().toLowerCase()
        if (!player.search_blob.includes(q)) return false
      }

      return true
    })
  }, [allPlayers, query, roleFilter, teamFilter])

  const sortedPlayers = useMemo(() => {
    const rows = [...filteredPlayers]

    if (sortBy === 'name_asc') {
      return rows.sort((a, b) => {
        const aName = String(a.display_name || a.nickname || a.player_id || '')
        const bName = String(b.display_name || b.nickname || b.player_id || '')
        return aName.localeCompare(bName, 'zh-Hans-CN')
      })
    }

    return rows.sort((a, b) => {
      const diff = getSortValue(b, sortBy) - getSortValue(a, sortBy)
      if (diff !== 0) return diff

      const mapsDiff = toNum(b.maps_played) - toNum(a.maps_played)
      if (mapsDiff !== 0) return mapsDiff

      return String(a.display_name || a.player_id || '').localeCompare(
        String(b.display_name || b.player_id || ''),
        'zh-Hans-CN'
      )
    })
  }, [filteredPlayers, sortBy])

  const summary = useMemo(() => {
    const totalTeams = new Set(
      allPlayers.map(player => player.team_id || player.team_name || player.team_short_name).filter(Boolean)
    ).size

    const dataReadyPlayers = allPlayers.filter(player => player.hasStats).length
    const filteredTeams = new Set(
      sortedPlayers.map(player => player.team_id || player.team_name || player.team_short_name).filter(Boolean)
    ).size

    return {
      totalPlayers: allPlayers.length,
      dataReadyPlayers,
      filteredPlayers: sortedPlayers.length,
      filteredTeams,
      totalTeams,
      currentView: formatViewLabel({ roleFilter, teamFilter, teamOptions })
    }
  }, [allPlayers, roleFilter, sortedPlayers, teamFilter, teamOptions])

  const currentSort = SORT_OPTIONS.find(option => option.value === sortBy) || SORT_OPTIONS[0]
  const activeRole = getRoleLabel(roleFilter)

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>选手大厅</span>
            <span className={styles.heroKickerEn}>PLAYER INDEX</span>
          </div>

          <h1 className={styles.heroTitle}>全联盟选手数据入口</h1>

          <p className={styles.heroDesc}>
            从注册名单升级为可检索、可排序的数据大厅。你可以按职责、队伍快速定位选手，并直接进入个人画像页查看更完整的风格与战术指标。
          </p>

          <div className={styles.heroViewBar}>
            <span className={styles.heroViewLabel}>当前视图</span>
            <span className={styles.heroViewValue}>{summary.currentView}</span>
          </div>
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
              <span className={styles.metaCn}>数据就绪</span>
              <span className={styles.metaEn}>DATA READY</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.dataReadyPlayers}</div>
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
              <span className={styles.metaCn}>当前排序</span>
              <span className={styles.metaEn}>SORT MODE</span>
            </div>
            <div className={styles.heroMetaValueText}>{currentSort.cn}</div>
          </div>
        </div>
      </section>

      <section className={styles.statStrip}>
        <div className={styles.statStripItem}>
          <span className={styles.statStripLabel}>角色视图</span>
          <span className={styles.statStripValue}>{activeRole.short}</span>
        </div>

        <div className={styles.statStripItem}>
          <span className={styles.statStripLabel}>结果队伍数</span>
          <span className={styles.statStripValue}>{summary.filteredTeams}</span>
        </div>

        <div className={styles.statStripItem}>
          <span className={styles.statStripLabel}>排序模式</span>
          <span className={styles.statStripValue}>{currentSort.en}</span>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.toolbarHead}>
          <div className={styles.toolbarTitleGroup}>
            <div className={styles.toolbarTitle}>筛选与排序</div>
            <div className={styles.toolbarSubTitle}>FILTERS & SORTING</div>
          </div>

          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => {
              setQuery('')
              setRoleFilter('ALL')
              setTeamFilter('ALL')
              setSortBy('time_desc')
            }}
          >
            重置
            <span className={styles.resetBtnEn}>RESET</span>
          </button>
        </div>

        <div className={styles.toolbarMain}>
          <div className={styles.toolGrid}>
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

            <div className={styles.field}>
              <label className={styles.label}>
                <span className={styles.labelCn}>战队</span>
                <span className={styles.labelEn}>TEAM</span>
              </label>
              <select
                className={styles.select}
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
              >
                <option value="ALL">全部战队 / ALL TEAMS</option>
                {teamOptions.map(team => (
                  <option key={team.value} value={team.value}>
                    {team.labelCn} / {team.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <span className={styles.labelCn}>排序</span>
                <span className={styles.labelEn}>SORT BY</span>
              </label>
              <select
                className={styles.select}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.cn} / {option.en}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.field} ${styles.searchField}`}>
              <label className={styles.label}>
                <span className={styles.labelCn}>检索</span>
                <span className={styles.labelEn}>SEARCH</span>
              </label>
              <input
                className={styles.input}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="输入选手 ID / 游戏名 / 队伍名 / 英雄名..."
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.resultsSection}>
        <div className={styles.resultsHead}>
          <div className={styles.resultsTitleGroup}>
            <div className={styles.resultsTitle}>结果列表</div>
            <div className={styles.resultsSubTitle}>PLAYER RESULTS</div>
          </div>

          <div className={styles.resultsMeta}>
            <span className={styles.resultPill}>{summary.filteredPlayers} PLAYERS</span>
            <span className={styles.resultPill}>{summary.filteredTeams} TEAMS</span>
            <span className={styles.resultPill}>{currentSort.en}</span>
          </div>
        </div>

        {sortedPlayers.length > 0 ? (
          <div className={styles.grid}>
            {sortedPlayers.map(player => (
              <PlayerCard key={player.player_id} player={player} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyCn}>未找到匹配的选手</span>
            <span className={styles.emptyEn}>NO PLAYERS FOUND</span>
            <span className={styles.emptyHint}>尝试切换队伍、角色筛选，或清空检索关键词。</span>
          </div>
        )}
      </section>
    </div>
  )
}
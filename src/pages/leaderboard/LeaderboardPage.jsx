import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import LeaderboardFilters from '../../components/leaderboard/LeaderboardFilters.jsx'
import LeaderboardTable from '../../components/leaderboard/LeaderboardTable.jsx'
import { filterLeaderboard, getLeaderboardRows, safeArr, sortLeaderboard } from '../../lib/selectors.js'
import styles from './LeaderboardPage.module.css'

function getSortLabel(key) {
  const map = {
    rank: '排名',
    display_name: '选手名称',
    team_name: '战队名称',
    role: '位置',
    raw_time_mins: '存活时长',
    maps_played: '参与地图数',
    avg_elim: '击杀 /10',
    avg_ast: '助攻 /10',
    avg_dth: '死亡 /10',
    avg_dmg: '伤害 /10',
    avg_heal: '治疗 /10',
    avg_block: '阻挡 /10',
    most_played_hero: '常用英雄'
  }
  return map[key] || key.toUpperCase()
}

function getDirectionLabel(direction) {
  return direction === 'desc' ? '降序' : '升序'
}

export default function LeaderboardPage() {
  const { db } = useOutletContext()

  const [filters, setFilters] = useState({
    role: 'ALL',
    team: 'ALL',
    minTime: 30,
    query: ''
  })

  const [sortKey, setSortKey] = useState('raw_time_mins')
  const [direction, setDirection] = useState('desc')

  const rows = useMemo(() => getLeaderboardRows(db), [db])
  const filteredRows = useMemo(() => filterLeaderboard(rows, filters), [rows, filters])
  const sortedRows = useMemo(() => sortLeaderboard(filteredRows, sortKey, direction), [filteredRows, sortKey, direction])

  const teamOptions = useMemo(() => (
    ['ALL', ...safeArr(db?.teams).map(team => ({
      value: team.team_id,
      label: team.team_short_name || team.team_name || team.team_id
    }))]
  ), [db])

  const summary = useMemo(() => {
    // 🌟 修复核心：使用 Set 去重 player_id 从而得到真实的【人数】
    const uniquePlayersInDB = new Set(safeArr(db?.players).map(p => p.player_id)).size || 0
    const uniqueRankedPlayers = new Set(sortedRows.map(r => r.player_id)).size || 0

    // 注意：地图数不需要去重，但时间需要防止同一场比赛同一个选手双修职责被记两次时间（这里以最简化的方式仅汇总有效条目的时间）
    const totalMinutes = sortedRows.reduce((sum, row) => sum + Number(row.raw_time_mins || 0), 0)
    const totalMaps = sortedRows.reduce((sum, row) => sum + Number(row.maps_played || 0), 0)

    return {
      totalPlayers: uniquePlayersInDB, // 改回读取纯净的玩家基础库总数
      rankedPlayers: uniqueRankedPlayers, // 用去重后的数量
      totalMinutes,
      totalMaps
    }
  }, [db, sortedRows])

  const requestSort = key => {
    if (sortKey === key) {
      setDirection(prev => prev === 'desc' ? 'asc' : 'desc')
      return
    }
    setSortKey(key)
    setDirection('desc')
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>选手数据中心</span>
            <span className={styles.heroKickerEn}>PLAYER LEADERBOARD</span>
          </div>

          <h1 className={styles.heroTitle}>全联盟排行榜</h1>

          <p className={styles.heroDesc}>
            面向选手开放的赛季数据榜单，支持按位置、战队、时长与关键词快速筛选，并对核心对局数据进行排序对比。
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.heroMetaCn}>总注册选手</span>
              <span className={styles.metaLabelEn}>TOTAL PLAYERS</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.totalPlayers}</div>
          </div>

          <div className={`${styles.heroMetaItem} ${styles.heroMetaItemHighlight}`}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.heroMetaCn}>当前入榜人数</span>
              <span className={styles.metaLabelEn}>RANKED PLAYERS</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.rankedPlayers}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.heroMetaCn}>总参与地图</span>
              <span className={styles.metaLabelEn}>TOTAL MAPS</span>
            </div>
            <div className={styles.heroMetaValue}>{summary.totalMaps}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>
              <span className={styles.heroMetaCn}>总存活时长</span>
              <span className={styles.metaLabelEn}>TOTAL TIME</span>
            </div>
            <div className={styles.heroMetaValue}>
              {Math.round(summary.totalMinutes)}
              <span className={styles.valueUnit}>MIN</span>
            </div>
          </div>
        </div>
      </section>

      <LeaderboardFilters
        filters={filters}
        onChange={setFilters}
        teamOptions={teamOptions}
      />

      <section className={styles.tableSection}>
        <div className={styles.tableHead}>
          <div className={styles.tableHeadLeft}>
            <div className={styles.tableKicker}>
              <span className={styles.tableKickerCn}>榜单结果</span>
              <span className={styles.tableKickerEn}>LEADERBOARD TABLE</span>
            </div>
            <div className={styles.tableTitle}>综合排名数据</div>
          </div>

          <div className={styles.tableHeadRight}>
            <span className={styles.tableMeta}>
              <span className={styles.metaText}>
                <span className={styles.metaCn}>排序字段</span>
                <span className={styles.metaEn}>SORT</span>
              </span>
              <span className={styles.metaVal}>{getSortLabel(sortKey)}</span>
            </span>

            <span className={styles.tableMeta}>
              <span className={styles.metaText}>
                <span className={styles.metaCn}>排序方向</span>
                <span className={styles.metaEn}>DIR</span>
              </span>
              <span className={styles.metaVal}>
                {getDirectionLabel(direction)}
                <span className={styles.metaValEn}>{direction === 'desc' ? 'DESC' : 'ASC'}</span>
              </span>
            </span>

            <span className={`${styles.tableMeta} ${styles.tableMetaHighlight}`}>
              <span className={styles.metaText}>
                <span className={styles.metaCn}>结果数量</span>
                <span className={styles.metaEn}>ROWS</span>
              </span>
              <span className={styles.metaVal}>{sortedRows.length}</span>
            </span>
          </div>
        </div>

        <LeaderboardTable
          rows={sortedRows}
          sortKey={sortKey}
          direction={direction}
          onSort={requestSort}
        />
      </section>
    </div>
  )
}
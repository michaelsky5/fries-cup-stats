import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import MatchFilters from '../../components/matches/MatchFilters.jsx'
import MatchTable from '../../components/matches/MatchTable.jsx'
import { filterMatches, getFormatOptions, getRoundOptions, getStageOptions, safeArr } from '../../lib/selectors.js'
import styles from './MatchesPage.module.css'

function getStatusDisplay(status) {
  if (!status || status === 'ALL') return '全部状态'
  if (status === 'IN_PROGRESS') return '进行中'
  if (status === 'COMPLETE' || status === 'COMPLETED') return '已完结'
  if (status === 'PENDING') return '未开始'
  return status
}

function getFilterDisplay(type, value) {
  if (!value || value === 'ALL') {
    if (type === 'stage') return '全部阶段'
    if (type === 'round') return '全部轮次'
    if (type === 'status') return '全部状态'
    if (type === 'format') return '全部赛制'
    return '全部'
  }
  if (type === 'status') return getStatusDisplay(value)
  return value
}

export default function MatchesPage() {
  const { db } = useOutletContext()

  const [filters, setFilters] = useState({
    stage: 'ALL',
    round: 'ALL',
    status: 'ALL',
    format: 'ALL',
    query: ''
  })

  const matches = safeArr(db?.matches)
  const filteredRows = useMemo(() => filterMatches(matches, filters), [matches, filters])

  const summary = useMemo(() => {
    const total = matches.length
    const inProgress = matches.filter(m => m.status === 'IN_PROGRESS').length
    const completed = matches.filter(m => m.status === 'COMPLETE' || m.status === 'COMPLETED').length
    return { total, inProgress, completed }
  }, [matches])

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>对局数据中心</span>
            <span className={styles.heroKickerEn}>MATCH SCHEDULE</span>
          </div>

          <h1 className={styles.heroTitle}>赛果看板</h1>

          <p className={styles.heroDesc}>
            集中查看本赛季全部对局、比分结果与状态变化，支持按阶段、轮次、状态、赛制与关键词快速筛选。
          </p>
        </div>

        <div className={styles.heroMetaRow}>
          <span className={styles.heroBadge}>
            <span className={styles.badgeLabel}>总场次</span>
            <span className={styles.badgeValue}>{summary.total}</span>
          </span>

          <span className={`${styles.heroBadge} ${summary.inProgress > 0 ? styles.badgeLive : ''}`}>
            <span className={styles.badgeLabel}>进行中</span>
            <span className={styles.badgeValue}>{summary.inProgress}</span>
          </span>

          <span className={styles.heroBadge}>
            <span className={styles.badgeLabel}>已完结</span>
            <span className={styles.badgeValue}>{summary.completed}</span>
          </span>

          <span className={styles.heroBadge}>
            <span className={styles.badgeLabel}>当前筛选</span>
            <span className={styles.badgeValueHighlight}>{filteredRows.length}</span>
          </span>
        </div>
      </section>

      <MatchFilters
        filters={filters}
        onChange={setFilters}
        stageOptions={getStageOptions(db)}
        roundOptions={getRoundOptions(db)}
        formatOptions={getFormatOptions(db)}
      />

      <section className={styles.tableSection}>
        <div className={styles.tableHead}>
          <div className={styles.tableHeadLeft}>
            <div className={styles.tableKicker}>
              <span className={styles.tableKickerCn}>对局列表</span>
              <span className={styles.tableKickerEn}>MATCH TABLE</span>
            </div>
            <div className={styles.tableTitle}>赛程与赛果数据</div>
          </div>

          <div className={styles.tableHeadRight}>
            <div className={styles.filterTags}>
              <span className={styles.tagItem}>
                <span className={styles.tagText}>
                  <span className={styles.tagCn}>阶段</span>
                  <span className={styles.tagEn}>STAGE</span>
                </span>
                <span className={styles.tagVal}>{getFilterDisplay('stage', filters.stage)}</span>
              </span>

              <span className={styles.tagItem}>
                <span className={styles.tagText}>
                  <span className={styles.tagCn}>轮次</span>
                  <span className={styles.tagEn}>ROUND</span>
                </span>
                <span className={styles.tagVal}>{getFilterDisplay('round', filters.round)}</span>
              </span>

              <span className={styles.tagItem}>
                <span className={styles.tagText}>
                  <span className={styles.tagCn}>状态</span>
                  <span className={styles.tagEn}>STATUS</span>
                </span>
                <span className={styles.tagVal}>{getFilterDisplay('status', filters.status)}</span>
              </span>

              <span className={styles.tagItem}>
                <span className={styles.tagText}>
                  <span className={styles.tagCn}>赛制</span>
                  <span className={styles.tagEn}>FORMAT</span>
                </span>
                <span className={styles.tagVal}>{getFilterDisplay('format', filters.format)}</span>
              </span>

              <span className={`${styles.tagItem} ${styles.tagItemAccent}`}>
                <span className={styles.tagText}>
                  <span className={styles.tagCn}>结果数</span>
                  <span className={styles.tagEn}>ROWS</span>
                </span>
                <span className={styles.tagValAccent}>{filteredRows.length}</span>
              </span>
            </div>
          </div>
        </div>

        <MatchTable rows={filteredRows} />
      </section>
    </div>
  )
}
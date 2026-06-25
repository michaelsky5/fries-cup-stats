import { useState } from 'react'
import { formatDecimal, formatInt, formatPlayerTime } from '../../lib/format.js'
import {
  LEADERBOARD_COLUMNS,
  LEADERBOARD_TABS,
  METRIC_MODES,
  getEntryMetricValue,
  getHeroDisplayList,
  getHeroDisplayName,
  getRoleEnLabel,
  getRoleLabel
} from '../../lib/leaderboardSelectors.js'
import { PUBLIC_METRICS, getRoleCoreMetricIds, isRoleCoreMetric } from '../../lib/leaderboardScoring.js'
import LeaderboardEmptyState from './LeaderboardEmptyState.jsx'
import LeaderboardRow, { HeroAvatar } from './LeaderboardRow.jsx'
import { formatLeaderboardStat } from './leaderboardFormat.js'
import styles from '../../pages/leaderboard/LeaderboardPage.module.css'

const METRIC_LABELS = PUBLIC_METRICS.reduce((acc, metric) => {
  acc[metric.id] = metric.label
  return acc
}, {})

function SortButton({ column, sortKey, direction, onSort, activeRole }) {
  const active = sortKey === column.id
  const priority = column.metricId && activeRole !== 'ALL' && isRoleCoreMetric(activeRole, column.metricId)
  const metricTone = getMetricToneClass(column.metricId)

  return (
    <button
      type="button"
      className={`${styles.sortButton} ${active ? styles.sortButtonActive : ''} ${priority ? styles.priorityHead : ''} ${metricTone}`}
      aria-label={`按${column.label}排序${active ? `，当前${direction === 'asc' ? '升序' : '降序'}` : ''}`}
      onClick={() => onSort(column.id)}
    >
      <span>{column.label}</span>
      <b>{column.en}</b>
      <em>{active ? (direction === 'asc' ? 'ASC' : 'DESC') : 'SORT'}</em>
    </button>
  )
}

function getMetricToneClass(metricId) {
  if (metricId === 'dmg') return styles.metricDamage
  if (metricId === 'heal') return styles.metricHeal
  if (metricId === 'block') return styles.metricBlock
  return ''
}

function getColClass(columnId) {
  if (columnId === 'rank') return styles.colRank
  if (columnId === 'player') return styles.colPlayer
  if (columnId === 'score') return styles.colScore
  if (columnId === 'team') return styles.colTeam
  if (columnId === 'role') return styles.colRole
  if (columnId === 'maps') return styles.colMaps
  if (columnId === 'time') return styles.colTime
  if (columnId === 'actions') return styles.colAction
  return styles.colMetric
}

function getColumnGroup(columnId) {
  if (columnId === 'rank') return '排名'
  if (columnId === 'score') return '综合评分'
  if (columnId === 'player' || columnId === 'team' || columnId === 'role') return '选手信息'
  if (columnId === 'maps' || columnId === 'time') return '出场信息'
  if (columnId === 'actions') return '操作'
  return '公开指标'
}

function getColumnAriaSort(columnId, sortKey, direction) {
  if (columnId !== sortKey) return 'none'
  return direction === 'asc' ? 'ascending' : 'descending'
}

function getSortLabel(sortKey) {
  if (sortKey === 'rank') return '排名'
  if (sortKey === 'player') return '选手'
  const match = LEADERBOARD_COLUMNS.find(column => column.id === sortKey)
  return match?.label || sortKey
}

function TableColGroup({ columns }) {
  return (
    <colgroup>
      <col className={getColClass('rank')} />
      {columns.map(column => (
        <col key={column.id} className={getColClass(column.id)} />
      ))}
      <col className={getColClass('actions')} />
    </colgroup>
  )
}

function HeaderGroups({ columns }) {
  const grouped = []
  const allColumns = [{ id: 'rank' }, ...columns, { id: 'actions' }]

  allColumns.forEach(column => {
    const group = getColumnGroup(column.id)
    const last = grouped[grouped.length - 1]
    if (last?.label === group) {
      last.span += 1
    } else {
      grouped.push({ label: group, span: 1, id: `${group}-${grouped.length}` })
    }
  })

  return (
    <tr className={styles.tableGroupRow}>
      {grouped.map(group => (
        <th key={group.id} scope="colgroup" colSpan={group.span}>
          {group.label}
        </th>
      ))}
    </tr>
  )
}

function TableHeader({ columns, rankColumn, sortKey, direction, activeRole, onSort }) {
  return (
    <thead>
      <HeaderGroups columns={columns} />
      <tr>
        <th
          scope="col"
          aria-sort={getColumnAriaSort('rank', sortKey, direction)}
          className={`${styles.rankCell} ${styles.stickyRank}`}
        >
          <SortButton column={rankColumn} sortKey={sortKey} direction={direction} onSort={onSort} activeRole={activeRole} />
        </th>

        {columns.map(column => (
          <th
            key={column.id}
            scope="col"
            aria-sort={column.sortable === false ? undefined : getColumnAriaSort(column.id, sortKey, direction)}
            className={[
              column.id === 'player' ? `${styles.playerCell} ${styles.stickyPlayer}` : '',
              column.id === 'score' ? styles.scoreHead : '',
              column.id === 'team' ? styles.teamHead : '',
              column.id === 'role' ? styles.roleHead : '',
              column.numeric ? styles.numericHead : ''
            ].filter(Boolean).join(' ')}
          >
            {column.sortable !== false ? (
              <SortButton column={column} sortKey={sortKey} direction={direction} onSort={onSort} activeRole={activeRole} />
            ) : (
              <span>{column.label}</span>
            )}
          </th>
        ))}

        <th scope="col" className={styles.actionHead}>操作</th>
      </tr>
    </thead>
  )
}

function Pagination({ page, totalPages, totalRows, pageSize, pageSizeOptions = [], onPageChange, onPageSizeChange }) {
  const start = totalRows ? ((page - 1) * pageSize) + 1 : 0
  const end = Math.min(page * pageSize, totalRows)

  return (
    <div className={styles.pagination}>
      <span className={styles.paginationMeta}>
        <strong>{start}-{end}</strong>
        <em>/ {totalRows}</em>
        <b>每页 {pageSize} 条</b>
      </span>
      {pageSizeOptions.length ? (
        <div className={styles.pageSizeSwitch} aria-label="每页显示数量">
          {pageSizeOptions.map(option => (
            <button
              key={option}
              type="button"
              className={option === pageSize ? styles.pageSizeButtonActive : ''}
              aria-pressed={option === pageSize}
              onClick={() => onPageSizeChange?.(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.paginationActions}>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>上一页</button>
        <strong>{page} / {totalPages}</strong>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>下一页</button>
      </div>
    </div>
  )
}

function TableTitleBar({ pagination, mode, activeTab, sortKey, direction, locale }) {
  const { page, pageSize, totalRows } = pagination
  const start = totalRows ? ((page - 1) * pageSize) + 1 : 0
  const end = Math.min(page * pageSize, totalRows)
  const currentMode = METRIC_MODES.find(item => item.id === mode) || METRIC_MODES[0]
  const currentTab = LEADERBOARD_TABS.find(item => item.id === activeTab) || LEADERBOARD_TABS[0]
  const modeLabel = locale === 'en-US' ? currentMode.en : currentMode.label
  const tabLabel = locale === 'en-US' ? currentTab.en : currentTab.label

  return (
    <div className={styles.tableTitleBar}>
      <div className={styles.tableTitleText}>
        <span>PLAYER × ROLE</span>
        <strong>{locale === 'en-US' ? 'Full Ranking' : '完整排行榜'}</strong>
      </div>
      <div className={styles.tableTitleMeta}>
        <span>{tabLabel}</span>
        <span>{modeLabel}</span>
        <span>SORT / {getSortLabel(sortKey)} {direction === 'asc' ? 'ASC' : 'DESC'}</span>
        <span>{start}-{end} / {totalRows}</span>
      </div>
    </div>
  )
}

function formatEntryField(entry, column, mode, locale) {
  if (column.id === 'score') return Number.isFinite(Number(entry.roleScore)) ? formatDecimal(entry.roleScore, 1, '-') : '-'
  if (column.id === 'team') return `${entry.team_short_name || '-'} / ${entry.team_name || '-'}`
  if (column.id === 'role') return locale === 'en-US' ? getRoleEnLabel(entry.role) : `${getRoleLabel(entry.role)} / ${getRoleEnLabel(entry.role)}`
  if (column.id === 'maps') return formatInt(entry.roleMapsPlayed)
  if (column.id === 'time') return formatPlayerTime({ raw_time_mins: entry.roleTimeMins, total_time_played: entry.total_time_played })
  if (column.metricId) return formatLeaderboardStat(getEntryMetricValue(entry, column.metricId, mode), mode, column.metricId)
  return '-'
}

function MobileRankingItem({
  entry,
  mode,
  rankValue,
  expanded,
  isFavorite,
  isCompareSelected,
  compareDisabled,
  onToggleExpanded,
  onNavigate,
  onToggleFavorite,
  onToggleCompare,
  locale
}) {
  const playerName = entry.nickname || entry.display_name || entry.player_name || entry.player_id || '-'
  const metricIds = getRoleCoreMetricIds(entry.role, entry.most_played_hero).slice(0, 3)
  const detailsId = `ranking-detail-${entry.entryKey.replace(/[^a-z0-9_-]/gi, '-')}`

  return (
    <article className={`${styles.mobileRankingItem} ${isCompareSelected ? styles.mobileRankingItemActive : ''}`}>
      <button
        type="button"
        className={styles.mobileRankingSummary}
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggleExpanded}
      >
        <span className={entry.eligible ? styles.rankBadge : styles.rankMuted}>
          {entry.eligible ? rankValue : '-'}
        </span>
        <HeroAvatar entry={entry} />
        <span className={styles.mobilePlayerText}>
          <strong>{playerName}</strong>
          <em>{entry.team_short_name || entry.team_name || '-'} / {getRoleEnLabel(entry.role)}</em>
        </span>
        <span className={styles.mobileScore}>
          <b>{formatDecimal(entry.roleScore, 1, '-')}</b>
          <em>SCORE</em>
        </span>
      </button>

      <div className={styles.mobileMetricStrip}>
        {metricIds.map(metricId => (
          <span key={metricId}>
            <b>{METRIC_LABELS[metricId]}</b>
            {formatLeaderboardStat(getEntryMetricValue(entry, metricId, mode), mode, metricId)}
          </span>
        ))}
      </div>

      <div className={styles.mobileActions}>
        <button type="button" onClick={() => onNavigate(entry)}>档案</button>
        <label
          className={`${styles.compareCheck} ${isCompareSelected ? styles.compareCheckActive : ''} ${compareDisabled ? styles.compareCheckBlocked : ''}`}
          title={compareDisabled ? '仅支持同职责选手比较' : '加入比较'}
        >
          <input
            type="checkbox"
            aria-label={`${isCompareSelected ? '移出比较' : '加入比较'}：${playerName}`}
            checked={isCompareSelected}
            disabled={compareDisabled}
            onChange={event => onToggleCompare(entry, event.target.checked)}
          />
          <span aria-hidden="true">VS</span>
        </label>
        <button
          type="button"
          className={`${styles.followButton} ${isFavorite ? styles.followButtonActive : ''}`}
          aria-label={isFavorite ? `取消关注：${playerName}` : `关注选手：${playerName}`}
          onClick={() => onToggleFavorite(entry)}
        >
          FAV
        </button>
      </div>

      {expanded ? (
        <div id={detailsId} className={styles.mobileDetails}>
          <div>
            <span>BattleTag</span>
            <strong>{entry.battleTag || entry.player_name || entry.player_id || '-'}</strong>
          </div>
          <div>
            <span>选手 ID</span>
            <strong>{entry.player_id || '-'}</strong>
          </div>
          <div>
            <span>常用英雄</span>
            <strong>{entry.most_played_hero ? getHeroDisplayName(entry.most_played_hero, locale) : '-'}</strong>
          </div>
          <div>
            <span>英雄池</span>
            <strong>{entry.top_3_heroes?.length ? getHeroDisplayList(entry.top_3_heroes, locale).join(' / ') : '-'}</strong>
          </div>
          <div>
            <span>排名状态</span>
            <strong>{entry.eligible ? '正式排名' : '样本不足'}</strong>
          </div>
          {LEADERBOARD_COLUMNS.map(column => (
            <div key={column.id}>
              <span>{column.label}</span>
              <strong>{formatEntryField(entry, column, mode, locale)}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function MobileRankingList({
  rows,
  mode,
  activeTab,
  selectedCompareKeys,
  compareRole,
  isFavoritePlayer,
  onNavigate,
  onToggleFavorite,
  onToggleCompare,
  locale
}) {
  const [expandedKeys, setExpandedKeys] = useState(new Set())

  const toggleExpanded = entryKey => {
    setExpandedKeys(current => {
      const next = new Set(current)
      if (next.has(entryKey)) next.delete(entryKey)
      else next.add(entryKey)
      return next
    })
  }

  return (
    <div className={styles.mobileRankingList} aria-label="移动端排行榜列表">
      {rows.map(entry => (
        <MobileRankingItem
          key={entry.entryKey}
          entry={entry}
          mode={mode}
          rankValue={activeTab === 'overall' ? entry.overallRank : entry.roleRank}
          expanded={expandedKeys.has(entry.entryKey)}
          isFavorite={Boolean(isFavoritePlayer?.(entry))}
          isCompareSelected={selectedCompareKeys.has(entry.entryKey)}
          compareDisabled={Boolean(compareRole && compareRole !== entry.role)}
          onToggleExpanded={() => toggleExpanded(entry.entryKey)}
          onNavigate={onNavigate}
          onToggleFavorite={onToggleFavorite}
          onToggleCompare={onToggleCompare}
          locale={locale}
        />
      ))}
    </div>
  )
}

export default function LeaderboardTable({
  rows,
  pagination,
  visibleColumns,
  mode,
  sortKey,
  direction,
  activeRole,
  activeTab,
  selectedCompareKeys,
  compareRole,
  isFavoritePlayer,
  onSort,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  onNavigate,
  onToggleFavorite,
  onToggleCompare,
  locale = 'zh-CN'
}) {
  const visibleSet = new Set(visibleColumns)
  const dataColumns = LEADERBOARD_COLUMNS.filter(column => visibleSet.has(column.id))
  const scoreColumn = dataColumns.find(column => column.id === 'score')
  const columns = [
    ...(scoreColumn ? [scoreColumn] : []),
    { id: 'player', label: '选手', en: 'PLAYER', sortable: true },
    ...dataColumns.filter(column => column.id !== 'score')
  ]

  const rankColumn = {
    id: 'rank',
    label: '排名',
    en: activeTab === 'overall' ? 'OVERALL' : 'ROLE',
    sortable: true
  }

  return (
    <section className={styles.tableSection}>
      <TableTitleBar
        pagination={pagination}
        mode={mode}
        activeTab={activeTab}
        sortKey={sortKey}
        direction={direction}
        locale={locale}
      />

      {!rows.length ? (
        <LeaderboardEmptyState locale={locale} />
      ) : (
        <>
          <div className={styles.tableScroller} tabIndex={0} aria-label="排行榜横向滚动区域">
            <table className={styles.leaderboardTable}>
              <caption className={styles.srOnly}>Fries Cup 选手职责排行榜</caption>
              <TableColGroup columns={columns} />
              <TableHeader
                columns={columns}
                rankColumn={rankColumn}
                sortKey={sortKey}
                direction={direction}
                activeRole={activeRole}
                onSort={onSort}
              />
              <tbody>
                {rows.map(entry => (
                  <LeaderboardRow
                    key={entry.entryKey}
                    entry={entry}
                    columns={columns}
                    mode={mode}
                    rankValue={activeTab === 'overall' ? entry.overallRank : entry.roleRank}
                    isFavorite={Boolean(isFavoritePlayer?.(entry))}
                    isCompareSelected={selectedCompareKeys.has(entry.entryKey)}
                    compareDisabled={Boolean(compareRole && compareRole !== entry.role)}
                    onNavigate={onNavigate}
                    onToggleFavorite={event => {
                      event.stopPropagation()
                      onToggleFavorite(entry)
                    }}
                    onToggleCompare={onToggleCompare}
                    locale={locale}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <MobileRankingList
            rows={rows}
            mode={mode}
            activeTab={activeTab}
            selectedCompareKeys={selectedCompareKeys}
            compareRole={compareRole}
            isFavoritePlayer={isFavoritePlayer}
            onNavigate={onNavigate}
            onToggleFavorite={onToggleFavorite}
            onToggleCompare={onToggleCompare}
            locale={locale}
          />
        </>
      )}

      <Pagination
        {...pagination}
        pageSizeOptions={pageSizeOptions}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  )
}

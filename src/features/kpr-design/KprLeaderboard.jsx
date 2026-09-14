import { translateUiText as uiText, pickUiLocale } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigationType } from 'react-router-dom'
import { SignalDataHeading, SignalDataNav } from '../../components/database/SignalDataHeader.jsx'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import SignalSwitch from '../../components/common/SignalSwitch.jsx'
import { HeroAvatar } from '../../components/leaderboard/LeaderboardRow.jsx'
import { formatLeaderboardStat } from '../../components/leaderboard/leaderboardFormat.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getLocationPath, getRestoreScrollY, getSavedReturnScroll, getReturnState, restoreWindowScroll, saveReturnScroll } from '../../lib/navigationState.js'
import { LEADERBOARD_TABS, SIGNAL_LEADERBOARD_COLUMNS as LEADERBOARD_COLUMNS, METRIC_MODES, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { formatSeasonSampleRequirements, getSeasonRatingStatusLabel } from '../../lib/seasonRatingPolicy.js'
import SeasonRating, { SeasonRatingRules } from '../rating/SeasonRating.jsx'
import KprPlayerDossier from './KprPlayerDossier.jsx'
import KprDialog from './KprDialog.jsx'
import KprComparePanel from './KprComparePanel.jsx'
import MobileRankingControls from './MobileRankingControls.jsx'
import { playerLabel } from './kprSelectors.js'
import { getRankingValue } from './rankingPresentation.js'
import styles from './KprLeaderboard.module.css'

const CORE_COLUMNS = { ALL: ['elim', 'dmg'], TANK: ['block', 'elim', 'dth'], DPS: ['elim', 'dmg', 'dth'], SUPPORT: ['heal', 'ast', 'dth'] }
const FIXED_COLUMNS = [{ id: 'rank', label: '名次', en: 'Rank' }, { id: 'player', label: '选手 / 队伍', en: 'Player / team' }]
const getRank = (entry, activeTab) => entry?.eligible ? (activeTab === 'overall' ? entry.overallRank : entry.roleRank) : null

function fieldValue(entry, id, mode, locale) {
  const isEn = locale === 'en-US'
  if (id === 'score') return <SeasonRating entry={entry} locale={locale} />
  if (id === 'team') return entry.team_short_name || entry.team_name || '—'
  if (id === 'role') return isEn ? entry.role : uiText(getRoleLabel(entry.role), locale)
  if (id === 'maps') return entry.roleMapsPlayed || 0
  if (id === 'time') return Math.round(entry.roleTimeMins || 0)
  const value = getRankingValue(entry, id, mode)
  return value === null ? '—' : formatLeaderboardStat(value, mode, id)
}

function SortHeading({ column, sortKey, direction, onSort, isEn }) {
  const uiLocale = useUiLocale()
  const active = column.id === sortKey
  const label = column.id === 'score' ? (isEn ? 'Season OVR' : uiText('赛季总评', uiLocale)) : isEn ? column.en : uiText(column.label, uiLocale)
  return <th scope="col" data-column={column.id} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
    <button type="button" onClick={() => onSort(column.id)} aria-label={pickUiLocale(uiLocale, `按${label}排序`, `Sort by ${label}`, `정렬 기준: ${label}`, `依${label}排序`)}>
      <span>{label}</span><i aria-hidden="true">{active ? direction === 'asc' ? '↑' : '↓' : '↕'}</i>
    </button>
  </th>
}

function Sample({ entry, isEn }) {
  const uiLocale = useUiLocale()
  return <span className={styles.sample} data-low={!entry.eligible || undefined}>
    <span><b>{entry.roleMapsPlayed || 0}</b> {isEn ? 'maps' : uiText("图", uiLocale)}<i> / </i>{Math.round(entry.roleTimeMins || 0)} {isEn ? 'min' : uiText("分钟", uiLocale)}</span>
    <small>{entry.roleMatchesPlayed ?? '—'} {isEn ? 'matches' : uiText("场比赛", uiLocale)}{!entry.eligible ? ` · ${getSeasonRatingStatusLabel(entry, uiLocale)}` : ''}</small>
  </span>
}

function CompareChoice({ entry, compared, compareRole, atLimit, onToggleCompare, isEn }) {
  const uiLocale = useUiLocale()
  const reason = compareRole && compareRole !== entry.role ? (isEn ? 'Choose players in the same role' : uiText('请选择同职责选手', uiLocale)) : atLimit && !compared ? (isEn ? 'Up to 4 players; remove one to change the selection' : uiText('最多比较 4 位选手，移出一位后可更换', uiLocale)) : ''
  return <label className={styles.compareChoice} title={reason || undefined}>
    <input type="checkbox" aria-label={`${compared ? (isEn ? 'Remove from comparison' : uiText('移出比较', uiLocale)) : (isEn ? 'Add to comparison' : uiText('加入比较', uiLocale))}：${playerLabel(entry)}${reason ? ` · ${reason}` : ''}`} checked={compared} disabled={Boolean(reason)} onChange={event => onToggleCompare(entry, event.target.checked)} />
    <span aria-hidden="true">{compared ? '✓' : '+'}</span>
  </label>
}

function PlayerName({ entry, selected, onSelect, locale }) {
  const isEn = locale === 'en-US'
  return <button type="button" className={styles.playerPreview} aria-label={`${isEn ? 'Preview player' : uiText("预览选手", locale)}：${playerLabel(entry)}`} aria-pressed={selected} onClick={() => onSelect(entry)}>
    <HeroAvatar entry={entry} className={styles.heroAvatar} />
    <span className={styles.playerText}><strong>{playerLabel(entry)}<i aria-hidden="true">{isEn ? 'Preview' : uiText("预览", locale)}</i></strong>
      <small>{entry.team_short_name || entry.team_name || '—'} <b>/</b> {isEn ? entry.role : uiText(getRoleLabel(entry.role), locale)}</small>
    </span>
  </button>
}

export default function KprLeaderboard({
  locale, withSeason, summary, pagination, ratingResultSummary = summary, activeTab, activeRole, roleCounts,
  mode, sortKey, direction, filters, options, minTimeMins, visibleColumns, advancedOpen, allColumns, previewKey,
  selectedCompareEntries, selectedCompareKeys, compareRole, compareOpen, compareWarning,
  tableTopRef, pageSizeOptions, isFavoritePlayer, onToggleFavorite, onToggleCompare, onOpenCompare,
  onCloseCompare, onClearCompare, onTabChange, onModeChange, onFilterChange, onReset,
  onSort, onColumnsChange, onAdvancedToggle, onPageChange, onPageSizeChange, onViewChange
}) {
  const isEn = locale === 'en-US'
  const location = useLocation()
  const navigationType = useNavigationType()
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    if (navigationType === 'REPLACE') return
    const scroll = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
    if (scroll !== null) restoreWindowScroll(scroll)
  }, [location, navigationType])
  const selected = pagination.rows.find(entry => entry.entryKey === previewKey) || pagination.rows[0] || null
  const modeLabel = uiText(METRIC_MODES.find(item => item.id === mode)?.[isEn ? 'en' : 'label'], locale)
  const coreIds = CORE_COLUMNS[activeRole] || CORE_COLUMNS.ALL
  const compactIds = new Set(['score', ...coreIds, ...(!['rank', 'player', 'maps', 'time'].includes(sortKey) ? [sortKey] : [])])
  const columns = allColumns
    ? LEADERBOARD_COLUMNS.filter(column => visibleColumns.includes(column.id))
    : [...compactIds].map(id => LEADERBOARD_COLUMNS.find(column => column.id === id)).filter(Boolean)
  const sampleColumn = { id: sortKey === 'time' ? 'time' : 'maps', label: uiText("出场样本", locale), en: 'Sample' }
  const filterCount = [filters.hero !== 'ALL', filters.following, filters.minTimeMins].filter(Boolean).length
  const hasFilterTags = Boolean(filters.query || filters.team !== 'ALL' || filterCount)
  const hasFilters = hasFilterTags || !filters.showInsufficient
  const teamLabel = options.teams.find(team => team.value === filters.team)?.label || filters.team
  const roleTitle = uiText(LEADERBOARD_TABS.find(tab => tab.id === activeTab)?.[isEn ? 'en' : 'label'], locale)
  const resultTitle = activeRole === 'ALL' ? (isEn ? 'Overall rankings' : uiText("综合表现榜", locale)) : `${roleTitle}${isEn ? ' rankings' : uiText("表现榜", locale)}`
  const selectPreview = entry => {
    onViewChange({ preview: entry.entryKey })
    if (window.matchMedia('(max-width: 1199px)').matches) setMobileOpen(true)
  }
  const atCompareLimit = selectedCompareEntries.length >= 4
  const findComparisonCandidates = () => {
    onFilterChange({ role: compareRole, query: '' })
    window.requestAnimationFrame(() => {
      tableTopRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
      tableTopRef.current?.focus({ preventScroll: true })
    })
  }
  const onProfileNavigate = () => saveReturnScroll(location)
  const dossierProps = {
    entry: selected, rank: getRank(selected, activeTab), rankScope: activeRole, mode, modeLabel, locale, withSeason,
    returnState: getReturnState(location),
    isFavorite: Boolean(selected && isFavoritePlayer?.(selected)),
    isCompared: Boolean(selected && selectedCompareKeys.has(selected.entryKey)),
    compareDisabled: Boolean(selected && compareRole && compareRole !== selected.role),
    compareLimitReached: atCompareLimit,
    onToggleFavorite, onProfileNavigate,
    onToggleCompare: (entry, checked) => {
      onToggleCompare(entry, checked)
      if (checked) setMobileOpen(false)
    }
  }
  const start = pagination.totalRows ? (pagination.page - 1) * pagination.pageSize + 1 : 0
  const end = Math.min(pagination.page * pagination.pageSize, pagination.totalRows)

  const header = <>
    <SignalDataNav active="players" withSeason={withSeason} isEn={isEn} />
    <div className={styles.desktopHeading}>
    <SignalDataHeading compact title={isEn ? 'Every role. Every performance.' : uiText("不同职责，各有锋芒。", locale)} description={summary.totalEntries === 0 ? (isEn ? 'Follow the matches while player statistics are being prepared.' : uiText("先从比赛开始，等待这一季的选手表现留下记录。", locale)) : (isEn ? 'One record per player, per role. Select a name to preview their season.' : uiText("每位选手按职责分别记录。点选名字，继续看他的赛季。", locale))}>
      <span>{isEn ? 'Official ranking requires' : uiText("正式排名门槛", locale)}</span>
      <span>{formatSeasonSampleRequirements(minTimeMins, locale)}</span>
    </SignalDataHeading>
    </div>
    <MobileRankingControls locale={locale} summary={summary} totalRows={pagination.totalRows} ratingResultSummary={ratingResultSummary} activeTab={activeTab} roleCounts={roleCounts} filters={filters} options={options} minTimeMins={minTimeMins} mode={mode} sortKey={sortKey} direction={direction} allColumns={allColumns} visibleColumns={visibleColumns} onTabChange={onTabChange} onFilterChange={onFilterChange} onReset={onReset} onModeChange={onModeChange} onSort={onSort} onViewChange={onViewChange} onColumnsChange={onColumnsChange} />
  </>

  if (summary.totalEntries === 0) return <div className={styles.rankings} data-kpr-rankings data-i18n-ignore="true">
    {header}
    <section className={styles.awaitingRecords} aria-labelledby="ranking-awaiting-title">
      <span>AWAITING RECORDS</span><h2 id="ranking-awaiting-title">{isEn ? 'Player statistics are not available yet.' : uiText("选手统计尚未公布。", locale)}</h2>
      <p>{isEn ? 'No player statistics have been published for this season yet. Rankings will appear here once records are available.' : uiText("本赛季尚无已公开的选手统计。记录公布后，这里会呈现各职责的赛季表现。", locale)}</p>
      <div><Link to={withSeason('/matches')}>{isEn ? 'Explore the schedule' : uiText("先看赛程赛果", locale)} <span aria-hidden="true">↗</span></Link><Link to={withSeason('/roster')}>{isEn ? 'Meet the field' : uiText("认识参赛阵容", locale)} <span aria-hidden="true">↗</span></Link></div>
    </section>
  </div>

  return <div className={styles.rankings} data-kpr-rankings data-i18n-ignore="true" data-comparing={Boolean(selectedCompareEntries.length)}>
    {header}

    <section className={styles.controlPanel} aria-label={isEn ? 'Ranking controls' : uiText("排行榜控制", locale)}>
      <div className={styles.roleTabs} aria-label={isEn ? 'Ranking roles' : uiText("排行榜职责", locale)}>
        {LEADERBOARD_TABS.map(tab => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} data-role={tab.role} onClick={() => onTabChange(tab.id)}>{isEn ? tab.en : uiText(tab.label, locale)}<span>{tab.id === 'overall' ? roleCounts.overall : roleCounts[tab.role] || 0} <small>{isEn ? 'ranked' : uiText("条正式排名", locale)}</small></span></button>)}
      </div>
      <div className={styles.findControls}>
        <label className={styles.search}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6" /></svg><ImeSafeInput value={filters.query} onValueChange={query => onFilterChange({ query })} placeholder={isEn ? 'Player, BattleTag or team…' : uiText("搜索选手、BattleTag 或队伍…", locale)} aria-label={isEn ? 'Search players' : uiText("搜索选手", locale)} />{filters.query ? <button type="button" aria-label={isEn ? 'Clear search' : uiText("清空搜索", locale)} onClick={() => onFilterChange({ query: '' })}>×</button> : null}</label>
        <label className={styles.teamSelect}><span>{isEn ? 'Team' : uiText("队伍", locale)}</span><select aria-label={isEn ? 'Filter by team' : uiText("按队伍筛选", locale)} value={filters.team} onChange={event => onFilterChange({ team: event.target.value })}><option value="ALL">{isEn ? 'All teams' : uiText("全部队伍", locale)}</option>{options.teams.map(team => <option key={team.value} value={team.value}>{team.label}</option>)}</select></label>
        <button type="button" className={styles.filterToggle} aria-expanded={advancedOpen} aria-controls="kpr-ranking-filters" onClick={onAdvancedToggle}>
          <span>{advancedOpen ? (isEn ? 'Hide filters' : uiText("收起筛选", locale)) : (isEn ? 'More filters' : uiText("更多筛选", locale))}</span>
          {filterCount ? <b className={styles.filterCount}><span className={styles.srOnly}>{isEn ? 'Active filters: ' : uiText("已选条件：", locale)}</span>{filterCount}</b> : null}
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>
      {advancedOpen ? <div className={styles.advancedFilters} id="kpr-ranking-filters" role="group" aria-label={isEn ? 'More ranking filters' : uiText("更多排行筛选", locale)}>
        <label className={styles.filterField}><span className={styles.filterLabel}>{isEn ? 'Hero in top picks' : uiText("常用英雄", locale)}</span><select value={filters.hero} onChange={event => onFilterChange({ hero: event.target.value })}><option value="ALL">{isEn ? 'All heroes' : uiText("全部英雄", locale)}</option>{options.heroes.map(hero => <option key={hero} value={hero}>{formatOwHeroName(hero, locale)}</option>)}</select></label>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="kpr-ranking-min-time">{isEn ? 'Minimum time in role' : uiText("最低职责出场时长", locale)}</label>
          <div className={styles.timeInput}><ImeSafeInput id="kpr-ranking-min-time" type="number" min="0" step="1" inputMode="numeric" aria-label={isEn ? 'Minimum time in role (minutes)' : uiText("最低职责出场时长（分钟）", locale)} value={filters.minTimeMins} onValueChange={minTime => onFilterChange({ minTimeMins: minTime })} placeholder={isEn ? 'No minimum' : uiText("不限", locale)} /><span aria-hidden="true">{isEn ? 'min' : uiText("分钟", locale)}</span></div>
        </div>
        <div className={`${styles.filterField} ${styles.followingField}`}>
          <span className={styles.filterLabel} id="kpr-ranking-following-label">{isEn ? 'Following' : uiText("关注范围", locale)}</span>
          <div className={styles.followingOptions} role="group" aria-labelledby="kpr-ranking-following-label">
            <button type="button" aria-pressed={!filters.following} onClick={() => onFilterChange({ following: false })}>{isEn ? 'All players' : uiText("全部选手", locale)}</button>
            <button type="button" aria-pressed={filters.following} onClick={() => onFilterChange({ following: true })}>{isEn ? 'Following only' : uiText("仅看关注", locale)}</button>
          </div>
        </div>
      </div> : null}
      {hasFilterTags ? <div className={styles.activeFilters} aria-label={isEn ? 'Active filters' : uiText("当前筛选", locale)}>
        <span>{isEn ? 'Filtered by' : uiText("当前筛选", locale)}</span>
        {filters.query ? <button type="button" onClick={() => onFilterChange({ query: '' })}>{filters.query} <span>×</span></button> : null}
        {filters.team !== 'ALL' ? <button type="button" onClick={() => onFilterChange({ team: 'ALL' })}>{teamLabel} <span>×</span></button> : null}
        {filters.hero !== 'ALL' ? <button type="button" onClick={() => onFilterChange({ hero: 'ALL' })}>{formatOwHeroName(filters.hero, locale)} <span>×</span></button> : null}
        {filters.minTimeMins ? <button type="button" onClick={() => onFilterChange({ minTimeMins: '' })}>≥ {filters.minTimeMins} {isEn ? 'min' : uiText("分钟", locale)} <span>×</span></button> : null}
        {filters.following ? <button type="button" onClick={() => onFilterChange({ following: false })}>{isEn ? 'Following' : uiText("已关注", locale)} <span>×</span></button> : null}
        <button type="button" className={styles.resetButton} onClick={onReset}>{isEn ? 'Clear filters' : uiText("清空筛选", locale)} ↺</button>
      </div> : null}
    </section>

    <div className={styles.workspace}>
      <section className={styles.tableSection} ref={tableTopRef} tabIndex={-1} aria-label={isEn ? 'Player rankings' : uiText("选手排行榜", locale)}>
        <div className={styles.resultHeader}>
          <div><h2>{resultTitle}<span><b>{pagination.totalRows}</b><small>{isEn ? 'role records' : uiText("条职责记录", locale)}</small></span></h2>
            <p aria-live="polite"><b>{ratingResultSummary.qualifiedEntries} {isEn ? 'ranked' : uiText("正式排名", locale)}</b>{filters.showInsufficient ? <> · {ratingResultSummary.provisionalEntries} {isEn ? 'provisional' : uiText("暂定评分", locale)} · {ratingResultSummary.unratedEntries} {isEn ? 'unrated' : uiText("未评级", locale)}</> : null}</p>
          </div>
          <SignalSwitch checked={!filters.showInsufficient} onChange={checked => onFilterChange({ showInsufficient: !checked })}>{isEn ? 'Ranked only' : uiText("只看正式排名", locale)}</SignalSwitch>
        </div>
        <div className={styles.readingControls}>
          <div className={styles.modeControl}><span>{isEn ? 'Statistics' : uiText("数据口径", locale)}</span><div className={styles.modeTabs} aria-label={isEn ? 'Metric mode' : uiText("统计口径", locale)}>{METRIC_MODES.map(item => <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => onModeChange(item.id)}>{isEn ? item.en : uiText(item.label, locale)}</button>)}</div></div>
          <div className={styles.viewControls}><button type="button" className={styles.columnToggle} aria-pressed={allColumns} onClick={() => onViewChange({ metrics: allColumns ? null : 'all' })}>{allColumns ? (isEn ? 'Essential view' : uiText("精简指标", locale)) : (isEn ? 'All metrics' : uiText("全部指标", locale))} <span aria-hidden="true">{allColumns ? '−' : '↔'}</span></button>
            {allColumns ? <details className={styles.columnPicker}><summary>{isEn ? 'Columns' : uiText("选择列", locale)}</summary><fieldset><legend>{isEn ? 'Visible columns' : uiText("显示列", locale)}</legend>{LEADERBOARD_COLUMNS.map(column => <label key={column.id}>
              <input type="checkbox" checked={visibleColumns.includes(column.id)} onChange={event => onColumnsChange(event.target.checked ? [...visibleColumns, column.id] : visibleColumns.filter(id => id !== column.id))} />
              <span className={styles.columnCheck} aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="2" /></svg></span>
              <span>{column.id === 'score' ? (isEn ? 'Season OVR' : uiText("赛季总评", locale)) : (isEn ? column.en : uiText(column.label, locale))}</span>
            </label>)}</fieldset></details> : null}
          </div>
        </div>
        <div className={styles.readingNote}><span>{mode === 'total' ? (isEn ? 'Totals grow with time played. Check each player’s sample.' : uiText("总计随出场时间累积，请结合出场样本阅读。", locale)) : activeRole === 'ALL' ? (isEn ? 'Use season OVR across roles; compare statistics within a role.' : uiText("跨职责看赛季总评；具体数据建议在同职责内比较。", locale)) : (isEn ? 'OVR and rank stay fixed when the statistics mode changes.' : uiText("切换数据口径不改变赛季总评和正式名次。", locale))}</span><span>{isEn ? 'Select a name to preview' : uiText("点选名字预览", locale)}</span></div>
        <div className={styles.mobileSort}><label><span>{isEn ? 'Sort' : uiText("排序", locale)}</span><select aria-label={isEn ? 'Sort metric' : uiText("排序指标", locale)} value={sortKey} onChange={event => onSort(event.target.value)}>{[...FIXED_COLUMNS, ...LEADERBOARD_COLUMNS].map(column => <option key={column.id} value={column.id}>{isEn ? column.en : uiText(column.label, locale)}</option>)}</select></label><button type="button" onClick={() => onSort(sortKey)} aria-label={isEn ? 'Reverse sort direction' : uiText("切换排序方向", locale)}>{direction === 'asc' ? '↑' : '↓'} {direction === 'asc' ? (isEn ? 'Ascending' : uiText("升序", locale)) : (isEn ? 'Descending' : uiText("降序", locale))}</button></div>
        {pagination.rows.length ? <>
          <div className={`${styles.tableScroller} ${allColumns ? styles.expandedScroller : styles.essentialScroller}`} tabIndex={allColumns ? 0 : undefined} role={allColumns ? 'region' : undefined} aria-label={isEn ? 'Ranking table, scroll for more metrics' : uiText("排名表格，可横向查看全部指标", locale)}>
            <table className={`${styles.table} ${allColumns ? styles.fullTable : ''}`}>
              <caption className={styles.srOnly}>{isEn ? 'Fries Cup player rankings' : uiText("薯条杯选手职责排行榜", locale)} — {modeLabel}</caption>
              <thead><tr>{[...FIXED_COLUMNS, ...columns, ...(!allColumns ? [sampleColumn] : [])].map(column => <SortHeading key={column.id} column={column} sortKey={sortKey} direction={direction} onSort={onSort} isEn={isEn} />)}<th scope="col" className={styles.compareHead}>{isEn ? 'VS' : uiText("比较", locale)}</th></tr></thead>
              <tbody>{pagination.rows.map(entry => <tr key={entry.entryKey} data-selected={entry.entryKey === selected?.entryKey || undefined}>
                <td className={styles.rankCell}>{getRank(entry, activeTab) ? String(getRank(entry, activeTab)).padStart(2, '0') : '—'}</td>
                <td className={styles.playerCell}><PlayerName entry={entry} selected={entry.entryKey === selected?.entryKey} onSelect={selectPreview} locale={locale} /></td>
                {columns.map(column => <td key={column.id} className={column.id === 'score' ? styles.scoreCell : styles.metricCell} data-sorted={sortKey === column.id || undefined}>{fieldValue(entry, column.id, mode, locale)}{column.id === 'time' ? <small> min</small> : null}</td>)}
                {!allColumns ? <td className={styles.sampleCell}><Sample entry={entry} isEn={isEn} /></td> : null}
                <td className={styles.compareCell}><CompareChoice entry={entry} compared={selectedCompareKeys.has(entry.entryKey)} compareRole={compareRole} atLimit={atCompareLimit} onToggleCompare={onToggleCompare} isEn={isEn} /></td>
              </tr>)}</tbody>
            </table>
          </div>
          {!allColumns ? <ol className={styles.mobileList} aria-label={isEn ? 'Player ranking list' : uiText("选手排行列表", locale)}>{pagination.rows.map(entry => <li key={entry.entryKey} data-selected={entry.entryKey === selected?.entryKey || undefined}>
            <div className={styles.mobileIdentity}><span className={styles.rankCell}>{getRank(entry, activeTab) ? String(getRank(entry, activeTab)).padStart(2, '0') : '—'}</span><PlayerName entry={entry} selected={entry.entryKey === selected?.entryKey} onSelect={selectPreview} locale={locale} /><div className={styles.mobileScore}><SeasonRating entry={entry} locale={locale} /></div></div>
            <dl className={styles.mobileMetrics}>{columns.filter(column => column.id !== 'score').map(column => <div key={column.id}><dt>{isEn ? column.en : uiText(column.label, locale)}</dt><dd>{fieldValue(entry, column.id, mode, locale)}</dd></div>)}</dl>
            <div className={styles.mobileSample}><Sample entry={entry} isEn={isEn} /><CompareChoice entry={entry} compared={selectedCompareKeys.has(entry.entryKey)} compareRole={compareRole} atLimit={atCompareLimit} onToggleCompare={onToggleCompare} isEn={isEn} /></div>
          </li>)}</ol> : null}
        </> : <div className={styles.emptyState}><span>{summary.totalEntries ? 'NO RESULTS / 00' : 'AWAITING RECORDS'}</span><h3>{summary.totalEntries ? (isEn ? 'No matching players.' : uiText("没有符合条件的选手。", locale)) : (isEn ? 'Rankings are not available yet.' : uiText("本赛季尚无可排行数据。", locale))}</h3><p>{summary.totalEntries ? (isEn ? 'Try another name, role or team.' : uiText("试试其他名字、职责或队伍。", locale)) : (isEn ? 'Player rankings will appear when match statistics are published.' : uiText("比赛统计公开后，将在这里呈现选手的职责表现。", locale))}</p>{hasFilters ? <button type="button" onClick={onReset}>{isEn ? 'Clear filters' : uiText("清空筛选", locale)} ↗</button> : null}</div>}
        <div className={styles.pagination}>
          <span>{start}–{end} <b>/ {pagination.totalRows}</b></span>
          <label className={styles.pageSize}><span>{isEn ? 'Rows' : uiText("每页", locale)}</span><select aria-label={isEn ? 'Rows per page' : uiText("每页条数", locale)} value={pagination.pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>{pageSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}</select></label>
          <div><button type="button" aria-label={isEn ? 'Previous page' : uiText("上一页", locale)} disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>←</button><span>{pagination.page} / {pagination.totalPages}</span><button type="button" aria-label={isEn ? 'Next page' : uiText("下一页", locale)} disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>→</button></div>
        </div>
        <details className={styles.methodNote}><summary>{isEn ? 'How to read these rankings' : uiText("如何阅读这份榜单", locale)}</summary><SeasonRatingRules summary={summary} locale={locale} /><p>{formatSeasonSampleRequirements(minTimeMins, locale)}{isEn ? '. Each entry represents one player in one role. Provisional and unrated entries have no official rank. Filters preserve season ranks.' : uiText("。每条记录对应一名选手的一项职责；暂定与未评级条目不参与正式排名。筛选保留原榜名次，不重新编号。", locale)}</p><p>{isEn ? 'Season OVR uses the existing season rating model. Per-10, total and per-map views affect the statistics only. Sample size, hero choices and match context also matter.' : uiText("赛季总评沿用当前赛季评分模型；每 10 分钟、总计、每张地图只切换数据口径。阅读时还需要结合样本量、常用英雄和具体比赛。", locale)}</p></details>
      </section>
      <aside className={styles.desktopDossier}><div className={styles.dossierSticky} tabIndex={0} role="region" aria-label={isEn ? 'Selected player preview, scroll for details' : uiText("当前选手预览，可滚动查看详情", locale)}><KprPlayerDossier {...dossierProps} id="kpr-player-dossier" /><p className={styles.dossierHint}>{isEn ? 'Select a name. Follow the season.' : uiText("选一个名字，看见他的赛季。", locale)}</p></div></aside>
    </div>

    {selectedCompareEntries.length ? <div className={styles.compareDock} role="region" aria-label={isEn ? 'Comparison selection' : uiText("已选比较选手", locale)}>
      <div className={styles.dockLabel}><b>VS.</b><span aria-live="polite">{selectedCompareEntries.length} / 4 <small>{isEn ? compareRole : uiText(getRoleLabel(compareRole), locale)}</small></span></div>
      <div className={styles.dockPlayers}>{selectedCompareEntries.map(entry => <button key={entry.entryKey} type="button" onClick={() => onToggleCompare(entry, false)} aria-label={`${isEn ? 'Remove from comparison' : uiText("移出比较", locale)}：${playerLabel(entry)}`}>{playerLabel(entry)}<span>×</span></button>)}</div>
      {selectedCompareEntries.length >= 2 && activeRole !== compareRole ? <button type="button" className={styles.sameRoleButton} onClick={findComparisonCandidates}>{isEn ? 'Find same role' : uiText("找同职责选手", locale)}</button> : null}
      <button type="button" className={styles.clearCompare} onClick={onClearCompare}>{isEn ? 'Clear' : uiText("清空", locale)}</button>
      <button type="button" className={styles.openCompare} onClick={selectedCompareEntries.length < 2 ? findComparisonCandidates : onOpenCompare}>{selectedCompareEntries.length < 2 ? (isEn ? 'Find same role' : uiText("找同职责选手", locale)) : (isEn ? 'Compare players' : uiText("展开比较", locale))} <b aria-hidden="true">{selectedCompareEntries.length < 2 ? '+' : '↗'}</b></button>
    </div> : null}
    {compareWarning ? <div role="status" className={styles.compareWarning}>{isEn ? 'Select 2–4 players in the same role.' : compareWarning}</div> : null}
    <KprDialog open={mobileOpen && Boolean(selected)} onClose={() => setMobileOpen(false)} title={isEn ? 'Player preview' : uiText("选手预览", locale)} compact locale={locale}><KprPlayerDossier {...dossierProps} id="kpr-mobile-dossier" /></KprDialog>
    <KprComparePanel open={compareOpen} onClose={onCloseCompare} entries={selectedCompareEntries} mode={mode} onModeChange={onModeChange} locale={locale} withSeason={withSeason} returnState={getReturnState(location)} onProfileNavigate={onProfileNavigate} />
  </div>
}

import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useState } from 'react'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import SignalSwitch from '../../components/common/SignalSwitch.jsx'
import { LEADERBOARD_TABS, LEADERBOARD_COLUMNS, METRIC_MODES } from '../../lib/leaderboardSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { formatSeasonSampleRequirements } from '../../lib/seasonRatingPolicy.js'
import KprDialog from './KprDialog.jsx'
import styles from './MobileRankingControls.module.css'

const SORT_COLUMNS = [{ id: 'rank', label: '名次', en: 'Rank' }, { id: 'player', label: '选手', en: 'Player' }, ...LEADERBOARD_COLUMNS]

export default function MobileRankingControls({ locale, summary, totalRows, ratingResultSummary, activeTab, roleCounts, filters, options, minTimeMins, mode, sortKey, direction, allColumns, visibleColumns, onTabChange, onFilterChange, onReset, onModeChange, onSort, onViewChange, onColumnsChange }) {
  const isEn = locale === 'en-US'
  const [open, setOpen] = useState(false)
  const filterCount = [filters.team !== 'ALL', filters.hero !== 'ALL', filters.following, filters.minTimeMins].filter(Boolean).length
  const modeLabel = uiText(METRIC_MODES.find(item => item.id === mode)?.[isEn ? 'en' : 'label'], locale)
  const sortLabel = uiText(SORT_COLUMNS.find(item => item.id === sortKey)?.[isEn ? 'en' : 'label'], locale)
  const filterSummary = [
    filters.team !== 'ALL' ? options.teams.find(team => team.value === filters.team)?.label || filters.team : '',
    filters.hero !== 'ALL' ? formatOwHeroName(filters.hero, locale) : '',
    filters.minTimeMins ? `≥ ${filters.minTimeMins} ${isEn ? 'min' : uiText('分钟', locale)}` : '',
    filters.following ? (isEn ? 'Following' : uiText('已关注', locale)) : ''
  ].filter(Boolean).join(' · ')
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)')
    const closeOnDesktop = () => { if (!media.matches) setOpen(false) }
    media.addEventListener('change', closeOnDesktop)
    return () => media.removeEventListener('change', closeOnDesktop)
  }, [])

  return <div className={styles.controls} data-mobile-ranking-controls>
    <header className={styles.heading}><h1>{isEn ? 'Player rankings' : uiText("选手排行", locale)}</h1><span>{isEn ? 'Every role. Every performance.' : uiText("不同职责，各有锋芒。", locale)}</span></header>
    {summary.totalEntries > 0 ? <>
      <div className={styles.roles} role="group" aria-label={isEn ? 'Ranking roles' : uiText("排行榜职责", locale)}>
        {LEADERBOARD_TABS.map(tab => {
          const count = tab.id === 'overall' ? roleCounts.overall : roleCounts[tab.role] ?? 0
          const label = isEn ? tab.en : uiText(tab.label, locale)
          return <button key={tab.id} type="button" aria-label={`${label} · ${count} ${isEn ? 'officially ranked records' : uiText('条正式排名', locale)}`} aria-pressed={activeTab === tab.id} onClick={() => onTabChange(tab.id)}>{label}<small>{count}</small></button>
        })}
      </div>
      <div className={styles.searchRow}>
        <label><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6" /></svg><ImeSafeInput aria-label={isEn ? 'Search players' : uiText("搜索选手", locale)} placeholder={isEn ? 'Player or team' : uiText("找选手或队伍", locale)} value={filters.query} onValueChange={query => onFilterChange({ query })} />{filters.query ? <button type="button" aria-label={isEn ? 'Clear search' : uiText("清空搜索", locale)} onClick={() => onFilterChange({ query: '' })}>×</button> : null}</label>
        <button type="button" className={styles.filterButton} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{isEn ? 'Filters' : uiText("筛选", locale)}{filterCount ? <b>{filterCount}</b> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M6 10h8M8 15h4" /></svg>}</button>
      </div>
      <div className={styles.results}><span aria-live="polite"><b>{totalRows}</b> {isEn ? 'role records' : uiText("条职责记录", locale)}{filterSummary ? <small title={filterSummary}>{filterSummary}</small> : null}</span><SignalSwitch checked={!filters.showInsufficient} onChange={checked => onFilterChange({ showInsufficient: !checked })}>{isEn ? 'Ranked only' : uiText("只看正式排名", locale)}</SignalSwitch></div>
      <div className={styles.reading}><button type="button" aria-label={isEn ? 'Change sort and display' : uiText("调整排序与数据显示", locale)} onClick={() => setOpen(true)}><strong>{sortLabel} {direction === 'asc' ? '↑' : '↓'}</strong><span>{allColumns ? (isEn ? 'All metrics' : uiText("全部指标", locale)) : modeLabel}<i aria-hidden="true">⌄</i></span></button></div>
    </> : null}
    <KprDialog open={open} onClose={() => setOpen(false)} title={isEn ? 'Filters & display' : uiText("筛选与显示", locale)} locale={locale} className={styles.sheet}>
      <div className={styles.sheetBody}>
        <fieldset className={styles.fields}><legend>{isEn ? 'Find players' : uiText("查找范围", locale)}</legend>
          <label><span>{isEn ? 'Team' : uiText("队伍", locale)}</span><select aria-label={isEn ? 'Filter by team' : uiText("按队伍筛选", locale)} value={filters.team} onChange={event => onFilterChange({ team: event.target.value })}><option value="ALL">{isEn ? 'All teams' : uiText("全部队伍", locale)}</option>{options.teams.map(team => <option key={team.value} value={team.value}>{team.label}</option>)}</select></label>
          <label><span>{isEn ? 'Hero in top picks' : uiText("常用英雄", locale)}</span><select value={filters.hero} onChange={event => onFilterChange({ hero: event.target.value })}><option value="ALL">{isEn ? 'All heroes' : uiText("全部英雄", locale)}</option>{options.heroes.map(hero => <option key={hero} value={hero}>{formatOwHeroName(hero, locale)}</option>)}</select></label>
          <label><span>{isEn ? 'Minimum time in role (min)' : uiText("最低职责出场时长（分钟）", locale)}</span><ImeSafeInput type="number" min="0" step="1" inputMode="numeric" value={filters.minTimeMins} onValueChange={minTimeMins => onFilterChange({ minTimeMins })} placeholder={isEn ? 'No minimum' : uiText("不限", locale)} /></label>
          <div className={styles.following}><SignalSwitch checked={filters.following} onChange={following => onFilterChange({ following })}>{isEn ? 'Following only' : uiText("仅看关注选手", locale)}</SignalSwitch></div>
        </fieldset>
        <fieldset className={styles.fields}><legend>{isEn ? 'Read the data' : uiText("数据显示", locale)}</legend>
          <div className={styles.modeTabs} role="group" aria-label={isEn ? 'Metric mode' : uiText("统计口径", locale)}>{METRIC_MODES.map(item => <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => onModeChange(item.id)}>{isEn ? item.en : uiText(item.label, locale)}</button>)}</div>
          <label><span>{isEn ? 'Sort metric' : uiText("排序指标", locale)}</span><select value={sortKey} onChange={event => onSort(event.target.value)}>{SORT_COLUMNS.map(column => <option key={column.id} value={column.id}>{isEn ? column.en : uiText(column.label, locale)}</option>)}</select></label>
          <button className={styles.direction} type="button" onClick={() => onSort(sortKey)}>{isEn ? 'Direction' : uiText("排序方向", locale)}<b>{direction === 'asc' ? (isEn ? 'Ascending ↑' : uiText("升序 ↑", locale)) : (isEn ? 'Descending ↓' : uiText("降序 ↓", locale))}</b></button>
          <div className={styles.fullWidth}><SignalSwitch checked={allColumns} onChange={checked => onViewChange({ metrics: checked ? 'all' : null })}>{isEn ? 'Show full comparison table' : uiText("展开完整数据表", locale)}</SignalSwitch></div>
          {allColumns ? <div className={styles.columns} role="group" aria-label={isEn ? 'Visible columns' : uiText("显示指标", locale)}>{LEADERBOARD_COLUMNS.map(column => <button key={column.id} type="button" aria-pressed={visibleColumns.includes(column.id)} onClick={() => onColumnsChange(visibleColumns.includes(column.id) ? visibleColumns.filter(id => id !== column.id) : [...visibleColumns, column.id])}>{isEn ? column.en : uiText(column.label, locale)}</button>)}</div> : null}
          <p className={styles.note}>{isEn ? 'Statistics change with the view. Season OVR and official ranks stay fixed.' : uiText("切换数据口径只影响具体统计，赛季总评和正式名次保持不变。", locale)}</p>
        </fieldset>
        <details className={styles.method}><summary>{isEn ? 'Ranking requirements & current sample' : uiText("排名门槛与当前样本", locale)}</summary><p>{formatSeasonSampleRequirements(minTimeMins, locale)}</p><p>{ratingResultSummary.qualifiedEntries} {isEn ? 'ranked' : uiText("正式排名", locale)} · {ratingResultSummary.provisionalEntries} {isEn ? 'provisional' : uiText("暂定评分", locale)} · {ratingResultSummary.unratedEntries} {isEn ? 'unrated' : uiText("未评级", locale)}</p><p>{isEn ? 'Each record represents one player in one role. Provisional and unrated records have no official rank.' : uiText("每条记录对应一名选手的一项职责；暂定与未评级记录不参与正式排名。", locale)}</p></details>
      </div>
      <footer className={styles.footer}><button type="button" onClick={onReset}>{isEn ? 'Reset' : uiText("重置筛选", locale)}</button><button type="button" onClick={() => setOpen(false)}>{isEn ? `View ${totalRows} records` : uiText("查看 {0} 条记录", locale, [totalRows])} <span aria-hidden="true">→</span></button></footer>
    </KprDialog>
  </div>
}

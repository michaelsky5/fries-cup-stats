import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import TeamLogo from './TeamLogo.jsx'
import { getMatchDisplayTeams, getMatchScore, getMatchStatus } from '../../lib/matchesSelectors.js'
import { getMatchFormatLabel } from '../../lib/matchFormat.js'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import ScheduleNav from '../../features/match-schedule/ScheduleNav.jsx'
import ScheduleTeamSearch from '../../features/match-schedule/ScheduleTeamSearch.jsx'
import { getScheduleGroupLabel, getScheduleMapRecords, getScheduleRoundLabel, getScheduleStageLabel, getScheduleStatusLabel, getScheduleTimeLabel } from '../../features/match-schedule/schedulePresentation.js'
import styles from './SignalMatchIndex.module.css'

function scrollToRound(container, key) {
  const section = Array.from(container?.children || []).find(node => node.dataset.indexRound === key)
  section?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}

function MatchRow({ match }) {
  const { withSeason, seasonId, locale } = useOutletContext()
  const location = useLocation()
  const en = locale === 'en-US'
  const teams = getMatchDisplayTeams(match)
  const status = getMatchStatus(match)
  const statusLabel = getScheduleStatusLabel(match, locale)
  const maps = status === 'finished' ? getScheduleMapRecords(match, locale) : []
  const summary = maps.slice(0, 3).map(map => map.name + (map.hasScore ? ' ' + map.score : '')).join(' / ')
  return <Link className={styles.matchRow} data-schedule-match={match.match_id} to={withSeason(`/matches/${encodeURIComponent(match.match_id)}`)} state={getReturnState(location)} onClick={() => saveReturnScroll(location)} aria-label={`${teams.teamA.full} vs ${teams.teamB.full} · ${statusLabel} · ${getScheduleRoundLabel(match, locale)}`}>
    <span className={styles.time}>{getScheduleTimeLabel(match, locale)}<small>{getMatchFormatLabel(match)}</small></span>
    <span className={styles.duel}>
      {['A', 'B'].map((side, index) => <span key={side} className={styles.team} data-side={side}>
        <TeamLogo team={match[`team_${side.toLowerCase()}`]} seasonId={seasonId} className={styles.logo} />
        <span><strong>{teams[`team${side}`].short}</strong><small>{teams[`team${side}`].full}</small></span>
        {index === 0 ? <b className={styles.score}>{status === 'finished' || status === 'live' ? getMatchScore(match) : 'vs'}</b> : null}
      </span>)}
    </span>
    <span className={styles.status} data-status={status}>{statusLabel}</span><span className={styles.arrow} aria-hidden="true">↗</span>
    {summary ? <span className={styles.mapSummary}>{summary}{maps.length > 3 ? (en ? ` · ${maps.length} maps in total` : uiText(" · 共 {0} 图", locale, [maps.length])) : ''}</span> : null}
  </Link>
}

export default function SignalMatchIndex({ rows, groups, filters, options, activeTab, favoriteCount, updateQuery, resetFilters, setTab, focusSearch, hub, stageEntries }) {
  const { withSeason, locale = 'zh-CN' } = useOutletContext()
  const [searchParams] = useSearchParams()
  const en = locale === 'en-US'
  const [advancedOpen, setAdvancedOpen] = useState(() => ['round', 'status', 'format'].some(key => filters[key] && filters[key] !== 'ALL'))
  const searchRef = useRef(null)
  const recordsRef = useRef(null)
  const roundSelectionRef = useRef(false)
  const activeGroup = groups.find(group => group.key === searchParams.get('roundView')) || groups[0]
  const showTeamSchedule = Boolean(filters.team || filters.teamId)
  const visibleGroups = showTeamSchedule ? groups : activeGroup ? [activeGroup] : []
  const dirtyCount = ['round', 'status', 'format'].filter(key => filters[key] && filters[key] !== 'ALL').length + Number(!hub.isArchive && filters.stage !== 'ALL')
  const stageOrder = [...stageEntries.filter(entry => entry.value === 'ALL'), ...stageEntries.filter(entry => entry.value !== 'ALL')]
  const scopeTitle = filters.stage === 'ALL' ? (en ? 'All stages' : uiText("全部阶段", locale)) : getScheduleStageLabel(filters.stage, locale)
  useEffect(() => { if (focusSearch) searchRef.current?.focus({ preventScroll: true }) }, [focusSearch])
  useEffect(() => {
    if (!roundSelectionRef.current) return
    roundSelectionRef.current = false
    scrollToRound(recordsRef.current, activeGroup?.key)
  }, [activeGroup?.key])

  const selectRound = key => {
    if (key === activeGroup?.key) {
      scrollToRound(recordsRef.current, key)
      return
    }
    roundSelectionRef.current = true
    updateQuery({ roundView: key })
  }
  const selectStage = stage => updateQuery({ stage, round: null, roundView: null, status: null, tab: 'all' })
  const roundLabel = round => getScheduleRoundLabel(hub.matches.find(match => match.round === round && (filters.stage === 'ALL' || match.stage === filters.stage)) || hub.matches.find(match => match.round === round) || { round }, locale)
  const chips = [
    filters.stage !== 'ALL' ? { key: 'stage', label: scopeTitle, clear: { stage: null, round: null, roundView: null } } : null,
    filters.team || filters.teamId ? { key: 'team', label: (en ? 'Team: ' : uiText("队伍：", locale)) + (filters.team || filters.teamId), clear: { team: null, teamId: null, query: null, roundView: null } } : null,
    filters.round !== 'ALL' ? { key: 'round', label: roundLabel(filters.round), clear: { round: null, roundView: null } } : null,
    filters.status !== 'ALL' ? { key: 'status', label: ({ upcoming: en ? 'Upcoming' : uiText("未开始", locale), live: en ? 'Live' : uiText("进行中", locale), finished: en ? 'Completed' : uiText("已完成", locale) })[filters.status] || filters.status, clear: { status: null, tab: 'all', roundView: null } } : null,
    filters.format !== 'ALL' ? { key: 'format', label: filters.format, clear: { format: null, roundView: null } } : null
  ].filter(Boolean)
  const modeTabs = hub.isArchive ? [{ key: 'all', zh: '全部比赛', en: 'All matches' }, { key: 'following', zh: '我的关注', en: 'Following' }]
    : [{ key: 'all', zh: '全部比赛', en: 'All matches' }, { key: 'round', zh: '本轮比赛', en: 'Current round' }, { key: 'following', zh: '我的关注', en: 'Following' }, { key: 'upcoming', zh: '未开始', en: 'Upcoming' }, { key: 'finished', zh: '已完成', en: 'Completed' }]
  return <div className={styles.shell} data-page-mode="index" data-match-design="signal-index" data-i18n-ignore>
    <ScheduleNav active="list" archived={hub.isArchive} />
    <header className={styles.header}>
      <div><span className={styles.kicker}>{en ? 'FULL SCHEDULE' : uiText("完整赛程与赛果", locale)}</span><h1>{en ? 'Find every match.' : uiText("找到每一场。", locale)}</h1></div>
      <p>{en ? 'Browse stages and rounds, or search for a team.' : uiText("按阶段、轮次和队伍，查找本届比赛。", locale)}</p>
    </header>
    {hub.isArchive ? <nav className={styles.stages} aria-label={en ? 'Match stages' : uiText("比赛阶段", locale)}>{stageOrder.map(entry => <button key={entry.value} type="button" aria-pressed={filters.stage === entry.value} onClick={() => selectStage(entry.value)}><strong>{entry.value === 'ALL' ? (en ? 'All stages' : uiText("全部阶段", locale)) : getScheduleStageLabel(entry.value, locale)}</strong><span>{entry.count}</span></button>)}</nav> : null}
    <div className={styles.filterBar}>
      <nav className={styles.modes} aria-label={en ? 'Match views' : uiText("比赛查看模式", locale)}>{modeTabs.map(tab => <button key={tab.key} type="button" aria-pressed={hub.isArchive && tab.key === 'all' ? activeTab !== 'following' : activeTab === tab.key} onClick={() => setTab(tab.key)}>{en ? tab.en : uiText(tab.zh, locale)}</button>)}</nav>
      <ScheduleTeamSearch variant="index" inputRef={searchRef} matches={hub.matches} value={filters.team} onValueChange={value => updateQuery({ team: value, teamId: null, query: null, roundView: null })} onSearch={value => updateQuery({ team: value, teamId: null, query: null, roundView: null })} onSelectTeam={team => updateQuery({ team: team.short, teamId: team.id, query: null, roundView: null })} />
      <button type="button" className={styles.filterButton} aria-expanded={advancedOpen} aria-controls="match-index-filters" onClick={() => setAdvancedOpen(open => !open)}>{en ? 'More filters' : uiText("更多筛选", locale)} {dirtyCount ? <b>{dirtyCount}</b> : '＋'}</button>
    </div>
    {advancedOpen ? <div className={styles.advanced} id="match-index-filters">
      {!hub.isArchive ? <label>{en ? 'Stage' : uiText("阶段", locale)}<select value={filters.stage} onChange={event => updateQuery({ stage: event.target.value, round: null, roundView: null })}>{options.stages.map(stage => <option key={stage} value={stage}>{stage === 'ALL' ? (en ? 'All stages' : uiText("全部阶段", locale)) : getScheduleStageLabel(stage, locale)}</option>)}</select></label> : null}
      <label>{en ? 'Round' : uiText("轮次", locale)}<select value={filters.round} onChange={event => updateQuery({ round: event.target.value, roundView: null })}>{options.rounds.map(round => <option key={round} value={round}>{round === 'ALL' ? (en ? 'All rounds' : uiText("全部轮次", locale)) : roundLabel(round)}</option>)}</select></label>
      <label>{en ? 'Status' : uiText("状态", locale)}<select value={filters.status} onChange={event => updateQuery({ status: event.target.value, roundView: null })}>{[{ value: 'ALL', zh: '全部状态', en: 'Any status' }, { value: 'upcoming', zh: '未开始', en: 'Upcoming' }, { value: 'live', zh: '进行中', en: 'Live' }, { value: 'finished', zh: '已完成', en: 'Completed' }].map(item => <option key={item.value} value={item.value}>{en ? item.en : uiText(item.zh, locale)}</option>)}</select></label>
      <label>{en ? 'Format' : uiText("赛制", locale)}<select value={filters.format} onChange={event => updateQuery({ format: event.target.value, roundView: null })}>{options.formats.map(format => <option key={format} value={format}>{format === 'ALL' ? (en ? 'Any format' : uiText("全部赛制", locale)) : format}</option>)}</select></label>
    </div> : null}
    {chips.length || activeTab !== 'all' ? <div className={styles.activeFilters} aria-label={en ? 'Active filters' : uiText("已选筛选", locale)}>{chips.map(chip => <button key={chip.key} type="button" onClick={() => updateQuery(chip.clear)} aria-label={(en ? 'Remove filter: ' : uiText("移除筛选：", locale)) + chip.label}>{chip.label}<span aria-hidden="true">×</span></button>)}<button type="button" className={styles.clearAll} onClick={() => { resetFilters(); setAdvancedOpen(false) }}>{en ? 'Clear all' : uiText("清除全部", locale)}</button></div> : null}
    <div className={styles.resultsMeta} aria-live="polite"><strong>{scopeTitle}</strong><span>{en ? `${rows.length} matches · ${groups.length} rounds` : uiText("{0} 场比赛 · {1} 个轮次", locale, [rows.length, groups.length])}{activeTab === 'following' ? ` · ${favoriteCount} ${en ? 'followed teams' : uiText("个关注队伍", locale)}` : ''}</span></div>
    {rows.length && activeGroup ? <div className={styles.workspace}>
      <aside className={styles.rounds}>
        <div className={styles.roundsTitle}><span className={styles.kicker}>ROUND INDEX</span><strong>{en ? 'Browse rounds' : uiText("按轮次查找", locale)}</strong></div>
        <nav aria-label={en ? 'Round index' : uiText("轮次索引", locale)}>{groups.map((group, index) => <button key={group.key} type="button" aria-pressed={activeGroup.key === group.key} onClick={() => selectRound(group.key)}><b>{String(index + 1).padStart(2, '0')}</b><span><strong>{getScheduleGroupLabel(group, locale, hub.isArchive)}</strong><small>{en ? `${group.matches.length} matches` : uiText("{0} 场比赛", locale, [group.matches.length])}</small></span><i aria-hidden="true">{activeGroup.key === group.key ? '—' : '→'}</i></button>)}</nav>
      </aside>
      <label className={styles.mobileRound}>{en ? 'Round' : uiText("轮次", locale)}<select value={activeGroup.key} onChange={event => selectRound(event.target.value)}>{groups.map(group => <option key={group.key} value={group.key}>{getScheduleGroupLabel(group, locale, hub.isArchive)} · {group.matches.length}</option>)}</select></label>
      <div ref={recordsRef} className={styles.records} aria-live="polite" data-selected-round={activeGroup.key} data-team-schedule={showTeamSchedule || undefined}>
        {visibleGroups.map(group => <section key={group.key} data-index-round={group.key}>
          <header><div>{!showTeamSchedule ? <span className={styles.kicker}>{en ? 'SELECTED ROUND' : uiText("当前轮次", locale)}</span> : null}<h2>{getScheduleGroupLabel(group, locale, hub.isArchive)}</h2></div><span>{en ? `${group.matches.length} matches` : uiText("{0} 场比赛", locale, [group.matches.length])}</span></header>
          {group.matches.map(match => <MatchRow key={match.match_id} match={match} />)}
        </section>)}
      </div>
    </div> : <div className={styles.empty}>
      <span className={styles.kicker}>NO MATCHES / 00</span><h2>{activeTab === 'following' && !favoriteCount ? (en ? 'Follow your first team.' : uiText("关注一支队伍。", locale)) : (en ? 'No matching games.' : uiText("没有符合条件的比赛。", locale))}</h2><p>{en ? 'Change the filters to find another match.' : uiText("调整筛选条件，继续查找比赛记录。", locale)}</p>
      {activeTab === 'following' ? <Link to={withSeason('/me?section=following&manage=1')}>{en ? 'Manage following' : uiText("管理关注", locale)} ↗</Link> : null}<button type="button" onClick={resetFilters}>{en ? 'Clear filters' : uiText("清除筛选", locale)} ↗</button>
    </div>}
    <footer className={styles.footer}>{en ? 'Open a match for map results, player statistics and available video links. Forfeits and awarded results are retained; byes are excluded.' : uiText("进入比赛查看单图赛果、选手统计及已发布录像。列表保留弃权与判罚结果，不包含轮空记录。", locale)}<Link to={withSeason('/matches')} state={{ restoreScrollY: 0 }}>{hub.isArchive ? en ? 'Match highlights' : uiText("返回赛事精选", locale) : en ? 'Match hub' : uiText("返回赛程总览", locale)} ↗</Link></footer>
  </div>
}

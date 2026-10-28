import { getActiveLocale } from './nativeLocales'
import { useEffect, useMemo, useState } from 'react'
import { Input, Picker } from '@tarojs/components'
import { COPY, scheduleModel, weeklyMapSlots, weeklyScore, weeklyStatusLabel, weeklyTeamShort, weeklyWeekTitle, timeLabel, dayLabel, mapResult, formatOwMapName } from './model'
import { backToSchedule, captureRuntime, changeMatch, openCenter } from '../platform'
import { BUILD } from './build'
import { getPublishedTeamLogo } from '../../../../src/lib/teamLogoResolver.js'
import styles from '../generated/StatsSchedule.module.css'
import './mobile-adapter.css'
import SharedMobileNav from './SharedMobileNav'

const STATUSES = [['all', '全部比赛'], ['live', '进行中'], ['upcoming', '待赛'], ['final', '已结束']]
const idOf = team => String(team?.id || team?.team_id || '')
function TeamIdentity({ team, reverse = false }) {
  const [failed, setFailed] = useState(false)
  const source = getPublishedTeamLogo(team)
  const logo = typeof source === 'string' && /^https:\/\//.test(source) ? source : ''
  const short = weeklyTeamShort(team)
  const initials = /[\u4e00-\u9fff]/.test(short) ? short.slice(0, 1) : short.slice(0, 4)
  return <span className={`${styles.team} ${reverse ? styles.teamB : ''}`}><span className={styles.logo}>{logo && !failed ? <img src={logo} onError={() => setFailed(true)} alt={short} /> : <b className='shared-logo-fallback'>{initials}</b>}</span><span><b>{short}</b><small>{team?.name || team?.team_name}</small></span></span>
}
export function MatchRow({ match, context, detail = false }) {
  const maps = weeklyMapSlots(match)
  const recorded = maps.filter(slot => ['recorded', 'ruling'].includes(slot.state)).length
  const score = ['live', 'complete', 'review', 'ruling'].includes(match.state) ? `${weeklyScore(match.team_a?.score)} : ${weeklyScore(match.team_b?.score)}` : 'VS'
  return <article className={`${styles.matchRow} shared-match shared-state-${match.state}`} data-match-id={match.id}>
    <div className={styles.matchMain} onClick={detail ? undefined : () => changeMatch(match.id, context)} role={detail ? undefined : 'button'}>
      <span className={styles.time}><span className={`${styles.state} shared-state-${match.state}`}><i />{weeklyStatusLabel(match.state, getActiveLocale())}</span><strong>{timeLabel(match)}</strong><small>{match.format || '赛制待公布'}</small></span>
      <span className={styles.duel}><TeamIdentity team={match.team_a} /><span className={styles.score}><strong>{score}</strong><small>{match.state === 'complete' ? '最终比分' : weeklyStatusLabel(match.state, getActiveLocale())}</small></span><TeamIdentity team={match.team_b} reverse /></span>
      <span className={styles.arrow}>↗</span>
    </div>
    <div className={styles.mapProgress}><div className={styles.mapHeading}><span>地图记录</span><b>{recorded}<i> / {maps.length || '—'}</i></b></div><ol className={styles.mapCells}>{maps.map(slot => <li key={slot.order} className={`shared-map-${slot.state}`}><span><span className='shared-map-order'>{String(slot.order).padStart(2, '0')}</span><b className='shared-map-result'>{mapResult(slot, match)}</b></span></li>)}</ol></div>
  </article>
}

export default function SharedSchedule({ raw, selection, onSelection, detailId, loading, error, requestDetail, connectionDetail, onCheckConnection, stale, onRetry, embedded = false }) {
  const model = useMemo(() => raw && selection ? scheduleModel(raw, selection) : null, [raw, selection])
  const match = detailId && model?.weekEntries.flatMap(entry => entry.matches).find(item => item.id === detailId || item.raw_match_id === detailId)
  useEffect(() => {
    if (embedded) return
    captureRuntime({ build: BUILD, view: detailId ? 'detail' : 'schedule', loading, error, requestDetail, connectionDetail, stale, count: model?.resultCount || 0, weekId: model?.selectedWeekId || '', cycleId: model?.cycle?.id || '', title: COPY.title, lead: COPY.lead, matchId: match?.id || '', maps: match ? weeklyMapSlots(match).length : 0, schema: raw?.weekly_competition?.schema_version || '' })
  }, [model, detailId, loading, error, requestDetail, connectionDetail, stale, match, embedded])
  const change = patch => onSelection(current => ({ ...current, ...patch }))
  return <div className={`${embedded ? 'center-embedded' : 'shared-root'} ${styles.page}`} data-shared-layout='stats-weekly-v1'>
    {loading ? <div className='shared-state'>正在读取公开赛程…</div> : error ? <div className='shared-state'><p>{error}</p>{requestDetail ? <p className='shared-request-detail'>{requestDetail}</p> : null}<button onClick={onRetry}>重新读取</button>{onCheckConnection ? <button className='shared-check-connection' onClick={onCheckConnection}>检测连接</button> : null}{connectionDetail ? <p className='shared-connection-detail'>{connectionDetail}</p> : null}</div> : !model ? <div className='shared-state'>赛事暂无公开赛程。</div> : detailId ? <>
      <button className='shared-detail-back' onClick={() => backToSchedule(selection)}>← 返回</button>
      {stale ? <p className='shared-result-note'>更新失败，正在显示上次读取的公开记录。</p> : null}
      {match ? <><MatchRow match={match} context={selection} detail /><div className='shared-detail-teams'>{[match.team_a, match.team_b].filter(team => raw.teams.some(item => idOf(item) === idOf(team))).map((team, side) => <button key={`${side}-${idOf(team)}`} className='shared-detail-team' onClick={() => openCenter({ team: idOf(team) }, selection)}>{weeklyTeamShort(team)} · 队伍资料 ↗</button>)}</div><h2 className={styles.listHeading}>五局记录</h2>{weeklyMapSlots(match).map(slot => <div key={slot.order} className='shared-detail-map'>第 {slot.order} 局 · {formatOwMapName(slot.map?.map_name) || '地图待公布'}<small>{mapResult(slot, match)} · {slot.map ? `${weeklyScore(slot.map.score_a)} : ${weeklyScore(slot.map.score_b)}` : '尚未记录'}</small></div>)}</> : <div className='shared-state'>未找到这场已公布比赛。</div>}
    </> : <>
      <header className={styles.heading}><div><p className={styles.eyebrow}>FRIES CUP / WEEKLY MATCHES</p><h1>{COPY.title}</h1><p className='shared-lead'>{COPY.lead}</p></div><div className={styles.headingActions}><Picker range={model.cycles.map(item => item.name || item.code)} value={Math.max(0, model.cycles.findIndex(item => item.id === selection.cycleId))} onChange={event => change({ cycleId: model.cycles[Number(event.detail.value)].id, weekId: '', teamId: '' })}><span className='cycle-selector'><span>周期</span><b>{model.cycle?.name || '周期待公布'}⌄</b></span></Picker></div></header>
      <div className='shared-week-rail'>{[{ id: 'all', label: '全部周次' }, ...model.weeks].map(week => <button key={week.id} className={model.selectedWeekId === week.id ? 'shared-selected' : ''} onClick={() => change({ weekId: week.id })}>{week.id === 'all' ? week.label : weeklyWeekTitle(week, getActiveLocale())}<small>{week.id === 'all' ? '本周期比赛' : weeklyStatusLabel(week.status, getActiveLocale())}</small></button>)}</div>
      <div className={styles.filters}><label className={styles.search}><span className='shared-search-symbol' /><Input className='shared-search-input' value={selection.query} onInput={event => change({ query: event.detail.value })} placeholder='搜索队伍名称或简称…' maxlength={60} />{selection.query ? <button className='shared-clear' onClick={() => change({ query: '', teamId: '' })}>清除</button> : null}</label><Picker className={styles.teamFilter} range={['全部队伍', ...model.teamOptions.map(team => weeklyTeamShort(team))]} value={Math.max(0, model.teamOptions.findIndex(team => idOf(team) === selection.teamId) + 1)} onChange={event => change({ teamId: Number(event.detail.value) ? idOf(model.teamOptions[Number(event.detail.value) - 1]) : '' })}><span className='team-choice'><span className='team-choice-label'>队伍</span>{weeklyTeamShort(model.teamOptions.find(team => idOf(team) === selection.teamId)) === 'TBD' ? '全部队伍' : weeklyTeamShort(model.teamOptions.find(team => idOf(team) === selection.teamId))}⌄</span></Picker><button className={styles.reset} onClick={() => change({ query: '', teamId: '', status: 'all' })}>重置 ↺</button></div>
      <div className={styles.statusBar}><nav className={styles.statusTabs}>{STATUSES.map(([key, label]) => <button key={key} className={model.activeStatus === key ? 'shared-selected' : ''} onClick={() => change({ status: key })}>{label} <b>{model.counts[key]}</b></button>)}</nav><span className={styles.timezone}>UTC+8</span></div>
      <div className={styles.listHeading}><h2>{model.selectedWeekId === 'all' ? model.cycle?.name : weeklyWeekTitle(model.week, getActiveLocale())}<span>{model.resultCount} 场对阵</span></h2><p>RR5 · 无论比分，都打满五局</p></div>
      {model.entries.length ? <div className={styles.groups}>{model.entries.map(entry => <section key={entry.week.id}>{model.selectedWeekId === 'all' ? <h3 className={styles.weekHeading}><span>{weeklyWeekTitle(entry.week, getActiveLocale())}</span></h3> : null}{entry.days.map(group => <section className={styles.dayGroup} key={group.day}><div className={styles.dayHeading}><h3>{dayLabel(group.day)}</h3><span>{group.matches.length} 场</span></div><div>{group.matches.map(row => <MatchRow key={row.id} match={row} context={selection} />)}</div></section>)}</section>)}</div> : <section className={styles.empty}><h3>没有符合条件的比赛。</h3><p>调整筛选条件，继续查找比赛记录。</p><button onClick={() => change({ query: '', teamId: '', status: 'all' })}>清除筛选 ↗</button></section>}
      <p className='shared-result-note'>{stale ? '更新失败，正在显示上次读取的公开记录。' : '已读取赛事公开记录。'} · 北京时间</p>
    </>}
    {!embedded ? <SharedMobileNav onSchedule={detailId ? () => backToSchedule(selection) : undefined} /> : null}
  </div>
}

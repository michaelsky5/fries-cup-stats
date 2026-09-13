import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatOwMapName } from '../../lib/heroes.js'
import { getMatchFormatLabel } from '../../lib/matchFormat.js'
import { formatMatchSchedule, getMatchScheduleValue } from '../../lib/scheduleFormat.js'
import { getLocationPath, getRestoreScrollY, getReturnState, getSavedReturnScroll, restoreWindowScroll, saveReturnScroll } from '../../lib/navigationState.js'
import { WeeklyCyclePicker, WeeklyWeekRail } from '../weekly-overview/WeeklyNavigation.jsx'
import { weeklyMapSlots, weeklyScore } from '../weekly-overview/weeklyOverviewModel.js'
import { weeklyCycleTitle, weeklyPeriodPath, weeklyStatusLabel, weeklyTeamShort, weeklyWeekTitle } from '../weekly-overview/weeklyPresentation.js'
import { buildWeeklySchedule, resetWeeklyScheduleSearch, WEEKLY_SCHEDULE_STATUSES } from './weeklyScheduleModel.js'
import styles from './SignalWeeklySchedule.module.css'

const statusNames = {
  all: ['全部比赛', 'All matches'], live: ['进行中', 'In progress'], upcoming: ['待赛', 'Upcoming'],
  final: ['已结束', 'Final'], review: ['待审核', 'Under review'], changed: ['延期 / 取消', 'Postponed / cancelled'], unknown: ['状态待更新', 'Status pending']
}
const idOf = team => String(team?.id || team?.team_id || '')

function WeeklyMatchRow({ match, locale, seasonId, withSeason, returnProps }) {
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : zh
  const schedule = formatMatchSchedule(match, { locale })
  const time = schedule.hasSchedule && !schedule.isDateOnly
    ? new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(getMatchScheduleValue(match)))
    : t('时间待定', 'Time TBD')
  const maps = weeklyMapSlots(match)
  const recorded = maps.filter(slot => ['recorded', 'ruling'].includes(slot.state)).length
  const scoreVisible = ['live', 'complete', 'review', 'ruling'].includes(match.state)
  const path = `/matches/${encodeURIComponent(match.id)}`
  const score = scoreVisible ? `${weeklyScore(match.team_a?.score)} : ${weeklyScore(match.team_b?.score)}` : 'VS'
  const note = match.state === 'review' ? t('结果待审核', 'Result under review')
    : match.state === 'postponed' ? t('新时间以公布为准', 'Awaiting the revised schedule')
      : match.state === 'cancelled' ? t('本场已取消', 'This match is cancelled')
        : match.state === 'ruling' ? t('按赛事判定', 'Event ruling applies')
          : match.state === 'live' ? t('比赛仍在继续', 'Still in play') : ''
  return <article className={styles.matchRow} data-state={match.state} data-weekly-match={match.id}>
    <Link className={styles.matchMain} to={withSeason(path)} {...returnProps} aria-label={`${weeklyTeamShort(match.team_a)} ${score} ${weeklyTeamShort(match.team_b)} · ${weeklyStatusLabel(match.state, locale)} · ${t('比赛详情', 'Match details')}`}>
      <span className={styles.time}>
        <span className={styles.state} data-state={match.state}><i aria-hidden="true" />{weeklyStatusLabel(match.state, locale)}</span>
        <strong>{match.state === 'postponed' && schedule.hasSchedule ? t(uiText("原定 {0}", locale, [time]), `Was ${time}`) : time}</strong>
        <small>{getMatchFormatLabel(match)}{match.followed && <span className={styles.followed}> · {t(uiText("已关注", locale), 'Following')}</span>}</small>
      </span>
      <span className={styles.duel}>
        <span className={styles.team}><TeamLogo team={match.team_a} seasonId={seasonId} className={styles.logo} /><span><b>{weeklyTeamShort(match.team_a)}</b><small>{match.team_a?.name || match.team_a?.team_name}</small></span></span>
        <span className={styles.score}><strong>{score}</strong><small>{note || (match.state === 'complete' ? t(uiText("最终比分", locale), 'Final score') : getMatchFormatLabel(match))}</small></span>
        <span className={`${styles.team} ${styles.teamB}`}><TeamLogo team={match.team_b} seasonId={seasonId} className={styles.logo} /><span><b>{weeklyTeamShort(match.team_b)}</b><small>{match.team_b?.name || match.team_b?.team_name}</small></span></span>
      </span>
      <span className={styles.arrow} aria-hidden="true">↗</span>
    </Link>
    <div className={styles.mapProgress}>
      <div className={styles.mapHeading}><span>{t(uiText("地图记录", locale), 'Map records')}</span><b>{recorded}<i> / {maps.length || '—'}</i></b></div>
      <ol className={styles.mapCells} aria-label={t(uiText("各局结果", locale), 'Map results')}>
        {maps.map(({ order, map, state }) => {
          const result = state === 'ruling' ? t('判定', 'Ruling') : state === 'live' ? t('进行中', 'In play')
            : state === 'recorded' ? map.winner === idOf(match.team_a) ? weeklyTeamShort(match.team_a) : map.winner === idOf(match.team_b) ? weeklyTeamShort(match.team_b) : t('已记录', 'Recorded') : '—'
          const label = `${t(`第 ${order} 局`, `Map ${order}`)} · ${formatOwMapName(map?.map_name, locale) || t('地图待公布', 'Map TBA')} · ${result}`
          const content = <><span>{String(order).padStart(2, '0')}</span><b>{result}</b></>
          return <li key={order} data-map-state={state}>{map ? <Link to={withSeason(`${path}?map=${order}`)} {...returnProps} aria-label={label} title={label}>{content}</Link> : <span aria-label={label} title={label}>{content}</span>}</li>
        })}
      </ol>
      {!maps.length && <span className={styles.noMaps}>{t(uiText("暂无地图记录", locale), 'No map records yet')}</span>}
    </div>
  </article>
}

export default function SignalWeeklySchedule() {
  const { db, locale, seasonId, withSeason, isFavoriteTeam } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : zh
  const query = params.get('query') || ''
  const teamId = params.get('teamId') || ''
  const followedOnly = params.get('followed') === '1'
  const followedKey = (db?.teams || []).filter(team => isFavoriteTeam?.(idOf(team))).map(idOf).join('|')
  const model = useMemo(() => buildWeeklySchedule(db, {
    cycleId: params.get('cycle'), weekId: params.get('week'), query: params.get('query') || '',
    teamId: params.get('teamId') || '', status: params.get('status') || 'all', followedOnly: params.get('followed') === '1',
    followedTeamIds: followedKey ? followedKey.split('|') : []
  }), [db, params, followedKey])
  const { cycles, cycle, weeks, week, selectedWeekId, entries, counts, teamOptions } = model
  const restoreY = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
  useEffect(() => { if (restoreY !== null) restoreWindowScroll(restoreY) }, [location.key, restoreY])
  useEffect(() => {
    if (!cycle) return
    if (params.get('cycle') === cycle.id && (params.get('week') || '') === selectedWeekId) return
    const next = new URLSearchParams(params)
    next.set('cycle', cycle.id)
    if (selectedWeekId) next.set('week', selectedWeekId)
    else next.delete('week')
    setParams(next, { replace: true, preventScrollReset: true })
  }, [cycle, selectedWeekId, params, setParams])
  const change = patch => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => value == null || value === '' ? next.delete(key) : next.set(key, value))
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const reset = () => setParams(resetWeeklyScheduleSearch(params), { replace: true, preventScrollReset: true })
  const returnProps = { state: getReturnState(location), onClick: () => saveReturnScroll(location) }
  const overviewPath = withSeason(weeklyPeriodPath('/', cycle, week))
  const shownStatuses = WEEKLY_SCHEDULE_STATUSES.filter((key, index) => index < 4 || counts[key] || model.activeStatus === key)
  const dayLabel = day => day === 'tbd' ? t('日期待定', 'Date TBD') : new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', weekday: 'short' }).format(new Date(`${day}T12:00:00+08:00`))

  return <div className={styles.page} data-weekly-schedule="true">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>FRIES CUP / WEEKLY MATCHES</p><h1>{t(uiText("每一周，都有下一场。", locale), 'A new matchup. Every week.')}</h1><p>{t(uiText("找到想看的对阵，接着看完五局。", locale), 'Find your matchup. Follow all five maps.')}</p></div>
      <div className={styles.headingActions}>
        <WeeklyCyclePicker cycles={cycles} cycle={cycle} locale={locale} onChange={id => change({ cycle: id, week: null, match: null, teamId: null })} />
        <Link to={overviewPath} className={styles.overviewLink}>{t(uiText("周赛总览", locale), 'Weekly overview')} <span aria-hidden="true">↗</span><small>{t(uiText("赛况与周期积分", locale), 'Matches & cycle points')}</small></Link>
      </div>
    </header>
    <WeeklyWeekRail weeks={weeks} selectedId={selectedWeekId} locale={locale} includeAll onChange={id => change({ week: id })} />
    <div className={styles.filters}>
      <label className={styles.search}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><ImeSafeInput type="search" value={query} onValueChange={value => change({ query: value })} placeholder={t(uiText("搜索队伍名称或简称…", locale), 'Search team names or abbreviations…')} aria-label={t(uiText("搜索周赛队伍", locale), 'Search weekly teams')} /></label>
      <label className={styles.teamFilter}><span>{t(uiText("队伍", locale), 'Team')}</span><select value={teamId} onChange={event => change({ teamId: event.target.value })} aria-label={t(uiText("筛选队伍", locale), 'Filter team')}>
        <option value="">{t(uiText("全部队伍", locale), 'All teams')}</option>
        {teamId && !teamOptions.some(team => idOf(team) === teamId) && <option value={teamId}>{t(uiText("本周无对阵的队伍", locale), 'Team without fixtures')}</option>}
        {teamOptions.map(team => <option key={idOf(team)} value={idOf(team)}>{weeklyTeamShort(team)}</option>)}
      </select></label>
      <button type="button" className={styles.followToggle} aria-pressed={followedOnly} onClick={() => change({ followed: followedOnly ? null : '1' })}><span>{t(uiText("只看关注", locale), 'Following only')}</span><i aria-hidden="true"><b /></i></button>
      <button type="button" className={styles.reset} disabled={!model.hasFilters} onClick={reset}>{t(uiText("重置", locale), 'Reset')} ↺</button>
    </div>
    <div className={styles.statusBar}>
      <nav className={styles.statusTabs} aria-label={t(uiText("比赛状态", locale), 'Match status')}>{shownStatuses.map(key => <button key={key} type="button" aria-pressed={model.activeStatus === key} onClick={() => change({ status: key === 'all' ? null : key })}>{statusNames[key][en ? 1 : 0]} <b>{counts[key]}</b></button>)}</nav>
      <span className={styles.timezone}>UTC+8</span>
    </div>
    <div className={styles.listHeading}>
      <h2>{selectedWeekId === 'all' ? weeklyCycleTitle(cycle, locale) : week ? weeklyWeekTitle(week, locale) : t(uiText("周赛赛程", locale), 'Weekly schedule')}<span aria-live="polite">{t(uiText("{0} 场对阵", locale, [model.resultCount]), `${model.resultCount} matches`)}</span></h2>
      <p>{t(uiText("RR5 · 无论比分，都打满五局", locale), 'RR5 · All five maps are played')}</p>
    </div>
    {entries.length ? <div className={styles.groups}>{entries.map(entry => <section key={entry.week.id} aria-label={weeklyWeekTitle(entry.week, locale)}>
      {selectedWeekId === 'all' && <h3 className={styles.weekHeading}><span>{weeklyWeekTitle(entry.week, locale)}</span><small>{weeklyStatusLabel(entry.week.status, locale)}</small></h3>}
      {entry.days.map(group => <section className={styles.dayGroup} key={group.day} aria-label={dayLabel(group.day)}>
        <div className={styles.dayHeading}><h3>{dayLabel(group.day)}</h3><span>{t(uiText("{0} 场", locale, [group.matches.length]), `${group.matches.length} matches`)}</span></div>
        <div>{group.matches.map(match => <WeeklyMatchRow key={match.id} match={match} locale={locale} seasonId={seasonId} withSeason={withSeason} returnProps={returnProps} />)}</div>
      </section>)}
    </section>)}</div> : <section className={styles.empty}>
      <span>WEEKLY / MATCHES</span>
      <h3>{!model.total ? t(uiText("对阵公布后，在这里见。", locale), 'Fixtures will appear here.') : followedOnly && !followedKey ? t(uiText("先选一支想看的队伍。", locale), 'Start with a team to follow.') : t(uiText("没有符合条件的对阵。", locale), 'No matching fixtures.')}</h3>
      <p>{!model.total ? t(uiText("当前周次尚无公开对阵，可切换其他已发布周次。", locale), 'There are no public fixtures in this selection. Try another published week.') : followedOnly && !followedKey ? t(uiText("在周赛总览关注队伍，再回来查看他们的赛程。", locale), 'Follow teams in the weekly overview to see their fixtures here.') : t(uiText("试试其他队伍或比赛状态，也可以重置筛选。", locale), 'Try another team or match status, or reset your filters.')}</p>
      {followedOnly && !followedKey ? <Link to={`${overviewPath}#weekly-following`}>{t(uiText("去关注队伍", locale), 'Choose teams')} ↗</Link> : model.hasFilters && <button type="button" onClick={reset}>{t(uiText("重置筛选", locale), 'Reset filters')} ↺</button>}
    </section>}
    <footer className={styles.footer}><p>{t(uiText("比分与地图记录以公布内容为准；周期积分见总览。", locale), 'Scores and map records follow the published data. Cycle points are in the overview.')}</p><Link to={overviewPath}>{t(uiText("查看周期积分", locale), 'View cycle points')} ↗</Link></footer>
  </div>
}

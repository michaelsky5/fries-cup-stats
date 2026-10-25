import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { eventCenterText } from '../../lib/eventCenterCopy.js'
import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { getMatchFormatLabel } from '../../lib/matchFormat.js'
import { getWatchLink } from '../../lib/watchLink.js'
import { getWeeklyRoundLabel } from '../../lib/weeklyMatchIdentity.js'
import { formatMatchSchedule, getMatchScheduleValue } from '../../lib/scheduleFormat.js'
import { getLocationPath, getRestoreScrollY, getReturnState, getSavedReturnScroll, restoreWindowScroll, saveReturnScroll } from '../../lib/navigationState.js'
import { WeeklyCyclePicker, WeeklyWeekRail } from '../weekly-overview/WeeklyNavigation.jsx'
import { showsInlineTimeZone, weeklyCycleTitle, weeklyPeriodPath, weeklyStatusLabel, weeklyTeamShort, weeklyWeekTitle } from '../weekly-overview/weeklyPresentation.js'
import { buildWeeklySchedule, getWeeklyScheduleScore, resetWeeklyScheduleSearch, selectWeeklyScheduleMatch, WEEKLY_SCHEDULE_STATUSES } from './weeklyScheduleModel.js'
import WeeklyMatchMaps from './WeeklyMatchMaps.jsx'
import WeeklyMatchPreview from './WeeklyMatchPreview.jsx'
import styles from './SignalWeeklySchedule.module.css'

const statusNames = {
  all: ['全部比赛', 'All matches'], live: ['进行中', 'In progress'], upcoming: ['待赛', 'Upcoming'],
  final: ['已结束', 'Final'], review: ['待审核', 'Under review'], changed: ['延期 / 取消', 'Postponed / cancelled'], unknown: ['状态待更新', 'Status pending']
}
const idOf = team => String(team?.id || team?.team_id || '')

function WeeklyMatchRow({ match, locale, seasonId, withSeason, returnProps, mapsExpanded, onToggleMaps, isDesktop, selected, onSelect, previewId, now }) {
  const mapPanelId = useId()
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : uiText(zh, locale)
  const schedule = formatMatchSchedule(match, { locale })
  const time = schedule.hasSchedule && !schedule.isDateOnly
    ? new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(getMatchScheduleValue(match)))
    : t('时间待定', 'Time TBD')
  const path = `/matches/${encodeURIComponent(match.id)}`
  const score = getWeeklyScheduleScore(match)
  const note = match.state === 'review' ? t('结果待审核', 'Result under review')
    : match.state === 'postponed' ? t('新时间以公布为准', 'Awaiting the revised schedule')
      : match.state === 'cancelled' ? t('本场已取消', 'This match is cancelled')
        : match.state === 'ruling' ? t('按赛事判定', 'Event ruling applies')
          : match.state === 'live' ? t('比赛仍在继续', 'Still in play') : ''
  // One row per match (票 2.12): time, teams, score, status. The cycle and week sit in the day heading,
  // the round under the score, and the match number only on the detail page (search still finds it).
  const scoreNote = getWeeklyRoundLabel(match, locale) || note
  const watch = getWatchLink(match, match.state, now)
  const watchLabel = watch?.kind === 'live' ? pickUiLocale(locale, '看直播', 'Watch live', '생중계', '看直播') : pickUiLocale(locale, '看录像', 'Replays', '다시보기', '看錄像')
  const watchShort = watch?.kind === 'live' ? pickUiLocale(locale, '直播', 'Live', '생중계', '直播') : pickUiLocale(locale, '录像', 'Replay', '다시보기', '錄像')
  const MatchMain = isDesktop ? 'button' : Link
  const mainProps = isDesktop ? {
    type: 'button', onClick: onSelect, 'aria-pressed': selected, 'aria-controls': previewId,
    'aria-label': `${eventCenterText('previewMatch', locale)} ${weeklyTeamShort(match.team_a)} / ${weeklyTeamShort(match.team_b)}`
  } : {
    to: withSeason(path), ...returnProps,
    'aria-label': `${weeklyTeamShort(match.team_a)} ${score} ${weeklyTeamShort(match.team_b)} · ${weeklyStatusLabel(match.state, locale)} · ${t('比赛详情', 'Match details')}`
  }
  return <article className={styles.matchRow} data-state={match.state} data-weekly-match={match.id} data-selected={isDesktop && selected || undefined} data-expanded={!isDesktop && mapsExpanded || undefined}>
    <MatchMain className={styles.matchMain} {...mainProps}>
      <span className={styles.time}>
        <strong>{match.state === 'postponed' && schedule.hasSchedule ? t(uiText("原定 {0}", locale, [time]), `Was ${time}`) : time}</strong>
        <span className={styles.state} data-state={match.state}><i aria-hidden="true" />{weeklyStatusLabel(match.state, locale)}</span>
        <small className={styles.format}>{getMatchFormatLabel(match)}{match.followed && <span className={styles.followed}> · {t(uiText("已关注", locale), 'Following')}</span>}</small>
        {match.followed && <small className={styles.followedMark}>{t(uiText("已关注", locale), 'Following')}</small>}
      </span>
      <span className={styles.duel}>
        <span className={styles.team}><TeamLogo team={match.team_a} seasonId={seasonId} className={styles.logo} /><span><b>{weeklyTeamShort(match.team_a)}</b><small>{match.team_a?.name || match.team_a?.team_name}</small></span></span>
        <span className={styles.score}><strong>{score}</strong>{scoreNote ? <small>{scoreNote}</small> : null}</span>
        <span className={`${styles.team} ${styles.teamB}`}><TeamLogo team={match.team_b} seasonId={seasonId} className={styles.logo} /><span><b>{weeklyTeamShort(match.team_b)}</b><small>{match.team_b?.name || match.team_b?.team_name}</small></span></span>
      </span>
      <span className={styles.arrow} aria-hidden="true">{eventCenterText('matchDetails', locale)} <i>↗</i></span>
    </MatchMain>
    {watch ? <a className={styles.watch} href={watch.url} target="_blank" rel="noreferrer" data-watch-kind={watch.kind} aria-label={`${watchLabel} · ${weeklyTeamShort(match.team_a)} / ${weeklyTeamShort(match.team_b)}`}><span className={styles.watchLong}>{watchLabel}</span><span className={styles.watchShort} aria-hidden="true">{watchShort}</span><i aria-hidden="true">↗</i></a> : null}
    {isDesktop && <Link className={styles.rowDetails} to={withSeason(path)} {...returnProps} aria-label={`${t('比赛详情', 'Match details')} · ${weeklyTeamShort(match.team_a)} / ${weeklyTeamShort(match.team_b)}`} title={eventCenterText('matchDetails', locale)}><span>{eventCenterText('matchDetails', locale)}</span><i aria-hidden="true">↗</i></Link>}
    <button type="button" className={styles.mapToggle} aria-expanded={mapsExpanded} aria-controls={mapPanelId} onClick={onToggleMaps} aria-label={`${eventCenterText(mapsExpanded ? 'collapseMatchMaps' : 'expandMatchMaps', locale)} · ${weeklyTeamShort(match.team_a)} / ${weeklyTeamShort(match.team_b)}`}>
      <span>{eventCenterText(mapsExpanded ? 'collapseMatchMaps' : 'expandMatchMaps', locale)}</span><i aria-hidden="true">{mapsExpanded ? '−' : '+'}</i>
    </button>
    <div id={mapPanelId} className={styles.mapProgress} hidden={!mapsExpanded}>
      <WeeklyMatchMaps match={match} locale={locale} withSeason={withSeason} returnProps={returnProps} />
    </div>
  </article>
}

export default function SignalWeeklySchedule() {
  const { db, locale, seasonId, withSeason, isFavoriteTeam } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const previewId = useId()
  const filtersId = useId()
  // 票 2.20: on phones search, team, following-only and reset sit behind one 筛选 button.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)')
    const update = event => setIsDesktop(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : uiText(zh, locale)
  const [openedAt] = useState(() => Date.now())
  const query = params.get('query') || ''
  const teamId = params.get('teamId') || ''
  const expandedMatchId = params.get('expanded') || ''
  const followedOnly = params.get('followed') === '1'
  const followedKey = (db?.teams || []).filter(team => isFavoriteTeam?.(idOf(team))).map(idOf).join('|')
  const model = useMemo(() => buildWeeklySchedule(db, {
    cycleId: params.get('cycle'), weekId: params.get('week'), query: params.get('query') || '',
    teamId: params.get('teamId') || '', status: params.get('status') || 'all', followedOnly: params.get('followed') === '1',
    followedTeamIds: followedKey ? followedKey.split('|') : []
  }), [db, params, followedKey])
  const { cycles, cycle, weeks, week, selectedWeekId, entries, counts, teamOptions } = model
  const selectedMatch = selectWeeklyScheduleMatch(model, params.get('match') || expandedMatchId)
  const selectedMatchWeek = entries.find(entry => entry.matches.some(match => match.id === selectedMatch?.id))?.week
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
  const activeFilters = [query, teamId, followedOnly].filter(Boolean).length
  const returnProps = { state: getReturnState(location), onClick: () => saveReturnScroll(location) }
  const overviewPath = withSeason(weeklyPeriodPath('/', cycle, week))
  const shownStatuses = WEEKLY_SCHEDULE_STATUSES.filter((key, index) => index < 4 || counts[key] || model.activeStatus === key)
  const dayLabel = day => {
    if (day === 'tbd') return t('日期待定', 'Date TBD')
    const date = new Date(`${day}T12:00:00+08:00`)
    if (!String(locale).startsWith('zh')) return new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', weekday: 'short' }).format(date)
    const parts = Object.fromEntries(new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(date).map(part => [part.type, part.value]))
    return `${parts.month}/${parts.day} ${parts.weekday}`
  }

  return <div className={styles.page} data-weekly-schedule="true">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow} data-deco-en>FRIES CUP / WEEKLY MATCHES</p><h1>{t(uiText("赛程赛果", locale), 'Schedule & results')}</h1><p>{eventCenterText('matchesIntro', locale)}</p></div>
      <div className={styles.headingActions}>
        <WeeklyCyclePicker cycles={cycles} cycle={cycle} locale={locale} onChange={id => change({ cycle: id, week: null, match: null, teamId: null, expanded: null })} />
        <Link to={overviewPath} className={styles.overviewLink}>{eventCenterText('overviewLink', locale)} <span aria-hidden="true">↗</span><small>{t(uiText("赛况与赛段积分", locale), 'Matches & cycle points')}</small></Link>
        <button type="button" className={styles.filterToggle} aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen(open => !open)}>{t(uiText("筛选", locale), 'Filters')}{activeFilters ? <b>{activeFilters}</b> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M6 10h8M8 15h4" /></svg>}</button>
      </div>
    </header>
    <WeeklyWeekRail weeks={weeks} selectedId={selectedWeekId} locale={locale} includeAll onChange={id => change({ week: id, match: null, expanded: null })} />
    <div className={styles.workspace}>
      <div className={styles.listColumn}>
        <div className={styles.filters} id={filtersId} data-open={filtersOpen || undefined}>
          <label className={styles.search}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><ImeSafeInput type="search" value={query} onValueChange={value => change({ query: value })} placeholder={t(uiText("搜索队伍或比赛编号…", locale), 'Search teams or match numbers…')} aria-label={t(uiText("搜索周赛队伍或比赛编号", locale), 'Search weekly teams or match numbers')} /></label>
          <label className={styles.teamFilter}><span>{t(uiText("队伍", locale), 'Team')}</span><select value={teamId} onChange={event => change({ teamId: event.target.value })} aria-label={t(uiText("筛选队伍", locale), 'Filter team')}>
            <option value="">{t(uiText("全部队伍", locale), 'All teams')}</option>
            {teamId && !teamOptions.some(team => idOf(team) === teamId) && <option value={teamId}>{t(uiText("本周无对阵的队伍", locale), 'Team without fixtures')}</option>}
            {teamOptions.map(team => <option key={idOf(team)} value={idOf(team)}>{weeklyTeamShort(team)}</option>)}
          </select></label>
          <button type="button" className={styles.followToggle} aria-pressed={followedOnly} onClick={() => change({ followed: followedOnly ? null : '1' })}><span>{t(uiText("只看关注", locale), 'Following only')}</span><i aria-hidden="true"><b /></i></button>
          <button type="button" className={styles.reset} disabled={!model.hasFilters} onClick={reset}>{t(uiText("重置", locale), 'Reset')} ↺</button>
        </div>
        <div className={styles.statusBar}>
          <nav className={styles.statusTabs} aria-label={t(uiText("比赛状态", locale), 'Match status')}>{shownStatuses.map(key => <button key={key} type="button" aria-pressed={model.activeStatus === key} onClick={() => change({ status: key === 'all' ? null : key })}>{uiText(statusNames[key][en ? 1 : 0], locale)} <b>{counts[key]}</b></button>)}</nav>
          {showsInlineTimeZone(locale) && <span className={styles.timezone}>UTC+8</span>}
        </div>
        <div className={styles.listHeading}>
          <h2>{selectedWeekId === 'all' ? weeklyCycleTitle(cycle, locale) : week ? weeklyWeekTitle(week, locale) : t(uiText("周赛赛程", locale), 'Weekly schedule')}<span aria-live="polite">{t(uiText("{0} 场对阵", locale, [model.resultCount]), `${model.resultCount} matches`)}</span></h2>
          <p>{isDesktop ? eventCenterText('previewMatchHint', locale) : entries.length && entries.every(entry => entry.matches.every(match => String(match.format).toUpperCase() === 'RR5')) ? t(uiText("RR5 · 固定五图，可按规则提前结束", locale), 'RR5 · Five maps, subject to event rules') : t(uiText("各场赛制以对阵公示为准", locale), 'Each match follows its published format')}</p>
        </div>
        {entries.length ? <div className={styles.groups}>{entries.map(entry => <section key={entry.week.id} aria-label={weeklyWeekTitle(entry.week, locale)}>
          {selectedWeekId === 'all' && <h3 className={styles.weekHeading}><span>{weeklyWeekTitle(entry.week, locale)}</span><small>{weeklyStatusLabel(entry.week.status, locale)}</small></h3>}
          {entry.days.map(group => <section className={styles.dayGroup} key={group.day} aria-label={dayLabel(group.day)}>
            <div className={styles.dayHeading}><h3>{dayLabel(group.day)}</h3><span>{t(uiText("{0} 场", locale, [group.matches.length]), `${group.matches.length} matches`)}</span></div>
            <div>{group.matches.map(match => <WeeklyMatchRow key={match.id} match={match} now={openedAt} locale={locale} seasonId={seasonId} withSeason={withSeason} returnProps={returnProps} mapsExpanded={expandedMatchId === match.id} onToggleMaps={() => change({ expanded: expandedMatchId === match.id ? null : match.id })} isDesktop={isDesktop} selected={selectedMatch?.id === match.id} onSelect={() => change({ match: match.id })} previewId={previewId} />)}</div>
          </section>)}
        </section>)}</div> : <section className={styles.empty}>
          <span>WEEKLY / MATCHES</span>
          <h3>{!model.total ? t(uiText("赛程尚未公布", locale), 'Schedule not yet published') : followedOnly && !followedKey ? t(uiText("尚未关注队伍", locale), 'No followed teams') : eventCenterText('fixturesEmpty', locale)}</h3>
          <p>{!model.total ? t(uiText("当前周次尚无公开对阵，可切换其他已发布周次。", locale), 'There are no public fixtures in this selection. Try another published week.') : followedOnly && !followedKey ? t(uiText("在周赛总览关注队伍，再回来查看他们的赛程。", locale), 'Follow teams in the weekly overview to see their fixtures here.') : eventCenterText('fixturesEmptyIntro', locale)}</p>
          {followedOnly && !followedKey ? <Link to={`${overviewPath}#weekly-following`}>{t(uiText("去关注队伍", locale), 'Choose teams')} ↗</Link> : model.hasFilters && <button type="button" onClick={reset}>{t(uiText("重置筛选", locale), 'Reset filters')} ↺</button>}
        </section>}
      </div>
      {isDesktop && <WeeklyMatchPreview id={previewId} match={selectedMatch} week={selectedMatchWeek} locale={locale} seasonId={seasonId} withSeason={withSeason} returnProps={returnProps} />}
    </div>
    <footer className={styles.footer}><p>{t(uiText("比分与地图记录以公布内容为准；赛段积分见总览。", locale), 'Scores and map records follow the published data. Cycle points are in the overview.')}</p><Link to={overviewPath}>{t(uiText("查看赛段积分", locale), 'View cycle points')} ↗</Link></footer>
  </div>
}

import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { eventCenterText } from '../../lib/eventCenterCopy.js'
import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import WeeklyMatchIdentity from '../../components/matches/WeeklyMatchIdentity.jsx'
import { formatOwMapName } from '../../lib/heroes.js'
import { getMapImage } from '../../lib/reviewAssets.js'
import { formatMatchSchedule, getMatchScheduleValue } from '../../lib/scheduleFormat.js'
import { getWatchLink } from '../../lib/watchLink.js'
import { getLocationPath, getRestoreScrollY, getReturnState, getSavedReturnScroll, saveReturnScroll } from '../../lib/navigationState.js'
import { buildWeeklyOverview, weeklyMapSlots, weeklyScore } from './weeklyOverviewModel.js'
import { WeeklyCyclePicker, WeeklyWeekRail } from './WeeklyNavigation.jsx'
import { WeeklyPublishedMapPool, weeklyCycleDateRange } from './WeeklyExistingSections.jsx'
import WeeklyPhaseCard from './WeeklyPhaseCard.jsx'
import { buildWeeklyPhases } from './weeklyPhase.js'
import { getSeasonById } from '../../config/seasons.js'
import { isChineseLocale, showsInlineTimeZone, weeklyCycleTitle, weeklyFormatHint, weeklyFormatLabel, weeklyMatchContextLabel, weeklyPeriodPath, weeklyStatusLabel, weeklyWeekTitle, weeklyTeamShort as shortName } from './weeklyPresentation.js'
import { weeklyOverviewReturnLocation } from './weeklyInteractionNavigation.js'
import { weeklyStandingsPreviewLimit, selectWeeklyFollowingPreview, selectWeeklyStandingsPreview } from './weeklyOverviewPreview.js'
import { WeeklyReportTeaser, WeeklyEventPathway } from '../weekly-report/WeeklyReportTeaser.jsx'
import usePublishedNewspaper from '../weekly-report/usePublishedNewspaper.js'
import MatchCountdown from './MatchCountdown.jsx'
import styles from './SignalWeeklyOverview.module.css'

const fullName = team => team?.name || team?.team_name || shortName(team)
const idOf = team => team?.id || team?.team_id

// Weekly registration is normally open-ended. When System does set a deadline the
// note shows it, and the link goes away once it has passed (System rejects late writes).
function registrationNote(db, now, locale) {
  const registration = db?.season?.rules?.registration
  if (registration?.enabled !== true) return null
  const closesAt = Date.parse(registration.closesAt || '')
  if (!Number.isFinite(closesAt)) return pickUiLocale(locale, '随时可以报名', 'Open any time', '언제든 등록 가능', '隨時可以報名')
  if (closesAt <= now) return null
  const time = new Intl.DateTimeFormat(String(locale).startsWith('en') ? 'en-GB' : 'zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(closesAt))
  return pickUiLocale(locale, `${time} 截止`, `Closes ${time}`, `${time} 마감`, `${time} 截止`)
}

const mediaStore = query => ({
  subscribe: callback => {
    const media = window.matchMedia(query)
    media.addEventListener('change', callback)
    return () => media.removeEventListener('change', callback)
  },
  snapshot: () => window.matchMedia(query).matches
})
const desktopMedia = mediaStore('(min-width: 901px)')
// Phones get a different reading order (票 2.2): the match first, links and housekeeping after it.
const phoneMedia = mediaStore('(max-width: 600px)')
const getServerSnapshot = () => false

function WeeklyFollowingSection({ teams, matches, followedIds, isFavoriteTeam, toggleTeamFavorite, seasonId, locale, withSeason, isDesktop }) {
  // A scoped mount captures priority; starring a visible team never moves it.
  const [previewIds] = useState(() => selectWeeklyFollowingPreview(teams, { matches, followedTeamIds: followedIds }).map(idOf))
  const byId = new Map(teams.map(team => [idOf(team), team]))
  const visibleTeams = isDesktop ? previewIds.map(id => byId.get(id)).filter(Boolean) : teams
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : zh
  return <section className={styles.followingSection} id="weekly-following">
    <div><p className={styles.eyebrow}>FOLLOWING</p><h2>{t(uiText("关注队伍", locale), 'Follow teams')}</h2><p>{followedIds.length ? t(uiText("已关注 {0} 支队伍。下次打开，优先呈现关注队伍的进行中比赛。", locale, [followedIds.length]), `Following ${followedIds.length} teams. Their live matches take priority when you return.`) : t(uiText("关注后，下次打开总览时优先显示相关的进行中比赛。", locale), 'Follow teams to prioritize their live matches when you return.')}</p></div>
    <div className={styles.followTeams}>{visibleTeams.map(team => <button type="button" key={idOf(team)} aria-pressed={!!isFavoriteTeam?.(idOf(team))} onClick={() => toggleTeamFavorite(idOf(team))}><TeamLogo team={team} seasonId={seasonId} className={styles.rowLogo} /><b>{shortName(team)}</b><span aria-hidden="true">{isFavoriteTeam?.(idOf(team)) ? '★' : '☆'}</span></button>)}</div>
    {isDesktop && teams.length > 0 && <div className={styles.followingFooter} data-weekly-following-footer>
      <span>{pickUiLocale(locale, `展示 ${visibleTeams.length} 支 · 共 ${teams.length} 支`, `Showing ${visibleTeams.length} of ${teams.length}`, `${teams.length}팀 중 ${visibleTeams.length}팀 표시`, `展示 ${visibleTeams.length} 支 · 共 ${teams.length} 支`)}</span>
      <Link to={withSeason('/teams')}>{pickUiLocale(locale, `查看全部 ${teams.length} 支队伍`, `View all ${teams.length} teams`, `전체 ${teams.length}팀 보기`, `查看全部 ${teams.length} 支隊伍`)}<span aria-hidden="true">→</span></Link>
    </div>}
  </section>
}

export default function SignalWeeklyOverview() {
  const { db, seasonId, locale, withSeason, isFavoriteTeam, toggleTeamFavorite } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const focusRef = useRef(null)
  const pendingPreviewId = useRef('')
  const isDesktop = useSyncExternalStore(desktopMedia.subscribe, desktopMedia.snapshot, getServerSnapshot)
  const isPhone = useSyncExternalStore(phoneMedia.subscribe, phoneMedia.snapshot, getServerSnapshot)
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : zh
  const [openedAt] = useState(() => Date.now())
  const registration = registrationNote(db, openedAt, locale)
  const weeklyPlan = getSeasonById(seasonId)?.weeklyPlan || null
  const phases = useMemo(() => buildWeeklyPhases(db, { now: openedAt, plan: weeklyPlan }), [db, openedAt, weeklyPlan])
  const status = key => weeklyStatusLabel(key, locale)
  const followedIds = (db?.teams || []).filter(team => isFavoriteTeam?.(idOf(team))).map(idOf)
  const followedKey = followedIds.join('|')
  const cycleId = params.get('cycle')
  const weekId = params.get('week')
  const requestedMatch = params.get('match')
  const model = useMemo(() => buildWeeklyOverview(db, { cycleId, weekId, match: requestedMatch, followedTeamIds: followedKey ? followedKey.split('|') : [] }), [db, cycleId, weekId, requestedMatch, followedKey])
  const { cycles, cycle, weeks, week, matches, focus, standings, isPilot } = model
  const focusWatch = getWatchLink(focus, focus?.state, openedAt)
  const selectedCycleId = cycle?.id
  const selectedWeekId = week?.id
  const { issue } = usePublishedNewspaper({ seasonId, cycleId: selectedCycleId, weekId: selectedWeekId, locale })
  const report = issue ? { ...issue.report, newspaper: issue.newspaper } : null
  const focusId = focus?.id
  const restoreScrollY = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
  useLayoutEffect(() => {
    if (!focusId || (restoreScrollY === null && pendingPreviewId.current !== focusId)) return
    const card = focusRef.current
    if (!card) return
    card.focus({ preventScroll: true })
    card.scrollIntoView({ block: 'start', behavior: 'instant' })
    pendingPreviewId.current = ''
  }, [focusId, location.key, restoreScrollY])
  const maps = weeklyMapSlots(focus)
  const mapProgress = maps.map((slot, index) => {
    if (!slot.map?.winner) return { ...slot, cumulative: null }
    const completed = maps.slice(0, index + 1)
    const cumulativeA = completed.filter(item => item.map?.winner === idOf(focus?.team_a)).length
    const cumulativeB = completed.filter(item => item.map?.winner === idOf(focus?.team_b)).length
    return { ...slot, cumulative: `${cumulativeA} : ${cumulativeB}` }
  })
  const rr5 = String(focus?.format).toUpperCase() === 'RR5'
  const currentWeek = Number(week?.week_number) || 1
  const weekTitle = weeklyWeekTitle(week || { week_number: currentWeek }, locale)
  const cycleTitle = item => weeklyCycleTitle(item, locale)
  const change = values => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => value == null ? next.delete(key) : next.set(key, value))
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const chooseMatch = match => {
    pendingPreviewId.current = match.id
    change({ cycle: cycle.id, week: week.id, match: match.id })
  }
  const returnProps = match => {
    const source = weeklyOverviewReturnLocation(location, model, match)
    return { state: getReturnState(source), onClick: () => { saveReturnScroll(location); saveReturnScroll(source) } }
  }
  const dateText = (match, withDay = false) => {
    const schedule = formatMatchSchedule(match, { locale, includeWeekday: withDay })
    return schedule.hasSchedule ? schedule.label.replace('TBD', t('时间待定', 'Time TBD')) : t('时间待定', 'Time TBD')
  }
  const renderScore = match => ['upcoming', 'cancelled', 'postponed', 'unknown'].includes(match?.state) ? 'VS' : `${weeklyScore(match?.team_a?.score)} : ${weeklyScore(match?.team_b?.score)}`
  const focusedIds = focus ? [idOf(focus.team_a), idOf(focus.team_b)] : []
  const teams = Array.isArray(db?.teams) ? db.teams : []
  const followingScope = [seasonId, cycle?.id, week?.id, ...teams.map(idOf)].join('|')
  const following = <WeeklyFollowingSection key={followingScope} teams={teams} matches={matches} followedIds={followedIds} isFavoriteTeam={isFavoriteTeam} toggleTeamFavorite={toggleTeamFavorite} seasonId={seasonId} locale={locale} withSeason={withSeason} isDesktop={isDesktop} />
  const standingsLimit = weeklyStandingsPreviewLimit({ matchCount: matches.length })
  const standingsPreview = selectWeeklyStandingsPreview(standings, focusedIds, { limit: standingsLimit })
  const visibleStandings = isDesktop ? standingsPreview.leading : standings
  const hasStandingsExcerpt = isDesktop && standings.length > standingsLimit
  const renderStandingRow = row => <tr key={row.team_id} data-focused={focusedIds.includes(row.team_id) || undefined}><td>{row.display_rank ?? '—'}{row.tied && <small>{t(uiText("并列", locale), 'Tied')}</small>}</td><th scope="row"><Link to={withSeason(`/teams/${encodeURIComponent(row.team_id)}`)}><TeamLogo team={row.team} seasonId={seasonId} className={styles.rowLogo} />{shortName(row)}</Link></th><td>{row.played ?? '—'}</td><td><strong>{row.points ?? '—'}</strong></td></tr>
  const hasFocusedStandings = !isPilot && standings.some(row => focusedIds.includes(row.team_id))
  const rulebookUrl = cycle?.rulebook?.slug && cycle?.rulebook?.version
    ? `https://fries-cup.com/rules/?book=${encodeURIComponent(cycle.rulebook.slug)}&version=${encodeURIComponent(cycle.rulebook.version)}`
    : 'https://fries-cup.com/rules/'

  const quickLinks = <div className={styles.headingActions} data-weekly-quick-links="true"><Link className={styles.rulesLink} data-weekly-report-archive-link to={withSeason(`/reports?cycle=${encodeURIComponent(selectedCycleId || '')}`)}>{pickUiLocale(locale, '周报归档', 'Weekly reports', '주간 신문', '週報歸檔')} <span aria-hidden="true">→</span><small>{pickUiLocale(locale, '赛果与选手数据', 'Results & player statistics', '경기 결과와 선수 기록', '賽果與選手數據')}</small></Link><a className={styles.rulesLink} href={rulebookUrl} target="_blank" rel="noreferrer">{t(uiText("规则中心", locale), 'Rulebook')} <span aria-hidden="true">↗</span><small>{cycle?.rulebook?.version ? `V${cycle.rulebook.version}` : t(uiText("完整条款与历史版本", locale), 'Rules & version history')}</small></a><a className={styles.rulesLink} href="https://fries-cup.com/events/weekly/" target="_blank" rel="noreferrer">{t(uiText("了解周赛", locale), 'About the weekly')} <span aria-hidden="true">↗</span><small>{t(uiText("赛制与参赛说明", locale), 'Format & participation')}</small></a>{registration ? <Link className={styles.rulesLink} data-weekly-registration-link to={withSeason(`/participate/${encodeURIComponent(seasonId)}`)}>{pickUiLocale(locale, '报名参赛', 'Register a team', '팀 등록', '報名參賽')} <span aria-hidden="true">→</span><small>{registration}</small></Link> : null}</div>
  // Supporter thanks keep their place above the matches; the funding link moves to the end of the page.
  const supporterThanks = seasonId === 'FCW26' ? <SupporterThanks seasonId="FCW26" withSeason={withSeason} locale={locale} /> : null
  const supportLink = seasonId === 'FCW26' ? <div className={styles.supportEntry}><Link to={withSeason('/support')}>{pickUiLocale(locale,'周赛支持与资金进度','Weekly support & funding','주간 대회 후원 및 자금 현황','週賽支持與資金進度')} →</Link></div> : null
  const mapPool = <WeeklyPublishedMapPool cycle={cycle} locale={locale} />

  return <div className={styles.page} data-weekly-overview="true">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>FRIES CUP / WEEKLY</p><h1>{eventCenterText('overviewTitle', locale)}</h1><p>{eventCenterText('overviewIntro', locale)}</p></div>
      {!isPhone && quickLinks}
    </header>
    <WeeklyPhaseCard phases={phases} plan={weeklyPlan} locale={locale} withSeason={withSeason} now={openedAt} seasonId={seasonId} />
    {supporterThanks}
    <section className={styles.periodNavigation} data-weekly-period-nav="true" aria-label={pickUiLocale(locale, '比赛赛段与周次', 'Cycle and weeks', '주기 및 주차', '比賽賽段與週次')}>
      <div className={styles.cycleBlock}><WeeklyCyclePicker cycles={cycles} cycle={cycle} locale={locale} dateRange={weeklyCycleDateRange(cycle, locale)} onChange={id => change({ cycle: id, week: null, match: null })} /></div>
      <WeeklyWeekRail weeks={weeks} selectedId={week?.id} locale={locale} onChange={id => change({ cycle: cycle.id, week: id, match: null })} />
    </section>
    {isDesktop && <WeeklyReportTeaser db={db} cycle={cycle} week={week} report={report} compact locale={locale} withSeason={withSeason} />}

    <div className={styles.mainGrid}>
      <div className={styles.mainColumn}>
      <section className={styles.matchSection} aria-labelledby="weekly-focus-title">
        <div className={styles.sectionBar}><h2 id="weekly-focus-title" className={styles.viewingTitle}>{week && <span>{pickUiLocale(locale, '正在查看', 'Viewing', '보고 있는 주차', '正在查看')}</span>}{week ? weekTitle : t(uiText("本周对阵", locale), 'This week')}</h2><div className={styles.weekSummary}><span>{matches.length ? t(uiText("{0} 场对阵 · {1} 场已结束", locale, [matches.length, model.complete]), `${matches.length} matches · ${model.complete} final`) : t(uiText("等待赛程公布", locale), 'Awaiting publication')}</span></div></div>
        {focus ? <div className={styles.spotlight} id="weekly-focus" ref={focusRef} role="region" tabIndex={-1} aria-label={`${pickUiLocale(locale, '比赛预览', 'Match preview', '경기 미리 보기', '比賽預覽')} · ${shortName(focus.team_a)} / ${shortName(focus.team_b)}`} data-match-state={focus.state}>
          <WeeklyMatchIdentity match={focus} locale={locale} label={weeklyMatchContextLabel(focus, locale)} showCode={false} />
          <div className={styles.matchTop}><span className={styles.state} data-state={focus.state}><i />{status(focus.state)}</span><span className={styles.matchSchedule}>{dateText(focus, true)}{showsInlineTimeZone(locale) && <> <small>UTC+8</small></>}{focus.state === 'upcoming' && <MatchCountdown startsAt={getMatchScheduleValue(focus)} locale={locale} className={styles.countdown} />}</span><span>{weeklyFormatLabel(focus, locale)}</span></div>
          <div className={styles.scoreboard}>
            {[focus.team_a, focus.team_b].map((team, side) => <div className={side ? styles.teamB : styles.teamA} key={side}>
              <TeamLogo team={team} seasonId={seasonId} className={styles.heroLogo} />
              <h3>{shortName(team)}</h3><p>{fullName(team)}</p>
              <button type="button" className={styles.follow} aria-label={`${t('关注队伍', 'Follow team')} ${shortName(team)}`} aria-pressed={!!isFavoriteTeam?.(idOf(team))} onClick={() => toggleTeamFavorite(idOf(team))}>{isFavoriteTeam?.(idOf(team)) ? '★' : '☆'} <span>{t(isFavoriteTeam?.(idOf(team)) ? uiText("已关注", locale) : uiText("关注队伍", locale), isFavoriteTeam?.(idOf(team)) ? 'Following' : 'Follow team')}</span></button>
            </div>)}
            <div className={styles.score}><strong>{renderScore(focus)}</strong><span>{focus.state === 'live' ? t(uiText("比赛仍在继续", locale), 'Still in play') : status(focus.state)}</span></div>
          </div>
          {maps.length > 0 && <div className={styles.mapsSection}>
            <div className={styles.mapHeading}><b>{rr5 ? t(uiText("五局进程", locale), 'Five-map series') : t(uiText("地图记录", locale), 'Map records')}</b><span>{rr5 ? t('RR5 · 固定五图，可按规则提前结束', 'RR5 · Five maps, subject to event rules') : weeklyFormatHint(focus.format, locale) || weeklyFormatLabel(focus, locale)}</span></div>
            <ol className={styles.mapRail} style={{ '--map-count': maps.length }} data-scroll-fades>
              {mapProgress.map(({ order, map, state, cumulative }) => <li key={order} data-map-state={state} style={map?.map_name ? { '--weekly-map-photo': `url("${getMapImage(map.map_type, map.map_name)}")` } : undefined}>
                <span className={styles.mapNumber}>{String(order).padStart(2, '0')}</span><b>{formatOwMapName(map?.map_name, locale) || t(uiText("地图待公布", locale), 'Map TBA')}</b>
                <span>{state === 'recorded' ? t(uiText("已记录", locale), 'Recorded') : state === 'ruling' ? t(uiText("判定记录", locale), 'By ruling') : state === 'live' ? t(uiText("进行中", locale), 'In progress') : t(uiText("待记录", locale), 'Pending')}</span>
                {state === 'recorded' && <small>{map.winner === idOf(focus.team_a) ? `${shortName(focus.team_a)} ${t('胜', 'win')}` : map.winner === idOf(focus.team_b) ? `${shortName(focus.team_b)} ${t('胜', 'win')}` : t(uiText("结果见详情", locale), 'See result')}</small>}
                {cumulative && <strong className={styles.mapCumulative}>{cumulative}<small>{t('大比分', 'Series')}</small></strong>}
                {map && <Link className={styles.mapReportLink} to={withSeason(`/matches/${encodeURIComponent(focus.id)}?map=${order}`)} {...returnProps(focus)} aria-label={`${t('查看第', 'View map')} ${order}${t(' 图', '')} · ${formatOwMapName(map.map_name, locale)}`} />}
              </li>)}
            </ol>
          </div>}
          <div className={styles.matchFooter}><span>{focus.state === 'live' ? t(uiText("进行中的比分尚未计入赛段积分。", locale), 'Live scores are not added to the published cycle points.') : focus.state === 'ruling' ? t(uiText("按赛事判定记录，积分以公布榜单为准。", locale), 'A ruling applies. Points follow the published standings.') : t(uiText("地图记录与结果以公布内容为准。", locale), 'Map records and results follow the published data.')}</span><span className={styles.matchActions}>{focusWatch ? <a href={focusWatch.url} target="_blank" rel="noreferrer" data-watch-kind={focusWatch.kind}>{focusWatch.kind === 'live' ? pickUiLocale(locale, '看直播', 'Watch live', '생중계', '看直播') : pickUiLocale(locale, '看录像', 'Replays', '다시보기', '看錄像')} <span aria-hidden="true">↗</span></a> : null}<Link to={withSeason(`/matches/${encodeURIComponent(focus.id)}`)} {...returnProps(focus)}>{t(uiText("比赛详情", locale), 'Match details')} <span aria-hidden="true">→</span></Link></span></div>
        </div> : <div className={styles.empty}><span>WEEKLY / MATCHES</span><h3>{t(uiText("赛程尚未公布", locale), 'Schedule not yet published')}</h3><p>{t(uiText("可切换其他已发布周次，查看对阵与赛果。", locale), 'Choose another published week to view fixtures and results.')}</p></div>}
        {isPhone && <div className={styles.phoneLinks}>{quickLinks}</div>}
      </section>
      {matches.length > 0 && <section className={styles.matchList} aria-labelledby="weekly-matches-title">
          <div className={styles.listHeading}><h2 id="weekly-matches-title">{pickUiLocale(locale, `第 ${currentWeek} 周全部对阵`, `All matches · Week ${currentWeek}`, `${currentWeek}주차 전체 경기`, `第 ${currentWeek} 週全部對陣`)}</h2><Link className={styles.scheduleLink} to={withSeason(weeklyPeriodPath('/matches', cycle, week))}>{t(uiText("完整周赛赛程", locale), 'Full weekly schedule')} <span aria-hidden="true">→</span></Link></div>
          {matches.map(match => <div className={styles.matchEntry} key={match.id}><button type="button" className={styles.matchRow} aria-label={`${pickUiLocale(locale, '预览对阵', 'Preview matchup', '대진 미리 보기', '預覽對陣')} ${shortName(match.team_a)} / ${shortName(match.team_b)} · ${renderScore(match)}`} aria-pressed={focus?.id === match.id} onClick={() => chooseMatch(match)}>
            <span className={styles.rowTime}><b>{status(match.state)}</b><small>{dateText(match)}</small></span>
            <span className={styles.rowTeam}><TeamLogo team={match.team_a} seasonId={seasonId} className={styles.rowLogo} /><b>{shortName(match.team_a)}</b></span>
            <strong className={styles.rowScore}>{renderScore(match)}</strong>
            <span className={`${styles.rowTeam} ${styles.rowTeamB}`}><b>{shortName(match.team_b)}</b><TeamLogo team={match.team_b} seasonId={seasonId} className={styles.rowLogo} /></span>
            <span className={styles.rowPreview} aria-hidden="true">{focus?.id === match.id ? pickUiLocale(locale, '当前查看', 'Viewing', '보고 있음', '目前查看') : pickUiLocale(locale, '预览', 'Preview', '미리 보기', '預覽')}</span>
          </button><Link className={styles.rowReport} to={withSeason(`/matches/${encodeURIComponent(match.id)}`)} {...returnProps(match)} aria-label={`${shortName(match.team_a)} / ${shortName(match.team_b)} · ${pickUiLocale(locale, '比赛详情', 'Match details', '경기 상세', '比賽詳情')}`}><span>{pickUiLocale(locale, '比赛详情', 'Match details', '경기 상세', '比賽詳情')}</span><span aria-hidden="true">→</span></Link></div>)}
      </section>}

      {!isDesktop && following}
      </div>
      <aside className={styles.standings} aria-labelledby="weekly-standings-title">
        <div className={styles.sectionBar}><h2 id="weekly-standings-title">{t(uiText("赛段积分", locale), 'Cycle points')}</h2><span>{cycleTitle(cycle)}</span></div>
        <div className={styles.standingsPanel}>
        <div className={styles.standingsIntro}><span>{isPilot ? t(uiText("本赛段不计入正式积分。", locale), 'This cycle does not award standings points.') : eventCenterText('latestCyclePoints', locale)}</span>{hasFocusedStandings && <div className={styles.standingsFocusLegend} id="weekly-standings-focus-legend"><i aria-hidden="true" />{pickUiLocale(locale, '高亮为当前对阵队伍', 'Shaded rows mark the current matchup', '강조된 행은 현재 대진의 팀입니다', '高亮為目前對陣隊伍')}</div>}</div>
        {!isPilot && standings.length > 0 ? <>
          <table aria-describedby={hasFocusedStandings ? 'weekly-standings-focus-legend' : undefined}>
            {hasStandingsExcerpt && <caption className={styles.standingsCaption}>{pickUiLocale(locale, `前 ${standingsLimit} 支 · 共 ${standings.length} 支`, `First ${standingsLimit} of ${standings.length} teams`, `전체 ${standings.length}팀 중 상위 ${standingsLimit}팀`, `前 ${standingsLimit} 支 · 共 ${standings.length} 支`)}</caption>}
            <thead><tr><th scope="col">{t(uiText("名次", locale), 'Rank')}</th><th scope="col">{t(uiText("队伍", locale), 'Team')}</th><th scope="col">{t(uiText("已赛", locale), 'Played')}</th><th scope="col">{t(uiText("积分", locale), 'Pts')}</th></tr></thead>
            <tbody>{visibleStandings.map(renderStandingRow)}</tbody>
            {isDesktop && standingsPreview.related.length > 0 && <tbody data-weekly-standings-context><tr className={styles.standingsContextLabel}><th colSpan={4} scope="rowgroup">{pickUiLocale(locale, '本场对阵', 'Current matchup', '현재 대진', '本場對陣')}</th></tr>{standingsPreview.related.map(renderStandingRow)}</tbody>}
          </table>
          <p className={styles.standingsNote}>{t(uiText("同分保留公布的并列名次；不同队伍已赛场数可能不同。", locale), 'Published ties are preserved. Teams may have played different numbers of matches.')}</p>
        </> : <div className={styles.pointsEmpty}><span>—</span><p>{isPilot ? t(uiText("保留比赛记录，不生成积分名次。", locale), 'Match records are kept without a points ranking.') : t(uiText("积分榜尚未公布。", locale), 'Standings have not been published.')}</p></div>}
        {!isPilot && <div className={styles.pointsRule}><span>RR5</span><p><b>{isChineseLocale(locale) ? pickUiLocale(locale, '五局积分制：胜一局 2 分，负或平 1 分', '', '', '五局積分制：勝一局 2 分，負或平 1 分') : t(uiText("胜一局 2 分 · 负或平 1 分", locale), 'Map win 2 pts · loss or draw 1 pt')}</b><small>{t(uiText("常规完赛计分；弃权等特殊结果按赛事判定。", locale), 'Normal completed play. Exceptional results follow event rulings.')}</small></p></div>}
        <Link className={styles.advanceLink} to={withSeason(weeklyPeriodPath('/advance', cycle, week))}>{hasStandingsExcerpt ? pickUiLocale(locale, '完整积分与晋级形势', 'Full standings & advancement', '전체 순위 및 진출 현황', '完整積分與晉級形勢') : t(uiText("查看晋级形势", locale), 'Explore advancement')} <span aria-hidden="true">→</span></Link>
        </div>
      </aside>
    </div>

    {mapPool}
    {!isDesktop && <WeeklyReportTeaser db={db} cycle={cycle} week={week} report={report} locale={locale} withSeason={withSeason} />}
    {isDesktop && following}
    <WeeklyEventPathway cycle={cycle} week={week} locale={locale} withSeason={withSeason} />
    {supportLink}
  </div>
}
import SupporterThanks from '../weekly-support/SupporterThanks.jsx'

import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatOwMapName } from '../../lib/heroes.js'
import { getMatchFormatLabel } from '../../lib/matchFormat.js'
import { formatMatchSchedule } from '../../lib/scheduleFormat.js'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import { buildWeeklyOverview, weeklyMapSlots, weeklyScore } from './weeklyOverviewModel.js'
import { WeeklyCyclePicker, WeeklyWeekRail } from './WeeklyNavigation.jsx'
import { weeklyCycleTitle, weeklyPeriodPath, weeklyStatusLabel } from './weeklyPresentation.js'
import styles from './SignalWeeklyOverview.module.css'

const shortName = team => team?.short || team?.team_short_name || team?.name || team?.team_name || 'TBD'
const fullName = team => team?.name || team?.team_name || shortName(team)
const idOf = team => team?.id || team?.team_id

export default function SignalWeeklyOverview() {
  const { db, seasonId, locale, withSeason, isFavoriteTeam, toggleTeamFavorite } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const focusRef = useRef(null)
  const en = String(locale).startsWith('en')
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer) }, [])
  const t = (zh, english) => en ? english : zh
  const status = key => weeklyStatusLabel(key, locale)
  const followedIds = (db?.teams || []).filter(team => isFavoriteTeam?.(idOf(team))).map(idOf)
  const followedKey = followedIds.join('|')
  const cycleId = params.get('cycle')
  const weekId = params.get('week')
  const requestedMatch = params.get('match')
  const model = useMemo(() => buildWeeklyOverview(db, { cycleId, weekId, match: requestedMatch, followedTeamIds: followedKey ? followedKey.split('|') : [] }), [db, cycleId, weekId, requestedMatch, followedKey])
  const { cycles, cycle, weeks, week, matches, focus, standings, isPilot } = model
  const registration = !cycles.length ? db?.weekly_competition?.registration : null
  const registrationClosed = registration?.closes_at && Date.parse(registration.closes_at) <= now
  const registrationUpcoming = registration?.opens_at && Date.parse(registration.opens_at) > now
  const registrationLabel = registrationClosed ? t('报名已截止', 'Registration closed') : registrationUpcoming ? t('报名即将开放', 'Registration opening soon') : t('报名中', 'Registration open')
  const registrationDate = (value, includeTime = false) => value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat(en ? 'en-GB' : 'zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'medium', ...(includeTime ? { timeStyle: 'short', hour12: false } : {}) }).format(new Date(value)) : t('待公布', 'To be announced')
  const maps = weeklyMapSlots(focus)
  const rr5 = String(focus?.format).toUpperCase() === 'RR5'
  const currentWeek = Number(week?.week_number) || 1
  const weekTitle = t(week?.label || `第 ${currentWeek} 周`, `Week ${currentWeek}`)
  const cycleTitle = item => weeklyCycleTitle(item, locale)
  const change = values => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => value == null ? next.delete(key) : next.set(key, value))
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const chooseMatch = match => {
    change({ cycle: cycle.id, week: week.id, match: match.id })
    if (focusRef.current?.getBoundingClientRect().top < 100) focusRef.current.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  const returnProps = { state: getReturnState(location), onClick: () => saveReturnScroll(location) }
  const dateText = (match, withDay = false) => {
    const schedule = formatMatchSchedule(match, { locale, includeWeekday: withDay })
    return schedule.hasSchedule ? schedule.label.replace('TBD', t('时间待定', 'Time TBD')) : t('时间待定', 'Time TBD')
  }
  const renderScore = match => ['upcoming', 'cancelled', 'postponed', 'unknown'].includes(match?.state) ? 'VS' : `${weeklyScore(match?.team_a?.score)} : ${weeklyScore(match?.team_b?.score)}`
  const focusedIds = focus ? [idOf(focus.team_a), idOf(focus.team_b)] : []

  return <div className={styles.page} data-weekly-overview="true">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>FRIES CUP / WEEKLY</p><h1>{t(uiText("五局，都算数。", locale), 'Every map counts.')}</h1><p>{t(uiText("从这一周的对阵，走向整个周期。", locale), 'This week’s matchups. A whole cycle to play for.')}</p></div>
      <div className={styles.headingActions}><WeeklyCyclePicker cycles={cycles} cycle={cycle} locale={locale} onChange={id => change({ cycle: id, week: null, match: null })} /><a className={styles.rulesLink} href="https://fries-cup.com/events/weekly/" target="_blank" rel="noreferrer">{t(uiText("了解周赛", locale), 'About the weekly')} <span aria-hidden="true">↗</span><small>{t(uiText("赛制与参赛说明", locale), 'Format & participation')}</small></a></div>
    </header>
    <WeeklyWeekRail weeks={weeks} selectedId={week?.id} locale={locale} onChange={id => change({ cycle: cycle.id, week: id, match: null })} />

    <div className={styles.mainGrid}>
      <section className={styles.matchSection} aria-labelledby="weekly-focus-title">
        <div className={styles.sectionBar}><h2 id="weekly-focus-title">{week ? weekTitle : registration ? t('首周参赛', 'Opening week') : t(uiText("本周对阵", locale), 'This week')}</h2><span>{matches.length ? t(uiText("{0} 场对阵 · {1} 场已结束", locale, [matches.length, model.complete]), `${matches.length} matches · ${model.complete} final`) : registration ? registrationLabel : t(uiText("等待赛程公布", locale), 'Awaiting publication')}</span></div>
        {focus ? <div className={styles.spotlight} id="weekly-focus" ref={focusRef} data-match-state={focus.state}>
          <div className={styles.matchTop}><span className={styles.state} data-state={focus.state}><i />{status(focus.state)}</span><span>{dateText(focus, true)} <small>UTC+8</small></span><span>{getMatchFormatLabel(focus)}</span></div>
          <div className={styles.scoreboard}>
            {[focus.team_a, focus.team_b].map((team, side) => <div className={side ? styles.teamB : styles.teamA} key={side}>
              <TeamLogo team={team} seasonId={seasonId} className={styles.heroLogo} />
              <h3>{shortName(team)}</h3><p>{fullName(team)}</p>
              <button type="button" className={styles.follow} aria-label={`${t('关注队伍', 'Follow team')} ${shortName(team)}`} aria-pressed={!!isFavoriteTeam?.(idOf(team))} onClick={() => toggleTeamFavorite(idOf(team))}>{isFavoriteTeam?.(idOf(team)) ? '★' : '☆'} <span>{t(isFavoriteTeam?.(idOf(team)) ? uiText("已关注", locale) : uiText("关注队伍", locale), isFavoriteTeam?.(idOf(team)) ? 'Following' : 'Follow team')}</span></button>
            </div>)}
            <div className={styles.score}><strong>{renderScore(focus)}</strong><span>{focus.state === 'live' ? t(uiText("比赛仍在继续", locale), 'Still in play') : status(focus.state)}</span></div>
          </div>
          {maps.length > 0 && <div className={styles.mapsSection}>
            <div className={styles.mapHeading}><b>{rr5 ? t(uiText("五局进程", locale), 'Five-map series') : t(uiText("地图记录", locale), 'Map records')}</b><span>{focus.state === 'ruling' ? t(uiText("保留实际比分", locale), 'Actual scores retained') : rr5 ? t(uiText("RR5 · 无论比分，都打满五局", locale), 'RR5 · All five maps are played') : getMatchFormatLabel(focus)}</span></div>
            <ol className={styles.mapRail} style={{ '--map-count': maps.length }}>
              {maps.map(({ order, map, state }) => <li key={order} data-map-state={state}>
                <span className={styles.mapNumber}>{String(order).padStart(2, '0')}</span><b>{state === 'not-played' ? t(uiText("因弃权未进行", locale), 'Not played · forfeit') : formatOwMapName(map?.map_name, locale) || t(uiText("地图待公布", locale), 'Map TBA')}</b>
                <span>{state === 'not-played' ? '—' : state === 'recorded' ? t(uiText("已记录", locale), 'Recorded') : state === 'ruling' ? t(uiText("判定记录", locale), 'By ruling') : state === 'live' ? t(uiText("进行中", locale), 'In progress') : t(uiText("待记录", locale), 'Pending')}</span>
                {state === 'recorded' && <small>{map.winner === idOf(focus.team_a) ? `${shortName(focus.team_a)} ${t('胜', 'win')}` : map.winner === idOf(focus.team_b) ? `${shortName(focus.team_b)} ${t('胜', 'win')}` : t(uiText("结果见详情", locale), 'See result')}</small>}
              </li>)}
            </ol>
          </div>}
          <div className={styles.matchFooter}><span>{focus.state === 'live' ? t(uiText("进行中的比分尚未计入周期积分。", locale), 'Live scores are not added to the published cycle points.') : focus.state === 'ruling' ? t(uiText("按赛事判定记录，积分以公布榜单为准。", locale), 'A ruling applies. Points follow the published standings.') : t(uiText("地图记录与结果以公布内容为准。", locale), 'Map records and results follow the published data.')}</span><Link to={withSeason(`/matches/${encodeURIComponent(focus.id)}`)} {...returnProps}>{t(uiText("比赛详情", locale), 'Match details')} <span aria-hidden="true">↗</span></Link></div>
        </div> : registration ? <div className={`${styles.empty} ${styles.registration}`}>
          <span>WEEK 0{registration.week_number} / {registrationLabel}</span>
          <h3>{registration.label}</h3>
          <p>{registration.counts_toward_standings ? t('这一周正式计入周期积分。每场固定打满五张地图。', 'This week awards cycle points. Each series consists of five maps.') : t('这一周保留比赛记录，不计入正式周期积分。', 'Match records are retained without formal cycle points.')}</p>
          <dl><div><dt>{t('比赛日期', 'Match dates')}</dt><dd>{registrationDate(registration.match_window_starts_at)} — {registrationDate(registration.match_window_ends_at)}</dd></div><div><dt>{t('报名截止', 'Registration deadline')}</dt><dd>{registrationDate(registration.closes_at, true)} <small>UTC+8</small></dd></div></dl>
          <Link className={styles.registrationLink} to={withSeason(`/participate/${seasonId}`)}>{t('进入网页报名', 'Open registration')} ↗</Link>
          <p className={styles.registrationNote}>{t('由赛管邀请队伍负责人，负责人在网页邀请选手、提交报名。对阵审核公布后会出现在这里。', 'An organizer invites each team representative, who invites players and submits the roster online. Approved fixtures will appear here.')}</p>
        </div> : <div className={styles.empty}><span>WEEKLY / NEXT UP</span><h3>{t(uiText("下一场，等你上场。", locale), 'The next match is ahead.')}</h3><p>{t(uiText("公开赛程尚未公布，公布后可在这里查看对阵与五局进程。", locale), 'Fixtures and map records will appear once the schedule is published.')}</p></div>}
      </section>
      {matches.length > 0 && <section className={styles.matchList} aria-labelledby="weekly-matches-title">
          <div className={styles.listHeading}><h2 id="weekly-matches-title">{t(uiText("本周全部对阵", locale), 'All matches this week')}</h2><Link className={styles.scheduleLink} to={withSeason(weeklyPeriodPath('/matches', cycle, week))}>{t(uiText("完整周赛赛程", locale), 'Full weekly schedule')} ↗</Link></div>
          {matches.map(match => <button type="button" key={match.id} className={styles.matchRow} aria-pressed={focus?.id === match.id} onClick={() => chooseMatch(match)}>
            <span className={styles.rowTime}><b>{status(match.state)}</b><small>{dateText(match)}</small></span>
            <span className={styles.rowTeam}><TeamLogo team={match.team_a} seasonId={seasonId} className={styles.rowLogo} /><b>{shortName(match.team_a)}</b></span>
            <strong className={styles.rowScore}>{renderScore(match)}</strong>
            <span className={`${styles.rowTeam} ${styles.rowTeamB}`}><b>{shortName(match.team_b)}</b><TeamLogo team={match.team_b} seasonId={seasonId} className={styles.rowLogo} /></span>
            <span className={styles.rowArrow} aria-hidden="true">{focus?.id === match.id ? '↑' : '↗'}</span>
          </button>)}
      </section>}

      <aside className={styles.standings} aria-labelledby="weekly-standings-title">
        <div className={styles.sectionBar}><h2 id="weekly-standings-title">{t(uiText("周期积分", locale), 'Cycle points')}</h2><span>{cycleTitle(cycle)}</span></div>
        <div className={styles.standingsIntro}><p>{isPilot ? t(uiText("比赛照常记录。", locale), 'Every match is still recorded.') : t(uiText("每一局，带进这个周期。", locale), 'Every map stays in this cycle.')}</p><span>{isPilot ? t(uiText("本周期不计入正式积分。", locale), 'This cycle does not award standings points.') : t(uiText("展示本周期最新已公布积分，不随周次回溯。", locale), 'Latest published cycle totals, across all weeks.')}</span></div>
        {!isPilot && standings.length > 0 ? <>
          <table><thead><tr><th scope="col">{t(uiText("名次", locale), 'Rank')}</th><th scope="col">{t(uiText("队伍", locale), 'Team')}</th><th scope="col">{t(uiText("已赛", locale), 'Played')}</th><th scope="col">{t(uiText("积分", locale), 'Pts')}</th></tr></thead><tbody>{standings.map(row => <tr key={row.team_id} data-focused={focusedIds.includes(row.team_id) || undefined}><td>{row.display_rank ?? '—'}{row.tied && <small>{t(uiText("并列", locale), 'Tied')}</small>}</td><th scope="row"><span><TeamLogo team={row.team} seasonId={seasonId} className={styles.rowLogo} />{row.team_short_name || row.team_name}</span></th><td>{row.played ?? '—'}</td><td><strong>{row.points ?? '—'}</strong></td></tr>)}</tbody></table>
          <p className={styles.standingsNote}>{t(uiText("同分保留公布的并列名次；不同队伍已赛场数可能不同。", locale), 'Published ties are preserved. Teams may have played different numbers of matches.')}</p>
        </> : <div className={styles.pointsEmpty}><span>—</span><p>{isPilot ? t(uiText("保留比赛记录，不生成积分名次。", locale), 'Match records are kept without a points ranking.') : t(uiText("积分榜尚未公布。", locale), 'Standings have not been published.')}</p></div>}
        {!isPilot && <div className={styles.pointsRule}><span>RR5</span><p><b>{t(uiText("胜一局 2 分 · 负或平 1 分", locale), 'Map win 2 pts · loss or draw 1 pt')}</b><small>{t(uiText("常规完赛计分；弃权等特殊结果按赛事判定。", locale), 'Normal completed play. Exceptional results follow event rulings.')}</small></p></div>}
        <Link className={styles.advanceLink} to={withSeason(weeklyPeriodPath('/advance', cycle, week))}>{t(uiText("查看晋级形势", locale), 'Explore advancement')} <span aria-hidden="true">↗</span></Link>
      </aside>
    </div>

    {(db?.teams || []).length > 0 && <section className={styles.followingSection} id="weekly-following">
      <div><p className={styles.eyebrow}>KEEP UP WITH YOUR TEAM</p><h2>{t(uiText("下一周，还想看谁？", locale), 'Who will you follow next?')}</h2><p>{followedIds.length ? t(uiText("已关注 {0} 支队伍。下次打开，优先呈现关注队伍的进行中比赛。", locale, [followedIds.length]), `Following ${followedIds.length} teams. Their live matches take priority when you return.`) : t(uiText("关注队伍，把每一周连起来。", locale), 'Follow a team from one week to the next.')}</p></div>
      <div className={styles.followTeams}>{(db?.teams || []).map(team => <button type="button" key={idOf(team)} aria-pressed={!!isFavoriteTeam?.(idOf(team))} onClick={() => toggleTeamFavorite(idOf(team))}><TeamLogo team={team} seasonId={seasonId} className={styles.rowLogo} /><b>{shortName(team)}</b><span aria-hidden="true">{isFavoriteTeam?.(idOf(team)) ? '★' : '☆'}</span></button>)}</div>
    </section>}
    <footer className={styles.pathway}><div><span>01</span><b>{t(uiText("每周上场", locale), 'Weekly play')}</b><small>{t(uiText("五局累计周期积分", locale), 'Five maps, cycle points')}</small></div><i aria-hidden="true">→</i><div><span>02</span><b>{t(uiText("周期季后赛", locale), 'Cycle playoffs')}</b><small>{t(uiText("双败淘汰，继续向前", locale), 'Double elimination')}</small></div><i aria-hidden="true">→</i><div><span>03</span><b>Weekly Major</b><small>{t(uiText("走向更大的赛场", locale), 'The next stage')}</small></div><p>{t(uiText("晋级名额与日期，以当期公示为准。", locale), 'Qualification places and dates follow the current announcement.')}</p></footer>
  </div>
}

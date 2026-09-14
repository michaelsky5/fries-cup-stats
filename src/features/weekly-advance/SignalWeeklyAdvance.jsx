import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatMatchSchedule } from '../../lib/scheduleFormat.js'
import { getLocationPath, getRestoreScrollY, getReturnState, getSavedReturnScroll, restoreWindowScroll, saveReturnScroll } from '../../lib/navigationState.js'
import { WeeklyCyclePicker } from '../weekly-overview/WeeklyNavigation.jsx'
import { weeklyScore } from '../weekly-overview/weeklyOverviewModel.js'
import { weeklyCycleTitle, weeklyPeriodPath, weeklyStatusLabel, weeklyTeamShort, weeklyWeekTitle } from '../weekly-overview/weeklyPresentation.js'
import { buildWeeklyAdvance, resetWeeklyAdvanceSearch, weeklyPublishedRank } from './weeklyAdvanceModel.js'
import styles from './SignalWeeklyAdvance.module.css'

const idOf = team => String(team?.id || team?.team_id || '')
const officialWeekly = 'https://fries-cup.com/events/weekly/'
const rankLabel = value => {
  const rank = weeklyPublishedRank(value)
  return rank === '—' ? rank : rank.padStart(2, '0')
}

export default function SignalWeeklyAdvance() {
  const { db, locale, seasonId, withSeason, isFavoriteTeam, toggleTeamFavorite } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const journeyRef = useRef(null)
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : zh
  const query = params.get('query') || ''
  const followedOnly = params.get('followed') === '1'
  const followedKey = (db?.teams || []).filter(team => isFavoriteTeam?.(idOf(team))).map(idOf).join('|')
  const model = useMemo(() => buildWeeklyAdvance(db, {
    cycleId: params.get('cycle'), weekId: params.get('week'), teamId: params.get('teamId'),
    query: params.get('query') || '', followedOnly: params.get('followed') === '1',
    followedTeamIds: followedKey ? followedKey.split('|') : []
  }), [db, params, followedKey])
  const { cycles, cycle, week, rows, selected, journey, isPilot, hasStandings } = model
  const restoreY = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
  useEffect(() => { if (restoreY !== null) restoreWindowScroll(restoreY) }, [location.key, restoreY])
  useEffect(() => {
    if (!cycle || params.get('cycle') === cycle.id) return
    const next = new URLSearchParams(params)
    next.set('cycle', cycle.id)
    setParams(next, { replace: true, preventScrollReset: true })
  }, [cycle, params, setParams])
  const change = patch => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => value == null || value === '' ? next.delete(key) : next.set(key, value))
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const chooseTeam = id => {
    change({ teamId: id })
    if (window.matchMedia('(max-width: 800px)').matches) journeyRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  const reset = () => setParams(resetWeeklyAdvanceSearch(params), { replace: true, preventScrollReset: true })
  const returnProps = { state: getReturnState(location), onClick: () => saveReturnScroll(location) }
  const overviewPath = withSeason(weeklyPeriodPath('/', cycle, week))
  const standing = selected?.standing
  const rank = weeklyPublishedRank(standing?.display_rank)
  const isFollowing = selected && !!isFavoriteTeam?.(selected.id)
  const stages = [
    { id: 'points', title: isPilot ? t(uiText("比赛记录", locale), 'Match records') : t(uiText("周期积分", locale), 'Cycle points'), note: isPilot ? t('本周期不计积分', 'No standings points') : t('按周累计', 'Week by week') },
    { id: 'playoffs', title: t(uiText("周期季后赛", locale), 'Cycle playoffs'), note: t('双败淘汰', 'Double elimination') },
    { id: 'major', title: 'Weekly Major', note: t('走向下一站', 'The next stage') }
  ]

  return <div className={styles.page} data-weekly-advance="true">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>FRIES CUP / WEEKLY ADVANCE</p><h1>{t(uiText("一周一周，走向下一站。", locale), 'Week by week. On to the next stage.')}</h1><p>{t(uiText("先看周期排名，再沿着队伍的比赛往下看。", locale), 'Start with the standings. Follow each team’s matches.')}</p></div>
      <div className={styles.headingActions}>
        <WeeklyCyclePicker cycles={cycles} cycle={cycle} locale={locale} onChange={id => change({ cycle: id, week: null, teamId: null })} />
        <Link to={overviewPath} className={styles.overviewLink}>{t(uiText("周赛总览", locale), 'Weekly overview')} <span aria-hidden="true">↗</span><small>{t(uiText("回到本周对阵", locale), 'This week’s matchups')}</small></Link>
      </div>
    </header>
    <nav className={styles.pathway} aria-label={t(uiText("周赛晋级路径", locale), 'Weekly advancement path')}>
      {stages.map((stage, index) => <a key={stage.id} href={`#weekly-${stage.id}`} data-current={model.activeStage === stage.id || undefined} aria-current={model.activeStage === stage.id ? 'step' : undefined}>
        <span className={styles.stageNumber}>{String(index + 1).padStart(2, '0')}</span><span><b>{stage.title}</b><small>{stage.note}</small></span>
        <span className={styles.stageArrow} aria-hidden="true">{index === 2 ? '↗' : '→'}</span>
      </a>)}
    </nav>

    <section className={styles.workspace} id="weekly-points" aria-labelledby="weekly-points-title">
      <div className={styles.ranking}>
        <header className={styles.sectionHeading}><div><p className={styles.eyebrow}>{weeklyCycleTitle(cycle, locale)}</p><h2 id="weekly-points-title">{isPilot ? t(uiText("队伍比赛记录", locale), 'Team match records') : t(uiText("周期积分", locale), 'Cycle points')}<span aria-live="polite">{t(uiText("{0} 支队伍", locale, [rows.length]), `${rows.length} teams`)}</span></h2></div><span className={styles.selectionHint}>{t(uiText("点选队伍看历程", locale), 'Select a team to explore')} ↗</span></header>
        <p className={styles.pointsIntro}>{isPilot ? t(uiText("本周期不计积分，比赛记录照常保留。", locale), 'This cycle keeps match records without awarding standings points.') : t(uiText("本周期最新公布总积分，不随周次回溯。", locale), 'Latest published cycle totals, across all weeks.')}</p>
        <div className={styles.filters}>
          <label className={styles.search}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><ImeSafeInput type="search" value={query} onValueChange={value => change({ query: value })} placeholder={t(uiText("搜索队伍…", locale), 'Search teams…')} aria-label={t(uiText("搜索积分榜队伍", locale), 'Search standings teams')} /></label>
          <button type="button" className={styles.followToggle} aria-pressed={followedOnly} onClick={() => change({ followed: followedOnly ? null : '1' })}><span>{t(uiText("只看关注", locale), 'Following only')}</span><i aria-hidden="true"><b /></i></button>
          <button type="button" className={styles.reset} disabled={!model.hasFilters} onClick={reset}>{t(uiText("重置", locale), 'Reset')} ↺</button>
        </div>
        {rows.length ? <table className={styles.table}>
          <thead><tr>{hasStandings && <th scope="col">{t(uiText("名次", locale), 'Rank')}</th>}<th scope="col">{t(uiText("队伍", locale), 'Team')}</th>{hasStandings && <><th scope="col">{t(uiText("已赛", locale), 'Played')}</th><th scope="col" className={styles.recordColumn}>{t(uiText("胜 / 平 / 负", locale), 'W / D / L')}</th><th scope="col">{t(uiText("积分", locale), 'Pts')}</th></>}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.id} data-selected={row.id === selected?.id || undefined}>
            {hasStandings && <td className={styles.rank}><b>{rankLabel(row.standing?.display_rank)}</b>{row.standing?.tied && <small>{t(uiText("并列", locale), 'Tied')}</small>}</td>}
            <th scope="row"><button type="button" className={styles.teamButton} aria-pressed={row.id === selected?.id} onClick={() => chooseTeam(row.id)}><TeamLogo team={row.team} seasonId={seasonId} className={styles.logo} /><span><b>{weeklyTeamShort(row.team)}</b><small>{row.team?.name || row.team?.team_name}</small></span><span className={styles.rowArrow} aria-hidden="true">↗</span></button></th>
            {hasStandings && <><td>{weeklyScore(row.standing?.played)}</td><td className={styles.recordColumn}>{[row.standing?.wins, row.standing?.draws, row.standing?.losses].map(weeklyScore).join(' / ')}</td><td className={styles.points}>{weeklyScore(row.standing?.points)}</td></>}
          </tr>)}</tbody>
        </table> : <div className={styles.empty}><h3>{!model.totalTeams ? t(uiText("等待周期记录公布。", locale), 'Awaiting cycle records.') : followedOnly && !followedKey ? t(uiText("先关注一支想看的队伍。", locale), 'Start with a team to follow.') : t(uiText("没有符合条件的队伍。", locale), 'No matching teams.')}</h3><p>{!model.totalTeams ? t(uiText("已发布的积分与对阵会在这里呈现。", locale), 'Published standings and fixtures will appear here.') : t(uiText("可以调整搜索或重置筛选。", locale), 'Adjust your search or reset the filters.')}</p>{model.hasFilters && <button type="button" onClick={reset}>{t(uiText("重置筛选", locale), 'Reset filters')} ↺</button>}</div>}
        {!isPilot && <details className={styles.rankingNotes}><summary>{t(uiText("排名说明", locale), 'About these standings')} <span aria-hidden="true">＋</span></summary><div><p>{hasStandings ? t(uiText("名次与积分沿用公布榜单；同分保留并列，不另行拆分名次。", locale), 'Ranks and points follow the published table. Published ties stay tied.') : t(uiText("当前记录没有提供积分榜，先查看已发布的队伍比赛。", locale), 'These records do not include standings. Published team matches are available below.')}</p><p>{t(uiText("各队已赛场数可能不同。进行中的比分不直接加入公布积分。", locale), 'Teams may have played different numbers of matches. Live scores do not update these published totals.')}</p><p>{t(uiText("积分名次不等于入围名单，晋级资格以当期公示为准。", locale), 'A points rank is not a qualification decision. Entrants follow the current announcement.')}</p></div></details>}
      </div>

      <aside className={styles.journey} ref={journeyRef} aria-labelledby="weekly-team-title" data-selected-team={selected?.id}>
        <a className={styles.mobileStandingsReturn} href="#weekly-points">{isPilot ? t(uiText('返回队伍列表', locale), 'Back to team list') : t(uiText('返回积分榜选队', locale), 'Back to team standings')} <span aria-hidden="true">↑</span></a>
        {selected ? <>
          <div className={styles.journeyTop}><span>{t(uiText("这支队伍的周期", locale), 'THIS TEAM’S CYCLE')}</span><button type="button" className={styles.followTeam} aria-label={`${t('关注队伍', 'Follow team')} ${weeklyTeamShort(selected.team)}`} aria-pressed={isFollowing} onClick={() => toggleTeamFavorite(selected.id)}>{isFollowing ? '★' : '☆'}<span>{isFollowing ? t(uiText("已关注", locale), 'Following') : t(uiText("关注队伍", locale), 'Follow team')}</span></button></div>
          <div className={styles.teamIdentity}><TeamLogo team={selected.team} seasonId={seasonId} className={styles.heroLogo} /><div><h2 id="weekly-team-title">{weeklyTeamShort(selected.team)}</h2><p>{selected.team?.name || selected.team?.team_name}</p></div>{standing && <div className={styles.heroPoints}><strong>{weeklyScore(standing.points)}</strong><small>{t(uiText("周期积分", locale), 'Cycle points')}</small></div>}</div>
          {standing ? <div className={styles.teamStats}><div><span>{standing.tied ? t(uiText("并列名次", locale), 'Tied rank') : t(uiText("公布名次", locale), 'Published rank')}</span><b>{rank === '—' ? rank : rank.padStart(2, '0')}</b></div><div><span>{t(uiText("已赛", locale), 'Played')}</span><b>{weeklyScore(standing.played)}</b></div><div><span>{t(uiText("胜 / 平 / 负", locale), 'W / D / L')}</span><b className={styles.results}>{[standing.wins, standing.draws, standing.losses].map(weeklyScore).join(' / ')}</b></div></div> : <p className={styles.noPoints}>{isPilot ? t(uiText("本周期不计积分", locale), 'No standings points in this cycle') : t(uiText("暂无公布积分", locale), 'No published points yet')}</p>}
          <div className={styles.journeyHeading}><div><h3>{t(uiText("本周期比赛", locale), 'Matches in this cycle')}</h3><p>{t(uiText("比分以 {0} 在前", locale, [weeklyTeamShort(selected.team)]), `${weeklyTeamShort(selected.team)}’s score is shown first`)}</p></div><span>UTC+8</span></div>
          <ol className={styles.weeks}>{journey.map(({ week: item, fixtures }) => <li key={item.id}>
            <div className={styles.weekLabel}><b>{weeklyWeekTitle(item, locale)}</b><span>{weeklyStatusLabel(item.status, locale)}</span></div>
            {fixtures.length ? fixtures.map(({ match, opponent, score }) => {
              const schedule = formatMatchSchedule(match, { locale })
              const date = schedule.hasSchedule ? schedule.label.replace('TBD', t('时间待定', 'Time TBD')) : t('时间待定', 'Time TBD')
              const dateLabel = match.state === 'postponed' && schedule.hasSchedule ? t(`原定 ${date}`, `Was ${date}`) : date
              return <Link className={styles.fixture} key={match.id} to={withSeason(`/matches/${encodeURIComponent(match.id)}`)} {...returnProps} data-state={match.state} aria-label={`${weeklyWeekTitle(item, locale)} · ${weeklyTeamShort(selected.team)} ${score} ${weeklyTeamShort(opponent)} · ${weeklyStatusLabel(match.state, locale)}`}>
                <span className={styles.opponent}><TeamLogo team={opponent} seasonId={seasonId} className={styles.opponentLogo} /><b>{weeklyTeamShort(opponent)}</b></span><strong className={styles.fixtureScore}>{score}</strong><span className={styles.fixtureArrow} aria-hidden="true">↗</span>
                <span className={styles.fixtureDate}>{dateLabel}</span><span className={styles.matchState}>{weeklyStatusLabel(match.state, locale)}</span>
              </Link>
            }) : <p className={styles.noFixture}>{t(uiText("无公开对阵", locale), 'No public fixture')}</p>}
          </li>)}</ol>
          {!journey.length && <p className={styles.noFixture}>{t(uiText("暂无已发布周次。", locale), 'No published weeks yet.')}</p>}
          <Link className={styles.scheduleLink} to={withSeason(`/matches?cycle=${encodeURIComponent(cycle.id)}&week=all&teamId=${encodeURIComponent(selected.id)}`)}>{t(uiText("查看该队完整赛程", locale), 'View this team’s full schedule')} <span aria-hidden="true">↗</span></Link>
        </> : <div className={styles.journeyEmpty}><span>TEAM / JOURNEY</span><h2 id="weekly-team-title">{t(uiText("从一支队伍开始。", locale), 'Start with a team.')}</h2><p>{t(uiText("点选榜单中的名字，把每一周连起来。", locale), 'Select a team to follow their cycle, week by week.')}</p></div>}
      </aside>
    </section>

    <section className={styles.nextStages} aria-label={t(uiText("后续阶段", locale), 'Later stages')}>
      <article id="weekly-playoffs"><span className={styles.nextNumber}>02</span><div><p className={styles.eyebrow}>CYCLE PLAYOFFS</p><h2>{t(uiText("从积分榜，走进双败赛场。", locale), 'From cycle points to double elimination.')}</h2><p>{t(uiText("周期季后赛采用双败淘汰。入围名额、名单和对阵，以当期公示为准。", locale), 'Cycle playoffs use double elimination. Places, entrants and matchups follow the current announcement.')}</p><a href={officialWeekly} target="_blank" rel="noreferrer">{t(uiText("查看周赛赛制与公示入口", locale), 'Weekly format & announcement links')} ↗</a></div></article>
      <article id="weekly-major"><span className={styles.nextNumber}>03</span><div><p className={styles.eyebrow}>WEEKLY MAJOR</p><h2>{t(uiText("下一站，Weekly Major。", locale), 'Next stop. Weekly Major.')}</h2><p>{t(uiText("沿着周期赛事继续向前。Major 的参赛资格与举办日期，以当期公示为准。", locale), 'Continue beyond the cycle. Major eligibility and dates follow the current announcement.')}</p><a href={officialWeekly} target="_blank" rel="noreferrer">{t(uiText("了解 Weekly Major", locale), 'About Weekly Major')} ↗</a></div></article>
    </section>
  </div>
}

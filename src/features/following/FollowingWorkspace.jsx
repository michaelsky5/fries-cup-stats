import { translateUiText as uiText } from '../../lib/uiText.js'
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import CollapsibleFilterRail from '../account-ui/CollapsibleFilterRail.jsx'
import useFollowingFeed from './useFollowingFeed.js'
import FollowingLink from './FollowingLink.jsx'
import useFollowingReturnScroll from './useFollowingReturnScroll.js'
import { FOLLOWING_PAGE_SIZE, getFollowingView, updateFollowingSearch } from './followingViewModel.js'
import { getFollowingTeamSummaries } from './followingTeamSummary.js'
import styles from './FollowingWorkspace.module.css'
import FollowingBriefing from './FollowingBriefing.jsx'
import useFollowingObservation from './useFollowingObservation.js'
import FollowingDiscovery from './FollowingDiscovery.jsx'
import { getSubjectOutlook } from './followingObservationModel.js'
import { WeeklyCyclePicker } from '../weekly-overview/WeeklyNavigation.jsx'
import sectionStyles from '../../components/navigation/SignalSectionNav.module.css'
import { followingMatchPath, followingScore } from './followingMatchPresentation.js'
import FollowingMapProgress from './FollowingMapProgress.jsx'
import FollowingPlayerPortrait from './FollowingPlayerPortrait.jsx'

const copyFor = locale => locale === 'en-US' ? {
  title: 'My Following', intro: 'Your teams, players and the matches that connect them.', manage: 'Manage following', manageShort: 'Manage', players: 'Players', teams: 'Teams',
  all: 'All', live: 'Live', review: 'Under review', postponed: 'Postponed', upcoming: 'Upcoming', results: 'Recent results', finished: 'Finished', pending: 'Schedule updates', cancelled: 'Cancelled',
  archive: 'Followed match records', activity: 'Matches to follow', archiveIntro: 'Final results and recorded appearances from this season.', activityIntro: 'Live matches first, followed by upcoming games and recent results.',
  local: 'Saved in this browser', ready: 'Synced to your account', saving: 'Syncing following…', loading: 'Loading account following…', error: 'Cloud sync unavailable. Check your connection and try again.',
  login: 'Sign in', guest: 'Follow without signing in.', emptyTitle: 'Build your own match list', emptyText: 'Choose teams or players to bring their matches here.', addTeams: 'Choose teams', addPlayers: 'Choose players',
  noMatches: 'No matches in this view', noMatchesText: 'Player results appear when official match records are available. Upcoming matches follow their current team.',
  more: 'Show more', profile: 'View profile', primary: 'Primary team', final: 'Final placement', noRank: 'Final placement not published',
  teamReason: 'Following', playerReason: 'Team schedule', appearance: 'Recorded appearance', details: 'Match details', scorePending: 'Score unavailable', tbd: 'Time TBD',
  digest: 'From your following', viewAll: 'View all following', noTeams: 'No teams followed yet.', noPlayers: 'No players followed yet.',
  subject: 'Following', allSubjects: 'All following', showMatches: 'View related matches', advancement: 'Qualification picture', finalTable: 'Final standings',
  unavailable: 'This follow is unavailable', unavailableText: 'It may have been removed or belong to another season. Choose from your current following.', reset: 'View all following',
  matchCount: count => `${count} related ${count === 1 ? 'match' : 'matches'}`, shown: count => `${count} shown`,
  loadingData: 'Loading season records…', publicTime: 'Times shown in Beijing time', related: 'View team profile', changeTeams: 'Manage teams', changePlayers: 'Manage players', roles: { TANK: 'Tank', DPS: 'Damage', SUP: 'Support', SUPPORT: 'Support', FLEX: 'Flex' }, noRole: 'Role not listed'
} : {
  title: uiText("我的关注", locale), intro: uiText("关注队伍与选手，把相关比赛放在一起。", locale), manage: uiText("管理关注", locale), manageShort: uiText("管理", locale), players: uiText("选手", locale), teams: uiText("队伍", locale),
  all: uiText("全部", locale), live: uiText("正在进行", locale), review: uiText("待审核", locale), postponed: uiText("已延期", locale), upcoming: uiText("待赛", locale), results: uiText("最近赛果", locale), finished: uiText("已结束", locale), pending: uiText("赛程待更新", locale), cancelled: uiText("已取消", locale),
  archive: uiText("关注比赛记录", locale), activity: uiText("关注比赛", locale), archiveIntro: uiText("回看本赛季的最终成绩与正式出场记录。", locale), activityIntro: uiText("优先看进行中的比赛，再查看接下来的赛程与最近赛果。", locale),
  local: uiText("保存在此浏览器", locale), ready: uiText("已同步至账号", locale), saving: uiText("正在同步关注…", locale), loading: uiText("正在读取账号关注…", locale), error: uiText("云同步暂不可用，请检查连接后重试。", locale),
  login: uiText("登录账号", locale), guest: uiText("无需登录即可使用关注。", locale), emptyTitle: uiText("从你关心的队伍或选手开始", locale), emptyText: uiText("选择关注后，相关赛程和赛果会汇集在这里。", locale), addTeams: uiText("选择队伍", locale), addPlayers: uiText("选择选手", locale),
  noMatches: uiText("当前分类暂无相关比赛", locale), noMatchesText: uiText("选手赛果在正式出场记录公布后显示；未来赛程按当前所属队伍关联。", locale),
  more: uiText("显示更多比赛", locale), profile: uiText("查看资料", locale), primary: uiText("主关注", locale), final: uiText("最终名次", locale), noRank: uiText("最终名次未发布", locale),
  teamReason: uiText("关注队伍", locale), playerReason: uiText("所属队伍赛程", locale), appearance: uiText("出场记录", locale), details: uiText("比赛详情", locale), scorePending: uiText("比分未公布", locale), tbd: uiText("时间待定", locale),
  digest: uiText("关注动态", locale), viewAll: uiText("查看全部关注", locale), noTeams: uiText("还没有关注队伍。", locale), noPlayers: uiText("还没有关注选手。", locale),
  subject: uiText("关注对象", locale), allSubjects: uiText("全部关注", locale), showMatches: uiText("查看相关比赛", locale), advancement: uiText("晋级形势", locale), finalTable: uiText("最终排名", locale),
  unavailable: uiText("这个关注对象当前不可用", locale), unavailableText: uiText("可能已取消关注，或不属于当前赛季。请选择当前列表中的队伍或选手。", locale), reset: uiText("查看全部关注", locale),
  matchCount: count => `${count} 场相关比赛`, shown: count => `已显示 ${count} 场`,
  loadingData: uiText("正在载入赛事记录…", locale), publicTime: uiText("时间均为北京时间", locale), related: uiText("查看队伍资料", locale), changeTeams: uiText("管理队伍", locale), changePlayers: uiText("管理选手", locale), roles: { TANK: uiText("重装", locale), DPS: uiText("输出", locale), SUP: uiText("支援", locale), SUPPORT: uiText("支援", locale), FLEX: uiText("多职责", locale) }, noRole: uiText("职责未标注", locale)
}

function MatchRow({ item, seasonId, withSeason, copy, sourceSection, locale }) {
  return <FollowingLink className={styles.matchRow} data-state={item.group} sourceSection={sourceSection} to={withSeason(followingMatchPath(item))}>
    <div className={styles.matchWhen}><span className={styles.state}>{item.presentation?.label || copy[item.group === 'results' ? 'finished' : item.group]}</span><time dateTime={item.schedule.hasSchedule ? item.scheduledAt : undefined}>{item.group === 'postponed' && item.schedule.hasSchedule ? locale === 'en-US' ? 'Originally ' : uiText("原定 ", locale) : ''}{item.schedule.hasSchedule ? item.schedule.compact : copy.tbd}</time></div>
    <div className={styles.duel}><span><TeamLogo team={item.teamA} seasonId={seasonId} className={styles.logo} /><strong>{item.teamA.short}</strong></span><div className={styles.scoreBlock}><small>{item.presentation?.scoreLabel}</small><b className={styles.score}>{followingScore(item)}</b></div><span><TeamLogo team={item.teamB} seasonId={seasonId} className={styles.logo} /><strong>{item.teamB.short}</strong></span></div>
    <div className={styles.matchDetail}><span>{item.stage}</span><FollowingMapProgress item={item} locale={locale} compact /><div className={styles.relations}>{item.relations.map(reason => <small key={`${reason.type}:${reason.id}`}>{reason.name} · {reason.type === 'team' ? copy.teamReason : reason.type === 'appearance' ? copy.appearance : copy.playerReason}</small>)}</div></div>
    <span className={styles.matchArrow} aria-label={copy.details}>↗</span>
  </FollowingLink>
}

function EmptyFollowing({ copy, onManageTeams, onManagePlayers, compact = false, headingTag = 'h3' }) {
  const Heading = headingTag
  return <div className={styles.empty} data-compact={compact}><span className={styles.emptyMark} aria-hidden="true">＋</span><div><Heading>{copy.emptyTitle}</Heading><p>{copy.emptyText}</p></div><div className={styles.actions}><button type="button" className={styles.primary} onClick={onManageTeams}>{copy.addTeams}</button><button type="button" onClick={onManagePlayers}>{copy.addPlayers}</button></div></div>
}

export function FollowingDigest({ db, favorites, season, locale = 'zh-CN', withSeason, onManageTeams, onManagePlayers, scopeLabel = '' }) {
  const feed = useFollowingFeed(db, favorites, season, locale)
  useFollowingReturnScroll(feed.loaded)
  const copy = copyFor(locale)
  const candidates = [...feed.groups.live.slice(0, 1), ...feed.groups.review.slice(0, 1), ...feed.groups.upcoming.slice(0, 1), ...(!feed.archived ? [...feed.groups.postponed, ...feed.groups.pending, ...feed.groups.cancelled].slice(0, 1) : []), ...feed.matches]
  const entries = [...new Map(candidates.map(item => [item.id, item])).values()].slice(0, 3)
  return <section className={styles.digest} data-i18n-ignore aria-label={copy.digest}>
    <header className={styles.sectionHeader}><div><span className={styles.eyebrow}>MY FOLLOWING</span><h2>{copy.digest}</h2>{scopeLabel ? <p>{scopeLabel}</p> : null}<p>{feed.archived ? copy.archiveIntro : copy.activityIntro}</p></div><Link className={styles.textLink} to={withSeason('/me?section=following')}>{copy.viewAll} ↗</Link></header>
    {!feed.loaded ? <p className={styles.notice}>{copy.loadingData}</p> : !feed.hasFavorites ? <EmptyFollowing copy={copy} onManageTeams={onManageTeams} onManagePlayers={onManagePlayers} compact />
      : entries.length ? <div className={styles.matchList}>{entries.map(item => <MatchRow key={item.id} item={item} seasonId={season?.id} withSeason={withSeason} copy={copy} sourceSection="overview" locale={locale} />)}</div>
        : <p className={styles.notice}>{copy.noMatches} · {copy.noMatchesText}</p>}
  </section>
}

export default function FollowingWorkspace({ db, favorites, favoriteLimits = { teams: 5, players: 12 }, season, locale = 'zh-CN', withSeason, onManageTeams, onManagePlayers, isAuthenticated = false, syncStatus = 'local', syncError = '', standalone = false, accountId = 'guest', onSave, excludedFavorites }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const feed = useFollowingFeed(db, favorites, season, locale, searchParams.get('cycle'))
  const observation = useFollowingObservation(feed, { db, seasonId: season?.id, accountId })
  useFollowingReturnScroll(feed.loaded)
  const copy = copyFor(locale)
  const location = useLocation()
  const subjectId = useId()
  const discoveryId = useId()
  const collectionId = useId()
  const feedRef = useRef(null)
  const briefingRef = useRef(null)
  const pendingFocus = useRef(null)
  const [discoveryOpen, setDiscoveryOpen] = useState(false)
  const view = useMemo(() => getFollowingView(feed, searchParams), [feed, searchParams])
  const matchesView = searchParams.get('followView') === 'matches' || Boolean(view.subjectKey) || view.state !== 'all'
  const cycleId = feed.weekly?.cycle?.id
  const teamSummaries = useMemo(() => getFollowingTeamSummaries(db, season, feed.teams, locale, cycleId), [db, season, feed.teams, locale, cycleId])
  const Title = standalone ? 'h1' : 'h2'
  const SectionTitle = 'h2'
  const changeView = patch => setSearchParams(updateFollowingSearch(searchParams, patch), { replace: true, preventScrollReset: true, flushSync: true, state: { ...location.state, restoreScrollY: undefined } })
  const showSubject = subjectKey => {
    pendingFocus.current = 'matches'
    changeView({ subjectKey, state: 'all', view: 'matches' })
  }
  const syncLabel = syncError || syncStatus === 'error' ? copy.error : copy[syncStatus] || copy.local
  const syncFailed = Boolean(syncError || syncStatus === 'error')
  const discoveryVisible = discoveryOpen || (!feed.hasFavorites && !view.subjectKey)
  useLayoutEffect(() => {
    const requested = pendingFocus.current
    if (!requested || (requested === 'matches') !== matchesView || discoveryVisible) return
    const target = requested === 'matches' ? feedRef.current : briefingRef.current
    if (!target) return
    pendingFocus.current = null
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [location.key, matchesView, discoveryVisible])
  const storage = <div className={styles.storage} data-error={Boolean(syncError || syncStatus === 'error')}><span role={syncError || syncStatus === 'error' ? 'alert' : 'status'}><i aria-hidden="true" />{syncLabel}</span>{!isAuthenticated ? <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('fries-cup:open-account'))}>{copy.login} ↗</button> : null}</div>
  return <section className={styles.workspace} data-embedded={!standalone} data-i18n-ignore aria-label={copy.title}>
    <header className={styles.pageHeader}>
      {standalone ? <div><span className={styles.eyebrow}>MY FOLLOWING</span><Title>{copy.title}</Title><p>{copy.intro}</p></div> : null}
      <div className={styles.headerActions}>
        <div className={styles.followingSummary}><span><b>{feed.teams.length}</b><span className={styles.quota}> / {favoriteLimits.teams}</span> {locale === 'en-US' && feed.teams.length === 1 ? 'Team' : copy.teams} · <b>{feed.players.length}</b><span className={styles.quota}> / {favoriteLimits.players}</span> {locale === 'en-US' && feed.players.length === 1 ? 'Player' : copy.players}</span><div className={styles.desktopStorage}>{storage}</div></div>
        <div className={styles.manageActions} data-has-following={feed.hasFavorites}>
          {feed.hasFavorites && <button type="button" className={styles.discoverButton} aria-label={locale === 'en-US' ? 'Find following' : uiText("发现关注", locale)} aria-expanded={discoveryVisible} aria-controls={discoveryId} onClick={() => setDiscoveryOpen(value => !value)}><span className={styles.manageLabel}>{locale === 'en-US' ? 'Find following' : uiText("发现关注", locale)}</span><span className={styles.manageShort}>{locale === 'en-US' ? 'Add' : uiText("添加", locale)}</span> ＋</button>}
          <button type="button" aria-label={copy.manage} onClick={onManageTeams}><span className={styles.manageLabel}>{copy.manage}</span><span className={styles.manageShort}>{copy.manageShort}</span><span aria-hidden="true"> ↗</span></button>
        </div>
      </div>
    </header>
    {syncFailed && <div className={styles.mobileStorage}>{storage}</div>}
    {!feed.loaded ? <p className={styles.notice}>{copy.loadingData}</p> : <>
      {feed.weekly && <div className={styles.cycleContext}>
        <WeeklyCyclePicker cycles={feed.weekly.cycles} cycle={feed.weekly.cycle} locale={locale} onChange={cycleId => changeView({ cycleId })} />
        <p>{locale === 'en-US' ? 'Published matches across this cycle. Following stays with the season.' : uiText("汇集本周期已公布比赛，关注名单按赛季保留。", locale)}</p>
      </div>}
      <div id={discoveryId} hidden={!discoveryVisible} className={styles.discoveryPanel}>{discoveryVisible && <FollowingDiscovery db={db} favorites={favorites} excludedFavorites={excludedFavorites} seasonId={season?.id} locale={locale} withSeason={withSeason} onSave={onSave} onInteract={() => setDiscoveryOpen(true)} onClose={() => { pendingFocus.current = matchesView ? 'matches' : 'overview'; setDiscoveryOpen(false) }} hasFavorites={feed.hasFavorites} />}</div>
      {(feed.hasFavorites || view.subjectKey) ? <>
      <nav className={`${styles.viewSwitch} ${sectionStyles.root}`} aria-label={locale === 'en-US' ? 'Following views' : uiText("关注视图", locale)}><button type="button" className={sectionStyles.item} aria-pressed={!matchesView} onClick={() => changeView({ view: 'overview', subjectKey: '', state: 'all' })}>{locale === 'en-US' ? 'Latest & collections' : uiText("近况与关注对象", locale)}</button><button type="button" className={sectionStyles.item} aria-pressed={matchesView} onClick={() => changeView({ view: 'matches' })}>{locale === 'en-US' ? 'All linked matches' : uiText("全部关联比赛", locale)} <span>{feed.matches.length}</span></button></nav>
      {feed.hasFavorites && !matchesView && <FollowingBriefing focusRef={briefingRef} feed={feed} observation={observation} locale={locale} withSeason={withSeason} seasonId={season?.id} />}
      <section hidden={!matchesView} className={styles.feed} ref={feedRef} tabIndex={-1} aria-label={copy.activity}>
        <header className={styles.sectionHeader}><div><span className={styles.eyebrow}>{feed.archived ? 'SEASON RECAP' : 'FOLLOWING MATCHES'}</span><SectionTitle>{feed.archived ? copy.archive : copy.activity}</SectionTitle></div><small>{copy.publicTime}</small></header>
        <div className={styles.filterRail}>
        <CollapsibleFilterRail inline locale={locale} activeCount={Number(Boolean(view.subjectKey)) + Number(view.state !== 'all')} resultLabel={`${copy.matchCount(view.entries.length)} · ${copy.shown(Math.min(view.limit, view.entries.length))}`} onReset={() => changeView({ subjectKey: '', state: 'all' })}>
        <div className={styles.subjectBar}>
          <div className={styles.subjectField}><label htmlFor={subjectId}>{copy.subject}</label><select id={subjectId} value={view.subjectKey} onChange={event => changeView({ subjectKey: event.target.value, state: 'all' })}>
            <option value="">{copy.allSubjects}</option>
            {view.missingSubject ? <option value={view.subjectKey} disabled>{copy.unavailable}</option> : null}
            {['team', 'player'].map(type => view.subjects.some(subject => subject.type === type) ? <optgroup key={type} label={type === 'team' ? copy.teams : copy.players}>{view.subjects.filter(subject => subject.type === type).map(subject => <option key={subject.key} value={subject.key}>{subject.name}</option>)}</optgroup> : null)}
          </select></div>
        </div>
        {(!feed.archived || view.filters.length > 2 || view.state !== 'all') && !view.missingSubject ? <div className={styles.filters} role="group" aria-label={copy.activity}>{view.filters.map(id => <button type="button" key={id} aria-pressed={view.state === id} onClick={() => changeView({ state: id })}>{copy[id]}<span>{view.counts[id]}</span></button>)}</div> : null}
        </CollapsibleFilterRail>
        </div>
        {view.missingSubject ? <div className={styles.notice}><strong>{copy.unavailable}</strong><p>{copy.unavailableText}</p><button type="button" className={styles.reset} onClick={() => changeView({ subjectKey: '', state: 'all' })}>{copy.reset} →</button></div>
          : view.entries.length ? <div className={styles.matchList}>{view.entries.slice(0, view.limit).map(item => <MatchRow key={item.id} item={item} seasonId={season?.id} withSeason={withSeason} copy={copy} locale={locale} />)}</div> : <div className={styles.notice}><strong>{copy.noMatches}</strong><p>{copy.noMatchesText}</p></div>}
        {view.entries.length > view.limit ? <button type="button" className={styles.more} onClick={() => changeView({ limit: Math.min(view.limit + FOLLOWING_PAGE_SIZE, view.entries.length) })}>{copy.more} <span>{Math.min(view.limit, view.entries.length)} / {view.entries.length}</span> ↓</button> : null}
      </section>
      <div hidden={matchesView} className={styles.collections} data-collection={view.collection} data-only={!feed.players.length ? 'teams' : !feed.teams.length ? 'players' : undefined}>
        <div className={styles.collectionSwitch} role="group" aria-label={locale === 'en-US' ? 'Followed profiles' : uiText("关注对象", locale)}>{['teams', 'players'].map(type => <button key={type} type="button" aria-pressed={view.collection === type} aria-controls={`${collectionId}-${type}`} onClick={() => changeView({ collection: type })}>{copy[type]} <span>{feed[type].length}</span></button>)}</div>
        <section id={`${collectionId}-teams`} className={styles.teamCollection}><header className={styles.collectionHeader}><SectionTitle>{copy.teams} <span>{feed.teams.length}</span></SectionTitle><button type="button" onClick={onManageTeams}>{copy.changeTeams} ↗</button></header>
          {feed.teams.length ? <div className={styles.directory}>{feed.teams.map(team => {
            const summary = teamSummaries.get(team.id)
            return <article className={styles.directoryCard} key={team.id} data-selected={view.subjectKey === `team:${team.id}`}>
              <FollowingLink className={styles.directoryRow} to={withSeason(`/teams/${encodeURIComponent(team.routeId)}`)}><TeamLogo team={team} seasonId={season?.id} className={styles.teamLogo} /><div><strong>{team.short}{team.primary ? <small className={styles.primaryTag}>{copy.primary}</small> : null}</strong><span>{team.full}</span></div><b aria-label={copy.profile}>↗</b></FollowingLink>
              {summary ? <div className={styles.teamStanding} data-tone={summary.tone} data-weekly={summary.weekly}><span>{summary.heading}</span><strong>{summary.label}</strong><small>{summary.zone}</small></div> : null}
              <SubjectOutlook feed={feed} type="team" id={team.id} locale={locale} />
            <div className={styles.directoryActions}><button type="button" aria-label={`${team.short} · ${copy.showMatches}`} onClick={() => showSubject(`team:${team.id}`)}>{copy.showMatches} ↑</button>{summary ? <FollowingLink to={withSeason(summary.advanceHref)}>{summary.advanceLabel || (summary.isArchived ? copy.finalTable : copy.advancement)} ↗</FollowingLink> : null}</div>
            </article>
          })}</div> : <p className={styles.notice}>{copy.noTeams}</p>}
        </section>
        <section id={`${collectionId}-players`} className={styles.playerCollection}><header className={styles.collectionHeader}><SectionTitle>{copy.players} <span>{feed.players.length}</span></SectionTitle><button type="button" onClick={onManagePlayers}>{copy.changePlayers} ↗</button></header>
          {feed.players.length ? <div className={styles.directory}>{feed.players.map(player => <article className={styles.directoryCard} key={player.id} data-selected={view.subjectKey === `player:${player.id}`}>
            <FollowingLink className={styles.directoryRow} to={withSeason(`/players/${encodeURIComponent(player.id)}`)}><FollowingPlayerPortrait player={player.player} db={db} locale={locale} className={styles.playerMark} /><div><strong>{player.name}</strong><span>{player.team ? getTeamLabel(player.team) : '—'} · {locale === 'en-US' ? 'Registered: ' : uiText('登记职责：', locale)}{copy.roles[String(player.role).toUpperCase()] || player.role || copy.noRole}</span><small>{copy.profile}</small></div><b aria-hidden="true">↗</b></FollowingLink>
            <SubjectOutlook feed={feed} type="player" id={player.id} locale={locale} />
            <div className={styles.directoryActions}><button type="button" aria-label={`${player.name} · ${copy.showMatches}`} onClick={() => showSubject(`player:${player.id}`)}>{copy.showMatches} ↑</button></div>
          </article>)}</div> : <p className={styles.notice}>{copy.noPlayers}</p>}
        </section>
      </div>
      </> : null}
    </>}
    {!syncFailed && <footer className={styles.mobileStorage}>{storage}</footer>}
  </section>
}

function getTeamLabel(team) { return team.team_short_name || team.short || team.team_name || team.name || '—' }

function SubjectOutlook({ feed, type, id, locale }) {
  const { next, latest, attention } = getSubjectOutlook(feed, type, id)
  const item = next || latest || attention[0]
  const en = locale === 'en-US'
  if (!item) return <p className={styles.subjectOutlook}>{en ? 'No linked match records yet.' : uiText("暂无关联比赛记录。", locale)}</p>
  if (type === 'team') {
    const count = feed.matches.filter(match => match.relations.some(reason => reason.type === 'team' && reason.id === id)).length
    return <p className={styles.subjectOutlook}>{en ? `${count} linked match records this ${feed.weekly ? 'cycle' : 'season'}` : uiText("本{0} {1} 场关联比赛", locale, [feed.weekly ? '周期' : '赛季', count])}</p>
  }
  const label = next ? item.group === 'live' ? en ? 'Live now' : uiText("正在比赛", locale) : item.group === 'review' ? en ? 'Under review' : uiText("结果待审核", locale) : en ? 'Next match' : uiText("下一场", locale)
    : latest ? type === 'player' ? en ? 'Latest recorded appearance' : uiText("最近正式出场", locale) : en ? 'Latest result' : uiText("最近赛果", locale)
      : item.presentation?.label || (item.group === 'cancelled' ? en ? 'Match cancelled' : uiText("比赛已取消", locale) : en ? 'Schedule or record pending' : uiText("赛程或记录待补充", locale))
  return <div className={styles.subjectOutlook}><span>{label}</span><strong>{item.teamA.short} {latest && !next ? item.scoreA != null && item.scoreB != null ? item.scoreA + ' : ' + item.scoreB : '—' : 'vs'} {item.teamB.short}</strong><small>{item.schedule.hasSchedule ? item.schedule.compact : en ? 'Time not published' : uiText("时间未公布", locale)}</small></div>
}

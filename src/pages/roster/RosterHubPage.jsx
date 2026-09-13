import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigationType, useOutletContext, useSearchParams } from 'react-router-dom'
import RosterSubnav from '../../components/roster/RosterSubnav.jsx'
import ImeSafeInput from '../../components/common/ImeSafeInput.jsx'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import { DirectoryLink } from '../../features/roster-directory/RosterDirectory.jsx'
import { buildRosterOverview, searchRosterOverview, staffOverviewHref } from '../../features/roster-overview/rosterOverviewModel.js'
import { getTeamLogoCandidates, getDefaultTeamLogoCandidates } from '../../lib/teamLogoResolver.js'
import { getStaffAvatar } from '../../lib/reviewAssets.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getRosterChangeLabel } from '../../lib/rosterStage.js'
import { getLocationPath, getRestoreScrollY, getSavedReturnScroll, restoreWindowScroll } from '../../lib/navigationState.js'
import indexStyles from '../../features/roster-index/RosterIndex.module.css'
import styles from './RosterHubPage.module.css'

const roleNames = { TANK: ['重装', 'Tank'], DPS: ['输出', 'Damage'], SUP: ['支援', 'Support'], FLEX: ['其他', 'Other'] }
const groupNames = { teams: ['参赛战队', 'Teams'], players: ['参赛选手', 'Players'], teamStaff: ['战队职员', 'Team staff'], eventStaff: ['赛事职员', 'Event staff'] }
const roleLabel = (role, en) => roleNames[role]?.[en ? 1 : 0] || (en ? 'Other' : '其他')
const memberKey = member => member.identity.playerId || `${member.role}:${member.identity.primary}`

function scrollCompactPreview(ref) {
  if (!window.matchMedia('(max-width: 760px)').matches) return
  requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }))
}

function TeamMark({ team, seasonId }) {
  const defaults = getDefaultTeamLogoCandidates(seasonId, team)
  const sources = getTeamLogoCandidates(team, seasonId).filter(src => !defaults.includes(src))
  const [index, setIndex] = useState(0)
  return <span className={styles.teamMark} aria-hidden="true">{sources[index] ? <img src={sources[index]} alt="" loading="lazy" onError={() => setIndex(value => value + 1)} /> : <b>{team.shortName.slice(0, 3)}</b>}</span>
}

function StaffMark({ name, large = false }) {
  const src = getStaffAvatar(name, { knownOnly: true })
  const [failed, setFailed] = useState(false)
  return <span className={styles.staffMark} data-large={large || undefined} aria-hidden="true">{src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <b>{Array.from(name).slice(0, 2).join('')}</b>}</span>
}

function OverviewSearch({ model, value, onChange, withSeason, en }) {
  const uiLocale = useUiLocale()
  const resultsId = useId()
  const fieldRef = useRef(null)
  const [placement, setPlacement] = useState({ above: false, height: 440 })
  const hasQuery = Boolean(value.trim())
  const groups = useMemo(() => searchRosterOverview(model, value), [model, value])
  const count = groups.reduce((total, group) => total + group.total, 0)
  useEffect(() => {
    if (!hasQuery) return
    const measure = () => {
      const rect = fieldRef.current?.getBoundingClientRect()
      if (!rect) return
      const aboveSpace = rect.top - 144
      const belowSpace = window.innerHeight - rect.bottom - 16
      const above = aboveSpace > belowSpace
      const height = Math.min(440, Math.max(96, above ? aboveSpace : belowSpace))
      setPlacement(previous => previous.above === above && previous.height === height ? previous : { above, height })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [hasQuery])
  return <div className={styles.searchArea} data-overview-search>
    <label ref={fieldRef} className={styles.search}><span>{en ? 'Find a team or a name' : uiText("查找队伍或名字", uiLocale)}</span><ImeSafeInput type="search" value={value} onValueChange={onChange} onKeyDown={event => { if (event.key === 'Escape') onChange('') }} placeholder={en ? 'Team, player, manager, coach, official, caster…' : uiText("队伍、选手、经理、教练、赛管、解说…", uiLocale)} aria-controls={value.trim() ? resultsId : undefined} /><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg></label>
    {value.trim() ? <div id={resultsId} className={styles.searchResults} data-placement={placement.above ? 'above' : 'below'} style={{ '--search-height': placement.height + 'px' }}>
      <div className={styles.searchStatus}><span role="status">{count ? count + (en ? ' matching records' : uiText(" 条匹配记录", uiLocale)) : en ? 'No matching records' : uiText("没有找到匹配记录", uiLocale)}</span><button type="button" onClick={() => onChange('')}>{en ? 'Clear' : uiText("清除", uiLocale)}</button></div>
      {groups.length ? groups.map(group => <section key={group.id} aria-label={groupNames[group.id][en ? 1 : 0]}><h2>{groupNames[group.id][en ? 1 : 0]} <span>{group.total}</span></h2><ul>{group.items.map(item => <li key={item.id}><DirectoryLink to={withSeason(item.href)}><strong>{item.name}</strong><small>{item.detail === 'admin' ? en ? 'Official' : uiText("赛管", uiLocale) : item.detail === 'caster' ? en ? 'Caster' : uiText("解说", uiLocale) : item.detail}</small><span aria-hidden="true">↗</span></DirectoryLink></li>)}</ul>{group.total > group.items.length ? <DirectoryLink to={withSeason(group.href)} className={styles.moreResults}>{en ? 'View all ' + group.total + ' results' : '查看全部 ' + group.total + ' 条结果'} ↗</DirectoryLink> : null}</section>) : <p>{en ? 'Try a nickname, BattleTag or team abbreviation.' : uiText("试试昵称、BattleTag 或队伍简称。", uiLocale)}</p>}
    </div> : null}
  </div>
}

function SelectedTeam({ team, seasonId, withSeason, locale, panelRef }) {
  const en = locale === 'en-US'
  const [previewKey, setPreviewKey] = useState('')
  if (!team) return <div className={styles.teamEmpty}>{en ? 'Team rosters have not been published yet.' : uiText("本届队伍名单尚未发布。", locale)}</div>
  const hero = team.members.find(member => memberKey(member) === previewKey) || team.heroMember || team.members[0] || null
  return <article ref={panelRef} className={styles.selectedTeam} data-overview-team={team.routeId} aria-label={(en ? 'Selected team ' : uiText("当前队伍 ", locale)) + team.shortName}>
    <div className={styles.teamCopy}>
      <header className={styles.teamIdentity}><TeamMark key={seasonId + team.routeId} team={team} seasonId={seasonId} /><div><span>{en ? 'SEASON PLAYER ARCHIVE' : uiText("全季选手名录", locale)}</span><h2>{team.shortName}</h2><p>{team.fullName}</p></div><DirectoryLink to={withSeason('/teams/' + encodeURIComponent(team.routeId))} label={(en ? 'Open team archive ' : uiText("查看队伍档案 ", locale)) + team.shortName}>↗</DirectoryLink></header>
      {team.playoffJoins || team.playoffExits ? <p className={styles.rosterHistory}>
        {team.openingRosterSize !== null ? (en ? 'Opening roster: ' + team.openingRosterSize : '初始报名 ' + team.openingRosterSize + ' 人') + ' · ' : ''}
        {en ? team.rosterSize + ' players across the season' : '全季收录 ' + team.rosterSize + ' 人'}
      </p> : null}
      <ul className={styles.members}>{team.members.map((member, index) => {
        const changeLabel = getRosterChangeLabel(member.rosterChange, locale)
        const memberContent = <><strong>{member.identity.primary}</strong><span className={styles.memberMeta}>
          <span className={styles.memberRole}>{roleLabel(member.role, en)}</span>
          {changeLabel ? <small className={styles.changeNote}>{changeLabel}</small> : null}
        </span></>
        return <li key={member.identity.playerId || index} data-roster-change={member.rosterChange || undefined} data-hero-active={hero === member || undefined}
          onPointerEnter={event => { if (event.pointerType === 'mouse' || event.pointerType === 'pen') setPreviewKey(memberKey(member)) }}
          onFocus={() => setPreviewKey(memberKey(member))}>
          {member.href ? <DirectoryLink className={styles.memberEntry} to={withSeason(member.href)} label={(en ? 'Open player archive ' : uiText("查看选手档案 ", locale)) + member.identity.primary + (changeLabel ? ' · ' + changeLabel : '')}>{memberContent}</DirectoryLink> : <span className={styles.memberEntry}>{memberContent}</span>}
        </li>
      })}</ul>
      {team.members.length < team.rosterSize ? <p className={styles.rosterNotice}>{en ? team.members.length + ' of ' + team.rosterSize + ' archived player records available.' : '已提供 ' + team.members.length + ' / ' + team.rosterSize + ' 位赛季收录选手的资料。'}</p> : !team.members.length ? <p className={styles.rosterNotice}>{en ? 'Player names not published yet.' : uiText("选手名单尚未发布。", locale)}</p> : null}
      <div className={styles.teamStaff}>{['manager', 'coach'].map(role => { const records = team.staffRecords.filter(staff => staff.roles.includes(role)); return <div key={role}><span>{role === 'manager' ? en ? 'Manager' : uiText("经理", locale) : en ? 'Coach' : uiText("教练", locale)}</span><p>{records.length ? records.map(staff => <DirectoryLink key={staff.id} to={withSeason(staffOverviewHref(staff))}>{staff.name}</DirectoryLink>) : en ? 'Not registered' : uiText("未登记", locale)}</p></div> })}</div>
    </div>
    {hero ? <figure className={styles.heroFigure} data-overview-hero={memberKey(hero)} data-hero-missing={!hero.hero || undefined}>
      <div key={memberKey(hero) + ':' + hero.hero} className={styles.heroVisual}>
        {hero.hero ? <HeroArtwork hero={hero.hero} variant="spotlight" decorative className={styles.heroArt} locale={locale} /> : <div className={styles.heroEmptyMark}><TeamMark team={team} seasonId={seasonId} /></div>}
      </div>
      <figcaption key={memberKey(hero)} className={styles.heroCaption}>
        <span className={styles.heroEyebrow}>{en ? 'PLAYER SPOTLIGHT' : uiText("选手与常用英雄", locale)}</span>
        <strong>{hero.identity.primary}</strong>
        <span className={styles.heroLabel}>{hero.hero ? formatOwHeroName(hero.hero, locale) : en ? 'No hero record available' : uiText("暂未收录英雄记录", locale)}</span>
        <small>{en ? 'Explore names to preview' : uiText("浏览姓名，切换展示", locale)}</small>
      </figcaption>
    </figure> : <div className={styles.emblemEcho} aria-hidden="true"><TeamMark key={seasonId + team.routeId} team={team} seasonId={seasonId} /></div>}
  </article>
}

function CreditSection({ model, role, selectedKey, onChangeRole, onSelect, seasonId, withSeason, en }) {
  const uiLocale = useUiLocale()
  const previewRef = useRef(null)
  const pendingScroll = useRef(false)
  const namesRef = useRef(null)
  const entries = model.credits[role]
  const selected = entries.find(entry => entry.key === selectedKey) || entries[0]
  useEffect(() => {
    if (pendingScroll.current) {
      pendingScroll.current = false
      scrollCompactPreview(previewRef)
    }
    const list = namesRef.current
    const row = list?.querySelector('[aria-pressed="true"]')
    if (!row || list.scrollHeight <= list.clientHeight) return
    const rowRect = row.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()
    if (rowRect.top < listRect.top) list.scrollTop += rowRect.top - listRect.top
    else if (rowRect.bottom > listRect.bottom) list.scrollTop += rowRect.bottom - listRect.bottom
  }, [selected?.key])
  const pickCredit = key => {
    if (key === selected?.key) scrollCompactPreview(previewRef)
    else pendingScroll.current = true
    onSelect(key)
  }
  return <section className={styles.creditsSection} aria-labelledby="roster-credits-heading" data-overview-credits>
    <header className={styles.sectionHeading}><div><span>BEHIND THE MATCH</span><h2 id="roster-credits-heading">{en ? 'The names behind the match.' : uiText("让比赛发生的人。", uiLocale)}</h2></div><p>{en ? 'Meet the officials and casters through their published match credits.' : uiText("从一场比赛，认识参与其中的赛管与解说。", uiLocale)}</p></header>
    <div className={styles.teamSelectionStatus} role="status">{selected ? (en ? 'Showing ' : uiText("当前查看：", uiLocale)) + selected.staff_name : ''}</div><div className={styles.creditLayout}><div className={styles.creditDirectory}><div className={styles.creditTabs} role="group" aria-label={en ? 'Event staff role' : uiText("赛事职员职务", uiLocale)}>{['admin', 'caster'].map(item => <button key={item} type="button" aria-pressed={role === item} onClick={() => onChangeRole(item)}>{item === 'admin' ? en ? 'Officials' : uiText("赛管", uiLocale) : en ? 'Casters' : uiText("解说", uiLocale)}<span>{model.credits[item].length}</span></button>)}<DirectoryLink to={withSeason('/staff?group=event&type=' + role)}>{en ? 'Full directory' : uiText("完整目录", uiLocale)} ↗</DirectoryLink></div><ul ref={namesRef} className={styles.creditNames}>{entries.map(entry => <li key={entry.key}><button type="button" aria-pressed={selected?.key === entry.key} aria-label={(en ? 'Preview ' : uiText("预览", uiLocale)) + (role === 'admin' ? en ? 'official ' : uiText("赛管 ", uiLocale) : en ? 'caster ' : uiText("解说 ", uiLocale)) + entry.staff_name} onClick={() => pickCredit(entry.key)}><StaffMark key={seasonId + entry.key} name={entry.staff_name} /><span><strong>{entry.staff_name}</strong><small>{entry.match_count} {en ? (entry.match_count === 1 ? 'credited match' : 'credited matches') : uiText("场比赛署名", uiLocale)}</small></span></button></li>)}</ul>{!entries.length ? <p className={styles.emptyNote}>{en ? 'No published credits for this role yet.' : uiText("该职务暂无已发布的比赛署名。", uiLocale)}</p> : null}</div>
      {selected ? <article key={selected.key} ref={previewRef} className={styles.creditDetail} data-overview-credit={selected.key} aria-label={(en ? 'Selected credit ' : uiText("当前署名 ", uiLocale)) + selected.staff_name}><header><StaffMark key={seasonId + selected.key} name={selected.staff_name} large /><div><span>{role === 'admin' ? en ? 'OFFICIAL' : uiText("赛管", uiLocale) : en ? 'CASTER' : uiText("解说", uiLocale)}</span><h3>{selected.staff_name}</h3></div><b>{selected.match_count}<small>{en ? (selected.match_count === 1 ? 'credited match' : 'credited matches') : uiText("场比赛署名", uiLocale)}</small></b></header><p className={styles.matchLabel}>{en ? 'MATCHES ON RECORD' : uiText("署名比赛", uiLocale)}</p><ul className={styles.creditMatches}>{selected.matchLinks.slice(0, 3).map((match, index) => <li key={match.id + ':' + index}><DirectoryLink to={withSeason('/matches/' + encodeURIComponent(match.id))}><span>{match.teamA || (en ? 'TBD' : uiText("待定", uiLocale))}</span><small>VS</small><span>{match.teamB || (en ? 'TBD' : uiText("待定", uiLocale))}</span><b aria-hidden="true">↗</b></DirectoryLink></li>)}</ul>{!selected.matchLinks.length ? <p className={styles.emptyNote}>{en ? 'Match links are not available in this record.' : uiText("该记录暂未提供比赛入口。", uiLocale)}</p> : null}<footer><span>{en ? 'Source · Published match credits' : uiText("来自已发布比赛的署名", uiLocale)}</span><DirectoryLink to={withSeason(selected.href)}>{en ? 'View all credits' : uiText("查看完整署名", uiLocale)} ↗</DirectoryLink></footer></article> : null}
    </div>
  </section>
}

function RosterComposition({ model, withSeason, en }) {
  const uiLocale = useUiLocale()
  const sizesMax = Math.max(1, ...model.rosterSizes.map(item => item.count))
  const opening = model.rosterSizeBasis === 'opening'
  return <section className={styles.composition} aria-label={en ? 'Roster composition' : uiText("本届阵容构成", uiLocale)}>
    <div><header><span>{en ? 'PLAYER ROLES · FULL SEASON' : uiText("全季选手职责分布", uiLocale)}</span><DirectoryLink to={withSeason('/players')}>{en ? 'Player directory' : uiText("选手目录", uiLocale)} ↗</DirectoryLink></header><ul className={styles.roleDistribution}>{model.roles.filter(item => item.count || item.role !== 'FLEX').map(item => <li key={item.role}><div><span>{roleLabel(item.role, en)}</span><b>{item.count}<small>{en ? 'players' : uiText("位", uiLocale)}</small></b></div><span className={styles.barTrack} aria-hidden="true"><i style={{ width: (model.totalPlayers ? item.count / model.totalPlayers * 100 : 0) + '%' }} /></span></li>)}</ul><p>{en ? 'Registered roles across the full season, including players who joined or left.' : uiText("按全季收录选手的报名职责统计，含名单变更前后的选手。", uiLocale)}</p></div>
    <div data-roster-size-basis={model.rosterSizeBasis}>
      <header><span>{opening ? en ? 'OPENING ROSTER SIZES' : uiText("初始报名人数", uiLocale) : en ? 'PLAYERS ARCHIVED PER TEAM' : uiText("各队全季收录人数", uiLocale)}</span><DirectoryLink to={withSeason('/teams')}>{en ? 'Team directory' : uiText("队伍目录", uiLocale)} ↗</DirectoryLink></header>
      <ul className={styles.sizeDistribution}>{model.rosterSizes.map(item => <li key={item.size}>
        <span>{item.size || opening ? item.size + (en ? ' players' : opening ? uiText(" 人报名", uiLocale) : uiText(" 人收录", uiLocale)) : en ? 'Unpublished' : uiText("名单未发布", uiLocale)}</span>
        <span className={styles.barTrack} aria-hidden="true"><i style={{ width: item.count / sizesMax * 100 + '%' }} /></span>
        <b>{item.count}<small>{en ? (item.count === 1 ? 'team' : 'teams') : uiText("队", uiLocale)}</small></b>
      </li>)}</ul>
      {!model.rosterSizes.length ? <p>{en ? 'Team rosters not published yet.' : uiText("本届队伍名单尚未发布。", uiLocale)}</p> : <p>{opening
        ? en ? 'Based on the opening roster. Playoff arrivals and departures are marked in the full-season archive.' : uiText("按初始名单统计；季后赛加入与退出已在全季名录中标明。", uiLocale)
        : en ? 'Joining stages are incomplete. These are full-season archive totals, not simultaneous roster sizes.' : uiText("加入阶段资料不完整，展示全季累计收录人数，不代表同一阶段的报名人数。", uiLocale)}</p>}
    </div>
  </section>
}

export default function RosterHubPage() {
  const { db, season, seasonId, locale = 'zh-CN', withSeason = path => path, isKprHybridDesign = false } = useOutletContext()
  const en = locale === 'en-US'
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const panelRef = useRef(null)
  const pendingTeamScroll = useRef(false)
  const expandedTeams = searchParams.get('teamsExpanded') === '1'
  const model = useMemo(() => buildRosterOverview(db, season), [db, season])
  const selectedTeam = model.teams.find(team => team.routeId === searchParams.get('rosterTeam')) || model.teams[0]
  const creditRole = searchParams.get('creditRole') === 'caster' ? 'caster' : 'admin'
  const query = searchParams.get('q') || ''
  const update = useCallback(values => {
    const next = new URLSearchParams(searchParams)
    Object.entries(values).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name))
    setSearchParams(next, { replace: true, preventScrollReset: true })
  }, [searchParams, setSearchParams])
  useEffect(() => {
    if (navigationType === 'REPLACE') return
    const scroll = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
    if (scroll !== null) restoreWindowScroll(scroll)
  }, [location, navigationType])
  useEffect(() => {
    if (!pendingTeamScroll.current) return
    pendingTeamScroll.current = false
    scrollCompactPreview(panelRef)
  }, [location.key])

  if (!isKprHybridDesign) return <Navigate to={withSeason('/teams')} replace />
  const metrics = [
    { count: model.teams.length, label: en ? 'teams' : uiText("支参赛队伍", locale), href: '/teams' },
    { count: model.totalPlayers, label: en ? 'players across the season' : uiText("位选手 · 全季收录", locale), href: '/players' },
    { count: model.teamStaffCount, label: en ? 'team staff records' : uiText("份战队职员档案", locale), href: '/staff?group=team' },
    { count: model.eventStaffCount, label: en ? 'event staff records' : uiText("份赛事职员档案", locale), href: '/staff?group=event' }
  ]
  return <div className={indexStyles.shell + ' ' + styles.shell} data-roster-directory="overview" data-i18n-ignore>
    <RosterSubnav presentation="index" />
    <section className={styles.hero} aria-labelledby="roster-overview-heading">
      <header className={styles.intro}><span className={styles.eyebrow}>{season?.publicCode || seasonId} <i /> {en ? 'THE PEOPLE OF THIS SEASON' : uiText("本届参赛阵容", locale)}</span><h1 id="roster-overview-heading">{en ? <>A season.<br /><span>Made by us.</span></> : <>{uiText("这一届，", locale)}<br /><span>{uiText("由我们组成。", locale)}</span></>}</h1><p>{en ? 'The teams, the players, and the people behind each match. Find your place in this season.' : uiText("选手与队伍，经理与教练，赛管与解说。一起组成这一届薯条杯。", locale)}</p><dl className={styles.metrics}>{metrics.map(metric => <div key={metric.href}><dt>{metric.label}</dt><dd><DirectoryLink to={withSeason(metric.href)} label={(en ? 'Browse ' : uiText("查看", locale)) + metric.label.replace(/^[支位份]/, '')}><b>{metric.count}</b><span aria-hidden="true">↗</span></DirectoryLink></dd></div>)}</dl><OverviewSearch model={model} value={query} onChange={q => update({ q })} withSeason={withSeason} en={en} /></header>
      <div className={styles.ensemble}>
        <header className={styles.fieldHeading}><span>{en ? 'PICK A TEAM' : uiText("从一支队伍开始", locale)}</span><span>{en ? 'Select a crest to explore the roster' : uiText("点选队徽，查看完整阵容", locale)}</span></header>
        <div className={styles.teamGrid} data-expanded={expandedTeams} role="group" aria-label={en ? 'Select a team' : uiText("选择队伍", locale)}>{model.teams.map((team, index) => <button key={team.routeId} type="button" aria-pressed={selectedTeam?.routeId === team.routeId} aria-label={(en ? 'Show roster for ' : uiText("查看阵容 ", locale)) + team.shortName} title={team.fullName} style={{ '--arrival-order': Math.min(index, 14) }} onClick={() => { pendingTeamScroll.current = true; update({ rosterTeam: team.routeId }) }}><TeamMark key={seasonId + team.routeId} team={team} seasonId={seasonId} /><strong>{team.shortName}</strong></button>)}</div>
        {model.teams.length > 10 ? <button type="button" className={styles.expandTeams} aria-expanded={expandedTeams} onClick={() => update({ teamsExpanded: expandedTeams ? '' : '1' })}>{expandedTeams ? en ? 'Show fewer teams' : uiText("收起队徽", locale) : en ? 'Show all ' + model.teams.length + ' teams' : '展开全部 ' + model.teams.length + ' 支队伍'} <span aria-hidden="true">{expandedTeams ? '−' : '+'}</span></button> : null}
        <div className={styles.teamSelectionStatus} role="status">{selectedTeam ? (en ? 'Showing ' : uiText("当前查看：", locale)) + selectedTeam.shortName : ''}</div>
        <SelectedTeam key={seasonId + ':' + (selectedTeam?.routeId || '')} team={selectedTeam} seasonId={seasonId} withSeason={withSeason} locale={locale} panelRef={panelRef} />
      </div>
    </section>
    <RosterComposition model={model} withSeason={withSeason} en={en} />
    <CreditSection model={model} role={creditRole} selectedKey={searchParams.get('rosterCredit')} onChangeRole={role => update({ creditRole: role === 'admin' ? '' : role, rosterCredit: '' })} onSelect={key => update({ rosterCredit: key })} seasonId={seasonId} withSeason={withSeason} en={en} />
    <details className={styles.method}><summary>{en ? 'About these records' : uiText("这些记录来自哪里", locale)}</summary><p>{en ? 'Team and player archives retain records across the season, including playoff arrivals and departures; they are not simultaneous rosters. Managers and coaches come from published team records; officials and casters come from published match credits. A person may have several team or role records. Staff record totals are not unique-person counts. Hero artwork refers to a recorded hero of the named player.' : uiText("队伍与选手名录保留全季记录，包含季后赛加入与退出的选手，不代表同一阶段的报名阵容。经理与教练来自已发布队伍资料；赛管与解说来自已发布比赛的署名。同一人可能拥有跨队或不同职务的记录，职员档案条数不代表去重人数。英雄图对应画面中注明选手的英雄出场记录。", locale)}</p></details>
  </div>
}

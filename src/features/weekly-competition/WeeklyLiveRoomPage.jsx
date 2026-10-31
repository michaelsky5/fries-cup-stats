import RoomMapForfeitControl from './RoomMapForfeitControl.jsx'
import RoomOrganizerControl from './RoomOrganizerControl.jsx'
import RoomPreparationControl from './RoomPreparationControl.jsx'
import RoomNoRefereePreparation, { RoomPreparationDeadlines, RoomPreparationIncidentForm, RoomPreparationIncidents } from './RoomNoRefereePreparation.jsx'
import { canExtendRoomPreparation } from './roomPreparationExtension.js'
import { RoomMobileHeader, RoomMobileNav, RoomMobileInfo, useMobileRoom } from './RoomMobile.jsx'
import mobile from './RoomMobile.module.css'
import RoomDecisionSummary from './RoomDecisionSummary.jsx'
import RoomPhaseClock, { RoomSideBadge, RoomStageTimes } from './RoomPhaseClock.jsx'
import RoomPenaltyNotice from './RoomPenaltyNotice.jsx'
import useRoomPenaltyNotice from './useRoomPenaltyNotice.js'
import RoomGuideLink from '../room-guide/RoomGuideLink.jsx'
import AccountAvatar from '../account-ui/AccountAvatar.jsx'
import RoomBroadcastLink from './RoomBroadcastLink.jsx'
import RoomTrainingNotice from './RoomTrainingNotice.jsx'
import { translateUiText as uiText, pickUiLocale } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import RoomCasterAssignments from './RoomCasterAssignments.jsx'
import RoomRefereeAssignments from './RoomRefereeAssignments.jsx'
import RoomResultPanel from './RoomResultPanel.jsx'
import RoomForfeitControl from './RoomForfeitControl.jsx'
import RoomRulesPanel from './RoomRulesPanel.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import AccountModeSwitch from '../auth/AccountModeSwitch.jsx'
import AuthButton from '../auth/AuthDialog.jsx'
import useWeeklyLiveRoom from './useWeeklyLiveRoom.js'
import useRoomAlerts, { playRoomAlertSound, setRoomAlertsEnabled, unlockRoomAlertSound, useRoomAlertsEnabled } from './useRoomAlerts.js'
import { ROOM_BACKGROUND_POLL_MS } from './roomAlerts.js'
import useRoomPanelNavigation from './useRoomPanelNavigation.js'
import { useRoomTransport } from './RoomTransport.jsx'
import styles from './WeeklyLiveRoomPage.module.css'
import surfaces from './RoomSurfaces.module.css'
import OpeningSelectionPanel, { OpeningHistory } from './OpeningSelectionPanel.jsx'
import MapResultControl, { NextMapControl } from './MapResultControl.jsx'
import RoomRepresentative, { RoomRepresentativeDialog } from './RoomRepresentative.jsx'
import { getRoomStageIndex, getRoomOperatingSides } from './weeklyRoomFlow.js'
import { RoomMatchFacts, RoomMatchHeader, RoomSeriesRail, RoomStageRail } from './RoomMatchFrame.jsx'
import frame from './RoomMatchFrame.module.css'
import grid from './RoomGrid.module.css'
import workspace from './WeeklyRoomWorkspace.module.css'
import RoomLineupStage from './RoomLineupStage.jsx'
import RoomConnectionNotice from './RoomConnectionNotice.jsx'
import RoomRenderBoundary from './RoomRenderBoundary.jsx'
import RoomImportantOperations from './RoomImportantOperations.jsx'
import RoomForceStartControl from './RoomForceStartControl.jsx'
import RoomStartControl from './RoomStartControl.jsx'
import RoomTaskLayout, { RoomTaskActions } from './RoomTaskLayout.jsx'
import { RoomMapResultAgreement, RoomLineupReopen } from './RoomCaptainAgreements.jsx'
import { getRoomLineupCorrection } from './roomLineupCorrection.js'
import { getRoomLineupHighlights } from './roomLineupHighlights.js'
import { roomRoleCode, sortRoomLineup } from './roomLineups.js'
import { matchListDestination } from '../my-space/spaceDestinations.js'
import { startVisiblePolling } from '../../lib/visiblePolling.js'

const phaseNames = { PREPARING: '赛前准备', LIVE: '比赛进行中', PAUSED: '技术暂停', REVIEW: '赛果处理', ARCHIVED: '已归档' }
function roomPhaseName(data, locale) {
  if (data.phase === 'PREPARING' && data.opening && !data.opening.complete) {
    if (data.opening.phase === 'CHOOSING') return uiText('第 {0} 图 · 选图', locale, [data.opening.mapOrder])
    if (data.opening.phase === 'BANNING') return uiText(getRoomStageIndex(data) === 2 ? '第 {0} 图 · 首发确认' : '第 {0} 图 · 禁用', locale, [data.opening.mapOrder])
    return uiText(({ NOT_STARTED: '赛前安排', ONE_V_ONE_SETUP: '实际 1V1 · 指定选手', ONE_V_ONE_LIVE: '实际 1V1 进行中', PLAYING: '首图先手权', DRAW: '出手平局 · 再次决定' })[data.opening.phase] || '选禁准备', locale)
  }
  return uiText(data.phase === 'PREPARING' && data.map?.order > 1 ? '局间准备' : data.phase === 'REVIEW' && !data.result && data.opening ? '本图已结束' : phaseNames[data.phase], locale)
}
const requestNames = { OPEN: '待赛管受理', IN_PROGRESS: '赛管处理中', RESOLVED: '已解决' }
const name = team => team?.shortName || team?.name || '队伍待定'
const time = value => value ? new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
const roleName = role => ({ TANK: '重装', DPS: '输出', SUP: '支援', FLEX: '自由位' }[role] || '队员')
const readDraft = key => { try { return JSON.parse(sessionStorage.getItem(key)) || { body: '', title: '', key: crypto.randomUUID() } } catch { return { body: '', title: '', key: crypto.randomUUID() } } }

function Team({ team, data, disabled, mutate, fullRoster = false, onLineupCorrection, activity = null }) {
  const { liveRoomWrite } = useRoomTransport()
  const uiLocale = useUiLocale()
  const [expanded, setExpanded] = useState(false)
  const contentId = `room-team-content-${team?.id}`
  const roster = data.rosters.find(item => item.teamId === team?.id)
  const side = team?.id === data.match.teamA.id ? 'A' : 'B'
  const saved = data.map?.[`lineup${side}`] || []
  const sealed = data.map?.lineupMode === 'SIMULTANEOUS' && !data.map.lineupsRevealed && !saved.length
  const starters = saved.length ? sortRoomLineup(saved).map(player => ({ ...roster?.members.find(member => member.id === player.playerId), ...player, id: player.playerId })) : sealed ? [] : sortRoomLineup((roster?.members || []).filter(member => member.plannedStarter))
  const rest = (roster?.members || []).filter(member => !starters.some(player => player.id === member.id))
  const lineupConfirmed = Boolean(data.map?.lineupLocks?.[side] || saved.length === 5)
  const confirmedBy = data.map?.lineupConfirmedBy?.[side]
  const correction = getRoomLineupCorrection(data, team?.id)
  const lineupHighlights = getRoomLineupHighlights(data)[side]
  const canCheckIn = data.access.staff || data.access.representativeTeams.includes(team?.id)
  const checkIns = data.checkIns?.[team?.id] || {}
  const setCheckIn = (playerId, status) => mutate(() => liveRoomWrite(data.match.id, '/check-ins', { teamId: team.id, playerId, status, expectedRevision: data.revision, clientKey: crypto.randomUUID() }, 'PUT'), status === 'PRESENT' ? '已记录到场。' : '已记录未到场。')
  const row = (member, index, starter = false, staff = false) => {
    const status = checkIns[member.id]?.status || 'PENDING'
    const label = uiText(status === 'PRESENT' ? '已到' : status === 'ABSENT' ? '缺席' : '签到', uiLocale)
    const battleTag = member.battleTag?.trim() || ''
    // 票 2.60: role badges in words (the colour bar alone marks a sealed roster); English and Korean keep the short codes.
    const badge = staff ? member.role === 'COACH' ? pickUiLocale(uiLocale, '教练', 'COA', 'COA', '教練') : pickUiLocale(uiLocale, '经理', 'MGR', 'MGR', '經理') : starter ? [index + 1, roomRoleCode(member.role)].join(' ') : sealed ? '' : pickUiLocale(uiLocale, '替补', 'SUB', 'SUB', '替補')
    const roleTitle = staff ? member.role === 'COACH' ? '教练' : '经理' : starter ? roleName(member.role) : sealed ? '首发暂未公开' : '替补'
    const change = !staff && lineupHighlights[member.id]
    const changeLabel = change?.kind === 'IN' ? uiText('换上', uiLocale) : change?.kind === 'OUT' ? uiText('换下', uiLocale) : change ? `${roomRoleCode(change.previousRole)}→${roomRoleCode(change.role)}` : ''
    const changeTitle = change?.kind === 'ROLE' ? pickUiLocale(uiLocale, '职责调整', 'Role changed', '역할 변경', '職責調整') + ` · ${changeLabel}` : changeLabel
    return <div className={workspace.person} key={member.id} data-roster-row data-starter={starter} data-role={member.role} data-check-in={status} data-lineup-change={change?.kind}>
      <span className={workspace.role} title={uiText(roleTitle, uiLocale)}>{badge}</span>
      <span className={workspace.identity}><span className={workspace.personName}><b title={member.name || battleTag}>{member.name || battleTag || '队员'}</b>{change && <em className={workspace.changeTag} title={changeTitle} aria-label={changeTitle}>{changeLabel}</em>}</span><small title={battleTag || undefined}>{battleTag || uiText('BattleTag 待填写', uiLocale)}</small></span>
      {canCheckIn ? <button type="button" aria-label={`${member.name || member.battleTag} · ${label}`} aria-pressed={status === 'PRESENT'} disabled={disabled} onClick={() => setCheckIn(member.id, status === 'PRESENT' ? 'ABSENT' : 'PRESENT')}>{label}</button> : <small>{uiText(status === 'PRESENT' ? '已到' : status === 'ABSENT' ? '缺席' : '待到', uiLocale)}</small>}
    </div>
  }
  return <aside id={`room-team-${team?.id}`} tabIndex={-1} className={workspace.team} aria-label={name(team)} data-side={side} data-expanded={fullRoster || expanded} onFocus={event => { if (event.target === event.currentTarget) setExpanded(true) }}>
    <header><h2 className={workspace.teamTitle} title={team?.name && team.name !== name(team) ? `${name(team)} · ${team.name}` : name(team)}><strong>{name(team)}</strong>{team?.name && team.name !== name(team) && <span>· {team.name}</span>}</h2><RoomSideBadge map={data.map} side={side} />{!fullRoster && <button type="button" className={workspace.teamToggle} aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)}>{pickUiLocale(uiLocale, '名单与签到', 'Roster & check-in', '명단 · 체크인', '名單與簽到')}<span aria-hidden="true">{expanded ? '−' : '+'}</span></button>}</header>
    {/* 票 2.59: on desktop the team's latest important operation sits under its name instead of a separate strip. */}
    {activity}
    <div id={contentId} className={workspace.teamContent}>
    <RoomRepresentative team={team} data={data} disabled={disabled} mutate={mutate} />
    <div className={workspace.rosterLabel}><strong>{uiText(saved.length ? '本图首发 · D D T S S' : sealed ? '本周名单 · 首发未公开' : '计划首发 · 待本图确认', uiLocale)}</strong><small>{uiText(saved.length ? data.map.lineupsRevealed ? '已锁定' : '对方不可见' : lineupConfirmed ? '已密封提交' : '参考名单', uiLocale)}</small></div>
    <div className={workspace.roster}>{starters.map((member, index) => row(member, index, true))}{rest.length > 0 && !sealed && <div className={workspace.rosterLabel}>{uiText('替补 · {0} 人', uiLocale, [rest.length])}</div>}{rest.map((member, index) => row(member, index))}{(roster?.staff || []).length > 0 && <div className={workspace.rosterLabel}>{uiText('队伍工作人员', uiLocale)}</div>}{(roster?.staff || []).map((member, index) => row(member, index, false, true))}{!roster?.members?.length && <p>{uiText('本周名单尚未提交。', uiLocale)}</p>}</div>
    <footer data-ready={lineupConfirmed}><div className={workspace.lineupConfirmation}><strong>{uiText(lineupConfirmed ? '✓ 本图首发已确认' : '首发环节统一确认到场', uiLocale)}</strong>{correction && onLineupCorrection && <button type="button" className={workspace.lineupCorrection} data-room-slot="lineup-correction-entry" data-pending={correction.pending} aria-label={`${name(team)} · ${uiText('首发更正', uiLocale)}`} onClick={() => onLineupCorrection(team.id)}>{uiText('首发更正', uiLocale)}{correction.pending && <span> · {uiText('待确认', uiLocale)}</span>}</button>}</div><small>{confirmedBy ? `${confirmedBy.name} · ${time(confirmedBy.at)}` : uiText('游戏内必须按 D D T S S 排列', uiLocale)}</small></footer>
    </div>
  </aside>
}

function RoomPanelDialog({ open, close, title, children, keepMounted = false }) {
  const ref = useRef(null)
  const locale = useUiLocale()
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close() }, [open])
  return <dialog ref={ref} className={workspace.panelDialog} data-room-panel onCancel={event => { event.preventDefault(); close() }} aria-label={title}>
    <header><h2>{title}</h2><button type="button" onClick={close} aria-label={uiText('关闭 {0}', locale, [title])}>{uiText('关闭', locale)} ×</button></header>
    {(open || keepMounted) && <div className={workspace.panelBody}>{children}</div>}
  </dialog>
}

function RoomCommunication({ data, disabled, mutate, expanded, setExpanded, channel, setChannel, messageLoader: suppliedMessageLoader }) {
  const { coordinationWrite, liveRoomWrite, fetchRoomMessages } = useRoomTransport()
  const messageLoader = suppliedMessageLoader || fetchRoomMessages
  const uiLocale = useUiLocale()
  const [selected, setSelected] = useState(''), [teamId, setTeamId] = useState(data.access.teamIds[0] || '')
  const [items, setItems] = useState(data.messages), [hasMore, setHasMore] = useState(data.hasEarlierMessages), [feedError, setFeedError] = useState(''), [loading, setLoading] = useState(false), [unread, setUnread] = useState(false)
  const feed = useRef(null), atBottom = useRef(true), currentScope = useRef(''), generation = useRef(0), lastMessage = useRef(null)
  const scope = `${data.actor.id}:${data.match.id}:${channel}:${selected}:${teamId}:${data.map?.order || 0}`
  const draftKey = `friescup:live-room:draft:${scope}`
  const [draft, setDraft] = useState(() => data.simulation ? { body: '', title: '', key: crypto.randomUUID() } : readDraft(draftKey))
  useEffect(() => { setDraft(data.simulation ? { body: '', title: '', key: crypto.randomUUID() } : readDraft(draftKey)) }, [draftKey, data.simulation])
  const edit = patch => { const next = { ...draft, ...patch, key: crypto.randomUUID() }; setDraft(next); try { if (!data.simulation) sessionStorage.setItem(draftKey, JSON.stringify(next)) } catch { setFeedError('浏览器无法保留草稿，请勿关闭当前页面。') } }
  const resetDraft = () => { const next = { body: '', title: '', key: crypto.randomUUID() }; setDraft(next); try { if (!data.simulation) sessionStorage.removeItem(draftKey) } catch { /* Form is still cleared after acknowledged save. */ } }
  const visibleChannel = channel === 'SUPPORT' ? data.access.staff || data.access.teamIds.length : channel === 'PRODUCTION' ? data.access.production : true
  useEffect(() => { if (!visibleChannel) { setChannel('PUBLIC'); setSelected(''); setItems([]) } }, [visibleChannel, setChannel])
  useEffect(() => {
    const token = ++generation.current
    let alive = true, pending = false, firstLoad = true
    currentScope.current = scope; atBottom.current = true; setUnread(false); setFeedError(''); setItems([])
    if (channel === 'SUPPORT') return
    const load = async ({ signal } = {}) => {
      if (pending) return
      pending = true; setLoading(true)
      try {
        const value = await messageLoader(data.match.id, channel, undefined, { signal })
        if (!alive || token !== generation.current) return
        setItems(previous => [...new Map([...previous, ...value.items].map(item => [item.id, item])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)))
        if (firstLoad) { setHasMore(value.hasMore); firstLoad = false }
        setFeedError('')
      } catch (error) { if (alive && token === generation.current) { setFeedError(error.message); if ([401, 403].includes(error.status)) setItems([]) }; throw error }
      finally { pending = false; if (alive && token === generation.current) setLoading(false) }
    }
    const polling = channel === 'PRODUCTION' ? startVisiblePolling(load, { intervalMs: 3000 }) : null
    const controller = new AbortController()
    if (!polling) void load({ signal: controller.signal }).catch(() => {})
    return () => { alive = false; polling?.stop(); controller.abort() }
  }, [scope, channel, data.match.id, messageLoader])
  useEffect(() => {
    if (channel !== 'PUBLIC' || currentScope.current !== scope) return
    setFeedError('')
    setItems(previous => [...new Map([...previous, ...data.messages].map(item => [item.id, item])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)))
  }, [data.messages, data.match.id, channel, scope])
  useEffect(() => {
    if (atBottom.current && feed.current) feed.current.scrollTop = feed.current.scrollHeight
    else if (lastMessage.current && items.at(-1)?.id !== lastMessage.current) setUnread(true)
    lastMessage.current = items.at(-1)?.id || null
  }, [items, selected])
  const request = data.requests.find(item => item.id === selected)
  const assistanceStatuses = data.access.operatorMode === 'TEAM_CAPTAINS' ? { OPEN: '待赛事组处理', IN_PROGRESS: '赛事组处理中', RESOLVED: '已解决' } : requestNames
  async function earlier() {
    if (loading) return
    setLoading(true); const token = generation.current
    try { const value = await messageLoader(data.match.id, channel, items[0]?.id); if (token !== generation.current) return; const oldHeight = feed.current?.scrollHeight || 0; atBottom.current = false; setItems(previous => [...value.items, ...previous]); setHasMore(value.hasMore); requestAnimationFrame(() => { if (feed.current) feed.current.scrollTop += feed.current.scrollHeight - oldHeight }) }
    catch (error) { if (token === generation.current) setFeedError(error.message) }
    finally { if (token === generation.current) setLoading(false) }
  }
  async function submit(event) {
    event.preventDefault()
    const body = draft.body.trim()
    if (!body || disabled || !visibleChannel || feedError) return
    let result
    if (channel !== 'SUPPORT') result = await mutate(() => liveRoomWrite(data.match.id, '/messages', { body, clientKey: draft.key, channel, mapOrder: data.map?.order || null }), '消息已保存，对方同步后可查看。')
    else if (request) result = await mutate(() => coordinationWrite('/replies', { requestId: request.id, expectedRevision: request.revision, clientKey: draft.key, body, ...(data.access.staff ? { status: event.currentTarget.elements.result.value } : {}) }, data.access.staff), '回复已保存。')
    else if (teamId) result = await mutate(() => coordinationWrite('/requests', { weekId: data.match.weekId, teamId, matchId: data.match.id, clientKey: draft.key, title: draft.title.trim(), body }), data.access.operatorMode === 'TEAM_CAPTAINS' ? '协助已提交，等待赛事组处理；比赛状态没有改变。' : '协助已提交，等待赛管受理；比赛状态没有改变。')
    if (result) { resetDraft(); atBottom.current = true; if (channel === 'SUPPORT' && result.id) setSelected(result.id) }
  }
  const supportOpen = data.requests.filter(item => item.status !== 'RESOLVED').length
  return <section id="room-communication" className={`${styles.communication} ${frame.communicationPanel} ${expanded ? frame.expandedFeed : ''}`} aria-label={uiText("比赛沟通", uiLocale)}>
    <header><div><h2>{uiText("比赛沟通", uiLocale)}</h2><small>{channel === 'PUBLIC' ? uiText("双方队伍与本场工作人员", uiLocale) : channel === 'PRODUCTION' ? uiText("仅解说与赛事工作人员", uiLocale) : uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '仅相关队伍与赛事工作人员' : '仅相关队伍与赛管', uiLocale)}</small></div><button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? uiText("返回当前操作 ↖", uiLocale) : uiText("展开沟通 ↗", uiLocale)}</button></header>
    <nav aria-label={uiText("沟通范围", uiLocale)}>{[['PUBLIC', '比赛交流'], ...(data.access.staff || data.access.teamIds.length ? [['SUPPORT', `${uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '赛事组协助' : '赛管协助', uiLocale)}${supportOpen ? ` · ${supportOpen}` : ''}`]] : []), ...(data.access.production ? [['PRODUCTION', '转播协同']] : [])].map(([key, label]) => <button key={key} aria-pressed={channel === key} onClick={() => { setChannel(key); setSelected('') }}>{label}</button>)}<span className={frame.channelScope}>{channel === 'PUBLIC' ? uiText("本场人员可见", uiLocale) : channel === 'SUPPORT' ? uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '相关队伍与赛事工作人员可见' : '相关队伍与赛管可见', uiLocale) : uiText("制作人员可见", uiLocale)}</span></nav>
    {channel !== 'SUPPORT' && data.publicNote && <div className={styles.pinned} data-pinned><small>{uiText("比赛说明", uiLocale)}</small><p>{data.publicNote}</p></div>}
    <div className={styles.feed} ref={feed} role="region" aria-label={uiText("沟通记录", uiLocale)} tabIndex={0} onScroll={() => { const e = feed.current; atBottom.current = e.scrollHeight - e.scrollTop - e.clientHeight < 32; if (atBottom.current) setUnread(false) }}>
      {channel === 'SUPPORT' ? <>{request ? <><button onClick={() => setSelected('')}>{uiText("← 全部协助", uiLocale)}</button><h3>{request.title}</h3><small>{name(request.team)} · {uiText(assistanceStatuses[request.status], uiLocale)}</small>{request.messages.map(item => <article key={item.id}><header><AccountAvatar url={item.avatarUrl} name={item.author} size={28} /><strong>{item.author}</strong><small>{item.staff ? uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '赛事工作人员' : '赛管', uiLocale) : uiText("队伍", uiLocale)} · {time(item.createdAt)}</small></header><p>{item.body}</p></article>)}</> : <>{data.requests.map(item => <button className={styles.request} key={item.id} onClick={() => setSelected(item.id)}><strong>{item.title}</strong><span>{name(item.team)} · {uiText(assistanceStatuses[item.status], uiLocale)}</span><small>{time(item.updatedAt)} · {item.messages.length}{uiText(" 条记录", uiLocale)}</small></button>)}{!data.requests.length && <p className={styles.empty}>{uiText("暂无协助记录。遇到问题可在这里提交与跟进。", uiLocale)}</p>}</>}</> : <>{hasMore && <button disabled={loading} onClick={earlier}>{uiText("加载更早的沟通", uiLocale)}</button>}{items.map(item => <article key={item.id} data-system={item.kind !== 'CHAT'}><header><AccountAvatar url={item.avatarUrl} name={item.authorName} size={28} /><strong>{item.authorName}</strong><small>{item.roleLabel} · {time(item.createdAt)}{item.mapOrder ? uiText(" · 图 {0}", uiLocale, [item.mapOrder]) : ''}</small></header><p>{item.body}</p></article>)}{!items.length && !loading && <p className={styles.empty}>{uiText("暂无沟通记录。发送的消息会保留在本场。", uiLocale)}</p>}</>}
    </div>
    {unread && <button className={styles.unread} onClick={() => { atBottom.current = true; setUnread(false); if (feed.current) feed.current.scrollTop = feed.current.scrollHeight }}>{uiText("有新消息 · 回到最新 ↓", uiLocale)}</button>}
    {feedError && <p role="alert" className={styles.error}>{feedError}<button onClick={() => { setFeedError(''); setChannel('PUBLIC') }}>{uiText("返回比赛交流", uiLocale)}</button></p>}
    <form className={styles.composer} data-channel={channel} onSubmit={submit}>
      {channel === 'SUPPORT' && !request && !data.access.staff && <>{data.access.teamIds.length > 1 && <label>{uiText("代表队伍", uiLocale)}<select value={teamId} onChange={e => setTeamId(e.target.value)}>{data.access.teamIds.map(id => <option key={id} value={id}>{name([data.match.teamA, data.match.teamB].find(team => team.id === id))}</option>)}</select></label>}<label>{uiText("问题概述", uiLocale)}<input value={draft.title} onChange={e => edit({ title: e.target.value })} maxLength={100} required minLength={2} disabled={disabled} placeholder={uiText("例如：队员掉线，需要赛管协助", uiLocale)} /></label></>}
      {channel !== 'SUPPORT' || request || !data.access.staff ? <><label className={styles.inputLabel}>{channel === 'SUPPORT' ? request ? uiText("补充或回复协助", uiLocale) : uiText("具体情况", uiLocale) : uiText("发送比赛沟通消息", uiLocale)}<textarea value={draft.body} maxLength={2000} minLength={channel === 'SUPPORT' ? 2 : 1} onChange={e => edit({ body: e.target.value })} disabled={disabled || !visibleChannel} placeholder={data.archived ? uiText("已归档，记录只读", uiLocale) : channel === 'SUPPORT' ? uiText("填写具体情况；私密内容仅相关队伍和赛管可见…", uiLocale) : uiText("向当前范围内的人员发送消息…", uiLocale)} /></label><div className={styles.sendRow}><small>{draft.body ? uiText("草稿保留在本机", uiLocale) : data.archived ? uiText("记录只读", uiLocale) : uiText("已保存不等于对方已阅", uiLocale)}</small>{channel === 'SUPPORT' && request && data.access.staff && <select name="result" aria-label={uiText("协助处理状态", uiLocale)} disabled={disabled}><option value="IN_PROGRESS">{uiText("受理 / 继续处理", uiLocale)}</option><option value="RESOLVED">{uiText("问题已解决", uiLocale)}</option></select>}<button className={styles.primary} disabled={disabled || !draft.body.trim() || !!feedError || (channel === 'SUPPORT' && !request && draft.title.trim().length < 2)}>{disabled && data.archived ? uiText("已归档", uiLocale) : channel === 'SUPPORT' ? uiText("提交协助记录", uiLocale) : uiText("发送消息", uiLocale)}</button></div></> : <p className={styles.empty}>{uiText("选择一条协助记录，受理或回复相关队伍。", uiLocale)}</p>}
    </form>
  </section>
}

export function WeeklyRoomView({ matchId, controller, accountControl = <AuthButton />, messageLoader, preview = false, returnPathOverride, returnLabelOverride }) {
  const location = useLocation()
  const { liveRoomWrite } = useRoomTransport()
  const uiLocale = useUiLocale()
  const { data, error, busy, notice, noticeKind, refresh, mutate, clearNotice, connection } = controller
  const returnPath = returnPathOverride || matchListDestination(matchId, { search: location.search, competitionId: data?.match?.seasonId })
  const compact = useMobileRoom()
  const roomRoot = useRef(null)
  const [rosterSide, setRosterSide] = useState(null)
  const [representativeTeamId, setRepresentativeTeamId] = useState(null)
  const [lineupCorrectionTeam, setLineupCorrectionTeam] = useState(null)
  const operation = useRef(null)
  const [auxiliary, setAuxiliary] = useRoomPanelNavigation(matchId)
  const [pauseScope, setPauseScope] = useState(null), [pauseNote, setPauseNote] = useState(''), [pauseSide, setPauseSide] = useState('A')
  const pauseContext = data ? JSON.stringify([matchId, data.actor.id, data.map?.order, data.map?.lineupContext]) : null
  const pauseOpen = pauseScope !== null && pauseScope === pauseContext && data?.phase === 'LIVE' && data.access.canPause && data.access.canWrite && !data.result
  const penaltyNotice = useRoomPenaltyNotice(data, { stale: !!error, blocked: pauseOpen, panel: auxiliary, setPanel: setAuxiliary })
  const [channel, setChannel] = useState('PUBLIC')
  const [selectedStage, setSelectedStage] = useState(null)
  // 票 2.64: sound and tab-title alerts when the room moves on while nobody is looking at it.
  const alertsOn = useRoomAlertsEnabled()
  useRoomAlerts(data, alertsOn, uiLocale)
  const toggleAlerts = () => { const next = !alertsOn; setRoomAlertsEnabled(next); if (next) { unlockRoomAlertSound(); playRoomAlertSound('stage') } }
  const alertsToggle = <button type="button" aria-pressed={alertsOn} onClick={toggleAlerts} title={uiText('切到游戏时，轮到你操作或进入新阶段会响提示音，标签页标题会闪动。', uiLocale)} data-room-alerts>{uiText(alertsOn ? '声音提醒 · 开' : '声音提醒 · 关', uiLocale)}</button>
  const stageIndex = data ? getRoomStageIndex(data) : null
  useEffect(() => { setSelectedStage(null) }, [data?.map?.order, stageIndex])
  useEffect(() => {
    if (!notice || noticeKind !== 'success') return
    const timer = setTimeout(clearNotice, 6000)
    return () => clearTimeout(timer)
  }, [notice, noticeKind, clearNotice])
  useEffect(() => {
    const root = roomRoot.current, dock = root?.querySelector('[data-room-commit]')
    if (!root || !compact || !dock) { root?.style.removeProperty('--room-action-height'); return }
    const measure = () => root.style.setProperty('--room-action-height', `${Math.ceil(dock.getBoundingClientRect().height)}px`)
    const observer = new ResizeObserver(measure)
    observer.observe(dock); measure()
    return () => { observer.disconnect(); root.style.removeProperty('--room-action-height') }
  }, [compact, data?.map?.order, data?.opening?.phase, stageIndex, selectedStage])
  const dialog = useRef(null)
  useEffect(() => {
    if (pauseOpen) dialog.current?.showModal()
    else { dialog.current?.close(); setPauseScope(null); setPauseNote(''); setPauseSide('A') }
  }, [pauseOpen])
  if (!data) return <main className={styles.emptyPage}><Link to={returnPath}>{uiText("← 我的比赛", uiLocale)}</Link><h1>{uiText("比赛房", uiLocale)}</h1><RoomGuideLink match={matchId} scenario="access" label="无法操作？查看指南" /><RoomConnectionNotice connection={connection} error={error} refresh={refresh} matchId={matchId} hasData={Boolean(data)} />{(!connection || !error) && <p role={error ? 'alert' : 'status'}>{error || uiText("正在同步本场比赛…", uiLocale)}</p>}{error && !connection && <button onClick={() => refresh({ force: true })}>{uiText("重新同步", uiLocale)}</button>}{accountControl}</main>
  const disabled = busy || !!error || !data.access.canWrite
  const representativeTeam = [data.match.teamA, data.match.teamB].find(team => team.id === representativeTeamId)
  const openRepresentative = teamId => {
    const side = data.representatives?.sides.find(item => item.teamId === teamId)
    if (disabled || !(side?.canAssign || side?.canClaim)) return
    setRepresentativeTeamId(teamId)
    setAuxiliary('representative')
  }
  const missingOwnRepresentative = data.representatives?.sides.find(side => !side.active && (side.canClaim || side.canAssign) && data.access.teamIds.includes(side.teamId))
  const stage = data.phase, own = getRoomOperatingSides(data)
  const currentStage = getRoomStageIndex(data)
  const inspectingStage = selectedStage !== null && selectedStage !== currentStage
  const casterOnly = data.access.production && !data.access.staff && !data.access.teamIds.length
  const openingActive = data.opening && stage === 'PREPARING' && !data.opening.complete
  const command = (action, extra = {}) => mutate(() => liveRoomWrite(matchId, '/commands', { action, clientKey: crypto.randomUUID(), expectedRevision: data.revision, matchRevision: data.match.revision, draftRevision: data.draftRevision, ...extra }), '操作已保存，本场人员会同步看到最新状态。')
  const lineupStage = stage === 'PREPARING' && currentStage === 2
  const openLineupCorrection = teamId => { clearNotice(); setLineupCorrectionTeam(teamId); setAuxiliary('lineup-correction') }
  const resultAgreementActive = stage === 'LIVE' && ['PENDING', 'DISPUTED', 'EXPIRED'].includes(data.captainAgreements?.result.status)
  // 票 2.61: the quieter stages leave the centre half empty on desktop, so the match communication sits there; the footer button still opens the full panel.
  const quietStage = openingActive ? !lineupStage && ['NOT_STARTED', 'ONE_V_ONE_SETUP', 'ONE_V_ONE_LIVE', 'PLAYING', 'DRAW'].includes(data.opening.phase) : ['LIVE', 'PAUSED', 'REVIEW', 'ARCHIVED'].includes(stage)
  const inlineCommunication = !compact && quietStage && !inspectingStage && auxiliary !== 'communication'
  const task = stage === 'PREPARING' ? data.opening?.complete ? '选禁完成，等待实际开赛' : '核对赛前准备条件' : stage === 'PAUSED' ? data.access.staff ? '核对双方恢复条件' : '比赛已暂停，等待恢复通知' : stage === 'LIVE' ? resultAgreementActive ? '核对本图比分' : data.access.staff ? '比赛进行中，核对当前图信息' : '本图正在进行，请专注比赛' : stage === 'REVIEW' ? data.series && !data.series.complete ? data.opening?.access.canNext ? '核对本图结果并开放下一图' : data.phaseClock?.stage?.kind === 'REST' ? '局间休息 · 可提前结束后选图' : '等待本场操作人员开放下一图' : data.access.staff ? '整理本场赛果并提交战报' : '按本场分工提交战报，胜方负责；平局由主队 A 负责' : stage === 'ARCHIVED' ? '本场已归档，记录只读' : '比赛记录进入赛果处理'
  return <main ref={roomRoot} className={`${styles.room} ${frame.frame} ${workspace.viewport} ${mobile.mobileFrame} ${grid.grid}`} data-page-mode="control" data-room-layout="workspace" data-phase={stage} data-opening={!!openingActive} onClick={event => {
    if (!compact) return
    const href = event.target.closest('a')?.getAttribute('href')
    const side = ['A', 'B'].find(side => href === '#room-team-' + data.match['team' + side].id)
    if (side) { event.preventDefault(); setRosterSide(side); setAuxiliary('teams') }
  }}>
    {compact ? <RoomMobileHeader data={data} returnPath={returnPath} busy={busy} error={error} refresh={refresh} onInfo={() => setAuxiliary('info')} /> : <RoomMatchHeader data={data} phaseLabel={roomPhaseName(data, uiLocale)} returnPath={returnPath} busy={busy} refresh={refresh} accountControl={accountControl} />}
    <RoomTrainingNotice data={data} disabled={disabled} />
    {data.access.managementConflict && <div className={styles.notice} role="status" data-room-management-conflict>
      <span>{data.access.forceMode
        ? pickUiLocale(uiLocale, '强制模式已开启：本场管理操作会记录介入原因。', 'Force mode is active. Management actions in this match record the intervention reason.', '강제 모드가 활성화되어 있습니다. 이 경기의 관리 작업에 개입 사유가 기록됩니다.', '強制模式已開啟：本場管理操作會記錄介入原因。')
        : pickUiLocale(uiLocale, '本场管理权限已回避：你与参赛队伍有关联，仅保留本队身份对应的操作。请由独立赛管处理比赛管理。', 'Management access is restricted because you are linked to a competing team. Your team role still applies. An independent referee must manage this match.', '참가 팀과 연관되어 이 경기의 관리 권한이 제한됩니다. 소속 팀 역할에 따른 작업은 유지됩니다. 독립 심판에게 경기 관리를 맡겨 주세요.', '本場管理權限已迴避：你與參賽隊伍有關聯，僅保留本隊身分對應的操作。請由獨立賽管處理比賽管理。')}
        {data.access.forceMode && <small> {data.access.forceMode.reason}</small>}</span>
    </div>}
    {!compact && <RoomSeriesRail data={data} phaseLabel={roomPhaseName(data, uiLocale)} />}
    <RoomConnectionNotice connection={connection} error={error} refresh={refresh} matchId={matchId} hasData={Boolean(data)} />
    {compact && missingOwnRepresentative && <div className={styles.notice} data-room-slot="representative-entry"><span>{pickUiLocale(uiLocale, '本队尚无操作代表。可提前设置，无需等待比赛开放。', 'Your team needs a representative. Set one before match operations open.', '팀 조작 대표가 필요합니다. 경기 조작이 열리기 전에 설정할 수 있습니다.', '本隊尚無操作代表。可提前設定，無需等待比賽開放。')}</span><button type="button" onClick={() => openRepresentative(missingOwnRepresentative.teamId)}>{pickUiLocale(uiLocale, '设置本队代表', 'Set team representative', '팀 대표 설정', '設定本隊代表')} →</button></div>}
    {((error && !connection) || notice) && <div className={error && !connection || noticeKind === 'error' ? styles.error : styles.notice} data-room-feedback={noticeKind || 'warning'} role={error && !connection || noticeKind === 'error' ? 'alert' : 'status'}><span>{error && !connection ? uiText("{0} 重新同步前暂停操作。", uiLocale, [error]) : notice}{error && <RoomGuideLink data={data} scenario="sync" label="无法操作？查看指南" />}</span>{!error && <button type="button" aria-label={uiText('关闭提示', uiLocale)} onClick={clearNotice}>×</button>}</div>}
    {/* 票 2.59: the strip stays on the compact layout; on desktop its team updates move into the team columns and
        the map facts are already on the current map card and in each roster. */}
    {compact && <div className={workspace.statusStrip} data-room-slot="status-strip"><RoomImportantOperations data={data} stale={!!error} side="A" /><RoomDecisionSummary data={data} inline /><RoomImportantOperations data={data} stale={!!error} side="B" /></div>}
    <div className={workspace.columns} data-room-slot="columns">{!compact && <Team team={data.match.teamA} data={data} disabled={disabled} mutate={mutate} onLineupCorrection={openLineupCorrection} activity={<RoomImportantOperations data={data} stale={!!error} side="A" />} />}<div className={workspace.center} ref={operation} tabIndex={-1} data-room-slot="center" data-stage-view={lineupStage ? 'lineup' : openingActive ? 'selection' : stage.toLowerCase()} data-inspecting={inspectingStage} data-communication={inlineCommunication || undefined}>
      {!data.result && <RoomStageRail data={data} selectedStage={selectedStage} onStageSelect={setSelectedStage} clock={<RoomPhaseClock data={data} disabled={disabled} mutate={mutate} stale={!!error} onPreparationExtension={() => setAuxiliary('preparation')} onPreparationDetails={() => setAuxiliary('records')} />} />}
      {openingActive && !lineupStage && !inspectingStage && <OpeningSelectionPanel data={data} disabled={disabled} mutate={mutate} onRepresentativeOpen={openRepresentative} />}
      {lineupStage && !inspectingStage && <section className={`${styles.task} ${surfaces.paper} ${frame.phaseView}`} aria-label={uiText("首发确认", uiLocale)}><header className={frame.phaseViewHeader}><div><h2>{uiText("确认本图首发", uiLocale)}</h2></div><span>{uiText("2 输出 · 1 重装 · 2 支援", uiLocale)}</span></header><RoomLineupStage key={data.map?.lineupContext || data.map?.order} data={data} disabled={disabled} command={command} /></section>}
      {!openingActive && !lineupStage && !inspectingStage && <>
      <RoomTaskLayout as="section" className={`${styles.task} ${surfaces.paper} ${frame.decisionTask} ${frame.phaseView}`} data-room-slot="current-task" data-stage={stage.toLowerCase()} data-result-confirmation={resultAgreementActive} aria-label={uiText("当前任务", uiLocale)} header={!data.result && <div className={frame.decisionTitle}><div><small>{uiText("第 {0} 图", uiLocale, [data.map?.order || 1])} · {stage === 'LIVE' ? uiText("比赛进行", uiLocale) : stage === 'REVIEW' ? uiText("地图结果", uiLocale) : stage === 'PAUSED' ? uiText("技术暂停", uiLocale) : uiText("赛前准备", uiLocale)}</small><h2>{casterOnly && stage === 'LIVE' ? uiText("本图正在进行，跟进公开赛况", uiLocale) : uiText(task, uiLocale)}</h2></div><span>{data.access.staff ? uiText("本场赛管", uiLocale) : own.length ? uiText("本队操作代表", uiLocale) : casterOnly ? uiText("解说视角", uiLocale) : uiText("队伍成员 · 查看进度", uiLocale)}</span></div>}>
        {stage === 'PREPARING' && <RoomStartControl data={data} disabled={disabled} command={command} mutate={mutate} notice={notice} onPreparationExtension={() => setAuxiliary('preparation')} />}
        {stage === 'LIVE' && <>{!resultAgreementActive && <p>{casterOnly ? uiText("按公开状态同步解说；制作沟通请使用转播协同。", uiLocale) : data.access.staff ? uiText("关注双方协助。游戏实际暂停或结束后，再记录状态与本图结果。", uiLocale) : uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '选禁已锁定。需要暂停时与主队 A 沟通，由 A 代表记录游戏暂停；比赛结束后由一方录入比分、另一方确认。' : '选禁已锁定。需要暂停或遇到进房问题时，通过本页联系赛管。', uiLocale)}</p>}<div className={frame.taskActions}>{data.access.canPause && <button disabled={disabled || !data.access.canPause} onClick={() => { clearNotice(); setPauseScope(pauseContext) }}>{uiText("记录游戏已暂停", uiLocale)}</button>}<RoomMapResultAgreement data={data} disabled={disabled} command={command} onSupport={() => { setChannel('SUPPORT'); setAuxiliary('communication') }} />{data.canRecordMapResult && <MapResultControl key={data.map.order} data={data} disabled={disabled} mutate={mutate} />}{(data.access.staff || data.access.teamIds.length > 0 || casterOnly) && <button type="button" onClick={() => { setChannel(casterOnly ? 'PRODUCTION' : data.access.operatorMode === 'TEAM_CAPTAINS' ? 'PUBLIC' : 'SUPPORT'); setAuxiliary('communication') }}>{casterOnly ? uiText("打开转播协同", uiLocale) : uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '联系主队 / 比赛沟通' : '联系赛管 / 查看协助', uiLocale)}</button>}</div></>}
        {stage === 'PAUSED' && <><p>{data.publicNote}</p><div className={`${styles.conditions} ${frame.readiness}`}>{[['A', data.match.teamA], ['B', data.match.teamB]].map(([side, team]) => <span key={side} data-ready={data.pause?.recovered?.[side]?.ready}><b title={name(team)}>{name(team)}</b><span>{data.pause?.recovered?.[side]?.ready ? uiText("✓ 可以恢复比赛", uiLocale) : uiText("○ 等待恢复确认", uiLocale)}</span><small>{data.pause?.recovered?.[side]?.ready ? data.pause.recovered[side].by : uiText("由本队操作代表确认", uiLocale)}</small></span>)}</div><RoomTaskActions><div className={frame.taskActions}>{own.map(side => { const key = side.team.id === data.match.teamA.id ? 'A' : 'B', recovered = data.pause?.recovered?.[key]?.ready; return <button className={!recovered ? styles.primary : ''} key={side.team.id} disabled={disabled} onClick={() => command('RECOVER', { teamId: side.team.id, ready: !recovered, pauseStartedAt: data.pause.at, recoveryUpdatedAt: data.pause.recovered?.[key]?.at || null })}>{name(side.team)} {recovered ? uiText("仍需等待", uiLocale) : uiText("已恢复，可继续", uiLocale)}</button> })}{data.access.canResume && <button className={styles.primary} disabled={disabled || !data.access.canResume} onClick={() => command('RESUME')}>{uiText("确认游戏已恢复", uiLocale)}</button>}</div></RoomTaskActions><small>{uiText(data.pause?.quotaExpired ? "责任队伍五分钟额度已耗尽，请告知双方并在游戏内恢复。本图可暂时少人，下一图须五人。" : "双方确认可恢复后记录游戏恢复。无赛管时由有游戏控制权的主队 A 操作代表记录。", uiLocale)}</small></>}
        {stage === 'REVIEW' && !data.result && <NextMapControl key={data.map?.order} data={data} disabled={disabled} mutate={mutate} />}
        {['LIVE', 'PAUSED'].includes(stage) && <RoomMapForfeitControl key={data.map?.order} data={data} disabled={disabled} mutate={mutate} />}
        {['REVIEW', 'ARCHIVED'].includes(stage) && <RoomResultPanel data={data} disabled={disabled} mutate={mutate} correction={stage === 'REVIEW' && data.canCorrectMapResult ? <span className={styles.resultCorrection}><MapResultControl key={'correct-' + data.map.order} data={data} disabled={disabled} mutate={mutate} correcting /></span> : null} />}
        {stage === 'REVIEW' && !data.result && data.canCorrectMapResult && <div className={styles.resultCorrection}><MapResultControl key={'correct-' + data.map.order} data={data} disabled={disabled} mutate={mutate} correcting /></div>}
      </RoomTaskLayout></>}
      {inlineCommunication && <RoomCommunication key={'inline:' + data.actor.id + matchId} data={data} disabled={disabled} mutate={mutate} expanded={false} setExpanded={() => setAuxiliary('communication')} channel={channel} setChannel={setChannel} messageLoader={messageLoader} />}
    </div>{!compact && <Team team={data.match.teamB} data={data} disabled={disabled} mutate={mutate} onLineupCorrection={openLineupCorrection} activity={<RoomImportantOperations data={data} stale={!!error} side="B" />} />}</div>
    {!compact && <footer className={workspace.toolbar}>
      <span><b>{data.actor.name}</b> · {data.actor.label}</span>
      <RoomMatchFacts data={data} error={error} mutate={preview ? undefined : mutate} disabled={disabled} />
      <div>{data.access.staff && <button type="button" onClick={() => setAuxiliary('more')}>{uiText('赛管工具', uiLocale)}</button>}<button type="button" data-room-entry="communication" onClick={() => setAuxiliary('communication')}>{uiText('比赛沟通', uiLocale)}{data.requests?.some(request => request.status !== 'RESOLVED') ? uiText(' · 有待处理协助', uiLocale) : ''}</button><button type="button" onClick={() => setAuxiliary('records')}>{uiText('规则与记录', uiLocale)}</button>{(!data.result && (data.forfeit?.canPropose || data.forfeit?.history?.length > 0)) && <button type="button" onClick={() => setAuxiliary('forfeit')}>{uiText('弃权处理', uiLocale)}</button>}{alertsToggle}<RoomGuideLink data={data} label="操作指南" /><Link to={returnPath}>{returnLabelOverride || uiText('← 返回我的比赛', uiLocale)}</Link></div>
    </footer>}
    {compact && <RoomMobileNav auxiliary={auxiliary} staff={data.access.staff} assistance={data.requests?.some(request => request.status !== 'RESOLVED')} navigate={key => { if (key === 'operation') { setAuxiliary(''); setSelectedStage(null); operation.current?.focus({ preventScroll: true }) } else setAuxiliary(key) }} />}
    {compact && <>
      <RoomPanelDialog open={auxiliary === 'teams'} close={() => setAuxiliary('')} title={uiText('双方名单', uiLocale)}>
        <div className={mobile.teamTabs} role="group" aria-label={uiText('切换队伍名单', uiLocale)}>{['A', 'B'].map(side => { const activeSide = rosterSide || (data.access.teamIds.includes(data.match.teamB.id) ? 'B' : 'A'); return <button type="button" key={side} aria-pressed={activeSide === side} onClick={() => setRosterSide(side)}><b>{name(data.match['team' + side])}</b><small>{uiText(data.map?.lineupLocks?.[side] ? '首发已提交' : '首发待确认', uiLocale)}</small></button> })}</div>
        <Team key={rosterSide || 'default'} team={data.match['team' + (rosterSide || (data.access.teamIds.includes(data.match.teamB.id) ? 'B' : 'A'))]} data={data} disabled={disabled} mutate={mutate} fullRoster onLineupCorrection={openLineupCorrection} />
      </RoomPanelDialog>
      <RoomPanelDialog open={auxiliary === 'info'} close={() => setAuxiliary('')} title={uiText('房间信息', uiLocale)}><RoomMobileInfo data={data} accountControl={accountControl} disabled={disabled} mutate={preview ? undefined : mutate}><RoomSeriesRail data={data} phaseLabel={roomPhaseName(data, uiLocale)} /></RoomMobileInfo></RoomPanelDialog>
    </>}
      <RoomPanelDialog open={auxiliary === 'more'} close={() => setAuxiliary('')} title={uiText(data.access.staff ? '赛管工具' : '更多操作', uiLocale)}><div className={mobile.more}>
        <p><b>{data.actor.name}</b> · {data.actor.label}</p>
        {compact && <button type="button" onClick={() => setAuxiliary('info')}>{uiText('房间信息', uiLocale)} <span>→</span></button>}
        <button type="button" onClick={() => setAuxiliary('records')}>{uiText('规则与记录', uiLocale)} <span>→</span></button>
        {alertsToggle}
        <RoomForceStartControl key={data.map?.order + ':' + data.map?.lineupContext} data={data} disabled={disabled} command={command} notice={notice} onPreparationExtension={() => setAuxiliary('preparation')} />
        {canExtendRoomPreparation(data) && <button type="button" onClick={() => setAuxiliary('preparation')}>{uiText('本图准备加时', uiLocale)} <span>→</span></button>}
        {data.access.staff && data.phaseClock?.canManage && !data.result && <RoomPhaseClock data={data} disabled={disabled} mutate={mutate} stale={!!error} onPreparationExtension={() => setAuxiliary('preparation')} />}
        {stage === 'LIVE' && data.access.canPause && <button type="button" disabled={disabled} onClick={() => { clearNotice(); setPauseScope(pauseContext) }}>{uiText('记录游戏已暂停', uiLocale)} <span>→</span></button>}
        {stage === 'PAUSED' && data.access.canResume && <button type="button" disabled={disabled} onClick={() => command('RESUME')}>{uiText('确认游戏已恢复', uiLocale)}</button>}
        {(!data.result && (data.forfeit?.canPropose || data.forfeit?.history?.length > 0)) && <button type="button" onClick={() => setAuxiliary('forfeit')}>{uiText('弃权处理', uiLocale)} <span>→</span></button>}
        <RoomGuideLink data={data} /><Link to={returnPath}>{returnLabelOverride || uiText('← 返回我的比赛', uiLocale)}</Link>
      </div></RoomPanelDialog>
    <RoomPanelDialog open={auxiliary === 'lineup-correction'} close={() => setAuxiliary(compact ? 'teams' : '')} title={uiText('首发更正', uiLocale)} keepMounted>{getRoomLineupCorrection(data, lineupCorrectionTeam) ? <RoomLineupReopen key={`${data.actor.id}:${matchId}:${data.map?.lineupContext || data.map?.order}`} data={data} disabled={disabled} command={command} teamId={lineupCorrectionTeam} /> : <p>{pickUiLocale(uiLocale, '当前首发更正已结束，请返回比赛操作。', 'Lineup correction is no longer available. Return to the match.', '선발 수정이 종료되었습니다. 경기 진행으로 돌아가세요.', '目前首發更正已結束，請返回比賽操作。')}</p>}{(error || notice) && <p role={error || noticeKind === 'error' ? 'alert' : 'status'}>{error || notice}</p>}</RoomPanelDialog>
    <RoomPanelDialog open={auxiliary === 'timeout' && Boolean(penaltyNotice)} close={() => setAuxiliary('')} title={uiText('本队超时处理结果', uiLocale)}>{penaltyNotice && <RoomPenaltyNotice event={penaltyNotice} data={data} onClose={() => setAuxiliary('')} onRules={() => setAuxiliary('records')} />}</RoomPanelDialog>
    <RoomPanelDialog open={auxiliary === 'communication'} close={() => setAuxiliary('')} title={uiText('比赛沟通与协助', uiLocale)}><RoomCommunication key={data.actor.id + matchId} data={data} disabled={disabled} mutate={mutate} expanded setExpanded={() => setAuxiliary('')} channel={channel} setChannel={setChannel} messageLoader={messageLoader} /></RoomPanelDialog>
    <RoomPanelDialog open={auxiliary === 'records'} close={() => setAuxiliary('')} title={uiText('规则、选禁记录与转播安排', uiLocale)}><RoomStageTimes data={data} /><RoomNoRefereePreparation data={data} disabled={disabled} expanded onReport={() => setAuxiliary('preparation-incident')} onSupport={() => { setChannel('SUPPORT'); setAuxiliary('communication') }} />{!data.timing?.noRefereePolicy && stage === 'PREPARING' && <RoomPreparationDeadlines data={data} />}{data.access.production && <RoomBroadcastLink key={`broadcast:${data.actor.id}:${matchId}`} data={data} disabled={busy || !!error || preview} />}{canExtendRoomPreparation(data) && <button type="button" disabled={disabled} onClick={() => setAuxiliary('preparation')}>{uiText('本图准备加时', uiLocale)}</button>}<RoomOrganizerControl data={data} disabled={disabled} mutate={mutate} /><RoomRulesPanel data={data} />{!(data.timing?.noRefereePolicy && stage === 'PREPARING') && <RoomPreparationIncidents data={data} />}<OpeningHistory key={data.actor.id + matchId} data={data} disabled={disabled} mutate={mutate} /><RoomRefereeAssignments data={data} disabled={disabled} mutate={mutate} /><RoomCasterAssignments data={data} disabled={disabled} mutate={mutate} /></RoomPanelDialog>
    <RoomPanelDialog open={auxiliary === 'preparation'} close={() => setAuxiliary('')} title={uiText('本图准备加时', uiLocale)}><RoomPreparationControl key={`${matchId}:${data.map?.order || 1}`} data={data} disabled={disabled} mutate={mutate} onSaved={() => setAuxiliary('')} /></RoomPanelDialog>
    <RoomPanelDialog open={auxiliary === 'preparation-incident'} close={() => setAuxiliary('')} title={uiText('留证并记录结束等待', uiLocale)}><RoomPreparationIncidentForm key={`${matchId}:${data.map?.order || 1}`} data={data} disabled={disabled} mutate={mutate} onSaved={() => setAuxiliary('')} /></RoomPanelDialog>
    <RoomPanelDialog open={auxiliary === 'forfeit'} close={() => setAuxiliary('')} title={uiText('本场弃权处理', uiLocale)}><RoomForfeitControl data={data} disabled={disabled} mutate={mutate} /></RoomPanelDialog>
    {auxiliary === 'representative' && representativeTeam && <RoomRepresentativeDialog key={`${matchId}:${data.actor.id}:${representativeTeam.id}`} team={representativeTeam} data={data} disabled={disabled} mutate={mutate} onClose={() => setAuxiliary('')} />}
    <dialog ref={dialog} aria-labelledby="weekly-pause-title" className={styles.dialog} onCancel={() => setPauseScope(null)}>
      <form onSubmit={async event => {
        event.preventDefault()
        if (!pauseOpen || disabled || pauseNote.trim().length < 2 || pauseSide === 'PUBLIC' && !data.access.administrator) return
        if (await command('PAUSE', { note: pauseNote.trim(), pauseSide })) setPauseScope(null)
      }}>
        <h2 id="weekly-pause-title">{uiText("记录游戏已暂停", uiLocale)}</h2>
        <p>{uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '先在游戏内完成暂停，再发布双方与解说可见的说明。私密详情留在赛事组协助中。' : '先在游戏内完成暂停，再发布双方与解说可见的说明。私密详情留在赛管协助中。', uiLocale)}</p>
        <label>{uiText("暂停责任方", uiLocale)}<select value={pauseSide} disabled={disabled || !pauseOpen} onChange={event => setPauseSide(event.target.value)}><option value="A">{name(data.match.teamA)}</option><option value="B">{name(data.match.teamB)}</option>{data.access.administrator && <option value="PUBLIC">{uiText("公共故障 · 不扣队伍额度", uiLocale)}</option>}</select></label>
        <label>{uiText("公开暂停说明", uiLocale)}<textarea value={pauseNote} disabled={disabled || !pauseOpen} onChange={event => setPauseNote(event.target.value)} required minLength={2} maxLength={500} /></label>
        {notice && <p role="status">{notice}</p>}
        <div className={styles.actions}><button type="button" onClick={() => setPauseScope(null)}>{uiText("取消", uiLocale)}</button><button className={styles.primary} disabled={disabled || !pauseOpen || pauseNote.trim().length < 2 || pauseSide === 'PUBLIC' && !data.access.administrator}>{uiText("确认游戏已暂停", uiLocale)}</button></div>
      </form>
    </dialog>
  </main>
}

function LiveRoom({ matchId }) {
  const location = useLocation()
  const alertsOn = useRoomAlertsEnabled()
  const controller = useWeeklyLiveRoom(matchId, undefined, { backgroundPollMs: alertsOn ? ROOM_BACKGROUND_POLL_MS : 0 })
  const locale = useUiLocale()
  const returnPath = matchListDestination(matchId, { search: location.search, competitionId: controller.data?.match?.seasonId })
  return <RoomRenderBoundary matchId={matchId} locale={locale} refresh={controller.refresh} returnPath={returnPath}><WeeklyRoomView matchId={matchId} controller={controller} /></RoomRenderBoundary>
}

export default function WeeklyLiveRoomPage() {
  const location = useLocation()
  const uiLocale = useUiLocale()
  const { matchId } = useParams(), { user, isBootstrapping } = useAuth()
  if (!user) return <main className={styles.emptyPage}><Link to={matchListDestination(matchId, { search: location.search })}>{uiText("← 我的比赛", uiLocale)}</Link><small>MATCH ROOM</small><h1>{uiText("进入本场比赛", uiLocale)}</h1><RoomGuideLink match={matchId} scenario="access" label="参赛与比赛指南" /><p>{isBootstrapping ? uiText("正在检查登录状态…", uiLocale) : uiText("登录后按本场身份查看准备、沟通与比赛进度。", uiLocale)}</p><AuthButton /></main>
  return <><AccountModeSwitch locale={uiLocale} /><LiveRoom key={`${user.id}:${user.accountMode || ''}:${matchId}`} matchId={matchId} /></>
}

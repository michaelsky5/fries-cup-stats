import AccountAvatar from '../account-ui/AccountAvatar.jsx'
import RoomTrainingNotice from './RoomTrainingNotice.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import RoomCasterAssignments from './RoomCasterAssignments.jsx'
import RoomResultPanel from './RoomResultPanel.jsx'
import RoomForfeitControl from './RoomForfeitControl.jsx'
import RoomRulesPanel from './RoomRulesPanel.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import AuthButton from '../auth/AuthDialog.jsx'
import useWeeklyLiveRoom from './useWeeklyLiveRoom.js'
import { coordinationWrite, fetchRoomMessages, liveRoomWrite } from './liveRoomApi.js'
import { formatOwMapMode, formatOwMapName, getOwMap } from '../../lib/heroes.js'
import { getMapImage } from '../../lib/reviewAssets.js'
import styles from './WeeklyLiveRoomPage.module.css'
import surfaces from './RoomSurfaces.module.css'
import OpeningSelectionPanel, { OpeningHistory } from './OpeningSelectionPanel.jsx'
import MapResultControl, { NextMapControl } from './MapResultControl.jsx'
import RoomRepresentative from './RoomRepresentative.jsx'
import { getRoomStageIndex, getRoomOperatingSides } from './weeklyRoomFlow.js'
import { RoomMatchHeader, RoomSeriesRail, RoomStageRail } from './RoomMatchFrame.jsx'
import frame from './RoomMatchFrame.module.css'
import workspace from './WeeklyRoomWorkspace.module.css'
import RoomLineupControl from './RoomLineupControl.jsx'
import RoomPreflightControl from './RoomPreflightControl.jsx'
import { roomRoleCode, roomLineupTurn, sortRoomLineup } from './roomLineups.js'

const phaseNames = { PREPARING: '赛前准备', LIVE: '比赛进行中', PAUSED: '技术暂停', REVIEW: '赛果处理', ARCHIVED: '已归档' }
const roomPhaseName = data => data.phase === 'PREPARING' && data.opening && !data.opening.complete ? ({ NOT_STARTED: '赛前安排', ONE_V_ONE_SETUP: '实际 1V1 · 指定选手', ONE_V_ONE_LIVE: '实际 1V1 进行中', PLAYING: '首图先手权', DRAW: '出手平局 · 再次决定', CHOOSING: `第 ${data.opening.mapOrder} 图 · 选图`, BANNING: `第 ${data.opening.mapOrder} 图 · ${getRoomStageIndex(data) === 2 ? '首发确认' : 'Ban'}` }[data.opening.phase] || '选禁准备') : data.phase === 'PREPARING' && data.map?.order > 1 ? '局间准备' : data.phase === 'REVIEW' && !data.result && data.opening ? '本图已结束' : phaseNames[data.phase]
const requestNames = { OPEN: '待赛管受理', IN_PROGRESS: '赛管处理中', RESOLVED: '已解决' }
const name = team => team?.shortName || team?.name || '队伍待定'
const time = value => value ? new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
const roleName = role => ({ TANK: '重装', DPS: '输出', SUP: '支援', FLEX: '自由位' }[role] || '队员')
const readDraft = key => { try { return JSON.parse(sessionStorage.getItem(key)) || { body: '', title: '', key: crypto.randomUUID() } } catch { return { body: '', title: '', key: crypto.randomUUID() } } }

function Team({ team, data, disabled, mutate }) {
  const roster = data.rosters.find(item => item.teamId === team?.id)
  const side = team?.id === data.match.teamA.id ? 'A' : 'B'
  const saved = data.map?.[`lineup${side}`] || []
  const starters = saved.length ? sortRoomLineup(saved).map(player => ({ ...roster?.members.find(member => member.id === player.playerId), ...player, id: player.playerId })) : sortRoomLineup((roster?.members || []).filter(member => member.plannedStarter))
  const rest = (roster?.members || []).filter(member => !starters.some(player => player.id === member.id))
  const preparation = data.preparation.sides.find(item => item.team.id === team?.id)
  const canCheckIn = data.access.staff || data.access.representativeTeams.includes(team?.id)
  const checkIns = data.checkIns?.[team?.id] || {}
  const setCheckIn = (playerId, status) => mutate(() => liveRoomWrite(data.match.id, '/check-ins', { teamId: team.id, playerId, status, expectedRevision: data.revision, clientKey: crypto.randomUUID() }, 'PUT'), status === 'PRESENT' ? '已记录到场。' : '已记录未到场。')
  const row = (member, index, starter = false, staff = false) => {
    const status = checkIns[member.id]?.status || 'PENDING'
    const label = status === 'PRESENT' ? '已到' : status === 'ABSENT' ? '缺席' : '签到'
    return <div className={workspace.person} key={member.id} data-roster-row data-starter={starter} data-role={member.role} data-check-in={status}>
      <span className={workspace.role} title={staff ? member.role === 'COACH' ? '教练' : '经理' : roleName(member.role)}>{staff ? member.role === 'COACH' ? '教' : '管' : starter ? `${index + 1} ${roomRoleCode(member.role)}` : '替'}</span>
      <span className={workspace.identity}><b>{member.name || member.battleTag || '队员'}</b><small title={member.battleTag}>{member.battleTag || (staff ? member.role === 'COACH' ? '教练' : '经理' : '战网名待填写')}</small></span>
      {canCheckIn ? <button type="button" aria-label={`${member.name || member.battleTag} · ${label}`} aria-pressed={status === 'PRESENT'} disabled={disabled} onClick={() => setCheckIn(member.id, status === 'PRESENT' ? 'ABSENT' : 'PRESENT')}>{label}</button> : <small>{status === 'PRESENT' ? '已到' : status === 'ABSENT' ? '缺席' : '待到'}</small>}
    </div>
  }
  return <aside id={`room-team-${team?.id}`} tabIndex={-1} className={workspace.team} aria-label={name(team)} data-side={side}>
    <header><small>TEAM {side}</small><h2>{name(team)}</h2><span title={team?.name}>{team?.name}</span></header>
    <RoomRepresentative team={team} data={data} disabled={disabled} mutate={mutate} />
    <div className={workspace.rosterLabel}><strong>{saved.length ? '本图首发 · CCTNN' : data.map?.lineupLocks?.[side] ? '首发已提交 · 待双方公开' : '计划首发 · 待本图确认'}</strong><small>{saved.length ? '已锁定' : '参考名单'}</small></div>
    <div className={workspace.roster}>{starters.map((member, index) => row(member, index, true))}{rest.length > 0 && <div className={workspace.rosterLabel}>替补 · {rest.length} 人</div>}{rest.map((member, index) => row(member, index))}{(roster?.staff || []).length > 0 && <div className={workspace.rosterLabel}>队伍工作人员</div>}{(roster?.staff || []).map((member, index) => row(member, index, false, true))}{!roster?.members?.length && <p>本周名单尚未提交。</p>}</div>
    <footer data-ready={preparation?.ready}><strong>{preparation?.ready ? '✓ 本队已准备' : preparation?.stale ? '安排变化，需重新确认' : '等待准备确认'}</strong><small>{preparation?.confirmedBy ? `${preparation.confirmedBy} · ${time(preparation.updatedAt)}` : '游戏内必须按 C C T N N 排列'}</small></footer>
  </aside>
}

function RoomPanelDialog({ open, close, title, children }) {
  const ref = useRef(null)
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close() }, [open])
  return <dialog ref={ref} className={workspace.panelDialog} onCancel={close} aria-label={title}>
    <header><h2>{title}</h2><button type="button" onClick={close} aria-label={`关闭${title}`}>关闭 ×</button></header>
    {open && <div className={workspace.panelBody}>{children}</div>}
  </dialog>
}

function RoomCommunication({ data, disabled, mutate, expanded, setExpanded, channel, setChannel, messageLoader = fetchRoomMessages }) {
  const uiLocale = useUiLocale()
  const [selected, setSelected] = useState(''), [teamId, setTeamId] = useState(data.access.teamIds[0] || '')
  const [items, setItems] = useState(data.messages), [hasMore, setHasMore] = useState(data.hasEarlierMessages), [feedError, setFeedError] = useState(''), [loading, setLoading] = useState(false), [unread, setUnread] = useState(false)
  const feed = useRef(null), atBottom = useRef(true), currentScope = useRef(''), generation = useRef(0), lastMessage = useRef(null)
  const scope = `${data.actor.id}:${data.match.id}:${channel}:${selected}:${teamId}:${data.map?.order || 0}`
  const draftKey = `friescup:live-room:draft:${scope}`
  const [draft, setDraft] = useState(() => readDraft(draftKey))
  useEffect(() => { setDraft(readDraft(draftKey)) }, [draftKey])
  const edit = patch => { const next = { ...draft, ...patch, key: crypto.randomUUID() }; setDraft(next); try { sessionStorage.setItem(draftKey, JSON.stringify(next)) } catch { setFeedError('浏览器无法保留草稿，请勿关闭当前页面。') } }
  const resetDraft = () => { const next = { body: '', title: '', key: crypto.randomUUID() }; setDraft(next); try { sessionStorage.removeItem(draftKey) } catch { /* Form is still cleared after acknowledged save. */ } }
  const visibleChannel = channel === 'SUPPORT' ? data.access.staff || data.access.teamIds.length : channel === 'PRODUCTION' ? data.access.production : true
  useEffect(() => { if (!visibleChannel) { setChannel('PUBLIC'); setSelected(''); setItems([]) } }, [visibleChannel, setChannel])
  useEffect(() => {
    const token = ++generation.current
    let alive = true, pending = false, firstLoad = true
    currentScope.current = scope; atBottom.current = true; setUnread(false); setFeedError(''); setItems([])
    if (channel === 'SUPPORT') return
    const load = async () => {
      if (pending) return
      pending = true; setLoading(true)
      try {
        const value = await messageLoader(data.match.id, channel)
        if (!alive || token !== generation.current) return
        setItems(previous => [...new Map([...previous, ...value.items].map(item => [item.id, item])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)))
        if (firstLoad) { setHasMore(value.hasMore); firstLoad = false }
        setFeedError('')
      } catch (error) { if (alive && token === generation.current) { setFeedError(error.message); if ([401, 403].includes(error.status)) setItems([]) } }
      finally { pending = false; if (alive && token === generation.current) setLoading(false) }
    }
    load()
    const timer = channel === 'PRODUCTION' ? setInterval(load, 3000) : null
    return () => { alive = false; clearInterval(timer) }
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
    else if (teamId) result = await mutate(() => coordinationWrite('/requests', { weekId: data.match.weekId, teamId, matchId: data.match.id, clientKey: draft.key, title: draft.title.trim(), body }), '协助已提交，等待赛管受理；比赛状态没有改变。')
    if (result) { resetDraft(); atBottom.current = true; if (channel === 'SUPPORT' && result.id) setSelected(result.id) }
  }
  const supportOpen = data.requests.filter(item => item.status !== 'RESOLVED').length
  return <section id="room-communication" className={`${styles.communication} ${frame.communicationPanel} ${expanded ? frame.expandedFeed : ''}`} aria-label={uiText("比赛沟通", uiLocale)}>
    <header><div><h2>{uiText("比赛沟通", uiLocale)}</h2><small>{channel === 'PUBLIC' ? uiText("双方队伍与本场工作人员", uiLocale) : channel === 'PRODUCTION' ? uiText("仅解说与赛事工作人员", uiLocale) : uiText("仅相关队伍与赛管", uiLocale)}</small></div><button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? uiText("返回当前操作 ↖", uiLocale) : uiText("展开沟通 ↗", uiLocale)}</button></header>
    <nav aria-label={uiText("沟通范围", uiLocale)}>{[['PUBLIC', '比赛交流'], ...(data.access.staff || data.access.teamIds.length ? [['SUPPORT', `赛管协助${supportOpen ? ` · ${supportOpen}` : ''}`]] : []), ...(data.access.production ? [['PRODUCTION', '转播协同']] : [])].map(([key, label]) => <button key={key} aria-pressed={channel === key} onClick={() => { setChannel(key); setSelected('') }}>{label}</button>)}<span className={frame.channelScope}>{channel === 'PUBLIC' ? uiText("本场人员可见", uiLocale) : channel === 'SUPPORT' ? uiText("相关队伍与赛管可见", uiLocale) : uiText("制作人员可见", uiLocale)}</span></nav>
    {channel !== 'SUPPORT' && data.publicNote && <div className={styles.pinned} data-pinned><small>{uiText("比赛说明", uiLocale)}</small><p>{data.publicNote}</p></div>}
    <div className={styles.feed} ref={feed} role="region" aria-label={uiText("沟通记录", uiLocale)} tabIndex={0} onScroll={() => { const e = feed.current; atBottom.current = e.scrollHeight - e.scrollTop - e.clientHeight < 32; if (atBottom.current) setUnread(false) }}>
      {channel === 'SUPPORT' ? <>{request ? <><button onClick={() => setSelected('')}>{uiText("← 全部协助", uiLocale)}</button><h3>{request.title}</h3><small>{name(request.team)} · {requestNames[request.status]}</small>{request.messages.map(item => <article key={item.id}><header><AccountAvatar url={item.avatarUrl} name={item.author} size={28} /><strong>{item.author}</strong><small>{item.staff ? uiText("赛管", uiLocale) : uiText("队伍", uiLocale)} · {time(item.createdAt)}</small></header><p>{item.body}</p></article>)}</> : <>{data.requests.map(item => <button className={styles.request} key={item.id} onClick={() => setSelected(item.id)}><strong>{item.title}</strong><span>{name(item.team)} · {requestNames[item.status]}</span><small>{time(item.updatedAt)} · {item.messages.length}{uiText(" 条记录", uiLocale)}</small></button>)}{!data.requests.length && <p className={styles.empty}>{uiText("暂无协助记录。遇到问题可在这里提交与跟进。", uiLocale)}</p>}</>}</> : <>{hasMore && <button disabled={loading} onClick={earlier}>{uiText("加载更早的沟通", uiLocale)}</button>}{items.map(item => <article key={item.id} data-system={item.kind !== 'CHAT'}><header><AccountAvatar url={item.avatarUrl} name={item.authorName} size={28} /><strong>{item.authorName}</strong><small>{item.roleLabel} · {time(item.createdAt)}{item.mapOrder ? uiText(" · 图 {0}", uiLocale, [item.mapOrder]) : ''}</small></header><p>{item.body}</p></article>)}{!items.length && !loading && <p className={styles.empty}>{uiText("暂无沟通记录。发送的消息会保留在本场。", uiLocale)}</p>}</>}
    </div>
    {unread && <button className={styles.unread} onClick={() => { atBottom.current = true; setUnread(false); if (feed.current) feed.current.scrollTop = feed.current.scrollHeight }}>{uiText("有新消息 · 回到最新 ↓", uiLocale)}</button>}
    {feedError && <p role="alert" className={styles.error}>{feedError}<button onClick={() => { setFeedError(''); setChannel('PUBLIC') }}>{uiText("返回比赛交流", uiLocale)}</button></p>}
    <form className={styles.composer} data-channel={channel} onSubmit={submit}>
      {channel === 'SUPPORT' && !request && !data.access.staff && <>{data.access.teamIds.length > 1 && <label>{uiText("代表队伍", uiLocale)}<select value={teamId} onChange={e => setTeamId(e.target.value)}>{data.access.teamIds.map(id => <option key={id} value={id}>{name([data.match.teamA, data.match.teamB].find(team => team.id === id))}</option>)}</select></label>}<label>{uiText("问题概述", uiLocale)}<input value={draft.title} onChange={e => edit({ title: e.target.value })} maxLength={100} required minLength={2} disabled={disabled} placeholder={uiText("例如：队员掉线，需要赛管协助", uiLocale)} /></label></>}
      {channel !== 'SUPPORT' || request || !data.access.staff ? <><label className={styles.inputLabel}>{channel === 'SUPPORT' ? request ? uiText("补充或回复协助", uiLocale) : uiText("具体情况", uiLocale) : uiText("发送比赛沟通消息", uiLocale)}<textarea value={draft.body} maxLength={2000} minLength={channel === 'SUPPORT' ? 2 : 1} onChange={e => edit({ body: e.target.value })} disabled={disabled || !visibleChannel} placeholder={data.archived ? uiText("已归档，记录只读", uiLocale) : channel === 'SUPPORT' ? uiText("填写具体情况；私密内容仅相关队伍和赛管可见…", uiLocale) : uiText("向当前范围内的人员发送消息…", uiLocale)} /></label><div className={styles.sendRow}><small>{draft.body ? uiText("草稿保留在本机", uiLocale) : data.archived ? uiText("记录只读", uiLocale) : uiText("已保存不等于对方已阅", uiLocale)}</small>{channel === 'SUPPORT' && request && data.access.staff && <select name="result" aria-label={uiText("协助处理状态", uiLocale)} disabled={disabled}><option value="IN_PROGRESS">{uiText("受理 / 继续处理", uiLocale)}</option><option value="RESOLVED">{uiText("问题已解决", uiLocale)}</option></select>}<button className={styles.primary} disabled={disabled || !draft.body.trim() || !!feedError || (channel === 'SUPPORT' && !request && draft.title.trim().length < 2)}>{disabled && data.archived ? uiText("已归档", uiLocale) : channel === 'SUPPORT' ? uiText("提交协助记录", uiLocale) : uiText("发送消息 ↗", uiLocale)}</button></div></> : <p className={styles.empty}>{uiText("选择一条协助记录，受理或回复相关队伍。", uiLocale)}</p>}
    </form>
  </section>
}

export function WeeklyRoomView({ matchId, controller, accountControl = <AuthButton />, messageLoader }) {
  const uiLocale = useUiLocale()
  const { data, error, busy, notice, refresh, mutate, clearNotice } = controller
  const [auxiliary, setAuxiliary] = useState(''), [pauseOpen, setPauseOpen] = useState(false), [pauseNote, setPauseNote] = useState('')
  const [channel, setChannel] = useState('PUBLIC')
  const [selectedStage, setSelectedStage] = useState(null)
  useEffect(() => { setSelectedStage(null) }, [data?.map?.order, data?.phase, data?.opening?.phase])
  const dialog = useRef(null)
  useEffect(() => { if (pauseOpen) dialog.current?.showModal(); else dialog.current?.close() }, [pauseOpen])
  if (!data) return <main className={styles.emptyPage}><Link to="/me?section=matches">{uiText("← 我的比赛", uiLocale)}</Link><h1>{uiText("比赛房", uiLocale)}</h1><p role={error ? 'alert' : 'status'}>{error || uiText("正在同步本场比赛…", uiLocale)}</p>{error && <button onClick={refresh}>{uiText("重新同步", uiLocale)}</button>}<AuthButton /></main>
  const disabled = busy || !!error || !data.access.canWrite
  const stage = data.phase, own = getRoomOperatingSides(data)
  const currentStage = getRoomStageIndex(data)
  const inspectingStage = selectedStage !== null && selectedStage !== currentStage
  const checkInSummary = data.rosters.map(roster => {
    const statuses = [...roster.members, ...(roster.staff || [])].map(member => data.checkIns?.[roster.teamId]?.[member.id]?.status || 'PENDING')
    return { teamId: roster.teamId, present: statuses.filter(status => status === 'PRESENT').length, absent: statuses.filter(status => status === 'ABSENT').length, total: statuses.length }
  })
  const casterOnly = data.access.production && !data.access.staff && !data.access.teamIds.length
  const openingActive = data.opening && stage === 'PREPARING' && !data.opening.complete
  const mapImage = data.map && getOwMap(data.map.name) ? getMapImage(data.map.type, data.map.name) : null
  const returnPath = `/me?section=matches&competition=${encodeURIComponent(data.match.seasonId)}&weeklyMatch=${encodeURIComponent(matchId)}`
  const command = (action, extra = {}) => mutate(() => liveRoomWrite(matchId, '/commands', { action, clientKey: crypto.randomUUID(), expectedRevision: data.revision, matchRevision: data.match.revision, draftRevision: data.draftRevision, ...extra }), '操作已保存，本场人员会同步看到最新状态。')
  const activeMap = data.map
  const lineupsReady = Boolean(activeMap?.lineupA?.length === 5 && activeMap?.lineupB?.length === 5)
  const lineupStage = stage === 'PREPARING' && currentStage === 2
  const task = lineupStage ? '确认本图首发名单' : stage === 'PREPARING' ? data.opening && !data.opening.complete ? data.opening.phase === 'CHOOSING' ? '选择本图地图与攻防' : data.opening.phase === 'BANNING' ? '完成本图英雄禁用' : '完成本图地图选择' : !lineupsReady ? '确认本图首发名单' : data.access.staff ? data.access.canStart ? '双方已准备，请确认游戏开赛' : '核对赛前准备条件' : own.length ? own.every(side => side.ready) ? data.preparation.sides.every(side => side.ready) ? '双方已准备，等待最终确认' : '本队已准备，等待对方核对' : '核对签到、房间与名单，确认本队准备' : '查看本场安排，等待队伍代表准备' : stage === 'PAUSED' ? data.access.staff ? '核对双方恢复条件' : '比赛已暂停，等待恢复通知' : stage === 'LIVE' ? data.access.staff ? '比赛进行中，核对当前图信息' : '本图正在进行，请专注比赛' : stage === 'REVIEW' ? data.opening?.access.canNext ? '核对本图结果并开放下一图' : '整理本场赛果并提交战报' : stage === 'ARCHIVED' ? '本场已归档，记录只读' : '比赛记录进入赛果处理'
  return <main className={`${styles.room} ${frame.frame} ${workspace.viewport}`} data-page-mode="control" data-room-layout="workspace" data-phase={stage} data-opening={!!openingActive}>
    <RoomMatchHeader data={data} phaseLabel={roomPhaseName(data)} returnPath={returnPath} busy={busy} error={error} refresh={refresh} accountControl={accountControl} />
    <RoomTrainingNotice data={data} disabled={disabled} />
    <RoomSeriesRail data={data} phaseLabel={roomPhaseName(data)} />
    {(error || notice) && <div className={error ? styles.error : styles.notice} role={error ? 'alert' : 'status'}>{error ? uiText("{0} 重新同步前暂停操作。", uiLocale, [error]) : notice}</div>}
    <div className={workspace.columns}><Team team={data.match.teamA} data={data} disabled={disabled} mutate={mutate} /><div className={workspace.center} data-stage-view={lineupStage ? 'lineup' : openingActive ? 'selection' : stage.toLowerCase()} data-inspecting={inspectingStage}>
      {!data.result && <RoomStageRail data={data} selectedStage={selectedStage} onStageSelect={setSelectedStage} />}
      {openingActive && !lineupStage && !inspectingStage && <OpeningSelectionPanel data={data} disabled={disabled} mutate={mutate} />}
      {lineupStage && !inspectingStage && <section className={`${styles.task} ${surfaces.paper} ${frame.phaseView}`} aria-label={uiText("首发确认", uiLocale)}><header className={frame.phaseViewHeader}><div><small>03 / LINEUP</small><h2>{uiText("确认本图首发", uiLocale)}</h2></div><span>{uiText("2 输出 · 1 重装 · 2 支援", uiLocale)}</span></header><p>{uiText("选图方先确认五人和本图职责，另一方随后确认；允许换位，游戏内也必须按 CCTNN 排列。", uiLocale)}</p>{[data.match[`team${roomLineupTurn(data.map) || 'A'}`]].filter(team => team && (data.access.staff || data.access.representativeTeams.includes(team.id))).map(team => <RoomLineupControl key={`lineup-${data.map?.order}-${team.id}`} data={data} side={{ team, key: team.id === data.match.teamA.id ? 'A' : 'B' }} disabled={disabled} command={command} />)}{!data.access.staff && !data.access.representativeTeams.includes(data.match[`team${roomLineupTurn(data.map) || 'A'}`]?.id) && <div className={workspace.waiting}><strong>等待 {name(data.match[`team${roomLineupTurn(data.map) || 'A'}`])} 确认本图首发</strong><p>已确认的人员和职责会显示在两侧名单。请先完成签到，轮到本队时中央会开放确认。</p></div>}</section>}
      {!openingActive && !lineupStage && !inspectingStage && <>{!data.result && <div className={styles.map} style={mapImage ? { backgroundImage: `linear-gradient(90deg, color-mix(in srgb, var(--fc-data-ink, #181a17) 93%, transparent), color-mix(in srgb, var(--fc-data-ink, #181a17) 50%, transparent)), url("${mapImage}")` } : undefined}><small>{data.map ? `MAP ${String(data.map.order).padStart(2, '0')} · ${formatOwMapMode(data.map.type)}` : 'CURRENT MAP'}</small><h1>{formatOwMapName(data.map?.name) || uiText("等待赛管确定当前图", uiLocale)}</h1><span>{data.opening?.complete ? uiText("双方选禁已锁定", uiLocale) : uiText("地图与禁用按赛管工作台更新", uiLocale)}</span></div>}
      <section className={`${styles.task} ${surfaces.paper} ${frame.decisionTask} ${frame.phaseView}`} data-stage={stage.toLowerCase()} aria-label={uiText("当前任务", uiLocale)}>{!data.result && <div className={frame.decisionTitle}><div><small>MAP {String(data.map?.order || 1).padStart(2, '0')} / {stage === 'LIVE' ? uiText("比赛进行", uiLocale) : stage === 'REVIEW' ? uiText("地图结果", uiLocale) : uiText("赛前准备", uiLocale)}</small><h2>{casterOnly && stage === 'LIVE' ? uiText("本图正在进行，跟进公开赛况", uiLocale) : task}</h2></div><span>{data.access.staff ? uiText("本场赛管", uiLocale) : own.length ? uiText("本队操作代表", uiLocale) : casterOnly ? uiText("解说视角", uiLocale) : uiText("队伍成员 · 查看进度", uiLocale)}</span></div>}
        {stage === 'PREPARING' && <><RoomPreflightControl key={data.map?.order} data={data} disabled={disabled} command={command} /><p>{data.opening && !data.opening.complete ? uiText("先确定地图及适用的攻防顺序，再确认双方首发，随后选择 Ban 顺序并禁用英雄。", uiLocale) : !lineupsReady ? uiText("请从本队已锁定名单中选择本图五名首发，双方确认后进入赛前准备。", uiLocale) : data.access.staff ? data.blockers.join('；') || uiText("请核对双方签到、房间、名单和本图设置。", uiLocale) : uiText("核对每位选手签到、游戏房间、实际出场人员与本图设置，再确认本队准备。", uiLocale)}</p><div className={`${styles.conditions} ${frame.readiness}`}>{data.preparation.sides.map(side => { const checkIn = checkInSummary.find(item => item.teamId === side.team.id); return <span key={side.team.id} data-ready={side.ready}><b>{name(side.team)}</b><span>{uiText("签到 {0}/{1}", uiLocale, [checkIn?.present || 0, checkIn?.total || 0])}{checkIn?.absent ? uiText(" · 缺席 {0}", uiLocale, [checkIn.absent]) : ''}</span><span>{side.ready ? uiText("✓ 已确认准备", uiLocale) : side.stale ? uiText("安排有变化，需重新核对", uiLocale) : uiText("○ 等待代表确认", uiLocale)}</span><small>{side.confirmedBy || data.representatives?.sides.find(rep => rep.teamId === side.team.id)?.name || uiText("代表待指定", uiLocale)}</small></span> })}</div><div className={`${frame.taskActions} ${!lineupsReady ? styles.srOnly : ''}`}>{own.map(side => <button key={side.team.id} className={!side.ready ? styles.primary : ''} disabled={disabled || !side.canConfirm} onClick={() => mutate(() => coordinationWrite('/readiness', { weekId: data.match.weekId, matchId, teamId: side.team.id, ready: !side.ready, fingerprint: side.fingerprint, expectedRevision: side.revision }, data.access.staff, 'PUT'), side.ready ? '已撤回本队准备。' : '本队准备已保存，对方与赛管可查看。')}>{side.ready ? uiText("撤回 {0} 准备", uiLocale, [name(side.team)]) : uiText("确认 {0} 已准备好", uiLocale, [name(side.team)])}</button>)}{data.access.canStart && <button className={styles.primary} disabled={disabled || !data.access.canStart} onClick={() => command('START')}>{uiText("确认游戏已开赛", uiLocale)}</button>}</div>{own.filter(side => side.reason).map(side => <small key={side.team.id}>{side.reason}</small>)}<small>{data.access.operatorMode === 'REFEREE' ? uiText("双方操作代表确认本队准备；最终开赛确认由赛管完成。", uiLocale) : uiText("双方操作代表完成签到与准备确认后，任一方可记录游戏实际开赛。", uiLocale)}</small></>}
        {stage === 'LIVE' && <><p>{casterOnly ? uiText("按公开状态同步解说；制作沟通请使用转播协同。", uiLocale) : data.access.staff ? uiText("关注双方协助。游戏实际暂停或结束后，再记录状态与本图结果。", uiLocale) : uiText("选禁已锁定。需要暂停或遇到进房问题时，通过本页联系赛管。", uiLocale)}</p><div className={frame.taskActions}>{data.access.canPause && <button disabled={disabled || !data.access.canPause} onClick={() => { clearNotice(); setPauseOpen(true) }}>{uiText("记录游戏已暂停", uiLocale)}</button>}{data.canRecordMapResult && <MapResultControl key={data.map.order} data={data} disabled={disabled} mutate={mutate} />}{(data.access.staff || data.access.teamIds.length > 0 || casterOnly) && <button type="button" onClick={() => { setChannel(casterOnly ? 'PRODUCTION' : 'SUPPORT'); setAuxiliary('communication') }}>{casterOnly ? uiText("打开转播协同", uiLocale) : uiText("联系赛管 / 查看协助", uiLocale)}</button>}</div></>}
        {stage === 'PAUSED' && <><p>{data.publicNote}</p><div className={`${styles.conditions} ${frame.readiness}`}>{[['A', data.match.teamA], ['B', data.match.teamB]].map(([side, team]) => <span key={side} data-ready={data.pause?.recovered?.[side]?.ready}><b>{name(team)}</b><span>{data.pause?.recovered?.[side]?.ready ? uiText("✓ 可以恢复比赛", uiLocale) : uiText("○ 等待恢复确认", uiLocale)}</span><small>{data.pause?.recovered?.[side]?.ready ? data.pause.recovered[side].by : uiText("由本队操作代表确认", uiLocale)}</small></span>)}</div><div className={frame.taskActions}>{own.map(side => { const key = side.team.id === data.match.teamA.id ? 'A' : 'B', recovered = data.pause?.recovered?.[key]?.ready; return <button className={!recovered ? styles.primary : ''} key={side.team.id} disabled={disabled} onClick={() => command('RECOVER', { teamId: side.team.id, ready: !recovered })}>{name(side.team)} {recovered ? uiText("仍需等待", uiLocale) : uiText("已恢复，可继续", uiLocale)}</button> })}{data.access.canResume && <button className={styles.primary} disabled={disabled || !data.access.canResume} onClick={() => command('RESUME')}>{uiText("确认游戏已恢复", uiLocale)}</button>}</div><small>{uiText("双方都确认可恢复后，由本场授权操作人记录游戏恢复。", uiLocale)}</small></>}
        {stage === 'REVIEW' && !data.result && <NextMapControl key={data.map?.order} data={data} disabled={disabled} mutate={mutate} />}
        {['REVIEW', 'ARCHIVED'].includes(stage) && <RoomResultPanel data={data} disabled={disabled} mutate={mutate} correction={stage === 'REVIEW' && data.canCorrectMapResult ? <span className={styles.resultCorrection}><MapResultControl key={'correct-' + data.map.order} data={data} disabled={disabled} mutate={mutate} correcting /></span> : null} />}
        {stage === 'REVIEW' && !data.result && data.canCorrectMapResult && <div className={styles.resultCorrection}><MapResultControl key={'correct-' + data.map.order} data={data} disabled={disabled} mutate={mutate} correcting /></div>}
      </section></>}
    </div><Team team={data.match.teamB} data={data} disabled={disabled} mutate={mutate} /></div>
    <footer className={workspace.toolbar}>
      <span><b>{data.actor.name}</b> · {data.actor.label}</span>
      <div><button type="button" onClick={() => setAuxiliary('communication')}>比赛沟通{data.requests?.some(request => request.status !== 'RESOLVED') ? ' · 有待处理协助' : ''}</button><button type="button" onClick={() => setAuxiliary('records')}>规则与记录</button>{(!data.result && (data.forfeit?.canPropose || data.forfeit?.history?.length > 0)) && <button type="button" onClick={() => setAuxiliary('forfeit')}>弃权处理</button>}<Link to={returnPath}>返回我的比赛 ↗</Link></div>
    </footer>
    <RoomPanelDialog open={auxiliary === 'communication'} close={() => setAuxiliary('')} title="比赛沟通与协助"><RoomCommunication key={data.actor.id + matchId} data={data} disabled={disabled} mutate={mutate} expanded setExpanded={() => setAuxiliary('')} channel={channel} setChannel={setChannel} messageLoader={messageLoader} /></RoomPanelDialog>
    <RoomPanelDialog open={auxiliary === 'records'} close={() => setAuxiliary('')} title="规则、选禁记录与转播安排"><RoomRulesPanel data={data} /><OpeningHistory key={data.actor.id + matchId} data={data} disabled={disabled} mutate={mutate} /><RoomCasterAssignments data={data} disabled={disabled} mutate={mutate} /></RoomPanelDialog>
    <RoomPanelDialog open={auxiliary === 'forfeit'} close={() => setAuxiliary('')} title="本场弃权处理"><RoomForfeitControl data={data} disabled={disabled} mutate={mutate} /></RoomPanelDialog>
    <dialog ref={dialog} aria-labelledby="weekly-pause-title" className={styles.dialog} onCancel={() => setPauseOpen(false)}><form onSubmit={async e => { e.preventDefault(); if (await command('PAUSE', { note: pauseNote.trim() })) { setPauseOpen(false); setPauseNote('') } }}><h2 id="weekly-pause-title">{uiText("记录游戏已暂停", uiLocale)}</h2><p>{uiText("先在游戏内完成暂停，再发布双方与解说可见的说明。私密详情留在赛管协助中。", uiLocale)}</p><label>{uiText("公开暂停说明", uiLocale)}<textarea value={pauseNote} onChange={e => setPauseNote(e.target.value)} required minLength={2} maxLength={500} /></label>{notice && <p role="status">{notice}</p>}<div className={styles.actions}><button type="button" onClick={() => setPauseOpen(false)}>{uiText("取消", uiLocale)}</button><button className={styles.primary} disabled={disabled || pauseNote.trim().length < 2}>{uiText("确认游戏已暂停", uiLocale)}</button></div></form></dialog>
  </main>
}

function LiveRoom({ matchId }) {
  const controller = useWeeklyLiveRoom(matchId)
  return <WeeklyRoomView matchId={matchId} controller={controller} />
}

export default function WeeklyLiveRoomPage() {
  const uiLocale = useUiLocale()
  const { matchId } = useParams(), { user, isBootstrapping } = useAuth()
  if (!user) return <main className={styles.emptyPage}><Link to="/me">{uiText("← 我的空间", uiLocale)}</Link><small>MATCH ROOM</small><h1>{uiText("进入本场比赛", uiLocale)}</h1><p>{isBootstrapping ? uiText("正在检查登录状态…", uiLocale) : uiText("登录后按本场身份查看准备、沟通与比赛进度。", uiLocale)}</p><AuthButton /></main>
  return <LiveRoom key={user.id + matchId} matchId={matchId} />
}

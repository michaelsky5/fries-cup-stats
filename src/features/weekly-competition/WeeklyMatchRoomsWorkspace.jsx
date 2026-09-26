import RoomGuideLink from '../room-guide/RoomGuideLink.jsx'
import { guideRoleForMatch } from '../room-guide/roomGuideModel.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { RegistrationDraftGuard, useRegistrationDraft, useRegistrationDraftActions } from '../event-registration/registrationDraftGuard.jsx'
import WeeklyMatchResponseDialog from './WeeklyMatchResponseDialog.jsx'
import WeeklyCoordinationPanel from './WeeklyCoordinationPanel.jsx'
import { fetchMyWeeklyMatchRooms, saveMyWeeklyMatchResponse } from './weeklyMatchRoomsApi.js'
import {
  buildWeeklyResponse,
  buildWeeklyRoomJourney,
  isWeeklyResponseReceipt,
  selectWeeklyRoom,
  sortWeeklyRooms,
  WEEKLY_RESPONSE_LABELS,
  weeklyResponseAccess,
  weeklyRoomError,
  weeklyRoomScore,
  weeklyRoomStatus,
  weeklyTeamName
} from './weeklyMatchRoomModel.js'
import styles from './WeeklyMatchRoomsWorkspace.module.css'

function formatTime(value, timezone) {
  if (!value) return '时间待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待定'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone || 'Asia/Shanghai', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date)
}

const draftLabel = ownTeam => `${weeklyTeamName(ownTeam.team)} 的赛果说明`

function TeamResponse({ room, ownTeam, readOnly, busy, saving, timezone, onRespond }) {
  const uiLocale = useUiLocale()
  const [note, setNote] = useState('')
  useRegistrationDraft(Boolean(note), { label: draftLabel(ownTeam), busy: saving, discard: () => setNote('') })
  const access = weeklyResponseAccess(room, ownTeam, { readOnly })
  const confirmation = ownTeam.confirmation
  const name = weeklyTeamName(ownTeam.team)
  const confirmed = confirmation?.status === 'CONFIRMED'
  const disputed = confirmation?.status === 'DISPUTED'

  return (
    <section className={styles.teamResponse} aria-label={uiText("{0} 本队响应", uiLocale, [name])}>
      <header><div><span>MY TEAM RESPONSE</span><h4>{name}</h4></div><strong data-tone={disputed ? 'red' : confirmed ? 'mint' : 'quiet'}>{WEEKLY_RESPONSE_LABELS[confirmation?.status] || uiText("待开启", uiLocale)}</strong></header>
      {confirmation?.actedAt ? <p className={styles.responseTime}>{uiText("最近响应 · ", uiLocale)}{formatTime(confirmation.actedAt, timezone)}</p> : null}
      {confirmation?.note ? <blockquote>{confirmation.note}</blockquote> : null}
      {access.allowed ? (
        <>
          <label className={styles.noteField}>
            <span>{uiText("赛果说明（争议必填）", uiLocale)}</span>
            <textarea aria-label={uiText("{0} 赛果说明（争议必填）", uiLocale, [name])} value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={3} disabled={busy} placeholder={uiText("如有争议，请说明涉及哪一局、计分问题及核对依据。", uiLocale)} />
            <small>{uiText("说明仅供本队与管理员查看，不会公开给对手。", uiLocale)}</small>
          </label>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} aria-label={uiText("确认 {0} 赛果", uiLocale, [name])} disabled={busy || confirmed} onClick={() => onRespond(room, ownTeam, 'CONFIRMED', note, () => setNote(''))}>{confirmed ? uiText("本队已确认", uiLocale) : disputed ? uiText("撤回争议并确认", uiLocale) : uiText("确认本队赛果", uiLocale)}</button>
            <button type="button" className={styles.dangerButton} aria-label={uiText("提交 {0} 争议", uiLocale, [name])} disabled={busy} onClick={() => onRespond(room, ownTeam, 'DISPUTED', note, () => setNote(''))}>{disputed ? uiText("更新争议说明", uiLocale) : uiText("提出争议", uiLocale)}</button>
          </div>
        </>
      ) : <><p className={styles.readOnlyNotice}>{access.reason}</p>{note && <aside className={styles.savedDraft}><strong>{uiText("尚未提交的说明", uiLocale)}</strong><p>{uiText("当前状态不能提交，已保留你的输入供核对。", uiLocale)}</p><blockquote>{note}</blockquote><button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => setNote('')}>{uiText("放弃这段说明", uiLocale)}</button></aside>}</>}
    </section>
  )
}

export default function WeeklyMatchRoomsWorkspace(props) {
  const uiLocale = useUiLocale()
  const { user } = useAuth()
  return <RegistrationDraftGuard key={`${props.seasonId}:${user?.id || ''}`} title={uiText("还有未提交的赛果说明", uiLocale)}><WeeklyMatchChannel {...props} /></RegistrationDraftGuard>
}

function WeeklyMatchChannel({ seasonId, readOnly = true, withSeason, tasksVisible = false, preparationVisible = false, children = null, onActivityChange }) {
  const uiLocale = useUiLocale()
  const roomIndexId = useId()
  const [roomIndexOpen, setRoomIndexOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const { confirmDiscard } = useRegistrationDraftActions()
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [unsupported, setUnsupported] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [pending, setPending] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const requestId = useRef(0)
  const requestController = useRef(null)
  const submitLock = useRef(false)
  const mounted = useRef(false)

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    setLoading(true)
    setLoadError(null)
    const timeout = setTimeout(() => controller.abort(new DOMException('同步超时', 'TimeoutError')), 15_000)
    try {
      const data = await fetchMyWeeklyMatchRooms(seasonId, { signal: controller.signal })
      if (id !== requestId.current) return false
      if (data?.season?.id !== seasonId || !Array.isArray(data.rooms) || !Array.isArray(data.teams)) {
        throw new Error('Invalid weekly match-room workspace')
      }
      setWorkspace(data)
      setUnsupported(false)
      return true
    } catch (error) {
      if (id !== requestId.current) return false
      if (error?.data?.error === 'WEEKLY_COMPETITION_DISABLED') {
        setUnsupported(true)
        setWorkspace(null)
      } else {
        setLoadError(error)
        if ([401, 403].includes(error?.status)) setWorkspace(null)
      }
      return false
    } finally {
      clearTimeout(timeout)
      if (id === requestId.current) setLoading(false)
    }
  }, [seasonId])

  useEffect(() => {
    mounted.current = true
    refresh()
    return () => {
      mounted.current = false
      requestId.current += 1
      requestController.current?.abort()
    }
  }, [refresh])

  const currentWorkspace = workspace?.season?.id === seasonId ? workspace : null
  const operatorView = Boolean(currentWorkspace?.operatorView)
  const rooms = useMemo(() => sortWeeklyRooms(currentWorkspace?.rooms), [currentWorkspace])
  const selectedRoomId = searchParams.get('weeklyMatch') || ''
  const room = selectWeeklyRoom(rooms, selectedRoomId)
  const roomCardRef = useRef(null)
  const visibleRoomId = room?.id
  useEffect(() => {
    if (!selectedRoomId || selectedRoomId !== visibleRoomId) return undefined
    const frame = requestAnimationFrame(() => { roomCardRef.current?.scrollIntoView({ block: 'start' }); roomCardRef.current?.focus({ preventScroll: true }) })
    return () => cancelAnimationFrame(frame)
  }, [selectedRoomId, visibleRoomId])
  const effectiveReadOnly = readOnly || currentWorkspace?.featureAccess !== 'WRITE' ||
    currentWorkspace?.accessMode !== 'WRITE' || currentWorkspace?.season?.status === 'ARCHIVED'
  const controlsBusy = loading || submitting || Boolean(loadError)
  const journey = buildWeeklyRoomJourney(room, { readOnly: effectiveReadOnly })
  const roomState = journey.state
  const timezone = currentWorkspace?.season?.timezone || 'Asia/Shanghai'
  const disputedCount = rooms.filter(item => item.confirmationState === 'DISPUTED').length
  const pendingCount = rooms.filter(item => item.myTeams?.some(team => (
    team.confirmation?.status === 'PENDING' && weeklyResponseAccess(item, team, { readOnly: effectiveReadOnly }).allowed
  ))).length
  const taskUrl = withSeason ? withSeason('/me?section=tasks') : `/me?section=tasks&season=${encodeURIComponent(seasonId)}`
  const preparationUrl = withSeason ? withSeason('/me?section=overview') : `/me?section=overview&season=${encodeURIComponent(seasonId)}`

  function selectRoom(matchId) {
    setFeedback(null)
    setSearchParams(current => {
      const next = new URLSearchParams(current)
      if (matchId) next.set('weeklyMatch', matchId)
      else next.delete('weeklyMatch')
      return next
    })
  }

  async function prepareResponse(selected, ownTeam, status, note, onSaved) {
    if (controlsBusy) return
    const result = buildWeeklyResponse(selected, ownTeam.team.id, status, note, { readOnly: effectiveReadOnly })
    if (result.error) {
      setFeedback({ error: true, message: result.error })
      return
    }
    if (!await confirmDiscard({ exceptLabels: [draftLabel(ownTeam)] }) || !mounted.current || submitLock.current) return
    setFeedback(null)
    setPending({
      matchId: selected.id,
      fingerprint: selected.resultFingerprint,
      input: result.input,
      teamName: weeklyTeamName(ownTeam.team),
      matchup: `${weeklyTeamName(selected.teamA)} vs ${weeklyTeamName(selected.teamB)}`,
      score: weeklyRoomScore(selected),
      onSaved,
      withdrawingDispute: ownTeam.confirmation?.status === 'DISPUTED'
    })
  }

  async function submitResponse() {
    if (!pending || submitLock.current || controlsBusy) return
    const latest = rooms.find(item => item.id === pending.matchId)
    if (!latest || latest.revision !== pending.input.expectedRevision || latest.resultFingerprint !== pending.fingerprint) {
      setPending(null)
      setFeedback({ error: true, message: '赛果已变化，请重新核对后再提交。' })
      return
    }
    const validation = buildWeeklyResponse(latest, pending.input.confirmingTeamId, pending.input.status, pending.input.note, { readOnly: effectiveReadOnly })
    if (validation.error) {
      setPending(null)
      setFeedback({ error: true, message: validation.error })
      return
    }
    submitLock.current = true
    setSubmitting(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new DOMException('提交结果未确认', 'TimeoutError')), 15_000)
    try {
      const receipt = await saveMyWeeklyMatchResponse(pending.matchId, pending.input, { signal: controller.signal })
      if (!mounted.current) return
      if (!isWeeklyResponseReceipt(receipt, pending)) throw new Error('Unconfirmed response receipt')
      clearTimeout(timeout)
      pending.onSaved?.()
      setPending(null)
      const refreshed = await refresh()
      if (!mounted.current) return
      setFeedback({
        error: !refreshed,
        message: !refreshed ? '响应已经保存，但最新状态未能同步，请刷新后继续。'
          : pending.input.status === 'DISPUTED' ? '争议已提交给周赛管理员，标准积分结算已冻结。'
            : '本队已确认当前赛果。双方确认后，仍需由管理员按规则结算。'
      })
    } catch (error) {
      if (!mounted.current) return
      setPending(null)
      const refreshed = await refresh()
      if (mounted.current) setFeedback({ error: true, message: error?.status && error.status < 500 ? weeklyRoomError(error)
        : `暂时无法确认本次提交结果。${refreshed ? '最新状态已同步，请核对本队响应记录后再决定是否重试。' : '请先刷新比赛资料，核对本队响应记录后再继续。'}` })
    } finally {
      clearTimeout(timeout)
      submitLock.current = false
      if (mounted.current) { setSubmitting(false); onActivityChange?.() }
    }
  }

  if (unsupported) return children

  return (
    <section id="weekly-match-rooms" className={styles.workspace} aria-label={uiText("周赛比赛房间", uiLocale)} aria-busy={loading}>
      <header className={styles.workHeader}>
        <div><span>WEEKLY MATCHES</span><h2>{uiText("我的周赛比赛", uiLocale)}</h2></div>
        <div className={styles.headerActions}><RoomGuideLink season={seasonId} />
          {(tasksVisible || preparationVisible) && <nav className={styles.returnLinks} aria-label={uiText("参赛流程导航", uiLocale)}>{tasksVisible && <Link to={taskUrl}>{uiText("← 任务中心", uiLocale)}</Link>}{preparationVisible && <Link to={preparationUrl}>{uiText("参赛准备 ↗", uiLocale)}</Link>}</nav>}
        <button type="button" className={styles.secondaryButton} disabled={loading || submitting} onClick={async () => { if (await confirmDiscard() && mounted.current && !submitLock.current) { setFeedback(null); refresh() } }}>{loading ? uiText("同步中…", uiLocale) : uiText("刷新比赛资料", uiLocale)}</button>
        </div>
      </header>

      {loadError ? <p className={styles.message} data-error="true" role="alert">{weeklyRoomError(loadError)} <RoomGuideLink season={seasonId} scenario="access" label="无法操作？查看指南" />{currentWorkspace ? uiText(" 当前显示上次同步记录，重新同步前不可提交。", uiLocale) : ''}</p> : null}
      {feedback ? <div className={styles.message} data-error={feedback.error ? 'true' : 'false'} role={feedback.error ? 'alert' : 'status'}><p>{feedback.message}</p>{!feedback.error && tasksVisible && <Link to={taskUrl}>{uiText("返回任务中心，查看下一步 →", uiLocale)}</Link>}</div> : null}
      {!currentWorkspace && loading ? <div className={styles.state} role="status"><span>SYNCING TEAM CHANNEL</span><strong>{uiText("正在同步获授权比赛与赛果状态", uiLocale)}</strong><p>{uiText("同步完成前，不会把未知状态显示成“没有比赛”或“已确认”。", uiLocale)}</p></div> : null}

      {currentWorkspace ? (
        <>
          <div className={styles.channelRail}>
            <strong>{currentWorkspace.season.name}</strong>
            <span>{operatorView ? uiText("本场工作人员 · 在比赛房按职责操作", uiLocale) : effectiveReadOnly ? uiText("只读 · 由队长或经理响应", uiLocale) : uiText("队长 / 经理 · 可代表本队响应", uiLocale)}</span>
            <span>{timezone === 'Asia/Shanghai' ? uiText("时间均为北京时间", uiLocale) : timezone}</span>
          </div>
          {rooms.length === 0 ? <div className={styles.state}><span>{currentWorkspace.teams.length ? 'WAITING FOR PUBLISHED MATCHES' : 'NO TEAM LINK'}</span><strong>{currentWorkspace.teams.length ? uiText("暂时没有已发布的本队周赛", uiLocale) : uiText("当前账号尚未绑定本赛季队伍", uiLocale)}</strong><p>{currentWorkspace.teams.length ? uiText("管理员发布配对后，比赛会出现在这里；草稿和其他队伍的比赛不会显示。", uiLocale) : uiText("请联系周赛管理员完成邀请认领，不需要重新创建队伍。", uiLocale)}</p></div> : (
            <>
              <div className={styles.layout}>
                <aside className={styles.roomIndex}>
                  <button type="button" className={styles.roomSwitcher} aria-expanded={roomIndexOpen} aria-controls={roomIndexId} onClick={() => setRoomIndexOpen(value => !value)}>{uiText("切换比赛 ", uiLocale)}<span>{uiText("共 ", uiLocale)}{rooms.length}{uiText(" 场 ", uiLocale)}{roomIndexOpen ? '−' : '+'}</span></button>
                  <div id={roomIndexId} className={styles.roomIndexContent} data-expanded={roomIndexOpen}>
                    <div className={styles.roomSummary}><strong>{operatorView ? uiText("获授权比赛", uiLocale) : uiText("本队比赛", uiLocale)} <b>{rooms.length}</b></strong><span>{effectiveReadOnly ? uiText("赛果响应仅可查看", uiLocale) : uiText("{0} 场待确认赛果", uiLocale, [pendingCount])}</span>{disputedCount > 0 && <span data-alert="true">{disputedCount}{uiText(" 场争议处理中", uiLocale)}</span>}</div>
                <nav className={styles.roomList} aria-label={uiText("获授权周赛比赛", uiLocale)}>
                  {rooms.map((item, index) => (
                    <button type="button" key={item.id} aria-pressed={room?.id === item.id} disabled={submitting} onClick={() => { selectRoom(item.id); setRoomIndexOpen(false) }}>
                      <span>{String(index + 1).padStart(2, '0')} / {item.cycle?.code} · W{item.week?.weekNumber}</span>
                      <strong>{weeklyTeamName(item.teamA)} vs {weeklyTeamName(item.teamB)}</strong>
                      <small>{formatTime(item.scheduledAt, timezone)}</small><em>{weeklyRoomStatus(item, { readOnly: effectiveReadOnly }).label}</em>
                    </button>
                  ))}
                </nav>
                  </div>
                </aside>
                {room ? (
                  <article ref={roomCardRef} tabIndex={-1} className={styles.roomCard} aria-label={uiText("{0} 对阵 {1}", uiLocale, [weeklyTeamName(room.teamA), weeklyTeamName(room.teamB)])}>
                    <header className={styles.matchHeader}>
                      <div className={styles.matchMeta}><span>{room.cycle?.name} · {room.week?.label || uiText("第 {0} 周", uiLocale, [room.week?.weekNumber])}</span><strong data-tone={roomState.tone}>{roomState.label}</strong></div>
                      <h3><span>{weeklyTeamName(room.teamA)}</span><b>{journey.preMatch ? 'VS' : weeklyRoomScore(room)}</b><span>{weeklyTeamName(room.teamB)}</span></h3>
                      <p>{room.displayName} · {formatTime(room.scheduledAt, timezone)}{room.roleLabel ? ` · ${room.roleLabel}` : ''}{!journey.preMatch ? uiText(" · 赛果修订 {0}", uiLocale, [room.revision]) : ''}</p>
                      <Link to={`/me/matches/${encodeURIComponent(room.id)}/room`}>{uiText("进入比赛房 · 准备与沟通 ↗", uiLocale)}</Link> <RoomGuideLink season={seasonId} match={room.id} role={guideRoleForMatch(room)} step={journey.preMatch ? "entry" : "result"} />
                    </header>
                    <ol className={styles.resultRoute} aria-label={journey.preMatch ? uiText("比赛日进度", uiLocale) : uiText("赛果处理进度", uiLocale)}>
                      {journey.stages.map((stage, index) => <li key={stage.key} data-state={stage.state}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><strong>{stage.label}</strong></li>)}
                    </ol>
                    {journey.phase !== 'scheduled' && <p className={styles.roomNotice} data-tone={roomState.tone}>{roomState.detail}</p>}
                    {journey.preMatch && !room.myTeams?.length && <p className={styles.roomNotice}>{uiText("进入比赛房查看房间安排、比赛进度与沟通记录，并按本场职责操作。队伍准备由双方代表确认。", uiLocale)}</p>}
                    {journey.preMatch ? <>{(room.myTeams || []).map(ownTeam => <WeeklyCoordinationPanel key={`${room.id}:${ownTeam.team.id}`} weekId={room.week.id} teamId={ownTeam.team.id} matchId={room.id} readOnly={Boolean(loadError) || currentWorkspace?.featureAccess !== 'WRITE'} onActivityChange={onActivityChange} />)}</> : <div className={styles.responses}>
                      {(room.myTeams || []).map(ownTeam => <TeamResponse key={`${room.id}:${ownTeam.team.id}`} room={room} ownTeam={ownTeam} readOnly={effectiveReadOnly || Boolean(loadError)} busy={controlsBusy} saving={submitting && pending?.input.confirmingTeamId === ownTeam.team.id} timezone={timezone} onRespond={prepareResponse} />)}
                      {[room.teamA, room.teamB].filter(team => team && !room.myTeams?.some(own => own.team?.id === team.id)).map(team => {
                        const response = room.otherTeamResponses?.find(item => item.confirmingTeam?.id === team.id)
                        return <section key={team.id} className={styles.opponentResponse} aria-label={uiText("{0} 响应状态", uiLocale, [weeklyTeamName(team)])}><span>{operatorView ? 'TEAM RESPONSE' : 'OPPONENT RESPONSE'}</span><h4>{weeklyTeamName(team)}</h4><strong data-tone={response?.status === 'DISPUTED' ? 'red' : 'quiet'}>{WEEKLY_RESPONSE_LABELS[response?.status] || uiText("等待开启确认", uiLocale)}</strong><p>{uiText("此处展示队伍响应状态，争议说明由周赛管理员复核。", uiLocale)}</p></section>
                      })}
                    </div>}
                    {!journey.preMatch && (room.myTeams || []).map(ownTeam => <WeeklyCoordinationPanel key={`${room.id}:${ownTeam.team.id}`} weekId={room.week.id} teamId={ownTeam.team.id} matchId={room.id} showPreparation={false} readOnly={Boolean(loadError) || currentWorkspace?.featureAccess !== 'WRITE'} onActivityChange={onActivityChange} />)}
                    <footer className={styles.matchFoot}><p>{journey.preMatch ? uiText("赛程如有调整，请以最新发布安排为准。", uiLocale) : operatorView ? uiText("双方赛果响应与管理员结算分别记录。请进入比赛房按职责处理。", uiLocale) : uiText("本队响应与管理员结算分别记录；比分更正可提交赛果争议，由周赛管理员在系统内处理。", uiLocale)}</p>{tasksVisible && !journey.preMatch && <Link to={taskUrl}>{uiText("回到待办 →", uiLocale)}</Link>}</footer>
                  </article>
                ) : <div className={styles.state}><span>ROOM NOT AVAILABLE</span><strong>{uiText("该比赛不在当前账号可见范围内", uiLocale)}</strong><p>{uiText("请从比赛列表选择获授权比赛，或清除旧的比赛链接。", uiLocale)}</p><button type="button" className={styles.secondaryButton} onClick={() => selectRoom('')}>{uiText("查看可见比赛", uiLocale)}</button></div>}
              </div>
            </>
          )}
        </>
      ) : null}
      {pending ? <WeeklyMatchResponseDialog pending={pending} busy={submitting} onConfirm={submitResponse} onCancel={() => setPending(null)} /> : null}
    </section>
  )
}

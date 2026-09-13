import WeeklyCycleEnrollment from './WeeklyCycleEnrollment.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import WeeklyParticipationChangeDialog from './WeeklyParticipationChangeDialog.jsx'
import {
  fetchMyWeeklyCompetition,
  saveMyWeeklyCore,
  saveMyWeeklyParticipation,
  saveMyWeeklyRoster
} from './weeklyCompetitionApi.js'
import styles from '../account-ui/SignalWeeklyTeam.module.css'
import { getWeeklyRosterCheck, withParticipationActionContext } from '../account-ui/participationJourneyModel.js'
import { buildWeeklyPreparation, getWeeklyFocusStep, resolveWeeklySelection, weeklyConfirmationWindow, weeklyTeamDestination } from './weeklyPreparationModel.js'
import WeeklyCoordinationPanel from './WeeklyCoordinationPanel.jsx'
import { RegistrationDraftGuard, useRegistrationDraft, useRegistrationDraftActions } from '../event-registration/registrationDraftGuard.jsx'

const PARTICIPATION_LABELS = {
  PENDING: '待确认',
  CONFIRMED: '确认参赛',
  DECLINED: '本周不参赛',
  WITHDRAWN: '撤回确认'
}

const STATUS_LABELS = {
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  LOCKED: '已锁定',
  SUPERSEDED: '历史版本'
}

function selectedPlayerIds(record) {
  return (record?.members || []).map(member => member.playerId)
}

function errorText(error, fallback) {
  const messages = {
    CORE_SELECTION_COUNT_INVALID: '锁定周期核心时，人数必须符合本周期规则。',
    CORE_SELECTION_LOCKED: '周期核心已经锁定，如需更改请联系周赛管理员并说明原因。',
    CORE_SELECTION_WINDOW_CLOSED: '当前不在周期核心登记阶段。',
    WEEKLY_CONFIRMATION_CLOSED: '本周确认窗口尚未开放或已经关闭。',
    WEEKLY_CONFIRMATION_DEADLINE_PASSED: '本周确认截止时间已过，请联系周赛管理员补录。',
    WEEKLY_ROSTER_COUNT_INVALID: '周名单人数不符合当前规则。',
    WEEKLY_ROSTER_CORE_REQUIRED: '周名单需要包含规定数量的周期核心选手。',
    WEEKLY_ROSTER_LOCKED: '本周名单已经锁定，如需更改请联系周赛管理员。',
    WEEKLY_REVISION_CONFLICT: '资料刚刚发生变化，请刷新后重试。',
    ACCOUNT_PORTAL_NOT_AVAILABLE: '当前账号的赛季入口已关闭，请联系周赛管理员。',
    ACCOUNT_FEATURE_HIDDEN: '本赛季暂未开放队伍工作台。',
    ACCOUNT_FEATURE_READ_ONLY: '本赛季的队伍工作台目前只允许查看。',
    WEEKLY_ACCOUNT_IDENTITY_REQUIRED: '当前账号还没有可读取的周赛队伍身份。'
  }
  return messages[error?.data?.error] || error?.data?.message || error?.message || fallback
}

function PlayerPicker({ players, selectedIds, coreIds, disabled, readOnly = false, onChange, referenceLabel = "周期核心" }) {
  const uiLocale = useUiLocale()
  const selected = new Set(selectedIds)
  if (!players.length) return <div className={styles.empty}>{uiText("队伍当前没有可选择的有效选手。", uiLocale)}</div>
  if (readOnly && !selectedIds.length) return <p>{uiText("尚无已保存名单。", uiLocale)}</p>
  const visiblePlayers = readOnly ? players.filter(player => selected.has(player.id)) : players
  return (
    <div className={styles.playerPicker}>
      <div className={styles.playerColumns} aria-hidden="true"><span /><span>{uiText("选手 / BattleTag", uiLocale)}</span><span>{uiText("职责", uiLocale)}</span><span>{uiText(referenceLabel, uiLocale)}</span></div>
      <ul className={styles.playerList} aria-label={readOnly ? uiText("已保存的选手名单", uiLocale) : uiText("选择名单中的选手", uiLocale)}>
      {visiblePlayers.map(player => {
        const Row = readOnly ? 'div' : 'label'
        return <li key={player.id}><Row className={styles.playerRow} data-selected={selected.has(player.id)} data-read-only={readOnly}>
          {readOnly ? <span className={styles.playerSelected} aria-hidden="true">✓</span> : <input
            type="checkbox"
            checked={selected.has(player.id)}
            disabled={disabled}
            onChange={event => onChange(event.target.checked
              ? [...selectedIds, player.id]
              : selectedIds.filter(id => id !== player.id))}
          />}
          <span className={styles.playerIdentity}><strong>{player.nickname || player.displayName}</strong><small>{player.battleTag || uiText("未填写 BattleTag", uiLocale)}</small></span>
          <span className={styles.playerRole}>{({ DPS: '输出', TANK: '重装', SUPPORT: '支援', SUP: '支援' }[player.role] || player.role || uiText("未标注", uiLocale))}</span>
          <em className={styles.coreMarker} data-core={coreIds.has(player.id)}>{coreIds.has(player.id) ? uiText(referenceLabel === "上次参赛" ? "上次参赛" : "核心", uiLocale) : '—'}</em>
        </Row></li>
      })}
      </ul>
    </div>
  )
}

function SaveFeedback({ notice, kind, plan, nextHref, progressHref, overviewHref }) {
  const uiLocale = useUiLocale()
  const feedbackRef = useRef(null)
  const visible = notice?.kind === kind && notice.planId === plan?.id
  useEffect(() => {
    if (!visible) return
    feedbackRef.current?.focus({ preventScroll: true })
    feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }, [visible, notice])
  if (!visible) return null
  return <div ref={feedbackRef} className={styles.saveFeedback} tabIndex={-1} role="status">
    <strong><span aria-hidden="true">✓</span> {notice.message}</strong>
    <p>{uiText(plan.guidance.detail, uiLocale)}</p>
    <nav aria-label={uiText("保存后的下一步", uiLocale)}>{plan.next && plan.next.key !== kind ? <Link className={styles.nextStep} to={nextHref}>{uiText("继续", uiLocale)}{uiText(plan.next.title, uiLocale)} →</Link> : null}<Link to={progressHref}>{uiText("查看本次参赛进度 ↗", uiLocale)}</Link><Link to={overviewHref}>{uiText("返回我的空间", uiLocale)}</Link></nav>
  </div>
}

export default function WeeklyCompetitionWorkspace({ seasonId, readOnly = false, onActivityChange }) {
  const uiLocale = useUiLocale()
  const { user } = useAuth()
  return <RegistrationDraftGuard key={`${seasonId}:${user?.id || ''}`} title={uiText("还有未保存的周赛资料", uiLocale)}><WeeklyTeamChannel key={`${seasonId}:${user?.id || ''}`} seasonId={seasonId} readOnly={readOnly} user={user} onActivityChange={onActivityChange} /></RegistrationDraftGuard>
}

function WeeklyTeamChannel({ seasonId, readOnly, user, onActivityChange }) {
  const uiLocale = useUiLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const { confirmDiscard } = useRegistrationDraftActions()
  const mounted = useRef(false)
  const loadController = useRef(null)
  const loadSequence = useRef(0)
  const writeLock = useRef(false)
  const errorRef = useRef(null)
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stale, setStale] = useState(false)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState('')
  const [now, setNow] = useState(Date.now)
  const [defaultSelection, setDefaultSelection] = useState({})
  const [coreIds, setCoreIds] = useState([])
  const [coreStatus, setCoreStatus] = useState('DRAFT')
  const [participationStatus, setParticipationStatus] = useState('PENDING')
  const [availabilityNote, setAvailabilityNote] = useState('')
  const [rosterIds, setRosterIds] = useState([])
  const [participationChange, setParticipationChange] = useState(null)
  const [defaultFocus, setDefaultFocus] = useState(null)

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!seasonId || !user?.id) return
    loadController.current?.abort()
    const controller = new AbortController()
    loadController.current = controller
    const sequence = ++loadSequence.current
    const isCurrent = () => mounted.current && !controller.signal.aborted && sequence === loadSequence.current
    if (!quiet) setLoading(true)
    setError('')
    try {
      const next = await fetchMyWeeklyCompetition(seasonId, { signal: controller.signal })
      if (!isCurrent()) return
      if (next?.userId !== user.id || next?.season?.id !== seasonId || !Array.isArray(next?.cycles) || !Array.isArray(next?.teams)) {
        setWorkspace(null)
        throw new Error('返回的账号或赛季与当前工作台不一致，请刷新重试。')
      }
      setWorkspace(next)
      setStale(false)
      setDefaultSelection(current => {
        let selected = resolveWeeklySelection(next, current)
        if (selected.invalid) selected = resolveWeeklySelection(next)
        return { cycleId: selected.cycle?.id, entryId: selected.entry?.id, weekId: selected.weekRecord?.week?.id }
      })
    } catch (nextError) {
      if (!isCurrent()) return
      if ([401, 403, 423].includes(nextError?.status)) setWorkspace(null)
      setStale(true)
      setError(errorText(nextError, '周赛资料同步失败。'))
      throw nextError
    } finally {
      if (isCurrent() && !quiet) setLoading(false)
    }
  }, [seasonId, user?.id])

  useEffect(() => {
    mounted.current = true
    setWorkspace(null)
    refresh().catch(() => {})
    return () => {
      mounted.current = false
      loadController.current?.abort()
      loadSequence.current += 1
    }
  }, [refresh])

  const explicitSelection = searchParams.has('cycle') || searchParams.has('entry') || searchParams.has('week')
  const { cycle, entry, weekRecord, invalid: invalidSelection } = resolveWeeklySelection(workspace, explicitSelection ? {
    cycleId: searchParams.get('cycle'), entryId: searchParams.get('entry'), weekId: searchParams.get('week')
  } : defaultSelection, now)
  const cycleId = cycle?.id || ''
  const entryId = entry?.id || ''
  const weekId = weekRecord?.week?.id || ''
  const requestedStep = searchParams.get('step')
  const participation = weekRecord?.participation || null
  const coreDraft = entry?.coreSelections?.find(item => item.status === 'DRAFT') || null
  const coreLocked = entry?.coreSelections?.find(item => item.status === 'LOCKED') || null
  const currentCore = coreDraft || coreLocked
  const rosterDraft = participation?.rosters?.find(item => ['DRAFT', 'SUBMITTED'].includes(item.status)) || null
  const rosterLocked = participation?.rosters?.find(item => item.status === 'LOCKED') || null
  const currentRoster = rosterDraft || rosterLocked
  const rules = weekRecord?.rules || cycle?.rules || { corePlayerCount: 3, rosterMin: 5, rosterMax: 7, minimumCoreInWeeklyRoster: 3 }
  const previousAppearance = rules.rosterContinuityMode === 'PREVIOUS_APPEARANCE'
  const continuity = weekRecord?.continuity
  const lockedCoreIds = useMemo(() => new Set(previousAppearance ? continuity?.playerIds || [] : selectedPlayerIds(coreLocked)), [coreLocked, previousAppearance, continuity])
  const synchronized = workspace?.userId === user?.id && workspace?.season?.id === seasonId
  const entryWritable = synchronized && !stale && !readOnly && !invalidSelection && workspace.season.status !== 'ARCHIVED' && !['CLOSED', 'CANCELLED'].includes(cycle?.status) && entry?.accessMode === 'WRITE'
  const confirmationOpen = weekRecord?.week?.status === 'CONFIRMATION_OPEN' && weeklyConfirmationWindow(weekRecord.week, now) === 'open'
  const coreWritable = !previousAppearance && entryWritable && cycle?.status === 'REGISTRATION' && !coreLocked
  const participationWritable = entryWritable && confirmationOpen
  const rosterWritable = entryWritable && confirmationOpen && participation?.status === 'CONFIRMED' && !rosterLocked

  useEffect(() => {
    setCoreIds(selectedPlayerIds(currentCore))
    setCoreStatus(currentCore?.status === 'LOCKED' ? 'LOCKED' : 'DRAFT')
  }, [entry, currentCore])

  useEffect(() => {
    setParticipationStatus(participation?.status || 'PENDING')
    setAvailabilityNote(participation?.availabilityNote || '')
    setRosterIds(selectedPlayerIds(currentRoster))
  }, [currentRoster, participation])

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    if (loading || invalidSelection || !['core', 'participation', 'roster'].includes(requestedStep)) return
    const element = document.getElementById(`weekly-${requestedStep}`)
    element?.scrollIntoView({ block: 'start' })
    element?.focus({ preventScroll: true })
  }, [loading, invalidSelection, requestedStep, cycleId, entryId, weekId])
  const changeSelection = (field, value) => {
    setNotice(null)
    const next = new URLSearchParams(searchParams)
    const requested = { cycleId, entryId, weekId, [`${field}Id`]: value }
    if (field === 'cycle') delete requested.entryId
    if (field !== 'week') delete requested.weekId
    const selected = resolveWeeklySelection(workspace, requested, now)
    for (const [key, id] of [['cycle', selected.cycle?.id], ['entry', selected.entry?.id], ['week', selected.weekRecord?.week?.id]]) {
      if (id) next.set(key, id)
      else next.delete(key)
    }
    next.delete('step')
    setSearchParams(next)
  }
  const resetCore = () => { setCoreIds(selectedPlayerIds(currentCore)); setCoreStatus(currentCore?.status === 'LOCKED' ? 'LOCKED' : 'DRAFT') }
  const resetParticipation = () => { setParticipationStatus(participation?.status || 'PENDING'); setAvailabilityNote(participation?.availabilityNote || '') }
  const resetRoster = () => setRosterIds(selectedPlayerIds(currentRoster))
  const sameIds = (left, right) => JSON.stringify([...left].sort()) === JSON.stringify([...right].sort())
  const coreDirty = !sameIds(coreIds, selectedPlayerIds(currentCore)) || coreStatus !== (currentCore?.status === 'LOCKED' ? 'LOCKED' : 'DRAFT')
  const participationDirty = participationStatus !== (participation?.status || 'PENDING') || availabilityNote !== (participation?.availabilityNote || '')
  const rosterDirty = !sameIds(rosterIds, selectedPlayerIds(currentRoster))
  const rosterCheck = getWeeklyRosterCheck(rosterIds, lockedCoreIds, rules, entry?.players || [], continuity)
  const progressParams = new URLSearchParams(searchParams)
  for (const key of ['cycle', 'entry', 'week', 'step', 'progress', 'task', 'weeklyMatch', 'view']) progressParams.delete(key)
  progressParams.set('section', 'overview')
  progressParams.set('journey', 'preparation:' + entryId + ':' + (weekId || 'cycle'))
  const progressHref = '/me?' + progressParams
  const overviewParams = new URLSearchParams(progressParams)
  overviewParams.delete('journey')
  const currentPlan = buildWeeklyPreparation(workspace, { seasonId, userId: user?.id, readOnly, now }).plans.find(plan => plan.id === entryId + ':' + (weekId || 'cycle'))
  const nextHref = currentPlan?.next ? withParticipationActionContext(currentPlan.next.actionUrl, searchParams) : ''
  const focusScope = cycleId + ':' + entryId + ':' + weekId
  const initialStep = getWeeklyFocusStep(currentPlan)
  const hasPlan = Boolean(currentPlan)
  const activeStep = requestedStep ? getWeeklyFocusStep(currentPlan, requestedStep) : defaultFocus?.scope === focusScope ? defaultFocus.step : initialStep
  useEffect(() => {
    if (hasPlan) setDefaultFocus(current => current?.scope === focusScope ? current : { scope: focusScope, step: initialStep })
  }, [hasPlan, focusScope, initialStep])
  const stepHref = key => withParticipationActionContext(weeklyTeamDestination(cycleId, entryId, weekId, key), searchParams)
  const feedbackNotice = { core: coreDirty, participation: participationDirty, roster: rosterDirty }[notice?.kind] ? null : notice
  const feedbackProps = { notice: feedbackNotice, plan: currentPlan, nextHref, progressHref, overviewHref: '/me?' + overviewParams }
  useEffect(() => {
    if (!error) return
    errorRef.current?.focus({ preventScroll: true })
    errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }, [error])
  useRegistrationDraft(synchronized && !loading && coreDirty, { label: "周期核心", busy: busy === 'core', discard: resetCore })
  useRegistrationDraft(synchronized && !loading && participationDirty, { label: "本周参赛确认", busy: busy === 'participation', discard: resetParticipation })
  useRegistrationDraft(synchronized && !loading && rosterDirty, { label: "本周名单", busy: busy === 'roster', discard: resetRoster })

  async function runAction(kind, action, successMessage) {
    if (writeLock.current || !entryWritable) return
    if (!(await confirmDiscard({ exceptLabels: [{ core: '周期核心', participation: '本周参赛确认', roster: '本周名单' }[kind]] }))) return
    if (writeLock.current || !mounted.current) return
    writeLock.current = true
    let saved = false
    setBusy(kind)
    setError('')
    setNotice(null)
    try {
      await action()
      saved = true
      if (!mounted.current) return
      await refresh({ quiet: true })
      if (!mounted.current) return
      setNotice({ kind, planId: entryId + ':' + (weekId || 'cycle'), message: successMessage })
    } catch (nextError) {
      if (!mounted.current) return
      if ([401, 403, 423].includes(nextError?.status)) setWorkspace(null)
      const uncertain = !nextError?.status || nextError.status >= 500
      const changed = ['WEEKLY_REVISION_CONFLICT', 'WEEKLY_WRITE_CONFLICT', 'WEEKLY_ROSTER_LOCKED', 'CORE_SELECTION_LOCKED'].includes(nextError?.data?.error)
      if (saved || uncertain || changed) setStale(true)
      setError(saved
        ? '保存已完成，但最新资料同步失败。请刷新周赛资料后再操作，不要重复提交。'
        : uncertain ? '暂时不能确认保存结果，请先刷新周赛资料再操作。' : errorText(nextError, '暂时无法保存周赛资料。'))
    } finally {
      writeLock.current = false
      if (mounted.current) { setBusy(''); setParticipationChange(null); onActivityChange?.() }
    }
  }

  if (loading || (workspace && !synchronized)) {
    return <section className={styles.state}><span>SYNCING WEEKLY COMPETITION</span><strong>{uiText("正在读取本队周赛资料", uiLocale)}</strong><p>{uiText("同步完成前不会显示空名单或错误的待确认状态。", uiLocale)}</p></section>
  }

  if (error && !workspace) {
    return <section className={styles.state} role="alert"><span>WEEKLY ACCESS / SYNC</span><strong>{uiText("暂时无法读取周赛资料", uiLocale)}</strong><p>{error}</p><div className={styles.refreshRow}><button type="button" onClick={() => refresh().catch(() => {})}>{uiText("刷新周赛资料", uiLocale)}</button></div></section>
  }

  if (!workspace?.teams?.length) {
    return <section className={styles.state} data-tone="quiet"><span>NO WEEKLY TEAM LINK</span><strong>{uiText("当前账号还没有已连接的周赛队伍", uiLocale)}</strong><p>{error || uiText("队长、经理或选手完成邀请认领后，这里会自动出现对应队伍的周期与每周资料。", uiLocale)}</p></section>
  }

  if (invalidSelection) return <section className={styles.state} role="alert"><span>PARTICIPATION LINK</span><strong>{uiText("此队伍或周次已不可用", uiLocale)}</strong><p>{uiText("链接对应的参赛关系不存在，或当前账号无权查看。请从参赛准备重新选择。", uiLocale)}</p><Link to={`?${new URLSearchParams({ ...Object.fromEntries(searchParams), section: 'overview' })}`}>{uiText("返回参赛准备 →", uiLocale)}</Link></section>

  if (!activeStep) return <section className={styles.state} role="alert"><strong>{uiText("这个参赛步骤不存在", uiLocale)}</strong><Link to={progressHref}>{uiText("返回本次参赛进度 →", uiLocale)}</Link></section>

  return (
    <section className={styles.workspace} aria-label={uiText("周赛队伍工作台", uiLocale)}>
      <header className={styles.workHeader}><div><span>WEEKLY PARTICIPATION</span><h2>{uiText("本周参赛准备", uiLocale)}</h2></div><button type="button" disabled={Boolean(busy)} onClick={async () => { if (await confirmDiscard()) { refresh().catch(() => {}); onActivityChange?.() } }}>{uiText("刷新资料", uiLocale)}</button></header>
      {error ? <div ref={errorRef} tabIndex={-1} className={styles.message} role="alert" data-error="true"><span>{error}</span></div> : null}
      {stale && <p className={styles.lockNote}>{uiText("当前显示上次同步记录，重新同步前仅可查看。", uiLocale)}</p>}
      <WeeklyCycleEnrollment cycles={workspace.cycles} disabled={readOnly || stale || Boolean(busy)} onBeforeEnroll={confirmDiscard} onEnrolled={async (nextCycleId, nextEntryId) => {
        await refresh({ quiet: true })
        const next = new URLSearchParams(searchParams); next.set('cycle', nextCycleId); next.set('entry', nextEntryId); next.delete('week'); next.set('step', 'participation'); setSearchParams(next); onActivityChange?.()
      }} />
      {entry && <div className={styles.preparationReturn}><Link to={progressHref}>{uiText("← 本次参赛进度", uiLocale)}</Link><strong>{entry?.team?.shortName || entry?.team?.name} · {weekRecord?.week?.label || uiText("周期登记", uiLocale)}</strong><span>{cycle?.name}</span>{confirmationOpen && weekRecord.week.confirmationDeadlineAt && <time dateTime={weekRecord.week.confirmationDeadlineAt}>{uiText("截止 ", uiLocale)}{new Date(weekRecord.week.confirmationDeadlineAt).toLocaleString(uiLocale, { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}{uiText(" · 北京时间", uiLocale)}</time>}</div>}
      {(entry && (workspace.cycles.length > 1 || cycle?.entries?.length > 1 || entry?.weeks?.length > 1)) && <details className={styles.contextSwitcher}><summary>{uiText("切换队伍或周次", uiLocale)}</summary><div className={styles.selectors}>
        <label><span>{uiText("周期", uiLocale)}</span><select value={cycleId} disabled={Boolean(busy)} onChange={event => changeSelection('cycle', event.target.value)}>{workspace.cycles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>{uiText("队伍", uiLocale)}</span><select value={entryId} disabled={Boolean(busy)} onChange={event => changeSelection('entry', event.target.value)}>{(cycle?.entries || []).map(item => <option key={item.id} value={item.id}>{item.team?.name || item.seasonTeamId}</option>)}</select></label>
        <label><span>{uiText("周次", uiLocale)}</span><select value={weekId} disabled={Boolean(busy)} onChange={event => changeSelection('week', event.target.value)}>{(entry?.weeks || []).map(item => <option key={item.week.id} value={item.week.id}>{item.week.label || '第 ' + item.week.weekNumber + ' 周'}</option>)}</select></label>
      </div></details>}

      {!cycle || !entry ? workspace.cycles.some(item => item.enrollmentOpen && item.eligibleTeams?.length) ? null : <div className={styles.empty}>{uiText('本队资格已关联，当前尚无开放中的参赛周期。周期开放后可在此登记。', uiLocale)}</div> : <>
        <nav className={styles.stepRail} aria-label={uiText("本队周赛步骤", uiLocale)}>{currentPlan?.stages.map((step, index) => <Link key={step.key} to={stepHref(step.key)} aria-current={activeStep === step.key ? 'step' : undefined} data-state={step.state}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{uiText(step.title, uiLocale)}</strong><small>{uiText(step.label, uiLocale)}</small></div></Link>)}</nav>
        <section id="weekly-core" tabIndex={-1} hidden={activeStep !== 'core' || previousAppearance} className={styles.card} aria-label={uiText("周期核心", uiLocale)}>
          <header><h3>{uiText("登记周期核心", uiLocale)}</h3><em>{currentCore ? 'V' + currentCore.version + ' · ' + STATUS_LABELS[currentCore.status] : uiText("尚未登记", uiLocale)}</em></header>
          <p>{cycle.name}{uiText("共用 ", uiLocale)}{rules.corePlayerCount}{uiText(" 名核心选手，锁定后用于校验每周出赛名单。", uiLocale)}</p>
          <div className={styles.selectionLayout}>
            <PlayerPicker players={entry.players || []} selectedIds={coreIds} coreIds={lockedCoreIds} disabled={!coreWritable || Boolean(busy)} readOnly={!coreWritable} onChange={setCoreIds} />
            <aside className={styles.selectionSummary} aria-label={uiText("周期核心核对", uiLocale)}>
              <div className={styles.selectionCheck}><h4>{coreLocked ? uiText("周期核心已锁定", uiLocale) : uiText("核对周期核心", uiLocale)}</h4><dl><div><dt>{uiText("已选核心", uiLocale)}</dt><dd>{coreIds.length}<small> / {rules.corePlayerCount}{uiText(" 人", uiLocale)}</small></dd></div></dl><p>{coreWritable ? uiText("确认后将锁定本周期核心，每周名单按此核对。", uiLocale) : coreLocked ? uiText("核心已经锁定。已有记录保持只读。", uiLocale) : uiText("当前账号或赛季策略只允许查看，等待队长或经理登记。", uiLocale)}</p></div>
              {coreWritable && <div className={styles.selectionActions}><span className={styles.mobileSelectionCount} aria-hidden="true">{uiText("已选 ", uiLocale)}{coreIds.length} / {rules.corePlayerCount}{uiText(" 名核心", uiLocale)}</span><button type="button" className={styles.primaryButton} disabled={Boolean(busy) || coreIds.length !== rules.corePlayerCount} onClick={() => runAction('core', () => saveMyWeeklyCore(entry.id, { playerIds: coreIds, status: 'LOCKED' }), '周期核心已锁定。')}>{busy === 'core' ? uiText("保存中…", uiLocale) : uiText("确认并锁定核心", uiLocale)}</button><button type="button" className={styles.secondaryButton} disabled={Boolean(busy) || !coreDirty} onClick={() => runAction('core', () => saveMyWeeklyCore(entry.id, { playerIds: coreIds, status: 'DRAFT' }), '周期核心草稿已保存。')}>{uiText("保存草稿", uiLocale)}</button></div>}
            </aside>
          </div>
          <SaveFeedback {...feedbackProps} kind="core" />
        </section>

        <section id="weekly-participation" tabIndex={-1} hidden={activeStep !== 'participation'} className={styles.card} aria-label={uiText("本周参赛确认", uiLocale)}>
          <header><h3>{uiText("确认本周参赛", uiLocale)}</h3><em>{PARTICIPATION_LABELS[participation?.status || 'PENDING']}</em></header>
          <p>{currentPlan?.stages.find(stage => stage.key === 'participation')?.detail}</p>
          {participationWritable ? <div className={styles.responseForm}>
            <label><span>{uiText("本周可赛说明", uiLocale)}</span><input value={availabilityNote} onChange={event => setAvailabilityNote(event.target.value)} maxLength={1000} placeholder={uiText("例如：周六晚可赛", uiLocale)} disabled={Boolean(busy)} /></label>
            <button type="button" disabled={Boolean(busy) || (participation?.status === 'CONFIRMED' && !participationDirty)} onClick={() => runAction('participation', () => saveMyWeeklyParticipation(weekId, { entryId: entry.id, status: 'CONFIRMED', revision: participation?.revision || 0, availabilityNote: availabilityNote.trim() || null }), '本周参赛确认已保存。')}>{busy === 'participation' ? uiText("保存中…", uiLocale) : participation?.status === 'CONFIRMED' ? uiText("保存可赛说明", uiLocale) : uiText("确认本周参赛", uiLocale)}</button>
            <details className={styles.changeParticipation}><summary>{uiText("本周无法参赛", uiLocale)}</summary><p>{uiText("更改参赛意向会影响本周名单提交，请先与本队确认。", uiLocale)}</p><button type="button" className={styles.dangerButton} disabled={Boolean(busy)} onClick={() => setParticipationChange(participation?.status === 'CONFIRMED' ? 'WITHDRAWN' : 'DECLINED')}>{participation?.status === 'CONFIRMED' ? uiText("撤回参赛确认", uiLocale) : uiText("本周不参赛", uiLocale)}</button></details>
          </div> : <p className={styles.lockNote}>{!confirmationOpen ? uiText("当前确认窗口未开放或已经截止，已有确认记录仅供查看。", uiLocale) : uiText("当前账号或赛季策略只允许查看，本周参赛由队长或经理确认。", uiLocale)}</p>}
          <SaveFeedback {...feedbackProps} kind="participation" />
        </section>

        <section id="weekly-roster" tabIndex={-1} hidden={activeStep !== 'roster'} className={styles.card} aria-label={uiText("本周出赛名单", uiLocale)}>
          <header><h3>{uiText("本周出赛名单", uiLocale)}</h3><em>{currentRoster ? 'V' + currentRoster.version + ' · ' + STATUS_LABELS[currentRoster.status] : uiText("尚未提交", uiLocale)}</em></header>
          <p>{entry.team?.shortName || entry.team?.name} · {weekRecord?.week?.label}：{rules.rosterMin}–{rules.rosterMax}{uiText(" 人", uiLocale)}{!previousAppearance && <>{uiText("，至少 ", uiLocale)}{rules.minimumCoreInWeeklyRoster}{uiText(" 名已锁定核心。", uiLocale)}</>}</p>
          {previousAppearance && <p className={styles.lockNote}>{continuity?.status === 'FIRST_APPEARANCE' ? uiText('首次实际参赛，无需固定核心。以后每周与最近一次实际参赛名单至少保留 3 人。', uiLocale) : continuity?.status === 'AVAILABLE' ? uiText('核对基准：{0}。至少保留 3 人；正常休赛不清积分，也不替换这份基准名单。', uiLocale, [continuity.previousWeekLabel]) : uiText('最近一次实际参赛名单尚未核实，请联系赛管。', uiLocale)}</p>}
          {!participation?.id || participation.status !== 'CONFIRMED' ? <div className={styles.empty}><strong>{PARTICIPATION_LABELS[participation?.status] || uiText("等待确认参赛", uiLocale)}</strong><p>{uiText("确认参加本周比赛后，再准备出赛名单。", uiLocale)}</p><Link to={stepHref('participation')}>{uiText("查看本周参赛确认 →", uiLocale)}</Link></div> : <>
            <div className={styles.selectionLayout}>
              <PlayerPicker referenceLabel={previousAppearance ? "上次参赛" : "周期核心"} players={entry.players || []} selectedIds={rosterIds} coreIds={lockedCoreIds} disabled={!rosterWritable || Boolean(busy)} readOnly={!rosterWritable} onChange={setRosterIds} />
              <aside className={styles.selectionSummary} aria-label={uiText("出赛名单核对与提交", uiLocale)}>
                <div className={styles.selectionCheck} role="status"><h4>{rosterLocked ? uiText("正式名单", uiLocale) : uiText("提交前核对", uiLocale)}</h4><dl><div><dt>{uiText("出赛人数", uiLocale)}</dt><dd>{rosterCheck.count}<small> / {rules.rosterMin}–{rules.rosterMax}{uiText(" 人", uiLocale)}</small></dd></div><div><dt>{uiText(previousAppearance ? "与最近参赛重合" : "已含核心", uiLocale)}</dt><dd>{previousAppearance && continuity?.status === 'FIRST_APPEARANCE' ? uiText("首次参赛", uiLocale) : <>{rosterCheck.coreCount}<small>{uiText(" / 至少 ", uiLocale)}{previousAppearance ? continuity?.required ?? 3 : rules.minimumCoreInWeeklyRoster}{uiText(" 人", uiLocale)}</small></>}</dd></div></dl><strong className={styles.checkState} data-valid={rosterCheck.canSubmit}>{rosterCheck.errors.length ? uiText("名单还需补齐", uiLocale) : uiText(previousAppearance ? "✓ 人数与名单延续符合要求" : "✓ 人数与核心符合要求", uiLocale)}</strong>{rosterCheck.errors.length ? rosterCheck.errors.map(message => <p key={message}>{uiText(message, uiLocale)}</p>) : <p>{rosterLocked ? uiText("管理员已锁定，正式出赛名单已确认。", uiLocale) : rosterDraft?.status === 'SUBMITTED' && !rosterDirty ? uiText("已提交给周赛管理员，等待锁定，无需重复提交。", uiLocale) : rosterDirty ? uiText("有未保存的改动。提交后交由周赛管理员锁定。", uiLocale) : uiText("当前为已保存草稿，正式提交后交由周赛管理员锁定。", uiLocale)}</p>}</div>
                {rosterWritable && <div className={styles.selectionActions}><span className={styles.mobileSelectionCount} aria-hidden="true">{uiText(rosterCheck.errors[0], uiLocale) || (previousAppearance && continuity?.status === 'FIRST_APPEARANCE' ? uiText("已选 {0} 人 · 首次参赛{1}", uiLocale, [rosterCheck.count, rosterDirty ? uiText(" · 未保存", uiLocale) : ""]) : uiText(previousAppearance ? "已选 {0} 人 · 重合 {1} 人{2}" : "已选 {0} 人 · {1} 名核心{2}", uiLocale, [rosterCheck.count, rosterCheck.coreCount, rosterDirty ? uiText(" · 未保存", uiLocale) : ""]))}</span><button type="button" className={styles.primaryButton} disabled={Boolean(busy) || !rosterCheck.canSubmit || (rosterDraft?.status === 'SUBMITTED' && !rosterDirty)} onClick={() => runAction('roster', () => saveMyWeeklyRoster(participation.id, { members: rosterIds.map(playerId => ({ playerId, plannedStarter: false })), status: 'SUBMITTED', revision: rosterDraft?.revision || 0 }), '本周名单已提交。')}>{busy === 'roster' ? uiText("保存中…", uiLocale) : rosterDraft?.status === 'SUBMITTED' && !rosterDirty ? uiText("已提交 · 等待管理员", uiLocale) : uiText("提交名单", uiLocale)}</button><button type="button" className={styles.secondaryButton} disabled={Boolean(busy) || !rosterDirty} onClick={() => runAction('roster', () => saveMyWeeklyRoster(participation.id, { members: rosterIds.map(playerId => ({ playerId, plannedStarter: false })), status: 'DRAFT', revision: rosterDraft?.revision || 0 }), '本周名单草稿已保存，尚未正式提交。')}>{uiText("保存草稿", uiLocale)}</button></div>}
              </aside>
            </div>
            <SaveFeedback {...feedbackProps} kind="roster" />
            {!rosterWritable && <p className={styles.lockNote}>{rosterLocked ? uiText("正式名单已锁定。", uiLocale) : !entryWritable ? uiText("当前账号或赛季策略只允许查看，本周名单由队长或经理提交。", uiLocale) : uiText("当前确认窗口未开放或已截止，名单保持只读。", uiLocale)}</p>}
          </>}
        </section>
        <footer className={styles.taskFooter}><span>{uiText(currentPlan?.guidance.detail, uiLocale)}</span><Link to={progressHref}>{uiText("查看完整参赛进度 ↗", uiLocale)}</Link></footer>
        {weekId && entry?.team?.id && <WeeklyCoordinationPanel key={`${weekId}:${entry.team.id}`} weekId={weekId} teamId={entry.team.id} readOnly={readOnly || stale || Boolean(busy)} onActivityChange={onActivityChange} />}
      </>}
      {participationChange && <WeeklyParticipationChangeDialog team={entry?.team?.shortName || entry?.team?.name} week={weekRecord?.week?.label} status={participationChange} busy={Boolean(busy)} onCancel={() => setParticipationChange(null)} onConfirm={() => runAction('participation', () => saveMyWeeklyParticipation(weekId, { entryId: entry.id, status: participationChange, revision: participation?.revision || 0, availabilityNote: availabilityNote.trim() || null }), '本周参赛状态已更新。')} />}
    </section>
  )
}

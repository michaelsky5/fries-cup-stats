import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addRosterChangeItem,
  createRosterChangeRequest,
  deleteRosterChangeItem,
  fetchRosterChangeCandidates,
  fetchRosterChangeContext,
  respondToRosterChangePlayer,
  respondToRosterChangeRelease,
  saveRosterChangeConfiguration,
  submitRosterChangeRequest
} from './rosterChangeApi.js'
import styles from './RosterChangeWorkspace.module.css'
import {
  capabilityBlockText,
  capabilityDeniedMessage,
  resolveCapabilityAccess
} from '../capabilities/capabilityUi.js'

const ROLE_OPTIONS = [
  { value: 'TANK', label: '重装' },
  { value: 'DPS', label: '输出' },
  { value: 'SUP', label: '支援' },
  { value: 'FLEX', label: '补位' },
  { value: 'UNKNOWN', label: '待设置' }
]

const STATUS_LABELS = {
  DRAFT: '草稿',
  BLOCKED: '规则阻止',
  SUBMITTED: '审核中',
  LOCKED: '已生效',
  REJECTED: '已退回',
  PENDING: '待确认',
  APPROVED: '已同意',
  NOT_REQUIRED: '无需确认'
}

function formatTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value))
}

function errorText(error) {
  const capabilityMessage = capabilityDeniedMessage(error)
  if (capabilityMessage) return capabilityMessage
  const code = error?.data?.error || ''
  const copy = {
    ROSTER_CHANGE_VALIDATION_FAILED: '当前名单未满足提交规则，请按下方资格结果调整。',
    PLAYER_TRANSFER_LIMIT_REACHED: '这名选手本届赛事已经使用过一次跨队转会。',
    NEW_PLAYERS_NOT_ALLOWED: '本次窗口不允许添加未注册的新选手。',
    PASSWORD_CONFIRMATION_FAILED: '当前账号密码不正确。',
    ROSTER_CHANGE_WINDOW_CLOSED: '本次名单窗口当前未开放。',
    ROSTER_CHANGE_NOT_EDITABLE: '这份名单已经提交或锁定，不能继续修改。',
    PLAYER_ALREADY_ON_TARGET_ROSTER: '这名选手已经在当前拟议名单中。'
  }
  return copy[code] || error?.message || '操作失败，请刷新后重试。'
}

function createForm(request) {
  return {
    members: Object.fromEntries((request.targetRoster?.members || []).map(member => [member.id, {
      role: member.role || 'UNKNOWN'
    }])),
    captainUserId: request.captainUserId || request.registration?.manager?.id || '',
    deputyCaptainUserId: request.deputyCaptainUserId || '',
    managerNote: request.managerNote || '',
    password: ''
  }
}

function Confirmation({ label, value }) {
  return <span className={styles.confirmation} data-status={value}>{label}：{STATUS_LABELS[value] || value}</span>
}

export default function RosterChangeWorkspace({ seasonId, capabilitySnapshot = null }) {
  const uiLocale = useUiLocale()
  const [context, setContext] = useState(null)
  const [forms, setForms] = useState({})
  const [candidates, setCandidates] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionKey, setActionKey] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchRosterChangeContext(seasonId)
      setContext(next)
      setForms(Object.fromEntries((next.managerRequests || []).map(request => [request.id, createForm(request)])))
      const registrationIds = [...new Set((next.managerRequests || [])
        .filter(request => ['DRAFT', 'BLOCKED'].includes(request.status))
        .map(request => request.registration.id))]
      const candidateEntries = await Promise.all(registrationIds.map(async registrationId => [
        registrationId,
        await fetchRosterChangeCandidates(seasonId, registrationId)
      ]))
      setCandidates(Object.fromEntries(candidateEntries))
    } catch (loadError) {
      setError(loadError)
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => { refresh() }, [refresh])

  const runAction = async (key, task, success) => {
    setActionKey(key)
    setError(null)
    setNotice('')
    try {
      await task()
      setNotice(success)
      await refresh()
    } catch (actionError) {
      setError(actionError)
      if (actionError?.data?.request) await refresh()
    } finally {
      setActionKey('')
    }
  }

  const activeWindow = useMemo(() => {
    const now = Date.now()
    return context?.windows?.find(window => (
      window.status === 'OPEN' && new Date(window.opensAt).getTime() <= now && new Date(window.closesAt).getTime() > now
    )) || null
  }, [context])

  const setFormField = (requestId, field, value) => {
    setForms(current => ({ ...current, [requestId]: { ...current[requestId], [field]: value } }))
  }

  const setMemberField = (requestId, memberId, field, value) => {
    setForms(current => ({
      ...current,
      [requestId]: {
        ...current[requestId],
        members: {
          ...current[requestId]?.members,
          [memberId]: { ...current[requestId]?.members?.[memberId], [field]: value }
        }
      }
    }))
  }

  if (loading && !context) return <section className={styles.workspace}><p>{uiText("正在读取名单窗口与资格状态…", uiLocale)}</p></section>

  const managerRegistrations = context?.managerRegistrations || []
  const managerRequests = context?.managerRequests || []
  const playerRequests = context?.playerRequests || []
  const releaseRequests = context?.releaseRequests || []
  const playerRespondAccess = resolveCapabilityAccess(capabilitySnapshot, 'player.roster.respond')

  return (
    <section className={styles.workspace}>
      <header className={styles.header}>
        <div><span>ROSTER WINDOW</span><h3>{uiText("转会期与季后赛名单", uiLocale)}</h3><p>{uiText("添加、移除和跨队转会都形成新版本；正式生效仍由 System 审核锁定。", uiLocale)}</p></div>
        <button type="button" onClick={refresh} disabled={loading}>{uiText("刷新", uiLocale)}</button>
      </header>

      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {error ? <div className={styles.error}>{errorText(error)}</div> : null}

      <div className={styles.windowBar} data-open={Boolean(activeWindow)}>
        <div><span>{activeWindow ? uiText("当前开放", uiLocale) : uiText("当前未开放", uiLocale)}</span><strong>{activeWindow?.name || uiText("等待 System 配置名单窗口", uiLocale)}</strong></div>
        {activeWindow ? <p>{formatTime(activeWindow.opensAt)} — {formatTime(activeWindow.closesAt)}{uiText(" · 每名选手最多跨队 ", uiLocale)}{activeWindow.maxTransfersPerPlayer}{uiText(" 次 · ", uiLocale)}{activeWindow.allowNewPlayers ? uiText("允许新选手", uiLocale) : uiText("仅限已注册选手", uiLocale)}</p> : <p>{uiText("非窗口期保留只读；已生效版本和历史资格结果不会被修改。", uiLocale)}</p>}
      </div>

      {activeWindow ? managerRegistrations.filter(registration => registration.status === 'LOCKED').map(registration => {
        const existing = managerRequests.find(request => request.registration.id === registration.id && request.window.id === activeWindow.id)
        if (existing) return null
        const changeAccess = resolveCapabilityAccess(capabilitySnapshot, 'roster.change.submit', { registrationId: registration.id })
        return <article className={styles.createCard} key={registration.id}><div><span>{uiText("经理操作", uiLocale)}</span><strong>{registration.team?.shortName} / {registration.team?.name}</strong><p>{changeAccess.allowed ? uiText("从当前锁定名单复制一份季后赛版本，再在新版本上修改。", uiLocale) : capabilityBlockText(changeAccess)}</p></div><button type="button" title={capabilityBlockText(changeAccess)} disabled={!changeAccess.allowed || actionKey === `create:${registration.id}`} onClick={() => runAction(`create:${registration.id}`, () => createRosterChangeRequest(registration.id, { windowId: activeWindow.id }), '季后赛名单草稿已创建。')}>{uiText("创建名单版本", uiLocale)}</button></article>
      }) : null}

      {managerRequests.map(request => {
        const form = forms[request.id] || createForm(request)
        const changeAccess = resolveCapabilityAccess(capabilitySnapshot, 'roster.change.submit', { registrationId: request.registration.id })
        const editable = changeAccess.allowed && activeWindow?.id === request.window.id && ['DRAFT', 'BLOCKED'].includes(request.status)
        const activeMembers = request.targetRoster.members.filter(member => member.status !== 'REMOVED')
        const requestCandidates = (candidates[request.registration.id] || []).filter(candidate => (
          !request.targetRoster.members.some(member => member.player?.id === candidate.player?.id && member.status !== 'REMOVED')
        ))
        const officerOptions = activeMembers.filter(member => member.player?.userId)
        const payload = {
          members: request.targetRoster.members.map(member => ({
            id: member.id,
            role: form.members?.[member.id]?.role || member.role || 'UNKNOWN'
          })),
          captainUserId: form.captainUserId,
          deputyCaptainUserId: form.deputyCaptainUserId || null,
          managerNote: form.managerNote
        }
        return (
          <article className={styles.requestCard} key={request.id}>
            <div className={styles.requestHeading}><div><span>PLAYOFF ROSTER / V{request.targetRoster.version}</span><h4>{request.registration.team?.shortName}{uiText(" 季后赛名单", uiLocale)}</h4><p>{request.window.name} · {formatTime(request.window.closesAt)}{uiText(" 截止", uiLocale)}</p></div><em data-status={request.status}>{STATUS_LABELS[request.status] || request.status}</em></div>
            {!changeAccess.allowed ? <div className={styles.capabilityBlock}>{capabilityBlockText(changeAccess)}</div> : null}

            <div className={styles.counts}><span><strong>{activeMembers.length}</strong>{uiText(" 名注册选手", uiLocale)}</span><span><strong>{request.items.length}</strong>{uiText(" 项变更", uiLocale)}</span><span><strong>{request.latestEligibility?.retainedCorePlayerIdentityIds?.length || 0}</strong>{uiText(" 名核心保留", uiLocale)}</span></div>

            <div className={styles.memberTable}>
              {request.targetRoster.members.map(member => {
                const item = request.items.find(change => change.targetRosterMemberId === member.id)
                return <div className={styles.memberRow} data-status={member.status} key={member.id}>
                  <div><strong>{member.player?.displayName || member.player?.battleTag || uiText("未命名选手", uiLocale)}</strong><span>{item ? item.type === 'TRANSFER_IN' ? uiText("从 {0} 转入", uiLocale, [item.sourceTeam?.shortName || '原队']) : item.type === 'ADD' ? uiText("新增选手", uiLocale) : uiText("移出名单", uiLocale) : uiText("原锁定名单", uiLocale)}</span></div>
                  <select disabled={!editable || member.status === 'REMOVED'} value={form.members?.[member.id]?.role || member.role} onChange={event => setMemberField(request.id, member.id, 'role', event.target.value)}>{ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
                  {item ? <div className={styles.itemState}>{item.type !== 'REMOVE' ? <><Confirmation label={uiText("选手", uiLocale)} value={item.playerConfirmationStatus} />{item.type === 'TRANSFER_IN' ? <Confirmation label={uiText("原队", uiLocale)} value={item.sourceReleaseStatus} /> : null}</> : <span>{uiText("待移出", uiLocale)}</span>}{editable ? <button type="button" onClick={() => runAction(`cancel:${item.id}`, () => deleteRosterChangeItem(item.id), '该项名单变更已撤销。')}>{uiText("撤销", uiLocale)}</button> : null}</div> : editable ? <button type="button" onClick={() => runAction(`remove:${member.id}`, () => addRosterChangeItem(request.id, { action: 'REMOVE', playerIdentityId: member.player.id }), '已加入移出名单项。')}>{uiText("移出", uiLocale)}</button> : <span>—</span>}
                </div>
              })}
            </div>

            {editable ? <div className={styles.candidates}><div><span>{uiText("可加入选手", uiLocale)}</span><p>{uiText("跨队转入需选手本人确认，并由原队经理放行；每人本届最多一次。", uiLocale)}</p></div>{requestCandidates.length ? requestCandidates.map(candidate => <article key={candidate.player.id}><div><strong>{candidate.player.displayName || candidate.player.battleTag}</strong><span>{candidate.currentTeam ? uiText("{0} · 已转会 {1} 次", uiLocale, [candidate.currentTeam.shortName, candidate.transferCount]) : uiText("自由选手 / 新增", uiLocale)}</span></div><button type="button" disabled={actionKey === `add:${candidate.player.id}`} onClick={() => runAction(`add:${candidate.player.id}`, () => addRosterChangeItem(request.id, { action: 'ADD', playerIdentityId: candidate.player.id }), '已发出名单确认请求。')}>{candidate.currentTeam ? uiText("申请转入", uiLocale) : uiText("添加", uiLocale)}</button></article>) : <p className={styles.empty}>{uiText("暂无其他开放候选选手。", uiLocale)}</p>}</div> : null}

            <div className={styles.officerGrid}>
              <label><span>{uiText("队长", uiLocale)}</span><select disabled={!editable} value={form.captainUserId} onChange={event => setFormField(request.id, 'captainUserId', event.target.value)}><option value={request.registration.manager?.id}>{uiText("经理（默认）", uiLocale)}</option>{officerOptions.map(member => <option key={member.id} value={member.player.userId}>{member.player.displayName}</option>)}</select></label>
              <label><span>{uiText("副队长（可选）", uiLocale)}</span><select disabled={!editable} value={form.deputyCaptainUserId} onChange={event => setFormField(request.id, 'deputyCaptainUserId', event.target.value)}><option value="">{uiText("不设置", uiLocale)}</option>{officerOptions.map(member => <option key={member.id} value={member.player.userId}>{member.player.displayName}</option>)}</select></label>
              <label className={styles.noteField}><span>{uiText("名单说明", uiLocale)}</span><input disabled={!editable} value={form.managerNote} onChange={event => setFormField(request.id, 'managerNote', event.target.value)} /></label>
            </div>

            {request.latestEligibility ? <div className={styles.eligibility} data-status={request.latestEligibility.status}><div><span>{uiText("核心保留资格", uiLocale)}</span><strong>{request.latestEligibility.retainedCorePlayerIdentityIds.length} / {request.latestEligibility.requiredCoreCount}</strong></div><p>{request.latestEligibility.errors?.length ? request.latestEligibility.errors.map(item => item.message).join('；') : request.latestEligibility.override ? uiText("已由 System 豁免：{0}", uiLocale, [request.latestEligibility.override.reason]) : uiText("已满足已出场核心选手保留规则。", uiLocale)}</p></div> : null}

            {editable ? <div className={styles.submitBar}><button type="button" onClick={() => runAction(`save:${request.id}`, () => saveRosterChangeConfiguration(request.id, payload), '名单配置已保存。')}>{uiText("保存配置", uiLocale)}</button><label><span>{uiText("提交前确认密码", uiLocale)}</span><input type="password" autoComplete="current-password" value={form.password} onChange={event => setFormField(request.id, 'password', event.target.value)} /></label><button type="button" disabled={!form.password || actionKey === `submit:${request.id}`} onClick={() => runAction(`submit:${request.id}`, async () => { await saveRosterChangeConfiguration(request.id, payload); return submitRosterChangeRequest(request.id, form.password) }, '名单已提交 System 审核。')}>{uiText("提交审核", uiLocale)}</button></div> : <p className={styles.readonly}>{uiText("当前版本只读；如被退回或进入新窗口，System 会重新开放操作。", uiLocale)}</p>}
          </article>
        )
      })}

      {(playerRequests.length || releaseRequests.length) ? <div className={styles.confirmationQueue}><div><span>CONFIRMATIONS</span><h4>{uiText("待你确认", uiLocale)}</h4></div>{playerRequests.map(item => <article key={`player:${item.id}`}><div><strong>{item.targetTeam?.shortName}{uiText(" 邀请你", uiLocale)}{item.type === 'TRANSFER_IN' ? uiText("转入", uiLocale) : uiText("加入", uiLocale)}{uiText("名单", uiLocale)}</strong><p>{playerRespondAccess.allowed ? (item.type === 'TRANSFER_IN' ? uiText("当前所属 {0}，同意后仍需原队经理放行。", uiLocale, [item.sourceTeam?.shortName || '原队']) : uiText("同意后由目标队经理完成名单提交。", uiLocale)) : capabilityBlockText(playerRespondAccess)}</p></div><div><button type="button" title={capabilityBlockText(playerRespondAccess)} disabled={!playerRespondAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`player-approve:${item.id}`, () => respondToRosterChangePlayer(item.id, 'APPROVE'), '你已同意本次名单变更。')}>{uiText("同意", uiLocale)}</button><button type="button" title={capabilityBlockText(playerRespondAccess)} disabled={!playerRespondAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`player-reject:${item.id}`, () => respondToRosterChangePlayer(item.id, 'REJECT'), '你已拒绝本次名单变更。')}>{uiText("拒绝", uiLocale)}</button></div></article>)}{releaseRequests.map(item => {
        const releaseAccess = resolveCapabilityAccess(capabilitySnapshot, 'roster.change.submit', { registrationId: item.sourceRegistrationId })
        return <article key={`release:${item.id}`}><div><strong>{item.targetTeam?.shortName}{uiText(" 申请转入 ", uiLocale)}{item.player?.displayName}</strong><p>{releaseAccess.allowed ? uiText("你正在以 {0} 经理身份处理原队放行。", uiLocale, [item.sourceTeam?.shortName]) : capabilityBlockText(releaseAccess)}</p></div><div><button type="button" title={capabilityBlockText(releaseAccess)} disabled={!releaseAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`release-approve:${item.id}`, () => respondToRosterChangeRelease(item.id, 'APPROVE'), '原队已同意放行。')}>{uiText("同意放行", uiLocale)}</button><button type="button" title={capabilityBlockText(releaseAccess)} disabled={!releaseAccess.allowed || Boolean(actionKey)} onClick={() => runAction(`release-reject:${item.id}`, () => respondToRosterChangeRelease(item.id, 'REJECT'), '原队已拒绝放行。')}>{uiText("拒绝", uiLocale)}</button></div></article>
      })}</div> : null}
    </section>
  )
}

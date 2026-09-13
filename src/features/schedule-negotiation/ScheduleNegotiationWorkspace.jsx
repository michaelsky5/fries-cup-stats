import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useCallback, useEffect, useState } from 'react'
import {
  addScheduleCandidate,
  confirmScheduleCandidate,
  createScheduleProposal,
  fetchScheduleContext
} from './scheduleNegotiationApi.js'
import styles from './ScheduleNegotiationWorkspace.module.css'
import {
  capabilityBlockText,
  capabilityDeniedMessage,
  resolveCapabilityAccess
} from '../capabilities/capabilityUi.js'

const STATUS_LABELS = {
  OPEN: '协商中',
  PENDING_ADMIN: '等待 System 审批',
  CONFIRMED: '改期已生效',
  REJECTED: '改期未通过',
  EXPIRED: '协商已过期',
  SUPERSEDED: '历史版本'
}

function formatTime(value) {
  if (!value) return '时间待定'
  return new Date(value).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  })
}

function toIso(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const shanghaiValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(text)
    ? `${text.length === 16 ? `${text}:00` : text}+08:00`
    : text
  const date = new Date(shanghaiValue)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function errorText(error) {
  const capabilityMessage = capabilityDeniedMessage(error)
  if (capabilityMessage) return capabilityMessage
  const code = error?.data?.error || ''
  const copy = {
    SCHEDULE_PROPOSAL_VERSION_CONFLICT: '对方刚刚更新了协商内容，请刷新后重新操作。',
    SCHEDULE_WINDOW_CLOSED: '本轮当前没有开放改期协商。',
    ACTIVE_SCHEDULE_PROPOSAL_EXISTS: '这场比赛已经有一份正在处理的改期提案。',
    SCHEDULE_CANDIDATE_LIMIT: '一份提案最多保留三个候选时间。',
    SCHEDULE_CONFIRMATION_ROLE_REQUIRED: '只有经理、队长或副队长可以代表队伍确认。',
    SCHEDULE_NEGOTIATION_EXPIRED: '这场比赛已经进入赛前锁定，继续使用原定时间。'
  }
  return copy[code] || error?.message || '赛程协商操作失败，请刷新后重试。'
}

export default function ScheduleNegotiationWorkspace({ seasonId, capabilitySnapshot = null }) {
  const uiLocale = useUiLocale()
  const [context, setContext] = useState(null)
  const [forms, setForms] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setContext(await fetchScheduleContext(seasonId)) }
    catch (loadError) { setError(loadError) }
    finally { setLoading(false) }
  }, [seasonId])

  useEffect(() => { refresh() }, [refresh])

  const runAction = async (key, task, success) => {
    setBusy(key)
    setError(null)
    setNotice('')
    try { await task(); setNotice(success); await refresh() }
    catch (actionError) { setError(actionError) }
    finally { setBusy('') }
  }

  const getForm = matchId => forms[matchId] || { times: ['', '', ''], note: '', counter: '' }
  const setForm = (matchId, update) => setForms(current => ({
    ...current,
    [matchId]: { times: ['', '', ''], note: '', counter: '', ...(current[matchId] || {}), ...update }
  }))
  const setTime = (matchId, index, value) => {
    const form = getForm(matchId)
    const times = [...form.times]
    times[index] = value
    setForm(matchId, { times })
  }

  const matches = context?.matches || []
  if (loading && !context) return <section className={styles.workspace} id="schedule-negotiation"><p>{uiText("正在读取官方赛程协商状态…", uiLocale)}</p></section>

  return (
    <section className={styles.workspace} id="schedule-negotiation">
      <header className={styles.header}><div><span>MATCH SCHEDULING</span><h3>{uiText("赛程协商", uiLocale)}</h3><p>{uiText("默认比赛时间始终有效；双方最多协商三个候选时间，满足规则后自动生效，否则交给 System。所有时间均按北京时间（UTC+8）填写和显示。", uiLocale)}</p></div><button type="button" onClick={refresh} disabled={loading}>{uiText("刷新", uiLocale)}</button></header>
      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {error ? <div className={styles.error}>{errorText(error)}</div> : null}
      {!matches.length ? <div className={styles.empty}><strong>{uiText("当前没有关联的正式比赛", uiLocale)}</strong><span>{uiText("对阵排定并绑定本届队伍后会显示在这里。", uiLocale)}</span></div> : null}

      <div className={styles.matchList}>{matches.map(match => {
        const form = getForm(match.id)
        const actingAccess = match.access?.find(access => access.canAct)
        const proposal = match.proposal
        const proposeAccess = resolveCapabilityAccess(capabilitySnapshot, 'schedule.propose', {
          registrationId: actingAccess?.registrationId,
          matchId: match.id
        })
        const confirmAccess = resolveCapabilityAccess(capabilitySnapshot, 'schedule.confirm', {
          registrationId: actingAccess?.registrationId,
          matchId: match.id
        })
        const canCreate = actingAccess && proposeAccess.allowed && !proposal && match.status === 'PENDING' && match.scheduledAt && match.window?.status === 'OPEN'
        return <article className={styles.matchCard} key={match.id}>
          <div className={styles.matchHeading}><div><span>{match.stage} / {match.roundLabel || 'ROUND TBD'}</span><h4>{match.teamA?.shortName || 'TBD'} <b>VS</b> {match.teamB?.shortName || 'TBD'}</h4><p>{match.displayName}</p></div><div className={styles.officialTime}><span>{uiText("当前正式时间 · 北京时间", uiLocale)}</span><strong>{formatTime(match.scheduledAt)}</strong></div></div>

          {match.window ? <div className={styles.policy}><span>{uiText("允许比赛时间：", uiLocale)}{formatTime(match.window.windowStartsAt)} — {formatTime(match.window.windowEndsAt)}</span><span>{uiText("最低提前 ", uiLocale)}{match.window.minimumNoticeMinutes / 60}{uiText(" 小时", uiLocale)}</span><span>{match.window.allowAutoApproval ? uiText("符合条件自动通过", uiLocale) : uiText("本轮全部人工审批", uiLocale)}</span></div> : <div className={styles.readonly}>{uiText("System 尚未配置本轮协商窗口，当前时间只读。", uiLocale)}</div>}
          {actingAccess && (!proposeAccess.allowed || !confirmAccess.allowed) ? <div className={styles.capabilityBlock}>{capabilityBlockText(!proposeAccess.allowed ? proposeAccess : confirmAccess)}</div> : null}

          {canCreate ? <form className={styles.proposalForm} onSubmit={event => {
            event.preventDefault()
            const candidates = form.times.map(toIso).filter(Boolean).map(scheduledAt => ({ scheduledAt }))
            if (!candidates.length) return
            runAction(`create:${match.id}`, () => createScheduleProposal(match.id, {
              teamId: actingAccess.teamId, candidates, note: form.note
            }), '改期提案已发送，等待对方选择或补充候选时间。')
          }}><div><span>{uiText("提出 1–3 个候选时间 · 北京时间", uiLocale)}</span><p>{uiText("你填写的每个时间都视为本队已同意。", uiLocale)}</p></div>{form.times.map((value, index) => <input key={index} aria-label={uiText("候选时间 {0}（北京时间）", uiLocale, [index + 1])} type="datetime-local" value={value} onChange={event => setTime(match.id, index, event.target.value)} />)}<input className={styles.note} placeholder={uiText("给对方的说明（可选）", uiLocale)} value={form.note} onChange={event => setForm(match.id, { note: event.target.value })} /><button type="submit" disabled={busy === `create:${match.id}` || !form.times.some(Boolean)}>{uiText("发送提案", uiLocale)}</button></form> : null}

          {proposal ? <div className={styles.proposal}>
            <div className={styles.proposalHeading}><div><span>PROPOSAL V{proposal.version}</span><strong>{proposal.proposedByTeam?.shortName}{uiText(" 发起", uiLocale)}</strong><p>{proposal.note || uiText("无附加说明", uiLocale)} · {formatTime(proposal.expiresAt)}{uiText(" 前有效", uiLocale)}</p></div><em data-status={proposal.status}>{STATUS_LABELS[proposal.status] || proposal.status}</em></div>
            <div className={styles.candidateList}>{proposal.candidates.map(candidate => {
              const myConfirmation = candidate.confirmations.find(item => item.teamId === actingAccess?.teamId)
              const opponentConfirmed = candidate.confirmations.filter(item => item.status === 'APPROVED').length >= 2
              return <article key={candidate.id} data-agreed={opponentConfirmed}><div><span>{uiText("候选时间", uiLocale)}</span><strong>{formatTime(candidate.scheduledAt)}</strong><p>{candidate.proposedByTeam?.shortName}{uiText(" 提出 · ", uiLocale)}{candidate.note || uiText("无说明", uiLocale)}</p></div><div className={styles.confirmations}>{candidate.confirmations.map(item => <span key={item.id} data-status={item.status}>{item.team?.shortName} {item.status === 'APPROVED' ? uiText("已同意", uiLocale) : uiText("已拒绝", uiLocale)}</span>)}</div>{actingAccess && confirmAccess.allowed && proposal.status === 'OPEN' && myConfirmation?.status !== 'APPROVED' ? <div className={styles.candidateActions}><button type="button" disabled={Boolean(busy)} onClick={() => runAction(`accept:${candidate.id}`, () => confirmScheduleCandidate(proposal.id, { teamId: actingAccess.teamId, candidateId: candidate.id, expectedVersion: proposal.version, decision: 'APPROVE' }), '双方确认完成，正在按赛事规则处理。')}>{uiText("接受此时间", uiLocale)}</button><button type="button" disabled={Boolean(busy)} onClick={() => runAction(`reject:${candidate.id}`, () => confirmScheduleCandidate(proposal.id, { teamId: actingAccess.teamId, candidateId: candidate.id, expectedVersion: proposal.version, decision: 'REJECT' }), '已标记不接受该候选时间。')}>{uiText("不接受", uiLocale)}</button></div> : null}</article>
            })}</div>
            {actingAccess && proposeAccess.allowed && proposal.status === 'OPEN' && proposal.candidates.length < 3 ? <form className={styles.counterForm} onSubmit={event => { event.preventDefault(); if (!form.counter) return; runAction(`counter:${proposal.id}`, () => addScheduleCandidate(proposal.id, { teamId: actingAccess.teamId, expectedVersion: proposal.version, scheduledAt: toIso(form.counter) }), '新的候选时间已加入协商。') }}><label><span>{uiText("补充候选时间（北京时间）", uiLocale)}</span><input type="datetime-local" value={form.counter} onChange={event => setForm(match.id, { counter: event.target.value })} /></label><button type="submit" disabled={!form.counter || busy === `counter:${proposal.id}`}>{uiText("加入候选", uiLocale)}</button></form> : null}
            {proposal.status === 'PENDING_ADMIN' ? <div className={styles.pendingAdmin}><strong>{uiText("双方已经同意 ", uiLocale)}{formatTime(proposal.agreedScheduledAt)}</strong><p>{proposal.autoValidation?.errors?.map(item => item.message).join('；') || uiText("未满足自动通过条件，等待 System 审批。", uiLocale)}</p></div> : null}
            {proposal.status === 'REJECTED' ? <div className={styles.pendingAdmin}><strong>{uiText("本次改期未生效，继续使用原定时间", uiLocale)}</strong><p>{proposal.reviewNote || proposal.autoValidation?.errors?.map(item => item.message).join('；') || uiText("System 未批准本次改期。", uiLocale)}</p></div> : null}
            {proposal.status === 'CONFIRMED' ? <div className={styles.confirmed}><strong>{uiText("新时间已成为正式赛程：", uiLocale)}{formatTime(proposal.agreedScheduledAt)}</strong><p>{proposal.approvals?.[0]?.decision === 'AUTO_APPROVED' ? uiText("双方同意且自动校验通过。", uiLocale) : proposal.reviewNote || uiText("System 已批准。", uiLocale)}</p></div> : null}
          </div> : !canCreate ? <div className={styles.readonly}>{actingAccess && !proposeAccess.allowed ? capabilityBlockText(proposeAccess) : actingAccess ? uiText("业务条件：当前不能发起改期，可能是窗口未开放、时间待定或比赛已进入锁定。", uiLocale) : uiText("账号权限：你的赛事关系为只读（{0}）。", uiLocale, [match.access?.flatMap(access => access.roles).join(' / ') || 'VIEWER'])}</div> : null}
        </article>
      })}</div>
    </section>
  )
}

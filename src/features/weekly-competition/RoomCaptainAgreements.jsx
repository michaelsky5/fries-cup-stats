import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from './RoomCaptainAgreements.module.css'

const ownTeam = data => data.access.representativeTeams.find(id => [data.match.teamA.id, data.match.teamB.id].includes(id))
const teamName = (data, side) => data.match[`team${side}`]?.shortName || data.match[`team${side}`]?.name

function useAgreementCommand(data, command) {
  const pending = useRef(null)
  useEffect(() => { pending.current = null }, [data.revision, data.match.revision, data.draftRevision])
  return async (action, view, extra = {}) => {
    const identity = JSON.stringify([action, view?.id, view?.context, extra])
    if (pending.current?.identity !== identity) pending.current = { identity, payload: { teamId: ownTeam(data), ...(view?.context ? { agreementContext: view.context } : {}), ...(view?.id ? { agreementId: view.id } : {}), ...extra,
      expectedRevision: data.revision, matchRevision: data.match.revision, draftRevision: data.draftRevision, clientKey: crypto.randomUUID() } }
    if (await command(action, pending.current.payload)) pending.current = null
  }
}

function ConfirmationStatus({ data, view }) {
  const locale = useUiLocale()
  return <div className={styles.status} aria-label={uiText('双方确认状态', locale)}>{['A', 'B'].map(side => <span key={side} data-confirmed={view.confirmations?.some(item => item.side === side && item.confirmed)}>{teamName(data, side)} · {uiText(view.confirmations?.some(item => item.side === side && item.confirmed) ? '已确认' : '待确认', locale)}</span>)}</div>
}

export function RoomLineupReopen({ data, disabled, command, teamId }) {
  const locale = useUiLocale(), send = useAgreementCommand(data, command)
  const [note, setNote] = useState(''), view = data.captainAgreements?.lineup
  if (!view || !(view.withdrawTeams?.length || view.canRequest || view.canRespond || view.canCancel || view.valid && view.status === 'PENDING')) return null
  const withdrawTeam = view.withdrawTeams?.includes(teamId) ? teamId : view.withdrawTeams?.[0]
  return <section className={`${styles.panel} ${styles.lineupReopen}`} data-room-slot="lineup-reopen" aria-label={uiText('首发更正', locale)}>
    {withdrawTeam ? <><p>{uiText('本队首发尚未公开，可撤回后修改；原阶段计时继续。', locale)}</p><button type="button" disabled={disabled} onClick={() => send('WITHDRAW_LINEUP', null, { teamId: withdrawTeam })}>{uiText('撤回本队密封首发', locale)}</button></>
      : view.valid && view.status === 'PENDING' ? <><p>{teamName(data, view.proposerSide)} · {view.reason}</p><ConfirmationStatus data={data} view={view} /><p>{uiText('双方同意后重新确认首发。等待期间原首发和计时仍有效；Ban 开始后申请失效。', locale)}</p><div className={styles.actions}>{view.canRespond && <><button type="button" disabled={disabled} onClick={() => send('RESPOND_LINEUP_REOPEN', view, { ready: true })}>{uiText('同意重新确认首发', locale)}</button><button type="button" disabled={disabled} onClick={() => send('RESPOND_LINEUP_REOPEN', view, { ready: false })}>{uiText('保留原首发', locale)}</button></>}{view.canCancel && <button type="button" disabled={disabled} onClick={() => send('RESPOND_LINEUP_REOPEN', view, { ready: false })}>{uiText('撤回重开申请', locale)}</button>}</div></>
        : view.canRequest && <><strong>{uiText('申请双方重新确认首发', locale)}</strong><form onSubmit={event => { event.preventDefault(); return send('REQUEST_LINEUP_REOPEN', null, { note: note.trim() }) }}><label>{uiText('公开更正原因', locale)}<input value={note} onChange={event => setNote(event.target.value)} required minLength={2} maxLength={500} disabled={disabled} /></label><p>{uiText('首发已公开，需要另一方同意；地图、Ban 权和准备总截止保留。', locale)}</p><button disabled={disabled || note.trim().length < 2}>{uiText('请另一方确认', locale)}</button></form></>}
  </section>
}

export function RoomMapResultAgreement({ data, disabled, command, onSupport }) {
  const locale = useUiLocale(), send = useAgreementCommand(data, command)
  const [note, setNote] = useState(''), view = data.captainAgreements?.result
  if (!view || !['PENDING', 'DISPUTED', 'EXPIRED'].includes(view.status)) return null
  return <section className={styles.panel} aria-label={uiText('核对本图比分', locale)}><strong>{uiText(view.status === 'EXPIRED' ? '比分确认已失效，请重新核对' : view.status === 'DISPUTED' ? '本图比分存在异议' : '等待双方核对本图比分', locale)}</strong>
    <p className={styles.score}>{teamName(data, 'A')} <b>{view.payload?.scoreA} : {view.payload?.scoreB}</b> {teamName(data, 'B')}</p><p>{uiText('待确认比分尚未计入大比分，确认后才会开放下一图。', locale)}</p><ConfirmationStatus data={data} view={view} />
    {view.dispute && <p>{view.dispute.by} · {view.dispute.reason}</p>}
    <div className={styles.actions}>{view.canConfirm && <button type="button" disabled={disabled} onClick={() => send('CONFIRM_MAP_RESULT', view)}>{uiText('确认对方录入的本图比分', locale)}</button>}{view.canWithdraw && <button type="button" disabled={disabled} onClick={() => send('WITHDRAW_MAP_RESULT', view)}>{uiText('撤回待确认比分', locale)}</button>}{onSupport && <button type="button" onClick={onSupport}>{uiText('联系赛事组', locale)}</button>}</div>
    {view.canDispute && <details><summary>{uiText('比分不对，提出异议', locale)}</summary><form onSubmit={event => { event.preventDefault(); return send('DISPUTE_MAP_RESULT', view, { note: note.trim() }) }}><label>{uiText('公开核对说明', locale)}<textarea required minLength={2} maxLength={500} disabled={disabled} value={note} onChange={event => setNote(event.target.value)} /></label><button disabled={disabled || note.trim().length < 2}>{uiText('提交本图比分异议', locale)}</button></form></details>}
  </section>
}

export function RoomPreparationContinuation({ data, disabled, command }) {
  const locale = useUiLocale(), send = useAgreementCommand(data, command)
  const view = data.captainAgreements?.preparation
  if (!view || !data.timing?.noRefereePolicy || !data.timing?.preparationOverdue) return null
  const confirmedByThisTeam = view.valid && view.confirmations?.some(item => item.confirmed && data.match[`team${item.side}`]?.id === ownTeam(data))
  return <section className={styles.panel} aria-label={uiText('准备超时后继续开赛', locale)}><strong>{uiText(view.agreed ? '双方已同意超时继续开赛' : '准备超时后，由双方确认继续', locale)}</strong><ConfirmationStatus data={data} view={view} />
    <details><summary>{uiText('继续开赛条件与记录', locale)}</summary><p>{uiText('仅在双方五人到齐、地图/首发/Ban 完整且已到计划时间时允许。原截止和违例记录保留，不重新补时；人员或选禁变化后须重新确认。', locale)}</p></details>
    {view.canConfirm ? <button type="button" disabled={disabled} onClick={() => send('CONFIRM_PREPARATION_CONTINUE', view)}>{uiText('本队同意按当前记录继续开赛', locale)}</button> : !view.agreed && <p>{uiText(confirmedByThisTeam ? '本队已确认，等待另一方；仍有异议时联系赛事组。' : '请先处理其他准备事项，再由双方确认；仍缺人或有异议时留证联系赛事组。', locale)}</p>}
  </section>
}

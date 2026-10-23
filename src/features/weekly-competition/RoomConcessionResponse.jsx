import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'

import { useState, useRef, useEffect } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import styles from './WeeklyLiveRoomPage.module.css'

export default function RoomConcessionResponse({ data, disabled, mutate }) {
  const locale = useUiLocale()
  const { liveRoomWrite } = useRoomTransport()
  const [action, setAction] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState('')
  const dialog = useRef(null), pending = useRef(null), snapshot = useRef(null)
  useEffect(() => { if (action) dialog.current?.showModal(); else dialog.current?.close() }, [action])
  const access = data.forfeit
  const labels = { ACKNOWLEDGE: '确认知悉', DISPUTE: '提出异议，交管理员复核', RESOLVE_DISPUTE: '记录管理员复核结论' }
  const open = next => { if (pending.current) { setAction(pending.current.action); return } snapshot.current = { matchRevision: data.match.revision, draftRevision: data.draftRevision }; setAction(next); setReason(next === 'ACKNOWLEDGE' ? '本队已知悉对方放弃剩余地图。' : ''); setError('') }
  return <>
    {access.response?.acknowledgedAt && <small>{uiText("对方已确认知悉", locale)}</small>}
    {access.response?.dispute && <p role="status">{uiText("弃图异议：", locale)}{access.response.dispute.status === 'OPEN' ? uiText('等待管理员复核，未结算积分暂停结算。', locale) : access.response.dispute.resolution}</p>}
    {access.canAcknowledge && <button disabled={disabled} onClick={() => open('ACKNOWLEDGE')}>{uiText("确认知悉", locale)}</button>}
    {access.canDispute && <button disabled={disabled} onClick={() => open('DISPUTE')}>{uiText("对弃图记录有异议", locale)}</button>}
    {access.canResolveDispute && <button disabled={disabled} onClick={() => open('RESOLVE_DISPUTE')}>{uiText("复核弃图异议", locale)}</button>}
    <dialog ref={dialog} className={styles.dialog} onCancel={event => { if (disabled) event.preventDefault(); else setAction('') }} aria-label={uiText(labels[action] || '弃图响应', locale)}>
      <form onSubmit={async event => {
        event.preventDefault()
        pending.current ||= { action, reason: reason.trim(), ...snapshot.current, clientKey: crypto.randomUUID() }
        const saved = await mutate(async () => {
          try { return await liveRoomWrite(data.match.id, '/forfeit', pending.current) }
          catch (failure) { if (failure.status && failure.status < 500) pending.current = null; setError(failure.message); throw failure }
        }, uiText('响应已记录。', locale))
        if (saved) { pending.current = null; setAction('') }
      }}>
        <h2>{uiText(labels[action], locale)}</h2>
        <p>{uiText("放弃剩余地图已经生效。对方知悉确认不会阻止规则允许的弃图。异议由管理员复核，比分更正和积分冲正须留痕处理。", locale)}</p>
        {action !== 'ACKNOWLEDGE' && <label>{uiText("公开说明", locale)}<textarea required minLength={2} maxLength={2000} value={reason} disabled={disabled || !!pending.current} onChange={event => setReason(event.target.value)} /></label>}
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}><button type="button" disabled={disabled} onClick={() => setAction('')}>{uiText("返回", locale)}</button><button disabled={disabled || reason.trim().length < 2}>{uiText(labels[action], locale)}</button></div>
      </form>
    </dialog>
  </>
}


import { useState, useRef, useEffect } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import styles from './WeeklyLiveRoomPage.module.css'

export default function RoomConcessionResponse({ data, disabled, mutate }) {
  const { liveRoomWrite } = useRoomTransport()
  const [action, setAction] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState('')
  const dialog = useRef(null), pending = useRef(null), snapshot = useRef(null)
  useEffect(() => { if (action) dialog.current?.showModal(); else dialog.current?.close() }, [action])
  const access = data.forfeit
  const labels = { ACKNOWLEDGE: '确认知悉', DISPUTE: '提出异议，交管理员复核', RESOLVE_DISPUTE: '记录管理员复核结论' }
  const open = next => { if (pending.current) { setAction(pending.current.action); return } snapshot.current = { matchRevision: data.match.revision, draftRevision: data.draftRevision }; setAction(next); setReason(next === 'ACKNOWLEDGE' ? '本队已知悉对方放弃剩余地图。' : ''); setError('') }
  return <>
    {access.response?.acknowledgedAt && <small>对方已确认知悉</small>}
    {access.response?.dispute && <p role="status">弃图异议：{access.response.dispute.status === 'OPEN' ? '等待管理员复核，未结算积分暂停结算。' : access.response.dispute.resolution}</p>}
    {access.canAcknowledge && <button disabled={disabled} onClick={() => open('ACKNOWLEDGE')}>确认知悉</button>}
    {access.canDispute && <button disabled={disabled} onClick={() => open('DISPUTE')}>对弃图记录有异议</button>}
    {access.canResolveDispute && <button disabled={disabled} onClick={() => open('RESOLVE_DISPUTE')}>复核弃图异议</button>}
    <dialog ref={dialog} className={styles.dialog} onCancel={event => { if (disabled) event.preventDefault(); else setAction('') }} aria-label={labels[action] || '弃图响应'}>
      <form onSubmit={async event => {
        event.preventDefault()
        pending.current ||= { action, reason: reason.trim(), ...snapshot.current, clientKey: crypto.randomUUID() }
        const saved = await mutate(async () => {
          try { return await liveRoomWrite(data.match.id, '/forfeit', pending.current) }
          catch (failure) { if (failure.status && failure.status < 500) pending.current = null; setError(failure.message); throw failure }
        }, '响应已记录。')
        if (saved) { pending.current = null; setAction('') }
      }}>
        <h2>{labels[action]}</h2>
        <p>放弃剩余地图已经生效。对方知悉确认不会阻止规则允许的弃图。异议由管理员复核，比分更正和积分冲正须留痕处理。</p>
        {action !== 'ACKNOWLEDGE' && <label>公开说明<textarea required minLength={2} maxLength={2000} value={reason} disabled={disabled || !!pending.current} onChange={event => setReason(event.target.value)} /></label>}
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}><button type="button" disabled={disabled} onClick={() => setAction('')}>返回</button><button disabled={disabled || reason.trim().length < 2}>{labels[action]}</button></div>
      </form>
    </dialog>
  </>
}

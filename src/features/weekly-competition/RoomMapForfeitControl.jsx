import { useEffect, useRef, useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { formatOwMapName } from '../../lib/heroes.js'
import styles from './WeeklyLiveRoomPage.module.css'
import forfeitStyles from './RoomMapForfeitControl.module.css'

export default function RoomMapForfeitControl({ data, disabled, mutate }) {
  const locale = useUiLocale(), { liveRoomWrite } = useRoomTransport()
  const [open, setOpen] = useState(false), [side, setSide] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const dialog = useRef(null), viewed = useRef(null), pending = useRef(null)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  if (!data.mapForfeit?.canRecord) return null
  const rr5 = data.match.format === 'RR5', projection = data.mapForfeit.projections?.[side]
  const scoreA = projection?.scoreA ?? (data.series?.scoreA || 0) + (side === 'B' ? 1 : 0)
  const scoreB = projection?.scoreB ?? (data.series?.scoreB || 0) + (side === 'A' ? 1 : 0)
  return <>
    <button type="button" disabled={disabled} onClick={() => {
      viewed.current = { matchRevision: data.match.revision, draftRevision: data.draftRevision, openingRevision: data.opening?.revision || 0 }
      pending.current = null; setSide(''); setReason(''); setError(''); setConfirmed(false); setOpen(true)
    }}>{uiText(rr5 ? '登记第五图弃权' : '本图弃权', locale)}</button>
    <dialog ref={dialog} className={`${styles.dialog} ${forfeitStyles.dialog}`} aria-label={uiText('记录本图弃权', locale)} onCancel={() => setOpen(false)}>
      <form className={forfeitStyles.form} onChange={() => { pending.current = null }} onSubmit={async event => {
        event.preventDefault(); setError('')
        pending.current ||= { action: 'MAP_FORFEIT', forfeitedSide: side, reason: reason.trim(), ...(rr5 ? { confirmed } : {}), ...viewed.current, clientKey: crypto.randomUUID() }
        const saved = await mutate(async () => {
          try { return await liveRoomWrite(data.match.id, '/rulings', pending.current) }
          catch (failure) { if (failure.status && failure.status < 500) pending.current = null; setError(failure.message || uiText('提交尚未确认，请核对后重试。', locale)); throw failure }
        }, uiText('本图弃权已记录并向双方公布。', locale))
        if (saved) { pending.current = null; setOpen(false) }
      }}>
        <h2>{uiText('记录本图弃权', locale)}</h2>
        <p>{uiText('第 {0} 图 · {1}', locale, [data.map.order, formatOwMapName(data.map.name, locale)])}</p>
        <p>{uiText(rr5 ? '保留前四图实赛比分、截图和选手数据。第五图按弃权判负，不录入游戏小分或选手统计，弃权方该图不计参赛分。' : '只给对手增加一图胜场。达到本场获胜条件则结束，否则继续下一图。本图不生成游戏小分或选手统计。', locale)}</p>
        {data.mapForfeit.correction && <p>{uiText('本图之前被录成正常完成，本次将更正为弃权；原房间记录和更正原因会保留。', locale)}</p>}
        <label>{uiText('本图弃权方', locale)}<select required disabled={disabled} value={side} onChange={event => setSide(event.target.value)}>
          <option value="">{uiText('请选择队伍', locale)}</option>
          {['A', 'B'].map(value => <option key={value} value={value}>{data.match[`team${value}`].shortName || data.match[`team${value}`].name}</option>)}
        </select></label>
        {side && <p>{uiText('记录后大比分：{0} : {1}', locale, [scoreA, scoreB])} · {uiText(rr5 || Math.max(scoreA, scoreB) >= data.series.winTarget ? '达到获胜条件，进入整场赛果核对' : '尚未达到获胜条件，继续下一图', locale)}</p>}
        {rr5 && projection && <p>{uiText('预计积分：{0} : {1}；仍须审核、双方确认及结算。', locale, [projection.pointsA, projection.pointsB])}</p>}
        <label>{uiText('公开裁定依据', locale)}<textarea required disabled={disabled} minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
        {rr5 && <label className={forfeitStyles.confirm}><input type="checkbox" required disabled={disabled} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{uiText('确认第五图未实赛，已核对弃权方、比分和积分。', locale)}</label>}
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}><button type="button" onClick={() => setOpen(false)}>{uiText('返回核对', locale)}</button><button className={styles.primary} disabled={disabled || !side || reason.trim().length < 3 || rr5 && (!confirmed || !projection)}>{uiText('记录本图弃权并公布', locale)}</button></div>
      </form>
    </dialog>
  </>
}

import { useEffect, useRef, useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { formatOwMapName } from '../../lib/heroes.js'
import styles from './WeeklyLiveRoomPage.module.css'

export default function RoomMapForfeitControl({ data, disabled, mutate }) {
  const locale = useUiLocale(), { liveRoomWrite } = useRoomTransport()
  const [open, setOpen] = useState(false), [side, setSide] = useState(''), [reason, setReason] = useState('')
  const dialog = useRef(null), viewed = useRef(null), pending = useRef(null)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  if (!data.mapForfeit?.canRecord) return null
  const scoreA = (data.series?.scoreA || 0) + (side === 'B' ? 1 : 0)
  const scoreB = (data.series?.scoreB || 0) + (side === 'A' ? 1 : 0)
  return <>
    <button type="button" disabled={disabled} onClick={() => {
      viewed.current = { matchRevision: data.match.revision, draftRevision: data.draftRevision, openingRevision: data.opening?.revision || 0 }
      pending.current = null; setSide(''); setReason(''); setOpen(true)
    }}>{uiText('本图弃权', locale)}</button>
    <dialog ref={dialog} className={styles.dialog} aria-label={uiText('记录本图弃权', locale)} onCancel={() => setOpen(false)}>
      <form onChange={() => { pending.current = null }} onSubmit={async event => {
        event.preventDefault()
        pending.current ||= { action: 'MAP_FORFEIT', forfeitedSide: side, reason: reason.trim(), ...viewed.current, clientKey: crypto.randomUUID() }
        const saved = await mutate(async () => {
          try { return await liveRoomWrite(data.match.id, '/rulings', pending.current) }
          catch (error) { if (error.status && error.status < 500) pending.current = null; throw error }
        }, uiText('本图弃权已记录并向双方公布。', locale))
        if (saved) { pending.current = null; setOpen(false) }
      }}>
        <h2>{uiText('记录本图弃权', locale)}</h2>
        <p>{uiText('第 {0} 图 · {1}', locale, [data.map.order, formatOwMapName(data.map.name, locale)])}</p>
        <p>{uiText('只给对手增加一图胜场。达到本场获胜条件则结束，否则继续下一图。本图不生成游戏小分或选手统计。', locale)}</p>
        <label>{uiText('本图弃权方', locale)}<select required disabled={disabled} value={side} onChange={event => setSide(event.target.value)}>
          <option value="">{uiText('请选择队伍', locale)}</option>
          {['A', 'B'].map(value => <option key={value} value={value}>{data.match[`team${value}`].shortName || data.match[`team${value}`].name}</option>)}
        </select></label>
        {side && <p>{uiText('记录后大比分：{0} : {1}', locale, [scoreA, scoreB])} · {uiText(Math.max(scoreA, scoreB) >= data.series.winTarget ? '达到获胜条件，进入整场赛果核对' : '尚未达到获胜条件，继续下一图', locale)}</p>}
        <label>{uiText('公开裁定依据', locale)}<textarea required disabled={disabled} minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
        <div className={styles.actions}><button type="button" disabled={disabled} onClick={() => setOpen(false)}>{uiText('返回核对', locale)}</button><button className={styles.primary} disabled={disabled || !side || reason.trim().length < 3}>{uiText('记录本图弃权并公布', locale)}</button></div>
      </form>
    </dialog>
  </>
}

import { useEffect, useRef, useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { canExtendRoomPreparation, preparationExtensionDeadline } from './roomPreparationExtension.js'
import styles from './WeeklyLiveRoomPage.module.css'
import controls from './RoomPreparationControl.module.css'

export default function RoomPreparationControl({ data, disabled, mutate, onSaved }) {
  const locale = useUiLocale(), { liveRoomWrite } = useRoomTransport()
  const [seconds, setSeconds] = useState(600), [reason, setReason] = useState('')
  const pending = useRef(null)
  useEffect(() => { pending.current = null }, [data.match.revision, data.draftRevision, data.opening?.revision])
  if (!canExtendRoomPreparation(data)) return null
  const time = value => value ? new Date(value).toLocaleTimeString(locale, { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
  return <form className={controls.form} onChange={() => { pending.current = null }} onSubmit={async event => {
    event.preventDefault()
    if (disabled || reason.trim().length < 3) return
    pending.current ||= { action: 'EXTEND_PREPARATION', extensionSeconds: seconds, reason: reason.trim(), matchRevision: data.match.revision, draftRevision: data.draftRevision, openingRevision: data.opening?.revision || 0, clientKey: crypto.randomUUID() }
    const saved = await mutate(async () => {
      try { return await liveRoomWrite(data.match.id, '/rulings', pending.current) }
      catch (error) { if (error.status && error.status < 500) pending.current = null; throw error }
    }, uiText('准备加时已记录并向双方公布。', locale))
    if (saved) { pending.current = null; setReason(''); onSaved?.() }
  }}>
    <p>{uiText('本场赛管可处理技术延误，无需等待管理员在线。填写原因后，加时记录会向双方公开。', locale)}</p>
    <p>{uiText('当前准备截止', locale)} · <b>{time(data.timing.preparationDueAt)} UTC+8</b></p>
    <label>{uiText('追加准备时间', locale)}<select value={seconds} disabled={disabled} onChange={event => setSeconds(Number(event.target.value))}>{[300, 600, 900].map(value => <option key={value} value={value}>{uiText('{0} 分钟', locale, [value / 60])}</option>)}</select></label>
    <p>{uiText(data.timing.preparationOverdue ? '已超时，将从当前时间重新给予所选准备时间。' : '尚未超时，将在原截止时间后追加所选准备时间。', locale)}<br />{uiText('预计新截止', locale)} · <b>{time(preparationExtensionDeadline(data, seconds))} UTC+8</b></p>
    <label>{uiText('公开加时原因', locale)}<textarea value={reason} required minLength={3} maxLength={1000} disabled={disabled} onChange={event => setReason(event.target.value)} placeholder={uiText('例如：比赛房页面故障导致准备延误，已核对双方情况。', locale)} /></label>
    <p>{uiText('加时只调整本图准备总时限；开赛时间限制、首发与 Ban 校验继续执行。', locale)}</p>
    <button className={styles.primary} disabled={disabled || reason.trim().length < 3}>{uiText('确认加时并向双方公布', locale)}</button>
  </form>
}

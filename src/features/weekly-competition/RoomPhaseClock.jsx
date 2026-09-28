import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useRoomTransport } from './RoomTransport.jsx'
import { formatRoomClock, roomClockRemaining, roomClockHint, roomMapSide, ROOM_CLOCK_LABELS } from './roomPhaseClock.js'
import styles from './RoomPhaseClock.module.css'

export function useRoomClockSeconds(clock) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    setElapsed(0)
    if (!clock?.deadlineAt) return
    const start = performance.now()
    const timer = setInterval(() => setElapsed(performance.now() - start), 500)
    return () => clearInterval(timer)
  }, [clock?.serverNow, clock?.deadlineAt])
  return roomClockRemaining(clock, elapsed)
}

export function RoomSideBadge({ map, side }) {
  const locale = useUiLocale(), value = roomMapSide(map, side)
  return value ? <b className={styles.side} data-map-side={value}>{uiText(value === 'ATTACK' ? '先攻' : '先防', locale)}</b> : null
}

export function RoomMapSides({ map, match }) {
  if (!roomMapSide(map, 'A')) return null
  return <div className={styles.sides}>{['A', 'B'].map(side => <span key={side}><span>{match[`team${side}`].shortName || match[`team${side}`].name}</span><RoomSideBadge map={map} side={side} /></span>)}</div>
}

export function RoomCountdownHint({ data, action }) {
  const locale = useUiLocale(), hint = roomClockHint(data, action)
  return hint ? <p className={styles.hint} data-countdown-hint>{uiText(hint[0], locale, hint.slice(1))}</p> : null
}

export default function RoomPhaseClock({ data, disabled, mutate, stale = false }) {
  const locale = useUiLocale(), { liveRoomWrite } = useRoomTransport(), clock = data.result ? null : data.phaseClock
  const pending = useRef(null)
  useEffect(() => { pending.current = null }, [clock?.revision, clock?.stage?.key])
  const seconds = useRoomClockSeconds(clock), active = clock?.stage && !['IDLE', 'DISABLED'].includes(clock.status)
  const expired = active && clock.status !== 'WAITING' && seconds === 0
  const urgent = active && clock.status !== 'WAITING' && seconds > 0 && seconds <= 15
  const teamName = side => data.match[`team${side}`]?.shortName || data.match[`team${side}`]?.name
  const owner = clock?.stage?.side ? teamName(clock.stage.side) : clock?.stage?.pendingSides?.map(teamName).join(' / ')
  async function setClock(action, enabled) {
    if (!pending.current || pending.current.action !== action || pending.current.enabled !== enabled) pending.current = { action, ...(enabled === undefined ? {} : { enabled }), expectedRevision: clock.revision, stageKey: clock.stage?.key || null, clientKey: crypto.randomUUID() }
    const request = pending.current
    const saved = await mutate(async () => {
      try { return await liveRoomWrite(data.match.id, '/clock', request) }
      catch (failure) { if (failure.status && failure.status < 500) pending.current = null; throw failure }
    }, uiText('倒计时设置已保存，双方将同步看到。', locale))
    if (saved) pending.current = null
  }
  if (!clock) return null
  const stageLabel = clock.stage ? uiText(ROOM_CLOCK_LABELS[clock.stage.kind], locale) : uiText('阶段倒计时', locale)
  const status = stale ? uiText('同步中断 · 计时待核对', locale) : expired ? uiText('已超时', locale) : clock.status === 'WAITING' ? uiText('等待开始', locale) : clock.status === 'IDLE' ? uiText('等待下一阶段', locale) : ''
  const description = [stageLabel, owner, status].filter(Boolean).join(' · ')
  return <div className={styles.bar} data-room-slot="phase-clock" data-expired={Boolean(expired)} data-urgent={Boolean(urgent)} data-stale={stale} title={description} aria-label={description}>
    <div className={styles.caption}><span>{stageLabel}</span>{owner && <small>{owner}</small>}</div>
    <div className={styles.time}><strong className={styles.digits} role="timer" aria-live="off">{clock.status === 'IDLE' ? '—' : !clock.enabled ? uiText('已关闭', locale) : formatRoomClock(seconds)}</strong>{status && <small className={styles.status}>{status}</small>}</div>
    {clock.canManage && <details className={styles.controls} onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.open = false }}><summary aria-label={uiText('计时设置', locale)} title={uiText('计时设置', locale)}><span aria-hidden="true">▾</span></summary><div>
      <strong>{uiText('计时设置', locale)}</strong>
      <p>{uiText('英雄禁用超时自动放弃本轮禁用权；其他阶段超时提醒赛管。', locale)}</p>
      <button type="button" disabled={disabled || expired && clock.stage?.kind === 'BAN'} onClick={() => setClock('SET_ENABLED', !clock.enabled)}>{uiText(clock.enabled ? '关闭本场倒计时' : '开启本场倒计时', locale)}</button>
      {clock.enabled && clock.status === 'WAITING' && <button type="button" disabled={disabled} onClick={() => setClock('START')}>{uiText('开始本阶段计时', locale)}</button>}
      {clock.enabled && ['RUNNING', 'EXPIRED'].includes(clock.status) && <button type="button" disabled={disabled || expired && clock.stage?.kind === 'BAN'} onClick={() => setClock('EXTEND')}>{uiText('本阶段加时 60 秒', locale)}</button>}
    </div></details>}
    {expired && !stale && <p className={styles.alert} role="alert">{clock.stage?.kind === 'BAN' ? uiText('禁用时间已到，正在同步超时放弃结果。', locale) : data.access.staff ? uiText('本阶段已超时，请赛管核对后处理或加时。', locale) : uiText('本阶段已超时，请联系赛管；流程不会自动跳过。', locale)}</p>}
  </div>
}

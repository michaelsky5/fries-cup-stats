import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText, pickUiLocale } from '../../lib/uiText.js'
import { useRoomTransport } from './RoomTransport.jsx'
import { formatRoomClock, roomClockState, roomClockHint, roomMapSide, ROOM_CLOCK_LABELS } from './roomPhaseClock.js'
import styles from './RoomPhaseClock.module.css'
import { canExtendRoomPreparation } from './roomPreparationExtension.js'

export function useRoomClockState(clock) {
  const [sample, setSample] = useState({ key: '', elapsed: 0 })
  const key = `${clock?.serverNow}:${clock?.deadlineAt}:${clock?.receivedAtMonoMs}`
  useEffect(() => {
    if (!clock?.deadlineAt) return
    const anchor = clock.receivedAtMonoMs ?? performance.now()
    const update = () => setSample({ key, elapsed: Math.max(0, performance.now() - anchor) })
    update()
    const timer = setInterval(update, 250)
    return () => clearInterval(timer)
  }, [clock?.deadlineAt, clock?.receivedAtMonoMs, key])
  // A new server snapshot must never briefly reuse the preceding snapshot's age.
  return roomClockState(clock, sample.key === key ? sample.elapsed : 0)
}
export const useRoomClockSeconds = clock => useRoomClockState(clock).seconds

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

// Unmounting the menu also discards its open state when management permission disappears.
function RoomClockMenu({ label, children }) {
  const menuRef = useRef(null), [open, setOpen] = useState(false)
  useEffect(() => {
    const menu = menuRef.current
    if (!open || !menu?.parentElement.open) return
    const ancestors = []
    for (let node = menu.parentElement; node; node = node.parentElement) {
      ancestors.push(node)
      if (node.tagName === 'DIALOG') break
    }
    const measure = () => {
      const bottom = ancestors.reduce((limit, node) => ['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(node).overflowY) ? Math.min(limit, node.getBoundingClientRect().bottom) : limit, document.documentElement.clientHeight)
      menu.style.setProperty('--room-clock-menu-max-height', `${Math.max(0, Math.floor(bottom - menu.getBoundingClientRect().top - 8))}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    ancestors.forEach(node => observer.observe(node))
    window.addEventListener('resize', measure)
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); menu.style.removeProperty('--room-clock-menu-max-height') }
  }, [open])
  return <details className={styles.controls} onToggle={event => setOpen(event.currentTarget.open)} onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.open = false }}><summary aria-label={label} title={label}><span aria-hidden="true">▾</span></summary><div ref={menuRef}>{children}</div></details>
}

export default function RoomPhaseClock({ data, disabled, mutate, stale = false, onPreparationExtension, onPreparationDetails }) {
  const locale = useUiLocale(), { liveRoomWrite } = useRoomTransport(), clock = data.result ? null : data.phaseClock
  const pending = useRef(null)
  useEffect(() => { pending.current = null }, [clock?.revision, clock?.stage?.key])
  const { seconds, inSubmissionGrace } = useRoomClockState(clock), active = clock?.stage && !['IDLE', 'DISABLED'].includes(clock.status)
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
  const preparationLabel = pickUiLocale(locale, '准备时限', 'Preparation time limits', '준비 시간 제한', '準備時限')
  const deadlineTime = value => new Date(value).toLocaleTimeString(locale, { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC+8'
  const preparationTitle = [[data.timing?.arrivalDueAt, '到场截止'], [data.timing?.preparationDueAt, '准备截止']].filter(([value]) => value).map(([value, label]) => `${uiText(label, locale)} ${deadlineTime(value)}`).join(' · ')
  const preparationLink = data.phase === 'PREPARING' && preparationTitle && onPreparationDetails ? <button type="button" className={styles.preparation} data-room-slot="preparation-timing-entry" aria-label={preparationLabel} title={preparationTitle} onClick={onPreparationDetails}>{pickUiLocale(locale, '时限', 'Limits', '시한', '時限')}</button> : null
  if (!clock) return preparationLink && <div className={styles.bar} data-room-slot="phase-clock">{preparationLink}</div>
  const stageLabel = clock.stage ? uiText(ROOM_CLOCK_LABELS[clock.stage.kind], locale) : uiText('阶段倒计时', locale)
  const grace = clock.stage?.kind === 'MAP' && clock.mapTimeouts?.latest?.mapOrder === clock.stage.mapOrder ? clock.mapTimeouts.latest : null
  const status = stale ? uiText('同步中断 · 计时待核对', locale) : data.timing?.publicFault?.active ? uiText('公共故障 · 计时已暂停',locale) : data.timing?.preparationOverdue ? uiText(data.timing.noRefereePolicy ? data.captainAgreements?.preparation.agreed ? '准备超时 · 双方已同意继续' : '准备超时 · 完整准备后双方确认' : '准备总时限已到 · 请赛管处理',locale) : data.timing?.noRefereeGrace?.active ? uiText('单次准备补时 · 3 分钟', locale) : expired ? uiText('已超时', locale) : inSubmissionGrace ? uiText('补交宽限 · 请立即确认', locale) : clock.status === 'WAITING' ? uiText('等待开始', locale) : clock.status === 'IDLE' ? uiText('等待下一阶段', locale) : grace && clock.enabled ? uiText('第 {0} 次超时 · 补时', locale, [grace.count]) : ''
  const canExtendPreparation = Boolean(onPreparationExtension && canExtendRoomPreparation(data))
  const description = [stageLabel, owner, status, grace?.count >= 2 ? uiText('本图 Ban 权已取消', locale) : ''].filter(Boolean).join(' · ')
  const cannotAdjust = disabled || stale || expired && ['MAP', 'BAN'].includes(clock.stage?.kind)
  const toggleLabel = uiText(clock.enabled ? '关闭本场倒计时' : '开启本场倒计时', locale)
  return <div className={styles.bar} data-room-slot="phase-clock" data-expired={Boolean(expired)} data-urgent={Boolean(urgent)} data-submission-grace={inSubmissionGrace} data-stale={stale} title={description} aria-label={description}>
    <div className={styles.caption}><span>{stageLabel}</span>{owner && <small>{owner}</small>}</div>
    <div className={styles.time}><strong className={styles.digits} data-clock-display={clock.status !== 'IDLE' && !clock.enabled ? 'status' : 'digits'} role="timer" aria-live="off">{clock.status === 'IDLE' ? '—' : !clock.enabled ? uiText('已关闭', locale) : formatRoomClock(seconds)}</strong>{status && <small className={styles.status}>{status}</small>}</div>
    {preparationLink}
    {clock.canSkipRest && <button type="button" className={styles.skipRest} data-room-slot="skip-rest" aria-label={uiText('结束休息，开始选图', locale)} title={uiText('结束休息，开始选图', locale)} disabled={disabled || stale} onClick={() => setClock('SKIP_REST')}>{uiText('结束休息', locale)}</button>}
    {canExtendPreparation && data.timing.preparationOverdue ? <button type="button" className={styles.toggle} data-room-slot="phase-clock-toggle" disabled={disabled || stale} onClick={onPreparationExtension}>{uiText('处理超时', locale)}</button> : clock.canManage && <button type="button" className={styles.toggle} data-room-slot="phase-clock-toggle" disabled={cannotAdjust} aria-label={toggleLabel} title={toggleLabel} onClick={() => setClock('SET_ENABLED', !clock.enabled)}>{uiText(clock.enabled ? '关闭计时' : '恢复计时', locale)}</button>}
    {clock.canManage && <RoomClockMenu label={uiText('计时设置', locale)}>
      <strong>{uiText('计时设置', locale)}</strong>{data.timing?.preparationDueAt && <p>{uiText('准备总截止',locale)} · {new Date(data.timing.preparationDueAt).toLocaleTimeString(locale,{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'})} UTC+8</p>}{data.timing?.arrivalDueAt && <p>{uiText('到场宽限截止',locale)} · {new Date(data.timing.arrivalDueAt).toLocaleTimeString(locale,{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'})} UTC+8</p>}
      <p>{uiText('选图超时按本队整场累计：首次警告、第二次取消本图 Ban、第三次随机合法地图及攻防；前两次各补时 60 秒。英雄禁用超时直接放弃本轮禁用权。', locale)}</p>
      {clock.submissionGrace && <p>{uiText('选图和每轮 Ban 各有一次 15 秒补交宽限；选图处罚后的 60 秒补时与无效 Ban 的纠正窗口不再追加宽限。', locale)}</p>}
      <p>{uiText('关闭后暂停阶段计时和自动超时处理；准备总时限、到场宽限及计划开赛时间仍然有效。', locale)}</p>
      <button type="button" disabled={cannotAdjust} onClick={() => setClock('SET_ENABLED', !clock.enabled)}>{toggleLabel}</button>
      {canExtendPreparation && <button type="button" disabled={disabled || stale} onClick={onPreparationExtension}>{uiText('本图准备加时', locale)}</button>}
      {clock.enabled && clock.status === 'WAITING' && <button type="button" disabled={disabled || stale || data.timing?.notOpen || clock.canStartStage === false} onClick={() => setClock('START')}>{uiText('开始本阶段计时', locale)}</button>}
      {clock.enabled && clock.stage?.kind !== 'REST' && ['RUNNING', 'EXPIRED'].includes(clock.status) && <button type="button" disabled={cannotAdjust} onClick={() => setClock('EXTEND')}>{uiText('本阶段加时 60 秒', locale)}</button>}
    </RoomClockMenu>}
    {expired && !stale && clock.stage?.kind !== 'REST' && <p className={styles.alert} role="alert">{clock.stage?.kind === 'BAN' ? uiText('禁用时间已到，正在同步超时放弃结果。', locale) : clock.stage?.kind === 'MAP' ? uiText('选图时间已到，正在同步超时处罚。', locale) : data.access.staff ? uiText('本阶段已超时，请赛管核对后处理或加时。', locale) : uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '本阶段已超时，请尽快操作；需要协助时联系主队 A 或赛事组。' : '本阶段已超时，请尽快操作；需要协助时联系赛管或管理员。', locale)}</p>}
  </div>
}

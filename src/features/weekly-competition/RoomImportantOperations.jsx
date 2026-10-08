import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwHeroName, formatOwMapName } from '../../lib/heroes.js'
import { roomImportantEvents } from './roomPersonnelEvents.js'
import { observeRoomActivity } from './roomActivityPlayback.js'
import { roomRoleCode } from './roomLineups.js'
import styles from './RoomImportantOperations.module.css'

const labels = { REPRESENTATIVE_ASSIGNED: '操作代表更换', REFEREE_CHANGED: '赛管安排变更', EDITOR_HANDOFF: '赛管交接', LINEUP_CHANGE: '首发人员变更', LINEUPS: '首发确认', MAP: '地图选择', BAN_A: '英雄禁用', BAN_B: '英雄禁用', BAN_TIMEOUT: '英雄禁用', LIVE: '已记录本图开赛', RESULT: '本图比分 · 待审核' }
export default function RoomImportantOperations({ data, stale }) {
  const locale = useUiLocale(), t = (key, values) => uiText(key, locale, values)
  const [open, setOpen] = useState(false), [paused, setPaused] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false)
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false)
  const [activeId, setActiveId] = useState(''), [announcedId, setAnnouncedId] = useState('')
  const dialog = useRef(null), known = useRef(null), titleId = useId()
  const events = useMemo(() => roomImportantEvents(data), [data])
  const rotating = [...events.filter(event => !event.mapOrder).slice(0, 3), ...events.filter(event => event.mapOrder === data.map?.order)].slice(0, 8)
  const scope = data.match.id + ':' + data.actor.id, signature = JSON.stringify(events.map(event => event.id)), cycleSignature = JSON.stringify(rotating.map(event => event.id))
  const held = paused || hovered || focused || open || stale
  useEffect(() => {
    if (stale) return
    const next = observeRoomActivity(known.current, { scope, ids: JSON.parse(signature), held })
    known.current = next.state
    if (next.activeId !== null) setActiveId(next.activeId)
    if (next.announcedId !== null) setAnnouncedId(next.announcedId)
  }, [signature, scope, stale, held])
  useEffect(() => {
    const ids = JSON.parse(cycleSignature)
    if (held || ids.length < 2) return
    const timer = setInterval(() => setActiveId(current => ids[(Math.max(0, ids.indexOf(current)) + 1) % ids.length]), 5000)
    return () => clearInterval(timer)
  }, [cycleSignature, held])
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  const team = side => data.match['team' + side].shortName || data.match['team' + side].name
  const describe = event => {
    if (event.body) return t(event.body)
    const prefix = event.mapOrder ? 'MAP ' + String(event.mapOrder).padStart(2, '0') + ' · ' : ''
    if (event.kind === 'MAP') return prefix + t('地图已确定：{0}', [formatOwMapName(event.map.name, locale)])
    if (event.kind === 'LINEUPS') return prefix + t('双方首发已公开')
    if (event.kind === 'BAN_TIMEOUT') return prefix + t('{0} 超时，已放弃本轮禁用', [team(event.side)])
    if (event.kind === 'BAN_A' || event.kind === 'BAN_B') return prefix + t('{0} 已禁用 {1}', [team(event.side), formatOwHeroName(event.hero, locale)])
    if (event.kind === 'LIVE') return prefix + t('已记录本图开赛')
    if (event.kind === 'RESULT') return prefix + team('A') + ' ' + event.scoreA + ' : ' + event.scoreB + ' ' + team('B')
    const changes = [event.added?.length ? t('换上') + ' ' + event.added.map(player => player.name || player.playerId).join(' / ') + ' · ' + t('换下') + ' ' + event.removed.map(player => player.name || player.playerId).join(' / ') : '', ...(event.roles || []).map(player => (player.name || player.playerId) + ' ' + roomRoleCode(player.previousRole) + ' → ' + roomRoleCode(player.role))].filter(Boolean)
    return prefix + team(event.side) + ' · ' + changes.join(' · ')
  }
  const selected = events.find(event => event.id === activeId) || events[0]
  const announcement = events.find(event => event.id === announcedId)
  if (!events.length) return null
  return <aside className={styles.panel} data-room-slot="important-operations" aria-label={t('重要操作动态')} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <strong className={styles.label}>{t(stale ? '上次同步记录' : '重要动态')}</strong>
    <button type="button" className={styles.message} title={describe(selected)} onClick={() => setOpen(true)}><span className={styles.category}>{t(labels[selected.kind])}</span><span>{describe(selected)}</span></button>
    <div className={styles.controls}><button type="button" aria-label={t(paused ? '继续动态播放' : '暂停动态播放')} aria-pressed={paused} onClick={() => { setPaused(value => !value); setFocused(false) }}>{paused ? '▶' : 'Ⅱ'}</button><button type="button" aria-label={t('下一条动态')} disabled={rotating.length < 2} onClick={() => setActiveId(rotating[(Math.max(0, rotating.findIndex(event => event.id === activeId)) + 1) % rotating.length].id)}>›</button><button type="button" className={styles.historyButton} onClick={() => setOpen(true)}>{t('记录')} <small>{events.length}</small></button></div>
    <span className={styles.announcement} role="status" aria-live="polite">{announcement ? describe(announcement) : ''}</span>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={() => setOpen(false)}><header><div><h2 id={titleId}>{t('重要操作记录')}</h2>{data.editingReferee && <small>{t('当前编辑赛管')}：{data.editingReferee.name}</small>}</div><button type="button" onClick={() => setOpen(false)}>{t('关闭')} ×</button></header><ul>{events.map(event => <li key={event.id}><b>{t(labels[event.kind])}</b>{event.createdAt && <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString(locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>}<p>{describe(event)}</p></li>)}</ul><small>{t('首发人员变更仅在双方名单公开后显示。')}</small></dialog>
  </aside>
}

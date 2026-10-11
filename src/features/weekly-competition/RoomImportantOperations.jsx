import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwHeroName, formatOwMapName } from '../../lib/heroes.js'
import { roomImportantEvents, roomActivitySide, roomTeamActivityEvents } from './roomPersonnelEvents.js'
import { observeRoomActivity } from './roomActivityPlayback.js'
import { roomRoleCode } from './roomLineups.js'
import styles from './RoomImportantOperations.module.css'

const labels = { REPRESENTATIVE_ASSIGNED: '本场操作代表', REFEREE_CHANGED: '赛管安排变更', EDITOR_HANDOFF: '赛管交接', LINEUP_CHANGE: '首发人员变更', LINEUPS: '首发确认', MAP: '地图选择', BAN_A: '英雄禁用', BAN_B: '英雄禁用', BAN_TIMEOUT: '英雄禁用', LIVE: '已记录本图开赛', RESULT: '本图比分 · 待审核' }
const eventLabel = event => event?.kind === 'BAN_TIMEOUT' && event.reason === 'MAP_SELECTION' ? '选图超时处罚' : labels[event?.kind]
const personnelChange = event => ['REPRESENTATIVE_ASSIGNED', 'REFEREE_CHANGED', 'EDITOR_HANDOFF', 'LINEUP_CHANGE'].includes(event?.kind)
export default function RoomImportantOperations({ data, stale, side }) {
  const locale = useUiLocale(), t = (key, values) => uiText(key, locale, values)
  const [open, setOpen] = useState(false), [paused, setPaused] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false)
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false)
  const [activeId, setActiveId] = useState(''), [announcedId, setAnnouncedId] = useState('')
  const dialog = useRef(null), known = useRef(null), titleId = useId()
  const history = useMemo(() => roomTeamActivityEvents(roomImportantEvents(data), data.match), [data])
  const events = useMemo(() => roomTeamActivityEvents(history, data.match, side), [history, data.match, side])
  const rotating = [...events.filter(event => !event.mapOrder).slice(0, 3), ...events.filter(event => event.mapOrder === data.map?.order)].slice(0, 8)
  const scope = data.match.id + ':' + data.actor.id + ':' + (side || 'all'), signature = JSON.stringify(events.map(event => event.id)), cycleSignature = JSON.stringify(rotating.map(event => event.id))
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
  const describe = (event, compact = false) => {
    if (!event) return t('暂无本队操作记录')
    if (event.body) return t(event.body)
    const prefix = event.mapOrder && !compact ? 'MAP ' + String(event.mapOrder).padStart(2, '0') + ' · ' : ''
    if (event.kind === 'MAP') return prefix + t('地图已确定：{0}', [formatOwMapName(event.map.name, locale)])
    if (event.kind === 'LINEUPS') return prefix + t('双方首发已公开')
    if (event.kind === 'BAN_TIMEOUT') return prefix + t(event.reason === 'MAP_SELECTION' ? '{0} 选图超时，本图 Ban 已取消' : '{0} 超时，已放弃本轮禁用', [team(event.side)])
    if (event.kind === 'BAN_A' || event.kind === 'BAN_B') return prefix + t('{0} 已禁用 {1}', [team(event.side), formatOwHeroName(event.hero, locale)])
    if (event.kind === 'LIVE') return prefix + t('已记录本图开赛')
    if (event.kind === 'RESULT') return prefix + team('A') + ' ' + event.scoreA + ' : ' + event.scoreB + ' ' + team('B')
    const changes = [event.added?.length ? t('换上') + ' ' + event.added.map(player => player.name || player.playerId).join(' / ') + ' · ' + t('换下') + ' ' + event.removed.map(player => player.name || player.playerId).join(' / ') : '', ...(event.roles || []).map(player => (player.name || player.playerId) + ' ' + roomRoleCode(player.previousRole) + ' → ' + roomRoleCode(player.role))].filter(Boolean)
    return prefix + (compact ? '' : team(event.side) + ' · ') + changes.join(' · ')
  }
  const selected = events.find(event => event.id === activeId) || events[0]
  const announcement = events.find(event => event.id === announcedId)
  if (!history.length) return null
  const selectedSide = selected ? roomActivitySide(selected, data.match) : null
  const party = selectedSide ? team(selectedSide) : selected?.mapOrder ? t('双方') : t('本场')
  const pausePlayback = () => { setPaused(value => !value); setFocused(false) }
  const nextEvent = () => setActiveId(rotating[(Math.max(0, rotating.findIndex(event => event.id === activeId)) + 1) % rotating.length].id)
  return <aside className={styles.panel} data-room-slot="important-operations" data-team-side={side} data-personnel-change={personnelChange(selected)} aria-label={side ? `${team(side)} · ${t('重要操作动态')}` : t('重要操作动态')} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    {!side && <strong className={styles.label}>{t(stale ? '上次同步记录' : '重要动态')}</strong>}
    <button type="button" className={styles.message} title={describe(selected)} aria-haspopup="dialog" onClick={() => setOpen(true)}>{side ? <><span className={styles.teamHeading}><b>{team(side)}</b><small>{t(stale ? '上次同步记录' : selected ? eventLabel(selected) : '重要动态')}{selected && !selectedSide ? ` · ${party}` : ''}</small><span aria-hidden="true">↗</span></span><span>{describe(selected, true)}</span></> : <>{party && <span className={styles.party} data-event-side={selectedSide || 'both'} title={party}>{party}</span>}<span className={styles.category}>{selected ? t(eventLabel(selected)) : t('重要动态')}</span><span>{describe(selected)}</span></>}</button>
    <div className={styles.controls}><button type="button" aria-label={t(paused ? '继续动态播放' : '暂停动态播放')} aria-pressed={paused} onClick={() => { setPaused(value => !value); setFocused(false) }}>{paused ? '▶' : 'Ⅱ'}</button><button type="button" aria-label={t('下一条动态')} disabled={rotating.length < 2} onClick={() => setActiveId(rotating[(Math.max(0, rotating.findIndex(event => event.id === activeId)) + 1) % rotating.length].id)}>›</button><button type="button" className={styles.historyButton} onClick={() => setOpen(true)}>{t('记录')} <small>{events.length}</small></button></div>
    <span className={styles.announcement} role="status" aria-live="polite">{announcement && !(side === 'B' && !roomActivitySide(announcement, data.match)) ? describe(announcement) : ''}</span>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={() => setOpen(false)}><header><div><h2 id={titleId}>{t('重要操作记录')}</h2>{data.editingReferee && <small>{t('当前编辑赛管')}：{data.editingReferee.name}</small>}</div><div className={styles.dialogTools}>{side && <><button type="button" aria-label={t(paused ? '继续动态播放' : '暂停动态播放')} aria-pressed={paused} onClick={pausePlayback}>{paused ? '▶' : 'Ⅱ'}</button><button type="button" aria-label={t('下一条动态')} disabled={rotating.length < 2} onClick={nextEvent}>›</button></>}<button type="button" onClick={() => setOpen(false)}>{t('关闭')} ×</button></div></header><ul>{history.map(event => <li key={event.id} data-personnel-change={personnelChange(event)}><b>{t(eventLabel(event))}</b>{event.createdAt && <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString(locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>}<p>{describe(event)}</p></li>)}</ul><small>{t('首发人员变更仅在双方名单公开后显示。')}</small></dialog>
  </aside>
}

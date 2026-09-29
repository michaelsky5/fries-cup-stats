import { roomBanLabel, roomBanResolved } from './roomBans.js'
import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwHeroName, formatOwMapName } from '../../lib/heroes.js'
import { getHeroImage, getMapImage } from '../../lib/reviewAssets.js'
import { roomRoleCode } from './roomLineups.js'
import { RoomMapSides } from './RoomPhaseClock.jsx'
import { roomDecisionSnapshot, changedRoomDecisions } from './roomDecisionEvents.js'
import styles from './RoomDecisionSummary.module.css'

export default function RoomDecisionSummary({ data, stale }) {
  const locale = useUiLocale(), text = (key, values) => uiText(key, locale, values)
  const snapshot = roomDecisionSnapshot(data), previous = useRef(null)
  const [recent, setRecent] = useState([]), [open, setOpen] = useState(false)
  const dialog = useRef(null)
  useEffect(() => {
    if (stale) return
    const changes = changedRoomDecisions(previous.current, snapshot)
    const reset = previous.current?.scope !== snapshot.scope || (previous.current?.map && !snapshot.map)
    previous.current = snapshot
    if (reset) { setRecent([]); setOpen(false) }
    else if (changes.length) setRecent(changes)
  }, [snapshot, stale])
  useEffect(() => {
    if (!recent.length) return
    const timer = setTimeout(() => setRecent([]), 12000)
    return () => clearTimeout(timer)
  }, [recent])
  useEffect(() => { if (open && snapshot.lineups) dialog.current?.showModal(); else dialog.current?.close() }, [open, snapshot.lineups])
  const map = snapshot.map
  if (!map) return null
  const teamName = side => data.match[`team${side}`].shortName || data.match[`team${side}`].name
  const validRecent = stale ? [] : recent.filter(event => snapshot.events.some(current => current.key === event.key))
  const headline = validRecent.map(event => event.kind === 'MAP' ? text(map.selectionMethod === 'TIMEOUT_RANDOM' ? '超时随机地图：{0}' : '地图已确定：{0}', [formatOwMapName(map.name, locale)]) : event.kind === 'LINEUPS' ? text('双方首发已公开') : event.kind === 'BAN_ORDER' ? text('{0} 先 Ban', [teamName(map.firstBanSide)]) : event.kind === 'BAN_TIMEOUT' ? text('{0} 超时，已放弃本轮禁用', [teamName(event.side)]) : text('{0} 已禁用 {1}', [teamName(event.side), formatOwHeroName(event.hero, locale)])).join(' · ')
  const changes = snapshot.lineups ? ['A', 'B'].flatMap(side => {
    const { added, removed, roles } = snapshot.lineups[side].changes
    return [added.length ? `${teamName(side)} · ${text('换上')} ${added.map(player => player.name).join(' / ')} · ${text('换下')} ${removed.map(player => player.name).join(' / ')}` : '', ...roles.map(player => `${teamName(side)} · ${player.name} ${roomRoleCode(player.previousRole)} → ${roomRoleCode(player.role)}`)].filter(Boolean)
  }) : []
  return <aside className={styles.recap} data-room-slot="decision-summary" data-new={validRecent.length > 0} data-lineup={!snapshot.lineups} aria-label={text('本图已确认信息')}>
    <div className={styles.heading} hidden={!headline}><span role="status" aria-live="polite" aria-atomic="true">{headline || text('本图已确认信息')}</span>{validRecent.length > 0 && <button type="button" onClick={() => setRecent([])} aria-label={text('收起更新提示')}>×</button>}</div>
    <div className={styles.facts}>
      <div className={styles.map}><img src={getMapImage(map.type, map.name)} alt="" /><div><strong>{formatOwMapName(map.name, locale)}</strong>{map.selectionMethod === 'TIMEOUT_RANDOM' && <small>{text('超时后系统随机')}</small>}<RoomMapSides map={map} match={data.match} /></div></div>
      {['A', 'B'].map(side => <div className={styles.ban} key={side} data-locked={roomBanResolved(map, side)}>{map[`ban${side}`] ? <img src={getHeroImage(map[`ban${side}`])} alt="" /> : <span className={styles.empty}>—</span>}<div><small>{map.firstBanSide ? `${teamName(side)} · ${text(map.firstBanSide === side ? '先 Ban' : '后 Ban')}` : text('{0} 禁用', [teamName(side)])}</small><strong>{roomBanLabel(map, side, locale, '待选择')}</strong></div></div>)}
      <button type="button" className={styles.lineups} disabled={!snapshot.lineups} onClick={() => setOpen(true)} data-changed={changes.length > 0}><strong>{text(snapshot.lineups ? '首发已公开' : '首发暂未公开')}{snapshot.lineups ? ' ↗' : ''}</strong><small>{text(changes.length ? '本图有人选或职责变动' : snapshot.lineups ? '查看双方 D D T S S' : '双方确认后一起公开')}</small></button>
    </div>
    {changes.length > 0 && <div className={styles.changes} title={changes.join('；')}>{changes.join('；')}</div>}
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setOpen(false)} aria-labelledby="room-revealed-lineups-title">
      <header><div><small>{formatOwMapName(map.name, locale)} / D D T S S</small><h2 id="room-revealed-lineups-title">{text('双方首发与本图变动')}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label={text('关闭')}>×</button></header>
      <div className={styles.teams}>{snapshot.lineups && ['A', 'B'].map(side => {
        const lineup = snapshot.lineups[side], delta = lineup.changes
        return <section key={side}><h3>{teamName(side)}</h3><ol>{lineup.players.map((player, index) => <li key={player.playerId}><b>{index + 1} {roomRoleCode(player.role)}</b><span><strong>{player.name}</strong><small>{player.battleTag}</small></span>{delta.added.some(item => item.playerId === player.playerId) && <em>{text('换上')}</em>}{delta.roles.filter(item => item.playerId === player.playerId).map(item => <em key={item.playerId}>{roomRoleCode(item.previousRole)} → {roomRoleCode(item.role)}</em>)}</li>)}</ol><p>{delta.removed.length ? `${text('换下')}：${delta.removed.map(player => player.name).join(' / ')}` : text(delta.baseline ? '沿用上一图人员' : '本图首次公布首发')}</p></section>
      })}</div><p>{text('以上信息在双方提交后同时公开；查看信息不影响当前操作和倒计时。')}</p>
    </dialog>
  </aside>
}

import { roomBanLabel, roomBanResolved } from './roomBans.js'
import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwMapName } from '../../lib/heroes.js'
import { getHeroImage, getMapImage } from '../../lib/reviewAssets.js'
import { roomRoleCode } from './roomLineups.js'
import { RoomMapSides } from './RoomPhaseClock.jsx'
import { roomDecisionSnapshot } from './roomDecisionEvents.js'
import styles from './RoomDecisionSummary.module.css'

export default function RoomDecisionSummary({ data }) {
  const locale = useUiLocale(), text = (key, values) => uiText(key, locale, values)
  const snapshot = roomDecisionSnapshot(data)
  const [open, setOpen] = useState(false)
  const dialog = useRef(null)
  useEffect(() => { if (open && snapshot.lineups) dialog.current?.showModal(); else dialog.current?.close() }, [open, snapshot.lineups])
  const map = snapshot.map
  if (!map) return null
  const teamName = side => data.match[`team${side}`].shortName || data.match[`team${side}`].name
  const changes = snapshot.lineups ? ['A', 'B'].flatMap(side => {
    const { added, removed, roles } = snapshot.lineups[side].changes
    return [added.length ? `${teamName(side)} · ${text('换上')} ${added.map(player => player.name).join(' / ')} · ${text('换下')} ${removed.map(player => player.name).join(' / ')}` : '', ...roles.map(player => `${teamName(side)} · ${player.name} ${roomRoleCode(player.previousRole)} → ${roomRoleCode(player.role)}`)].filter(Boolean)
  }) : []
  return <aside className={styles.recap} data-room-slot="decision-summary" data-lineup={!snapshot.lineups} aria-label={text('本图已确认信息')}>
    <div className={styles.facts}>
      <div className={styles.map}><img src={getMapImage(map.type, map.name)} alt="" /><div><strong>{formatOwMapName(map.name, locale)}</strong>{map.selectionMethod === 'TIMEOUT_RANDOM' && <small>{text('超时后系统随机')}</small>}<RoomMapSides map={map} match={data.match} /></div></div>
      {['A', 'B'].map(side => <div className={styles.ban} key={side} data-locked={roomBanResolved(map, side)}>{map[`ban${side}`] ? <img src={getHeroImage(map[`ban${side}`])} alt="" /> : <span className={styles.empty}>—</span>}<div><small>{map.firstBanSide ? `${teamName(side)} · ${text(map.firstBanSide === side ? '先 Ban' : '后 Ban')}` : text('{0} 禁用', [teamName(side)])}</small><strong>{roomBanLabel(map, side, locale, '待选择')}</strong></div></div>)}
      <button type="button" className={styles.lineups} disabled={!snapshot.lineups} onClick={() => setOpen(true)} data-changed={changes.length > 0}><strong>{text(snapshot.lineups ? '首发已公开' : '首发暂未公开')}{snapshot.lineups ? ' ↗' : ''}</strong><small>{text(changes.length ? '本图有人选或职责变动' : snapshot.lineups ? '查看双方 D D T S S' : '双方确认后一起公开')}</small></button>
    </div>
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setOpen(false)} aria-labelledby="room-revealed-lineups-title">
      <header><div><small>{formatOwMapName(map.name, locale)} / D D T S S</small><h2 id="room-revealed-lineups-title">{text('双方首发与本图变动')}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label={text('关闭')}>×</button></header>
      <div className={styles.teams}>{snapshot.lineups && ['A', 'B'].map(side => {
        const lineup = snapshot.lineups[side], delta = lineup.changes
        return <section key={side}><h3>{teamName(side)}</h3><ol>{lineup.players.map((player, index) => <li key={player.playerId}><b>{index + 1} {roomRoleCode(player.role)}</b><span><strong>{player.name}</strong><small>{player.battleTag}</small></span>{delta.added.some(item => item.playerId === player.playerId) && <em>{text('换上')}</em>}{delta.roles.filter(item => item.playerId === player.playerId).map(item => <em key={item.playerId}>{roomRoleCode(item.previousRole)} → {roomRoleCode(item.role)}</em>)}</li>)}</ol><p>{delta.removed.length ? `${text('换下')}：${delta.removed.map(player => player.name).join(' / ')}` : text(delta.baseline ? '沿用上一图人员' : '本图首次公布首发')}</p></section>
      })}</div><p>{text('以上信息在双方提交后同时公开；查看信息不影响当前操作和倒计时。')}</p>
    </dialog>
  </aside>
}

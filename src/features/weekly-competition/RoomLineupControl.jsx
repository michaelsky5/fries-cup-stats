import { useEffect, useRef, useState } from 'react'
import { ROOM_ROLE_ORDER, roomRoleCode, roomLineupTurn, sortRoomLineup, validRoomLineup } from './roomLineups.js'
import styles from './WeeklyRoomWorkspace.module.css'

export default function RoomLineupControl({ data, side, disabled, command }) {
  const roster = data.rosters.find(item => item.teamId === side.team.id)
  const saved = data.map?.[`lineup${side.key}`] || []
  const initial = saved.length ? saved : (roster?.members || []).filter(member => member.plannedStarter).slice(0, 5).map(member => ({ playerId: member.id, role: member.role }))
  const [selected, setSelected] = useState(initial)
  const pending = useRef(null)
  useEffect(() => { pending.current = null }, [data.revision, data.match.revision, data.draftRevision])
  const locked = Boolean(data.map?.lineupLocks?.[side.key] || saved.length === 5)
  const ownTurn = roomLineupTurn(data.map) === side.key
  const canEdit = !disabled && !locked && ownTurn
  const edit = next => { pending.current = null; setSelected(next) }
  const toggle = member => edit(selected.some(item => item.playerId === member.id) ? selected.filter(item => item.playerId !== member.id) : selected.length < 5 ? [...selected, { playerId: member.id, role: member.role }] : selected)
  const valid = validRoomLineup(selected)
  const ordered = sortRoomLineup(selected)
  const previous = [...(data.maps || [])].reverse().find(map => map.order < data.map.order)?.[`lineup${side.key}`] || []
  const reusable = validRoomLineup(previous) && previous.every(player => roster?.members.some(member => member.id === player.playerId))
  async function confirm() {
    if (!canEdit || !valid) return
    pending.current ||= { teamId: side.team.id, lineup: ordered.map(({ playerId, role }) => ({ playerId, role })), clientKey: crypto.randomUUID(), expectedRevision: data.revision, matchRevision: data.match.revision, draftRevision: data.draftRevision }
    if (await command('SET_LINEUP', pending.current)) pending.current = null
  }
  return <section className={styles.lineupEditor} aria-label={`${side.team.shortName || side.team.name} 本图首发与职责`}>
    <header><strong>{side.team.shortName || side.team.name}</strong><span>{locked ? '已确认并锁定' : ownTurn ? '轮到本队确认' : '等待选图方先确认'}</span></header>
    {canEdit && reusable && <button type="button" onClick={() => edit(previous.map(({ playerId, role }) => ({ playerId, role })))}>沿用上一图人员与职责</button>}
    <div className={styles.lineupChoices}>{(roster?.members || []).map(member => {
      const entry = selected.find(item => item.playerId === member.id)
      return <div key={member.id} data-selected={!!entry}>
        <label><input type="checkbox" checked={!!entry} onChange={() => toggle(member)} disabled={!canEdit || (!entry && selected.length >= 5)} /><span><b>{member.name}</b><small>{member.battleTag}</small></span></label>
        <select aria-label={`${member.name} 本图职责`} value={entry?.role || member.role} disabled={!canEdit || !entry} onChange={event => edit(selected.map(item => item.playerId === member.id ? { ...item, role: event.target.value } : item))}>
          {!['DPS', 'TANK', 'SUP'].includes(entry?.role || member.role) && <option value={entry?.role || member.role}>请选择职责</option>}
          <option value="DPS">C · 输出</option><option value="TANK">T · 重装</option><option value="SUP">N · 支援</option>
        </select>
      </div>
    })}</div>
    <div className={styles.lobbyOrder} aria-label="游戏内 CCTNN 顺序">{ROOM_ROLE_ORDER.map((role, index) => <div key={index} data-valid={ordered[index]?.role === role}><b>{index + 1} · {roomRoleCode(role)}</b><span>{roster?.members.find(member => member.id === ordered[index]?.playerId)?.name || '待选择'}</span></div>)}</div>
    <footer><small>{valid ? '游戏房间从上到下也必须按此顺序排列。' : `已选 ${selected.length}/5；需要 2 输出、1 重装、2 支援。`}</small><button type="button" disabled={!canEdit || !valid} onClick={confirm}>{locked ? '本队首发已锁定' : ownTurn ? '确认五人、职责与顺序' : '等待对方确认'}</button></footer>
  </section>
}

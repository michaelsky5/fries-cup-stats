import { roomLineupDraftKey, readRoomLineupDraft, saveRoomLineupDraft, clearRoomLineupDraft } from './roomLineupDraft.js'
import { RoomCountdownHint } from './RoomPhaseClock.jsx'
import { useEffect, useRef, useState } from 'react'
import { ROOM_ROLE_ORDER, roomRoleCode, canSubmitRoomLineup, sortRoomLineup, validRoomLineup } from './roomLineups.js'
import styles from './WeeklyRoomWorkspace.module.css'

export default function RoomLineupControl({ data, side, disabled, command }) {
  const roster = data.rosters.find(item => item.teamId === side.team.id)
  const saved = data.map?.[`lineup${side.key}`] || []
  const previous = [...(data.maps || [])].reverse().find(map => map.order < data.map.order)?.[`lineup${side.key}`] || []
  const reusable = validRoomLineup(previous) && previous.every(player => roster?.members.some(member => member.id === player.playerId))
  const planned = (roster?.members || []).filter(member => member.plannedStarter).slice(0, 5).map(member => ({ playerId: member.id, role: member.role }))
  const initial = saved.length ? saved : reusable ? previous : planned
  const draftKey = roomLineupDraftKey(data, side.key)
  const [selected, setSelected] = useState(() => saved.length || data.simulation ? initial : readRoomLineupDraft(draftKey, roster?.members || []) || initial)
  const [storageError, setStorageError] = useState(false)
  const pending = useRef(null)
  useEffect(() => { pending.current = null }, [data.revision, data.match.revision, data.draftRevision])
  const locked = Boolean(data.map?.lineupLocks?.[side.key] || saved.length === 5)
  const ownTurn = canSubmitRoomLineup(data.map, side.key)
  const canEdit = !disabled && !locked && ownTurn
  const edit = next => { pending.current = null; setSelected(next); if (!data.simulation) setStorageError(!saveRoomLineupDraft(draftKey, next)) }
  useEffect(() => { if (locked && !data.simulation) clearRoomLineupDraft(draftKey) }, [locked, draftKey, data.simulation])
  const toggle = member => edit(selected.some(item => item.playerId === member.id) ? selected.filter(item => item.playerId !== member.id) : selected.length < 5 ? [...selected, { playerId: member.id, role: member.role }] : selected)
  const valid = validRoomLineup(selected)
  const ordered = sortRoomLineup(selected)
  async function confirm() {
    if (!canEdit || !valid) return
    pending.current ||= { teamId: side.team.id, lineup: ordered.map(({ playerId, role }) => ({ playerId, role })), ...(data.map.lineupContext ? { lineupContext: data.map.lineupContext } : {}), clientKey: crypto.randomUUID(), expectedRevision: data.revision, matchRevision: data.match.revision, draftRevision: data.draftRevision }
    if (await command('SET_LINEUP', pending.current)) { pending.current = null; if (!data.simulation) clearRoomLineupDraft(draftKey) }
  }
  return <section className={styles.lineupEditor} aria-label={`${side.team.shortName || side.team.name} 本图首发与职责`}>
    <header><strong>{side.team.shortName || side.team.name}</strong><span>{locked ? '已密封提交' : ownTurn ? data.map?.lineupMode === 'SIMULTANEOUS' ? '可独立确认 · 提交前对方不可见' : '轮到本队确认' : '等待选图方先确认'}</span></header>
    {canEdit && reusable && <div><small>已带入上一图人员与职责，可直接确认或调整。</small><button type="button" onClick={() => edit(planned)}>恢复计划首发</button></div>}
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
    <footer data-room-commit="lineup">{storageError && <small role="status">浏览器未能保留选择，请保持此页面打开。</small>}{!locked && <RoomCountdownHint data={data} action="SET_LINEUP" />}<small>{valid ? '确认即代表五人到场；提交后锁定，双方都确认才公开。游戏内按 CCTNN 排列。' : `已选 ${selected.length}/5；需要 2 输出、1 重装、2 支援。`}</small><button type="button" disabled={!canEdit || !valid} onClick={confirm}>{locked ? '本队首发已锁定' : ownTurn ? '确认五人到场、职责与顺序' : '等待对方确认'}</button></footer>
  </section>
}

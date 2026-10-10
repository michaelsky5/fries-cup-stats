import { useState } from 'react'
import RoomLineupControl from './RoomLineupControl.jsx'
import { canSubmitRoomLineup, roomLineupSubmitted } from './roomLineups.js'
import styles from './WeeklyRoomWorkspace.module.css'

export default function RoomLineupStage({ data, disabled, command }) {
  const [selectedSide, setSelectedSide] = useState('A')
  const sides = ['A', 'B'].map(key => ({ key, team: data.match[`team${key}`] }))
  const available = sides.filter(({ key, team }) => canSubmitRoomLineup(data.map, key) && (data.access.staff || data.access.representativeTeams.includes(team.id)))
  const active = available.find(side => side.key === selectedSide) || available[0]
  return <>
    <p className={styles.lineupInstruction}>{data.map?.lineupMode === 'SIMULTANEOUS' ? '双方独立确认五人和本图职责；提交后锁定，双方均确认才同时公开。允许换位，游戏内按 D D T S S 排列。' : '选图方先确认五人和本图职责，另一方随后确认；游戏内按 D D T S S 排列。'}</p>
    <div className={styles.lineupStatus} aria-label="双方首发提交状态">{sides.map(({ key, team }) => <div key={key} data-submitted={roomLineupSubmitted(data.map, key)}><b>{team.shortName || team.name}</b><span>{roomLineupSubmitted(data.map, key) ? '✓ 已密封提交' : '等待确认'}</span></div>)}</div>
    {available.length > 1 && <div className={styles.lineupTabs} aria-label="赛管代为确认队伍">{available.map(side => <button type="button" key={side.key} aria-pressed={active?.key === side.key} disabled={disabled} onClick={() => setSelectedSide(side.key)}>代 {side.team.shortName || side.team.name} 确认</button>)}</div>}
    {active ? <RoomLineupControl key={`${data.map?.lineupContext || data.map?.order}-${active.key}`} data={data} side={active} disabled={disabled} command={command} /> : <div className={styles.waiting}><strong>等待另一方提交首发</strong><p>双方完成后同时公开。尚未公开时可撤回本队提交并纠错，原阶段计时继续。</p></div>}
  </>
}

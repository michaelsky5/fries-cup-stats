import { roomBanLabel, roomBanResolved } from './roomBans.js'
import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwMapName } from '../../lib/heroes.js'
import { getHeroImage, getMapImage } from '../../lib/reviewAssets.js'
import { roomRoleCode } from './roomLineups.js'
import { RoomMapSides } from './RoomPhaseClock.jsx'
import { roomDecisionSnapshot } from './roomDecisionEvents.js'
import { getRoomLineupHighlights } from './roomLineupHighlights.js'
import styles from './RoomDecisionSummary.module.css'

export default function RoomDecisionSummary({ data, inline = false }) {
  const snapshot = roomDecisionSnapshot(data)
  if (!snapshot.map) return null
  // A different map or withdrawn public lineup must discard the preceding dialog state.
  const context = JSON.stringify([snapshot.scope, snapshot.map.order, snapshot.map.lineupContext || '', Boolean(snapshot.lineups)])
  return <DecisionSummaryContent key={context} data={data} snapshot={snapshot} inline={inline} />
}

function DecisionSummaryContent({ data, snapshot, inline }) {
  const locale = useUiLocale(), text = (key, values) => uiText(key, locale, values)
  const highlights = getRoomLineupHighlights(data, snapshot)
  const [open, setOpen] = useState(null)
  const dialog = useRef(null)
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  const map = snapshot.map
  const teamName = side => data.match[`team${side}`].shortName || data.match[`team${side}`].name
  const changed = ['A', 'B'].some(side => Object.keys(highlights[side]).length > 0)
  const mapFacts = <>
    <div className={styles.map}><img src={getMapImage(map.type, map.name)} alt="" /><div><strong title={formatOwMapName(map.name, locale)}>{formatOwMapName(map.name, locale)}</strong>{map.selectionMethod === 'TIMEOUT_RANDOM' && <small>{text('超时后系统随机')}</small>}<RoomMapSides map={map} match={data.match} /></div></div>
    {['A', 'B'].map(side => <div className={styles.ban} key={side} data-locked={roomBanResolved(map, side)}>{map[`ban${side}`] ? <img src={getHeroImage(map[`ban${side}`])} alt="" /> : <span className={styles.empty}>—</span>}<div><small title={teamName(side)}>{map.firstBanSide ? `${teamName(side)} · ${text(map.firstBanSide === side ? '先禁' : '后禁')}` : text('{0} 禁用', [teamName(side)])}</small><strong title={roomBanLabel(map, side, locale, '待选择')}>{roomBanLabel(map, side, locale, '待选择')}</strong></div></div>)}
  </>
  return <aside className={styles.recap} data-room-slot="decision-summary" data-lineup={!snapshot.lineups} data-inline={inline} aria-label={text('本图已确认信息')}>
    <div className={styles.facts}>{mapFacts}<button type="button" className={styles.lineups} disabled={!snapshot.lineups} onClick={() => setOpen('lineups')} data-changed={changed}><strong>{text(snapshot.lineups ? '首发已公开' : '首发暂未公开')}{snapshot.lineups ? ' ↗' : ''}</strong><small>{text(changed ? '本图有人选或职责变动' : snapshot.lineups ? '查看双方 D D T S S' : '双方确认后一起公开')}</small></button></div>
    {inline && <button type="button" className={styles.compactInfo} aria-haspopup="dialog" aria-expanded={Boolean(open)} data-changed={changed} onClick={() => setOpen('facts')}><strong>{text('本图信息')} ↗</strong><small title={formatOwMapName(map.name, locale)}>{formatOwMapName(map.name, locale)}</small></button>}
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setOpen(null)} aria-labelledby="room-revealed-lineups-title">
      <header><div><small>{formatOwMapName(map.name, locale)} / D D T S S</small><h2 id="room-revealed-lineups-title">{text(open === 'facts' ? '本图已确认信息' : '双方首发与本图变动')}</h2></div><button type="button" onClick={() => setOpen(null)} aria-label={text('关闭')}>×</button></header>
      {open === 'facts' && <section className={styles.detailFacts} aria-label={text('本图已确认信息')}>{mapFacts}</section>}
      <div className={styles.teams}>{snapshot.lineups && ['A', 'B'].map(side => {
        const lineup = snapshot.lineups[side], delta = lineup.changes
        const removed = Object.entries(highlights[side]).filter(([, change]) => change.kind === 'OUT').map(([playerId]) => data.rosters.find(roster => roster.teamId === data.match[`team${side}`].id)?.members.find(player => player.id === playerId)?.name || playerId)
        return <section key={side}><h3>{teamName(side)}</h3><ol>{lineup.players.map((player, index) => {
          const change = highlights[side][player.playerId]
          return <li key={player.playerId} data-lineup-change={change?.kind}><b>{index + 1} {roomRoleCode(player.role)}</b><span><strong>{player.name}</strong><small>{player.battleTag}</small></span>{change?.kind === 'IN' && <em>{text('换上')}</em>}{change?.kind === 'ROLE' && <em>{roomRoleCode(change.previousRole)} → {roomRoleCode(change.role)}</em>}</li>
        })}</ol><p>{removed.length ? `${text('换下')}：${removed.join(' / ')}` : text(Object.keys(highlights[side]).length ? '本图有人选或职责变动' : delta.baseline ? '沿用上一图人员' : '本图首次公布首发')}</p></section>
      })}</div><p>{text(snapshot.lineups ? '以上信息在双方提交后同时公开；查看信息不影响当前操作和倒计时。' : '双方确认后一起公开')}</p>
    </dialog>
  </aside>
}

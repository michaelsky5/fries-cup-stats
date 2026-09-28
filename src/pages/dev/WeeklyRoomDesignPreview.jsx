import { useSearchParams } from 'react-router-dom'
import { WeeklyRoomView } from '../../features/weekly-competition/WeeklyLiveRoomPage.jsx'
import { buildWeeklyRoomPreview, PREVIEW_ROLES, PREVIEW_STAGES } from './weeklyRoomPreviewModel.js'
import styles from './WeeklyRoomDesignPreview.module.css'

const messageLoader = async () => ({ items: [], hasMore: false })
const noWrite = async () => false

export default function WeeklyRoomDesignPreview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const stage = Object.hasOwn(PREVIEW_STAGES, searchParams.get('stage')) ? searchParams.get('stage') : 'lineup'
  const role = Object.hasOwn(PREVIEW_ROLES, searchParams.get('role')) ? searchParams.get('role') : 'representative'
  const data = buildWeeklyRoomPreview(stage, role)
  if (searchParams.get('changes') === '1' && data.map.lineupsRevealed) {
    const previous = structuredClone(data.map); previous.status = 'COMPLETE'; previous.scoreA = 2; previous.scoreB = 0
    data.map.order = 2; data.map.lineupContext = 'preview-second-map'; data.opening.mapOrder = 2; data.maps = [previous, data.map]
    data.map.lineupB[1] = { ...data.rosters[1].members[6], playerId: data.rosters[1].members[6].id }
    data.map.lineupA[0].role = 'SUP'; data.map.lineupA[3].role = 'TANK'
    data.phaseClock.stage = data.phaseClock.stage ? { ...data.phaseClock.stage, mapOrder: 2 } : null
  }
  if (searchParams.get('sides') === '1' && data.map?.name) { data.map.type = 'Escort'; data.map.name = 'Rialto'; data.map.attackFirstSide = 'B'; if (data.opening.setup) Object.assign(data.opening.setup, data.map) }
  if (searchParams.get('expired') === '1' && data.phaseClock.stage) { data.phaseClock.deadlineAt = new Date(Date.parse(data.phaseClock.serverNow) - 1000).toISOString(); data.phaseClock.status = 'EXPIRED' }
  const controller = { data, error: '', busy: false, notice: '', refresh: noWrite, mutate: noWrite, clearNotice: noWrite }
  const choose = (key, value) => setSearchParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); next.delete('matchId'); next.delete('layout'); return next }, { replace: true })
  return <div className={styles.preview} style={searchParams.get('frame') === 'room' ? { '--room-preview-toolbar': '0px' } : undefined}>{searchParams.get('frame') !== 'room' && <aside className={styles.controls} aria-label="比赛房预览设置"><strong>正式比赛房 UI · 示例数据</strong><label>阶段<select value={stage} onChange={event => choose('stage', event.target.value)}>{Object.entries(PREVIEW_STAGES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>身份<select value={role} onChange={event => choose('role', event.target.value)}>{Object.entries(PREVIEW_ROLES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><span>与正式房间共用组件 · 示例不写入比赛</span></aside>}<WeeklyRoomView preview key={`${stage}:${role}`} matchId={data.match.id} controller={controller} accountControl={<span>示例身份</span>} messageLoader={messageLoader} /></div>
}

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
  const controller = { data, error: '', busy: false, notice: '', refresh: noWrite, mutate: noWrite, clearNotice: noWrite }
  const choose = (key, value) => setSearchParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); next.delete('matchId'); next.delete('layout'); return next }, { replace: true })
  return <div className={styles.preview}><aside className={styles.controls} aria-label="比赛房预览设置"><strong>正式比赛房 UI · 示例数据</strong><label>阶段<select value={stage} onChange={event => choose('stage', event.target.value)}>{Object.entries(PREVIEW_STAGES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>身份<select value={role} onChange={event => choose('role', event.target.value)}>{Object.entries(PREVIEW_ROLES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><span>与正式房间共用组件 · 示例不写入比赛</span></aside><WeeklyRoomView key={`${stage}:${role}`} matchId={data.match.id} controller={controller} accountControl={<span>示例身份</span>} messageLoader={messageLoader} /></div>
}

import { useSearchParams } from 'react-router-dom'
import { WeeklyRoomView } from '../../features/weekly-competition/WeeklyLiveRoomPage.jsx'
import { buildWeeklyRoomPreview, PREVIEW_ROLES, PREVIEW_STAGES } from './weeklyRoomPreviewModel.js'
import styles from './WeeklyRoomDesignPreview.module.css'

const messageLoader = async () => ({ items: [], hasMore: false })
const noWrite = async () => false
// names=long: the longest names registration accepts (short name 24, team name 80; BattleTag 12 characters + digits)
// so the rosters and team headers can be checked for overlap. Synthetic text only.
const fill = (text, length) => text.repeat(Math.ceil(length / text.length)).slice(0, length)
function stretchPreviewNames(data) {
  for (const [index, team] of [data.match.teamA, data.match.teamB].entries()) {
    const side = index ? 'B' : 'A'
    team.shortName = fill('示例超长简称队伍', 23) + side
    team.name = fill('示例队伍全称很长用于检查换行与省略号', 79) + side
  }
  const people = new Map()
  data.rosters.forEach((roster, index) => [...roster.members, ...roster.staff].forEach((person, i) => {
    person.name = fill('示例选手超长显示名称', 23) + (i + 1)
    person.battleTag = `${fill('示例超长战网昵称', 11)}${index + 1}#${1234560 + i}`
    people.set(person.id, person)
  }))
  for (const map of data.maps) for (const key of ['lineupA', 'lineupB']) map[key] = map[key].map(player => ({ ...player, name: people.get(player.playerId)?.name ?? player.name, battleTag: people.get(player.playerId)?.battleTag ?? player.battleTag }))
  data.representatives?.sides.forEach((side, index) => Object.assign(side, { name: data.rosters[index].members[0].name, battleTag: data.rosters[index].members[0].battleTag }))
}

export default function WeeklyRoomDesignPreview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const stage = Object.hasOwn(PREVIEW_STAGES, searchParams.get('stage')) ? searchParams.get('stage') : 'lineup'
  const role = Object.hasOwn(PREVIEW_ROLES, searchParams.get('role')) ? searchParams.get('role') : 'representative'
  const data = buildWeeklyRoomPreview(stage, role)
  if (searchParams.get('names') === 'long') stretchPreviewNames(data)
  if (searchParams.get('changes') === '1' && data.map.lineupsRevealed) {
    const previous = structuredClone(data.map); previous.status = 'COMPLETE'; previous.scoreA = 2; previous.scoreB = 0
    data.map.order = 2; data.map.lineupContext = 'preview-second-map'; data.opening.mapOrder = 2; data.maps = [previous, data.map]
    data.map.lineupB[1] = { ...data.rosters[1].members[6], playerId: data.rosters[1].members[6].id }
    data.map.lineupA[0].role = 'SUP'; data.map.lineupA[3].role = 'TANK'
    data.phaseClock.stage = data.phaseClock.stage ? { ...data.phaseClock.stage, mapOrder: 2 } : null
  }
  if (searchParams.get('sides') === '1' && data.map?.name) { data.map.type = 'Escort'; data.map.name = 'Rialto'; data.map.attackFirstSide = 'B'; if (data.opening.setup) Object.assign(data.opening.setup, data.map) }
  if (searchParams.get('expired') === '1' && data.phaseClock.stage) { data.phaseClock.deadlineAt = new Date(Date.parse(data.phaseClock.serverNow) - 1000).toISOString(); data.phaseClock.status = 'EXPIRED' }
  const clockPreview = searchParams.get('clock')
  if (['warning', 'critical', 'grace'].includes(clockPreview) && data.phaseClock.stage) {
    const now = Date.parse(data.phaseClock.serverNow), seconds = clockPreview === 'warning' ? 10 : clockPreview === 'critical' ? 5 : 15
    const grace = Boolean(data.phaseClock.submissionGrace)
    data.phaseClock.deadlineAt = new Date(now + (seconds + (grace && clockPreview !== 'grace' ? 15 : 0)) * 1000).toISOString()
    if (grace) data.phaseClock.submissionGrace.normalDeadlineAt = new Date(now + (clockPreview === 'grace' ? 0 : seconds) * 1000).toISOString()
  }
  if (clockPreview === 'disabled') { data.phaseClock.enabled = false; data.phaseClock.deadlineAt = null; data.phaseClock.status = 'DISABLED' }
  const controller = { data, error: clockPreview === 'stale' ? '本地预览：同步中断' : '', busy: false, notice: '', refresh: noWrite, mutate: noWrite, clearNotice: noWrite }
  const choose = (key, value) => setSearchParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); next.delete('matchId'); next.delete('layout'); return next }, { replace: true })
  return <div className={styles.preview} style={searchParams.get('frame') === 'room' ? { '--room-preview-toolbar': '0px' } : undefined}>{searchParams.get('frame') !== 'room' && <aside className={styles.controls} aria-label="比赛房预览设置"><strong>正式比赛房 UI · 示例数据</strong><label>阶段<select value={stage} onChange={event => choose('stage', event.target.value)}>{Object.entries(PREVIEW_STAGES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>身份<select value={role} onChange={event => choose('role', event.target.value)}>{Object.entries(PREVIEW_ROLES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><span>与正式房间共用组件 · 示例不写入比赛</span></aside>}<WeeklyRoomView preview key={`${stage}:${role}`} matchId={data.match.id} controller={controller} accountControl={<span>示例身份</span>} messageLoader={messageLoader} /></div>
}

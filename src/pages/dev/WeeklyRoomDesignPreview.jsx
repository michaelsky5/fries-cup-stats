import { useSearchParams } from 'react-router-dom'
import { WeeklyRoomView } from '../../features/weekly-competition/WeeklyLiveRoomPage.jsx'
import { buildWeeklyRoomPreview, PREVIEW_ROLES, PREVIEW_STAGES } from './weeklyRoomPreviewModel.js'
import styles from './WeeklyRoomDesignPreview.module.css'
import { OW_HEROES, OW_MAPS } from '../../lib/heroes.js'

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
  const selectedMap = OW_MAPS.find(map => map.id === searchParams.get('map'))
  if (selectedMap && data.map?.name) {
    data.map.name = selectedMap.en
    data.map.type = selectedMap.mode[0].toUpperCase() + selectedMap.mode.slice(1)
    if (data.opening.setup) Object.assign(data.opening.setup, data.map)
  }
  if (data.opening.complete) for (const side of ['A', 'B']) {
    const hero = OW_HEROES.find(item => item.id === searchParams.get('ban' + side))
    if (hero) { data.map['ban' + side] = hero.en; if (data.opening.setup) data.opening.setup['ban' + side] = hero.en }
  }
  if (['warning', 'critical', 'grace'].includes(clockPreview) && data.phaseClock.stage) {
    const now = Date.parse(data.phaseClock.serverNow), seconds = clockPreview === 'warning' ? 10 : clockPreview === 'critical' ? 5 : 15
    const grace = Boolean(data.phaseClock.submissionGrace)
    data.phaseClock.deadlineAt = new Date(now + (seconds + (grace && clockPreview !== 'grace' ? 15 : 0)) * 1000).toISOString()
    if (grace) data.phaseClock.submissionGrace.normalDeadlineAt = new Date(now + (clockPreview === 'grace' ? 0 : seconds) * 1000).toISOString()
  }
  if (clockPreview === 'disabled') { data.phaseClock.enabled = false; data.phaseClock.deadlineAt = null; data.phaseClock.status = 'DISABLED' }
  const controller = { data, error: clockPreview === 'stale' ? '本地预览：同步中断' : '', busy: false, notice: '', refresh: noWrite, mutate: noWrite, clearNotice: noWrite }
  const choose = (key, value) => setSearchParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); next.delete('matchId'); next.delete('layout'); return next }, { replace: true })
  return <div className={styles.preview + ' ' + styles.withConfigPreview} style={searchParams.get('frame') === 'room' ? { '--room-preview-toolbar': '0px' } : undefined}>{searchParams.get('frame') !== 'room' && <>
    <aside className={styles.controls} aria-label="比赛房预览设置"><strong>正式比赛房 UI · 示例数据</strong><label>阶段<select value={stage} onChange={event => choose('stage', event.target.value)}>{Object.entries(PREVIEW_STAGES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>身份<select value={role} onChange={event => choose('role', event.target.value)}>{Object.entries(PREVIEW_ROLES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><span>与正式房间共用组件 · 示例不写入比赛</span></aside>
    <div className={styles.configControls} aria-label="游戏配置测试选项">
      <label>地图<select value={selectedMap?.id || OW_MAPS.find(map => map.en === data.map?.name)?.id || 'lijiang-tower'} onChange={event => choose('map', event.target.value)}>{OW_MAPS.map(map => <option key={map.id} value={map.id}>{map.zh}</option>)}</select></label>
      {['A', 'B'].map(side => <label key={side}>禁用 {side}<select value={OW_HEROES.find(hero => hero.en === data.map?.['ban' + side])?.id || ''} onChange={event => choose('ban' + side, event.target.value)}><option value="">等待禁用确认</option>{['tank', 'damage', 'support'].map(role => <optgroup key={role} label={{ tank: '重装', damage: '输出', support: '支援' }[role]}>{OW_HEROES.filter(hero => hero.role === role).map(hero => <option key={hero.id} value={hero.id}>{hero.zh}</option>)}</optgroup>)}</select></label>)}
      <span>切换阶段为“禁用完成 · 待开赛”，测试生成与复制</span>
    </div>
  </>}<WeeklyRoomView preview key={stage + ':' + role} matchId={data.match.id} controller={controller} accountControl={<span>示例身份</span>} messageLoader={messageLoader} /></div>
}

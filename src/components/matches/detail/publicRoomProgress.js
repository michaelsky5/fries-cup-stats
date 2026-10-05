import { formatOwMapName } from '../../../lib/heroes.js'
import { translateUiText as uiText } from '../../../lib/uiText.js'

const phases = ['PREPARING', 'LIVE', 'PAUSED', 'REVIEW', 'CANCELLED']
const stages = ['NOT_STARTED', 'ONE_V_ONE_SETUP', 'ONE_V_ONE_LIVE', 'PLAYING', 'DRAW', 'CONFIRMING_FIRST_PICK', 'CHOOSING', 'LINEUPS', 'BAN_ORDER', 'BANNING', 'COMPLETE', ...phases]
const mapStates = ['PENDING', 'LINEUPS', 'BANS', 'READY', 'LIVE', 'RESULT', 'COMPLETE']
const integer = value => Number.isInteger(value) && value >= 0

export function validatePublicRoomProgress(value, seasonId, matchId) {
  if (value?.schemaVersion !== 'friescup-weekly-progress-v1' || value.seasonId !== seasonId || value.matchId !== matchId
    || !phases.includes(value.phase) || !stages.includes(value.stage) || !Number.isFinite(Date.parse(value.updatedAt))
    || !integer(value.mapLimit) || value.mapLimit < 1 || value.mapLimit > 99 || !integer(value.activeMapOrder) || value.activeMapOrder < 1 || value.activeMapOrder > value.mapLimit
    || !integer(value.completedMaps) || value.completedMaps > value.mapLimit || !integer(value.scoreA) || !integer(value.scoreB)
    || value.scoreA + value.scoreB > value.completedMaps || !Array.isArray(value.maps) || value.maps.length > value.mapLimit) throw new Error('Invalid public room progress')
  const orders = new Set()
  const maps = value.maps.map(map => {
    if (!integer(map.order) || map.order < 1 || map.order > value.mapLimit || orders.has(map.order) || !mapStates.includes(map.status)
      || typeof map.name !== 'string' || map.name.length > 160 || typeof map.type !== 'string' || map.type.length > 40
      || (map.scoreA !== null && !integer(map.scoreA)) || (map.scoreB !== null && !integer(map.scoreB))
      || (map.status === 'COMPLETE' ? map.scoreA === null || map.scoreB === null : map.scoreA !== null || map.scoreB !== null)) throw new Error('Invalid public room map')
    orders.add(map.order)
    return { order: map.order, name: map.name, type: map.type, status: map.status, scoreA: map.scoreA, scoreB: map.scoreB }
  })
  // Discard any extra response fields. Public progress is separate from statistics.
  return { schemaVersion: value.schemaVersion, seasonId, matchId, updatedAt: value.updatedAt, phase: value.phase, stage: value.stage,
    activeMapOrder: value.activeMapOrder, mapLimit: value.mapLimit, completedMaps: value.completedMaps, scoreA: value.scoreA, scoreB: value.scoreB, maps }
}

export async function readPublicRoomProgress(seasonId, matchId, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`/api/admin-public/seasons/${encodeURIComponent(seasonId)}/matches/${encodeURIComponent(matchId)}/progress`, { signal, credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Public room progress temporarily unavailable')
  return validatePublicRoomProgress(await response.json(), seasonId, matchId)
}

export function presentPublicRoomProgress(base, dossier, room, locale) {
  if (!room || !base.active || !dossier.state.isWeekly || ['forfeit', 'ruling', 'complete', 'cancelled'].includes(base.key)) return base
  const t = (key, values) => uiText(key, locale, values)
  const key = room.phase === 'CANCELLED' ? 'cancelled' : room.phase === 'REVIEW' ? 'review' : room.phase === 'PREPARING' && !room.completedMaps ? 'upcoming' : 'live'
  const stageLabels = { CHOOSING: '选图', LINEUPS: '首发确认', BAN_ORDER: 'Ban 顺序', BANNING: '英雄禁用', COMPLETE: '等待实际开赛', LIVE: '本局进行中', PAUSED: '比赛暂停', REVIEW: '结果待审核', CANCELLED: '已取消' }
  const currentLabel = t(stageLabels[room.stage] || '赛前准备')
  const slots = Array.from({ length: room.mapLimit }, (_, i) => {
    const order = i + 1, map = room.maps.find(item => item.order === order), published = base.slots.find(slot => slot.order === order)
    const recorded = map?.status === 'COMPLETE'
    const current = order === room.activeMapOrder && !recorded && room.phase !== 'CANCELLED'
    const state = recorded ? 'recorded' : current ? room.phase === 'LIVE' ? 'live' : room.phase === 'PAUSED' ? 'paused' : 'preparing' : 'pending'
    return { order, record: published?.record, map: published?.map, state,
      name: map?.name ? formatOwMapName(map.name, locale) : published?.name || t('地图待公布'),
      roomScore: recorded ? `${map.scoreA} : ${map.scoreB}` : '',
      label: recorded ? t('已记录 · 待审核') : current ? currentLabel : t('待开赛') }
  })
  return { ...base, key, slots, recordedCount: room.completedMaps, roomProgress: true, updatedAt: room.updatedAt,
    scoreLabel: room.completedMaps || ['LIVE', 'PAUSED', 'REVIEW'].includes(room.phase) ? `${room.scoreA} : ${room.scoreB}` : 'VS',
    scoreTitle: t(room.phase === 'REVIEW' ? '待审核比分' : '当前比分'),
    statusLabel: room.phase === 'PREPARING' ? t('第 {0} 图 · {1}', [room.activeMapOrder, currentLabel]) : currentLabel,
    caption: t('比分与地图结果待审核，正式赛果以公布为准。') }
}

// One request at a time; stop hidden/offline pages, cancel on navigation, and
// retain the last good frame during a temporary outage. A 404 revokes it.
export function startRoomProgressPolling({ read, onChange, target = window, doc = document, interval = 5000, retry = 15000, schedule = setTimeout, cancel = clearTimeout }) {
  let disposed = false, timer, controller, running = false, refreshRequested = false, value = null, status = 'connecting'
  const available = () => !doc.hidden && target.navigator?.onLine !== false
  const emit = next => { status = next; onChange({ progress: value, status }) }
  const tick = async () => {
    if (disposed || running || !available()) return
    running = true; controller = new AbortController()
    const deadline = schedule(() => controller?.abort(), 8000)
    try {
      value = await read({ signal: controller.signal })
      if (!disposed) emit(value ? 'connected' : 'unavailable')
    } catch {
      if (!disposed) emit(available() ? 'reconnecting' : 'paused')
    } finally {
      cancel(deadline); running = false; controller = null
      if (!disposed && available()) {
        timer = schedule(tick, refreshRequested ? 0 : status === 'unavailable' ? 30000 : status === 'reconnecting' ? retry : interval)
        refreshRequested = false
      }
    }
  }
  const resume = () => {
    cancel(timer)
    if (!available()) { controller?.abort(); emit('paused'); return }
    if (running) refreshRequested = true
    else void tick()
  }
  doc.addEventListener('visibilitychange', resume)
  target.addEventListener('focus', resume); target.addEventListener('online', resume); target.addEventListener('offline', resume)
  if (available()) void tick(); else emit('paused')
  return () => {
    disposed = true; cancel(timer); controller?.abort()
    doc.removeEventListener('visibilitychange', resume)
    target.removeEventListener('focus', resume); target.removeEventListener('online', resume); target.removeEventListener('offline', resume)
  }
}

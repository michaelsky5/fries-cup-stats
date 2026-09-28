import { roomBanResolved } from './roomBans.js'
export const ROOM_CLOCK_LABELS = { PREPARATION: '赛前准备', MAP: '地图选择', LINEUP: '首发确认', BAN_ORDER: 'Ban 顺序', BAN: '英雄禁用' }

export function roomClockRemaining(clock, elapsedMs = 0) {
  if (!clock) return null
  if (!clock.deadlineAt) return Math.max(0, Math.ceil((clock.remainingMs || 0) / 1000))
  const duration = Date.parse(clock.deadlineAt) - Date.parse(clock.serverNow) - Math.max(0, elapsedMs)
  return Number.isFinite(duration) ? Math.max(0, Math.ceil(duration / 1000)) : null
}

export const formatRoomClock = seconds => seconds === null ? '—' : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export function roomClockHint(data, action) {
  const clock = data.phaseClock
  if (!clock?.enabled) return null
  const limits = clock.limits
  if (!limits) return null
  const hints = {
    SELECT_SETUP: ['确认地图后，双方首发倒计时同时开始（{0} 秒）。', limits.LINEUP],
    SET_LINEUP: ['双方首发都确认后，开始 Ban 顺序倒计时（{0} 秒）。', limits.BAN_ORDER],
    SELECT_BAN_ORDER: ['确认后，先手方 Ban 倒计时开始（{0} 秒）。', limits.BAN],
    BAN: roomBanResolved(data.map, 'A') || roomBanResolved(data.map, 'B') ? ['确认后，本图选禁倒计时结束。'] : ['确认后，对方 Ban 倒计时开始（{0} 秒）。', limits.BAN],
    BEGIN: ['首图选择权确认后，选图倒计时开始（{0} 秒）。', limits.FIRST_MAP],
    CONFIRM_FIRST_PICK: ['首图选择权确认后，选图倒计时开始（{0} 秒）。', limits.FIRST_MAP],
    REPORT_1V1_RESULT: ['确认获胜方后，选图倒计时开始（{0} 秒）。', limits.FIRST_MAP],
    PLAY: ['双方出手揭晓胜者后，选图倒计时开始（{0} 秒）。', limits.FIRST_MAP],
    NEXT_MAP: ['选图倒计时从上一图结果确认时开始，开放下一图不会重置。'],
    RECORD_MAP_RESULT: data.match.format === 'RR5' && data.map.order === 5 ? null : ['确认结果且整场尚未结束时，下一图选图倒计时开始（{0} 秒）。', limits.MAP]
  }
  if (['BAN', 'SELECT_BAN_ORDER'].includes(action) && hints[action]) {
    const hint = hints[action]
    return [hint[0] + ' 超时将自动放弃本轮禁用权，不得补 Ban。', ...hint.slice(1)]
  }
  return hints[action] || null
}

export function roomMapSide(map, side) {
  if (!['Hybrid', 'Escort'].includes(map?.type) || !['A', 'B'].includes(map?.attackFirstSide) || !['A', 'B'].includes(side)) return null
  return map.attackFirstSide === side ? 'ATTACK' : 'DEFEND'
}

import { normalizeRoomResponse } from '../../../../src/features/weekly-competition/roomResponse.js'
import { getRoomStageLabel } from '../../../../src/features/weekly-competition/weeklyRoomFlow.js'
import { calibrateRoomClock, roomClockState, formatRoomClock } from '../../../../src/features/weekly-competition/roomPhaseClock.js'
export { validRoomLineup, sortRoomLineup, canSubmitRoomLineup } from '../../../../src/features/weekly-competition/roomLineups.js'
export { observeRoomPenalties, roomPenaltySnapshot } from '../../../../src/features/weekly-competition/roomPenaltyNotice.js'
export { roomStageDurations } from '../../../../src/features/weekly-competition/roomClockPresentation.js'

export const validNativeMatchId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id)
export const roomUrl = (matchId = '', season = 'FCW26') => '/account/pages/room/index?season=' + encodeURIComponent(season)
  + (validNativeMatchId(matchId) ? '&match=' + encodeURIComponent(matchId) : '')

export function normalizeNativeRoom(value, matchId, startedAt, receivedAt) {
  if (value?.contract !== 'MINI_ROOM_V1') throw new Error('比赛房版本不匹配，请重新同步。')
  const room = normalizeRoomResponse(value, matchId)
  return { ...room, phaseClock: calibrateRoomClock(room.phaseClock, startedAt, receivedAt, room.syncedAt), receivedAt }
}

export function nativeRoomClock(room, now) {
  const clock = room?.phaseClock
  const state = roomClockState(clock, Math.max(0, now - (room?.receivedAt || now)))
  return { ...state, text: formatRoomClock(state.seconds), label: clock?.stage?.label || getRoomStageLabel(room),
    urgent: clock?.enabled && ['RUNNING', 'EXPIRED'].includes(clock.status) && state.seconds !== null && state.seconds <= 10,
    critical: clock?.enabled && ['RUNNING', 'EXPIRED'].includes(clock.status) && state.seconds !== null && state.seconds <= 5 }
}

export function roomMutation(room, operation, values = {}) {
  if (operation === 'brief' || operation === 'readiness') return values
  // Idempotency only: this UUID is not an authentication credential.
  const clientKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, part => {
    const value = Math.floor(Math.random() * 16)
    return (part === 'x' ? value : (value & 3) | 8).toString(16)
  })
  const base = { clientKey, ...values }
  if (operation === 'opening' || operation === 'opening/evidence') return { expectedRevision: room.opening.revision, ...base }
  if (operation === 'commands') return { expectedRevision: room.revision, matchRevision: room.match.revision, draftRevision: room.draftRevision, ...base }
  if (operation === 'clock') return { expectedRevision: room.phaseClock?.revision || 0, stageKey: room.phaseClock?.stage?.key || null, ...base }
  if (operation === 'check-ins') return { expectedRevision: room.revision, ...base }
  if (operation === 'representatives') return { expectedRevision: room.representatives?.revision || 0, ...base }
  if (operation === 'messages') return { channel: 'PUBLIC', mapOrder: room.map?.order || null, ...base }
  if (operation === 'result-response') return { expectedRevision: room.result.revision, fingerprint: room.result.fingerprint, ...base }
  throw new Error('未知比赛房操作。')
}

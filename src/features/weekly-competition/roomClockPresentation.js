import { ROOM_CLOCK_LABELS } from './roomPhaseClock.js'

export function roomClockUrgency(clock, seconds, { stale = false, inSubmissionGrace = false } = {}) {
  if (stale) return 'stale'
  if (!clock?.enabled || !clock.stage || !['RUNNING', 'EXPIRED'].includes(clock.status) || !Number.isFinite(seconds)) return 'inactive'
  if (seconds <= 0) return 'expired'
  if (seconds <= 5) return 'critical'
  if (seconds <= 10) return 'warning'
  return inSubmissionGrace ? 'grace' : 'normal'
}

// Display the server's configured limits, never infer deadlines from UI defaults.
export function roomStageDurations(clock) {
  const limits = clock?.limits
  if (!limits) return []
  return ['PREPARATION', 'MAP', 'LINEUP', 'BAN_ORDER', 'BAN', 'REST']
    .map(kind => ({
      kind,
      label: ROOM_CLOCK_LABELS[kind],
      seconds: kind === 'MAP' && clock.stage?.mapOrder === 1 ? limits.FIRST_MAP ?? limits.MAP : limits[kind]
    }))
    .filter(item => Number.isFinite(item.seconds) && item.seconds > 0)
}

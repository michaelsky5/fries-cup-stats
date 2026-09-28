const limits = { PREPARATION: 180, FIRST_MAP: 90, MAP: 120, LINEUP: 60, BAN_ORDER: 60, BAN: 60 }
const stages = { checkin: 'PREPARATION', opening: 'PREPARATION', confirming: 'PREPARATION', choosing: 'MAP', lineup: 'LINEUP', banorder: 'BAN_ORDER', banning: 'BAN', review: 'MAP' }

// Synthetic guide/preview only; the real room receives persisted deadlines from System.
export function demoRoomClock(scene, previous, now = Date.now()) {
  const kind = stages[scene], mapOrder = scene === 'review' ? 2 : 1
  const stage = kind ? { key: `${scene}:${mapOrder}`, kind, mapOrder, side: ['MAP', 'BAN_ORDER', 'BAN'].includes(kind) ? scene === 'review' ? 'B' : 'A' : null, ...(kind === 'LINEUP' ? { pendingSides: ['A', 'B'] } : {}), durationSeconds: kind === 'MAP' && mapOrder === 1 ? 90 : limits[kind] } : null
  const enabled = previous?.enabled ?? true, changed = previous?.stage?.key !== stage?.key
  const remainingMs = changed || !previous ? (stage?.durationSeconds || 0) * 1000 : previous.deadlineAt ? Math.max(0, Date.parse(previous.deadlineAt) - now) : previous.remainingMs
  const deadlineAt = enabled && stage ? changed || !previous ? new Date(now + remainingMs).toISOString() : previous.deadlineAt : null
  return { enabled, revision: (previous?.revision || 0) + Number(changed), stage, limits, serverNow: new Date(now).toISOString(), remainingMs, deadlineAt, status: !stage ? 'IDLE' : !enabled ? 'DISABLED' : remainingMs <= 0 ? 'EXPIRED' : 'RUNNING', canManage: false }
}

export function changeDemoClock(clock, body, now = Date.now()) {
  if (body.expectedRevision !== clock.revision || body.stageKey !== (clock.stage?.key || null)) throw new Error('phase')
  const next = { ...clock, revision: clock.revision + 1 }
  const ms = clock.deadlineAt ? Math.max(0, Date.parse(clock.deadlineAt) - now) : clock.remainingMs
  if (body.action === 'SET_ENABLED' && typeof body.enabled === 'boolean') {
    next.enabled = body.enabled; next.remainingMs = ms; next.deadlineAt = body.enabled && clock.stage ? new Date(now + ms).toISOString() : null
  } else if (body.action === 'EXTEND' && clock.enabled && clock.stage) {
    next.remainingMs = ms + 60000; next.deadlineAt = new Date(now + next.remainingMs).toISOString()
  } else throw new Error('phase')
  return next
}

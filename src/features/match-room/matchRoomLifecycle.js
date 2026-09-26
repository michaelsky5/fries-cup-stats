export const DEFAULT_MATCH_ROOM_OPEN_MINUTES = 30

const COMPLETED_MATCH_STATUSES = new Set(['SUBMITTED', 'COMPLETE', 'COMPLETED', 'FINISHED', 'LOCKED'])
const CANCELLED_MATCH_STATUSES = new Set(['CANCELLED', 'CANCELED'])

function clean(value) {
  return String(value ?? '').trim()
}

function toTimestamp(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const text = clean(value)
  if (!text) return null
  const compactMatch = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  const normalized = compactMatch
    ? `${compactMatch[1].replace(/\//g, '-')}T${compactMatch[2].padStart(2, '0')}:${compactMatch[3]}:${compactMatch[4] || '00'}+08:00`
    : text
  const timestamp = new Date(normalized).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function getMatchStartTimestamp(match = null) {
  const source = match || {}
  const candidates = [
    source.scheduledAt,
    source.scheduled_at,
    source.startAt,
    source.start_at,
    source.matchTime,
    source.match_time,
    source.date && source.time ? `${source.date} ${source.time}` : '',
    source.scheduledDate && source.scheduledTime ? `${source.scheduledDate} ${source.scheduledTime}` : '',
    source.scheduled_date && source.scheduled_time ? `${source.scheduled_date} ${source.scheduled_time}` : ''
  ]

  for (const candidate of candidates) {
    const timestamp = toTimestamp(candidate)
    if (timestamp) return timestamp
  }
  return null
}

export function getMatchRoomOpenMinutes(match = null) {
  const source = match || {}
  const configured = Number(
    source.roomOpenMinutesBefore ??
    source.room_open_minutes_before ??
    source.matchRoom?.openMinutesBefore ??
    source.match_room?.open_minutes_before
  )

  if (Number.isFinite(configured) && configured >= 0 && configured <= 180) return configured
  return DEFAULT_MATCH_ROOM_OPEN_MINUTES
}

export function formatMatchRoomCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}小时${String(minutes).padStart(2, '0')}分`
  if (minutes > 0) return `${minutes}分${String(seconds).padStart(2, '0')}秒`
  return `${seconds}秒`
}

export function getMatchRoomLifecycle(match = null, { now = Date.now(), room = null } = {}) {
  const matchStatus = clean(match?.status).toUpperCase()
  const roomStatus = clean(room?.status || room?.room?.status).toUpperCase()
  const openMinutesBefore = getMatchRoomOpenMinutes(match)
  const startsAt = getMatchStartTimestamp(match)
  const opensAt = startsAt === null ? null : startsAt - openMinutesBefore * 60 * 1000

  if (CANCELLED_MATCH_STATUSES.has(matchStatus)) {
    return {
      state: 'CLOSED',
      label: '比赛已取消',
      actionLabel: '房间已关闭',
      canEnter: false,
      canOperate: false,
      isReadOnly: false,
      openMinutesBefore,
      startsAt,
      opensAt,
      remainingMs: 0
    }
  }

  if (COMPLETED_MATCH_STATUSES.has(matchStatus) || COMPLETED_MATCH_STATUSES.has(roomStatus)) {
    return {
      state: 'READ_ONLY',
      label: '比赛记录只读',
      actionLabel: '查看比赛记录',
      canEnter: true,
      canOperate: false,
      isReadOnly: true,
      openMinutesBefore,
      startsAt,
      opensAt,
      remainingMs: 0
    }
  }

  if (startsAt === null || opensAt === null) {
    return {
      state: 'SCHEDULE_PENDING',
      label: '等待开赛时间',
      actionLabel: '房间暂未开放',
      canEnter: false,
      canOperate: false,
      isReadOnly: false,
      openMinutesBefore,
      startsAt,
      opensAt,
      remainingMs: 0
    }
  }

  if (Number(now) < opensAt) {
    const remainingMs = opensAt - Number(now)
    return {
      state: 'LOCKED',
      label: `赛前 ${openMinutesBefore} 分钟开放`,
      actionLabel: `${formatMatchRoomCountdown(remainingMs)}后开放`,
      canEnter: false,
      canOperate: false,
      isReadOnly: false,
      openMinutesBefore,
      startsAt,
      opensAt,
      remainingMs
    }
  }

  return {
    state: 'OPEN',
    label: '比赛房已开放',
    actionLabel: '进入比赛房',
    canEnter: true,
    canOperate: true,
    isReadOnly: false,
    openMinutesBefore,
    startsAt,
    opensAt,
    remainingMs: 0
  }
}

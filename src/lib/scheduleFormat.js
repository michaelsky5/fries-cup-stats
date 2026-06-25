const SHANGHAI_TZ = 'Asia/Shanghai'

function cleanValue(value) {
  if (value === undefined || value === null) return ''
  const text = String(value).trim()
  if (!text || ['TBD', 'N/A', 'NULL', 'UNSCHEDULED'].includes(text.toUpperCase())) return ''
  return text
}

export function getMatchScheduleValue(match) {
  return cleanValue(match?.scheduled_at) ||
    cleanValue(match?.scheduledAt) ||
    cleanValue(match?.schedule?.scheduled_at) ||
    cleanValue(match?.context?.scheduledAt)
}

function getScheduleMeta(match) {
  return match?.schedule_meta || match?.scheduleMeta || match?.context?.scheduleMeta || {}
}

export function formatMatchSchedule(match, { locale = 'zh-CN', includeWeekday = false } = {}) {
  const value = getMatchScheduleValue(match)
  const meta = getScheduleMeta(match)
  const note = cleanValue(match?.schedule_note) || cleanValue(meta?.statusNote)

  if (!value) {
    return {
      hasSchedule: false,
      isDateOnly: false,
      label: locale === 'en-US' ? 'TBD' : '待定',
      compact: 'TBD',
      title: note || (locale === 'en-US' ? 'Schedule TBD' : '赛程待定'),
      note
    }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return {
      hasSchedule: false,
      isDateOnly: false,
      label: value,
      compact: value,
      title: value,
      note
    }
  }

  const isDateOnly = Boolean(meta?.syntheticSortTime) || meta?.exactTime === false
  const dateText = new Intl.DateTimeFormat(locale, {
    timeZone: SHANGHAI_TZ,
    month: '2-digit',
    day: '2-digit',
    ...(includeWeekday ? { weekday: 'short' } : {})
  }).format(date)
  const timeText = new Intl.DateTimeFormat(locale, {
    timeZone: SHANGHAI_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
  const displayTime = isDateOnly ? 'TBD' : timeText

  return {
    hasSchedule: true,
    isDateOnly,
    label: `${dateText} ${displayTime}`,
    compact: `${dateText} ${displayTime}`,
    title: `${dateText} ${displayTime}${note ? ` / ${note}` : ''}`,
    note
  }
}

export function getPublicStatusLabel(status, locale = 'zh-CN') {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'COMPLETE' || normalized === 'COMPLETED') return locale === 'en-US' ? 'Completed' : '已完成'
  if (normalized === 'IN_PROGRESS' || normalized === 'LIVE') return locale === 'en-US' ? 'Live' : '进行中'
  if (normalized === 'CANCELLED') return locale === 'en-US' ? 'Cancelled' : '已取消'
  return locale === 'en-US' ? 'Pending' : '未开始'
}

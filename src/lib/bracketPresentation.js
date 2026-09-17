export function formatBracketMatchTime(value, locale = 'zh-CN') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value || ''
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`
}

export function getBracketMatchStatusText(match, statusLabel, locale = 'zh-CN') {
  if (['active', 'completed', 'postponed', 'cancelled'].includes(match?.status)) {
    return statusLabel
  }

  return formatBracketMatchTime(match?.scheduledAt, locale) || (locale === 'en-US' ? 'Time TBD' : '时间待定')
}

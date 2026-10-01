import { translateUiText } from '../../lib/uiText.js'
const labels = {
  live: ['进行中', 'In progress'], complete: ['已结束', 'Final'], upcoming: ['待赛', 'Upcoming'],
  review: ['待审核', 'Under review'], ruling: ['判定结束', 'By ruling'], cancelled: ['已取消', 'Cancelled'],
  postponed: ['已延期', 'Postponed'], unknown: ['状态待更新', 'Status pending'],
  IN_PROGRESS: ['进行中', 'In progress'], RESULT_REVIEW: ['结果审核中', 'Under review'],
  PUBLISHED: ['对阵已公布', 'Published'], CLOSED: ['已结束', 'Closed'],
  ACTIVE: ['周期进行中', 'Active cycle'], PLAYOFFS: ['周期季后赛', 'Cycle playoffs']
}
const isEnglish = locale => String(locale).startsWith('en')
export const weeklyStatusLabel = (key, locale) => translateUiText(labels[key]?.[isEnglish(locale) ? 1 : 0] || (isEnglish(locale) ? 'To be announced' : '待公布'), locale)
export const weeklyCycleTitle = (cycle, locale) => isEnglish(locale) ? cycle?.code || 'Cycle' : cycle?.name || cycle?.code || '周期'
export const weeklyWeekTitle = (week, locale) => isEnglish(locale) ? `Week ${week?.week_number}` : translateUiText(week?.label || `第 ${week?.week_number} 周`, locale)
export const weeklyTeamShort = team => team?.short || team?.team_short_name || team?.name || team?.team_name || 'TBD'

export function weeklyCycleDates(cycle, locale) {
  if (!cycle?.starts_at || !cycle?.ends_at) return ''
  const start = new Date(cycle.starts_at), end = new Date(cycle.ends_at)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return ''
  const formatter = new Intl.DateTimeFormat(locale || 'zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

export function weeklyPeriodPath(path, cycle, week) {
  const params = new URLSearchParams()
  if (cycle?.id) params.set('cycle', cycle.id)
  if (week?.id) params.set('week', week.id)
  return `${path}${params.size ? `?${params}` : ''}`
}

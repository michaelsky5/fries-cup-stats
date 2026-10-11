import { translateUiText } from '../../lib/uiText.js'
const labels = {
  live: ['进行中', 'In progress'], complete: ['已结束', 'Final'], upcoming: ['待赛', 'Upcoming'],
  review: ['待审核', 'Under review'], ruling: ['判定结束', 'By ruling'], cancelled: ['已取消', 'Cancelled'],
  postponed: ['已延期', 'Postponed'], unknown: ['状态待更新', 'Status pending'],
  IN_PROGRESS: ['进行中', 'In progress'], RESULT_REVIEW: ['结果审核中', 'Under review'],
  PUBLISHED: ['对阵已公布', 'Published'], CLOSED: ['已结束', 'Closed'],
  ACTIVE: ['周期进行中', 'Active cycle'], PLAYOFFS: ['季后赛', 'Playoffs']
}
const isEnglish = locale => String(locale).startsWith('en')
export const weeklyStatusLabel = (key, locale) => translateUiText(labels[key]?.[isEnglish(locale) ? 1 : 0] || (isEnglish(locale) ? 'To be announced' : '待公布'), locale)
export const weeklyCycleTitle = (cycle, locale) => isEnglish(locale) ? cycle?.code || 'Cycle' : cycle?.name || cycle?.code || '周期'
export const weeklyWeekTitle = (week, locale) => {
  if (isEnglish(locale)) return `Week ${week?.week_number}`
  const fallback = `第 ${week?.week_number} 周`
  const label = String(week?.label || fallback).replace(/\s*[·•—–-]?\s*首[周週][试試][运運]行\s*$/, '').trim()
  return translateUiText(label || fallback, locale)
}
export const weeklyTeamShort = team => team?.short || team?.team_short_name || team?.name || team?.team_name || 'TBD'

export function weeklyPeriodPath(path, cycle, week) {
  const params = new URLSearchParams()
  if (cycle?.id) params.set('cycle', cycle.id)
  if (week?.id) params.set('week', week.id)
  return `${path}${params.size ? `?${params}` : ''}`
}

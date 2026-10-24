import { pickUiLocale } from '../../lib/uiText.js'
import { getWeeklyPhaseLabel } from '../../lib/weeklyMatchIdentity.js'
import { weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'

// Reading a published cover must not load the award generator or scoring engine.
export const newspaperTeamName = team => weeklyTeamShort(team) === '?' ? team?.name || team?.team_name || '?' : weeklyTeamShort(team)

export function weeklyReportPath(report) {
  return `/reports/${encodeURIComponent(report.week.id)}?cycle=${encodeURIComponent(report.cycle.id)}`
}

export function formatReportTime(value, locale = 'zh-CN') {
  const date = new Date(value)
  if (!value || !Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat(String(locale).startsWith('en') ? 'en-GB' : 'zh-CN', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(date) + ' UTC+8'
}

// 票 2.28: how fresh the archive is — the newest issue, and the finished weeks that have none.
const weekNumber = item => Number(item?.report?.week?.week_number)

export function latestNewspaperIssue(issues = []) {
  let latest = null
  for (const item of issues) {
    if (!Number.isFinite(weekNumber(item))) continue
    const newer = !latest || weekNumber(item) > weekNumber(latest)
      || (weekNumber(item) === weekNumber(latest) && Date.parse(item.publishedAt) > Date.parse(latest.publishedAt))
    if (newer) latest = item
  }
  return latest
}

// Only CLOSED weeks are due an issue; a week still being played or reviewed is not missing one.
export function unpublishedNewspaperWeeks(weeks = [], issues = []) {
  const published = new Set(issues.map(item => item?.report?.week?.id).filter(Boolean))
  return weeks.filter(week => week?.id && week.status === 'CLOSED' && !published.has(week.id))
    .sort((a, b) => Number(a.week_number) - Number(b.week_number))
}

// 10/14 (14/10 in English), Beijing time — the same short date the phase card uses.
export function newspaperIssueDate(value, locale = 'zh-CN') {
  const date = new Date(value)
  if (!value || !Number.isFinite(date.getTime())) return ''
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', month: 'numeric', day: 'numeric' })
    .formatToParts(date).map(part => [part.type, part.value]))
  return String(locale).startsWith('en') ? `${parts.day}/${parts.month}` : `${parts.month}/${parts.day}`
}

// The shared phase table has no Korean or Traditional Chinese for 晋级加赛, so the four names are
// spelled out here, matching the advance page.
const PHASE_NAMES = {
  QUALIFIER: ['晋级加赛', 'Tiebreak qualifier', '진출권 결정전', '晉級加賽'],
  PLAYOFFS: ['季后赛', 'Playoffs', '플레이오프', '季後賽'],
  MAJOR: ['巅峰赛', 'Finals', '파이널', '巔峰賽']
}

// 第 5 周（晋级加赛）: the week number, plus the phase when it is not an ordinary prelim week.
export function newspaperWeekLabel(week, locale = 'zh-CN') {
  const number = week?.week_number
  const base = pickUiLocale(locale, `第 ${number} 周`, `Week ${number}`, `${number}주차`, `第 ${number} 週`)
  const names = PHASE_NAMES[week?.phase]
  const phase = names ? pickUiLocale(locale, ...names) : week?.phase && week.phase !== 'REGULAR' ? getWeeklyPhaseLabel(week.phase, locale) : ''
  return phase ? pickUiLocale(locale, `${base}（${phase}）`, `${base} (${phase})`, `${base} (${phase})`, `${base}（${phase}）`) : base
}

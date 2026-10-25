import { pickUiLocale } from '../../lib/uiText.js'
import { getWeeklyPhaseLabel } from '../../lib/weeklyMatchIdentity.js'
import { WEEKLY_PHASE_NAMES, weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'

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

// 票 2.49: a segment's newspaper is one issue per prelim week plus one 季后赛专刊. The 晋级加赛 is part
// of the playoffs, so it is never due an issue of its own; neither is any other stage.
const phaseOf = week => String(week?.phase || 'REGULAR').toUpperCase()
export const isNewspaperIssueWeek = week => ['REGULAR', 'PLAYOFFS'].includes(phaseOf(week))
export const isPlayoffEdition = report => phaseOf(report?.week) === 'PLAYOFFS'

// Only CLOSED weeks are due an issue; a week still being played or reviewed is not missing one.
export function unpublishedNewspaperWeeks(weeks = [], issues = []) {
  const published = new Set(issues.map(item => item?.report?.week?.id).filter(Boolean))
  return weeks.filter(week => week?.id && week.status === 'CLOSED' && isNewspaperIssueWeek(week) && !published.has(week.id))
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

const ISSUE_TEXT = {
  edition: ['季后赛专刊', 'Playoff edition', '플레이오프 특집', '季後賽專刊'],
  stamp: ['季后赛', 'PO', 'PO', '季後賽'],
  stampNote: ['专刊', 'EDITION', '특집', '專刊'],
  weekNote: ['周', 'WEEK', '주차', '週'],
  report: ['{0}周报', '{0} report', '{0} 신문', '{0}週報']
}
const issueText = (key, locale) => pickUiLocale(locale, ...ISSUE_TEXT[key])

// The issue a week stands for: 第 4 周, or 季后赛专刊 for the playoff edition. Any other stage keeps its
// own name (older archives may hold one), never a bare week number.
export function newspaperWeekLabel(week, locale = 'zh-CN') {
  if (phaseOf(week) === 'PLAYOFFS') return issueText('edition', locale)
  const names = WEEKLY_PHASE_NAMES[phaseOf(week)]
  if (names) return pickUiLocale(locale, ...names)
  if (phaseOf(week) !== 'REGULAR') return getWeeklyPhaseLabel(phaseOf(week), locale) || ''
  const number = week?.week_number
  return pickUiLocale(locale, `第 ${number} 周`, `Week ${number}`, `${number}주차`, `第 ${number} 週`)
}

// A link or heading that names the issue: 第 4 周周报 / 季后赛专刊.
export const newspaperIssueTitle = (week, locale = 'zh-CN') => phaseOf(week) === 'PLAYOFFS'
  ? issueText('edition', locale)
  : issueText('report', locale).replace('{0}', newspaperWeekLabel(week, locale))

// The masthead stamp: the prelim week number (04 / 周), or 季后赛 / 专刊 for the playoff edition.
export const newspaperIssueStamp = (report, locale = 'zh-CN') => isPlayoffEdition(report)
  ? { value: issueText('stamp', locale), note: issueText('stampNote', locale), edition: 'playoffs' }
  : { value: report?.number, note: issueText('weekNote', locale), edition: undefined }

// Where the reader goes back to: 第 4 周 or 季后赛 (the overview of that stage).
export const newspaperStageLabel = (week, locale = 'zh-CN') => phaseOf(week) === 'PLAYOFFS'
  ? pickUiLocale(locale, ...WEEKLY_PHASE_NAMES.PLAYOFFS)
  : newspaperWeekLabel(week, locale)

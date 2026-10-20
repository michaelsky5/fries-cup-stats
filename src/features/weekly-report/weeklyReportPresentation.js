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

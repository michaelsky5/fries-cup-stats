import { getActiveLocale } from './nativeLocales.js'
import { buildWeeklySchedule } from '../../../../src/features/match-schedule/weeklyScheduleModel.js'
import { buildWeeklyOverview, weeklyMapSlots, weeklyScore } from '../../../../src/features/weekly-overview/weeklyOverviewModel.js'
import { weeklyStatusLabel, weeklyTeamShort, weeklyWeekTitle } from '../../../../src/features/weekly-overview/weeklyPresentation.js'
import { formatMatchSchedule, getMatchScheduleValue } from '../../../../src/lib/scheduleFormat.js'
import { formatOwMapName } from '../../../../src/lib/heroes.js'

export { weeklyMapSlots, weeklyScore, weeklyStatusLabel, weeklyTeamShort, weeklyWeekTitle }
export { formatOwMapName }
export const COPY = { title: '每一周，都有下一场。', lead: '查找对阵，接着看完五局。' }
export function validateSnapshot(raw) {
  if (raw?.season?.id !== 'FCW26' || raw?.weekly_competition?.schema_version !== 'friescup-weekly-public-v1' || !Array.isArray(raw.matches) || !Array.isArray(raw.teams)) throw new Error('周赛公开数据格式无法识别')
  return raw
}
export function initialSelection(raw, params = {}) {
  const overview = buildWeeklyOverview(raw, { cycleId: params.cycle, weekId: params.week })
  const week = overview.weeks.find(item => item.id === params.week) || overview.weeks.find(item => ['IN_PROGRESS', 'RESULT_REVIEW'].includes(item.status)) || overview.weeks.at(-1)
  return { cycleId: overview.cycle?.id || '', weekId: params.week === 'all' ? 'all' : week?.id || '', query: '', teamId: '', status: 'all' }
}
export function scheduleModel(raw, selection) {
  validateSnapshot(raw)
  return buildWeeklySchedule(raw, selection)
}
export function reconcileSelection(raw, current) {
  if (!current) return initialSelection(raw)
  const initial = initialSelection(raw, { cycle: current.cycleId, week: current.weekId })
  const model = scheduleModel(raw, { ...current, cycleId: initial.cycleId, weekId: initial.weekId })
  return { ...current, cycleId: model.cycle?.id || '', weekId: model.selectedWeekId,
    status: model.activeStatus, teamId: model.teamOptions.some(team => String(team.id || team.team_id) === current.teamId) ? current.teamId : '' }
}
export function timeLabel(match) {
  const schedule = formatMatchSchedule(match)
  if (!schedule.hasSchedule || schedule.isDateOnly) return '时间待定'
  const timestamp = Date.parse(getMatchScheduleValue(match))
  const date = new Date(timestamp + 8 * 3600000)
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}
export function dayLabel(day) {
  if (day === 'tbd') return '日期待定'
  const date = new Date(`${day}T12:00:00+08:00`)
  if (getActiveLocale() !== 'zh-CN') return new Intl.DateTimeFormat(getActiveLocale(), {timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',weekday:'short'}).format(date)
  return `${day.slice(5).replace('-', '/')} 周${['日', '一', '二', '三', '四', '五', '六'][date.getUTCDay()]}`
}
export function readTime(fetchedAt) {
  if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return ''
  return new Intl.DateTimeFormat(getActiveLocale(), { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(fetchedAt))
}
export function mapResult(slot, match) {
  if (slot.state === 'ruling') return '判定'
  if (slot.state === 'live') return '进行中'
  if (slot.state !== 'recorded') return '—'
  const winner = String(slot.map?.winner || '')
  if (/^(draw|tie|平局)$/i.test(winner)) return '平局'
  const team = [match.team_a, match.team_b].find(item => [item?.id, item?.team_id, item?.name, item?.short, item?.team_short_name].some(value => String(value || '') === winner))
  return team ? weeklyTeamShort(team) : '已记录'
}

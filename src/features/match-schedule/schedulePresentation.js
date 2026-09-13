import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { formatOwMapName } from '../../lib/heroes.js'
import { getMatchStatusText, getMatchTimeLabel } from '../../lib/matchesSelectors.js'
import { formatMatchSchedule, getMatchScheduleValue } from '../../lib/scheduleFormat.js'

const text = value => String(value ?? '').normalize('NFKC').trim()
const key = value => text(value).toUpperCase()
const LIST_KEYS = ['tab', 'status', 'stage', 'round', 'roundView', 'format', 'team', 'teamId', 'query', 'following']
const STAGES = { SWISS: ['瑞士轮', 'Swiss stage'], GROUP: ['小组赛', 'Group stage'], LCQ: ['突围赛', 'Breakthrough'], PLAYOFFS: ['季后赛', 'Playoffs'], WEEKLY: ['周赛', 'Weekly'] }
const ROUNDS = {
  'GRAND FINAL': ['总决赛', 'Grand final'], 'GRAND FINALS': ['总决赛', 'Grand final'],
  FINAL: ['决赛', 'Final'], FINALS: ['决赛', 'Final'],
  'UB QF': ['胜者组四分之一决赛', 'Upper quarterfinals'], 'UB SF': ['胜者组半决赛', 'Upper semifinals'],
  'UB FINAL': ['胜者组决赛', 'Upper final'], 'UB FINALS': ['胜者组决赛', 'Upper final'],
  'LB FINAL': ['败者组决赛', 'Lower final'], 'LB FINALS': ['败者组决赛', 'Lower final'],
  QUARTERFINALS: ['四分之一决赛', 'Quarterfinals'], SEMIFINALS: ['半决赛', 'Semifinals'],
  'THIRD PLACE': ['季军赛', 'Third-place match'], 'THIRD PLACE MATCH': ['季军赛', 'Third-place match'], '3RD PLACE': ['季军赛', 'Third-place match'],
  'PLAY-IN': ['入围赛', 'Play-in'], 'ROUND OF 16': ['十六强赛', 'Round of 16'], QUALIFICATION: ['晋级赛', 'Qualification']
}
const STATUS_EN = { '待确认': 'To be confirmed', '延期': 'Postponed', '已改期': 'Rescheduled', '取消': 'Cancelled', '弃权': 'Forfeit', '已完成': 'Completed', '进行中': 'Live', '未开始': 'Upcoming' }

export function isScheduleListSearch(search) {
  const params = new URLSearchParams(search)
  return params.get('view') === 'list' || LIST_KEYS.some(name => params.has(name)) || params.get('focus') === 'search'
}

export function resetScheduleSearch(search) {
  const params = new URLSearchParams(search)
  for (const name of [...LIST_KEYS, 'focus']) params.delete(name)
  params.set('view', 'list')
  return params
}

export function getScheduleReturnLabel(path, locale = 'zh-CN') {
  if (!/^\/matches(?:[?#]|$)/.test(path || '')) return formatUiText('', locale)
  const search = (path.split('?')[1] || '').split('#')[0]
  const params = new URLSearchParams(search)
  if (params.has('cycle') || params.has('week')) return formatUiText(locale === 'en-US' ? 'Back to weekly schedule' : '返回周赛赛程', locale)
  return formatUiText(isScheduleListSearch(search)
    ? locale === 'en-US' ? 'Back to full schedule' : '返回完整赛程'
    : locale === 'en-US' ? 'Back to match highlights' : '返回赛事精选', locale)
}

export function getScheduleStageLabel(stage, locale = 'zh-CN') {
  return formatUiText(STAGES[key(stage)]?.[locale === 'en-US' ? 1 : 0] || text(stage) || (locale === 'en-US' ? 'Stage TBD' : '阶段待定'), locale)
}

export function getScheduleRoundLabel(match, locale = 'zh-CN') {
  const en = locale === 'en-US'
  const round = text(match?.round)
  const stage = key(match?.stage)
  const upper = key(round)
  const weekNumber = upper.match(/^WEEK\s*(\d+)$/)?.[1]
  if (stage === 'WEEKLY' && weekNumber) return formatUiText(en ? `Week ${weekNumber}` : `第 ${weekNumber} 周`, locale)
  if (ROUNDS[upper]) return formatUiText(ROUNDS[upper][en ? 1 : 0], locale)
  const lowerRound = upper.match(/^LB\s+R(?:OUND\s*)?(\d+)$/)
  if (lowerRound) return formatUiText(en ? `Lower round ${lowerRound[1]}` : `败者组第 ${lowerRound[1]} 轮`, locale)
  const groupDay = upper.match(/^GROUP\s+(.+?)\s*\/\s*DAY\s*(\d+)$/)
  if (stage === 'GROUP' && groupDay) return formatUiText(en ? `Group ${groupDay[1]} · Day ${groupDay[2]}` : `${groupDay[1]} 组 · 第 ${groupDay[2]} 比赛日`, locale)
  const number = upper.match(/^(?:SWISS\s+)?ROUND\s*(\d+)$/)?.[1]
  if (number) return formatUiText(stage === 'SWISS'
    ? en ? `Swiss round ${number}` : `瑞士轮第 ${number} 轮`
    : en ? `Round ${number}` : `第 ${number} 轮`, locale)
  return formatUiText(round || getScheduleStageLabel(match?.stage, locale), locale)
}

export function getScheduleTimeLabel(match, locale = 'zh-CN') {
  if (getMatchScheduleValue(match)) return formatUiText(formatMatchSchedule(match, { locale }).label, locale)
  const label = getMatchTimeLabel(match)
  return formatUiText(label === '时间待定' ? locale === 'en-US' ? 'Schedule TBD' : '时间待定' : label, locale)
}

export function getScheduleGroupLabel(group, locale, archived = true) {
  const match = group?.matches?.[0]
  if (!match) return formatUiText(group?.title || (locale === 'en-US' ? 'Round TBD' : '轮次待定'), locale)
  const round = getScheduleRoundLabel(match, locale)
  return formatUiText(archived ? round : `${round} · ${getScheduleTimeLabel(match, locale)}`, locale)
}

export function getScheduleStatusLabel(match, locale = 'zh-CN') {
  const label = key(match?.status) === 'FORFEIT' ? '弃权' : getMatchStatusText(match)
  return formatUiText(locale === 'en-US' ? STATUS_EN[label] || label : label, locale)
}

export function getScheduleMapRecords(match, locale = 'zh-CN') {
  return (Array.isArray(match?.maps) ? match.maps : []).map((map, index) => ({ map, index })).filter(({ map }) =>
    (text(map.map_name) && key(map.map_type) !== 'UNKNOWN') || text(map.score_a) || text(map.score_b)
  ).map(({ map, index }) => ({
    key: `${index}:${text(map.map_name)}`,
    order: index + 1,
    name: text(map.map_name) ? formatOwMapName(map.map_name, locale) : locale === 'en-US' ? `Map ${index + 1}` : `第 ${index + 1} 图`,
    hasScore: Boolean(text(map.score_a) || text(map.score_b)),
    score: `${text(map.score_a) || '—'} : ${text(map.score_b) || '—'}`
  }))
}

import { normalizeLocale } from '../../lib/locales.js'
import { pickUiLocale, translateUiText } from '../../lib/uiText.js'
import { getWeeklyCycleIdentityLabel, getWeeklyMatchIdentity, getWeeklyMatchIdentityLabel, getWeeklyRoundLabel } from '../../lib/weeklyMatchIdentity.js'
import { getMatchFormatLabel } from '../../lib/matchFormat.js'
import { getPreferredTeamShortName } from '../../lib/teamDisplayIdentity.js'
const labels = {
  live: ['进行中', 'In progress'], complete: ['已结束', 'Final'], upcoming: ['待赛', 'Upcoming'],
  review: ['待审核', 'Under review'], ruling: ['判定结束', 'By ruling'], cancelled: ['已取消', 'Cancelled'],
  postponed: ['已延期', 'Postponed'], unknown: ['状态待更新', 'Status pending'],
  IN_PROGRESS: ['进行中', 'In progress'], RESULT_REVIEW: ['结果审核中', 'Under review'],
  PUBLISHED: ['对阵已公布', 'Published'], CLOSED: ['已结束', 'Closed'],
  ACTIVE: ['赛段进行中', 'Active cycle'], PLAYOFFS: ['季后赛', 'Playoffs']
}
const isEnglish = locale => String(locale).startsWith('en')
export const weeklyStatusLabel = (key, locale) => translateUiText(labels[key]?.[isEnglish(locale) ? 1 : 0] || (isEnglish(locale) ? 'To be announced' : '待公布'), locale)

// 人话优先 (票 2.13): the Chinese interface leads with 第一赛段 and keeps the V3.1 code
// (FCW S1 C1) as small print; English and Korean keep their existing labels.
export const isChineseLocale = locale => normalizeLocale(locale || 'zh-CN').startsWith('zh')
const isTraditional = locale => normalizeLocale(locale) === 'zh-TW'
const CN_NUMERALS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

export function weeklyCycleHumanName(cycle, locale) {
  const sequence = cycle?.cycle_sequence ?? cycle?.sequence
  const name = String(cycle?.cycle_name || cycle?.name || '').replaceAll('周期', '赛段').trim()
  if (sequence === 0) return translateUiText(name || '试运行', locale)
  const numeral = CN_NUMERALS[Number(sequence)]
  if (Number.isInteger(Number(sequence)) && numeral) return isTraditional(locale) ? `第${numeral}賽段` : `第${numeral}赛段`
  return name ? translateUiText(name, locale) : ''
}

export function weeklyCycleCode(cycle) {
  const label = getWeeklyCycleIdentityLabel(cycle, 'en-US')
  return /^FCW S\d+ C\d+$/.test(label) ? label : String(cycle?.code || '')
}

export const weeklyCycleTitle = (cycle, locale) => (isChineseLocale(locale) && weeklyCycleHumanName(cycle, locale))
  || getWeeklyCycleIdentityLabel(cycle, locale) || (isEnglish(locale) ? cycle?.code || 'Cycle' : cycle?.name?.replaceAll('周期', '赛段') || cycle?.code || '赛段')

// A match in a list or card: 第一赛段 · 第 6 周 · 决赛. The match number stays on the detail page.
export function weeklyMatchContextLabel(match, locale) {
  if (!isChineseLocale(locale)) return getWeeklyMatchIdentityLabel(match, locale)
  const identity = getWeeklyMatchIdentity(match)
  if (!identity) return ''
  const week = identity.week_number ? translateUiText(`第 ${identity.week_number} 周`, locale) : translateUiText(identity.week_label || '', locale)
  return [weeklyCycleHumanName(identity, locale), week, getWeeklyRoundLabel(match, locale)].filter(Boolean).join(' · ')
}

// RR5 / FT3 explained where they first appear (Chinese interface only).
export function weeklyFormatHint(format, locale) {
  if (!isChineseLocale(locale)) return ''
  const value = String(format || '').trim().toUpperCase()
  if (value === 'RR5') return pickUiLocale(locale, '五局积分制', '', '', '五局積分制')
  const firstTo = value.match(/^FT(\d+)$/)
  return firstTo ? pickUiLocale(locale, `先赢 ${firstTo[1]} 图`, '', '', `先贏 ${firstTo[1]} 圖`) : ''
}

export function weeklyFormatLabel(match, locale) {
  const label = getMatchFormatLabel(match)
  const hint = weeklyFormatHint(label, locale)
  return hint ? `${label}（${hint}）` : label
}

// Times are Beijing time; the Chinese interface says so once per page instead of after every time.
export const showsInlineTimeZone = locale => !isChineseLocale(locale)
// The shared phase table has no Korean or Traditional Chinese for 晋级加赛, so the four names are
// spelled out here (zh-CN, en, ko, zh-TW), matching the advance page.
export const WEEKLY_PHASE_NAMES = {
  QUALIFIER: ['晋级加赛', 'Tiebreak qualifier', '진출권 결정전', '晉級加賽'],
  PLAYOFFS: ['季后赛', 'Playoffs', '플레이오프', '季後賽'],
  MAJOR: ['巅峰赛', 'Finals', '파이널', '巔峰賽']
}

// 票 2.30: the week rail sits under the cycle name, so a phase week reads 季后赛, not 第一赛段季后赛.
export const weeklyWeekRailTitle = (week, locale) => {
  const names = WEEKLY_PHASE_NAMES[String(week?.phase || '').toUpperCase()]
  return names ? pickUiLocale(locale, ...names) : weeklyWeekTitle(week, locale)
}

export const weeklyWeekTitle = (week, locale) => {
  if (isEnglish(locale)) return `Week ${week?.week_number}`
  const fallback = `第 ${week?.week_number} 周`
  const label = String(week?.label || fallback).replace(/\s*[·•—–-]?\s*首[周週][试試][运運]行\s*$/, '').trim()
  return translateUiText(label || fallback, locale)
}
export const weeklyTeamShort = team => getPreferredTeamShortName(
  team?.short || team?.team_short_name || team?.name || team?.team_name || 'TBD',
  team?.name || team?.team_name
)

export function weeklyPeriodPath(path, cycle, week) {
  const params = new URLSearchParams()
  if (cycle?.id) params.set('cycle', cycle.id)
  if (week?.id) params.set('week', week.id)
  return `${path}${params.size ? `?${params}` : ''}`
}

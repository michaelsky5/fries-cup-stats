import { normalizeLocale } from '../../lib/locales.js'
import { pickUiLocale, translateUiText } from '../../lib/uiText.js'
import { WEEKLY_STAGE_NAMES, getWeeklyCycleIdentityLabel, getWeeklyMatchIdentity, getWeeklyRoundLabel, getWeeklyStageParts, joinWeeklyLabelParts } from '../../lib/weeklyMatchIdentity.js'
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

// 人话优先 (票 2.13): pages lead with the cycle's name and keep the V3.1 code (FCW S1 C1) as small print.
// 票 2.80: the name comes from one four-language table — 第二赛段 / Cycle 2 / 사이클 2 / 第二賽段 — so a cycle
// is called the same thing everywhere on a page (English pages used to mix 第二赛段, FCW S1 C2 and Cycle 2).
export const isChineseLocale = locale => normalizeLocale(locale || 'zh-CN').startsWith('zh')
const CN_NUMERALS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const PILOT_NAME = ['试运行', 'Pilot', '시범 운영', '試運行']

// The cycle's number, from its sequence, else its name (第一周期 / 第 2 赛段), else its code (C01, FCW S1 C2).
export function weeklyCycleSequence(cycle) {
  const raw = cycle?.cycle_sequence ?? cycle?.sequence
  if (raw !== undefined && raw !== null && raw !== '' && Number.isInteger(Number(raw))) return Number(raw)
  const name = String(cycle?.cycle_name || cycle?.name || '')
  if (/试运行|試運行/.test(name)) return 0
  const numbered = name.match(/第\s*([一二三四五六七八九十]|\d+)\s*(?:赛段|賽段|周期|週期)/)
  if (numbered) { const index = CN_NUMERALS.indexOf(numbered[1]); return index > 0 ? index : Number(numbered[1]) }
  const code = String(cycle?.code || cycle?.cycle_code || '').match(/C0*(\d+)$/i)
  return code ? Number(code[1]) : null
}

export function weeklyCycleHumanName(cycle, locale) {
  const sequence = weeklyCycleSequence(cycle)
  if (sequence === 0) return pickUiLocale(locale, ...PILOT_NAME)
  if (sequence > 0) {
    const numeral = CN_NUMERALS[sequence]
    return pickUiLocale(locale, numeral ? `第${numeral}赛段` : `第 ${sequence} 赛段`, `Cycle ${sequence}`, `사이클 ${sequence}`, numeral ? `第${numeral}賽段` : `第 ${sequence} 賽段`)
  }
  const name = String(cycle?.cycle_name || cycle?.name || '').replaceAll('周期', '赛段').trim()
  return name ? translateUiText(name, locale) : ''
}

export function weeklyCycleCode(cycle) {
  const label = getWeeklyCycleIdentityLabel(cycle, 'en-US')
  return /^FCW S\d+ C\d+$/.test(label) ? label : String(cycle?.code || '')
}

export const weeklyCycleTitle = (cycle, locale) => weeklyCycleHumanName(cycle, locale)
  || (isEnglish(locale) ? cycle?.code || 'Cycle' : cycle?.code || pickUiLocale(locale, '赛段', 'Cycle', '사이클', '賽段'))

// A match in a list or card: 第一赛段 · 第 3 周, 第一赛段 · 季后赛 · 决赛, 第一赛段 · 季后赛 · 晋级加赛
// (票 2.49: playoff and qualifier matches carry no week number). The match number stays on the detail page.
// 票 2.80: the same shape in every language (Cycle 1 · Week 3, Cycle 1 · Playoffs · Final).
export function weeklyMatchContextLabel(match, locale) {
  const identity = getWeeklyMatchIdentity(match)
  if (!identity) return ''
  const number = identity.week_number
  const week = getWeeklyStageParts(identity.phase, locale)
    || [number ? pickUiLocale(locale, `第 ${number} 周`, `Week ${number}`, `${number}주차`, `第 ${number} 週`) : translateUiText(identity.week_label || '', locale)]
  return joinWeeklyLabelParts([weeklyCycleHumanName(identity, locale), ...week, getWeeklyRoundLabel(match, locale)])
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
// The four names (zh-CN, en, ko, zh-TW) of the stages that are not numbered weeks, matching the advance page.
export const WEEKLY_PHASE_NAMES = WEEKLY_STAGE_NAMES

// 票 2.30: the week rail sits under the cycle name, so a phase week reads 季后赛, not 第一赛段季后赛.
export const weeklyWeekRailTitle = (week, locale) => {
  const names = WEEKLY_PHASE_NAMES[String(week?.phase || '').toUpperCase()]
  return names ? pickUiLocale(locale, ...names) : weeklyWeekTitle(week, locale)
}

// 票 2.49: only prelim weeks have a number a reader should see. 晋级加赛 belongs to the playoffs.
export const weeklyWeekHasNumber = week => !WEEKLY_PHASE_NAMES[String(week?.phase || '').toUpperCase()]

export const weeklyWeekTitle = (week, locale) => {
  const stage = getWeeklyStageParts(week?.phase, locale)
  if (stage) return joinWeeklyLabelParts(stage)
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

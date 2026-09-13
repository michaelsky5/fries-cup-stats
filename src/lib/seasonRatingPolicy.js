import { translateUiText as formatUiText } from './uiText.js'
import { translateUiText } from './uiText.js'
// Season eligibility evolves separately from the frozen hero calibration.
export const SEASON_RATING_VERSION = 'v1.4'
export const SEASON_SAMPLE_POLICY = {
  provisional: { maps: 2, minutes: 30, matches: 1 },
  formal: { maps: 6, minutes: 60, matches: 3 },
  targetMatches: 6,
  provisionalOvrCap: 89
}

function numberOrNull(value) {
  if (value == null || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function getSeasonSampleRequirements(minTimeMins = 30) {
  const minimum = numberOrNull(minTimeMins) ?? 30
  return {
    provisional: { ...SEASON_SAMPLE_POLICY.provisional, minutes: Math.max(minimum, SEASON_SAMPLE_POLICY.provisional.minutes) },
    formal: { ...SEASON_SAMPLE_POLICY.formal, minutes: Math.max(minimum, SEASON_SAMPLE_POLICY.formal.minutes) }
  }
}

export function getSeasonSample(entry, minTimeMins = 30) {
  const requirements = getSeasonSampleRequirements(minTimeMins)
  const observed = {
    maps: numberOrNull(entry?.roleMapsPlayed ?? entry?.maps_played) ?? 0,
    minutes: numberOrNull(entry?.roleTimeMins ?? entry?.raw_time_mins) ?? 0,
    matches: numberOrNull(entry?.roleMatchesPlayed)
  }
  const missing = Object.keys(requirements.formal).filter(key => observed[key] == null || observed[key] < requirements.formal[key])
  const hasRating = numberOrNull(entry?.seasonScore ?? entry?.roleScore) !== null
  // Unknown match counts cannot qualify; retain a clearly provisional estimate
  // when enough maps and minutes are published to support one.
  const canEstimate = hasRating && observed.maps >= requirements.provisional.maps &&
    observed.minutes >= requirements.provisional.minutes && (observed.matches == null || observed.matches >= requirements.provisional.matches)
  const status = !canEstimate ? 'UNRATED' : missing.length ? 'PROVISIONAL' : 'FORMAL'
  return { status, observed, requirements, missing }
}

export function getSeasonRatingStatusLabel(entry, locale = 'zh-CN') {
  const en = locale === 'en-US'
  const status = entry?.seasonRatingStatus || (entry?.eligible ? 'FORMAL' : 'UNRATED')
  if (status === 'FORMAL') return formatUiText(en ? 'Ranked' : '正式排名', locale)
  if (status === 'PROVISIONAL') return formatUiText(en ? 'Provisional' : '暂定评分', locale)
  return formatUiText(en ? 'Unrated' : '未评级', locale)
}

export function getSeasonRatingValue(entry) {
  if (entry?.seasonRatingStatus === 'UNRATED') return null
  return numberOrNull(entry?.seasonRatingStatus === 'PROVISIONAL' ? entry?.provisionalSeasonOvr : entry?.seasonOvr)
}

export function formatSeasonRatingValue(entry) {
  const value = getSeasonRatingValue(entry)
  return value == null ? '—' : String(Math.round(value))
}

export function getSeasonRatingLabel(entry, locale = 'zh-CN') {
  return formatUiText(entry?.seasonRatingStatus === 'PROVISIONAL'
    ? getSeasonRatingStatusLabel(entry, locale)
    : entry?.seasonRatingStatus === 'UNRATED'
      ? getSeasonRatingStatusLabel(entry, locale)
      : 'SEASON OVR', locale)
}

export function formatSeasonSampleRequirements(minTimeMins = 30, locale = 'zh-CN') {
  const rule = getSeasonSampleRequirements(minTimeMins).formal
  return locale === 'en-US'
    ? `${rule.maps}+ maps · ${rule.minutes}+ min · ${rule.matches}+ matches in this role`
    : translateUiText('本职责至少 {0} 图 · {1} 分钟 · {2} 场比赛', locale, [rule.maps, rule.minutes, rule.matches])
}

import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { rosterText } from '../roster-index/rosterCopy.js'

const labels = {
  '5 人名单': '5-player roster', '6 人名单': '6-player roster', '7 人名单': '7-player roster',
  '有教练': 'With a coach', '无教练': 'No registered coach', '关注优先': 'Following first',
  '名单人数': 'Roster size', '有教练优先': 'Coached teams first',
  '小组赛': 'Group stage', '瑞士轮': 'Swiss stage', '突围赛': 'Breakthrough', '季后赛': 'Playoffs'
}
export function teamIndexText(value, locale) {
  return formatUiText(locale === 'en-US' ? labels[value] || rosterText(value, locale) : rosterText(value, locale), locale)
}

export function teamIndexRole(role, locale) {
  const labels = { TANK: ['重装', 'Tank'], DPS: ['输出', 'Damage'], SUP: ['支援', 'Support'], SUPPORT: ['支援', 'Support'], FLEX: ['灵活', 'Flex'] }
  return rosterText(labels[role]?.[locale === 'en-US' ? 1 : 0] || role, locale)
}

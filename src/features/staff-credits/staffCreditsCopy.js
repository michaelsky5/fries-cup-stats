import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { rosterText } from '../roster-index/rosterCopy.js'

const labels = {
  '经理': 'Manager',
  '教练': 'Coach',
  '队伍': 'Team',
  '署名场数': 'Credited matches',
  '瑞士轮': 'Swiss stage',
  '小组赛': 'Group stage',
  '突围赛': 'Breakthrough',
  '季后赛': 'Playoffs'
}

export function staffCreditsText(value, locale) {
  return formatUiText(locale === 'en-US' ? labels[value] || rosterText(value, locale) : rosterText(value, locale), locale)
}

export function staffRoleLabel(staff, locale) {
  if (staff.team) return formatUiText(staff.roles.map(role => staffCreditsText(role === 'coach' ? '教练' : '经理', locale)).join(' / '), locale)
  return formatUiText(locale === 'en-US'
    ? staff.role === 'caster' ? 'Caster credits' : 'Official credits'
    : rosterText(staff.role === 'caster' ? '解说署名' : '赛管署名', locale), locale)
}

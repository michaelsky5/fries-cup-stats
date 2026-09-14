import { pickUiLocale, translateUiText as formatUiText } from '../../lib/uiText.js'
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
  if (staff.role === 'admin' && staff.duties?.length) {
    const labels = {
      REFEREE: pickUiLocale(locale, '裁判', 'Referee', '심판', '裁判'),
      VOICE_REFEREE: pickUiLocale(locale, '语音裁判', 'Voice referee', '음성 심판', '語音裁判'),
      DIRECTOR: pickUiLocale(locale, '导播', 'Director', '방송 연출', '導播'),
      OB: pickUiLocale(locale, 'OB', 'Observer', '옵저버', 'OB')
    }
    const duties = staff.duties.map(role => labels[role]).filter(Boolean)
    if (duties.length) return `${pickUiLocale(locale, '赛管', 'Match staff', '대회 운영', '賽管')} · ${duties.join(' / ')}`
  }
  return formatUiText(locale === 'en-US'
    ? staff.role === 'caster' ? 'Caster credits' : 'Official credits'
    : rosterText(staff.role === 'caster' ? '解说署名' : '赛管署名', locale), locale)
}
